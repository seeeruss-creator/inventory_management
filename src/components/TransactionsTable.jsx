import React from 'react';

const TransactionsTable = ({ transactions }) => (
  <div>
    <p className="section-title">Transaction Logs</p>
    <div className="table-wrap" style={{ marginTop: '16px' }}>
      {transactions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <p>No transactions recorded yet.</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Date &amp; Time</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.item_name}</td>
                <td>
                  <span className={`badge ${t.type === 'sale' ? 'badge-red' : 'badge-green'}`}>
                    {t.type === 'sale' ? '↓ Sale' : '↑ Restock'}
                  </span>
                </td>
                <td style={{ fontWeight: 700 }}>{t.quantity}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                  {new Date(t.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

export default TransactionsTable;
