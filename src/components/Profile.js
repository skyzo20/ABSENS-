import React from 'react';

function Profile({ user, onLogout }) {
  return (
    <div className="card-profile">
      <div className="avatar-lg">{user.email.charAt(0).toUpperCase()}</div>
      <h2>{user.email}</h2>
      <div className="p-row">
        <span>Email:</span>
        <span>{user.email}</span>
      </div>
      <button onClick={onLogout} className="btn-logout">Logout</button>
    </div>
  );
}

export default Profile;