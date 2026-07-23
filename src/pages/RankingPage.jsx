import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import UserProfileModal from '../components/UserProfileModal';

const MEDALS = ['🥇', '🥈', '🥉'];

const PERIOD_TABS = [
  { key: 'all', label: '전체' },
  { key: 'monthly', label: '월간' },
];

export default function RankingPage() {
  const now = new Date();
  const [period, setPeriod] = useState('all');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    fetchRanking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, year, month]);

  const fetchRanking = async () => {
    setLoading(true);
    try {
      const params = { limit: 100, period };
      if (period === 'monthly') {
        params.year = year;
        params.month = month;
      }
      const res = await api.get('/api/v1/admin/users/ranking', { params });
      const d = res.data?.data ?? res.data;
      setRanking(Array.isArray(d) ? d : []);
    } catch (e) {
      alert('불러오기 실패: ' + (e.response?.data?.message ?? e.message));
    } finally {
      setLoading(false);
    }
  };

  const moveMonth = (delta) => {
    let y = year;
    let m = month + delta;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setYear(y);
    setMonth(m);
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>유저 랭킹</h1>
          <p style={s.subtitle}>기록 수 기준 상위 100명 · 유저를 누르면 프로필이 열립니다</p>
        </div>
        <div style={s.tabs}>
          {PERIOD_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setPeriod(t.key)}
              style={{ ...s.tab, ...(period === t.key ? s.tabActive : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {period === 'monthly' && (
        <div style={s.monthNav}>
          <button onClick={() => moveMonth(-1)} style={s.monthBtn}>←</button>
          <span style={s.monthLabel}>{year}년 {month}월</span>
          <button
            onClick={() => moveMonth(1)}
            disabled={isCurrentMonth}
            style={{ ...s.monthBtn, ...(isCurrentMonth ? s.monthBtnDisabled : {}) }}
          >
            →
          </button>
        </div>
      )}

      {loading ? (
        <div style={s.center}>불러오는 중...</div>
      ) : ranking.length === 0 ? (
        <div style={s.center}>랭킹 데이터가 없습니다.</div>
      ) : (
        <div style={s.list}>
          {ranking.map((r) => (
            <button
              key={r.userId}
              onClick={() => setSelectedUserId(r.userId)}
              style={{ ...s.row, ...(r.rank <= 3 ? s.rowTop : {}) }}
            >
              <span style={s.rankCell}>
                {r.rank <= 3 ? MEDALS[r.rank - 1] : r.rank}
              </span>
              <span style={s.nameCell}>
                <span style={s.nickname}>{r.nickname}</span>
                {!r.isProfilePublic && <span style={s.privateTag}>비공개</span>}
                <span style={s.uid}>#{r.userId}</span>
              </span>
              <span style={s.counts}>
                <span style={s.countChip}>기록 <b>{r.recordCount}</b></span>
                <span style={s.countChip}>즐찾 <b>{r.favoriteCount}</b></span>
                <span style={s.countChip}>제보 <b>{r.reportCount}</b></span>
              </span>
            </button>
          ))}
        </div>
      )}

      <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
    </div>
  );
}

const s = {
  page: { padding: 24, maxWidth: 900, margin: '0 auto' },
  header: {
    marginBottom: 16, display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-end', flexWrap: 'wrap', gap: 12,
  },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  subtitle: { margin: '4px 0 0', fontSize: 14, color: '#6b7280' },
  tabs: { display: 'flex', gap: 6, background: '#f3f4f6', padding: 4, borderRadius: 10 },
  tab: {
    padding: '6px 16px', border: 'none', borderRadius: 8, background: 'transparent',
    fontSize: 14, fontWeight: 600, color: '#6b7280', cursor: 'pointer',
  },
  tabActive: { background: '#fff', color: '#111827', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
  monthNav: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 12, marginBottom: 16,
  },
  monthBtn: {
    padding: '4px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
    background: '#fff', fontSize: 14, cursor: 'pointer', color: '#374151',
  },
  monthBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  monthLabel: { fontSize: 15, fontWeight: 700, color: '#111827', minWidth: 110, textAlign: 'center' },
  center: { padding: 60, textAlign: 'center', color: '#9ca3af' },
  list: { display: 'flex', flexDirection: 'column', gap: 6 },
  row: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
    padding: '12px 16px', cursor: 'pointer', textAlign: 'left', fontSize: 14,
  },
  rowTop: { borderColor: '#fcd9b6', background: '#fffcf8' },
  rankCell: {
    width: 36, textAlign: 'center', fontSize: 15, fontWeight: 700,
    color: '#6b7280', flexShrink: 0,
  },
  nameCell: { display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, flexWrap: 'wrap' },
  nickname: { fontWeight: 700, color: '#111827' },
  privateTag: {
    fontSize: 10, fontWeight: 700, color: '#6b7280', background: '#f3f4f6',
    padding: '1px 6px', borderRadius: 4,
  },
  uid: { fontSize: 12, color: '#c4c9d2' },
  counts: { display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' },
  countChip: { fontSize: 12, color: '#6b7280' },
};
