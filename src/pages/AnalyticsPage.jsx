import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/axios';
import './AnalyticsPage.css';

const unwrap = (response) => response.data?.data ?? response.data;

// 앱 route 이름 → 한글 라벨 (등록되지 않은 이름은 원문 그대로 표시)
const SCREEN_LABELS = {
  Home: '홈·지도',
  Favorites: '백과사전 탭',
  Community: '커뮤니티',
  Tasting: '시식 기록',
  Settings: '설정',
  FavoriteList: '즐겨찾기',
  Search: '검색',
  Messages: '메시지함',
};

const screenLabel = (name) => SCREEN_LABELS[name] ?? name;

const RANGE_PRESETS = [
  { key: 'today', label: '오늘', days: 1 },
  { key: '7d', label: '최근 7일', days: 7 },
  { key: '30d', label: '최근 30일', days: 30 },
  { key: '90d', label: '최근 90일', days: 90 },
];

const kstDayLabel = (offsetDays = 0) => {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000 - offsetDays * 24 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
};

const formatDay = (label) =>
  new Date(`${label}T00:00:00+09:00`).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

const RankingTable = ({ title, caption, items, nameHeader, renderName, emptyText }) => {
  const maxCount = items.length > 0 ? items[0].count : 0;
  const totalCount = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="analytics-section">
      <div className="analytics-section-header">
        <h2>{title}</h2>
        {caption ? <span className="analytics-caption">{caption}</span> : null}
      </div>
      {items.length === 0 ? (
        <div className="analytics-empty">{emptyText}</div>
      ) : (
        <table className="analytics-table">
          <thead>
            <tr>
              <th className="col-rank">순위</th>
              <th>{nameHeader}</th>
              <th className="col-num">조회수</th>
              <th className="col-num">비율</th>
              <th className="col-num">참여 유저</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.name}>
                <td className="col-rank">{index + 1}</td>
                <td>
                  <div className="analytics-name-cell">
                    <span className="analytics-name">{renderName ? renderName(item.name) : item.name}</span>
                    <span
                      className="analytics-name-bar"
                      style={{ width: maxCount > 0 ? `${Math.max((item.count / maxCount) * 100, 2)}%` : 0 }}
                    />
                  </div>
                </td>
                <td className="col-num">{item.count.toLocaleString()}</td>
                <td className="col-num muted">
                  {totalCount > 0 ? `${Math.round((item.count / totalCount) * 100)}%` : '-'}
                </td>
                <td className="col-num muted">{item.uniqueUsers.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

function AnalyticsPage() {
  const [rangeKey, setRangeKey] = useState('7d');
  const [overview, setOverview] = useState(null);
  const [screens, setScreens] = useState([]);
  const [searches, setSearches] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const preset = RANGE_PRESETS.find((item) => item.key === rangeKey) ?? RANGE_PRESETS[1];
      const params = { from: kstDayLabel(preset.days - 1), to: kstDayLabel(0) };
      const [overviewRes, screensRes, searchesRes, regionsRes] = await Promise.all([
        apiClient.get('/api/v1/admin/analytics/overview', { params }),
        apiClient.get('/api/v1/admin/analytics/screens', { params }),
        apiClient.get('/api/v1/admin/analytics/searches', { params: { ...params, limit: 100 } }),
        apiClient.get('/api/v1/admin/analytics/regions', { params }),
      ]);
      setOverview(unwrap(overviewRes));
      setScreens(unwrap(screensRes)?.items ?? []);
      setSearches(unwrap(searchesRes)?.items ?? []);
      setRegions(unwrap(regionsRes)?.items ?? []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('집계 기록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [rangeKey]);

  useEffect(() => {
    load();
  }, [load]);

  const days = overview?.days ?? [];
  const totals = overview?.totals ?? { totalEvents: 0, dailyUniqueUsersSum: 0, maxDailyUniqueUsers: 0 };
  const daysWithData = days.length;
  const avgDailyUsers = daysWithData > 0 ? Math.round(totals.dailyUniqueUsersSum / daysWithData) : 0;

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1>집계 기록</h1>
          <p className="analytics-subtitle">
            익명 이용 통계 — 상세 이벤트는 일 단위 집계 후 삭제되며, 개인을 식별할 수 없습니다.
          </p>
        </div>
        <div className="analytics-controls">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={`range-btn ${rangeKey === preset.key ? 'active' : ''}`}
              onClick={() => setRangeKey(preset.key)}
            >
              {preset.label}
            </button>
          ))}
          <button type="button" className="range-btn refresh" onClick={load} disabled={loading}>
            새로고침
          </button>
        </div>
      </div>

      {error ? <div className="analytics-error">{error}</div> : null}
      {loading ? <div className="analytics-loading">불러오는 중...</div> : null}

      {!loading && !error ? (
        <>
          <div className="analytics-summary">
            <div className="summary-card">
              <span className="summary-label">일평균 참여 유저</span>
              <strong className="summary-value">{avgDailyUsers.toLocaleString()}명</strong>
              <span className="summary-hint">하루 안에서만 중복 제거 (익명 일별 해시)</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">최대 일 참여 유저</span>
              <strong className="summary-value">{totals.maxDailyUniqueUsers.toLocaleString()}명</strong>
              <span className="summary-hint">기간 중 가장 많았던 날</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">총 이벤트 수</span>
              <strong className="summary-value">{totals.totalEvents.toLocaleString()}건</strong>
              <span className="summary-hint">화면 조회·검색·지역·백과 열람 합계</span>
            </div>
          </div>

          <section className="analytics-section">
            <div className="analytics-section-header">
              <h2>일별 참여</h2>
              <span className="analytics-caption">오늘은 아직 집계 전이라 실시간 수치입니다</span>
            </div>
            {days.length === 0 ? (
              <div className="analytics-empty">기간 내 집계된 기록이 없습니다.</div>
            ) : (
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th className="col-num">참여 유저</th>
                    <th className="col-num">이벤트 수</th>
                  </tr>
                </thead>
                <tbody>
                  {[...days].reverse().map((day) => (
                    <tr key={day.date}>
                      <td>
                        {formatDay(day.date)}
                        {day.live ? <span className="live-badge">오늘</span> : null}
                      </td>
                      <td className="col-num">{day.uniqueUsers.toLocaleString()}</td>
                      <td className="col-num muted">{day.totalEvents.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <RankingTable
            title="화면별 조회수"
            caption="탭·화면을 연 횟수"
            items={screens}
            nameHeader="화면"
            renderName={screenLabel}
            emptyText="기간 내 화면 조회 기록이 없습니다."
          />

          <RankingTable
            title="검색어 순위"
            caption="제출된 검색어만 집계 (계정과 연결되지 않음)"
            items={searches}
            nameHeader="검색어"
            emptyText="기간 내 검색 기록이 없습니다."
          />

          <RankingTable
            title="접속 지역 분포"
            caption="광역시·도 단위, 기기에서 변환 (위경도는 수집하지 않음)"
            items={regions}
            nameHeader="지역"
            emptyText="기간 내 지역 기록이 없습니다."
          />
        </>
      ) : null}
    </div>
  );
}

export default AnalyticsPage;
