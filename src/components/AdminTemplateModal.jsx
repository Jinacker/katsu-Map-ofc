import React, { useState } from 'react';
import AdminTemplateManager from './AdminTemplateManager';
import './AdminTemplateManager.css';

const LABELS = {
  message_reply: '문의 답변 템플릿',
  push_notification: '푸시 알림 템플릿',
};

export default function AdminTemplateModal({ open, type, onClose, onUse }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  if (!open) return null;

  return (
    <div className="template-modal-overlay" onClick={onClose}>
      <div className="template-modal" onClick={(e) => e.stopPropagation()}>
        <div className="template-modal-header">
          <div>
            <h2>{LABELS[type]}</h2>
            <p>자주 쓰는 문구를 저장하고 수정할 수 있습니다.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기">×</button>
        </div>

        <div className="template-modal-body">
          <AdminTemplateManager
            type={type}
            title={title}
            content={content}
            onApply={(template) => {
              setTitle(template.title);
              setContent(template.content);
            }}
          />

          {type === 'push_notification' && (
            <div className="template-modal-field">
              <label>알림 제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="저장할 푸시 제목"
                maxLength={50}
              />
              <span>{title.length}/50</span>
            </div>
          )}

          <div className="template-modal-field">
            <label>{type === 'push_notification' ? '알림 내용' : '답변 내용'}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={type === 'push_notification' ? '저장할 푸시 내용을 입력하세요' : '저장할 답변 내용을 입력하세요'}
              rows={7}
              maxLength={type === 'push_notification' ? 200 : undefined}
            />
            {type === 'push_notification' && <span>{content.length}/200</span>}
          </div>

          {onUse && (
            <button
              type="button"
              className="template-use-btn"
              disabled={!content.trim() || (type === 'push_notification' && !title.trim())}
              onClick={() => {
                onUse({ title, content });
                onClose();
              }}
            >
              작성칸에 적용
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
