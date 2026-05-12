import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const emptyRow = { ingredient_id: '', qty_per_serving: '', unit: '' };

const RecipeEditor = ({ open, product, onClose, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [rows, setRows] = useState([ { ...emptyRow } ]);
  const productName = product?.name || '';

  const loadData = async () => {
    if (!product?.id) return;
    setLoading(true);
    try {
      const [itemsRes, recipeRes] = await Promise.all([
        api.get('/items'),
        api.get(`/recipes/${product.id}`)
      ]);
      const allItems = Array.isArray(itemsRes.data) ? itemsRes.data : [];
      const ingredientItems = allItems.filter(i => i.item_type === 'ingredient');
      setIngredients(ingredientItems);
      const recipe = Array.isArray(recipeRes.data) && recipeRes.data.length
        ? recipeRes.data.map(r => ({
            ingredient_id: r.ingredient_id,
            qty_per_serving: String(r.qty_per_serving),
            unit: r.unit || ''
          }))
        : [ { ...emptyRow } ];
      setRows(recipe);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadData();
  }, [open, product?.id]);

  if (!open || !product) return null;

  const updateRow = (idx, patch) => {
    const next = rows.slice();
    next[idx] = { ...next[idx], ...patch };
    setRows(next);
  };

  const addRow = () => setRows([...rows, { ...emptyRow }]);
  const removeRow = (idx) => {
    const next = rows.filter((_, i) => i !== idx);
    setRows(next.length ? next : [ { ...emptyRow } ]);
  };

  const save = async () => {
    const cleaned = rows
      .filter(r => r.ingredient_id && Number(r.qty_per_serving) > 0)
      .map(r => ({
        ingredient_id: Number(r.ingredient_id),
        qty_per_serving: Number(r.qty_per_serving),
        unit: String(r.unit || '')
      }));
    await api.put(`/recipes/${product.id}`, { ingredients: cleaned });
    if (onSaved) onSaved();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <h3>Recipe for {productName}</h3>
          <button className="modal-close" onClick={onClose}>&#x2715;</button>
        </div>

        {loading ? (
          <div style={{ padding: 16 }}>Loading…</div>
        ) : (
          <div style={{ paddingTop: 8 }}>
            {rows.map((r, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <select
                  value={r.ingredient_id}
                  onChange={(e) => updateRow(idx, { ingredient_id: e.target.value })}
                >
                  <option value="">Select ingredient…</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>{ing.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="Qty / serving"
                  value={r.qty_per_serving}
                  onChange={(e) => updateRow(idx, { qty_per_serving: e.target.value })}
                />
                <input
                  placeholder="Unit (ml, g, pcs)"
                  value={r.unit}
                  onChange={(e) => updateRow(idx, { unit: e.target.value })}
                />
                <button className="btn-delete" onClick={() => removeRow(idx)}>Remove</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn-green" onClick={addRow}>Add Ingredient</button>
              <div style={{ flex: 1 }} />
              <button className="btn-gray" onClick={onClose}>Cancel</button>
              <button className="btn-green" onClick={save}>Save Recipe</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeEditor;

