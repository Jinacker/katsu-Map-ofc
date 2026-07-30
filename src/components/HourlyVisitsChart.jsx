import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const HourlyVisitsChart = ({ data }) => {
  const chartData = data.map((item) => ({
    ...item,
    displayHour: `${item.hour}시`,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { hour, count } = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          padding: '12px 16px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
            {hour}시 ~ {(hour + 1) % 24}시
          </p>
          <p style={{ color: '#D4A574', fontSize: '14px', fontWeight: '600', margin: 0 }}>
            방문 {count.toLocaleString()}회
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6E2DC" vertical={false} />
        <XAxis
          dataKey="displayHour"
          tick={{ fill: '#9E9893', fontSize: 11 }}
          axisLine={{ stroke: '#E6E2DC' }}
          tickLine={false}
          interval={2}
        />
        <YAxis tick={{ fill: '#9E9893', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(212, 165, 116, 0.12)' }} />
        <Bar dataKey="count" name="방문" fill="#D4A574" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default HourlyVisitsChart;
