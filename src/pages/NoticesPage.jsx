import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import './NoticesPage.css';

const NoticesPage = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [formData, setFormData] = useState({
    type: 'notice',
    title: '',
    content: '',
    pollQuestion: '',
    isActive: true
  });

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/notices/all');
      setNotices(response.data.data.items);
    } catch (err) {
      console.error(err);
      alert('공지사항 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingNotice(null);
    setFormData({
      type: 'notice',
      title: '',
      content: '',
      pollQuestion: '',
      isActive: true
    });
    setShowModal(true);
  };

  const handleEdit = (notice) => {
    setEditingNotice(notice);
    setFormData({
      type: notice.type,
      title: notice.title,
      content: notice.content,
      pollQuestion: notice.pollQuestion || '',
      isActive: notice.isActive
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingNotice) {
        // 수정
        await apiClient.put(`/api/v1/notices/${editingNotice.id}`, formData);
        alert('공지사항이 수정되었습니다.');
      } else {
        // 생성
        if (formData.type === 'poll') {
          await apiClient.post('/api/v1/notices/polls', formData);
        } else {
          await apiClient.post('/api/v1/notices', formData);
        }
        alert('공지사항이 생성되었습니다.');
      }
      setShowModal(false);
      fetchNotices();
    } catch (err) {
      console.error(err);
      alert('작업에 실패했습니다.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('정말 이 공지사항을 삭제하시겠습니까?')) return;

    try {
      await apiClient.delete(`/api/v1/notices/${id}`);
      alert('공지사항이 삭제되었습니다.');
      fetchNotices();
    } catch (err) {
      console.error(err);
      alert('삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="notices-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>공지사항 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notices-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">공지사항 관리</h1>
          <p className="page-subtitle">일반 공지사항 및 투표 관리</p>
        </div>
        <button onClick={handleCreate} className="create-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          새 공지사항
        </button>
      </div>

      <div className="notices-grid">
        {notices.length === 0 ? (
          <div className="empty-state">
            <p>공지사항이 없습니다</p>
          </div>
        ) : (
          notices.map((notice) => (
            <div key={notice.id} className="notice-card">
              <div className="notice-header">
                <div className="notice-badges">
                  <span className={`type-badge ${notice.type}`}>
                    {notice.type === 'poll' ? '투표' : '공지'}
                  </span>
                  <span className={`status-badge ${notice.isActive ? 'active' : 'inactive'}`}>
                    {notice.isActive ? '활성' : '비활성'}
                  </span>
                </div>
                <div className="notice-actions">
                  <button onClick={() => handleEdit(notice)} className="edit-btn">
                    수정
                  </button>
                  <button onClick={() => handleDelete(notice.id)} className="delete-btn">
                    삭제
                  </button>
                </div>
              </div>

              <h3 className="notice-title">{notice.title}</h3>
              <p className="notice-content">{notice.content}</p>

              {notice.type === 'poll' && (
                <div className="poll-info">
                  <p className="poll-question">{notice.pollQuestion}</p>
                  <div className="poll-results">
                    <div className="poll-result">
                      <span>찬성</span>
                      <span className="poll-count">{notice.pollYesCount}명</span>
                    </div>
                    <div className="poll-result">
                      <span>반대</span>
                      <span className="poll-count">{notice.pollNoCount}명</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="notice-footer">
                <span className="notice-date">
                  생성일: {new Date(notice.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingNotice ? '공지사항 수정' : '새 공지사항 작성'}</h2>
              <button onClick={() => setShowModal(false)} className="modal-close">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="notice-form">
              <div className="form-group">
                <label>유형</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="notice">일반 공지</option>
                  <option value="poll">투표</option>
                </select>
              </div>

              <div className="form-group">
                <label>제목</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="제목을 입력하세요"
                  required
                />
              </div>

              <div className="form-group">
                <label>내용</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="내용을 입력하세요"
                  rows={5}
                  required
                />
              </div>

              {formData.type === 'poll' && (
                <div className="form-group">
                  <label>투표 질문</label>
                  <input
                    type="text"
                    value={formData.pollQuestion}
                    onChange={(e) => setFormData({ ...formData, pollQuestion: e.target.value })}
                    placeholder="투표 질문을 입력하세요"
                    required
                  />
                </div>
              )}

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span>활성화</span>
                </label>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)} className="cancel-btn">
                  취소
                </button>
                <button type="submit" className="submit-btn">
                  {editingNotice ? '수정' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticesPage;
