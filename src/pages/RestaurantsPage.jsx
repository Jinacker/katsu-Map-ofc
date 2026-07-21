import React, { useEffect, useState, useRef, useCallback } from 'react';
import apiClient from '../api/axios';
import { uploadImageToGCS } from '../api/gcs';
import './RestaurantsPage.css';

const EMPTY_HOURS = { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '', breakTime: '' };
const EMPTY_FORM_DATA = {
  name: '',
  area: '',
  category: '일식',
  addr: '',
  lat: '',
  lng: '',
  description: '',
  imageUrl: '',
  image_url_1: '',
  image_url_2: '',
  image_url_3: '',
  placeUrl: '',
  isTop5: false,
  isBest: false,
  isGood: false,
  isKatsuHunterPick: false,
  katsuHunterDescription: '',
  ownerComment: '',
};
const EMPTY_MENUS = { priceRate: '', names: '' };
const DAY_OPTIONS = [
  { key: 'mon', label: '월' },
  { key: 'tue', label: '화' },
  { key: 'wed', label: '수' },
  { key: 'thu', label: '목' },
  { key: 'fri', label: '금' },
  { key: 'sat', label: '토' },
  { key: 'sun', label: '일' },
];
const DAY_LABEL_TO_KEY = DAY_OPTIONS.reduce((acc, { key, label }) => {
  acc[label] = key;
  return acc;
}, {});
const TIME_RANGE_PATTERN = /(\d{1,2})\s*(?::|시)\s*(\d{1,2})?\s*(?:분)?\s*(?:-|~|–|—|－)\s*(\d{1,2})\s*(?::|시)\s*(\d{1,2})?\s*(?:분)?/g;

const formatTime = (hour, minute) => `${String(Number(hour)).padStart(2, '0')}:${String(Number(minute ?? 0)).padStart(2, '0')}`;

const extractTimeRanges = (line) => {
  const ranges = [];
  TIME_RANGE_PATTERN.lastIndex = 0;
  let match = TIME_RANGE_PATTERN.exec(line);
  while (match) {
    ranges.push(`${formatTime(match[1], match[2])} - ${formatTime(match[3], match[4])}`);
    match = TIME_RANGE_PATTERN.exec(line);
  }
  return ranges;
};

const pickMostFrequent = (items) => {
  const counts = new Map();
  let best = '';
  items.forEach((item) => {
    const count = (counts.get(item) || 0) + 1;
    counts.set(item, count);
    if (!best || count > counts.get(best)) {
      best = item;
    }
  });
  return best;
};

const ALL_DAYS_KEYS = DAY_OPTIONS.map(({ key }) => key);
const ALL_DAYS_TOKEN = /^(?:매일|연중\s*무휴|연중무휴)$/;
const ALL_DAYS_INLINE = /^(?:매일|연중\s*무휴|연중무휴)[\s:]+(.+)$/;

const parseBusinessHoursText = (rawText) => {
  const parsed = { ...EMPTY_HOURS };
  const breakCandidates = [];
  let currentDayKey = null;

  // currentDayKey가 'all'이면 아직 비어 있는 모든 요일에 값을 채운다.
  const setHours = (value) => {
    if (currentDayKey === 'all') {
      ALL_DAYS_KEYS.forEach((key) => {
        if (!parsed[key]) parsed[key] = value;
      });
    } else if (currentDayKey && !parsed[currentDayKey]) {
      parsed[currentDayKey] = value;
    }
  };

  const hasHours = () =>
    currentDayKey === 'all'
      ? ALL_DAYS_KEYS.every((key) => parsed[key])
      : !!parsed[currentDayKey];

  rawText
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[•*-]\s*/, ''))
    .filter(Boolean)
    .forEach((line) => {
      const dayOnlyMatch = line.match(/^(월|화|수|목|금|토|일)(?:요일)?$/);
      const dayInlineMatch = line.match(/^(월|화|수|목|금|토|일)(?:요일)?[\s:]+(.+)$/);
      const allDayInlineMatch = line.match(ALL_DAYS_INLINE);
      let contentLine = line;

      if (dayOnlyMatch) {
        currentDayKey = DAY_LABEL_TO_KEY[dayOnlyMatch[1]];
        return;
      }

      if (ALL_DAYS_TOKEN.test(line)) {
        currentDayKey = 'all';
        return;
      }

      if (dayInlineMatch) {
        currentDayKey = DAY_LABEL_TO_KEY[dayInlineMatch[1]];
        contentLine = dayInlineMatch[2].trim();
      } else if (allDayInlineMatch) {
        currentDayKey = 'all';
        contentLine = allDayInlineMatch[1].trim();
      }

      if (!currentDayKey) return;

      if (/휴무/.test(contentLine) && !hasHours()) {
        setHours(contentLine);
        return;
      }

      const ranges = extractTimeRanges(contentLine);
      if (ranges.length === 0) return;

      if (/브레이크|break/i.test(contentLine)) {
        breakCandidates.push(ranges[0]);
        return;
      }

      setHours(ranges.join(' / '));
    });

  parsed.breakTime = pickMostFrequent(breakCandidates);
  return parsed;
};

