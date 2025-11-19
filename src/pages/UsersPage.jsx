import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import './UsersPage.css';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/admin/users');
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
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>닉네임</th>
              <th>즐겨찾기 수</th>
              <th>마지막 접속</th>
              <th>가입일</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-cell">
                  검색 결과가 없습니다
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="user-row">
                  <td>{user.id}</td>
                  <td className="user-nickname">
                    {user.nickname || <span className="no-nickname">미설정</span>}
                  </td>
                  <td>
                    <span className="favorite-count">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#C07A7A" stroke="#C07A7A" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      {user.favoriteCount}
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
    </div>
  );
};

export default UsersPage;
