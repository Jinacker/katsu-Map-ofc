import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import './RestaurantsPage.css';

const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    area: '',
    category: '돈가스',
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
  });

  const itemsPerPage = 20;

  useEffect(() => {
    fetchRestaurants();
  }, []);

  // 검색이나 필터 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterLevel]);

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
      category: '돈가스',
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
      category: restaurant.category || '돈가스',
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
      alert('식당 수정에 실패했습니다.');
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

  const getRecommendLevel = (restaurant) => {
    if (restaurant.isTop5) return 'top5';
    if (restaurant.isBest) return 'best';
    if (restaurant.isGood) return 'good';
    return 'none';
  };

  const getRecommendLabel = (restaurant) => {
    if (restaurant.isTop5) return '서울 5대 돈가스';
    if (restaurant.isBest) return '강추';
    if (restaurant.isGood) return '꽤 괜찮';
    return '-';
  };

  const getRecommendClass = (restaurant) => {
    if (restaurant.isTop5) return 'top5';
    if (restaurant.isBest) return 'best';
    if (restaurant.isGood) return 'good';
    return '';
  };

  const filteredRestaurants = restaurants.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.area.toLowerCase().includes(searchTerm.toLowerCase());
    const level = getRecommendLevel(r);
    const matchesLevel = filterLevel === 'all' || level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  // 클라이언트 사이드 페이지네이션
  const totalFilteredCount = filteredRestaurants.length;
  const totalPages = Math.ceil(totalFilteredCount / itemsPerPage);
  const paginatedRestaurants = filteredRestaurants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="filter-select"
        >
          <option value="all">전체 등급</option>
          <option value="top5">서울 5대 돈가스</option>
          <option value="best">강추</option>
          <option value="good">꽤 괜찮</option>
        </select>
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
              <th>가격대</th>
              <th>주소</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRestaurants.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-cell">
                  검색 결과가 없습니다
                </td>
              </tr>
            ) : (
              paginatedRestaurants.map((restaurant) => (
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
                  <td>{restaurant.priceDisplay || '-'}</td>
                  <td className="address-cell">{restaurant.addr}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="pagination-btn"
        >
          이전
        </button>
        <span className="pagination-info">
          {currentPage} / {totalPages} 페이지
        </span>
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="pagination-btn"
        >
          다음
        </button>
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

                {selectedRestaurant.description && (
                  <div className="detail-item full-width">
                    <span className="detail-label">설명</span>
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
                    <option value="돈가스">돈가스</option>
                    <option value="일식">일식</option>
                    <option value="양식">양식</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>가격대</label>
                  <input
                    type="text"
                    name="priceDisplay"
                    value={formData.priceDisplay}
                    onChange={handleFormChange}
                    placeholder="예: 15,000~25,000원"
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
                  <label>설명</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows="3"
                  />
                </div>

                <div className="form-group full-width">
                  <label>메인 이미지 URL</label>
                  <input
                    type="url"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group full-width">
                  <label>추가 이미지 1 URL</label>
                  <input
                    type="url"
                    name="image_url_1"
                    value={formData.image_url_1}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group full-width">
                  <label>추가 이미지 2 URL</label>
                  <input
                    type="url"
                    name="image_url_2"
                    value={formData.image_url_2}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group full-width">
                  <label>추가 이미지 3 URL</label>
                  <input
                    type="url"
                    name="image_url_3"
                    value={formData.image_url_3}
                    onChange={handleFormChange}
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

                <div className="form-group full-width checkbox-group">
                  <label>추천 등급</label>
                  <div className="checkbox-options">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="isTop5"
                        checked={formData.isTop5}
                        onChange={handleFormChange}
                      />
                      서울 5대 돈가스
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="isBest"
                        checked={formData.isBest}
                        onChange={handleFormChange}
                      />
                      강추
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="isGood"
                        checked={formData.isGood}
                        onChange={handleFormChange}
                      />
                      꽤 괜찮
                    </label>
                  </div>
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
