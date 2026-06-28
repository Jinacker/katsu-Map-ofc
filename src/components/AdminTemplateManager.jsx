import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/axios';
import './AdminTemplateManager.css';

const TYPE_LABELS = {
  message_reply: '답변',
  push_notification: '푸시',
};

export default function AdminTemplateManager({
  type,
  title = '',
  content = '',
  onApply,
}) {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === Number(selectedId)),
    [selectedId, templates],
  );

  const fetchTemplates = async () => {
    try {
      setError('');
      const response = await apiClient.get(`/api/v1/admin/templates?type=${type}`);
      setTemplates(response.data?.data || []);
    } catch (err) {
      console.error(err);
      setError('템플릿을 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [type]);

  const applyTemplate = (template) => {
    setSelectedId(String(template.id));
    setTemplateName(template.name);
    onApply({
      title: template.title || '',
      content: template.content,
    });
  };

  const validateCurrentValue = () => {
    if (!templateName.trim()) {
      alert('템플릿 이름을 입력해주세요.');
      return false;
    }
    if (!content.trim()) {
      alert(`${TYPE_LABELS[type]} 내용을 먼저 입력해주세요.`);
      return false;
    }
    if (type === 'push_notification' && !title.trim()) {
      alert('푸시 제목을 먼저 입력해주세요.');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateCurrentValue()) return;
    setSaving(true);
    try {
      const response = await apiClient.post('/api/v1/admin/templates', {
        type,
        name: templateName.trim(),
        title: type === 'push_notification' ? title.trim() : undefined,
        content: content.trim(),
      });
      const created = response.data?.data;
      await fetchTemplates();
      if (created?.id) setSelectedId(String(created.id));
      alert('템플릿이 저장되었습니다.');
    } catch (err) {
      alert(err.response?.data?.message || '템플릿 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTemplate || !validateCurrentValue()) return;
    setSaving(true);
    try {
      await apiClient.put(`/api/v1/admin/templates/${selectedTemplate.id}`, {
        name: templateName.trim(),
        title: type === 'push_notification' ? title.trim() : undefined,
        content: content.trim(),
      });
      await fetchTemplates();
      alert('템플릿이 수정되었습니다.');
    } catch (err) {
      alert(err.response?.data?.message || '템플릿 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate || !window.confirm(`"${selectedTemplate.name}" 템플릿을 삭제할까요?`)) return;
    try {
      await apiClient.delete(`/api/v1/admin/templates/${selectedTemplate.id}`);
      setSelectedId('');
      setTemplateName('');
      await fetchTemplates();
    } catch (err) {
      alert(err.response?.data?.message || '템플릿 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="template-manager">
      <div className="template-manager-header">
        <div>
          <strong>자주 쓰는 {TYPE_LABELS[type]} 템플릿</strong>
          <span>선택하면 작성칸에 바로 적용됩니다.</span>
        </div>
        <span className="template-count">{templates.length}개 저장됨</span>
      </div>

      <select
        className="template-select"
        value={selectedId}
        onChange={(e) => {
          const template = templates.find((item) => item.id === Number(e.target.value));
          if (template) applyTemplate(template);
          else {
            setSelectedId('');
            setTemplateName('');
          }
        }}
      >
        <option value="">템플릿 선택</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>{template.name}</option>
        ))}
      </select>

      <div className="template-save-row">
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="템플릿 이름"
          maxLength={100}
        />
        <button type="button" onClick={handleCreate} disabled={saving}>
          새로 저장
        </button>
        <button
          type="button"
          className="template-update-btn"
          onClick={handleUpdate}
          disabled={!selectedTemplate || saving}
        >
          덮어쓰기
        </button>
        <button
          type="button"
          className="template-delete-btn"
          onClick={handleDelete}
          disabled={!selectedTemplate || saving}
        >
          삭제
        </button>
      </div>

      {error && <p className="template-error">{error}</p>}
    </div>
  );
}
