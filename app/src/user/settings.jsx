import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.jsx';
import { useAuthState } from 'react-firebase-hooks/auth';
import { updateProfile, deleteUser } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function Settings({ darkMode, setDarkMode }) {
  const [user, loading] = useAuthState(auth);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
    }
  }, [user]);

  useEffect(() => {
    document.body.setAttribute("data-bs-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

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

  if (loading) return <div className="text-center py-5">Loading...</div>;
  if (!user) return <div className="text-center py-5">Please log in to view settings.</div>;

  return (
    <div className="card mx-auto" style={{ maxWidth: '600px', marginTop: '50px' }}>
      <div className="card-body">
        <h1 className="card-title mb-4">User Settings</h1>
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
          <button type="submit" className="btn btn-primary w-100 mb-3">Save Changes</button>
        </form>
        <hr />
        <h2 className="h5">Privacy and Data Management</h2>
        <p className="mb-3">
          You have full control over your personal data. Edit your information and manage how your data is used.
        </p>
        <button className="btn btn-danger w-100" onClick={handleDeleteAccount}>
          Delete Account
        </button>
        <button className="btn btn-secondary w-100 mt-3" onClick={() => navigate('/privacy')}>
          Privacy Policy
        </button>
        <button className="btn btn-secondary w-100 mt-3" onClick={toggleDarkMode}>
          {darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        </button>
      </div>
    </div>
  );
}

export default Settings;