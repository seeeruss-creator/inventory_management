import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) { setError('Please enter your username.'); return; }
    if (!password)        { setError('Please enter your password.');  return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/login', { username: username.trim(), password });
      login(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Floating Pulsing Background Orbs */}
      <div className="premium-bg-container">
        <div className="floating-orb orb-1"></div>
        <div className="floating-orb orb-2"></div>
        <div className="floating-orb orb-3"></div>
        <div className="animated-gradient-bg"></div>
      </div>

      <form className="login-card" onSubmit={handleSubmit}>
        {/* Restaurant Logo Badge */}
        <div className="login-logo-premium">
          <span className="restaurant-initial">J</span>
        </div>

        <h1 className="gradient-title">
          <span className="gradient-text">Joaquin's</span>
          <span className="gradient-text" style={{animationDelay: '0.1s'}}>Restaurant</span>
        </h1>
        <p className="premium-subtitle">Premium Inventory Management</p>

        <div className="form-group">
          <label className="field-label" htmlFor="username">
            <span className="label-icon">👤</span>
            Username
          </label>
          <div className="input-wrapper">
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username..."
              autoComplete="username"
              autoFocus
              className="premium-input"
            />
            <div className="input-glow-effect"></div>
          </div>
        </div>

        <div className="form-group">
          <label className="field-label" htmlFor="password">
            <span className="label-icon">🔐</span>
            Password
          </label>
          <div className="input-wrapper password-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password..."
              autoComplete="current-password"
              className="premium-input"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
            <div className="input-glow-effect"></div>
          </div>
        </div>

        {error && <div className="premium-error-box">{error}</div>}

        <button className="btn-premium" type="submit" disabled={loading}>
          <span className="btn-text">{loading ? 'Signing In...' : 'Sign In'}</span>
          <span className="btn-glow"></span>
        </button>

        <p className="login-hint">
          Demo: <code>admin</code> / <code>admin123</code>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
