import React, { useState } from 'react';

const ROLES = ['staff', 'admin'];

const StaffModal = ({ open, onClose, onSave }) => {
  const [form, setForm]     = useState({ username: '', password: '', confirm: '', role: 'staff' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const reset = () => {
    setForm({ username: '', password: '', confirm: '', role: 'staff' });
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    if (!form.username.trim()) { setError('Username is required.'); return; }
    if (form.password.length < 4) { setError('Password must be at least 4 characters.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      await onSave({ username: form.username.trim().toLowerCase(), password: form.password, role: form.role });
      reset();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Create Account</h3>
          <button className="modal-close" onClick={handleClose}>&#x2715;</button>
        </div>

        <div className="modal-field">
          <label>Username</label>
          <input
            placeholder="e.g. juan"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            autoFocus
          />
        </div>

        <div className="modal-field">
          <label>Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              fontSize: '0.95rem',
              color: 'var(--text)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {ROLES.map((r) => (
              <option key={r} value={r} style={{ background: '#121929' }}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-field">
          <label>Password</label>
          <input
            type="password"
            placeholder="Min 4 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <div className="modal-field">
          <label>Confirm Password</label>
          <input
            type="password"
            placeholder="Re-enter password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </div>

        {error && <div className="error-box" style={{ marginBottom: 0 }}>{error}</div>}

        <div className="modal-actions">
          <button className="btn-gray" onClick={handleClose} disabled={loading}>Cancel</button>
          <button className="btn-green" onClick={handleSave} disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffModal;
