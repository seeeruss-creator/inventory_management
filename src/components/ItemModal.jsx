import React, { useEffect, useState } from 'react';

const initialState = { name: '', category: 'Drinks', stock: '', price: '', item_type: 'product', product_mode: 'product_made' };

const ItemModal = ({ open, onClose, onSave, editingItem, isAdmin = false }) => {
  const [form, setForm] = useState(initialState);

  useEffect(() => {
    if (editingItem) {
      setForm({
        ...editingItem,
        stock: String(editingItem.stock),
        price: String(editingItem.price),
        item_type: editingItem.item_type || 'product',
        product_mode: editingItem.item_type === 'ingredient' ? 'ingredient' : 'product_made'
      });
    } else {
      setForm(initialState);
    }
  }, [editingItem, open]);

  if (!open) return null;

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
          <button className="modal-close" onClick={onClose}>&#x2715;</button>
        </div>

        <div className="modal-field">
          <label>Item Name</label>
          <input placeholder="e.g. Coca Cola" value={form.name} onChange={set('name')} />
        </div>

        <div className="modal-field">
          <label>Category</label>
          <input placeholder="e.g. Drinks, Ingredients" value={form.category} onChange={set('category')} />
        </div>

        {isAdmin ? (
          <div className="modal-field">
            <label>Item Type</label>
            <select
              value={form.product_mode}
              onChange={(e) => {
                const mode = e.target.value;
                setForm({
                  ...form,
                  product_mode: mode,
                  item_type: mode === 'ingredient' ? 'ingredient' : 'product'
                });
              }}
            >
              <option value="product_made">Menu (gagawin sa tindahan - may recipe)</option>
              <option value="product_ready">Panindang ready-made (nire-restock)</option>
              <option value="ingredient">Sangkap / Raw ingredient</option>
            </select>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              Tip: Para sa ready-made (hal. softdrinks), piliin ang “Panindang ready-made”. Para sa mga niluluto/iniinom na ginagawa sa tindahan, piliin ang “Menu” at mag-setup ng recipe.
            </div>
          </div>
        ) : (
          <>
            <input type="hidden" value={form.item_type} readOnly />
            <input type="hidden" value={form.product_mode} readOnly />
          </>
        )}

        <div className="modal-field">
          <label>Stock</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={form.stock}
            onChange={(e) => {
              let val = e.target.value;
              if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
              setForm({ ...form, stock: val });
            }}
          />
        </div>

        <div className="modal-field">
          <label>Price (&#8369;)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.price}
            onChange={(e) => {
              let val = e.target.value;
              if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
              setForm({ ...form, price: val });
            }}
          />
        </div>

        <div className="modal-actions">
          <button className="btn-gray" onClick={onClose}>Cancel</button>
          <button className="btn-green" onClick={() => onSave(form)}>
            {editingItem ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemModal;
