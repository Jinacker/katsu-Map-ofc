import React from 'react';

export default function EventScheduleEditor({ event, onChange }) {
  const calendar = event.calendar ?? [];
  const update = (id, patch) => onChange({ calendar: calendar.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const view = event.mapView;
  return <>
    <section className="events-card event-calendar-editor">
      <div className="events-card-heading"><span className="events-step">03</span><div><h2>이벤트 캘린더</h2><p>웹에 표시할 일정을 등록하세요. 이벤트 활성화는 직접 변경합니다.</p></div></div>
      {calendar.map((item) => <div className="event-calendar-row" key={item.id}>
        <label className="events-field">일정 제목<input aria-label="일정 제목" maxLength={80} value={item.title} onChange={(e) => update(item.id, { title: e.target.value })} /></label>
        <div className="event-view-fields"><label className="events-field">시작일<input type="date" aria-label="일정 시작일" value={item.startDate} onChange={(e) => update(item.id, { startDate: e.target.value })} /></label>
          <label className="events-field">종료일<input type="date" aria-label="일정 종료일" min={item.startDate} value={item.endDate} onChange={(e) => update(item.id, { endDate: e.target.value })} /></label></div>
        <label className="events-field">설명<input maxLength={500} value={item.description || ''} onChange={(e) => update(item.id, { description: e.target.value })} /></label>
        <button type="button" className="events-button" onClick={() => onChange({ calendar: calendar.filter((row) => row.id !== item.id) })}>일정 삭제</button>
      </div>)}
      {!calendar.length && <p className="events-help">아직 등록된 일정이 없어요.</p>}
      <button type="button" className="events-button" disabled={calendar.length >= 100} onClick={() => {
        const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
        onChange({ calendar: [...calendar, { id: crypto.randomUUID(), title: '', startDate: date, endDate: date, description: '' }] });
      }}>+ 일정 추가</button>
    </section>
    <section className="events-card">
      <div className="events-card-heading"><span className="events-step">04</span><div><h2>맛집 지도 시점</h2><p>이벤트 지도를 열 때 표시할 위치와 확대 정도예요.</p></div></div>
      <label className="events-toggle"><input type="checkbox" checked={Boolean(view)} onChange={(e) => onChange({ mapView: e.target.checked ? { lat: 37.591, lng: 127.016, level: 5 } : null })} /><span>지도 시점 직접 설정</span></label>
      {!view && <p className="events-help">참여 가게의 중심으로 이동합니다. 기본 레벨은 5예요.</p>}
      {view && <div className="event-view-fields">{[['lat', '위도', -90, 90], ['lng', '경도', -180, 180], ['level', '지도 레벨', 1, 14]].map(([key, label, min, max]) => <label className="events-field" key={key}>{label}
        <input type="number" step={key === 'level' ? 1 : 'any'} min={min} max={max} aria-label={label} value={view[key]} onChange={(e) => onChange({ mapView: { ...view, [key]: e.target.value === '' ? '' : Number(e.target.value) } })} />
      </label>)}</div>}
      <p className="events-help">레벨 1~14 · 숫자가 작을수록 더 가까이 확대됩니다.</p>
    </section>
  </>;
}
