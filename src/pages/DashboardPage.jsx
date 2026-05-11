import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import DailyUsersChart from '../components/DailyUsersChart';
import './DashboardPage.css';
import { clearAdminToken } from '../utils/adminAuth';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState('daily'); // 'daily' | 'weekly'

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsResponse, healthResponse] = await Promise.all([
          apiClient.get('/api/v1/admin/stats'),
          apiClient.get('/api/v1/admin/health'),
        ]);
        setStats(statsResponse.data.data);
        setHealthStatus(healthResponse.data.data.status);
      } catch (err) {
        setError('대시보드 데이터를 불러오는데 실패했습니다.');
        console.error('Dashboard data fetch error:', err);
        if (err.response?.status === 401) {
          clearAdminToken();
          window.location.href = '/login';
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const dailyChartData = React.useMemo(() => {
    if (!stats) return [];
    const data = stats.last30Days ? [...stats.last30Days] : [];
    const todayStr = (() => {
      const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
      return kst.toISOString().split('T')[0];
    })();
    if (!data.find(d => d.date === todayStr)) {
      data.push({ date: todayStr, count: stats.todayDau || 0 });
    }
    return data;
  }, [stats]);

  const weeklyChartData = React.useMemo(() => {
    if (!stats?.last12Weeks) return [];
    return stats.last12Weeks;
  }, [stats]);

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
      <div className="page-header">
        <div>
          <h1 className="page-title">대시보드</h1>
          <p className="page-subtitle">돈가스 지도 통계</p>
        </div>
      </div>

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

      {/* 기본 통계 */}
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
            <p className="stat-label">전체 사용자</p>
            <p className="stat-value">{stats?.totalUsers || 0}</p>
            <p className="stat-description">누적 가입자</p>
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

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#E8E4F4' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B7EC4" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">현재 동시 접속</p>
            <p className="stat-value">{stats?.concurrentUsers || 0}</p>
            <p className="stat-description">최근 5분 기준</p>
          </div>
        </div>
      </div>

      {/* 활성 사용자 지표 */}
      <div className="engagement-section">
        <div className="engagement-header">
          <h2 className="section-title">활성 사용자</h2>
          <p className="section-subtitle">KST 기준 DAU / WAU / MAU</p>
        </div>
        <div className="engagement-grid">
          {/* DAU */}
          <div className="engagement-card">
            <div className="engagement-label">DAU <span className="engagement-period">오늘</span></div>
            <div className="engagement-value">{stats?.todayDau || 0}</div>
            <div className="engagement-ratio-row">
              <span className="engagement-ratio-label">DAU/MAU</span>
              <span className="engagement-ratio-value">{stats?.dauMauRatio ?? 0}%</span>
            </div>
            <div className="engagement-ratio-bar">
              <div
                className="engagement-ratio-fill"
                style={{ width: `${Math.min(stats?.dauMauRatio || 0, 100)}%` }}
              />
            </div>
          </div>

          {/* WAU */}
          <div className="engagement-card">
            <div className="engagement-label">WAU <span className="engagement-period">이번 주</span></div>
            <div className="engagement-value">{stats?.wau || 0}</div>
            <div className="engagement-ratio-row">
              <span className="engagement-ratio-label">WAU/MAU</span>
              <span className="engagement-ratio-value">{stats?.wauMauRatio ?? 0}%</span>
            </div>
            <div className="engagement-ratio-bar">
              <div
                className="engagement-ratio-fill wau"
                style={{ width: `${Math.min(stats?.wauMauRatio || 0, 100)}%` }}
              />
            </div>
          </div>

          {/* MAU */}
          <div className="engagement-card engagement-card--mau">
            <div className="engagement-label">MAU <span className="engagement-period">이번 달</span></div>
            <div className="engagement-value">{stats?.mau || 0}</div>
            <div className="engagement-ratio-row">
              <span className="engagement-ratio-label">전체 대비</span>
              <span className="engagement-ratio-value">
                {stats?.totalUsers > 0 && stats?.mau != null ? Math.round(((stats.mau || 0) / stats.totalUsers) * 1000) / 10 : 0}%
              </span>
            </div>
            <div className="engagement-ratio-bar">
              <div
                className="engagement-ratio-fill mau"
                style={{ width: `${Math.min(stats?.totalUsers > 0 ? ((stats?.mau || 0) / stats.totalUsers) * 100 : 0, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 차트 */}
      <div className="chart-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              {chartMode === 'daily' ? '일일 활성 사용자 (최근 30일)' : '주간 활성 사용자 (최근 12주)'}
            </h2>
            <p className="section-subtitle">
              {chartMode === 'daily' ? '지난 한 달간 DAU 추이' : '지난 12주간 WAU 추이'}
            </p>
          </div>
          <div className="chart-controls">
            <div className="chart-toggle">
              <button
                className={`chart-toggle-btn ${chartMode === 'daily' ? 'active' : ''}`}
                onClick={() => setChartMode('daily')}
              >
                일별
              </button>
              <button
                className={`chart-toggle-btn ${chartMode === 'weekly' ? 'active' : ''}`}
                onClick={() => setChartMode('weekly')}
              >
                주별
              </button>
            </div>
            <div className="health-status">
              <span className={`status-dot ${healthStatus === 'ok' ? 'status-ok' : 'status-error'}`}></span>
              <span className="status-text">API: {healthStatus === 'ok' ? '정상' : '오류'}</span>
            </div>
          </div>
        </div>

        {(chartMode === 'daily' ? dailyChartData : weeklyChartData).length > 0 ? (
          <DailyUsersChart
            data={chartMode === 'daily' ? dailyChartData : weeklyChartData}
            mode={chartMode}
          />
        ) : (
          <div className="empty-state"><p>데이터가 없습니다</p></div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
