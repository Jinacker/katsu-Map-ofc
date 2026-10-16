import EventScheduleEditor from '../components/EventScheduleEditor';
import EventStampTourEditor from '../components/EventStampTourEditor';
import './EventsPage.css';
import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../api/axios';
import { addEvent, updateEvent, sendEventAsset } from '../utils/eventForm';

const messageOf = (error) => typeof error.response?.data?.message === 'string' ? error.response.data.message : error.message || '요청에 실패했습니다.';

export default function EventsPage() {
  const [catalog, setCatalog] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState('{}');
  const busy = useRef(false);
  const selected = events.find((event) => event.id === selectedId);

  const applyCatalog = (data) => {
    setCatalog(data);
    setEvents(data.config.events);
    const first = data.config.events.find((event) => event.id === selectedId) || data.config.events.find((event) => event.enabled) || data.config.events[0];
    setSelectedId(first?.id ?? null);
    setSettings(JSON.stringify(first?.publicData ?? {}, null, 2));
  };
  useEffect(() => {
    let cancelled = false;
    apiClient.get('/api/v1/admin/events').then((response) => {
      if (!cancelled) { applyCatalog(response.data.data); setStatus('ready'); }
    }).catch((error) => { if (!cancelled) { setMessage(messageOf(error)); setStatus('error'); } });
    return () => { cancelled = true; };
  }, []);

  const patch = (value) => setEvents((current) => updateEvent(current, selectedId, value));
  const upload = async (event) => {
    const targetId = selectedId;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy.current) return;
    busy.current = true; setStatus('uploading'); setMessage('');
    try {
      const url = await sendEventAsset(apiClient, file);
      setEvents((current) => updateEvent(current, targetId, { buttonImageUrl: url }));
      setMessage('이미지를 업로드했습니다. 설정 저장을 눌러 반영해주세요.');
    } catch (error) { setMessage(messageOf(error)); }
    finally { busy.current = false; setStatus('ready'); }
  };
  const save = async () => {
    if (busy.current || !catalog) return;
    busy.current = true; setStatus('saving'); setMessage('');
    try {
      const response = await apiClient.put('/api/v1/admin/events', { generation: catalog.generation, events });
      applyCatalog(response.data.data);
      setMessage('저장했습니다. 홈 버튼 변경은 최대 1분 후 반영됩니다.');
    } catch (error) { setMessage(messageOf(error)); }
    finally { busy.current = false; setStatus('ready'); }
  };
  const locked = status === 'saving' || status === 'uploading';

  const tour = selected?.stampTour;
  const pinImages = tour?.pinMode === 'byRating'
    ? ['1', '2', '3', '4'].map((rating) => ({ label: `★${rating}`, url: tour.ratingPinImages?.[rating] }))
    : [{ label: '공통 핀', url: tour?.pinImageUrl }];

  return <main className="events-page">
    <header className="events-header">
      <div><span className="events-eyebrow">이벤트 운영</span><h1>이벤트 관리</h1><p>새로운 돈가스 여행을 준비하고, 참여 가게와 스탬프를 관리하세요.</p></div>
      <span className="events-header-status"><i />{catalog?.config?.events?.some((event) => event.enabled) ? '활성 이벤트 운영 중' : '활성 이벤트 없음'}</span>
    </header>
    {message && <p role="status" className="events-message">{message}</p>}
    {status === 'loading' && <div className="events-empty">이벤트 설정을 불러오고 있어요.</div>}
    {status === 'error' && <div className="events-empty"><p>이벤트 설정을 불러오지 못했습니다.</p><button className="events-button" onClick={() => window.location.reload()}>다시 불러오기</button></div>}
    {catalog && <>
      <div className="events-toolbar">
        <label><span>관리할 이벤트</span><select aria-label="이벤트 선택" disabled={locked} value={selectedId ?? ''}
          onChange={(e) => { const id = Number(e.target.value); setSelectedId(id); setSettings(JSON.stringify(events.find((item) => item.id === id)?.publicData ?? {}, null, 2)); }}>
          <option value="" disabled>이벤트를 선택하세요</option>
          {events.map((event) => <option key={event.id} value={event.id}>#{event.id} {event.title} · {event.enabled ? '활성' : '비활성'}</option>)}
        </select></label>
        <button className="events-button" disabled={locked || events.length >= 100} onClick={() => {
          const next = addEvent(events); setEvents(next); setSelectedId(next.at(-1).id); setSettings('{}');
        }}>+ 새 이벤트</button>
      </div>
      {selected ? <fieldset disabled={locked} className="events-workspace">
        <div className="events-editor">
          <section className="events-card">
            <div className="events-card-heading"><span className="events-step">01</span><div><h2>기본 설정</h2><p>앱 홈에 표시할 이벤트를 설정하세요.</p></div></div>
            <label className="events-field">이벤트 제목<input maxLength={80} value={selected.title} onChange={(e) => patch({ title: e.target.value })} /></label>
            <label className="events-field">웹 페이지 경로<input placeholder="/seongbukcheon" value={selected.webPath} onChange={(e) => patch({ webPath: e.target.value })} />
              <small>{catalog.config.webOrigin}{selected.webPath}</small></label>
            <div className="events-home-image">
              <div className="events-image-preview events-checker">{selected.buttonImageUrl ? <img src={selected.buttonImageUrl} alt="이벤트 버튼 미리보기" /> : <span>홈 버튼<br />이미지</span>}</div>
              <label className="events-field">홈 버튼 이미지<span className="events-help">PNG · GIF · SVG / 투명 배경 그대로 표시</span>
                <input type="file" aria-label="홈 버튼 이미지 업로드" accept="image/png,image/gif,image/svg+xml" onChange={upload} />
              </label>
            </div>
            <label className="events-field">지도 말풍선 문구<span className="events-help">이벤트 지도 상단 마스코트 말풍선에 그대로 표시됩니다. 두 줄, 120자까지. 비워두면 기본 문구가 나와요.</span>
              <textarea className="events-map-message" rows={2} maxLength={120} placeholder={`🎉 ${selected.title || '이벤트'} 진행 중!\n참여 가게를 돌며 스탬프를 모아보세요.`}
                value={selected.mapMessage ?? ''} onChange={(e) => patch({ mapMessage: e.target.value.replace(/[\r\t]/g, '').split('\n').slice(0, 2).join('\n') })} />
            </label>
            <label className="events-toggle"><input type="checkbox" checked={selected.enabled} onChange={(e) => patch({ enabled: e.target.checked })} />
              <span><strong>이벤트 활성화</strong><small>한 번에 하나만 운영해요. 기존 활성 이벤트는 자동으로 꺼집니다.</small></span>
              <span className={`events-badge ${selected.enabled ? 'is-active' : ''}`}>{selected.enabled ? '활성' : '비활성'}</span>
            </label>
          </section>
          <EventStampTourEditor key={selected.id} event={selected} onChange={(stampTour) => patch({ stampTour })} locked={locked}
            setBusy={(value) => { busy.current = value; setStatus(value ? 'uploading' : 'ready'); }} onMessage={setMessage} />
          <EventScheduleEditor key={`schedule-${selected.id}`} event={selected} onChange={patch} />
          <details className="events-card events-advanced"><summary>추가 웹 설정 <span>JSON</span></summary>
            <p className="events-help">웹에 공개되는 설정입니다. 비밀번호·키·사용자 개인정보를 넣지 마세요.</p>
            <textarea aria-label="추가 웹 설정" value={settings} onChange={(e) => {
              setSettings(e.target.value);
              try { const value = JSON.parse(e.target.value); if (value && typeof value === 'object' && !Array.isArray(value)) patch({ publicData: value }); } catch {}
            }} />
          </details>
        </div>
        <aside className="events-sidebar">
          <section className="events-card events-overview"><span className="events-eyebrow">설정 미리보기</span><h2>{selected.title || '새 이벤트'}</h2>
            <span className={`events-badge ${selected.enabled ? 'is-active' : ''}`}>{selected.enabled ? '활성화 설정' : '비활성화 설정'}</span>
            <div className="events-overview-image events-checker">{selected.buttonImageUrl ? <img src={selected.buttonImageUrl} alt="홈 이미지 미리보기" /> : <span>홈 버튼 이미지를 업로드해주세요</span>}</div>
            <div className="events-metrics"><div><strong>{tour?.restaurants?.length ?? 0}</strong><span>참여 가게</span></div><div><strong>{tour?.enabled ? 'ON' : 'OFF'}</strong><span>스탬프 투어</span></div></div>
            {tour?.enabled && <><h3>스탬프 · 지도 핀</h3><div className="events-asset-summary">
              <div><div className="events-asset-thumb events-checker">{tour.stampImageUrl ? <img src={tour.stampImageUrl} alt="스탬프 미리보기" /> : <span>미설정</span>}</div><span>스탬프</span></div>
              {pinImages.map((pin) => <div key={pin.label}><div className="events-asset-thumb events-checker">{pin.url ? <img src={pin.url} alt={`${pin.label} 미리보기`} /> : <span>기본 핀</span>}</div><span>{pin.label}</span></div>)}
            </div></>}
            <p className="events-help">설정 저장 후 앱에 반영돼요. 변경 사항은 최대 1분 후 표시됩니다.</p>
          </section>
          <section className="events-card events-links"><h2>이벤트 연결</h2><label>NFC · QR 웹 링크<a href={`${catalog.config.webOrigin}/event/${selected.id}`} target="_blank" rel="noreferrer">{catalog.config.webOrigin}/event/{selected.id} ↗</a></label>
            <label>앱 딥링크<code>katsumap://event/{selected.id}</code></label><p className="events-help">앱 배너의 이동 목적지에서 ‘이벤트’를 선택하고 이 이벤트를 지정하세요.</p>
          </section>
          <div className="events-policy"><strong>지난 이벤트는 안전하게 보관</strong><p>비활성 링크는 안내 후 앱 홈으로 이동해요. 기존 적립 스탬프는 유지됩니다.</p></div>
        </aside>
      </fieldset> : <div className="events-empty">첫 이벤트를 만들어보세요. ‘새 이벤트’에서 시작할 수 있어요.</div>}
      <div className="events-savebar"><div><strong>{selected?.title || '이벤트 설정'}</strong><span>편집한 내용은 설정 저장을 눌러야 반영됩니다.</span></div>
        <div className="events-save-actions">
          {message.startsWith('저장했습니다.') && events === catalog.config.events && <span className="events-save-success" role="status">✓ 저장됐어요</span>}
        <button className="events-button events-button-primary" disabled={locked || !selected} onClick={() => {
          try { const value = JSON.parse(settings); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); }
          catch { setMessage('추가 웹 설정은 유효한 JSON 객체여야 합니다.'); return; }
          save();
        }}>{status === 'saving' ? '저장 중...' : status === 'uploading' ? '이미지 업로드 중...' : '설정 저장'}</button>
        </div>
      </div>
    </>}
  </main>;
}
