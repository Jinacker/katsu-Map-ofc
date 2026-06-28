import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import AdminTemplateModal from '../components/AdminTemplateModal';
import AdminTemplatePicker from '../components/AdminTemplatePicker';
import './MessagesPage.css';

const MessagesPage = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isEditingReply, setIsEditingReply] = useState(false);
  const [error, setError] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [unrepliedOnly, setUnrepliedOnly] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateRefreshKey, setTemplateRefreshKey] = useState(0);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/messages/admin/all');
      setMessages(response.data.data);
    } catch (err) {
      setError('메시지 목록을 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (messageId) => {
    if (!replyText.trim()) {
      alert('답장 내용을 입력해주세요.');
      return;
    }

    try {
      await apiClient.patch(`/api/v1/messages/${messageId}/reply`, {
        reply: replyText
      });
      alert(isEditingReply ? '답장이 수정되었습니다.' : '답장이 전송되었습니다.');
      setReplyText('');
      setIsEditingReply(false);
      setSelectedMessage(null);
      fetchMessages();
    } catch (err) {
      alert(isEditingReply ? '답장 수정에 실패했습니다.' : '답장 전송에 실패했습니다.');
      console.error(err);
    }
  };

  const handleDelete = async (messageId) => {
    if (!confirm('정말 이 메시지를 삭제하시겠습니까?')) return;

    try {
      await apiClient.delete(`/api/v1/messages/${messageId}`);
      alert('메시지가 삭제되었습니다.');
      fetchMessages();
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
    } catch (err) {
      alert('메시지 삭제에 실패했습니다.');
      console.error(err);
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'question':
        return '문의';
      case 'dissent':
        return '이의제기';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="messages-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>메시지 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">문의 관리</h1>
          <p className="page-subtitle">사용자 문의 및 이의제기 관리</p>
        </div>
        <div className="header-stats">
          <button
            type="button"
            className="template-manage-btn"
            onClick={() => setShowTemplateModal(true)}
          >
            문의 템플릿
          </button>
          <div className="stat-badge">
            <span className="stat-label">전체</span>
            <span className="stat-value">{messages.length}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">미답장</span>
            <span className="stat-value">{messages.filter(m => !m.reply).length}</span>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="messages-container">
        {/* Message List */}
        <div className="messages-list">
          <div className="list-filters">
            <div className="filter-sort">
              <button
                className={`filter-btn ${sortOrder === 'newest' ? 'active' : ''}`}
                onClick={() => setSortOrder('newest')}
              >
                최신순
              </button>
              <button
                className={`filter-btn ${sortOrder === 'oldest' ? 'active' : ''}`}
                onClick={() => setSortOrder('oldest')}
              >
                과거순
              </button>
            </div>
            <button
              className={`filter-btn ${unrepliedOnly ? 'active' : ''}`}
              onClick={() => setUnrepliedOnly(v => !v)}
            >
              미답장만
            </button>
          </div>
          {(() => {
            let filtered = [...messages];
            if (unrepliedOnly) filtered = filtered.filter(m => !m.reply);
            if (sortOrder === 'oldest') filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            else filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return filtered.length === 0 ? (
            <div className="empty-state">
              <p>문의가 없습니다</p>
            </div>
          ) : (
            filtered.map((message) => (
              <div
                key={message.id}
                className={`message-card ${selectedMessage?.id === message.id ? 'active' : ''}`}
                onClick={() => { setSelectedMessage(message); setIsEditingReply(false); setReplyText(''); }}
              >
                <div className="message-header-info">
                  <span className={`type-badge ${message.type}`}>
                    {getTypeLabel(message.type)}
                  </span>
                  <span className="message-user">{message.user?.nickname || '익명'}</span>
                  {message.reply && (
                    <span className="reply-badge">답장 완료</span>
                  )}
                </div>
                <p className="message-preview">{message.content}</p>
                <span className="message-date">
                  {new Date(message.createdAt).toLocaleString('ko-KR')}
                </span>
              </div>
            ))
          );
          })()}
        </div>

        {/* Message Detail */}
        {selectedMessage && (
          <div className="message-detail">
            <div className="detail-header">
              <h2>메시지 상세</h2>
              <button
                onClick={() => handleDelete(selectedMessage.id)}
                className="delete-btn-small"
              >
                삭제
              </button>
            </div>

            <div className="detail-content">
              <div className="detail-row">
                <span className="detail-label">유형</span>
                <span className={`type-badge ${selectedMessage.type}`}>
                  {getTypeLabel(selectedMessage.type)}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">작성자</span>
                <span className="author-value">
                  {selectedMessage.user?.nickname || '익명'}
                  <span className="author-user-id">
                    ID: {selectedMessage.user?.id ?? selectedMessage.userId ?? '-'}
                  </span>
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">작성일</span>
                <span>{new Date(selectedMessage.createdAt).toLocaleString('ko-KR')}</span>
              </div>

              <div className="detail-section">
                <span className="detail-label">내용</span>
                <div className="message-content-box">
                  {selectedMessage.content}
                </div>
              </div>

              {selectedMessage.reply && !isEditingReply ? (
                <div className="detail-section">
                  <div className="reply-label-row">
                    <span className="detail-label">답장</span>
                    <button
                      onClick={() => { setIsEditingReply(true); setReplyText(selectedMessage.reply); }}
                      className="reply-edit-btn"
                    >
                      수정
                    </button>
                  </div>
                  <div className="reply-content-box">
                    {selectedMessage.reply}
                  </div>
                </div>
              ) : (
                <div className="reply-form">
                  <label className="detail-label">{isEditingReply ? '답장 수정' : '답장 작성'}</label>
                  <AdminTemplatePicker
                    type="message_reply"
                    refreshKey={templateRefreshKey}
                    onSelect={(template) => setReplyText(template.content)}
                  />
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="답장 내용을 입력하세요..."
                    rows={5}
                    className="reply-textarea"
                  />
                  <div className="reply-form-actions">
                    <button
                      onClick={() => handleReply(selectedMessage.id)}
                      className="reply-submit-btn"
                    >
                      {isEditingReply ? '수정 완료' : '답장 보내기'}
                    </button>
                    {isEditingReply && (
                      <button
                        onClick={() => { setIsEditingReply(false); setReplyText(''); }}
                        className="reply-cancel-btn"
                      >
                        취소
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AdminTemplateModal
        open={showTemplateModal}
        type="message_reply"
        onClose={() => {
          setShowTemplateModal(false);
          setTemplateRefreshKey((key) => key + 1);
        }}
        onUse={({ content }) => {
          if (!selectedMessage) {
            alert('답변할 문의를 먼저 선택해주세요.');
            return;
          }
          setReplyText(content);
          if (selectedMessage.reply) setIsEditingReply(true);
        }}
      />
    </div>
  );
};

export default MessagesPage;
