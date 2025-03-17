import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.jsx';
import { useAuthState } from 'react-firebase-hooks/auth';
import { updateProfile, deleteUser } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function Settings() {
  const [user, loading] = useAuthState(auth);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (user) {
      try {
        await updateProfile(user, { displayName: name });
        setMessage("Profile updated successfully.");
      } catch (error) {
        setMessage("Error updating profile: " + error.message);
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        await deleteUser(user);
        navigate('/login');
      } catch (error) {
        setMessage("Error deleting account: " + error.message);
      }
    }
  };

  const isDarkMode = document.body.getAttribute("data-bs-theme") === "dark";
  const containerClass = isDarkMode ? 'bg-dark text-light' : 'bg-light text-dark';

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in to view settings.</div>;

  return (
    <div className={`container py-5 ${containerClass}`}>
      <h1>User Settings</h1>
      {message && <div className="alert alert-info">{message}</div>}
      <form onSubmit={handleSave}>
        <div className="mb-3">
          <label htmlFor="name" className="form-label">Display Name</label>
          <input
            type="text"
            className="form-control"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">Save Changes</button>
      </form>
      <hr />
      <h2>Privacy and Data Management</h2>
      <p>
        You have full control over your personal data. Edit your information and manage how your data is used.
      </p>
      <button className="btn btn-danger" onClick={handleDeleteAccount}>
        Delete Account
      </button>
      <button className="btn btn-secondary mt-3" onClick={() => navigate('/privacy')}>
        Privacy Policy
      </button>
    </div>
  );
}

export default Settings;