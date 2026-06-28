import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DailyUsersChart = ({ data, mode = 'daily' }) => {
  const chartData = data.map(item => {
    if (mode === 'monthly') {
      return {
        ...item,
        displayDate: new Date(`${item.date}T00:00:00+09:00`).toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
        }),
        tooltipDate: item.date,
      };
    }
    if (mode === 'weekly') {
      const d = new Date(item.weekStart);
      const end = new Date(d);
      end.setDate(end.getDate() + 6);
      const fmt = (dt) => dt.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
      return {
        ...item,
        displayDate: `${fmt(d)}~${fmt(end)}`,
        tooltipDate: `${item.weekStart} 주`,
        count: item.count,
      };
    }
    return {
      ...item,
      displayDate: new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      tooltipDate: item.date,
    };
  });

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
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
            {payload[0].payload.tooltipDate}
          </p>
          {payload.map((item) => (
            <p
              key={item.dataKey}
              style={{ color: item.color, fontSize: '14px', fontWeight: '600', margin: '3px 0 0' }}
            >
              {item.name}: {item.value}명
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D4A574" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#D4A574" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8B7EC4" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="#8B7EC4" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6E2DC" vertical={false} />
        <XAxis
          dataKey="displayDate"
          tick={{ fill: '#9E9893', fontSize: 11 }}
          axisLine={{ stroke: '#E6E2DC' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fill: '#9E9893', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {mode === 'monthly' && (
          <Legend
            verticalAlign="top"
            align="right"
            height={32}
            iconType="circle"
            wrapperStyle={{ fontSize: 12, color: '#6F6A66' }}
          />
        )}
        <Area
          type="monotone"
          dataKey={mode === 'monthly' ? 'activeUsers' : 'count'}
          name={mode === 'monthly' ? '활성 사용자' : '사용자'}
          stroke="#D4A574"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorUsers)"
        />
        {mode === 'monthly' && (
          <Area
            type="monotone"
            dataKey="newUsers"
            name="신규 가입자"
            stroke="#8B7EC4"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRegistrations)"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default DailyUsersChart;
