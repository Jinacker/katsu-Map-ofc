import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';

// 파랑 5단계 — 0은 가장 옅게, maxCount에 가까울수록 진하게
const SCALE = ['#eef4fb', '#cfe0f5', '#9cc2ea', '#5b97d9', '#2f6fbe'];

function colorFor(count, maxCount) {
  if (!count || !maxCount) return SCALE[0];
  const ratio = count / maxCount;
  if (ratio <= 0.25) return SCALE[1];
  if (ratio <= 0.5) return SCALE[2];
  if (ratio <= 0.75) return SCALE[3];
  return SCALE[4];
}

export default function VisitHeatmap() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiClient
      .get('/api/v1/admin/stats/visit-heatmap')
      .then((res) => setData(res.data?.data ?? null))
      .catch(() => setError(true));
  }, []);

  if (error) return <div className="empty-state"><p>히트맵을 불러오지 못했습니다</p></div>;
  if (!data) return <div className="empty-state"><p>불러오는 중...</p></div>;

  const cell = { width: 24, height: 24, borderRadius: 5 };

  return (
    <div>
      {/* 범례 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 12, color: '#888' }}>
        <span>낮음</span>
        {SCALE.map((c) => (
          <span key={c} style={{ ...cell, width: 16, height: 16, background: c, display: 'inline-block', border: '1px solid rgba(0,0,0,0.06)' }} />
        ))}
        <span>높음</span>
        <span style={{ marginLeft: 'auto' }}>
          {data.startDate} ~ 오늘 · 최근 {data.weeks}주 · 셀 최대 {data.maxCount}회
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'inline-block' }}>
          {/* 시간 라벨 (3시간 간격) */}
          <div style={{ display: 'flex', gap: 4, marginLeft: 34, marginBottom: 4 }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} style={{ ...cell, height: 14, fontSize: 11, color: '#999', textAlign: 'left' }}>
                {h % 3 === 0 ? h : ''}
              </div>
            ))}
          </div>
          {/* 요일 행 */}
          {data.days.map((row) => (
            <div key={row.day} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <div style={{ width: 30, fontSize: 12, color: '#888', textAlign: 'center' }}>{row.day}</div>
              {row.hours.map((count, hour) => (
                <div
                  key={hour}
                  title={`${row.day} ${hour}시 — ${count}회 방문`}
                  style={{ ...cell, background: colorFor(count, data.maxCount), border: '1px solid rgba(0,0,0,0.05)' }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