const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStars, setFilterStars] = useState(['top5', 'best', 'good', 'none']);
  const [filterKatsuPick, setFilterKatsuPick] = useState(false);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' = 등록순, 'desc' = 역순
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM_DATA);
  const [hoursData, setHoursData] = useState(EMPTY_HOURS);
  const [hoursPasteText, setHoursPasteText] = useState('');
  const [menusData, setMenusData] = useState(EMPTY_MENUS);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
  const [autoSaveError, setAutoSaveError] = useState('');
  const formDataRef = useRef(formData);
  const hoursDataRef = useRef(hoursData);
  const menusDataRef = useRef(menusData);
  const autoSaveRestaurantIdRef = useRef(null);
  const autoSaveQueueRef = useRef(Promise.resolve());
  const lastSavedSnapshotRef = useRef('');
  const [contributors, setContributors] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [contributorSearching, setContributorSearching] = useState(false);
  const [uploading, setUploading] = useState({});
  const [draggingOver, setDraggingOver] = useState(null);
  const [geoSearching, setGeoSearching] = useState(false);
  const [geoResults, setGeoResults] = useState([]);
  const [showGeoResults, setShowGeoResults] = useState(false);
  const [bulkParseText, setBulkParseText] = useState('');
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkParseMessage, setBulkParseMessage] = useState('');
  const [bulkParsePartialSuccess, setBulkParsePartialSuccess] = useState(false);
  const bulkParseInFlightRef = useRef(false);
  const mapPreviewRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);
  const detailMapRef = useRef(null);
  const detailMapInstanceRef = useRef(null);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    hoursDataRef.current = hoursData;
  }, [hoursData]);

  useEffect(() => {
    menusDataRef.current = menusData;
  }, [menusData]);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  // 검색이나 필터, 정렬 변경 시 표시 개수 리셋
  useEffect(() => {
    setDisplayCount(20);
  }, [searchTerm, filterStars, filterKatsuPick, sortOrder]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/admin/restaurants');
      setRestaurants(response.data.data);
      setTotalCount(response.data.data.length);
    } catch (err) {
      console.error(err);
      alert('맛집 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const resetFormData = () => {
    formDataRef.current = EMPTY_FORM_DATA;
    hoursDataRef.current = EMPTY_HOURS;
    menusDataRef.current = EMPTY_MENUS;
    setFormData(EMPTY_FORM_DATA);
    setHoursData(EMPTY_HOURS);
    setHoursPasteText('');
    setMenusData(EMPTY_MENUS);
    setContributors([]);
    setUserSearchQuery('');
    setUserSearchResults([]);
    setBulkParseText('');
    setBulkParseMessage('');
    setBulkParsePartialSuccess(false);
  };

  const handleAddClick = () => {
    setEditingRestaurant(null);
    resetFormData();
    autoSaveRestaurantIdRef.current = null;
    lastSavedSnapshotRef.current = JSON.stringify({
      formData: EMPTY_FORM_DATA,
      hoursData: EMPTY_HOURS,
      menusData: EMPTY_MENUS,
    });
    setAutoSaveStatus('idle');
    setAutoSaveError('');
    setShowAddModal(true);
  };

  const loadContributors = async (restaurantId) => {
    try {
      const res = await apiClient.get(`/api/v1/admin/restaurants/${restaurantId}/contributors`);
      setContributors(res.data?.data || []);
    } catch {
      setContributors([]);
    }
  };

  const handleUserSearch = async () => {
    if (!userSearchQuery.trim()) return;
    setContributorSearching(true);
    setUserSearchResults([]);
    try {
      const res = await apiClient.get(`/api/v1/admin/users/search?query=${encodeURIComponent(userSearchQuery.trim())}`);
      const results = res.data?.data || [];
      setUserSearchResults(results);
      if (results.length === 0) alert('검색 결과가 없습니다.');
    } catch (err) {
      alert(`검색 실패: ${err.response?.data?.message || err.message}`);
    } finally {
      setContributorSearching(false);
    }
  };

  const handleAddContributor = async (user) => {
    const userId = typeof user === 'object' ? user.id : user;
    const userInfo = typeof user === 'object' ? user : userSearchResults.find((u) => u.id === userId);
    if (contributors.length >= 3) {
      alert('기여자는 최대 3명까지 등록 가능합니다.');
      return;
    }
    if (contributors.some((c) => c.userId === userId)) return;

    if (!editingRestaurant) {
      setContributors((prev) => [...prev, { userId, user: userInfo || { id: userId, nickname: '닉네임 없음' } }]);
      setUserSearchResults([]);
      setUserSearchQuery('');
      return;
    }

    try {
      await apiClient.post(`/api/v1/admin/restaurants/${editingRestaurant.id}/contributors`, { userId });
      await loadContributors(editingRestaurant.id);
      setUserSearchResults([]);
      setUserSearchQuery('');
    } catch (err) {
      alert(err.response?.data?.message || '기여자 추가에 실패했습니다.');
    }
  };

  const handleRemoveContributor = async (userId) => {
    if (!editingRestaurant) {
      setContributors((prev) => prev.filter((c) => c.userId !== userId));
      return;
    }

    try {
      await apiClient.delete(`/api/v1/admin/restaurants/${editingRestaurant.id}/contributors/${userId}`);
      await loadContributors(editingRestaurant.id);
    } catch {
      alert('기여자 제거에 실패했습니다.');
    }
  };

  const handleEditClick = async (restaurant) => {
    setEditingRestaurant(restaurant);
    const nextFormData = {
      name: restaurant.name || '',
      area: restaurant.area || '',
      category: restaurant.category || '일식',
      addr: restaurant.addr || '',
      lat: restaurant.lat || '',
      lng: restaurant.lng || '',
      description: restaurant.description || '',
      imageUrl: restaurant.imageUrl || '',
      image_url_1: restaurant.image_url_1 || '',
      image_url_2: restaurant.image_url_2 || '',
      image_url_3: restaurant.image_url_3 || '',
      placeUrl: restaurant.placeUrl || '',
      isTop5: restaurant.isTop5 || false,
      isBest: restaurant.isBest || false,
      isGood: restaurant.isGood || false,
      isKatsuHunterPick: restaurant.isKatsuHunterPick || false,
      katsuHunterDescription: restaurant.katsuHunterDescription || '',
      ownerComment: restaurant.ownerComment || '',
    };
    formDataRef.current = nextFormData;
    setFormData(nextFormData);
    autoSaveRestaurantIdRef.current = restaurant.id;
    setAutoSaveStatus('idle');
    setAutoSaveError('');
    setContributors([]);
    setUserSearchQuery('');
    setUserSearchResults([]);
    setHoursPasteText('');
    setSelectedRestaurant(null);
    setShowEditModal(true);
    // hours/menus/contributors 별도 로드
    const [detailRes] = await Promise.all([
      apiClient.get(`/api/v1/admin/restaurants/${restaurant.id}`).catch(() => null),
      loadContributors(restaurant.id),
    ]);
    const detail = detailRes?.data?.data;
    const h = detail?.hours;
    const nextHoursData = h ? {
      mon: h.mon || '', tue: h.tue || '', wed: h.wed || '',
      thu: h.thu || '', fri: h.fri || '', sat: h.sat || '',
      sun: h.sun || '', breakTime: h.breakTime || '',
    } : { ...EMPTY_HOURS };
    const ms = detail?.menus || [];
    const nextMenusData = {
      priceRate: ms[0]?.priceRate || '',
      names: ms.map(m => m.name).join('\n'),
    };
    hoursDataRef.current = nextHoursData;
    menusDataRef.current = nextMenusData;
    setHoursData(nextHoursData);
    setMenusData(nextMenusData);
    lastSavedSnapshotRef.current = JSON.stringify({
      formData: nextFormData,
      hoursData: nextHoursData,
      menusData: nextMenusData,
    });
  };

  // 목록 클릭 시 상세 모달 즉시 열고, 영업시간/메뉴/기여자는 상세 API로 보강
  const handleViewClick = async (restaurant) => {
    setSelectedRestaurant(restaurant);
    const [detailRes, contribRes] = await Promise.all([
      apiClient.get(`/api/v1/admin/restaurants/${restaurant.id}`).catch(() => null),
      apiClient.get(`/api/v1/admin/restaurants/${restaurant.id}/contributors`).catch(() => null),
    ]);
    const detail = detailRes?.data?.data;
    const contributorList = contribRes?.data?.data || [];
    setSelectedRestaurant((prev) => {
      if (!prev || prev.id !== restaurant.id) return prev;
      return {
        ...prev,
        hours: detail?.hours || null,
        menus: detail?.menus || [],
        contributors: contributorList,
      };
    });
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageFile = async (file, fieldName) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }
    setUploading((prev) => ({ ...prev, [fieldName]: true }));
    try {
      const url = await uploadImageToGCS(file);
      setFormData((prev) => {
        const updated = { ...prev, [fieldName]: url };
        if (fieldName === 'image_url_1' && !prev.imageUrl) {
          updated.imageUrl = url;
        }
        return updated;
      });
    } catch (err) {
      console.error(err);
      alert(`이미지 업로드 실패: ${err.message}`);
    } finally {
      setUploading((prev) => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleImageUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;
    await handleImageFile(file, fieldName);
    e.target.value = '';
  };

  const handlePaste = async (e, fieldName) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await handleImageFile(file, fieldName);
        return;
      }
    }
  };

  const handleDrop = async (e, fieldName) => {
    e.preventDefault();
    setDraggingOver(null);
    const file = e.dataTransfer.files[0];
    if (file) await handleImageFile(file, fieldName);
  };

  const buildHoursMenusPayload = (hours = hoursDataRef.current, menus = menusDataRef.current) => {
    const menuNames = menus.names.split('\n').map(s => s.trim()).filter(Boolean);
    return {
      hours: {
        mon: hours.mon.trim() || null,
        tue: hours.tue.trim() || null,
        wed: hours.wed.trim() || null,
        thu: hours.thu.trim() || null,
        fri: hours.fri.trim() || null,
        sat: hours.sat.trim() || null,
        sun: hours.sun.trim() || null,
        breakTime: hours.breakTime.trim() || null,
      },
      menus: menuNames.map((name, i) => ({
        name,
        priceRate: menus.priceRate || null,
        displayOrder: i,
      })),
    };
  };

  const createRestaurantPayload = (form = formDataRef.current, hours = hoursDataRef.current, menus = menusDataRef.current) => ({
    ...form,
    lat: parseFloat(form.lat) || 0,
    lng: parseFloat(form.lng) || 0,
    ...buildHoursMenusPayload(hours, menus),
  });

  const getCurrentFormSnapshot = () => ({
    formData: formDataRef.current,
    hoursData: hoursDataRef.current,
    menusData: menusDataRef.current,
  });

  const queueAutoSave = () => {
    const snapshot = getCurrentFormSnapshot();
    const serializedSnapshot = JSON.stringify(snapshot);
    if (serializedSnapshot === lastSavedSnapshotRef.current) {
      return autoSaveQueueRef.current;
    }

    setAutoSaveStatus('saving');
    setAutoSaveError('');

    const saveTask = autoSaveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        setAutoSaveStatus('saving');
        const payload = createRestaurantPayload(
          snapshot.formData,
          snapshot.hoursData,
          snapshot.menusData,
        );
        const restaurantId = autoSaveRestaurantIdRef.current;

        if (restaurantId) {
          await apiClient.put(`/api/v1/admin/restaurants/${restaurantId}`, payload);
        } else {
          const res = await apiClient.post('/api/v1/admin/restaurants', payload);
          const createdRestaurant = res.data?.data;
          if (!createdRestaurant?.id) {
            throw new Error('자동 저장된 식당 ID를 확인할 수 없습니다.');
          }
          autoSaveRestaurantIdRef.current = createdRestaurant.id;
        }

        lastSavedSnapshotRef.current = serializedSnapshot;
        setAutoSaveStatus('saved');
      })
      .catch((err) => {
        console.error('식당 자동 저장 실패:', err);
        setAutoSaveStatus('error');
        setAutoSaveError(err.response?.data?.message || err.message || '자동 저장에 실패했습니다.');
        throw err;
      });

    autoSaveQueueRef.current = saveTask;
    return saveTask;
  };

  const handleAutoSaveBlur = (e) => {
    if (!e.target.matches('input[name], select[name], textarea[name], [data-autosave="true"]')) {
      return;
    }
    queueAutoSave().catch(() => undefined);
  };

  const applyParsedHoursText = (text, { silent = false } = {}) => {
    const parsed = parseBusinessHoursText(text);
    const hasParsedData = Object.values(parsed).some((v) => v.trim());

    if (!hasParsedData) {
      if (!silent) alert('파싱할 영업시간을 찾지 못했습니다.');
      return false;
    }

    setHoursData(parsed);
    return true;
  };

  const handleHoursPaste = (e) => {
    const textarea = e.currentTarget;
    window.setTimeout(() => applyParsedHoursText(textarea.value, { silent: true }), 0);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await queueAutoSave();
      const payload = createRestaurantPayload();
      let createdRestaurantId = autoSaveRestaurantIdRef.current;

      if (createdRestaurantId) {
        await apiClient.put(`/api/v1/admin/restaurants/${createdRestaurantId}`, payload);
      } else {
        const res = await apiClient.post('/api/v1/admin/restaurants', payload);
        createdRestaurantId = res.data?.data?.id;
        autoSaveRestaurantIdRef.current = createdRestaurantId;
      }

      let contributorSaveError = null;
      if (contributors.length > 0) {
        if (!createdRestaurantId) {
          contributorSaveError = new Error('생성된 식당 ID를 확인할 수 없습니다.');
        } else {
          try {
            await Promise.all(
              contributors.map((c) => apiClient.post(`/api/v1/admin/restaurants/${createdRestaurantId}/contributors`, { userId: c.userId }))
            );
          } catch (contributorErr) {
            contributorSaveError = contributorErr;
          }
        }
      }

      if (contributorSaveError) {
        console.error(contributorSaveError);
        alert(`식당은 등록되었지만 제보자 등록에 실패했습니다.\n${contributorSaveError.response?.data?.message || contributorSaveError.message}`);
      } else {
        alert('식당이 등록되었습니다.');
      }
      setShowAddModal(false);
      autoSaveRestaurantIdRef.current = null;
      resetFormData();
      fetchRestaurants();
    } catch (err) {
      console.error(err);
      alert('식당 등록에 실패했습니다.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await queueAutoSave();
      const payload = createRestaurantPayload();
      await apiClient.put(`/api/v1/admin/restaurants/${editingRestaurant.id}`, payload);
      alert('식당 정보가 수정되었습니다.');
      setShowEditModal(false);
      setEditingRestaurant(null);
      autoSaveRestaurantIdRef.current = null;
      resetFormData();
      fetchRestaurants();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.message || '알 수 없는 오류';
      alert(`식당 수정에 실패했습니다.\n${errorMsg}`);
    }
  };

  const closeRestaurantForm = async () => {
    if (bulkParseInFlightRef.current) {
      alert('몽땅 파싱이 끝난 뒤 창을 닫아주세요.');
      return;
    }

    try {
      await queueAutoSave();
    } catch {
      alert('자동 저장에 실패해 창을 닫지 않았습니다. 저장 상태를 확인한 뒤 다시 시도해주세요.');
      return;
    }

    const hadAutoSavedRestaurant = Boolean(autoSaveRestaurantIdRef.current);
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingRestaurant(null);
    autoSaveRestaurantIdRef.current = null;
    resetFormData();

    if (hadAutoSavedRestaurant) {
      fetchRestaurants();
    }
  };

  const handleDelete = async (restaurant) => {
    if (!window.confirm(`"${restaurant.name}" 식당을 삭제하시겠습니까?`)) {
      return;
    }
    try {
      await apiClient.delete(`/api/v1/admin/restaurants/${restaurant.id}`);
      alert('식당이 삭제되었습니다.');
      setSelectedRestaurant(null);
      fetchRestaurants();
    } catch (err) {
      console.error(err);
      alert('식당 삭제에 실패했습니다.');
    }
  };

  // 모달 닫힐 때 지도 인스턴스 초기화 (DOM이 제거되므로)
  useEffect(() => {
    if (!showAddModal && !showEditModal) {
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    }
  }, [showAddModal, showEditModal]);

  // lat/lng 변경 시 지도 미리보기 업데이트 + 카카오맵 URL 자동 생성
  useEffect(() => {
    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);
    if (!lat || !lng) return;

    // placeUrl 비어있을 때만 좌표 기반 URL 생성 (기존 URL 덮어쓰지 않음)
    setFormData(prev => {
      if (prev.placeUrl) return prev;
      const name = encodeURIComponent(prev.name || '위치');
      return { ...prev, placeUrl: `https://map.kakao.com/link/map/${name},${lat},${lng}` };
    });

    if (!mapPreviewRef.current) return;

    const initOrUpdateMap = () => {
      const center = new window.kakao.maps.LatLng(lat, lng);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(center);
        markerInstanceRef.current.setPosition(center);
      } else {
        const map = new window.kakao.maps.Map(mapPreviewRef.current, { center, level: 4 });
        const marker = new window.kakao.maps.Marker({ position: center, map });
        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;
      }
    };

    if (window.kakao?.maps?.services) {
      initOrUpdateMap();
    } else {
      window.kakao?.maps?.load(initOrUpdateMap);
    }
  }, [formData.lat, formData.lng]);

  // 상세 모달 지도 미리보기
  useEffect(() => {
    detailMapInstanceRef.current = null;
    if (!selectedRestaurant) return;
    const lat = parseFloat(selectedRestaurant.lat);
    const lng = parseFloat(selectedRestaurant.lng);
    if (!lat || !lng) return;

    const renderMap = () => {
      if (!detailMapRef.current) return;
      const center = new window.kakao.maps.LatLng(lat, lng);
      const map = new window.kakao.maps.Map(detailMapRef.current, { center, level: 4 });
      new window.kakao.maps.Marker({ position: center, map });
      detailMapInstanceRef.current = map;
    };

    if (window.kakao?.maps?.services) {
      renderMap();
    } else {
      window.kakao?.maps?.load(renderMap);
    }
  }, [selectedRestaurant?.id, selectedRestaurant?.lat, selectedRestaurant?.lng]);

  const ensureKakaoLoaded = () => new Promise((resolve, reject) => {
    if (!window.kakao) { reject(new Error('카카오맵 SDK 로드 실패')); return; }
    if (window.kakao?.maps?.services) { resolve(); return; }
    window.kakao.maps.load(resolve);
  });

  const searchKakaoPlaces = async (keyword) => {
    await ensureKakaoLoaded();
    const ps = new window.kakao.maps.services.Places();
    const placeResults = await new Promise((resolve) => {
      ps.keywordSearch(keyword, (results, status) =>
        resolve(status === window.kakao.maps.services.Status.OK ? results : [])
      );
    });

    return placeResults.slice(0, 5).map(r => ({
      name: r.place_name,
      addr: r.road_address_name || r.address_name,
      lat: r.y,
      lng: r.x,
      placeUrl: r.place_url,
    }));
  };

  const handleGeoAutoFill = async () => {
    const keyword = [formData.name, formData.area].filter(Boolean).join(' ');
    if (!keyword.trim()) { alert('이름 또는 지역을 먼저 입력해주세요.'); return; }
    setGeoSearching(true);
    setShowGeoResults(false);
    try {
      const results = await searchKakaoPlaces(keyword);
      if (results.length > 0) {
        setGeoResults(results);
        setShowGeoResults(true);
      } else {
        alert('검색 결과가 없습니다. 이름/지역을 확인해주세요.');
      }
    } catch (e) {
      alert('좌표 검색 중 오류가 발생했습니다: ' + e.message);
    } finally {
      setGeoSearching(false);
    }
  };

  const applyGeoResult = (result) => {
    setFormData(prev => ({
      ...prev,
      lat: result.lat,
      lng: result.lng,
      addr: prev.addr || result.addr,
      ...(result.placeUrl ? { placeUrl: result.placeUrl } : {}),
    }));
    setShowGeoResults(false);
    setGeoResults([]);
  };

  const handleBulkParse = async () => {
    const rawText = bulkParseText.trim();
    if (!rawText) {
      alert('네이버 지도에서 전체 복사한 텍스트를 붙여넣어 주세요.');
      return;
    }
    if (bulkParseInFlightRef.current) return;

    bulkParseInFlightRef.current = true;
    setBulkParsing(true);
    setBulkParseMessage('AI가 식당 정보와 리뷰를 한 번에 정리하고 있습니다...');
    setBulkParsePartialSuccess(false);

    try {
      // 사용자가 버튼을 누른 경우에만 이 API를 한 번 호출한다.
      const response = await apiClient.post('/api/v1/admin/restaurants/parse-naver', {
        rawText,
      });
      const parsed = response.data?.data;
      if (!parsed) throw new Error('파싱 결과가 비어 있습니다.');

      let geoMatch = null;
      let geoErrorMessage = '';
      const keyword = [parsed.name, parsed.area].filter(Boolean).join(' ');
      if (keyword) {
        try {
          const places = await searchKakaoPlaces(keyword);
          geoMatch = places[0] || null;
          if (!geoMatch) {
            geoErrorMessage = '좌표 자동 채우기 실패: 카카오맵 검색 결과가 없습니다.';
          }
        } catch (geoError) {
          console.warn('몽땅 파싱 후 좌표 자동 채우기 실패:', geoError);
          geoErrorMessage = `좌표 자동 채우기 실패: ${geoError.message}`;
        }
      }

      const currentForm = formDataRef.current;
      const nextFormData = {
        ...currentForm,
        name: parsed.name || currentForm.name,
        area: parsed.area || currentForm.area,
        category: parsed.category || currentForm.category,
        addr: parsed.addr || geoMatch?.addr || currentForm.addr,
        lat: parsed.lat ?? geoMatch?.lat ?? currentForm.lat,
        lng: parsed.lng ?? geoMatch?.lng ?? currentForm.lng,
        placeUrl: parsed.placeUrl || geoMatch?.placeUrl || currentForm.placeUrl,
        description: parsed.description || currentForm.description,
      };
      const deterministicHours = parseBusinessHoursText(rawText);
      const currentHours = hoursDataRef.current;
      const hasParsedHours = Object.values(deterministicHours).some(Boolean);
      const nextHoursData = hasParsedHours ? deterministicHours : currentHours;
      const currentMenus = menusDataRef.current;
      const nextMenusData = {
        priceRate: parsed.priceRate || currentMenus.priceRate,
        names: parsed.menus?.length ? parsed.menus.slice(0, 5).join('\n') : currentMenus.names,
      };

      formDataRef.current = nextFormData;
      hoursDataRef.current = nextHoursData;
      menusDataRef.current = nextMenusData;
      setFormData(nextFormData);
      setHoursData(nextHoursData);
      setMenusData(nextMenusData);
      setGeoResults([]);
      setShowGeoResults(false);
      setBulkParseMessage(geoErrorMessage);
      setBulkParsePartialSuccess(Boolean(geoErrorMessage));
    } catch (err) {
      console.error('몽땅 파싱 실패:', err);
      const message = err.response?.data?.message || err.message || '파싱에 실패했습니다.';
      setBulkParseMessage(`파싱 실패: ${message}`);
      setBulkParsePartialSuccess(false);
      alert(`몽땅 파싱에 실패했습니다.\n${message}`);
    } finally {
      bulkParseInFlightRef.current = false;
      setBulkParsing(false);
    }
  };

  const getRecommendLevel = (restaurant) => {
    if (restaurant.isTop5) return 'top5';
    if (restaurant.isBest) return 'best';
    if (restaurant.isGood) return 'good';
    return 'none';
  };

  const getRecommendLabel = (restaurant) => {
    if (restaurant.isTop5) return '★★★★';
    if (restaurant.isBest) return '★★★';
    if (restaurant.isGood) return '★★';
    return '★';
  };



  const getRecommendClass = (restaurant) => {
    if (restaurant.isTop5) return 'top5';
    if (restaurant.isBest) return 'best';
    if (restaurant.isGood) return 'good';
    return '';
  };

  const filteredRestaurants = restaurants
    .filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           r.area.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStars = filterStars.length === 0 || filterStars.includes(getRecommendLevel(r));
      const matchesKatsuPick = !filterKatsuPick || r.isKatsuHunterPick;
      return matchesSearch && matchesStars && matchesKatsuPick;
    })
    .sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.id - a.id; // 역순 (최신순)
      }
      return a.id - b.id; // 등록순
    });

  // 무한 스크롤용 표시 데이터
  const totalFilteredCount = filteredRestaurants.length;
  const displayedRestaurants = filteredRestaurants.slice(0, displayCount);
  const hasMore = displayCount < totalFilteredCount;

  // 무한 스크롤 로직
  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayCount((prev) => prev + 20);
    }
  }, [hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadMore]);

  if (loading) {
    return (
      <div className="restaurants-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>맛집 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="restaurants-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">맛집 관리</h1>
          <p className="page-subtitle">전체 {totalCount}개의 맛집</p>
        </div>
        <button className="add-btn" onClick={handleAddClick}>
          + 새 식당 등록
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="식당명 또는 지역으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="star-filter-group">
          {[
            { key: 'top5', label: '★★★★' },
            { key: 'best', label: '★★★' },
            { key: 'good', label: '★★' },
            { key: 'none', label: '★' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`star-filter-btn ${filterStars.includes(key) ? 'active' : ''}`}
              onClick={() => setFilterStars((prev) =>
                prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          className={`pick-filter-btn ${filterKatsuPick ? 'active' : ''}`}
          onClick={() => setFilterKatsuPick((v) => !v)}
        >
          🏆 카츠헌터 PICK
        </button>

        <button
          className={`sort-btn ${sortOrder === 'desc' ? 'active' : ''}`}
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc' ? '등록순 ↑' : '최신순 ↓'}
        </button>
      </div>

      {/* Restaurant Table */}
      <div className="table-container">
        <table className="restaurants-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>이미지</th>
              <th>이름</th>
              <th>지역</th>
              <th>카테고리</th>
              <th>추천등급</th>
              <th>카츠헌터</th>
              <th>주소</th>
            </tr>
          </thead>
          <tbody>
            {displayedRestaurants.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-cell">
                  검색 결과가 없습니다
                </td>
              </tr>
            ) : (
              displayedRestaurants.map((restaurant) => (
                <tr
                  key={restaurant.id}
                  onClick={() => handleViewClick(restaurant)}
                  className="restaurant-row"
                >
                  <td>{restaurant.id}</td>
                  <td>
                    {restaurant.imageUrl && (
                      <img
                        src={restaurant.imageUrl}
                        alt={restaurant.name}
                        className="restaurant-thumb"
                      />
                    )}
                  </td>
                  <td className="restaurant-name">{restaurant.name}</td>
                  <td>{restaurant.area}</td>
                  <td>{restaurant.category}</td>
                  <td>
                    <span className={`recommend-badge ${getRecommendClass(restaurant)}`}>
                      {getRecommendLabel(restaurant)}
                    </span>
                  </td>
                  <td>
                    <span className={`pick-badge ${restaurant.isKatsuHunterPick ? 'active' : ''}`}>
                      {restaurant.isKatsuHunterPick ? 'PICK' : '-'}
                    </span>
                  </td>
                  <td className="address-cell">{restaurant.addr}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 무한 스크롤 로딩 */}
      <div ref={loadMoreRef} className="load-more-trigger">
        {hasMore && (
          <div className="load-more-indicator">
            <div className="loading-spinner small"></div>
            <span>더 불러오는 중... ({displayCount} / {totalFilteredCount})</span>
          </div>
        )}
        {!hasMore && totalFilteredCount > 0 && (
          <div className="load-more-end">
            총 {totalFilteredCount}개의 맛집을 모두 불러왔습니다
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRestaurant && (
        <div className="modal-overlay" onClick={() => setSelectedRestaurant(null)}>
          <div className="modal-content restaurant-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedRestaurant.name}</h2>
              <button onClick={() => setSelectedRestaurant(null)} className="modal-close">
                ×
              </button>
            </div>

            <div className="restaurant-detail-content">
              {/* 메인 이미지 */}
              {selectedRestaurant.imageUrl && (
                <img
                  src={selectedRestaurant.imageUrl}
                  alt={selectedRestaurant.name}
                  className="restaurant-image"
                />
              )}

              {/* 추가 이미지들 */}
              <div className="additional-images">
                {selectedRestaurant.image_url_1 && (
                  <img src={selectedRestaurant.image_url_1} alt="추가 이미지 1" />
                )}
                {selectedRestaurant.image_url_2 && (
                  <img src={selectedRestaurant.image_url_2} alt="추가 이미지 2" />
                )}
                {selectedRestaurant.image_url_3 && (
                  <img src={selectedRestaurant.image_url_3} alt="추가 이미지 3" />
                )}
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">ID</span>
                  <span className="detail-value">{selectedRestaurant.id}</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">지역</span>
                  <span className="detail-value">{selectedRestaurant.area}</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">카테고리</span>
                  <span className="detail-value">{selectedRestaurant.category}</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">추천등급</span>
                  <span className={`recommend-badge ${getRecommendClass(selectedRestaurant)}`}>
                    {getRecommendLabel(selectedRestaurant)}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">카츠헌터 PICK</span>
                  <span className={`pick-badge ${selectedRestaurant.isKatsuHunterPick ? 'active' : ''}`}>
                    {selectedRestaurant.isKatsuHunterPick ? '✓ PICK' : '-'}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">가격대</span>
                  <span className="detail-value">{selectedRestaurant.priceDisplay || selectedRestaurant.menus?.[0]?.priceRate || '-'}</span>
                </div>

                <div className="detail-item full-width">
                  <span className="detail-label">주소</span>
                  <span className="detail-value">{selectedRestaurant.addr}</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">위도</span>
                  <span className="detail-value">{selectedRestaurant.lat}</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">경도</span>
                  <span className="detail-value">{selectedRestaurant.lng}</span>
                </div>

                {(() => {
                  const hoursLines = selectedRestaurant.hours
                    ? [
                        ...DAY_OPTIONS
                          .filter(({ key }) => selectedRestaurant.hours[key])
                          .map(({ key, label }) => `${label} ${selectedRestaurant.hours[key]}`),
                        ...(selectedRestaurant.hours.breakTime ? [`브레이크 ${selectedRestaurant.hours.breakTime}`] : []),
                      ]
                    : [];
                  const menuLines = (selectedRestaurant.menus || []).map((m) => m.name);
                  if (!hoursLines.length && !menuLines.length) return null;
                  return (
                    <div className="detail-item full-width detail-hours-menus">
                      {hoursLines.length > 0 && (
                        <div className="detail-inline-block">
                          <span className="detail-label">영업시간</span>
                          <span className="detail-value">
                            {hoursLines.map((line, i) => (
                              <div key={i}>{line}</div>
                            ))}
                          </span>
                        </div>
                      )}
                      {hoursLines.length > 0 && menuLines.length > 0 && <span className="detail-inline-divider">|</span>}
                      {menuLines.length > 0 && (
                        <div className="detail-inline-block">
                          <span className="detail-label">대표 메뉴</span>
                          <span className="detail-value">
                            {menuLines.map((line, i) => (
                              <div key={i}>{line}</div>
                            ))}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {selectedRestaurant.isKatsuHunterPick && (
                  <div className="detail-item full-width katsu-hunter-section">
                    <div className="katsu-hunter-badge">
                      <span className="katsu-hunter-icon">🏆</span>
                      <span className="katsu-hunter-title">카츠헌터 PICK</span>
                    </div>
                    {selectedRestaurant.katsuHunterDescription && (
                      <p className="katsu-hunter-description">{selectedRestaurant.katsuHunterDescription}</p>
                    )}
                  </div>
                )}

                <div className="detail-item full-width">
                  <span className="detail-label">사장님 한마디</span>
                  <span className="detail-value description">{selectedRestaurant.ownerComment || '-'}</span>
                </div>

                <div className="detail-item full-width">
                  <span className="detail-label">제보 기여자</span>
                  {selectedRestaurant.contributors?.length > 0 ? (
                    <div className="contributor-list">
                      {selectedRestaurant.contributors.map((c) => (
                        <div key={c.userId} className="contributor-chip">
                          <span>#{c.user?.id} {c.user?.nickname ?? '닉네임 없음'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="detail-value">-</span>
                  )}
                </div>

                {selectedRestaurant.description && (
                  <div className="detail-item full-width">
                    <span className="detail-label">AI 리뷰 요약</span>
                    <span className="detail-value description">{selectedRestaurant.description}</span>
                  </div>
                )}

                {selectedRestaurant.placeUrl && (
                  <div className="detail-item full-width">
                    <span className="detail-label">카카오맵</span>
                    <a
                      href={selectedRestaurant.placeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="detail-link"
                    >
                      {selectedRestaurant.placeUrl}
                    </a>
                  </div>
                )}

                {parseFloat(selectedRestaurant.lat) && parseFloat(selectedRestaurant.lng) ? (
                  <div className="detail-item full-width">
                    <span className="detail-label">지도</span>
                    <div ref={detailMapRef} className="map-preview-container" />
                  </div>
                ) : null}
              </div>

              <div className="modal-actions">
                <button
                  className="edit-btn"
                  onClick={() => handleEditClick(selectedRestaurant)}
                >
                  수정
                </button>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(selectedRestaurant)}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="modal-overlay" onClick={closeRestaurantForm}>
          <div className="modal-content restaurant-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{showAddModal ? '새 식당 등록' : '식당 정보 수정'}</h2>
                <div className={`autosave-status ${autoSaveStatus}`}>
                  {autoSaveStatus === 'saving' && '자동 저장 중...'}
                  {autoSaveStatus === 'saved' && '✓ 자동 저장됨'}
                  {autoSaveStatus === 'error' && `자동 저장 실패: ${autoSaveError}`}
                  {autoSaveStatus === 'idle' && '입력칸을 벗어나면 자동 저장됩니다'}
                </div>
              </div>
              <button
                onClick={closeRestaurantForm}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit}
              onBlurCapture={handleAutoSaveBlur}
              className="restaurant-form"
            >
              <div className="form-grid">
                <div className="form-group full-width bulk-parser">
                  <label className="bulk-parser-title">몽땅 파싱해버리기!!!!</label>
                  <span className="bulk-parser-helper">버튼을 누를 때만 AI를 딱 한 번 호출합니다.</span>
                  <textarea
                    value={bulkParseText}
                    onChange={(e) => {
                      setBulkParseText(e.target.value);
                      setBulkParseMessage('');
                      setBulkParsePartialSuccess(false);
                    }}
                    rows="3"
                    placeholder="네이버 지도 식당 상세 페이지에서 전체 복사한 텍스트를 붙여넣으세요."
                    className="bulk-parser-textarea"
                  />
                  <div className="bulk-parser-actions">
                    {(bulkParseMessage || bulkParsePartialSuccess) && (
                      <span className="bulk-parser-status">
                        {bulkParseMessage && (
                          <span className={`bulk-parser-message ${bulkParseMessage.includes('실패') ? 'error' : ''}`}>
                            {bulkParseMessage}
                          </span>
                        )}
                        {bulkParsePartialSuccess && (
                          <span className="bulk-parser-message success">· 다른 항목은 채우기 완료</span>
                        )}
                      </span>
                    )}
                    <button
                      type="button"
                      className="bulk-parser-btn"
                      onClick={handleBulkParse}
                      disabled={bulkParsing || !bulkParseText.trim()}
                    >
                      {bulkParsing ? '파싱 중...' : '파싱해버리기'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>이름 *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>지역 *</label>
                  <input
                    type="text"
                    name="area"
                    value={formData.area}
                    onChange={handleFormChange}
                    required
                    placeholder="예: 강남, 홍대, 종로"
                  />
                </div>

                <div className="form-group">
                  <label>카테고리</label>
                  <select name="category" value={formData.category} onChange={handleFormChange}>
                    <option value="일식">일식</option>
                    <option value="경양식">경양식</option>
                  </select>
                </div>

                <div className="form-group geo-autofill-action">
                  <button
                    type="button"
                    className="geo-autofill-btn"
                    onClick={handleGeoAutoFill}
                    disabled={geoSearching}
                  >
                    {geoSearching ? '🔍 검색 중...' : '🔍 좌표 자동 채우기'}
                  </button>
                </div>

                <div className="form-group full-width">
                  <span className="geo-hint">이름·지역으로 검색 후 선택하면 주소 / 위도·경도 / 카카오맵 URL 자동 입력</span>
                  {showGeoResults && geoResults.length > 0 && (
                    <div className="geo-results">
                      {geoResults.map((r, i) => (
                        <button key={i} type="button" className="geo-result-item" onClick={() => applyGeoResult(r)}>
                          <span className="geo-result-name">{r.name}</span>
                          <span className="geo-result-address">{r.addr}</span>
                          <span className="geo-result-coords">{parseFloat(r.lat).toFixed(6)}, {parseFloat(r.lng).toFixed(6)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group full-width">
                  <label>주소 *</label>
                  <input
                    type="text"
                    name="addr"
                    value={formData.addr}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>위도</label>
                  <input
                    type="number"
                    name="lat"
                    value={formData.lat}
                    onChange={handleFormChange}
                    step="any"
                  />
                </div>

                <div className="form-group">
                  <label>경도</label>
                  <input
                    type="number"
                    name="lng"
                    value={formData.lng}
                    onChange={handleFormChange}
                    step="any"
                  />
                </div>

                <div className="form-group full-width">
                  <label>카카오맵 URL</label>
                  <input
                    type="url"
                    name="placeUrl"
                    value={formData.placeUrl}
                    onChange={handleFormChange}
                  />
                </div>

                {formData.lat && formData.lng && (
                  <div className="form-group full-width">
                    <label>위치 미리보기</label>
                    <div ref={mapPreviewRef} className="map-preview-container" />
                  </div>
                )}

                {/* ── 영업시간 ── */}
                <div className="form-group full-width">
                  <label>영업시간</label>
                  <div className="hours-paste-box">
                    <textarea
                      value={hoursPasteText}
                      onChange={(e) => setHoursPasteText(e.target.value)}
                      onPaste={handleHoursPaste}
                      rows="6"
                      placeholder={"영업시간\n일\n11:40 - 21:00\n15:00 - 17:40 브레이크타임\n월\n정기휴무 (매주 월요일)"}
                      className="hours-paste-textarea"
                    />
                    <div className="hours-paste-actions">
                      <button type="button" className="hours-parse-btn" onClick={() => applyParsedHoursText(hoursPasteText)}>
                        파싱
                      </button>
                    </div>
                  </div>
                  <div className="hours-grid">
                    {DAY_OPTIONS.map(({ key, label }) => (
                      <div key={key} className="hours-row">
                        <span className="hours-day-label">{label}</span>
                        <input
                          type="text"
                          value={hoursData[key]}
                          onChange={(e) => setHoursData(prev => ({ ...prev, [key]: e.target.value }))}
                          data-autosave="true"
                          placeholder="예: 11:30 ~ 20:30 또는 휴무일"
                          className="hours-input"
                        />
                      </div>
                    ))}
                    <div className="hours-row">
                      <span className="hours-day-label">브레이크</span>
                      <input
                        type="text"
                        value={hoursData.breakTime}
                        onChange={(e) => setHoursData(prev => ({ ...prev, breakTime: e.target.value }))}
                        data-autosave="true"
                        placeholder="예: 15:30 ~ 17:30"
                        className="hours-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>설명</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows="3"
                  />
                </div>

                <div className="form-group full-width">
                  <label>메인 이미지 {showEditModal && '(수정 불가)'}</label>
                  <div
                    className={`image-input-group ${draggingOver === 'imageUrl' ? 'drag-over' : ''}`}
                    onDragOver={(e) => { if (!showEditModal) { e.preventDefault(); setDraggingOver('imageUrl'); } }}
                    onDragLeave={() => setDraggingOver(null)}
                    onDrop={(e) => { if (!showEditModal) handleDrop(e, 'imageUrl'); }}
                  >
                    <input
                      type="url"
                      name="imageUrl"
                      value={formData.imageUrl}
                      onChange={handleFormChange}
                      onPaste={(e) => { if (!showEditModal) handlePaste(e, 'imageUrl'); }}
                      disabled={showEditModal}
                      className={showEditModal ? 'disabled-input' : ''}
                      placeholder="URL 직접 입력 또는 이미지 업로드"
                    />
                    {!showEditModal && (
                      <label className={`upload-btn ${uploading.imageUrl ? 'uploading' : ''}`}>
                        {uploading.imageUrl ? '업로드중...' : '업로드'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'imageUrl')}
                          disabled={uploading.imageUrl}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>
                  {formData.imageUrl && (
                    <img src={formData.imageUrl} alt="미리보기" className="image-preview" />
                  )}
                </div>

                <div className="form-group full-width">
                  <label>추가 이미지 1</label>
                  <div
                    className={`image-input-group ${draggingOver === 'image_url_1' ? 'drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDraggingOver('image_url_1'); }}
                    onDragLeave={() => setDraggingOver(null)}
                    onDrop={(e) => handleDrop(e, 'image_url_1')}
                  >
                    <input
                      type="url"
                      name="image_url_1"
                      value={formData.image_url_1}
                      onChange={handleFormChange}
                      onPaste={(e) => handlePaste(e, 'image_url_1')}
                      placeholder="URL 직접 입력 또는 이미지 업로드"
                    />
                    <label className={`upload-btn ${uploading.image_url_1 ? 'uploading' : ''}`}>
                      {uploading.image_url_1 ? '업로드중...' : '업로드'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'image_url_1')}
                        disabled={uploading.image_url_1}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                  {formData.image_url_1 && (
                    <img src={formData.image_url_1} alt="미리보기" className="image-preview" />
                  )}
                </div>

                <div className="form-group full-width">
                  <label>추가 이미지 2</label>
                  <div
                    className={`image-input-group ${draggingOver === 'image_url_2' ? 'drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDraggingOver('image_url_2'); }}
                    onDragLeave={() => setDraggingOver(null)}
                    onDrop={(e) => handleDrop(e, 'image_url_2')}
                  >
                    <input
                      type="url"
                      name="image_url_2"
                      value={formData.image_url_2}
                      onChange={handleFormChange}
                      onPaste={(e) => handlePaste(e, 'image_url_2')}
                      placeholder="URL 직접 입력 또는 이미지 업로드"
                    />
                    <label className={`upload-btn ${uploading.image_url_2 ? 'uploading' : ''}`}>
                      {uploading.image_url_2 ? '업로드중...' : '업로드'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'image_url_2')}
                        disabled={uploading.image_url_2}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                  {formData.image_url_2 && (
                    <img src={formData.image_url_2} alt="미리보기" className="image-preview" />
                  )}
                </div>

                <div className="form-group full-width">
                  <label>추가 이미지 3</label>
                  <div
                    className={`image-input-group ${draggingOver === 'image_url_3' ? 'drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDraggingOver('image_url_3'); }}
                    onDragLeave={() => setDraggingOver(null)}
                    onDrop={(e) => handleDrop(e, 'image_url_3')}
                  >
                    <input
                      type="url"
                      name="image_url_3"
                      value={formData.image_url_3}
                      onChange={handleFormChange}
                      onPaste={(e) => handlePaste(e, 'image_url_3')}
                      placeholder="URL 직접 입력 또는 이미지 업로드"
                    />
                    <label className={`upload-btn ${uploading.image_url_3 ? 'uploading' : ''}`}>
                      {uploading.image_url_3 ? '업로드중...' : '업로드'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'image_url_3')}
                        disabled={uploading.image_url_3}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                  {formData.image_url_3 && (
                    <img src={formData.image_url_3} alt="미리보기" className="image-preview" />
                  )}
                </div>

                <div className="form-group full-width checkbox-group">
                  <label>추천 등급 <span className="grade-hint">★ 체크 안하면 별 1개</span></label>
                  <div className="checkbox-options">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="isTop5"
                        checked={formData.isTop5}
                        onChange={handleFormChange}
                      />
                      ★★★★
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="isBest"
                        checked={formData.isBest}
                        onChange={handleFormChange}
                      />
                      ★★★
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="isGood"
                        checked={formData.isGood}
                        onChange={handleFormChange}
                      />
                      ★★
                    </label>
                  </div>
                </div>

                <div className="form-group full-width checkbox-group">
                  <label>카츠헌터 PICK</label>
                  <div className="checkbox-options">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="isKatsuHunterPick"
                        checked={formData.isKatsuHunterPick}
                        onChange={handleFormChange}
                      />
                      카츠헌터 PICK
                    </label>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>카츠헌터 설명</label>
                  <textarea
                    name="katsuHunterDescription"
                    value={formData.katsuHunterDescription}
                    onChange={handleFormChange}
                    rows="3"
                    placeholder="카츠헌터 PICK 설명을 입력하세요"
                  />
                </div>

                <div className="form-group full-width">
                  <label>사장님 한마디</label>
                  <textarea
                    name="ownerComment"
                    value={formData.ownerComment}
                    onChange={handleFormChange}
                    rows="3"
                    placeholder="가게 상세 모달에 표시할 사장님 한마디를 입력하세요"
                  />
                </div>

                {/* ── 대표 메뉴 ── */}
                <div className="form-group full-width">
                  <label>대표 메뉴</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: '#666', whiteSpace: 'nowrap' }}>가격대</span>
                    <select
                      value={menusData.priceRate}
                      onChange={(e) => setMenusData(prev => ({ ...prev, priceRate: e.target.value }))}
                      data-autosave="true"
                      style={{ width: 120 }}
                    >
                      <option value="">선택 안 함</option>
                      <option value="₩">₩</option>
                      <option value="₩₩">₩₩</option>
                      <option value="₩₩₩">₩₩₩</option>
                      <option value="₩₩₩₩">₩₩₩₩</option>
                    </select>
                  </div>
                  <textarea
                    value={menusData.names}
                    onChange={(e) => setMenusData(prev => ({ ...prev, names: e.target.value }))}
                    data-autosave="true"
                    rows="4"
                    placeholder={"메뉴명을 한 줄에 하나씩 입력하세요\n예:\n히레카츠 정식\n로스카츠 정식\n모리아와세카츠"}
                  />
                </div>

                {/* ── 제보 기여자 ── */}
                <div className="form-group full-width">
                  <label>제보 기여자 <span style={{ fontWeight: 'normal', color: '#888', fontSize: 12 }}>(최대 3명)</span></label>

                  {contributors.length > 0 && (
                    <div className="contributor-list">
                      {contributors.map((c) => (
                        <div key={c.userId} className="contributor-chip">
                          <span>#{c.user?.id} {c.user?.nickname ?? '닉네임 없음'}</span>
                          <button type="button" className="contributor-remove-btn" onClick={() => handleRemoveContributor(c.userId)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {contributors.length < 3 && (
                    <div className="contributor-search-row">
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUserSearch())}
                        placeholder="유저 ID, 닉네임 또는 둘 다 검색"
                        className="contributor-search-input"
                      />
                      <button type="button" className="contributor-search-btn" onClick={handleUserSearch} disabled={contributorSearching}>
                        {contributorSearching ? '검색중...' : '검색'}
                      </button>
                    </div>
                  )}

                  {userSearchResults.length > 0 && (
                    <div className="contributor-results">
                      {userSearchResults.map((u) => {
                        const alreadyAdded = contributors.some((c) => c.userId === u.id);
                        return (
                          <div key={u.id} className="contributor-result-item">
                            <span>#{u.id} {u.nickname}</span>
                            <button type="button" className="contributor-add-btn" onClick={() => handleAddContributor(u)} disabled={alreadyAdded}>
                              {alreadyAdded ? '추가됨' : '추가'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeRestaurantForm}>
                  취소
                </button>
                <button type="submit" className="submit-btn">
                  {showAddModal ? '등록' : '수정'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantsPage;
