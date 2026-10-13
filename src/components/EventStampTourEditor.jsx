import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import { sendEventAsset } from '../utils/eventForm';
import { getPushDestinationSearch } from '../utils/pushDestinationSearch';

const emptyTour = () => ({ enabled: false, restaurants: [], stampImageUrl: '', pinMode: 'same', pinImageUrl: '', ratingPinImages: {} });

export default function EventStampTourEditor({ event, onChange, locked, setBusy, onMessage }) {
  const tour = event.stampTour ?? emptyTour();
  const patch = (value) => onChange({ ...tour, ...value });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState('idle');
  useEffect(() => {
    const search = getPushDestinationSearch('restaurantId', query);
    if (!search || !tour.enabled) { setResults([]); setSearchStatus('idle'); return; }
    const controller = new AbortController();
    setSearchStatus('loading');
    const timer = setTimeout(() => apiClient.get(search.url, { params: search.params, signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) { setResults(Array.isArray(response.data?.data) ? response.data.data : []); setSearchStatus('ready'); } })
      .catch(() => { if (!controller.signal.aborted) setSearchStatus('error'); }), 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, tour.enabled]);
  const upload = async (e, key, rating) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file || locked) return;
    setBusy(true);
    try {
      const url = await sendEventAsset(apiClient, file);
      patch(rating ? { ratingPinImages: { ...tour.ratingPinImages, [rating]: url } } : { [key]: url });
      onMessage('이미지를 업로드했습니다. 설정 저장을 눌러 반영해주세요.');
    } catch (error) { onMessage(typeof error.response?.data?.message === 'string' ? error.response.data.message : '이미지 업로드에 실패했습니다.'); }
    finally { setBusy(false); }
  };
  const imageField = (label, key, rating) => {
    const url = rating ? tour.ratingPinImages[rating] : tour[key];
    return <div className="events-upload-tile">
      <div className="events-upload-preview events-checker">{url ? <img src={url} alt={label} /> : <span>{rating ? `★${rating}` : key === 'stampImageUrl' ? '스탬프' : '공통 핀'}</span>}</div>
      <label className="events-field">{label}<span className="events-help">PNG · GIF · SVG / 최대 10MB</span>
        <input type="file" aria-label={`${label} 업로드`} accept="image/png,image/gif,image/svg+xml" onChange={(e) => upload(e, key, rating)} />
      </label>
      {url && <button className="events-text-button" type="button" onClick={() => patch(rating ? { ratingPinImages: { ...tour.ratingPinImages, [rating]: '' } } : { [key]: '' })}>이미지 제거</button>}
    </div>;
  };
  return <section className="events-card event-tour">
    <div className="events-card-heading"><span className="events-step">02</span><div><h2>스탬프 투어</h2><p>가게를 방문하고 기록을 남기는 즐거움을 더하세요.</p></div></div>
    <label className="events-toggle"><input type="checkbox" checked={tour.enabled} onChange={(e) => patch({ enabled: e.target.checked })} />
      <span><strong>스탬프 투어 사용</strong><small>참여 가게·스탬프 이미지·지도 핀을 설정할 수 있어요.</small></span>
      <span className={`events-badge ${tour.enabled ? 'is-active' : ''}`}>{tour.enabled ? '사용' : '사용 안 함'}</span>
    </label>
    {tour.enabled && <>
      <div className="events-rule-strip"><span><b>공개</b> 새 기록</span><span>사진 <b>1장+</b></span><span>후기 <b>30자+</b></span><span>가게별 <b>1회</b></span></div>
      <p className="events-help">이벤트 활성 중 조건을 충족하면 자동 적립돼요. 나만보기·재공개 전환과 내용 수정은 적립을 유지해요. 기록 삭제·관리자 삭제 또는 숨김 시에는 해당 스탬프를 회수합니다.</p>
      <div className="events-subsection-heading"><h3>참여 가게</h3><span className="events-count">{tour.restaurants.length}곳</span></div>
      <label className="events-field events-search">가게 검색<input aria-label="참여 가게 검색" value={query} placeholder="가게 이름·주소 또는 ID로 검색" onChange={(e) => setQuery(e.target.value)} /></label>
      {searchStatus === 'loading' && <p className="events-help">검색 중...</p>}
      {searchStatus === 'error' && <p role="alert" className="events-help">검색에 실패했습니다. 다시 검색해주세요.</p>}
      {searchStatus === 'ready' && !results.length && <p className="events-help">검색 결과가 없습니다.</p>}
      {!!results.length && <div className="events-search-results">{results.map((restaurant) => <button className="events-search-result" type="button" key={restaurant.id} disabled={locked || tour.restaurants.some((item) => item.id === restaurant.id) || tour.restaurants.length >= 200}
        onClick={() => patch({ restaurants: [...tour.restaurants, { id: restaurant.id, name: restaurant.name }] })}>
        <span><strong>{restaurant.name}</strong><small>{restaurant.addr || restaurant.area || ''} · #{restaurant.id}</small></span><span className="events-result-action">{tour.restaurants.some((item) => item.id === restaurant.id) ? '추가됨' : '+ 추가'}</span>
      </button>)}</div>}
      {tour.restaurants.length ? <ol className="events-store-list">{tour.restaurants.map((restaurant, index) => <li key={restaurant.id}><span className="events-store-number">{String(index + 1).padStart(2, '0')}</span><div><strong>{restaurant.name}</strong><small>#{restaurant.id}</small></div><button type="button" className="events-text-button" onClick={() => patch({ restaurants: tour.restaurants.filter((item) => item.id !== restaurant.id) })}>제외</button></li>)}</ol>
        : <div className="events-store-empty">아직 참여 가게가 없어요. 검색해서 첫 가게를 추가해보세요.</div>}
      <p className="events-help">선택한 가게 수만큼 스탬프 칸이 표시돼요. 가게를 제외해도 기존 적립은 삭제되지 않습니다.</p>
      <div className="events-subsection-heading"><h3>스탬프 이미지</h3><span>획득한 칸에 표시</span></div>
      {imageField('스탬프 이미지', 'stampImageUrl')}
      <div className="events-subsection-heading"><h3>지도 핀</h3><span>참여 가게에만 적용</span></div>
      <label className="events-field">핀 표시 방식<select aria-label="이벤트 핀 모드" value={tour.pinMode} onChange={(e) => patch({ pinMode: e.target.value })}>
        <option value="same">모든 별점에 같은 핀</option><option value="byRating">별점별 다른 핀</option>
      </select></label>
      <div className={`events-pin-fields ${tour.pinMode === 'byRating' ? 'by-rating' : ''}`}>
        {tour.pinMode === 'same' ? imageField('공통 핀 이미지', 'pinImageUrl') : ['1', '2', '3', '4'].map((rating) => <div key={rating}>{imageField(`★${rating} 핀 이미지`, null, rating)}</div>)}
      </div>
      <p className="events-help">이미지가 없는 별점은 기존 핀을 사용해요. 투명 배경을 그대로 표시합니다.</p>
    </>}
  </section>;
}
