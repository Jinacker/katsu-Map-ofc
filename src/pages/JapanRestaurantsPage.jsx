import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/axios';
import { uploadImageToGCS } from '../api/gcs';
import './JapanRestaurantsPage.css';

const DAYS = [
  ['mon', '월'], ['tue', '화'], ['wed', '수'], ['thu', '목'],
  ['fri', '금'], ['sat', '토'], ['sun', '일'],
];
const PREFECTURES = [
  '전체', '홋카이도', '아오모리', '이와테', '미야기', '아키타', '야마가타', '후쿠시마',
  '이바라키', '도치기', '군마', '사이타마', '치바', '도쿄', '가나가와', '니가타', '도야마',
  '이시카와', '후쿠이', '야마나시', '나가노', '기후', '시즈오카', '아이치', '미에', '시가',
  '교토', '오사카', '효고', '나라', '와카야마', '돗토리', '시마네', '오카야마', '히로시마',
  '야마구치', '도쿠시마', '가가와', '에히메', '고치', '후쿠오카', '사가', '나가사키',
  '구마모토', '오이타', '미야자키', '가고시마', '오키나와',
  '기타',
];
const EMPTY_HOURS = {
  mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '', breakTime: '', note: '',
};
const EMPTY_FORM = {
  name: '', region: '도쿄', area: '', addr: '', lat: '', lng: '',
  isKatsuHunterPick: '', googleMapsUrl: '', tabelogUrl: '', websiteUrl: '',
  imageUrl1: '', imageUrl2: '', imageUrl3: '', aiReviewSummary: '',
  katsuHunterDescription: '', ownerComment: '', reporterComment: '', priceDisplay: '',
  googleRating: '', tabelogRating: '', isCompleted: false,
  featureTagIds: [],
};

const optionalNumber = (value) => (value === '' || value == null ? undefined : Number(value));
const optionalText = (value) => value?.trim() || undefined;
const KOREAN_DAY_KEYS = {
  월요일: 'mon', 화요일: 'tue', 수요일: 'wed', 목요일: 'thu',
  금요일: 'fri', 토요일: 'sat', 일요일: 'sun',
};

const parsePastedHours = (rawText) => {
  const parsed = {};
  let currentDay = null;

  const append = (value) => {
    if (!currentDay) return;
    const cleaned = value
      .replace(/\\~/g, '~')
      .replace(/^[-*•]\s*/, '')
      .replace(/^\|+|\|+$/g, '')
      .trim();
    if (!cleaned || /^[|:\-\s]+$/.test(cleaned)) return;
    if (!/(\d{1,2}(?::\d{2}|시)|휴무|24시간|영업)/.test(cleaned)) return;
    parsed[currentDay] = [...(parsed[currentDay] || []), cleaned];
  };

  rawText.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.replace(/\*\*/g, '').trim();
    const dayMatch = line.match(/(월요일|화요일|수요일|목요일|금요일|토요일|일요일)/);
    if (dayMatch) {
      currentDay = KOREAN_DAY_KEYS[dayMatch[1]];
      append(line.slice((dayMatch.index || 0) + dayMatch[1].length));
      return;
    }
    append(line);
  });

  return Object.fromEntries(
    Object.entries(parsed).map(([key, values]) => [key, values.join(' / ')]),
  );
};

