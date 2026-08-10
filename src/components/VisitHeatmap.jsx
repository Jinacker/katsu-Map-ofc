import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../api/axios';

// 어드민 테마(웜 브라운) 5단계 — index.css의 --color-accent-primary(#D4A574) 계열
const SCALE = ['#F1ECE4', '#EAD9C2', '#D4A574', '#B97C46', '#8A5626'];
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
const PUSH_RING = 'inset 0 0 0 2px #E2574C';

function levelFor(count, max) {
  if (!count || !max) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const parseDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const fmtKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtKo = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const headingStyle = { fontSize: 15, fontWeight: 700, color: '#2D2926' };
const subStyle = { fontSize: 13, fontWeight: 400, color: '#8B8378' };

export default function VisitHeatmap() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [tooltip, setTooltip] = useState(null); // {x, y, text}
  const [selMonth, setSelMonth] = useState('all'); // 'all' | 'YYYY-MM'
  const wrapRef = useRef(null);
  const [pushMap, setPushMap] = useState(new Map()); // 'YYYY-MM-DD' → [{title, targets}]

  useEffect(() => {
    apiClient
      .get('/api/v1/admin/stats/visit-heatmap', { params: { weeks: 12 } })
      .then((res) => setData(res.data?.data ?? null))
      .catch(() => setError(true));
    // 푸시 발송일 오버레이 (기록은 2026-08-10 이후 발송분부터)
    apiClient
      .get('/api/v1/admin/push/dispatches', { params: { limit: 100 } })
      .then((res) => {
        const map = new Map();
        (res.data?.data ?? []).forEach((d) => {
          const key = fmtKey(new Date(d.createdAt));
          if (!map.has(key)) map.set(key, []);
          map.get(key).push({ title: d.title, targets: d.targets });
        });
        setPushMap(map);
      })
      .catch(() => {});
  }, []);

  if (error) return <div className="empty-state"><p>히트맵을 불러오지 못했습니다</p></div>;
  if (!data) return <div className="empty-state"><p>불러오는 중...</p></div>;

  const countMap = new Map((data.daily ?? []).map((d) => [d.date, d.count]));
  const today = new Date();
  const startDate = parseDate(data.startDate);
  const firstMonday = addDays(startDate, -((startDate.getDay() + 6) % 7));
  const periodLabel = `${fmtKo(startDate)} ~ ${fmtKo(today)} · ${data.weeks}주`;

  // 주 단위 컬럼 (월요일 시작)
  const weekCols = [];
  for (let mon = firstMonday; mon <= today; mon = addDays(mon, 7)) {
    weekCols.push(mon);
  }

  const showTip = (e, text) => {
    const wrap = wrapRef.current?.getBoundingClientRect();
    const cell = e.currentTarget.getBoundingClientRect();
    if (!wrap) return;
    setTooltip({
      x: cell.left - wrap.left + cell.width / 2,
      y: cell.top - wrap.top - 8,
      text,
    });
  };
  const hideTip = () => setTooltip(null);

  const grassCell = { width: 22, height: 22, borderRadius: 5 };
  const hourCell = { width: 28, height: 28, borderRadius: 6 };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            background: '#2D2926',
            color: '#fff',
            fontSize: 12.5,
            padding: '7px 11px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          {(Array.isArray(tooltip.text) ? tooltip.text : [tooltip.text]).map((line, i) => (
            <div key={i} style={i > 0 ? { marginTop: 3, color: '#F5D9A8' } : undefined}>{line}</div>
          ))}
        </div>
      )}

      {/* ── 일별 방문 잔디 (깃헙 스타일: 가로 = 주/월, 세로 = 요일) ── */}
      <div style={{ marginBottom: 10 }}>
        <span style={headingStyle}>일별 방문 잔디</span>
        <span style={{ ...subStyle, marginLeft: 8 }}>{periodLabel}</span>
      </div>
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'inline-block' }}>
          {/* 월 라벨 */}
          <div style={{ display: 'flex', gap: 4, marginLeft: 34, marginBottom: 6 }}>
            {weekCols.map((mon, i) => {
              const prev = i > 0 ? weekCols[i - 1] : null;
              const showMonth = !prev || prev.getMonth() !== mon.getMonth();
              return (
                <div key={fmtKey(mon)} style={{ ...grassCell, height: 16, fontSize: 12.5, fontWeight: 600, color: '#8B8378', overflow: 'visible', whiteSpace: 'nowrap' }}>
                  {showMonth ? `${mon.getMonth() + 1}월` : ''}
                </div>
              );
            })}
          </div>
          {/* 요일 행 */}
          {DAY_LABELS.map((label, dow) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <div style={{ width: 30, fontSize: 12.5, color: '#8B8378' }}>{label}</div>
              {weekCols.map((mon) => {
                const date = addDays(mon, dow);
                const inRange = date >= startDate && date <= today;
                if (!inRange) {
                  return <div key={dow + fmtKey(mon)} style={{ ...grassCell, background: 'transparent' }} />;
                }
                const key = fmtKey(date);
                const count = countMap.get(key) ?? 0;
                const pushes = pushMap.get(key) ?? [];
                const tipLines = [
                  `${fmtKo(date)} (${label}) — ${count}명 방문`,
                  ...pushes.map((p) => `푸시 「${p.title}」 · 대상 ${p.targets}명`),
                ];
                return (
                  <div
                    key={dow + fmtKey(mon)}
                    onMouseEnter={(e) => showTip(e, tipLines)}
                    onMouseLeave={hideTip}
                    style={{
                      ...grassCell,
                      background: SCALE[levelFor(count, data.maxDailyCount)],
                      border: '1px solid rgba(0,0,0,0.05)',
                      boxShadow: pushes.length ? PUSH_RING : 'none',
                      cursor: 'default',
                    }}
                  />
                );
              })}
            </div>
          ))}
          {/* 범례 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, marginLeft: 34, fontSize: 12.5, color: '#8B8378' }}>
            <span style={{ marginRight: 2 }}>적음</span>
            {SCALE.map((c) => (
              <span key={c} style={{ width: 14, height: 14, borderRadius: 4, background: c, display: 'inline-block', border: '1px solid rgba(0,0,0,0.05)' }} />
            ))}
            <span style={{ marginLeft: 2 }}>많음</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 16 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: SCALE[1], display: 'inline-block', boxShadow: PUSH_RING }} />
              푸시 발송일
            </span>
            <span style={{ marginLeft: 'auto' }}>하루 최대 {data.maxDailyCount}명</span>
          </div>
        </div>
      </div>

      {/* ── 요일 × 시간대 패턴 (같은 팔레트, 월별 탭) ── */}
      {(() => {
        const byMonth = data.byMonth ?? [];
        const selected =
          selMonth === 'all' ? null : byMonth.find((m) => m.month === selMonth) || null;
        const matrixDays = selected ? selected.days : data.days;
        const matrixMax = selected ? selected.maxCount : data.maxCount;
        const rangeLabel = selected ? `${selected.label} 한 달` : `${periodLabel} 합산`;
        const tabStyle = (active) => ({
          padding: '5px 12px',
          borderRadius: 16,
          fontSize: 12.5,
          fontWeight: active ? 700 : 400,
          border: '1px solid',
          borderColor: active ? '#D4A574' : '#E5DFD6',
          background: active ? '#D4A574' : '#fff',
          color: active ? '#fff' : '#8B8378',
          cursor: 'pointer',
        });
        return (
          <>
            <div style={{ marginTop: 28, marginBottom: 10, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={headingStyle}>요일 × 시간대 패턴</span>
              <span style={subStyle}>{rangeLabel} · 하루 첫 접속 시각 기준</span>
              <span style={{ display: 'inline-flex', gap: 6, marginLeft: 'auto' }}>
                <button type="button" style={tabStyle(selMonth === 'all')} onClick={() => setSelMonth('all')}>
                  전체
                </button>
                {byMonth.map((m) => (
                  <button key={m.month} type="button" style={tabStyle(selMonth === m.month)} onClick={() => setSelMonth(m.month)}>
                    {m.label}
                  </button>
                ))}
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'inline-block' }}>
                <div style={{ display: 'flex', gap: 4, marginLeft: 34, marginBottom: 6 }}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} style={{ ...hourCell, height: 15, fontSize: 12.5, color: '#8B8378' }}>
                      {h % 3 === 0 ? h : ''}
                    </div>
                  ))}
                </div>
                {matrixDays.map((row) => (
                  <div key={row.day} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <div style={{ width: 30, fontSize: 12.5, color: '#8B8378' }}>{row.day}</div>
                    {row.hours.map((count, hour) => (
                      <div
                        key={hour}
                        onMouseEnter={(e) =>
                          showTip(e, `${selected ? `${selected.label} ` : ''}${row.day}요일 ${hour}시 — ${count}회 방문`)
                        }
                        onMouseLeave={hideTip}
                        style={{
                          ...hourCell,
                          background: SCALE[levelFor(count, matrixMax)],
                          border: '1px solid rgba(0,0,0,0.05)',
                          cursor: 'default',
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
