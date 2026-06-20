import React, { useState, useEffect, useCallback } from 'react';
import CheckIn from './CheckIn';
import History from './History';
import Profile from './Profile';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const IconAdmin = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 18H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconEdit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 17.25V21h3.75L17.81 10.94l-3.75-3.75L4 17.25Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14.06 6.94 17.06 9.94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconCalendar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M3 8h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="3" y="6" width="18" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const IconUser = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" stroke="currentColor" strokeWidth="2" />
    <path d="M3 22c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconTheme = ({ mode }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {mode === 'dark' ? (
      <path d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M17.36 17.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M17.36 6.64l1.42-1.42M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

const summarizeRecords = (records) => {
  const groups = records.reduce((acc, record) => {
    const key = record.email || record.userId || 'Unknown';
    if (!acc[key]) {
      acc[key] = { email: key, entries: [], totalSeconds: 0, clockInCount: 0, clockOutCount: 0, dailyTotals: {} };
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
      const entryDate = entry.date || new Date(entry.timestamp.seconds * 1000).toISOString().split('T')[0];
      if (entry.action === 'Clock In') {
        lastCheckIn = entry.timestamp.seconds;
      } else if (entry.action === 'Clock Out' && lastCheckIn) {
        const delta = Math.max(0, (entry.timestamp.seconds || 0) - lastCheckIn);
        totalSeconds += delta;
        group.dailyTotals[entryDate] = (group.dailyTotals[entryDate] || 0) + delta;
        lastCheckIn = null;
      }
    });

    const dailyHours = Object.entries(group.dailyTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, seconds]) => ({ date, hours: formatDuration(seconds), seconds }));
    const todayKey = new Date().toISOString().split('T')[0];
    const todayEntry = dailyHours.find((item) => item.date === todayKey);

    return {
      ...group,
      entries,
      totalSeconds,
      totalHours: formatDuration(totalSeconds),
      dailyHours,
      todayHours: todayEntry ? todayEntry.hours : '0h 0m',
      name: group.email.split('@')[0]
    };
  });
};

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function Dashboard({ user, isAdmin }) {
  const now = new Date();
  const [view, setView] = useState('dashboard');
  const [showCamera, setShowCamera] = useState(false);
  const [action, setAction] = useState('');
  const [checkInDone, setCheckInDone] = useState(false);
  const [currentTime, setCurrentTime] = useState(now);
  const [adminSummaries, setAdminSummaries] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingRecords, setEditingRecords] = useState([]);
  const [editingLoading, setEditingLoading] = useState(false);
  const [themeMode, setThemeMode] = useState(() => {
  const savedTheme = localStorage.getItem('themeMode');

  if (savedTheme) {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
});
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(user.photoURL || localStorage.getItem(`profilePhoto_${user.uid}`) || '');

  useEffect(() => {
    setProfilePhotoUrl(user.photoURL || localStorage.getItem(`profilePhoto_${user.uid}`) || '');
  }, [user]);

  const updateProfilePhotoUrl = useCallback(() => {
    setProfilePhotoUrl(user.photoURL || localStorage.getItem(`profilePhoto_${user.uid}`) || '');
  }, [user.uid, user.photoURL]);

  const totalAdminUsers = adminSummaries.length;
  const totalAdminSeconds = adminSummaries.reduce((acc, summary) => acc + (summary.totalSeconds || 0), 0);
  const totalAdminHours = formatDuration(totalAdminSeconds);


  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  const fetchAdminData = useCallback(async () => {
    setAdminLoading(true);
    const monthStart = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
    const monthEnd = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(new Date(selectedYear, selectedMonth + 1, 0).getDate()).padStart(2, '0')}`;
    const q = query(
      collection(db, 'attendance'),
      where('date', '>=', monthStart),
      where('date', '<=', monthEnd)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setAdminSummaries(summarizeRecords(data));
    setAdminLoading(false);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (isAdmin) {
      setCheckInDone(false);
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
  }, [user.uid, isAdmin, fetchAdminData]);

  useEffect(() => {
    if (!isAdmin) return;
    setAdminLoading(true);
    const monthStart = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
    const monthEnd = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(new Date(selectedYear, selectedMonth + 1, 0).getDate()).padStart(2, '0')}`;
    const q = query(
      collection(db, 'attendance'),
      where('date', '>=', monthStart),
      where('date', '<=', monthEnd)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAdminSummaries(summarizeRecords(data));
        setAdminLoading(false);
      },
      (error) => {
        console.error('Realtime admin data failed', error);
        setAdminLoading(false);
      }
    );

    return unsubscribe;
  }, [isAdmin, selectedMonth, selectedYear]);

  const openEdit = async (email) => {
    setEditingUser(email);
    setEditingLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const q = query(
        collection(db, 'attendance'),
        where('date', '==', today),
        where('email', '==', email)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEditingRecords(data.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)));
    } catch (err) {
      console.error('Open edit failed', err);
      setEditingRecords([]);
    }
    setEditingLoading(false);
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditingRecords([]);
  };

  const addAttendance = async (email, actionType) => {
    setEditingLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const timestamp = { seconds: Math.floor(Date.now() / 1000) };
      await addDoc(collection(db, 'attendance'), {
        email,
        action: actionType,
        date: today,
        timestamp
      });
      await fetchAdminData();
      await openEdit(email);
    } catch (err) {
      console.error('Add attendance failed', err);
    }
    setEditingLoading(false);
  };

  const deleteAttendance = async (recordId, email) => {
    setEditingLoading(true);
    try {
      await deleteDoc(doc(db, 'attendance', recordId));
      await fetchAdminData();
      await openEdit(email);
    } catch (err) {
      console.error('Delete attendance failed', err);
    }
    setEditingLoading(false);
  };

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
    <div className={`app-shell ${themeMode === 'dark' ? 'theme-dark' : ''}`}>
      <header className="top-nav">
        <div className="user-profile-sm">
          <div className="avatar-sm">
            {profilePhotoUrl ? <img src={profilePhotoUrl} alt="Avatar" /> : user.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="top-greeting">Halo, {user.email.split('@')[0]}</p>
            <p className="top-status">Bekerja dengan ikhlas dan penuh semangat yah!!!</p>
          </div>
        </div>
        <button className="theme-toggle-top" onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}>
          <IconTheme mode={themeMode} />
          <span>{themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </header>
      <main className="content">
        {view === 'dashboard' && (
          isAdmin ? (
            <>
              <div className="card-attendance admin-card">
                <div className="card-header">
                  <div>
                    <p className="card-title"><IconAdmin /> Admin Panel</p>
                    <p className="card-subtitle">Lihat jam kerja per bulan dan detail harian setiap karyawan secara real time.</p>
                  </div>
                  <span className="status-pill admin">Admin</span>
                </div>
                <div className="admin-summary">
                  <p className="admin-line">Mode: <strong>Admin</strong></p>
                  <p className="admin-line">Admin dapat memperbaiki data dan meninjau jam kerja per hari.</p>
                  <p className="admin-line">Tekan ✏️ untuk membuka detail dan mengedit catatan absen.</p>
                </div>
                <div className="admin-kpi-row">
                  <div className="admin-kpi-card">
                    <p>Total Pegawai</p>
                    <strong>{totalAdminUsers}</strong>
                  </div>
                  <div className="admin-kpi-card">
                    <p>Total Jam Bulan Ini</p>
                    <strong>{totalAdminHours}</strong>
                  </div>
                </div>
                <div className="admin-filter">
                  <label>
                    Bulan:
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                      {monthNames.map((name, idx) => (
                        <option key={name} value={idx}>{name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Tahun:
                    <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                      {[selectedYear, selectedYear - 1].map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </label>
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
                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                          <button className="edit-btn" onClick={() => openEdit(summary.email)} title="Edit absen">
                            <IconEdit />
                          </button>
                          <span className="status-pill active">{summary.totalHours}</span>
                        </div>
                      </div>
                    <div className="admin-row">
                      <span>Clock In</span>
                      <strong>{summary.clockInCount}</strong>
                    </div>
                    <div className="admin-row">
                      <span>Clock Out</span>
                      <strong>{summary.clockOutCount}</strong>
                    </div>
                    <div className="admin-row monthly-summary">
                      <span>Total Bulan Ini</span>
                      <strong>{summary.totalHours}</strong>
                    </div>
                    <div className="daily-hours">
                      {summary.dailyHours?.map((day) => (
                        <div key={day.date} className="daily-row">
                          <span>{day.date.slice(8)}</span>
                          <span>{day.hours}</span>
                        </div>
                      ))}
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
        {view === 'profile' && <Profile user={user} onLogout={handleLogout} themeMode={themeMode} onThemeChange={setThemeMode} onProfilePhotoUpdate={updateProfilePhotoUrl} />}
      </main>
        {editingUser && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Edit Absen: {editingUser}</h3>
                <button className="modal-close" onClick={closeEdit}>✖</button>
              </div>
              <div className="modal-body">
                <div className="edit-actions">
                  <button className="btn-export" onClick={() => addAttendance(editingUser, 'Clock In')} disabled={editingLoading}>Tambah Clock In</button>
                  <button className="btn-export" onClick={() => addAttendance(editingUser, 'Clock Out')} disabled={editingLoading}>Tambah Clock Out</button>
                </div>
                {editingLoading && <p>Memuat...</p>}
                {!editingLoading && editingRecords.length === 0 && <p>Tidak ada catatan untuk hari ini.</p>}
                <div className="edit-list">
                  {editingRecords.map((r) => (
                    <div key={r.id} className="edit-item">
                      <div>
                        <strong>{r.action}</strong>
                        <div className="entry-time">{r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000).toLocaleTimeString('id-ID') : 'Waktu tidak tersedia'}</div>
                      </div>
                      <div>
                        <button className="btn-cancel" onClick={() => deleteAttendance(r.id, editingUser)} disabled={editingLoading}>Hapus</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      <nav className="bottom-bar">
        <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
          <IconHome />
          <span>Dashboard</span>
        </div>
        <div className={`nav-item ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>
          <IconCalendar />
          <span>History</span>
        </div>
        <div className={`nav-item ${view === 'profile' ? 'active' : ''}`} onClick={() => setView('profile')}>
          <IconUser />
          <span>Profile</span>
        </div>
      </nav>
    </div>
  );
}

export default Dashboard;