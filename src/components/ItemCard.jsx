import React, { useState } from 'react';

const ItemCard = ({ item, onSell, onRestock, onDelete, canDelete, onAddToCart, onEditRecipe, isAdmin }) => {
  const [qty, setQty] = useState('1');
  const lowStock = Number(item.stock) < 10;

  return (
    <div className="item-card">
      <div className="item-top">
        <h3>{item.name}</h3>
        <span className="category-badge">{item.category}</span>
      </div>

      <div className="stock-row">
        <span className="stock-label">{item.item_type === 'product' ? 'Est. Stock' : 'Stock'}</span>
        <strong style={lowStock ? { color: '#fcd34d' } : {}}>{item.stock}</strong>
      </div>

      <div className="price-tag">₱{Number(item.price).toFixed(2)} / unit</div>

      {lowStock && (
        <div className="low-stock-badge">Low Stock</div>
      )}

      <div className="qty-row">
        <span className="qty-label">Qty</span>
        <input
          type="number"
          min="1"
          value={qty}
          onChange={(e) => {
            let v = e.target.value;
            if (v.length > 1 && v.startsWith('0') && !v.startsWith('0.')) {
              v = v.replace(/^0+/, '');
            }
            setQty(v);
          }}
          onBlur={() => {
            if (!qty || Number(qty) < 1) setQty('1');
          }}
        />
      </div>

      <div className="card-actions">
        {item.item_type === 'product' && Number(item.has_recipe) > 0 && onAddToCart && (
          <button className="btn-green" onClick={() => onAddToCart(item, Number(qty) || 1)}>
            Add to Cart
          </button>
        )}
        {item.item_type === 'product' && Number(item.has_recipe) === 0 && (
          <button className="btn-red" onClick={() => onSell(item.id, Number(qty) || 1)}>
            Sold
          </button>
        )}
        {(item.item_type === 'ingredient' || (item.item_type === 'product' && Number(item.has_recipe) === 0)) && (
          <button className="btn-green" onClick={() => onRestock(item.id, Number(qty) || 1)}>
            Restock
          </button>
        )}
      </div>

      {isAdmin && item.item_type === 'product' && onEditRecipe && (
        <button className="btn-edit" onClick={() => onEditRecipe(item)} style={{ marginTop: 8 }}>
          Edit Recipe
        </button>
      )}

      {canDelete && (
        <button className="btn-delete" onClick={() => onDelete(item.id)}>
          Delete Item
        </button>
      )}
    </div>
  );
};

export default ItemCard;
