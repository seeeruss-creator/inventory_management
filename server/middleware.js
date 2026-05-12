import { pool } from './db.js';

export const roleGuard = (...roles) => (req, res, next) => {
  const role = String(req.headers['x-user-role'] || '').toLowerCase();
  if (!role || !roles.includes(role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  req.user = {
    role,
    id: Number(req.headers['x-user-id'] || 0)
  };

  // Update last active asynchronously (fire and forget)
  if (req.user.id) {
    pool.query('UPDATE users SET last_active = NOW() WHERE id = ?', [req.user.id]).catch(() => {});
  }

  return next();
};
