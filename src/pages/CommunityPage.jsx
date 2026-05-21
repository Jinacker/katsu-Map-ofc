import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const PAGE_LIMIT = 20;
const SATISFACTION_LABELS = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];

export default function CommunityPage() {
  const [notes, setNotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // 댓글 모달
  const [selectedNote, setSelectedNote] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/admin/community/feed', {
        params: { page, limit: PAGE_LIMIT },
      });
      const d = res.data?.data ?? res.data;
      setNotes(d.data ?? []);
      setTotal(d.total ?? 0);
    } catch (e) {
      alert('불러오기 실패: ' + (e.response?.data?.message ?? e.message));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleDeleteNote = async (id) => {
    if (!window.confirm('이 기록을 완전히 삭제하겠습니까?\n(유저의 기록 탭에서도 사라집니다)')) return;
    try {
      await api.delete(`/api/v1/admin/tasting-notes/${id}`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setTotal((t) => t - 1);
      if (selectedNote?.id === id) setSelectedNote(null);
    } catch (e) {
      alert('삭제 실패: ' + (e.response?.data?.message ?? e.message));
    }
  };

  const openComments = async (note) => {
    setSelectedNote(note);
    setCommentsLoading(true);
    try {
      const res = await api.get(`/api/v1/admin/community/feed/${note.id}/comments`);
      setComments(res.data?.data ?? res.data ?? []);
    } catch (e) {
      alert('댓글 불러오기 실패: ' + (e.response?.data?.message ?? e.message));
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('이 댓글을 삭제하겠습니까?')) return;
    try {
      await api.delete(`/api/v1/admin/community/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setNotes((prev) =>
        prev.map((n) =>
          n.id === selectedNote?.id ? { ...n, commentCount: n.commentCount - 1 } : n
        )
      );
    } catch (e) {
      alert('댓글 삭제 실패: ' + (e.response?.data?.message ?? e.message));
    }
  };

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>커뮤니티 관리</h1>
          <p style={s.subtitle}>공개 기록 {total.toLocaleString()}개</p>
        </div>
      </div>

      {loading ? (
        <div style={s.loading}>불러오는 중...</div>
      ) : notes.length === 0 ? (
        <div style={s.empty}>공개된 기록이 없습니다.</div>
      ) : (
        <div style={s.grid}>
          {notes.map((note) => (
            <div key={note.id} style={s.card}>
              {note.photoUrl ? (
                <img src={note.photoUrl} alt="" style={s.photo} />
              ) : (
                <div style={s.noPhoto}>사진 없음</div>
              )}
              <div style={s.cardBody}>
                <div style={s.cardTop}>
                  <span style={s.restaurant}>{note.restaurantName}</span>
                  {note.satisfaction > 0 && (
                    <span style={s.stars}>{SATISFACTION_LABELS[note.satisfaction]}</span>
                  )}
                </div>
                <div style={s.meta}>
                  <span style={s.nickname}>@{note.userNickname}</span>
                  <span style={s.dot}>·</span>
                  <span style={s.date}>
                    {new Date(note.createdAt).toLocaleDateString('ko-KR', {
                      month: '2-digit', day: '2-digit',
                    })}
                  </span>
                  {note.menuName && (
                    <>
                      <span style={s.dot}>·</span>
                      <span style={s.menu}>{note.menuName}</span>
                    </>
                  )}
                </div>
                {note.review && <p style={s.review}>{note.review}</p>}
                <div style={s.stats}>
                  <span style={s.stat}>❤️ {note.likeCount}</span>
                  <span style={s.stat}>💬 {note.commentCount}</span>
                </div>
              </div>
              <div style={s.actions}>
                <button
                  onClick={() => openComments(note)}
                  style={s.commentBtn}
                >
                  댓글 보기
                </button>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  style={s.hideBtn}
                >
                  삭제
                </button>
              </div>
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

      {/* 댓글 모달 */}
      {selectedNote && (
        <div style={s.overlay} onClick={() => setSelectedNote(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={s.modalTitle}>{selectedNote.restaurantName} 댓글</div>
                <div style={s.modalSub}>@{selectedNote.userNickname}</div>
              </div>
              <button onClick={() => setSelectedNote(null)} style={s.closeBtn}>✕</button>
            </div>
            <div style={s.commentList}>
              {commentsLoading ? (
                <div style={s.commentLoading}>불러오는 중...</div>
              ) : comments.length === 0 ? (
                <div style={s.commentEmpty}>댓글이 없습니다.</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} style={{ ...s.commentItem, ...(c.parentId ? s.replyItem : {}) }}>
                    <div style={s.commentTop}>
                      <span style={s.commentNickname}>
                        {c.parentId && <span style={s.replyMark}>↳ </span>}
                        @{c.userNickname}
                      </span>
                      <span style={s.commentDate}>
                        {new Date(c.createdAt).toLocaleDateString('ko-KR', {
                          month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div style={s.commentContent}>{c.content}</div>
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      style={s.deleteCommentBtn}
                    >
                      삭제
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
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
  meta: { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 6 },
  nickname: { fontSize: 12, color: '#6b7280', fontWeight: 500 },
  dot: { fontSize: 10, color: '#d1d5db' },
  date: { fontSize: 12, color: '#9ca3af' },
  menu: { fontSize: 12, color: '#374151', background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 },
  review: { margin: '0 0 8px', fontSize: 13, color: '#374151', lineHeight: 1.6, maxHeight: 60, overflowY: 'auto' },
  stats: { display: 'flex', gap: 10 },
  stat: { fontSize: 12, color: '#6b7280' },
  actions: { display: 'flex', gap: 6, padding: '0 14px 14px' },
  commentBtn: {
    flex: 1, padding: '6px 0', background: 'none',
    border: '1px solid #d1d5db', borderRadius: 8, color: '#374151',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  hideBtn: {
    flex: 1, padding: '6px 0', background: 'none',
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
  // 댓글 모달
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: 16, width: 480, maxWidth: '90vw',
    maxHeight: '80vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '20px 20px 16px', borderBottom: '1px solid #f3f4f6',
  },
  modalTitle: { fontSize: 16, fontWeight: 700, color: '#111827' },
  modalSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  closeBtn: {
    background: 'none', border: 'none', fontSize: 18,
    cursor: 'pointer', color: '#9ca3af', padding: 0,
  },
  commentList: { overflowY: 'auto', flex: 1, padding: '8px 0' },
  commentLoading: { padding: 40, textAlign: 'center', color: '#9ca3af' },
  commentEmpty: { padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 },
  commentItem: {
    padding: '12px 20px', borderBottom: '1px solid #f9fafb',
    position: 'relative',
  },
  replyItem: { background: '#fafafa', paddingLeft: 36 },
  commentTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  commentNickname: { fontSize: 13, fontWeight: 600, color: '#374151' },
  replyMark: { color: '#9ca3af' },
  commentDate: { fontSize: 11, color: '#9ca3af' },
  commentContent: { fontSize: 14, color: '#111827', lineHeight: 1.5, marginBottom: 8 },
  deleteCommentBtn: {
    padding: '3px 10px', background: 'none',
    border: '1px solid #fca5a5', borderRadius: 6, color: '#ef4444',
    fontSize: 12, cursor: 'pointer',
  },
};
