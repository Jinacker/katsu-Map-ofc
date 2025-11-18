import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import DailyUsersChart from '../components/DailyUsersChart';
import './DashboardPage.css';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [error, setError] = useState('');
  const [messageIdToDelete, setMessageIdToDelete] = useState('');
  const [deleteMessageStatus, setDeleteMessageStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch Stats
        const statsResponse = await apiClient.get('/api/v1/admin/stats');
        setStats(statsResponse.data.data);

        // Fetch Health Status
        const healthResponse = await apiClient.get('/api/v1/admin/health');
        setHealthStatus(healthResponse.data.data.status);

      } catch (err) {
        setError('대시보드 데이터를 불러오는데 실패했습니다.');
        console.error('Dashboard data fetch error:', err);
        // If token is invalid, redirect to login
        if (err.response && err.response.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleDeleteMessage = async () => {
    if (!messageIdToDelete) {
      setDeleteMessageStatus('메시지 ID를 입력해주세요.');
      return;
    }
    setDeleteMessageStatus('삭제 중...');
    try {
      await apiClient.delete(`/api/v1/messages/${messageIdToDelete}`);
      setDeleteMessageStatus(`메시지 ${messageIdToDelete}가 성공적으로 삭제되었습니다.`);
      setMessageIdToDelete('');
    } catch (err) {
      setDeleteMessageStatus(`메시지 ${messageIdToDelete} 삭제 실패. 오류: ${err.message}`);
      console.error('Message deletion error:', err);
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>대시보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">관리자 대시보드</h1>
          <p className="dashboard-subtitle">카츠맵 통계</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          로그아웃
        </button>
      </header>

      {error && (
        <div className="error-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#E8D5C4' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C4956A" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">오늘의 활성 사용자</p>
            <p className="stat-value">{stats?.todayDau || 0}</p>
            <p className="stat-description">일일 활성 사용자</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#D9E5D9' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B9D83" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">전체 사용자</p>
            <p className="stat-value">{stats?.totalUsers || 0}</p>
            <p className="stat-description">등록된 사용자</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#F4E4D7' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D9A86C" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">전체 식당</p>
            <p className="stat-value">{stats?.totalRestaurants || 0}</p>
            <p className="stat-description">등록된 식당</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#F5D9D9' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C07A7A" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">전체 즐겨찾기</p>
            <p className="stat-value">{stats?.totalFavorites || 0}</p>
            <p className="stat-description">사용자 즐겨찾기</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="chart-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">일일 활성 사용자 (최근 30일)</h2>
            <p className="section-subtitle">지난 한 달간 사용자 활동 추이</p>
          </div>
          <div className="health-status">
            <span className={`status-dot ${healthStatus === 'ok' ? 'status-ok' : 'status-error'}`}></span>
            <span className="status-text">
              API: {healthStatus === 'ok' ? '정상' : '오류'}
            </span>
          </div>
        </div>

        {stats?.last30Days && stats.last30Days.length > 0 ? (
          <DailyUsersChart data={stats.last30Days} />
        ) : (
          <div className="empty-state">
            <p>데이터가 없습니다</p>
          </div>
        )}
      </div>

      {/* Delete Message Section */}
      <div className="action-section">
        <h2 className="section-title">메시지 관리</h2>
        <p className="section-subtitle">ID로 메시지 삭제</p>

        <div className="delete-message-form">
          <input
            type="number"
            placeholder="메시지 ID 입력"
            value={messageIdToDelete}
            onChange={(e) => setMessageIdToDelete(e.target.value)}
            className="message-input"
          />
          <button onClick={handleDeleteMessage} className="delete-button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            메시지 삭제
          </button>
        </div>

        {deleteMessageStatus && (
          <div className={`status-message ${deleteMessageStatus.includes('성공') ? 'success' : deleteMessageStatus.includes('실패') ? 'error' : 'info'}`}>
            {deleteMessageStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
