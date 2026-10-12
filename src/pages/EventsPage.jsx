import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../api/axios';
import { addEvent, updateEvent, sendEventAsset } from '../utils/eventForm';

const input = { width: '100%', padding: 10, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 };
const button = { padding: '10px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' };
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

  return <main style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
    <h1>이벤트 관리</h1>
    <p style={{ color: '#666' }}>한 번에 하나만 활성화할 수 있습니다. 활성화하면 앱 홈의 전국 보기 버튼 위에 이벤트 이미지가 표시됩니다.</p>
    {message && <p role="status" style={{ padding: 12, background: '#fff4e6', borderRadius: 8 }}>{message}</p>}
    {status === 'loading' && <p>불러오는 중...</p>}
    {status === 'error' && <button style={button} onClick={() => window.location.reload()}>다시 불러오기</button>}
    {catalog && <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select aria-label="이벤트 선택" style={{ ...input, width: 300 }} disabled={locked} value={selectedId ?? ''}
          onChange={(e) => { const id = Number(e.target.value); setSelectedId(id); setSettings(JSON.stringify(events.find((item) => item.id === id)?.publicData ?? {}, null, 2)); }}>
          <option value="" disabled>이벤트를 선택하세요</option>
          {events.map((event) => <option key={event.id} value={event.id}>#{event.id} {event.title} · {event.enabled ? '활성' : '비활성'}</option>)}
        </select>
        <button style={button} disabled={locked || events.length >= 100} onClick={() => {
          const next = addEvent(events); setEvents(next); setSelectedId(next.at(-1).id); setSettings('{}');
        }}>새 이벤트</button>
      </div>
      {selected && <fieldset disabled={locked} style={{ padding: 20, border: '1px solid #e4e4e4', borderRadius: 12, display: 'grid', gap: 18 }}>
        <label>이벤트 제목<input style={input} maxLength={80} value={selected.title} onChange={(e) => patch({ title: e.target.value })} /></label>
        <label>웹 페이지 경로<input style={input} placeholder="/seongbukcheon" value={selected.webPath} onChange={(e) => patch({ webPath: e.target.value })} />
          <small>{catalog.config.webOrigin}{selected.webPath}</small></label>
        <label>홈 버튼 이미지 · PNG / GIF / SVG<input style={{ display: 'block', marginTop: 8 }} type="file" accept="image/png,image/gif,image/svg+xml" onChange={upload} /></label>
        {selected.buttonImageUrl && <div style={{ background: 'repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 0 / 16px 16px', borderRadius: 8, padding: 20, width: 100 }}>
          <img src={selected.buttonImageUrl} alt="이벤트 버튼 미리보기" style={{ width: 80, height: 80, objectFit: 'contain' }} />
        </div>}
        <label><input type="checkbox" checked={selected.enabled} onChange={(e) => patch({ enabled: e.target.checked })} /> 이벤트 활성화 (기존 활성 이벤트는 자동으로 꺼집니다)</label>
        <div style={{ fontSize: 14, overflowWrap: 'anywhere' }}>
          <p>NFC·QR 링크: <a href={`${catalog.config.webOrigin}/event/${selected.id}`} target="_blank" rel="noreferrer">{catalog.config.webOrigin}/event/{selected.id}</a></p>
          <p>앱 딥링크: <code>katsumap://event/{selected.id}</code></p>
          <p>앱 배너의 이동 목적지에서 ‘이벤트’를 선택하고 이 이벤트를 지정하면 됩니다.</p>
        </div>
        <details><summary>추가 웹 설정</summary>
          <p style={{ color: '#666', fontSize: 13 }}>웹에 공개되는 JSON입니다. 비밀번호·키·사용자 개인정보를 넣지 마세요.</p>
          <textarea aria-label="추가 웹 설정" style={{ ...input, minHeight: 140, fontFamily: 'monospace' }} value={settings} onChange={(e) => {
            setSettings(e.target.value);
            try { const value = JSON.parse(e.target.value); if (value && typeof value === 'object' && !Array.isArray(value)) patch({ publicData: value }); } catch {}
          }} />
        </details>
      </fieldset>}
      <button style={{ ...button, marginTop: 20, background: '#e34840', color: '#fff', border: 0 }} disabled={locked || !selected} onClick={() => {
        try { const value = JSON.parse(settings); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); }
        catch { setMessage('추가 웹 설정은 유효한 JSON 객체여야 합니다.'); return; }
        save();
      }}>{status === 'saving' ? '저장 중...' : status === 'uploading' ? '이미지 업로드 중...' : '설정 저장'}</button>
      <p style={{ color: '#888', fontSize: 13 }}>비활성 이벤트 링크는 안내를 2초 보여준 뒤 돈가스 지도 앱을 엽니다. 지난 이벤트는 비활성 상태로 보관됩니다.</p>
    </>}
  </main>;
}
