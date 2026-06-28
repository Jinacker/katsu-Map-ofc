import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import './AdminTemplateManager.css';

const TYPE_LABELS = {
  message_reply: '답변 템플릿',
  push_notification: '푸시 템플릿',
};

export default function AdminTemplatePicker({ type, onSelect, refreshKey = 0 }) {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    let cancelled = false;

    apiClient.get(`/api/v1/admin/templates?type=${type}`)
      .then((response) => {
        if (!cancelled) setTemplates(response.data?.data || []);
      })
      .catch((err) => console.error('템플릿 목록 조회 실패:', err));

    return () => {
      cancelled = true;
    };
  }, [type, refreshKey]);

  return (
    <div className="template-picker">
      <span>{TYPE_LABELS[type] || '템플릿'}</span>
      <select
        value=""
        onChange={(e) => {
          const nextId = e.target.value;
          const template = templates.find((item) => item.id === Number(nextId));
          if (template) onSelect(template);
        }}
      >
        <option value="">템플릿 선택</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>{template.name}</option>
        ))}
      </select>
    </div>
  );
}
