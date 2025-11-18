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

  const itemsPerPage = 20;

  useEffect(() => {
    fetchRestaurants();
  }, [currentPage]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/api/v1/restaurants?limit=${itemsPerPage}&offset=${(currentPage - 1) * itemsPerPage}`
      );
      setRestaurants(response.data.data.items);
      setTotalCount(response.data.data.count);
    } catch (err) {
      console.error(err);
      alert('맛집 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendLabel = (level) => {
    switch (level) {
      case 'top5':
        return '톱5';
      case 'best':
        return '강추';
      case 'good':
        return '추천';
      default:
        return level;
    }
  };

  const getRecommendClass = (level) => {
    switch (level) {
      case 'top5':
        return 'top5';
      case 'best':
        return 'best';
      case 'good':
        return 'good';
      default:
        return '';
    }
  };

  const filteredRestaurants = restaurants.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.area.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'all' || r.recommendLevel === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

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
          <option value="top5">톱5</option>
          <option value="best">강추</option>
          <option value="good">추천</option>
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
            {filteredRestaurants.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-cell">
                  검색 결과가 없습니다
                </td>
              </tr>
            ) : (
              filteredRestaurants.map((restaurant) => (
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
                    <span className={`recommend-badge ${getRecommendClass(restaurant.recommendLevel)}`}>
                      {getRecommendLabel(restaurant.recommendLevel)}
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
              {selectedRestaurant.imageUrl && (
                <img
                  src={selectedRestaurant.imageUrl}
                  alt={selectedRestaurant.name}
                  className="restaurant-image"
                />
              )}

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
                  <span className={`recommend-badge ${getRecommendClass(selectedRestaurant.recommendLevel)}`}>
                    {getRecommendLabel(selectedRestaurant.recommendLevel)}
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantsPage;
