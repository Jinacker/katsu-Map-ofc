import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import UserProfileModal from '../components/UserProfileModal';
import './UsersPage.css';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [minVisitDays, setMinVisitDays] = useState('');
  const [maxVisitDays, setMaxVisitDays] = useState('');
  const [visitedOn, setVisitedOn] = useState(''); // YYYY-MM-DD (KST) — 그날 방문한 유저만

  useEffect(() => {
    fetchUsers(visitedOn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitedOn]);

  const fetchUsers = async (visitedOnDate) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/admin/users', {
        params: visitedOnDate ? { visitedOn: visitedOnDate } : {},
      });
      setUsers(response.data.data);
    } catch (err) {
      console.error(err);
      alert('유저 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

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

  const filteredUsers = users
    .filter((user) => {
      const nickname = user.nickname || '';
      return nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
             user.id.toString().includes(searchTerm);
    })
    .filter((user) => {
      const days = user.visitDays ?? 0;
      if (minVisitDays !== '' && days < Number(minVisitDays)) return false;
      if (maxVisitDays !== '' && days > Number(maxVisitDays)) return false;
      return true;
    })
    .sort((a, b) => {
      // 최근 접속자순 정렬 (null은 맨 뒤로)
      if (!a.lastAccessedAt && !b.lastAccessedAt) return 0;
      if (!a.lastAccessedAt) return 1;
      if (!b.lastAccessedAt) return -1;
      return new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt);
    });

  if (loading) {
    return (
      <div className="users-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>유저 목록 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">유저 관리</h1>
          <p className="page-subtitle">전체 {users.length}명의 유저</p>
        </div>
      </div>

      {/* Search */}
      <div className="filters-bar">
        <div className="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="닉네임 또는 ID로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#666' }}>방문일수</span>
          <input
            type="number"
            min="0"
            placeholder="이상"
            value={minVisitDays}
            onChange={(e) => setMinVisitDays(e.target.value)}
            style={{ width: 70, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}
          />
          <span style={{ color: '#999' }}>~</span>
          <input
            type="number"
            min="0"
            placeholder="이하"
            value={maxVisitDays}
            onChange={(e) => setMaxVisitDays(e.target.value)}
            style={{ width: 70, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}
          />
          <span style={{ fontSize: 13, color: '#666', marginLeft: 12 }}>방문일(KST)</span>
          <input
            type="date"
            value={visitedOn}
            onChange={(e) => setVisitedOn(e.target.value)}
            style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}
          />
          {(minVisitDays !== '' || maxVisitDays !== '' || visitedOn) && (
            <button
              type="button"
              onClick={() => { setMinVisitDays(''); setMaxVisitDays(''); setVisitedOn(''); }}
              style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>
      {visitedOn && (
        <p style={{ fontSize: 13, color: '#1976d2', margin: '0 0 12px' }}>
          {visitedOn} (KST)에 방문한 유저만 표시 중 — {users.length}명
        </p>
      )}

      {/* Users Table */}
      <div className="table-container">
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
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-cell">
                  검색 결과가 없습니다
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
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

      <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
    </div>
  );
};

export default UsersPage;
