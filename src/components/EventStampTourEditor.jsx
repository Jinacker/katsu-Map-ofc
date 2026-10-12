import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import { sendEventAsset } from '../utils/eventForm';
import { getPushDestinationSearch } from '../utils/pushDestinationSearch';

const emptyTour = () => ({ enabled: false, restaurants: [], stampImageUrl: '', pinMode: 'same', pinImageUrl: '', ratingPinImages: {} });
const input = { padding: 10, border: '1px solid #ddd', borderRadius: 8, width: '100%', boxSizing: 'border-box' };

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
    return <label style={{ display: 'block', marginTop: 12 }}>{label}
      <input type="file" accept="image/png,image/gif,image/svg+xml" style={{ display: 'block', marginTop: 6 }} onChange={(e) => upload(e, key, rating)} />
      {url && <><img src={url} alt={label} style={{ width: 64, height: 64, objectFit: 'contain', background: '#f1f1f1', marginTop: 8 }} />
        <button type="button" onClick={() => patch(rating ? { ratingPinImages: { ...tour.ratingPinImages, [rating]: '' } } : { [key]: '' })}>이미지 제거</button></>}
    </label>;
  };
  return <section style={{ borderTop: '1px solid #ddd', paddingTop: 18 }}>
    <h2>스탬프 투어</h2>
    <label><input type="checkbox" checked={tour.enabled} onChange={(e) => patch({ enabled: e.target.checked })} /> 스탬프 투어 사용</label>
    {tour.enabled && <>
      <p>이벤트 활성 중 새 공개 기록에 사진 1장 이상·후기 30자 이상이면 가게별 1장 적립됩니다. 적립 후 기록을 수정·삭제해도 유지됩니다.</p>
      <label>참여 가게 검색<input aria-label="참여 가게 검색" style={input} value={query} placeholder="가게 이름·주소 또는 ID" onChange={(e) => setQuery(e.target.value)} /></label>
      {searchStatus === 'loading' && <p>검색 중...</p>}
      {searchStatus === 'error' && <p role="alert">검색에 실패했습니다. 다시 검색해주세요.</p>}
      {searchStatus === 'ready' && !results.length && <p>검색 결과가 없습니다.</p>}
      {results.map((restaurant) => <button type="button" key={restaurant.id} disabled={locked || tour.restaurants.some((item) => item.id === restaurant.id) || tour.restaurants.length >= 200}
        style={{ display: 'block', padding: 10, marginTop: 6, width: '100%', textAlign: 'left' }}
        onClick={() => patch({ restaurants: [...tour.restaurants, { id: restaurant.id, name: restaurant.name }] })}>
        + {restaurant.name} · {restaurant.addr || restaurant.area || ''} · #{restaurant.id}
      </button>)}
      <h3>참여 가게 {tour.restaurants.length}곳</h3>
      <ol>{tour.restaurants.map((restaurant) => <li key={restaurant.id} style={{ marginBottom: 8 }}>{restaurant.name} · #{restaurant.id} <button type="button" onClick={() => patch({ restaurants: tour.restaurants.filter((item) => item.id !== restaurant.id) })}>제외</button></li>)}</ol>
      <small>설정한 가게 수만큼 스탬프 칸이 표시됩니다. 17칸으로 운영하려면 17곳을 선택해주세요. 기존 적립은 가게를 제외해도 삭제되지 않습니다.</small>
      {imageField('스탬프 이미지 · PNG / GIF / SVG', 'stampImageUrl')}
      <h3>지도 핀</h3>
      <select aria-label="이벤트 핀 모드" value={tour.pinMode} onChange={(e) => patch({ pinMode: e.target.value })} style={input}>
        <option value="same">모든 별점에 같은 핀</option><option value="byRating">별점별 다른 핀</option>
      </select>
      {tour.pinMode === 'same' ? imageField('공통 핀 이미지', 'pinImageUrl') : ['1', '2', '3', '4'].map((rating) => <div key={rating}>{imageField(`★${rating} 핀 이미지`, null, rating)}</div>)}
      <p style={{ color: '#666', fontSize: 13 }}>이미지가 없는 별점은 기존 핀을 사용합니다. 참여 가게만 교체되며 투명 배경을 그대로 표시합니다.</p>
    </>}
  </section>;
}
