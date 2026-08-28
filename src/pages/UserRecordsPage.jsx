import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import './UserRecordsPage.css';

const PAGE_LIMIT = 18;
const FLAVOR_CATEGORIES = ['풍미', '부드러움', '육즙', '바삭함', '두께감'];
const VISIBILITY_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'public', label: '커뮤니티 게시' },
  { value: 'private', label: '나만보기' },
  { value: 'hidden', label: '운영자 숨김' },
];

const formatDate = (value, withTime = false) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', withTime
    ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const getPageNum = (current, total, index) => {
  if (total <= 7) return index + 1;
  if (current <= 4) return index + 1;
  if (current >= total - 3) return total - 6 + index;
  return current - 3 + index;
};

const getVisibility = (note) => {
  if (note.isAdminHidden) return { label: '운영자 숨김', className: 'hidden' };
  if (note.pendingStatus === 'pending') return { label: '승인 대기', className: 'pending' };
  if (note.pendingStatus === 'rejected') return { label: '등록 반려', className: 'rejected' };
  if (note.isPrivate) return { label: '나만보기', className: 'private' };
  return { label: '커뮤니티 게시', className: 'public' };
};

function FlavorRadar({ scores = {}, color = '#d6483e' }) {
  const center = 60;
  const radius = 45;
  const point = (index, value = 5) => {
    const angle = (-Math.PI / 2) + (index * Math.PI * 2) / FLAVOR_CATEGORIES.length;
    const scaledRadius = radius * (Math.max(0, Math.min(Number(value) || 0, 5)) / 5);
    return `${center + Math.cos(angle) * scaledRadius},${center + Math.sin(angle) * scaledRadius}`;
  };
  const frame = FLAVOR_CATEGORIES.map((_, index) => point(index)).join(' ');
  const values = FLAVOR_CATEGORIES.map((category, index) => point(index, scores?.[category])).join(' ');

  return (
    <div className="tasting-radar-wrap">
      <svg className="tasting-radar" viewBox="0 0 120 120" aria-label="맛 평가 레이더 차트">
        {[1, 2, 3, 4, 5].map((level) => (
          <polygon
            key={level}
            points={FLAVOR_CATEGORIES.map((_, index) => point(index, level)).join(' ')}
            fill="none"
            stroke="#ded8cf"
            strokeWidth="0.8"
          />
        ))}
        {FLAVOR_CATEGORIES.map((_, index) => (
          <line key={index} x1={center} y1={center} x2={point(index).split(',')[0]} y2={point(index).split(',')[1]} stroke="#e8e2d9" />
        ))}
        <polygon points={frame} fill="none" stroke="#cfc7bc" strokeWidth="1" />
        <polygon points={values} fill={`${color}35`} stroke={color} strokeWidth="2" />
      </svg>
      <div className="tasting-radar-labels">
        {FLAVOR_CATEGORIES.map((category) => (
          <span key={category}>{category} {Number(scores?.[category]) || 0}</span>
        ))}
      </div>
    </div>
  );
}

function NoteMediaGrid({ note, onOpenPhoto }) {
  const photos = (Array.isArray(note.photoUrls) ? note.photoUrls : [note.photoUrl]).filter(Boolean).slice(0, 3);
  const renderPhoto = (url, index, className = '') => (
    <button
      type="button"
      className={`tasting-media-photo ${className}`}
      onClick={() => onOpenPhoto(photos, index)}
      key={`${url}-${index}`}
    >
      <img src={url} alt={`${note.restaurantName} 기록 사진 ${index + 1}`} />
    </button>
  );
  const parameterPanel = (
    <div className="tasting-parameter-panel">
      <FlavorRadar scores={note.flavorScores} color={note.keyColor || '#d6483e'} />
      {note.menuName && <strong>{note.menuName}</strong>}
      {note.meatType && note.meatType !== '모르겠어요' && <span>원육 · {note.meatType}</span>}
    </div>
  );

  if (photos.length === 0) {
    return <div className="tasting-media-row"><div className="tasting-photo-empty">사진 없음</div>{parameterPanel}</div>;
  }
  if (photos.length === 1) {
    return <div className="tasting-media-row">{renderPhoto(photos[0], 0)}{parameterPanel}</div>;
  }
  if (photos.length === 2) {
    return <div className="tasting-media-stack">{renderPhoto(photos[0], 0, 'wide')}<div className="tasting-media-row">{renderPhoto(photos[1], 1)}{parameterPanel}</div></div>;
  }
  return (
    <div className="tasting-media-stack">
      <div className="tasting-media-row">{renderPhoto(photos[0], 0)}{renderPhoto(photos[1], 1)}</div>
      <div className="tasting-media-row">{renderPhoto(photos[2], 2)}{parameterPanel}</div>
    </div>
  );
}

