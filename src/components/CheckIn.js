import React, { useRef, useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

function CheckIn({ action, onClose, onSuccess, user }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError('');
    } catch (err) {
      setError('Gagal mengakses kamera: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const photoBase64 = canvas.toDataURL('image/jpeg', 0.7);
      stopCamera();
      setPhoto(photoBase64);
      setError('');
    }
  };

  const savePhoto = async () => {
    if (!photo) {
      setError('Silakan ambil foto terlebih dahulu.');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'attendance'), {
        userId: user.uid,
        email: user.email,
        action,
        timestamp: serverTimestamp(),
        photo,
        date: new Date().toISOString().split('T')[0]
      });
      alert(`Sukses ${action}!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError('Gagal menyimpan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    setError('');
    startCamera();
  };

  return (
    <div className="camera-section">
      {error && <p className="form-error">{error}</p>}
      {!photo ? (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="video-feed"></video>
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
          <button onClick={capturePhoto} className="btn-capture">Capture {action}</button>
          <button onClick={onClose} className="btn-cancel">Cancel</button>
        </>
      ) : (
        <div className="capture-preview">
          <img src={photo} alt="Preview check-in" className="preview-image" />
          <div className="preview-actions">
            <button onClick={savePhoto} className="btn-capture" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Foto'}
            </button>
            <button onClick={retakePhoto} className="btn-cancel">Ulangi Foto</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CheckIn;