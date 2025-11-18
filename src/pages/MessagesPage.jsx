import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import './MessagesPage.css';

const MessagesPage = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState('');

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
      alert('답장이 전송되었습니다.');
      setReplyText('');
      setSelectedMessage(null);
      fetchMessages();
    } catch (err) {
      alert('답장 전송에 실패했습니다.');
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
          {messages.length === 0 ? (
            <div className="empty-state">
              <p>문의가 없습니다</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`message-card ${selectedMessage?.id === message.id ? 'active' : ''}`}
                onClick={() => setSelectedMessage(message)}
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
          )}
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
                <span>{selectedMessage.user?.nickname || '익명'}</span>
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

              {selectedMessage.reply ? (
                <div className="detail-section">
                  <span className="detail-label">답장</span>
                  <div className="reply-content-box">
                    {selectedMessage.reply}
                  </div>
                </div>
              ) : (
                <div className="reply-form">
                  <label className="detail-label">답장 작성</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="답장 내용을 입력하세요..."
                    rows={5}
                    className="reply-textarea"
                  />
                  <button
                    onClick={() => handleReply(selectedMessage.id)}
                    className="reply-submit-btn"
                  >
                    답장 보내기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
