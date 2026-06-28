import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import DailyUsersChart from '../components/DailyUsersChart';
import './DashboardPage.css';
import { clearAdminToken } from '../utils/adminAuth';

const getCurrentKstMonth = () => {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}`;
};

const formatMonth = (month) => {
  const [year, monthNumber] = month.split('-');
  return `${year}년 ${Number(monthNumber)}월`;
};

const formatDate = (date) => (
  date ? new Date(`${date}T00:00:00+09:00`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : '-'
);

const Comparison = ({ metric, unit = '개' }) => {
  if (!metric) return null;
  const isUp = metric.change > 0;
  const isDown = metric.change < 0;
  const sign = isUp ? '+' : '';

  return (
    <div className={`stat-comparison ${isUp ? 'up' : ''} ${isDown ? 'down' : ''}`}>
      <span className="stat-change-rate">
        {isUp ? '↑' : isDown ? '↓' : '—'} {sign}{metric.changeRate}%
      </span>
      <span className="stat-change-count">
        전월보다 {sign}{metric.change.toLocaleString()}{unit}
      </span>
    </div>
  );
};

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentKstMonth);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        if (stats) setRefreshing(true);
        else setLoading(true);
        setError('');

        const [statsResponse, healthResponse] = await Promise.all([
          apiClient.get(`/api/v1/admin/stats?month=${selectedMonth}`),
          apiClient.get('/api/v1/admin/health'),
        ]);

        if (cancelled) return;
        setStats(statsResponse.data.data);
        setHealthStatus(healthResponse.data.data.status);
      } catch (err) {
        if (cancelled) return;
        setError('대시보드 데이터를 불러오는데 실패했습니다.');
        console.error('Dashboard data fetch error:', err);
        if (err.response?.status === 401) {
          clearAdminToken();
          window.location.href = '/login';
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [selectedMonth]);

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

  const monthLabel = formatMonth(stats?.monthly?.month || selectedMonth);
  const comparison = stats?.comparison;
  const monthly = stats?.monthly;

  return (
    <div className="dashboard-container">
      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">대시보드</h1>
          <p className="page-subtitle">월별 성장과 사용자 활동을 한눈에 확인합니다</p>
        </div>
        <div className="month-selector-wrap">
          <label htmlFor="dashboard-month">조회 기간</label>
          <select
            id="dashboard-month"
            className="month-selector"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            disabled={refreshing}
          >
            {(stats?.availableMonths || [selectedMonth]).map((month) => (
              <option key={month} value={month}>{formatMonth(month)}</option>
            ))}
          </select>
          {refreshing && <span className="month-refreshing">불러오는 중...</span>}
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

      <div className="period-summary">
        <div>
          <span className="period-summary-label">선택 기간</span>
          <strong>{monthLabel}</strong>
        </div>
        <p>카드의 증감률은 직전 월말 누적값과 비교합니다.</p>
      </div>

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
            <p className="stat-value">{comparison?.users.current.toLocaleString() || 0}</p>
            <p className="stat-description">{monthLabel} 말 누적</p>
            <Comparison metric={comparison?.users} unit="명" />
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
            <p className="stat-value">{comparison?.restaurants.current.toLocaleString() || 0}</p>
            <p className="stat-description">{monthLabel} 말 누적</p>
            <Comparison metric={comparison?.restaurants} />
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
            <p className="stat-value">{comparison?.favorites.current.toLocaleString() || 0}</p>
            <p className="stat-description">{monthLabel} 말 누적</p>
            <Comparison metric={comparison?.favorites} />
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
            <p className="stat-value">{stats?.concurrentUsers?.toLocaleString() || 0}</p>
            <p className="stat-description">최근 5분 기준 실시간</p>
          </div>
        </div>
      </div>

      <div className="engagement-section">
        <div className="engagement-header">
          <h2 className="section-title">{monthLabel} 사용자 활동</h2>
          <p className="section-subtitle">선택한 달의 가입과 재방문 흐름입니다</p>
        </div>
        <div className="engagement-grid">
          <div className="engagement-card engagement-card--mau">
            <div className="engagement-label">MAU <span className="engagement-period">월간 활성</span></div>
            <div className="engagement-value">{monthly?.activeUsers.toLocaleString() || 0}</div>
            <div className={`engagement-delta ${(monthly?.activeUsersChangeRate || 0) >= 0 ? 'up' : 'down'}`}>
              전월 대비 {(monthly?.activeUsersChangeRate || 0) > 0 ? '+' : ''}{monthly?.activeUsersChangeRate || 0}%
            </div>
          </div>

          <div className="engagement-card">
            <div className="engagement-label">신규 가입 <span className="engagement-period">월간</span></div>
            <div className="engagement-value">{monthly?.newUsers.toLocaleString() || 0}</div>
            <div className="engagement-helper">누적 사용자 증가분</div>
          </div>

          <div className="engagement-card">
            <div className="engagement-label">평균 DAU <span className="engagement-period">일평균</span></div>
            <div className="engagement-value">{monthly?.averageDau.toLocaleString() || 0}</div>
            <div className="engagement-helper">하루 평균 활성 사용자</div>
          </div>

          <div className="engagement-card">
            <div className="engagement-label">최고 활성일</div>
            <div className="engagement-value">{monthly?.peakDau.toLocaleString() || 0}</div>
            <div className="engagement-helper">{formatDate(monthly?.peakDate)} · 활성 사용자</div>
          </div>
        </div>
      </div>

      <div className="chart-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">활성 사용자와 신규 가입자 추이</h2>
            <p className="section-subtitle">{monthLabel} 일별 변화 · 선에 마우스를 올리면 상세 수치를 볼 수 있습니다</p>
          </div>
          <div className="health-status">
            <span className={`status-dot ${healthStatus === 'ok' ? 'status-ok' : 'status-error'}`}></span>
            <span className="status-text">API: {healthStatus === 'ok' ? '정상' : '오류'}</span>
          </div>
        </div>

        {monthly?.daily?.length > 0 ? (
          <DailyUsersChart data={monthly.daily} mode="monthly" />
        ) : (
          <div className="empty-state"><p>데이터가 없습니다</p></div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
