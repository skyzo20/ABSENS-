import React, { useState, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase';

const getEmployeeRole = (user) => {
  const identifier = (user?.displayName || user?.email || '').toLowerCase();
  if (identifier.includes('shendy') || identifier.includes('lutfi') || identifier.includes('fian')) {
    return 'Barista';
  }
  if (identifier.includes('frisca')) {
    return 'PIC / Kapten';
  }
  if (identifier.includes('pasopati')) {
    return 'Owner';
  }
  return 'Staf';
};

const getDisplayName = (user) => {
  const identifier = (user?.displayName || user?.email || '').toLowerCase();
  if (identifier.includes('shendy')) {
    return 'Shendy Darma Putra';
  }
  if (identifier.includes('lutfi')) {
    return 'Lutfi Septiawan';
  }
  if (identifier.includes('fian')) {
    return 'Muhammad Zaisar Awalifian Siregar';
  }
  if (identifier.includes('frisca')) {
    return 'Frisca Febrina';
  }
  if (identifier.includes('pasopati')) {
    return 'Pasopati';
  }
  return user?.displayName || (user?.email ? user.email.split('@')[0] : 'Karyawan');
};

function Profile({ user, onLogout, themeMode, onThemeChange, onProfilePhotoUpdate }) {
  const [previewUrl, setPreviewUrl] = useState(user?.photoURL || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const displayName = getDisplayName(user);
  const employeeRole = getEmployeeRole(user);
  const employeeSince = '2024';

  useEffect(() => {
    const savedPhoto = user?.uid ? localStorage.getItem(`profilePhoto_${user.uid}`) : null;
    if (savedPhoto) {
      setPreviewUrl(savedPhoto);
      return;
    }
    setPreviewUrl(user?.photoURL || '');
  }, [user]);

  const handleSavePhoto = async () => {
    if (!selectedFile || !user) {
      setStatusMessage('Pilih foto terlebih dahulu.');
      return;
    }

    const currentUser = auth.currentUser || user;
    if (!currentUser) {
      setStatusMessage('Pengguna tidak terdeteksi. Silakan login ulang.');
      return;
    }

    try {
      const storageRef = ref(storage, `profilePhotos/${user.uid}/${Date.now()}-${selectedFile.name}`);
      await uploadBytes(storageRef, selectedFile);
      const photoUrl = await getDownloadURL(storageRef);
      await updateProfile(currentUser, { photoURL: photoUrl });
      localStorage.setItem(`profilePhoto_${user.uid}`, photoUrl);
      setSelectedFile(null);
      setStatusMessage('Foto profil berhasil disimpan.');
      if (onProfilePhotoUpdate) {
        onProfilePhotoUpdate();
      }
    } catch (error) {
      console.error('Update profile photo failed', error);
      setStatusMessage('Gagal menyimpan foto profil. Coba lagi.');
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatusMessage('Silakan pilih file gambar.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const loadedUrl = reader.result;
      setPreviewUrl(loadedUrl);
      setSelectedFile(file);
      setStatusMessage('Preview foto siap. Klik Simpan untuk menyimpan perubahan.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="card-profile">
      <div className="profile-header">
        <div className="avatar-lg">
          {previewUrl ? <img src={previewUrl} alt="Foto Profil" /> : user.email.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <p className="profile-badge">Akun Karyawan</p>
          <h2>{displayName}</h2>
          <p className="profile-tagline">Selamat datang di halaman profil Anda. Kelola foto, tema, dan info akun karyawan dengan mudah.</p>
        </div>
      </div>

      <div className="profile-stat-grid">
        <div className="profile-stat">
          <span>Status</span>
          <strong>Aktif</strong>
        </div>
        <div className="profile-stat">
          <span>Bagian</span>
          <strong>{employeeRole}</strong>
        </div>
        <div className="profile-stat">
          <span>Bergabung</span>
          <strong>{employeeSince}</strong>
        </div>
      </div>

      <div className="theme-toggle">
        <p>Mode Tema</p>
        <div className="theme-btn-group">
          <button
            type="button"
            className={`theme-btn ${themeMode === 'light' ? 'active' : ''}`}
            onClick={() => onThemeChange('light')}
          >
            Cerah
          </button>
          <button
            type="button"
            className={`theme-btn ${themeMode === 'dark' ? 'active' : ''}`}
            onClick={() => onThemeChange('dark')}
          >
            Gelap
          </button>
        </div>
      </div>

      <div className="photo-upload">
        <label className="photo-label" htmlFor="profilePhotoInput">
          Pilih Foto Profil
        </label>
        <input
          id="profilePhotoInput"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>
      {previewUrl && selectedFile && (
        <div className="photo-preview">
          <img src={previewUrl} alt="Preview Foto Profil" />
        </div>
      )}
      {selectedFile && (
        <button type="button" className="btn-save-photo" onClick={handleSavePhoto}>
          Simpan Foto
        </button>
      )}
      {statusMessage && <p className="profile-status">{statusMessage}</p>}

      <div className="profile-details">
        <div className="p-row">
          <span>Nama</span>
          <span>{displayName}</span>
        </div>
        <div className="p-row">
          <span>Email</span>
          <span>{user.email}</span>
        </div>
      </div>

      <button onClick={onLogout} className="btn-logout">Logout</button>
    </div>
  );
}

export default Profile;