export default function JapanRestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [featureTags, setFeatureTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('전체');
  const [pickFilter, setPickFilter] = useState('전체');
  const [completionFilter, setCompletionFilter] = useState('전체');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailRestaurant, setDetailRestaurant] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [hours, setHours] = useState(EMPTY_HOURS);
  const [hoursPasteText, setHoursPasteText] = useState('');
  const [hoursParseMessage, setHoursParseMessage] = useState('');
  const [menuText, setMenuText] = useState('');
  const [contributors, setContributors] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [restaurantRes, tagRes] = await Promise.all([
        apiClient.get('/api/v1/admin/japan-restaurants'),
        apiClient.get('/api/v1/admin/feature-tags'),
      ]);
      setRestaurants(restaurantRes.data?.data || []);
      setFeatureTags(tagRes.data?.data || []);
    } catch (error) {
      console.error(error);
      alert('일본 맛집 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => restaurants.filter((restaurant) => {
    const keyword = query.trim().toLowerCase();
    const matchesQuery = !keyword || [restaurant.name, restaurant.addr, restaurant.area]
      .some((value) => value?.toLowerCase().includes(keyword));
    const matchesRegion = region === '전체' || restaurant.region === region;
    const matchesPick = pickFilter === '전체'
      || (pickFilter === '픽' && restaurant.isKatsuHunterPick === true)
      || (pickFilter === '논픽' && restaurant.isKatsuHunterPick === false)
      || (pickFilter === '미선택' && restaurant.isKatsuHunterPick == null);
    const matchesCompletion = completionFilter === '전체'
      || (completionFilter === '작성 완료' && restaurant.isCompleted === true)
      || (completionFilter === '미완료' && restaurant.isCompleted !== true);
    return matchesQuery && matchesRegion && matchesPick && matchesCompletion;
  }), [restaurants, query, region, pickFilter, completionFilter]);

  const availableRegions = useMemo(() => {
    const existing = new Set(restaurants.map((restaurant) => restaurant.region).filter(Boolean));
    const ordered = PREFECTURES.filter((item) => item !== '전체' && existing.has(item));
    const extras = [...existing].filter((item) => !PREFECTURES.includes(item)).sort();
    return ['전체', ...ordered, ...extras];
  }, [restaurants]);

  useEffect(() => {
    if (!availableRegions.includes(region)) setRegion('전체');
  }, [availableRegions, region]);

  const resetModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setHours(EMPTY_HOURS);
    setHoursPasteText('');
    setHoursParseMessage('');
    setMenuText('');
    setContributors([]);
    setUserQuery('');
    setUserResults([]);
  };

  const openCreate = () => {
    resetModal();
    setModalOpen(true);
  };

  const openEdit = async (restaurant) => {
    try {
      const response = await apiClient.get(`/api/v1/admin/japan-restaurants/${restaurant.id}`);
      const detail = response.data?.data;
      setEditingId(restaurant.id);
      setForm({
        name: detail.name || '', region: detail.region || '도쿄', area: detail.area || '',
        addr: detail.addr || '', lat: detail.lat ?? '', lng: detail.lng ?? '',
        isKatsuHunterPick: detail.isKatsuHunterPick == null
          ? '' : String(detail.isKatsuHunterPick),
        googleMapsUrl: detail.googleMapsUrl || '', tabelogUrl: detail.tabelogUrl || '',
        websiteUrl: detail.websiteUrl || '', imageUrl1: detail.imageUrl1 || '',
        imageUrl2: detail.imageUrl2 || '', imageUrl3: detail.imageUrl3 || '',
        aiReviewSummary: detail.aiReviewSummary || '',
        katsuHunterDescription: detail.katsuHunterDescription || '',
        ownerComment: detail.ownerComment || '', reporterComment: detail.reporterComment || '',
        priceDisplay: detail.priceDisplay || '', googleRating: detail.googleRating ?? '',
        tabelogRating: detail.tabelogRating ?? '', isCompleted: detail.isCompleted === true,
        featureTagIds: detail.featureTags?.map((tag) => tag.id) || [],
      });
      setHours({ ...EMPTY_HOURS, ...(detail.hours || {}) });
      setMenuText((detail.menus || []).map((menu) => (
        menu.priceRate ? `${menu.name} | ${menu.priceRate}` : menu.name
      )).join('\n'));
      setContributors(detail.contributors || []);
      setModalOpen(true);
    } catch (error) {
      alert(error.response?.data?.message || '상세 정보를 불러오지 못했습니다.');
    }
  };

  const openDetail = async (restaurant) => {
    setDetailLoading(true);
    try {
      const response = await apiClient.get(`/api/v1/admin/japan-restaurants/${restaurant.id}`);
      setDetailRestaurant(response.data?.data);
    } catch (error) {
      alert(error.response?.data?.message || '상세 정보를 불러오지 못했습니다.');
    } finally {
      setDetailLoading(false);
    }
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleTag = (tagId) => {
    setForm((prev) => {
      const selected = prev.featureTagIds.includes(tagId);
      if (!selected && prev.featureTagIds.length >= 7) {
        alert('특징 태그는 최대 7개까지 붙일 수 있습니다.');
        return prev;
      }
      return {
        ...prev,
        featureTagIds: selected
          ? prev.featureTagIds.filter((id) => id !== tagId)
          : [...prev.featureTagIds, tagId],
      };
    });
  };

  const handleImage = async (file, key) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('이미지 파일만 업로드 가능합니다.');
    setUploading(key);
    try {
      const url = await uploadImageToGCS(file, 'japan-restaurants');
      setField(key, url);
    } catch (error) {
      alert(`이미지 업로드 실패: ${error.message}`);
    } finally {
      setUploading(null);
    }
  };

  const applyPastedHours = (text) => {
    const parsed = parsePastedHours(text);
    const parsedCount = Object.keys(parsed).length;
    if (parsedCount === 0) {
      setHoursParseMessage('요일을 찾지 못했습니다. 월요일~일요일 표기가 있는지 확인해주세요.');
      return;
    }
    setHours((prev) => ({ ...prev, ...parsed }));
    setHoursParseMessage(`${parsedCount}개 요일을 영업시간 입력칸에 반영했습니다.`);
  };

  const handleHoursPaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text');
    setHoursPasteText(text);
    applyPastedHours(text);
  };

  const buildPayload = () => {
    const clearableText = (value) => {
      const normalized = optionalText(value);
      return editingId ? normalized ?? null : normalized;
    };
    const clearableNumber = (value) => {
      const normalized = optionalNumber(value);
      return editingId ? normalized ?? null : normalized;
    };
    const summaryLines = form.aiReviewSummary.split(/\r?\n/).filter((line) => line.trim());
    if (summaryLines.length > 6) throw new Error('AI 리뷰 종합 분석은 최대 6줄까지 입력할 수 있습니다.');
    const menus = menuText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
      const [name, ...priceParts] = line.split('|');
      return { name: name.trim(), priceRate: optionalText(priceParts.join('|')), displayOrder: index };
    });
    return {
      name: form.name.trim(), region: form.region, area: form.area.trim(), addr: form.addr.trim(),
      lat: Number(form.lat), lng: Number(form.lng),
      isKatsuHunterPick: form.isKatsuHunterPick === ''
        ? null : form.isKatsuHunterPick === 'true',
      googleMapsUrl: form.googleMapsUrl.trim(), tabelogUrl: clearableText(form.tabelogUrl),
      websiteUrl: clearableText(form.websiteUrl), imageUrl1: clearableText(form.imageUrl1),
      imageUrl2: clearableText(form.imageUrl2), imageUrl3: clearableText(form.imageUrl3),
      aiReviewSummary: clearableText(form.aiReviewSummary),
      katsuHunterDescription: clearableText(form.katsuHunterDescription),
      ownerComment: clearableText(form.ownerComment), reporterComment: clearableText(form.reporterComment),
      priceDisplay: clearableText(form.priceDisplay), googleRating: clearableNumber(form.googleRating),
      tabelogRating: clearableNumber(form.tabelogRating),
      isCompleted: form.isCompleted,
      featureTagIds: form.featureTagIds, hours, menus,
    };
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = buildPayload();
      if (!payload.name || !payload.area || !payload.addr || !payload.googleMapsUrl
        || !Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) {
        throw new Error('가게명·세부지역·주소·좌표·Google Maps URL은 필수입니다.');
      }
      if (editingId) await apiClient.put(`/api/v1/admin/japan-restaurants/${editingId}`, payload);
      else await apiClient.post('/api/v1/admin/japan-restaurants', payload);
      setModalOpen(false);
      resetModal();
      await load();
    } catch (error) {
      alert(error.response?.data?.message || error.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (restaurant) => {
    if (!window.confirm(`'${restaurant.name}'을(를) 삭제할까요?`)) return;
    try {
      await apiClient.delete(`/api/v1/admin/japan-restaurants/${restaurant.id}`);
      await load();
    } catch (error) {
      alert(error.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  const searchUsers = async () => {
    if (!userQuery.trim()) return;
    try {
      const response = await apiClient.get('/api/v1/admin/users/search', {
        params: { query: userQuery.trim() },
      });
      setUserResults(response.data?.data || []);
    } catch (error) {
      alert(error.response?.data?.message || '유저 검색에 실패했습니다.');
    }
  };

  const addContributor = async (userId) => {
    if (!editingId) return alert('가게를 먼저 저장한 뒤 기여자를 추가해주세요.');
    try {
      await apiClient.post(`/api/v1/admin/japan-restaurants/${editingId}/contributors`, { userId });
      const response = await apiClient.get(`/api/v1/admin/japan-restaurants/${editingId}/contributors`);
      setContributors(response.data?.data || []);
      setUserResults([]);
      setUserQuery('');
    } catch (error) {
      alert(error.response?.data?.message || '기여자 추가에 실패했습니다.');
    }
  };

  const removeContributor = async (userId) => {
    await apiClient.delete(`/api/v1/admin/japan-restaurants/${editingId}/contributors/${userId}`);
    setContributors((prev) => prev.filter((item) => item.userId !== userId));
  };

  return (
    <div className="jp-page">
      <header className="jp-header">
        <div>
          <h1>일본 맛집 관리</h1>
          <p>Google Maps·타베로그 정보와 카츠헌터 큐레이션을 관리합니다.</p>
        </div>
        <button className="jp-primary" onClick={openCreate}>+ 일본 맛집 등록</button>
      </header>

      <div className="jp-toolbar">
        <input placeholder="가게명·주소·지역 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          {availableRegions.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={pickFilter} onChange={(e) => setPickFilter(e.target.value)}>
          {['전체', '미선택', '픽', '논픽'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={completionFilter} onChange={(e) => setCompletionFilter(e.target.value)}>
          {['전체', '작성 완료', '미완료'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <span>{filtered.length}곳</span>
      </div>

      {loading ? <div className="jp-empty">불러오는 중...</div> : (
        <div className="jp-table-wrap">
          <table className="jp-table">
            <thead><tr><th>가게</th><th>지역</th><th>작성 상태</th><th>평점</th><th>가격대</th><th>등급</th><th>링크</th><th>관리</th></tr></thead>
            <tbody>
              {filtered.map((restaurant) => (
                <tr key={restaurant.id} className="jp-clickable" onClick={() => openDetail(restaurant)}>
                  <td><div className="jp-store-cell">{restaurant.imageUrl1 ? <img src={restaurant.imageUrl1} alt="" /> : <span className="jp-cover-empty">NO IMAGE</span>}<div><strong>{restaurant.name}</strong><small>{restaurant.addr}</small></div></div></td>
                  <td>{restaurant.area}</td>
                  <td><span className={`jp-completion-badge${restaurant.isCompleted ? ' completed' : ''}`}>{restaurant.isCompleted ? '작성 완료' : '미완료'}</span></td>
                  <td><span>G {restaurant.googleRating ?? '-'}</span><span>T {restaurant.tabelogRating ?? '-'}</span></td>
                  <td>{restaurant.priceDisplay || '-'}</td>
                  <td>{restaurant.isKatsuHunterPick == null ? '미선택' : restaurant.isKatsuHunterPick ? '픽' : '논픽'}</td>
                  <td className="jp-links" onClick={(e) => e.stopPropagation()}>
                    <a href={restaurant.googleMapsUrl} target="_blank" rel="noreferrer">Google</a>
                    {restaurant.tabelogUrl && <a href={restaurant.tabelogUrl} target="_blank" rel="noreferrer">타베로그</a>}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}><button onClick={() => openEdit(restaurant)}>수정</button><button className="danger" onClick={() => remove(restaurant)}>삭제</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="jp-empty">조건에 맞는 일본 맛집이 없습니다.</div>}
        </div>
      )}

      {detailLoading && <div className="jp-detail-loading">상세 정보를 불러오는 중...</div>}
      {detailRestaurant && (
        <div className="jp-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setDetailRestaurant(null)}>
          <div className="jp-modal jp-detail-modal">
            <div className="jp-modal-head"><div><h2>{detailRestaurant.name}</h2><small>{[detailRestaurant.area, detailRestaurant.priceDisplay].filter(Boolean).join(' · ')}</small></div><button type="button" onClick={() => setDetailRestaurant(null)}>×</button></div>
            <div className="jp-detail-gallery">
              {[detailRestaurant.imageUrl1, detailRestaurant.imageUrl2, detailRestaurant.imageUrl3].map((url, index) => (
                <div className={`jp-detail-photo-slot${url ? '' : ' is-empty'}`} key={`photo-${index + 1}`}>
                  {url && <img src={url} alt={`${detailRestaurant.name} ${index + 1}`} />}
                </div>
              ))}
            </div>
            <section><h3>기본 정보</h3><dl className="jp-detail-grid">
              <div><dt>주소</dt><dd>{detailRestaurant.addr}</dd></div>
              <div><dt>좌표</dt><dd>{detailRestaurant.lat}, {detailRestaurant.lng}</dd></div>
              <div><dt>도도부현</dt><dd>{detailRestaurant.region}</dd></div>
              <div><dt>세부지역</dt><dd>{detailRestaurant.area}</dd></div>
              <div><dt>등급</dt><dd>{detailRestaurant.isKatsuHunterPick == null ? '미선택' : detailRestaurant.isKatsuHunterPick ? '카츠헌터픽' : '논카츠헌터픽'}</dd></div>
              <div><dt>작성 상태</dt><dd>{detailRestaurant.isCompleted ? '작성 완료' : '미완료'}</dd></div>
              <div><dt>가격대</dt><dd>{detailRestaurant.priceDisplay || ''}</dd></div>
              <div><dt>Google 평점</dt><dd>{detailRestaurant.googleRating ?? ''}</dd></div>
              <div><dt>타베로그 평점</dt><dd>{detailRestaurant.tabelogRating ?? ''}</dd></div>
            </dl></section>
            <section><h3>외부 링크</h3><dl className="jp-detail-copy">
              <div><dt>Google Maps</dt><dd>{detailRestaurant.googleMapsUrl && <a href={detailRestaurant.googleMapsUrl} target="_blank" rel="noreferrer">바로가기</a>}</dd></div>
              <div><dt>타베로그</dt><dd>{detailRestaurant.tabelogUrl && <a href={detailRestaurant.tabelogUrl} target="_blank" rel="noreferrer">바로가기</a>}</dd></div>
              <div><dt>공식 사이트</dt><dd>{detailRestaurant.websiteUrl && <a href={detailRestaurant.websiteUrl} target="_blank" rel="noreferrer">바로가기</a>}</dd></div>
            </dl></section>
            <section><h3>영업시간</h3><div className="jp-detail-hours">{DAYS.map(([key, label]) => <div key={key}><b>{label}</b><span>{detailRestaurant.hours?.[key] || ''}</span></div>)}</div><dl className="jp-detail-copy jp-detail-hours-extra"><div><dt>브레이크 타임</dt><dd>{detailRestaurant.hours?.breakTime || ''}</dd></div><div><dt>참고사항</dt><dd>{detailRestaurant.hours?.note || ''}</dd></div></dl></section>
            <section><h3>특징 태그</h3><div className="jp-tags jp-detail-tags">{(detailRestaurant.featureTags || []).map((tag) => <span className="jp-detail-tag" key={tag.id}>{tag.name}</span>)}</div></section>
            <section><h3>AI 리뷰 종합 분석</h3><p className="jp-preline jp-detail-blank-area">{detailRestaurant.aiReviewSummary || ''}</p></section>
            <section><h3>운영 문구</h3><dl className="jp-detail-copy"><div><dt>카츠헌터 설명</dt><dd>{detailRestaurant.katsuHunterDescription || ''}</dd></div><div><dt>사장님 한마디</dt><dd>{detailRestaurant.ownerComment || ''}</dd></div><div><dt>제보자 한마디</dt><dd>{detailRestaurant.reporterComment || ''}</dd></div></dl></section>
            <section><h3>대표 메뉴</h3><div className="jp-detail-list">{(detailRestaurant.menus || []).map((menu) => <div key={menu.id}>{menu.name}{menu.priceRate ? ` · ${menu.priceRate}` : ''}</div>)}</div></section>
            <section><h3>제보 기여자</h3><div className="jp-detail-list">{(detailRestaurant.contributors || []).map((item) => <div key={item.userId}>{item.user?.nickname || item.user?.uuid || ''}</div>)}</div></section>
            <footer className="jp-modal-actions"><button type="button" onClick={() => setDetailRestaurant(null)}>닫기</button><button type="button" className="jp-primary" onClick={() => { const target = detailRestaurant; setDetailRestaurant(null); openEdit(target); }}>수정</button></footer>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="jp-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <form className="jp-modal" onSubmit={save}>
            <div className="jp-modal-head"><h2>{editingId ? '일본 맛집 수정' : '일본 맛집 등록'}</h2><button type="button" onClick={() => setModalOpen(false)}>×</button></div>
            <section><h3>기본 정보</h3><div className="jp-grid three">
              <label>가게명 (한국어 Google 지도 표시명) *<input value={form.name} onChange={(e) => setField('name', e.target.value)} required /></label>
              <label>도도부현 *<select value={form.region} onChange={(e) => setField('region', e.target.value)}>{PREFECTURES.filter((item) => item !== '전체').map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>세부지역 *<input placeholder="도쿄 신주쿠" value={form.area} onChange={(e) => setField('area', e.target.value)} required /></label>
            </div><label>일본 주소 *<input value={form.addr} onChange={(e) => setField('addr', e.target.value)} required /></label>
            <div className="jp-grid three"><label>위도 *<input type="number" step="any" value={form.lat} onChange={(e) => setField('lat', e.target.value)} required /></label><label>경도 *<input type="number" step="any" value={form.lng} onChange={(e) => setField('lng', e.target.value)} required /></label><label>등급<select value={form.isKatsuHunterPick} onChange={(e) => setField('isKatsuHunterPick', e.target.value)}><option value="">미선택</option><option value="true">카츠헌터픽</option><option value="false">논카츠헌터픽</option></select></label></div><label className="jp-completion-check"><input type="checkbox" checked={form.isCompleted} onChange={(e) => setField('isCompleted', e.target.checked)} /><span>필수 정보를 모두 작성했습니다.</span></label></section>

            <section><h3>외부 정보</h3><label>Google Maps URL *<input value={form.googleMapsUrl} onChange={(e) => setField('googleMapsUrl', e.target.value)} required /></label><div className="jp-grid two"><label>타베로그 URL<input value={form.tabelogUrl} onChange={(e) => setField('tabelogUrl', e.target.value)} /></label><label>가게 공식 사이트<input value={form.websiteUrl} onChange={(e) => setField('websiteUrl', e.target.value)} /></label></div><div className="jp-grid two"><label>Google 평점<input type="number" min="0" max="5" step="0.1" value={form.googleRating} onChange={(e) => setField('googleRating', e.target.value)} /></label><label>타베로그 평점<input type="number" min="0" max="5" step="0.01" value={form.tabelogRating} onChange={(e) => setField('tabelogRating', e.target.value)} /></label></div><label>가격대<input placeholder="2,000~3,000엔" value={form.priceDisplay} onChange={(e) => setField('priceDisplay', e.target.value)} /></label></section>

            <section><h3>사진 (최대 3장)</h3><div className="jp-images">{['imageUrl1', 'imageUrl2', 'imageUrl3'].map((key, index) => <div className="jp-image" key={key}>{form[key] ? <img src={form[key]} alt={`가게 ${index + 1}`} /> : <span>사진 {index + 1}</span>}<input type="file" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0], key)} />{form[key] && <button type="button" onClick={() => setField(key, '')}>비우기</button>}{uploading === key && <small>업로드 중...</small>}</div>)}</div></section>

            <section><h3>리뷰 분석·운영 문구</h3><label>AI 리뷰 종합 분석 (최대 6줄)<textarea rows="7" value={form.aiReviewSummary} onChange={(e) => setField('aiReviewSummary', e.target.value)} /></label><label>카츠헌터 설명<textarea rows="3" value={form.katsuHunterDescription} onChange={(e) => setField('katsuHunterDescription', e.target.value)} /></label><div className="jp-grid two"><label>사장님 한마디<textarea rows="3" value={form.ownerComment} onChange={(e) => setField('ownerComment', e.target.value)} /></label><label>제보자 한마디<textarea rows="3" value={form.reporterComment} onChange={(e) => setField('reporterComment', e.target.value)} /></label></div></section>

            <section><h3>영업시간</h3><div className="jp-hours-import"><label>요일별 영업시간 붙여넣기<textarea rows="6" placeholder="월요일부터 일요일까지 복사한 내용을 붙여넣으면 자동으로 파싱됩니다." value={hoursPasteText} onPaste={handleHoursPaste} onChange={(e) => { setHoursPasteText(e.target.value); setHoursParseMessage(''); }} /></label><div><button type="button" onClick={() => applyPastedHours(hoursPasteText)}>붙여넣은 내용 반영</button>{hoursParseMessage && <small>{hoursParseMessage}</small>}</div></div><div className="jp-hours">{DAYS.map(([key, label]) => <label key={key}><span>{label}</span><input placeholder="11:00 - 20:00 / 휴무" value={hours[key]} onChange={(e) => setHours((prev) => ({ ...prev, [key]: e.target.value }))} /></label>)}</div><div className="jp-grid two"><label>브레이크 타임<input value={hours.breakTime} onChange={(e) => setHours((prev) => ({ ...prev, breakTime: e.target.value }))} /></label><label>영업시간 참고사항<input value={hours.note} onChange={(e) => setHours((prev) => ({ ...prev, note: e.target.value }))} /></label></div></section>

            <section><h3>특징 태그 ({form.featureTagIds.length}/7)</h3><div className="jp-tags">{featureTags.map((tag) => <button type="button" key={tag.id} disabled={!tag.isActive && !form.featureTagIds.includes(tag.id)} className={form.featureTagIds.includes(tag.id) ? 'selected' : ''} onClick={() => toggleTag(tag.id)}>{tag.name}</button>)}</div></section>

            <section><h3>대표 메뉴</h3><label>한 줄에 하나씩 `메뉴명 | 가격` 형식<textarea rows="4" value={menuText} onChange={(e) => setMenuText(e.target.value)} /></label></section>

            <section><h3>제보 기여자</h3>{contributors.map((item) => <div className="jp-contributor" key={item.userId}><span>{item.user?.nickname || `사용자 ${item.userId}`}</span><button type="button" onClick={() => removeContributor(item.userId)}>제거</button></div>)}<div className="jp-user-search"><input placeholder={editingId ? '닉네임/UUID 검색' : '가게 저장 후 추가 가능'} value={userQuery} disabled={!editingId} onChange={(e) => setUserQuery(e.target.value)} /><button type="button" disabled={!editingId} onClick={searchUsers}>검색</button></div>{userResults.map((user) => <button className="jp-user-result" type="button" key={user.id} onClick={() => addContributor(user.id)}>{user.nickname || '닉네임 없음'} · {user.uuid}</button>)}</section>

            <footer className="jp-modal-actions"><button type="button" onClick={() => setModalOpen(false)}>취소</button><button className="jp-primary" disabled={saving || uploading} type="submit">{saving ? '저장 중...' : '저장'}</button></footer>
          </form>
        </div>
      )}
    </div>
  );
}
