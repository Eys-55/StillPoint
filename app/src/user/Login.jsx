import React, { useState } from 'react';
import { auth } from '../firebase.jsx';
import { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/home');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFacebookLogin = async () => {
    const provider = new FacebookAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/home');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container my-5 d-flex flex-column align-items-center">
      <h1 className="mb-4">Welcome</h1>
      {error && <div className="alert alert-danger w-50 text-center">{error}</div>}
      <div className="w-50">
        <button className="btn btn-primary w-100 mb-3" onClick={handleGoogleLogin}>
          Sign in with Google
        </button>
        <button className="btn btn-primary w-100" onClick={handleFacebookLogin}>
          Sign in with Facebook
        </button>
      </div>
    </div>
  );
}

export default Login;