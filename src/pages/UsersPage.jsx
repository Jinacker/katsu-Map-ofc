import { logAdminError } from '../utils/safeLogger';
import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import UserProfileModal from '../components/UserProfileModal';
import './UsersPage.css';

const PAGE_SIZE = 100;

function UsersPagination({ page, total, loading, onChange, label }) {
  const totalPages = Math.max(1, Math.ceil((total ?? 0) / PAGE_SIZE));
  return (
    <nav className="users-pagination" aria-label={label}>
      <span className="users-page-range">
        {total ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} / ${total.toLocaleString()}명` : '0명'}
      </span>
      <button type="button" disabled={loading || page <= 1} onClick={() => onChange(1)}>처음</button>
      <button type="button" disabled={loading || page <= 1} onClick={() => onChange(page - 1)}>이전</button>
      <span>{page} / {totalPages} 페이지</span>
      <button type="button" disabled={loading || page >= totalPages} onClick={() => onChange(page + 1)}>다음</button>
      <button type="button" disabled={loading || page >= totalPages} onClick={() => onChange(totalPages)}>마지막</button>
    </nav>
  );
}

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [filters, setFilters] = useState({
    page: 1, search: '', minVisitDays: '', maxVisitDays: '', visitedOn: '',
  });
  const { page, minVisitDays, maxVisitDays, visitedOn } = filters;

  useEffect(() => {
    const controller = new AbortController();
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const response = await apiClient.get('/api/v1/admin/users/paged', {
          signal: controller.signal,
          params: {
            page, limit: PAGE_SIZE,
            ...(filters.search ? { search: filters.search } : {}),
            ...(minVisitDays !== '' ? { minVisitDays } : {}),
            ...(maxVisitDays !== '' ? { maxVisitDays } : {}),
            ...(visitedOn ? { visitedOn } : {}),
          },
        });
        if (controller.signal.aborted) return;
        const data = response.data.data;
        const lastPage = Math.max(1, data.totalPages);
        if (page > lastPage) {
          setFilters((current) => ({ ...current, page: lastPage }));
          return;
        }
        setUsers(data.items);
        setTotal(data.total);
      } catch (err) {
        if (controller.signal.aborted) return;
        logAdminError(err, '사용자 요청 실패');
        setLoadError('유저 목록을 불러오지 못했습니다. 다시 시도해주세요.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchUsers();
    return () => controller.abort();
  }, [filters, reloadKey]);

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value, page: 1 }));
  };
  const changePage = (nextPage) => {
    setFilters((current) => ({ ...current, page: nextPage }));
  };
  const hasFilters = filters.search || minVisitDays !== '' || maxVisitDays !== '' || visitedOn;

  const pagination = (label) => (
    <UsersPagination
      page={page}
      total={total}
      loading={loading || Boolean(loadError)}
      onChange={changePage}
      label={label}
    />
  );

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">유저 관리</h1>
          <p className="page-subtitle" aria-live="polite">
            {total == null ? '유저 목록을 불러오는 중...' : `${hasFilters ? '검색·필터 결과' : '전체'} ${total.toLocaleString()}명의 유저 · 100명씩 표시`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="filters-bar">
        <form
          className="search-box"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            updateFilter('search', searchTerm.trim());
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="닉네임 또는 ID 입력 후 Enter"
            aria-label="유저 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229)) {
                e.preventDefault();
              }
            }}
          />
        </form>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#666' }}>방문일수</span>
          <input
            type="number"
            min="0"
            placeholder="이상"
            value={minVisitDays}
            onChange={(e) => updateFilter('minVisitDays', e.target.value)}
            style={{ width: 70, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}
          />
          <span style={{ color: '#999' }}>~</span>
          <input
            type="number"
            min="0"
            placeholder="이하"
            value={maxVisitDays}
            onChange={(e) => updateFilter('maxVisitDays', e.target.value)}
            style={{ width: 70, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}
          />
          <span style={{ fontSize: 13, color: '#666', marginLeft: 12 }}>방문일(KST)</span>
          <input
            type="date"
            value={visitedOn}
            onChange={(e) => updateFilter('visitedOn', e.target.value)}
            style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}
          />
          {(minVisitDays !== '' || maxVisitDays !== '' || visitedOn) && (
            <button
              type="button"
              onClick={() => setFilters((current) => ({ ...current, page: 1, minVisitDays: '', maxVisitDays: '', visitedOn: '' }))}
              style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>
      {visitedOn && (
        <p style={{ fontSize: 13, color: '#1976d2', margin: '0 0 12px' }}>
          {visitedOn} (KST)에 방문한 유저만 표시 중
        </p>
      )}

      {pagination('유저 목록 위쪽 페이지 이동')}
      {/* Users Table */}
      <div className="table-container" aria-busy={loading}>
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>닉네임</th>
              <th>제보</th>
              <th>즐찾</th>
              <th>기록</th>
              <th>방문일수</th>
              <th>마지막 접속</th>
              <th>가입일</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="empty-cell" role="status">유저 목록을 불러오는 중...</td></tr>
            ) : loadError ? (
              <tr><td colSpan="8" className="empty-cell" role="alert">
                {loadError}{' '}
                <button type="button" onClick={() => setReloadKey((value) => value + 1)}>다시 시도</button>
              </td></tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-cell">
                  검색 결과가 없습니다
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="user-row"
                  onClick={() => setSelectedUserId(user.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{user.id}</td>
                  <td className="user-nickname">
                    {user.nickname || <span className="no-nickname">미설정</span>}
                  </td>
                  <td>
                    <span className={`stat-count ${user.messageCount > 0 ? 'has-value' : ''}`}>
                      {user.messageCount ?? 0}
                    </span>
                  </td>
                  <td>
                    <span className={`stat-count favorite ${user.favoriteCount > 0 ? 'has-value' : ''}`}>
                      {user.favoriteCount}
                    </span>
                  </td>
                  <td>
                    <span className={`stat-count ${user.tastingNoteCount > 0 ? 'has-value' : ''}`}>
                      {user.tastingNoteCount ?? 0}
                    </span>
                  </td>
                  <td>
                    <span className={`stat-count ${user.visitDays > 0 ? 'has-value' : ''}`}>
                      {user.visitDays ?? 0}
                    </span>
                  </td>
                  <td>{formatDate(user.lastAccessedAt)}</td>
                  <td>{formatDate(user.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination('유저 목록 아래쪽 페이지 이동')}

      <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
    </div>
  );
};

export default UsersPage;