function TastingCard({ note, onHide, onUnhide, onOpenComments, onOpenPhoto }) {
  const visibility = getVisibility(note);
  const satisfaction = Math.max(0, Math.min(Number(note.satisfaction) || 0, 5));
  const visitMeta = [note.visitDate, note.companion && `${note.companion} 방문`].filter(Boolean).join(' · ');
  const waitingMeta = [note.timeSlot, note.waiting].filter(Boolean).join(' · ');

  return (
    <article className={`tasting-card ${note.isAdminHidden ? 'is-hidden' : ''}`}>
      <header className="tasting-card-header">
        <div className="tasting-avatar">
          {note.userProfilePhotoUrl
            ? <img src={note.userProfilePhotoUrl} alt="" />
            : <span>{(note.userNickname || '익').slice(0, 1)}</span>}
        </div>
        <div className="tasting-author">
          <strong>@{note.userNickname || '익명'} <small>#{note.userId}</small></strong>
          <span>{formatDate(note.createdAt, true)} · 기록 #{note.id}</span>
        </div>
        <span className={`tasting-visibility ${visibility.className}`}>{visibility.label}</span>
      </header>

      <div className="tasting-restaurant-row">
        <div>
          <h2>{note.restaurantName}</h2>
          {note.area && <span>{note.area}</span>}
        </div>
        <div className="tasting-visit-meta">
          {visitMeta && <span>{visitMeta}</span>}
          {waitingMeta && <span>{waitingMeta}</span>}
        </div>
      </div>

      <NoteMediaGrid note={note} onOpenPhoto={onOpenPhoto} />

      <div className="tasting-rating-row">
        <span className="tasting-stars" aria-label={`만족도 ${satisfaction}점`}>
          {'★'.repeat(satisfaction)}<i>{'★'.repeat(5 - satisfaction)}</i>
        </span>
        <b>{satisfaction.toFixed(1)}</b>
        {note.revisit && (
          <span className={`tasting-revisit ${note.revisit === '예' ? 'yes' : 'no'}`}>
            재방문의사 {note.revisit === '예' ? '●' : '×'}
          </span>
        )}
      </div>

      {note.review ? <p className="tasting-review">{note.review}</p> : <p className="tasting-review empty">작성한 리뷰 없음</p>}

      <footer className="tasting-card-footer">
        <div className="tasting-stats">
          <span>조회 {Number(note.viewCount || 0).toLocaleString()}</span>
          <span>♥ {Number(note.likeCount || 0).toLocaleString()}</span>
          <button type="button" onClick={() => onOpenComments(note)}>댓글 {Number(note.commentCount || 0).toLocaleString()}</button>
        </div>
        {note.isAdminHidden ? (
          <button type="button" className="tasting-action unhide" onClick={() => onUnhide(note)}>숨김 풀기</button>
        ) : (
          <button type="button" className="tasting-action hide" onClick={() => onHide(note)}>숨김 처리</button>
        )}
      </footer>
      {note.isAdminHidden && note.hiddenAt && (
        <div className="tasting-hidden-at">숨김 처리: {formatDate(note.hiddenAt, true)}</div>
      )}
    </article>
  );
}

