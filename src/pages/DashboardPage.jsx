import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Sidebar from '../components/Sidebar';
import ItemCard from '../components/ItemCard';
import ItemModal from '../components/ItemModal';
import TransactionsTable from '../components/TransactionsTable';
import StaffModal from '../components/StaffModal';
import SalesChart from '../components/SalesChart';
import RecipeEditor from '../components/RecipeEditor';
import CartDrawer from '../components/CartDrawer';
const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [txStartDate, setTxStartDate] = useState('');
  const [txEndDate, setTxEndDate] = useState('');

  const [accounts, setAccounts] = useState([]);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [recipeProduct, setRecipeProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartBusy, setCartBusy] = useState(false);
  const [cartLines, setCartLines] = useState([]); // { product, qty }

  const isAdmin = user?.role === 'admin';

  const loadData = async () => {
    try {
      const [itemsRes, txRes, accountsRes] = await Promise.all([
        api.get('/items'),
        api.get('/transactions'),
        isAdmin ? api.get('/staff') : Promise.resolve({ data: [] }),
      ]);
      const nextItems = Array.isArray(itemsRes.data) ? itemsRes.data : [];
      const nextTx = Array.isArray(txRes.data) ? txRes.data : [];
      const nextAccounts = Array.isArray(accountsRes.data) ? accountsRes.data : [];
      setItems(nextItems);
      setTransactions(nextTx);
      if (isAdmin) setAccounts(nextAccounts);
    } catch (_e) {
      // Clear stale UI when API isn't reachable so ghost items don't linger
      setItems([]);
      setTransactions([]);
      if (isAdmin) setAccounts([]);
    }
  };

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 4000);
    return () => clearInterval(id);
  }, [isAdmin]);

  const categories = useMemo(
    () => ['All', ...new Set(items.map((i) => i.category))],
    [items]
  );

  useEffect(() => {
    if (category !== 'All' && !categories.includes(category)) {
      setCategory('All');
    }
  }, [category, categories]);

  const filteredItems = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'All' || item.category === category;
    return matchSearch && matchCategory;
  });

  const filteredTransactions = useMemo(() => {
    if (!txStartDate && !txEndDate) return transactions;
    const start = txStartDate ? new Date(txStartDate) : new Date('1970-01-01');
    const end = txEndDate ? new Date(txEndDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const rangeStart = start <= end ? start : end;
    const rangeEnd = start <= end ? end : start;
    return transactions.filter((t) => {
      const d = new Date(t.created_at);
      return d >= rangeStart && d <= rangeEnd;
    });
  }, [transactions, txStartDate, txEndDate]);

  const summary = {
    totalItems: items.length,
    lowStock: items.filter((i) => i.stock < 10).length,
    salesToday: transactions
      .filter(
        (t) =>
          t.type === 'sale' &&
          new Date(t.created_at).toDateString() === new Date().toDateString()
      )
      .reduce((sum, t) => sum + Number(t.quantity), 0),
  };

  const updateStock = async (itemId, quantity, type) => {
    const item = items.find(i => i.id === itemId);
    if (type === 'sale' && item && item.item_type === 'product') {
      await api.post('/sales', { product_id: itemId, quantity: Number(quantity) });
    } else {
      const endpoint = type === 'sale' ? '/stock/deduct' : '/stock/add';
      await api.post(endpoint, { item_id: itemId, quantity: Number(quantity) });
    }
    loadData();
  };

  const saveItem = async (payload) => {
    if (editingItem) {
      await api.put(`/items/${editingItem.id}`, payload);
    } else {
      const res = await api.post('/items', payload);
      const newId = res?.data?.id;
      // If admin selected "Menu (gagawin…)" open recipe editor immediately
      if (isAdmin && payload.product_mode === 'product_made' && newId) {
        setRecipeProduct({ id: newId, name: payload.name });
        setRecipeOpen(true);
      }
    }
    setModalOpen(false);
    setEditingItem(null);
    loadData();
  };

  const removeItem = async (id) => {
    if (!window.confirm('Delete this item? This cannot be undone.')) return;
    await api.delete(`/items/${id}`);
    loadData();
  };

  const openAddModal = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const openRecipeEditor = (product) => {
    setRecipeProduct(product);
    setRecipeOpen(true);
  };

  const addToCart = (product, qty) => {
    setCartOpen(true);
    setCartLines((prev) => {
      const idx = prev.findIndex((l) => l.product.id === product.id);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { product, qty }];
    });
  };

  const changeCartQty = (productId, qty) => {
    setCartLines((prev) => prev.map(l => l.product.id === productId ? { ...l, qty: Math.max(1, qty) } : l));
  };

  const removeFromCart = (productId) => {
    setCartLines((prev) => prev.filter(l => l.product.id !== productId));
  };

  const checkoutCart = async () => {
    setCartBusy(true);
    try {
      for (const line of cartLines) {
        await api.post('/sales', { product_id: line.product.id, quantity: Number(line.qty) || 1 });
      }
      setCartLines([]);
      setCartOpen(false);
      loadData();
    } catch (e) {
      alert(e?.response?.data?.message || 'Checkout failed');
    } finally {
      setCartBusy(false);
    }
  };

  const saveAccount = async (payload) => {
    await api.post('/staff', payload);
    loadData();
  };

  const deleteAllItems = async () => {
    if (!window.confirm('Delete ALL items, recipes, and transactions? This cannot be undone.')) return;
    await api.delete('/admin/items');
    setCategory('All');
    setSearch('');
    loadData();
  };

  const removeAccount = async (id) => {
    if (!window.confirm('Delete this user account?')) return;
    await api.delete(`/staff/${id}`);
    loadData();
  };

  const tabLabel = {
    dashboard: isAdmin ? 'Dashboard' : 'Inventory',
    inventory: 'Inventory Table',
    logs: 'Transaction Logs',
    accounts: 'User Accounts',
  };

  return (
    <div className="layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main">
        {/* Top Bar */}
        <header className="topbar">
          <div className="topbar-left">
            <h2>{tabLabel[activeTab] || 'Dashboard'}</h2>
            <p>Welcome back, <strong>{user?.username}</strong></p>
          </div>
          <div className="top-actions">
          </div>
        </header>

        {/* Content */}
        <section className="content">

          {/* Dashboard / Items Tab */}
          {activeTab === 'dashboard' && (
            <>
              {isAdmin && (
                <div className="summary-grid">
                  <div className="summary-card">
                    <span>Total Items</span>
                    <strong>{summary.totalItems}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Low Stock</span>
                    <strong>{summary.lowStock}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Sales Today</span>
                    <strong>{summary.salesToday}</strong>
                  </div>
                </div>
              )}

              {isAdmin && (
                <SalesChart transactions={transactions} />
              )}

              <div className="toolbar">
                <div className="search-wrap">
                  <input
                    placeholder="Search items..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                {(isAdmin || user) && (
                  <button className="btn-green" onClick={openAddModal}>
                    {isAdmin ? 'Add Item' : 'Add Menu Item'}
                  </button>
                )}
                {isAdmin && (
                  <button
                    className="btn-danger"
                    onClick={deleteAllItems}
                    style={{ marginLeft: 8 }}
                  >
                    Delete All
                  </button>
                )}
              </div>

              {filteredItems.length === 0 ? (
                <div className="empty-state">
                  <p>No items found. {isAdmin && 'Click "Add Item" to get started.'}</p>
                </div>
              ) : (
                <>
                  <h3 className="section-title" style={{ margin: '12px 0' }}>Menu (Products)</h3>
                  <div className="cards-grid">
                    {filteredItems.filter(i => i.item_type === 'product').map((item) => (
                      <div className="card-wrapper" key={item.id}>
                        <ItemCard
                          item={item}
                          onSell={(id, qty) => updateStock(id, qty, 'sale')}
                          onRestock={(id, qty) => updateStock(id, qty, 'restock')}
                          onDelete={removeItem}
                          canDelete={isAdmin}
                          onAddToCart={addToCart}
                          onEditRecipe={openRecipeEditor}
                          isAdmin={isAdmin}
                        />
                        {isAdmin && (
                          <button className="btn-edit" onClick={() => openEditModal(item)}>
                            Edit Item
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <h3 className="section-title" style={{ margin: '16px 0' }}>Inventory (Ingredients)</h3>
                  <div className="cards-grid">
                    {filteredItems.filter(i => i.item_type === 'ingredient').map((item) => (
                      <div className="card-wrapper" key={item.id}>
                        <ItemCard
                          item={item}
                          onSell={(id, qty) => updateStock(id, qty, 'sale')}
                          onRestock={(id, qty) => updateStock(id, qty, 'restock')}
                          onDelete={removeItem}
                          canDelete={isAdmin}
                          isAdmin={isAdmin}
                        />
                        {isAdmin && (
                          <button className="btn-edit" onClick={() => openEditModal(item)}>
                            Edit Item
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* Inventory Table Tab */}
          {activeTab === 'inventory' && (
            <>
              {isAdmin && (
                <div className="toolbar">
                  <div className="search-wrap">
                    <input
                      placeholder="Search items..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="admin-table-wrap">
                {filteredItems.length === 0 ? (
                  <div className="empty-state">
                    <p>No items in inventory.</p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Stock</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((i) => (
                        <tr key={i.id}>
                          <td style={{ fontWeight: 600 }}>{i.name}</td>
                          <td>
                            <span className="category-badge">{i.category}</span>
                          </td>
                          <td>
                            <span style={Number(i.stock) < 10 ? { color: '#fcd34d', fontWeight: 700 } : { fontWeight: 700 }}>
                              {i.stock}
                            </span>
                          </td>
                          <td>₱{Number(i.price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* Transactions Tab */}
          {activeTab === 'logs' && (
            <>
              {isAdmin && (
                <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                  <div className="date-range-row">
                    <span className="date-range-label">Date Range:</span>
                    <input
                      className="chart-filter"
                      type="date"
                      value={txStartDate}
                      onChange={(e) => setTxStartDate(e.target.value)}
                    />
                    <span className="date-range-label">to</span>
                    <input
                      className="chart-filter"
                      type="date"
                      value={txEndDate}
                      onChange={(e) => setTxEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <TransactionsTable transactions={filteredTransactions} />
            </>
          )}

          {/* Accounts Tab */}
          {isAdmin && activeTab === 'accounts' && (
            <>
              <div className="page-header" style={{ alignItems: 'center' }}>
                <div></div>
                <button className="btn-green" onClick={() => setStaffModalOpen(true)}>
                  Create Account
                </button>
              </div>

              <div className="staff-section">
                <div className="staff-list-card">
                  {accounts.map((acc) => {
                    const isOnline = acc.last_active && (Date.now() - new Date(acc.last_active).getTime() < 5 * 60 * 1000); // 5 mins
                    return (
                      <div className="staff-row" key={acc.id}>
                        <div className="staff-info">
                          <div className="staff-avatar">
                            {acc.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="staff-name">{acc.username}</div>
                            <div className="staff-role">{acc.role}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          {isOnline ? (
                            <span className="badge badge-green">Online</span>
                          ) : (
                            <span className="badge" style={{ color: 'var(--text-muted)' }}>Offline</span>
                          )}
                          {acc.id !== user.id && acc.id !== 1 && (
                            <button className="btn-danger" onClick={() => removeAccount(acc.id)}>
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      <ItemModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        onSave={saveItem}
        editingItem={editingItem}
        isAdmin={isAdmin}
      />

      <StaffModal
        open={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        onSave={saveAccount}
      />

      <RecipeEditor
        open={recipeOpen}
        product={recipeProduct}
        onClose={() => setRecipeOpen(false)}
        onSaved={loadData}
      />

      <CartDrawer
        open={cartOpen}
        lines={cartLines}
        onChangeQty={changeCartQty}
        onRemove={removeFromCart}
        onClose={() => setCartOpen(false)}
        onCheckout={checkoutCart}
        busy={cartBusy}
      />
    </div>
  );
};

export default DashboardPage;
