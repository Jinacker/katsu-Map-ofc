import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const PAGE_LIMIT = 20;

const SATISFACTION_LABELS = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];

export default function UserRecordsPage() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, [page]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/admin/tasting-notes', {
        params: { page, limit: PAGE_LIMIT },
      });
      const d = res.data?.data ?? res.data;
      setRecords(d.data ?? []);
      setTotal(d.total ?? 0);
    } catch (e) {
      alert('불러오기 실패: ' + (e.response?.data?.message ?? e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 기록을 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/api/v1/admin/tasting-notes/${id}`);
      fetchRecords();
    } catch (e) {
      alert('삭제 실패: ' + (e.response?.data?.message ?? e.message));
    }
  };

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>유저 기록</h1>
          <p style={s.subtitle}>전체 {total.toLocaleString()}개</p>
        </div>
      </div>

      {loading ? (
        <div style={s.loading}>불러오는 중...</div>
      ) : records.length === 0 ? (
        <div style={s.empty}>기록이 없습니다.</div>
      ) : (
        <div style={s.grid}>
          {records.map((r) => (
            <div key={r.id} style={s.card}>
              {r.photoUrl ? (
                <img src={r.photoUrl} alt="" style={s.photo} />
              ) : (
                <div style={s.noPhoto}>사진 없음</div>
              )}
              <div style={s.cardBody}>
                <div style={s.cardTop}>
                  <span style={s.restaurant}>{r.restaurantName}</span>
                  {r.satisfaction > 0 && (
                    <span style={s.stars}>{SATISFACTION_LABELS[r.satisfaction]}</span>
                  )}
                </div>
                <div style={s.meta}>
                  <span style={s.nickname}>@{r.userNickname}</span>
                  <span style={s.dot}>·</span>
                  <span style={s.date}>{r.visitDate}</span>
                  {r.menuName && (
                    <>
                      <span style={s.dot}>·</span>
                      <span style={s.menu}>{r.menuName}</span>
                    </>
                  )}
                </div>
                {r.review && <p style={s.review}>{r.review}</p>}
              </div>
              <button onClick={() => handleDelete(r.id)} style={s.deleteBtn}>삭제</button>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={s.pagination}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...s.pageBtn, ...(page === 1 ? s.pageBtnDisabled : {}) }}
          >
            ← 이전
          </button>
          <div style={s.pageNumbers}>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pageNum = getPageNum(page, totalPages, i);
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  style={{ ...s.pageBtn, ...(page === pageNum ? s.pageBtnActive : {}) }}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ ...s.pageBtn, ...(page === totalPages ? s.pageBtnDisabled : {}) }}
          >
            다음 →
          </button>
          <span style={s.pageInfo}>{page} / {totalPages}</span>
        </div>
      )}
    </div>
  );
}

function getPageNum(current, total, index) {
  if (total <= 7) return index + 1;
  if (current <= 4) return index + 1;
  if (current >= total - 3) return total - 6 + index;
  return current - 3 + index;
}

const s = {
  page: { padding: 24, maxWidth: 1200, margin: '0 auto' },
  header: { marginBottom: 20 },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  subtitle: { margin: '4px 0 0', fontSize: 14, color: '#6b7280' },
  loading: { padding: 60, textAlign: 'center', color: '#9ca3af' },
  empty: { padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 15 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  card: {
    background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
  },
  photo: { width: '100%', height: 140, objectFit: 'cover' },
  noPhoto: {
    width: '100%', height: 70, background: '#f3f4f6',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, color: '#9ca3af',
  },
  cardBody: { padding: '12px 14px', flex: 1 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  restaurant: { fontWeight: 700, fontSize: 15, color: '#111827' },
  stars: { fontSize: 12, color: '#d97706', letterSpacing: 1 },
  meta: { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 8 },
  nickname: { fontSize: 12, color: '#6b7280', fontWeight: 500 },
  dot: { fontSize: 10, color: '#d1d5db' },
  date: { fontSize: 12, color: '#9ca3af' },
  menu: { fontSize: 12, color: '#374151', background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 },
  review: { margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  deleteBtn: {
    margin: '0 14px 14px', padding: '6px 0', background: 'none',
    border: '1px solid #fca5a5', borderRadius: 8, color: '#ef4444',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 28, flexWrap: 'wrap' },
  pageNumbers: { display: 'flex', gap: 4 },
  pageBtn: {
    padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
    background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151',
  },
  pageBtnActive: { background: '#d6483e', borderColor: '#d6483e', color: '#fff', fontWeight: 700 },
  pageBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  pageInfo: { fontSize: 13, color: '#9ca3af', marginLeft: 8 },
};
