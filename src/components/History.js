import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

function History({ user, isAdmin }) {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const q = isAdmin
        ? query(collection(db, 'attendance'), orderBy('timestamp', 'desc'))
        : query(
            collection(db, 'attendance'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc')
          );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(data);
    };
    fetchHistory();
  }, [user, isAdmin]);

  const buildDateGroups = entries =>
    Object.values(
      entries.reduce((acc, record) => {
        const dateKey = record.date ||
          (record.timestamp?.seconds
            ? new Date(record.timestamp.seconds * 1000).toLocaleDateString('id-ID')
            : 'Unknown date');
        const timestampSeconds = record.timestamp?.seconds || 0;

        if (!acc[dateKey]) {
          acc[dateKey] = { date: dateKey, entries: [], sortKey: timestampSeconds };
        }
        acc[dateKey].entries.push(record);
        acc[dateKey].sortKey = Math.max(acc[dateKey].sortKey, timestampSeconds);
        return acc;
      }, {})
    ).sort((a, b) => b.sortKey - a.sortKey);

  const historySections = isAdmin
    ? Object.values(
        records.reduce((acc, record) => {
          const email = record.email || 'Unknown Pegawai';
          if (!acc[email]) {
            acc[email] = { email, entries: [] };
          }
          acc[email].entries.push(record);
          return acc;
        }, {})
      )
        .map(userGroup => ({
          email: userGroup.email,
          dateGroups: buildDateGroups(userGroup.entries),
          totalActivities: userGroup.entries.length
        }))
        .sort((a, b) => (b.dateGroups[0]?.sortKey || 0) - (a.dateGroups[0]?.sortKey || 0))
    : [
        {
          email: user.email || 'Riwayat Saya',
          dateGroups: buildDateGroups(records),
          totalActivities: records.length
        }
      ];

  return (
    <div className="history-page">
      <h2>Riwayat Absensi</h2>
      {records.length === 0 && <p className="empty-history">Belum ada riwayat absensi.</p>}
      <div className="history-grid">
        {historySections.map(section => (
          <div key={section.email} className="history-user-card">
            <div className="history-user-card-header">
              <div>
                <p className="history-user-title">{section.email}</p>
                <p className="history-user-count">{section.totalActivities} aktivitas</p>
              </div>
              <span className="hist-badge">{section.totalActivities}</span>
            </div>
            {section.dateGroups.map(group => (
              <div key={group.date} className="history-item">
                <div className="hist-top">
                  <div>
                    <p className="hist-date">{group.date}</p>
                    <p className="hist-count">{group.entries.length} aktivitas</p>
                  </div>
                  <span className="hist-badge">{group.entries.length}</span>
                </div>
                <div className="history-entries">
                  {group.entries
                    .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
                    .map(entry => (
                      <div key={entry.id} className="history-entry">
                        <div className="entry-info">
                          <span className="entry-action">{entry.action}</span>
                          {isAdmin && entry.email && (
                            <span className="entry-user">{entry.email}</span>
                          )}
                          <span className="entry-time">
                            {entry.timestamp?.seconds
                              ? new Date(entry.timestamp.seconds * 1000).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Waktu tidak tersedia'}
                          </span>
                        </div>
                        <div className="entry-photo">
                          <img
                            src={entry.photo}
                            alt={`Attendance photo ${entry.action}`}
                            className="thumb-absen"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default History;