import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';

const unwrap = (response) => response.data?.data ?? response.data;

const formatDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', {
    year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
};

export default function PendingPlacesPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // [기존 가게에 연결] 패널 상태
  const [linkTargetId, setLinkTargetId] = useState(null); // 패널이 열린 기록 id
  const [restaurants, setRestaurants] = useState(null); // 전체 가게 목록 (최초 1회 로드)
  const [linkQuery, setLinkQuery] = useState('');
  const [linking, setLinking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/api/v1/admin/tasting-notes', {
        params: { pending: 'true', page: 1, limit: 100 },
      });
      const d = unwrap(res);
      setNotes(d.data ?? []);
      setTotal(d.total ?? 0);
    } catch (e) {
      console.error(e);
      setError('미등록 가게 기록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openLinkPanel = async (noteId) => {
    setLinkTargetId((prev) => (prev === noteId ? null : noteId));
    setLinkQuery('');
    if (!restaurants) {
      try {
        const res = await apiClient.get('/api/v1/admin/restaurants');
        setRestaurants(unwrap(res) ?? []);
      } catch (e) {
        console.error(e);
        alert('가게 목록을 불러오지 못했습니다.');
      }
    }
  };

  const linkCandidates = useMemo(() => {
    if (!restaurants) return [];
    const query = linkQuery.trim().toLowerCase();
    if (!query) return [];
    return restaurants
      .filter((r) => (r.name ?? '').toLowerCase().includes(query))
      .slice(0, 8);
  }, [restaurants, linkQuery]);

  const handleLink = async (noteId, restaurant) => {
    if (linking) return;
    if (!window.confirm(`'${restaurant.name}' 가게에 연결하고 커뮤니티에 공개할까요?\n작성자에게 푸시 알림이 발송됩니다.`)) return;
    setLinking(true);
    try {
      await apiClient.post(`/api/v1/admin/tasting-notes/${noteId}/link-restaurant`, {
        restaurantId: restaurant.id,
      });
      alert('기록이 연결·공개되고 작성자에게 푸시를 보냈습니다.');
      setLinkTargetId(null);
      await load();
    } catch (e) {
      console.error(e);
      alert(`연결에 실패했습니다: ${e.response?.data?.message || e.message}`);
    } finally {
      setLinking(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>미등록 가게 기록</h1>
          <p style={s.subtitle}>
            등록 안 된 가게로 작성된 기록 {total.toLocaleString()}건 — 가게를 등록·연결(승인)하면 커뮤니티에 공개되고 작성자에게 푸시가 갑니다
          </p>
        </div>
        <button style={s.refreshBtn} onClick={load} disabled={loading}>새로고침</button>
      </div>

      {error ? (
        <div style={s.empty}>{error}</div>
      ) : loading ? (
        <div style={s.empty}>불러오는 중...</div>
      ) : notes.length === 0 ? (
        <div style={s.empty}>승인 대기 중인 미등록 가게 기록이 없습니다. 🎉</div>
      ) : (
        <div style={s.list}>
          {notes.map((note) => (
            <div key={note.id} style={s.card}>
              <div style={s.cardTop}>
                {note.photoUrl ? (
                  <img src={note.photoUrl} alt="" style={s.thumb} />
                ) : (
                  <div style={{ ...s.thumb, ...s.thumbEmpty }}>🍱</div>
                )}
                <div style={s.cardMain}>
                  <div style={s.nameRow}>
                    <span style={s.placeName}>{note.restaurantName}</span>
                    {note.pendingAddr && <span style={s.addr}>{note.pendingAddr}</span>}
                  </div>
                  <div style={s.meta}>
                    <span>{note.userNickname}</span>
                    <span>방문 {note.visitDate}</span>
                    <span>만족도 {'★'.repeat(note.satisfaction || 0) || '-'}</span>
                    <span>{formatDate(note.createdAt)} 작성</span>
                  </div>
                  {note.review ? <p style={s.review}>{note.review}</p> : null}
                </div>
              </div>

              <div style={s.actions}>
                <button
                  style={s.primaryBtn}
                  onClick={() =>
                    navigate(
                      `/restaurants?pendingNoteId=${note.id}` +
                        `&pendingName=${encodeURIComponent(note.restaurantName)}` +
                        `&pendingAddr=${encodeURIComponent(note.pendingAddr || '')}`,
                    )
                  }
                >
                  가게 등록＋승인
                </button>
                <button style={s.secondaryBtn} onClick={() => openLinkPanel(note.id)}>
                  기존 가게에 연결
                </button>
              </div>

              {linkTargetId === note.id && (
                <div style={s.linkPanel}>
                  <input
                    style={s.linkInput}
                    placeholder="연결할 가게 이름 검색"
                    value={linkQuery}
                    onChange={(e) => setLinkQuery(e.target.value)}
                    autoFocus
                  />
                  {linkQuery.trim() && (
                    <div style={s.linkResults}>
                      {linkCandidates.length === 0 ? (
                        <div style={s.linkEmpty}>검색 결과가 없습니다.</div>
                      ) : (
                        linkCandidates.map((r) => (
                          <button
                            key={r.id}
                            style={s.linkResultRow}
                            onClick={() => handleLink(note.id, r)}
                            disabled={linking}
                          >
                            <span style={s.linkResultName}>{r.name}</span>
                            <span style={s.linkResultMeta}>{[r.area, r.addr].filter(Boolean).join(' · ')}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { padding: 24, maxWidth: 900, margin: '0 auto' },
  header: {
    marginBottom: 20, display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-end', flexWrap: 'wrap', gap: 12,
  },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  subtitle: { margin: '4px 0 0', fontSize: 13, color: '#6b7280' },
  refreshBtn: {
    padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: 10,
    background: '#fff', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16 },
  cardTop: { display: 'flex', gap: 14 },
  thumb: { width: 72, height: 72, borderRadius: 10, objectFit: 'cover', flexShrink: 0 },
  thumbEmpty: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f3f4f6', fontSize: 24,
  },
  cardMain: { flex: 1, minWidth: 0 },
  nameRow: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  placeName: { fontSize: 16, fontWeight: 700, color: '#111827' },
  addr: { fontSize: 13, color: '#6b7280' },
  meta: {
    display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4,
    fontSize: 12, color: '#9ca3af',
  },
  review: {
    margin: '8px 0 0', fontSize: 13, color: '#374151', lineHeight: 1.5,
    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
  },
  actions: { display: 'flex', gap: 8, marginTop: 12 },
  primaryBtn: {
    padding: '8px 14px', border: 'none', borderRadius: 10, background: '#D4A574',
    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff',
    color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  linkPanel: { marginTop: 10, borderTop: '1px solid #f3f4f6', paddingTop: 10 },
  linkInput: {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10,
    border: '1px solid #e5e7eb', fontSize: 13, outline: 'none',
  },
  linkResults: {
    marginTop: 6, border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden',
  },
  linkResultRow: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
    width: '100%', padding: '8px 12px', border: 'none', borderBottom: '1px solid #f3f4f6',
    background: '#fff', cursor: 'pointer', textAlign: 'left',
  },
  linkResultName: { fontSize: 13, fontWeight: 600, color: '#111827' },
  linkResultMeta: { fontSize: 12, color: '#9ca3af' },
  linkEmpty: { padding: 12, fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  empty: { padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 14 },
};
