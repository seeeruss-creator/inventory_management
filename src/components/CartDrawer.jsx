import React from 'react';
import { api } from '../api';

const CartDrawer = ({ open, lines = [], onChangeQty, onRemove, onClose, onCheckout, busy }) => {
  if (!open) return null;
  const totalLines = lines.length;
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3>Cart</h3>
          <button className="modal-close" onClick={onClose}>&#x2715;</button>
        </div>
        {totalLines === 0 ? (
          <div style={{ padding: 16, color: 'var(--text-muted)' }}>Cart is empty.</div>
        ) : (
          <div className="cart-content">
            {lines.map((l) => (
              <div key={l.product.id} className="cart-line">
                <div>
                  <div style={{ fontWeight: 600 }}>{l.product.name}</div>
                  <div className="category-badge" style={{ display: 'inline-block', marginTop: 4 }}>{l.product.category}</div>
                </div>
                <input type="number" min="1" value={l.qty} onChange={(e) => onChangeQty(l.product.id, Number(e.target.value) || 1)} />
                <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>x{l.qty}</div>
                <button className="btn-delete" onClick={() => onRemove(l.product.id)}>Remove</button>
              </div>
            ))}
            <div className="cart-actions">
              <button className="btn-gray" onClick={onClose}>Close</button>
              <div style={{ flex: 1 }} />
              <button className="btn-green" onClick={onCheckout} disabled={busy}>{busy ? 'Processing…' : 'Checkout'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;

