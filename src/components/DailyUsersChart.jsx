import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DailyUsersChart = ({ data }) => {
  // Transform the data to include formatted date
  const chartData = data.map(item => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          padding: '12px 16px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: '13px',
            marginBottom: '4px'
          }}>
            {payload[0].payload.date}
          </p>
          <p style={{
            color: 'var(--color-text-primary)',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            {payload[0].value}명
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D4A574" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#D4A574" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#E6E2DC"
          vertical={false}
        />
        <XAxis
          dataKey="displayDate"
          tick={{ fill: '#9E9893', fontSize: 12 }}
          axisLine={{ stroke: '#E6E2DC' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#9E9893', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#D4A574"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorUsers)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default DailyUsersChart;
