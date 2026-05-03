import React, { useEffect, useState, useRef, useCallback } from 'react';
import apiClient from '../api/axios';
import { uploadImageToGCS } from '../api/gcs';
import './RestaurantsPage.css';

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
  const [formData, setFormData] = useState({
    name: '',
    area: '',
    category: '일식',
    addr: '',
    lat: '',
    lng: '',
    priceDisplay: '',
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
  });
  const [uploading, setUploading] = useState({});
  const [geoSearching, setGeoSearching] = useState(false);
  const [geoResults, setGeoResults] = useState([]);
  const [showGeoResults, setShowGeoResults] = useState(false);
  const mapPreviewRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

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
    setFormData({
      name: '',
      area: '',
      category: '일식',
      addr: '',
      lat: '',
      lng: '',
      priceDisplay: '',
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
    });
  };

  const handleAddClick = () => {
    resetFormData();
    setShowAddModal(true);
  };

  const handleEditClick = (restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      name: restaurant.name || '',
      area: restaurant.area || '',
      category: restaurant.category || '일식',
      addr: restaurant.addr || '',
      lat: restaurant.lat || '',
      lng: restaurant.lng || '',
      priceDisplay: restaurant.priceDisplay || '',
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
    });
    setSelectedRestaurant(null);
    setShowEditModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    // 이미지 파일만 허용
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setUploading((prev) => ({ ...prev, [fieldName]: true }));

    try {
      const url = await uploadImageToGCS(file);
      setFormData((prev) => {
        const updated = { ...prev, [fieldName]: url };
        // 추가 이미지 1 업로드 시 메인 이미지가 비어있으면 자동 설정
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
      e.target.value = ''; // 같은 파일 재선택 허용
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        lat: parseFloat(formData.lat) || 0,
        lng: parseFloat(formData.lng) || 0,
      };
      await apiClient.post('/api/v1/admin/restaurants', payload);
      alert('식당이 등록되었습니다.');
      setShowAddModal(false);
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
      const payload = {
        ...formData,
        lat: parseFloat(formData.lat) || 0,
        lng: parseFloat(formData.lng) || 0,
      };
      await apiClient.put(`/api/v1/admin/restaurants/${editingRestaurant.id}`, payload);
      alert('식당 정보가 수정되었습니다.');
      setShowEditModal(false);
      setEditingRestaurant(null);
      resetFormData();
      fetchRestaurants();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.message || '알 수 없는 오류';
      alert(`식당 수정에 실패했습니다.\n${errorMsg}`);
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

  const ensureKakaoLoaded = () => new Promise((resolve, reject) => {
    if (!window.kakao) { reject(new Error('카카오맵 SDK 로드 실패')); return; }
    if (window.kakao?.maps?.services) { resolve(); return; }
    window.kakao.maps.load(resolve);
  });

  const handleGeoAutoFill = async () => {
    const keyword = [formData.name, formData.area].filter(Boolean).join(' ');
    if (!keyword.trim()) { alert('이름 또는 지역을 먼저 입력해주세요.'); return; }
    setGeoSearching(true);
    setShowGeoResults(false);
    try {
      await ensureKakaoLoaded();
      const ps = new window.kakao.maps.services.Places();
      const placeResults = await new Promise((resolve) => {
        ps.keywordSearch(keyword, (results, status) =>
          resolve(status === window.kakao.maps.services.Status.OK ? results : [])
        );
      });
      if (placeResults.length > 0) {
        setGeoResults(placeResults.slice(0, 5).map(r => ({
          name: r.place_name,
          addr: r.road_address_name || r.address_name,
          lat: r.y,
          lng: r.x,
          placeUrl: r.place_url,
        })));
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
                  onClick={() => setSelectedRestaurant(restaurant)}
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
                  <span className="detail-value">{selectedRestaurant.priceDisplay || '-'}</span>
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
        <div className="modal-overlay" onClick={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setEditingRestaurant(null);
          resetFormData();
        }}>
          <div className="modal-content restaurant-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{showAddModal ? '새 식당 등록' : '식당 정보 수정'}</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingRestaurant(null);
                  resetFormData();
                }}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <form onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit} className="restaurant-form">
              <div className="form-grid">
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

                <div className="form-group">
                  <label>가격대 {showEditModal && '(수정 불가)'}</label>
                  <input
                    type="text"
                    name="priceDisplay"
                    value={formData.priceDisplay}
                    onChange={handleFormChange}
                    placeholder="예: 15,000~25,000원"
                    disabled={showEditModal}
                    className={showEditModal ? 'disabled-input' : ''}
                  />
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
                  <div className="geo-autofill-bar">
                    <button
                      type="button"
                      className="geo-autofill-btn"
                      onClick={handleGeoAutoFill}
                      disabled={geoSearching}
                    >
                      {geoSearching ? '🔍 검색 중...' : '🔍 좌표 자동 채우기'}
                    </button>
                    <span className="geo-hint">이름·지역으로 검색 후 선택하면 주소 / 위도·경도 / 카카오맵 URL 자동 입력</span>
                  </div>
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

                {formData.lat && formData.lng && (
                  <div className="form-group full-width">
                    <label>위치 미리보기</label>
                    <div ref={mapPreviewRef} className="map-preview-container" />
                  </div>
                )}

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
                  <div className="image-input-group">
                    <input
                      type="url"
                      name="imageUrl"
                      value={formData.imageUrl}
                      onChange={handleFormChange}
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
                  <div className="image-input-group">
                    <input
                      type="url"
                      name="image_url_1"
                      value={formData.image_url_1}
                      onChange={handleFormChange}
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
                  <div className="image-input-group">
                    <input
                      type="url"
                      name="image_url_2"
                      value={formData.image_url_2}
                      onChange={handleFormChange}
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
                  <div className="image-input-group">
                    <input
                      type="url"
                      name="image_url_3"
                      value={formData.image_url_3}
                      onChange={handleFormChange}
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

                <div className="form-group full-width">
                  <label>카카오맵 URL</label>
                  <input
                    type="url"
                    name="placeUrl"
                    value={formData.placeUrl}
                    onChange={handleFormChange}
                  />
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
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingRestaurant(null);
                  resetFormData();
                }}>
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
