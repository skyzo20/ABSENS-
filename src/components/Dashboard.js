import React, { useState, useEffect } from 'react';
import CheckIn from './CheckIn';
import History from './History';
import Profile from './Profile';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

function Dashboard({ user, isAdmin }) {
  const [view, setView] = useState('dashboard');
  const [showCamera, setShowCamera] = useState(false);
  const [action, setAction] = useState('');
  const [checkInDone, setCheckInDone] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [adminSummaries, setAdminSummaries] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const summarizeRecords = (records) => {
    const groups = records.reduce((acc, record) => {
      const key = record.email || record.userId || 'Unknown';
      if (!acc[key]) {
        acc[key] = { email: key, date: record.date || '', entries: [], totalSeconds: 0, clockInCount: 0, clockOutCount: 0 };
      }
      acc[key].entries.push(record);
      if (record.action === 'Clock In') acc[key].clockInCount += 1;
      if (record.action === 'Clock Out') acc[key].clockOutCount += 1;
      return acc;
    }, {});

    return Object.values(groups).map((group) => {
      const entries = group.entries
        .filter((entry) => entry.timestamp?.seconds)
        .sort((a, b) => (a.timestamp.seconds || 0) - (b.timestamp.seconds || 0));
      let totalSeconds = 0;
      let lastCheckIn = null;

      entries.forEach((entry) => {
        if (entry.action === 'Clock In') {
          lastCheckIn = entry.timestamp.seconds;
        } else if (entry.action === 'Clock Out' && lastCheckIn) {
          totalSeconds += Math.max(0, (entry.timestamp.seconds || 0) - lastCheckIn);
          lastCheckIn = null;
        }
      });

      return {
        ...group,
        entries,
        totalSeconds,
        totalHours: formatDuration(totalSeconds),
        name: group.email.split('@')[0]
      };
    });
  };

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      setCheckInDone(false);
      const fetchAdminData = async () => {
        setAdminLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const q = query(
          collection(db, 'attendance'),
          where('date', '==', today)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAdminSummaries(summarizeRecords(data));
        setAdminLoading(false);
      };
      fetchAdminData();
      return;
    }

    const checkToday = async () => {
      const today = new Date().toISOString().split('T')[0];
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', user.uid),
        where('date', '==', today),
        where('action', '==', 'Clock In')
      );
      const snapshot = await getDocs(q);
      setCheckInDone(!snapshot.empty);
    };
    checkToday();
  }, [user.uid, isAdmin]);

  const exportAdminCsv = () => {
    const today = new Date().toISOString().split('T')[0];
    const rows = [
      ['Email', 'Name', 'Date', 'Total Hours', 'Clock In', 'Clock Out']
    ];
    adminSummaries.forEach((summary) => {
      rows.push([
        summary.email,
        summary.name,
        today,
        summary.totalHours,
        summary.clockInCount,
        summary.clockOutCount
      ]);
    });
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `absensi-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCheckIn = (type) => {
    if (isAdmin) return;
    if (type === 'Clock In' && checkInDone) return;
    setAction(type);
    setShowCamera(true);
  };

  const handleLogout = () => {
    auth.signOut();
  };

  if (showCamera) {
    return (
      <CheckIn
        action={action}
        onClose={() => setShowCamera(false)}
        onSuccess={() => {
          if (action === 'Clock In') {
            setCheckInDone(true);
          }
          setShowCamera(false);
        }}
        user={user}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="user-profile-sm">
          <div className="avatar-sm">{user.email.charAt(0).toUpperCase()}</div>
          <div>
            <p className="top-greeting">Halo, {user.email.split('@')[0]}</p>
            <p className="top-status">Dashboard absensi ringan dan cepat</p>
          </div>
        </div>
      </header>
      <main className="content">
        {view === 'dashboard' && (
          isAdmin ? (
            <>
              <div className="card-attendance admin-card">
                <div className="card-header">
                  <div>
                    <p className="card-title">Admin Panel</p>
                    <p className="card-subtitle">Data absensi pegawai hari ini per email.</p>
                  </div>
                  <span className="status-pill admin">Admin</span>
                </div>
                <div className="admin-summary">
                  <p className="admin-line">Mode: <strong>Admin</strong></p>
                  <p className="admin-line">Admin tidak bisa melakukan absen sendiri.</p>
                  <p className="admin-line">Gunakan tombol export untuk menyimpan data ke CSV.</p>
                </div>
                <button className="btn-export" onClick={exportAdminCsv} disabled={adminLoading || adminSummaries.length === 0}>
                  {adminLoading ? 'Memuat...' : 'Export Data Hari Ini'}
                </button>
              </div>
              {adminSummaries.length === 0 && !adminLoading && (
                <p className="empty-history">Belum ada data absensi untuk hari ini.</p>
              )}
              <div className="admin-grid">
                {adminSummaries.map((summary) => (
                  <div key={summary.email} className="admin-user-card">
                    <div className="admin-card-header">
                      <div>
                        <p className="admin-user-name">{summary.name}</p>
                        <p className="admin-user-email">{summary.email}</p>
                      </div>
                      <span className="status-pill active">{summary.totalHours}</span>
                    </div>
                    <div className="admin-row">
                      <span>Clock In</span>
                      <strong>{summary.clockInCount}</strong>
                    </div>
                    <div className="admin-row">
                      <span>Clock Out</span>
                      <strong>{summary.clockOutCount}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="card-attendance">
              <div className="card-header">
                <div>
                  <p className="card-title">Absensi Hari Ini</p>
                  <p className="card-subtitle">Lacak waktu kerja dan foto check-in dengan mudah.</p>
                </div>
                <span className={`status-pill ${checkInDone ? 'active' : 'inactive'}`}>
                  {checkInDone ? 'Sudah Check In' : 'Belum Check In'}
                </span>
              </div>
              <div className="card-clock">
                <div>
                  <p className="label-date">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  <p className="label-time">{currentTime.toLocaleTimeString('id-ID')}</p>
                </div>
                <div className="time-badge">{currentTime.toLocaleTimeString('id-ID', { hour12: false })}</div>
              </div>
              <div className="btn-group-absensi">
                <button className="btn-absen in" disabled={checkInDone} onClick={() => handleCheckIn('Clock In')}>
                  Clock In
                </button>
                <button className="btn-absen out" onClick={() => handleCheckIn('Clock Out')}>
                  Clock Out
                </button>
              </div>
              {checkInDone && (
                <p className="checkin-note">Anda sudah melakukan Clock In hari ini. Clock In tidak dapat diulang.</p>
              )}
            </div>
          )
        )}
        {view === 'history' && <History user={user} isAdmin={isAdmin} />}
        {view === 'profile' && <Profile user={user} onLogout={handleLogout} />}
      </main>
      <nav className="bottom-bar">
        <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
          <span>🏠</span>
          <span>Dashboard</span>
        </div>
        <div className={`nav-item ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>
          <span>📅</span>
          <span>History</span>
        </div>
        <div className={`nav-item ${view === 'profile' ? 'active' : ''}`} onClick={() => setView('profile')}>
          <span>👤</span>
          <span>Profile</span>
        </div>
      </nav>
    </div>
  );
}

export default Dashboard;