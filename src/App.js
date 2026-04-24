import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { auth } from './firebase';

const ADMIN_EMAILS = [
  'kamal@gmail.com'
];

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setIsAdmin(user ? ADMIN_EMAILS.includes(user.email) : false);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="app">
      {user ? <Dashboard user={user} isAdmin={isAdmin} /> : <Login />}
    </div>
  );
}

export default App;