export default function UserRecordsPage() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [visibility, setVisibility] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [photoViewer, setPhotoViewer] = useState(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/admin/tasting-notes', {
        params: { page, limit: PAGE_LIMIT, visibility, ...(search && { search }) },
      });
      const data = res.data?.data ?? res.data;
      setRecords(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      alert('불러오기 실패: ' + (error.response?.data?.message ?? error.message));
    } finally {
      setLoading(false);
    }
  }, [page, search, visibility]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const totalPages = Math.ceil(total / PAGE_LIMIT);
  const pageNumbers = useMemo(
    () => Array.from({ length: Math.min(totalPages, 7) }, (_, index) => getPageNum(page, totalPages, index)),
    [page, totalPages],
  );

  const applyFilter = (nextVisibility) => {
    setVisibility(nextVisibility);
    setPage(1);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleHide = async (note) => {
    if (!window.confirm(`기록 #${note.id}을 숨김 처리할까요?\n유저에게는 나만보기로 남고, 커뮤니티와 가게 평점에서 제외됩니다.`)) return;
    try {
      await api.patch(`/api/v1/admin/tasting-notes/${note.id}/hide`);
      await fetchRecords();
    } catch (error) {
      alert('숨김 처리 실패: ' + (error.response?.data?.message ?? error.message));
    }
  };

  const handleUnhide = async (note) => {
    if (!window.confirm(`기록 #${note.id}의 운영자 숨김을 풀까요?\n나만보기는 유지되며 유저가 직접 다시 게시할 수 있습니다.`)) return;
    try {
      await api.patch(`/api/v1/admin/tasting-notes/${note.id}/unhide`);
      await fetchRecords();
    } catch (error) {
      alert('숨김 해제 실패: ' + (error.response?.data?.message ?? error.message));
    }
  };

  const openComments = async (note) => {
    setSelectedNote(note);
    setComments([]);
    setCommentsLoading(true);
    try {
      const res = await api.get(`/api/v1/admin/community/feed/${note.id}/comments`);
      setComments(res.data?.data ?? res.data ?? []);
    } catch (error) {
      alert('댓글 불러오기 실패: ' + (error.response?.data?.message ?? error.message));
    } finally {
      setCommentsLoading(false);
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('이 댓글을 삭제할까요?')) return;
    try {
      await api.delete(`/api/v1/admin/community/comments/${commentId}`);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      setRecords((current) => current.map((note) => (
        note.id === selectedNote?.id
          ? { ...note, commentCount: Math.max(0, note.commentCount - 1) }
          : note
      )));
    } catch (error) {
      alert('댓글 삭제 실패: ' + (error.response?.data?.message ?? error.message));
    }
  };

  const openPhoto = (photos, index) => setPhotoViewer({ photos, index });
  const movePhoto = (direction) => setPhotoViewer((current) => {
    if (!current) return current;
    const nextIndex = (current.index + direction + current.photos.length) % current.photos.length;
    return { ...current, index: nextIndex };
  });

  return (
    <main className="tasting-feed-page">
      <div className="tasting-page-header">
        <div>
          <h1>테이스팅 피드</h1>
          <p>유저 기록과 커뮤니티 게시물을 한곳에서 관리합니다 · 전체 {total.toLocaleString()}개</p>
        </div>
        <form className="tasting-search" onSubmit={submitSearch}>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="기록 ID, 식당명, 닉네임 검색"
          />
          <button type="submit">검색</button>
          {search && <button type="button" className="clear" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>초기화</button>}
        </form>
      </div>

      <div className="tasting-filters">
        {VISIBILITY_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.value}
            className={visibility === option.value ? 'active' : ''}
            onClick={() => applyFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="tasting-state">불러오는 중...</div>
      ) : records.length === 0 ? (
        <div className="tasting-state">조건에 맞는 기록이 없습니다.</div>
      ) : (
        <div className="tasting-grid">
          {records.map((note) => (
            <TastingCard
              key={note.id}
              note={note}
              onHide={handleHide}
              onUnhide={handleUnhide}
              onOpenComments={openComments}
              onOpenPhoto={openPhoto}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="tasting-pagination" aria-label="테이스팅 피드 페이지">
          <button type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>← 이전</button>
          {pageNumbers.map((pageNumber) => (
            <button type="button" key={pageNumber} className={page === pageNumber ? 'active' : ''} onClick={() => setPage(pageNumber)}>{pageNumber}</button>
          ))}
          <button type="button" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>다음 →</button>
          <span>{page} / {totalPages}</span>
        </nav>
      )}

      {selectedNote && (
        <div className="tasting-modal-backdrop" onClick={() => setSelectedNote(null)}>
          <section className="tasting-comments-modal" onClick={(event) => event.stopPropagation()}>
            <header><div><h2>{selectedNote.restaurantName} 댓글</h2><span>@{selectedNote.userNickname} · 기록 #{selectedNote.id}</span></div><button type="button" onClick={() => setSelectedNote(null)}>×</button></header>
            <div className="tasting-comment-list">
              {commentsLoading ? <div className="tasting-state">불러오는 중...</div> : comments.length === 0 ? <div className="tasting-state">댓글이 없습니다.</div> : comments.map((comment) => (
                <article key={comment.id} className={comment.parentId ? 'reply' : ''}>
                  <div><strong>{comment.parentId && '↳ '}@{comment.userNickname}</strong><span>{formatDate(comment.createdAt, true)}</span></div>
                  <p>{comment.content}</p>
                  <button type="button" onClick={() => deleteComment(comment.id)}>댓글 삭제</button>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {photoViewer && (
        <div className="tasting-modal-backdrop photo" onClick={() => setPhotoViewer(null)}>
          <button type="button" className="photo-close" onClick={() => setPhotoViewer(null)}>×</button>
          {photoViewer.photos.length > 1 && <button type="button" className="photo-nav prev" onClick={(event) => { event.stopPropagation(); movePhoto(-1); }}>‹</button>}
          <img src={photoViewer.photos[photoViewer.index]} alt="테이스팅 기록 원본" onClick={(event) => event.stopPropagation()} />
          {photoViewer.photos.length > 1 && <button type="button" className="photo-nav next" onClick={(event) => { event.stopPropagation(); movePhoto(1); }}>›</button>}
          <span className="photo-count">{photoViewer.index + 1} / {photoViewer.photos.length}</span>
        </div>
      )}
    </main>
  );
}
