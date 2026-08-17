import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';

const PAGE_LIMIT = 50;

const SORT_TABS = [
  { key: 'latest', label: '최신순' },
  { key: 'hot', label: '핫한순' },
];

// 맛집 관리 탭과 동일한 별 등급 표기 (top5=★★★★, best=★★★, good=★★, 일반=★)
function getGradeLabel(r) {
  if (r.isTop5) return { text: '★★★★', bg: '#FFE5E5' };
  if (r.isBest) return { text: '★★★', bg: '#FFF0F0' };
  if (r.isGood) return { text: '★★', bg: '#FFF5F5' };
  return { text: '★', bg: '#FFF5F5' };
}

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', {
    year: '2-digit', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── 요즘 많이 조회되는 가게 (익명 집계 기반) ─────────────────
const RANGE_TABS = [
  { key: '7d', label: '최근 7일', days: 7 },
  { key: '30d', label: '최근 30일', days: 30 },
];
const TOP_PREVIEW_COUNT = 5;

const kstDayLabel = (offsetDays = 0) =>
  new Date(Date.now() + 9 * 60 * 60 * 1000 - offsetDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

function TrendingRestaurants() {
  const [range, setRange] = useState('7d');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const days = RANGE_TABS.find((t) => t.key === range)?.days ?? 7;
        const res = await api.get('/api/v1/admin/analytics/restaurants', {
          params: { from: kstDayLabel(days - 1), to: kstDayLabel(0), limit: 100 },
        });
        const d = res.data?.data ?? res.data;
        if (!cancelled) setItems(d.items ?? []);
      } catch (e) {
        if (!cancelled) setError('조회수 데이터를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [range]);

  const visibleItems = expanded ? items : items.slice(0, TOP_PREVIEW_COUNT);

  return (
    <section style={s.trendingSection}>
      <div style={s.sectionHeader}>
        <div>
          <h2 style={s.sectionTitle}>요즘 많이 조회되는 가게</h2>
          <p style={s.subtitle}>앱에서 가게 상세를 연 횟수 · 참여 유저는 일별 순 사용자 합 (익명 집계)</p>
        </div>
        <div style={s.tabs}>
          {RANGE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setRange(t.key)}
              style={{ ...s.tab, ...(range === t.key ? s.tabActive : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div style={s.empty}>{error}</div>
      ) : loading ? (
        <div style={s.loading}>불러오는 중...</div>
      ) : items.length === 0 ? (
        <div style={s.empty}>기간 내 가게 조회 기록이 없습니다.</div>
      ) : (
        <div style={s.trendingCard}>
          {visibleItems.map((item, index) => {
            const grade = getGradeLabel(item);
            return (
              <div
                key={`${item.restaurantId}-${index}`}
                style={{
                  ...s.trendingRow,
                  ...(index === visibleItems.length - 1 && items.length <= TOP_PREVIEW_COUNT
                    ? { borderBottom: 'none' }
                    : {}),
                }}
              >
                <span style={s.rank}>{index + 1}</span>
                <div style={s.nameWrap}>
                  <span style={{ ...s.badge, background: grade.bg }}>{grade.text}</span>
                  <span style={s.name}>{item.name ?? `삭제된 가게 #${item.restaurantId}`}</span>
                  {item.area && <span style={s.area}>{item.area}</span>}
                </div>
                <div style={s.trendingNums}>
                  <span style={s.viewCount}>{(item.count ?? 0).toLocaleString()}회</span>
                  <span style={s.viewUsers}>{(item.uniqueUsers ?? 0).toLocaleString()}명</span>
                </div>
              </div>
            );
          })}
          {items.length > TOP_PREVIEW_COUNT && (
            <button style={s.expandBtn} onClick={() => setExpanded((prev) => !prev)}>
              {expanded ? '접기' : `전체보기 (${items.length}곳)`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default function GradeVotesPage() {
  const [sort, setSort] = useState('latest');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadingRef = useRef(false);
  const loaderRef = useRef(null);

  const fetchPage = useCallback(async (targetPage, replace) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await api.get('/api/v1/admin/grade-votes', {
        params: { page: targetPage, limit: PAGE_LIMIT, sort },
      });
      const d = res.data?.data ?? res.data;
      const rows = d.data ?? [];
      setTotal(d.total ?? 0);
      setItems((prev) => (replace ? rows : [...prev, ...rows]));
      setHasMore(rows.length === PAGE_LIMIT);
      setPage(targetPage);
    } catch (e) {
      alert('불러오기 실패: ' + (e.response?.data?.message ?? e.message));
      setHasMore(false);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [sort]);

  // 정렬 탭 변경 시 목록 초기화 후 첫 페이지 로드
  useEffect(() => {
    setItems([]);
    setHasMore(true);
    setPage(1);
    fetchPage(1, true);
  }, [fetchPage]);

  // 무한 스크롤
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          fetchPage(page + 1, false);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, page, fetchPage]);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>가게 리서치</h1>
          <p style={s.subtitle}>가게 조회수와 등급 투표를 한눈에 봅니다</p>
        </div>
      </div>

      <TrendingRestaurants />

      <div style={s.sectionHeader}>
        <div>
          <h2 style={s.sectionTitle}>가게 등급 투표</h2>
          <p style={s.subtitle}>등급 변경 투표가 있는 가게 {total.toLocaleString()}곳</p>
        </div>
        <div style={s.tabs}>
          {SORT_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setSort(t.key)}
              style={{ ...s.tab, ...(sort === t.key ? s.tabActive : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 && !loading ? (
        <div style={s.empty}>투표 데이터가 없습니다.</div>
      ) : (
        <div style={s.list}>
          {items.map((r) => {
            const grade = getGradeLabel(r);
            const denom = r.total || 1;
            return (
              <div key={r.restaurantId} style={s.card}>
                <div style={s.cardTop}>
                  <div style={s.nameWrap}>
                    <span style={{ ...s.badge, background: grade.bg }}>
                      {grade.text}
                    </span>
                    <span style={s.name}>{r.restaurantName}</span>
                    {r.area && <span style={s.area}>{r.area}</span>}
                  </div>
                  <div style={s.rightMeta}>
                    <span style={s.totalCount}>{r.total.toLocaleString()}표</span>
                    <span style={s.lastVoted}>{formatDate(r.lastVotedAt)}</span>
                  </div>
                </div>

                <div style={s.bar}>
                  <div style={{ ...s.barSeg, background: '#22c55e', flex: r.up }} />
                  <div style={{ ...s.barSeg, background: '#d1d5db', flex: r.keep }} />
                  <div style={{ ...s.barSeg, background: '#ef4444', flex: r.down }} />
                </div>

                <div style={s.counts}>
                  <span style={{ ...s.chip, color: '#16a34a' }}>
                    ▲ 올려 <b>{r.up}</b> ({Math.round((r.up / denom) * 100)}%)
                  </span>
                  <span style={{ ...s.chip, color: '#6b7280' }}>
                    적절 <b>{r.keep}</b> ({Math.round((r.keep / denom) * 100)}%)
                  </span>
                  <span style={{ ...s.chip, color: '#dc2626' }}>
                    ▼ 내려 <b>{r.down}</b> ({Math.round((r.down / denom) * 100)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading && <div style={s.loading}>불러오는 중...</div>}
      <div ref={loaderRef} style={{ height: 1 }} />
    </div>
  );
}

const s = {
  page: { padding: 24, maxWidth: 1000, margin: '0 auto' },
  header: {
    marginBottom: 20, display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-end', flexWrap: 'wrap', gap: 12,
  },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  subtitle: { margin: '4px 0 0', fontSize: 14, color: '#6b7280' },
  trendingSection: { marginBottom: 28 },
  sectionHeader: {
    marginBottom: 12, display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-end', flexWrap: 'wrap', gap: 12,
  },
  sectionTitle: { margin: 0, fontSize: 17, fontWeight: 700 },
  trendingCard: { background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' },
  trendingRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
    borderBottom: '1px solid #f3f4f6',
  },
  rank: {
    width: 24, textAlign: 'center', fontSize: 14, fontWeight: 700,
    color: '#9ca3af', flexShrink: 0, fontVariantNumeric: 'tabular-nums',
  },
  trendingNums: {
    marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 10,
    flexShrink: 0, fontVariantNumeric: 'tabular-nums',
  },
  viewCount: { fontSize: 15, fontWeight: 700, color: '#111827' },
  viewUsers: { fontSize: 13, color: '#9ca3af' },
  expandBtn: {
    display: 'block', width: '100%', padding: '10px 0', border: 'none',
    borderTop: '1px solid #f3f4f6', background: '#fafafa', color: '#6b7280',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  tabs: { display: 'flex', gap: 6, background: '#f3f4f6', padding: 4, borderRadius: 10 },
  tab: {
    padding: '6px 16px', border: 'none', borderRadius: 8, background: 'transparent',
    fontSize: 14, fontWeight: 600, color: '#6b7280', cursor: 'pointer',
  },
  tabActive: { background: '#fff', color: '#111827', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16 },
  cardTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 12, marginBottom: 12, flexWrap: 'wrap',
  },
  nameWrap: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: {
    fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
    color: '#C8102E', letterSpacing: 1,
  },
  name: { fontWeight: 700, fontSize: 16, color: '#111827' },
  area: { fontSize: 13, color: '#9ca3af' },
  rightMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 },
  totalCount: { fontSize: 15, fontWeight: 700, color: '#111827' },
  lastVoted: { fontSize: 12, color: '#9ca3af' },
  bar: {
    display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden',
    background: '#f3f4f6', marginBottom: 10,
  },
  barSeg: { minWidth: 0 },
  counts: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  chip: { fontSize: 13, fontWeight: 500 },
  loading: { padding: 24, textAlign: 'center', color: '#9ca3af' },
  empty: { padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 15 },
};
