import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const SalesChart = ({ transactions = [] }) => {
  const [filter, setFilter] = useState('week'); // 'day', 'week', 'month'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const data = useMemo(() => {
    const sales = transactions.filter(t => t.type === 'sale');
    const now = new Date();
    const result = [];
    const rangeActive = Boolean(startDate || endDate);

    if (rangeActive) {
      const start = startDate ? new Date(startDate) : new Date('1970-01-01');
      const end = endDate ? new Date(endDate) : now;
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const rangeStart = start <= end ? start : end;
      const rangeEnd = start <= end ? end : start;
      const dayTotals = new Map();

      for (
        let d = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
        d <= rangeEnd;
        d.setDate(d.getDate() + 1)
      ) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dayTotals.set(key, 0);
      }

      sales.forEach((sale) => {
        const d = new Date(sale.created_at);
        if (d >= rangeStart && d <= rangeEnd) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          dayTotals.set(key, (dayTotals.get(key) || 0) + Number(sale.quantity || 0));
        }
      });

      dayTotals.forEach((total, key) => {
        const [y, m, day] = key.split('-').map(Number);
        const labelDate = new Date(y, m - 1, day);
        result.push({
          name: labelDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          total,
          key,
        });
      });

      return result;
    }

    if (filter === 'day') {
      // Last 24 hours grouped by hour
      // Let's do 0:00 to 23:00 for the current day
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      for (let i = 0; i < 24; i++) {
        // Label like "12am", "1am", ...
        const label = i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`;
        result.push({ name: label, total: 0, hour: i });
      }
      
      sales.forEach(sale => {
        const d = new Date(sale.created_at);
        if (
          d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear()
        ) {
          const hour = d.getHours();
          result[hour].total += Number(sale.quantity || 0);
        }
      });
      return result;
      
    } else if (filter === 'week') {
      // Last 7 days including today
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        // Format like "Mon", "Tue"
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' }); 
        result.push({ name: dayStr, total: 0, time: d.getTime(), date: d.getDate() });
      }
      
      sales.forEach(sale => {
        const saleDate = new Date(sale.created_at);
        // Find matching day in result
        result.forEach(r => {
          const rDate = new Date(r.time);
          if (
            saleDate.getDate() === rDate.getDate() &&
            saleDate.getMonth() === rDate.getMonth() &&
            saleDate.getFullYear() === rDate.getFullYear()
          ) {
            r.total += Number(sale.quantity || 0);
          }
        });
      });
      return result;
      
    } else if (filter === 'month') {
      // This Month (1 to length of current month)
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        result.push({ name: `${i}`, total: 0 });
      }
      
      sales.forEach(sale => {
        const d = new Date(sale.created_at);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          const dateNum = d.getDate();
          result[dateNum - 1].total += Number(sale.quantity || 0);
        }
      });
      return result;
    }
  }, [transactions, filter, startDate, endDate]);

  return (
    <div className="sales-chart-container">
      <div className="sales-chart-header">
        <h3 className="section-title" style={{ padding: 0 }}>Sales Performance</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="date-range-row">
            <span className="date-range-label">Date Range:</span>
            <input
              className="chart-filter"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="date-range-label">to</span>
            <input
              className="chart-filter"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <select 
            className="chart-filter"
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            disabled={Boolean(startDate || endDate)}
          >
            <option value="day">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>
      
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={1}>
          <LineChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }} 
              dy={15} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }} 
              dx={-10}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--surface)', 
                borderColor: 'var(--border)', 
                borderRadius: '8px', 
                color: 'var(--text)',
                boxShadow: 'var(--shadow)'
              }}
              itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
              labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px' }}
              formatter={(value) => [`${value} items`, 'Sold']}
            />
            <Line 
              type="monotone" 
              dataKey="total" 
              name="Items Sold"
              stroke="var(--primary)" 
              strokeWidth={3}
              dot={{ fill: 'var(--surface)', stroke: 'var(--primary)', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: 'var(--primary)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesChart;
