import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const DEFAULT_RESTAURANT_SHARE_CTA_TEXT = '돈가스 지도에서 이 가게 보기';
const DEFAULT_FEED_SHARE_CTA_TEXT = '돈가스 피드 보기';

export default function OgSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    shareCtaText: DEFAULT_RESTAURANT_SHARE_CTA_TEXT,
    feedShareCtaText: DEFAULT_FEED_SHARE_CTA_TEXT,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/api/v1/admin/hunter-content');
      const data = res.data?.data ?? res.data ?? {};
      setForm({
        shareCtaText: data.shareCtaText ?? DEFAULT_RESTAURANT_SHARE_CTA_TEXT,
        feedShareCtaText: data.feedShareCtaText ?? DEFAULT_FEED_SHARE_CTA_TEXT,
      });
    } catch (e) {
      setMsg('불러오기 실패: ' + (e.response?.data?.message ?? e.message));
    } finally {
      setLoading(false);
    }
  };

  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');

    try {
      await api.put('/api/v1/admin/hunter-content', form);
      setMsg('저장 완료');
    } catch (e) {
      setMsg('저장 실패: ' + (e.response?.data?.message ?? e.message));
    } finally {
      setSaving(false);
    }
  };

  const s = styles;

  if (loading) return <div style={s.loading}>불러오는 중...</div>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>OG 설정</h1>
          <p style={s.subtitle}>공유 링크의 열기 버튼 문구를 관리합니다.</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={s.saveBtn}>
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>

      {msg && (
        <div style={{ ...s.msg, color: msg.startsWith('저장 완료') ? '#16a34a' : '#dc2626' }}>
          {msg}
        </div>
      )}

      <Section title="가게 공유 OG">
        <Field label="열기 버튼 문구">
          <input
            style={s.input}
            value={form.shareCtaText}
            onChange={e => updateField('shareCtaText', e.target.value)}
            placeholder={DEFAULT_RESTAURANT_SHARE_CTA_TEXT}
          />
        </Field>
        <VariableList variables={['{name}', '{area}', '{stars}', '{url}']} />
      </Section>

      <Section title="커뮤니티 피드 공유 OG">
        <Field label="열기 버튼 문구">
          <input
            style={s.input}
            value={form.feedShareCtaText}
            onChange={e => updateField('feedShareCtaText', e.target.value)}
            placeholder={DEFAULT_FEED_SHARE_CTA_TEXT}
          />
        </Field>
        <VariableList variables={['{restaurantName}', '{name}', '{area}', '{nickname}', '{menuName}', '{review}', '{stars}', '{url}']} />
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

function VariableList({ variables }) {
  return (
    <div style={styles.variableBox}>
      <span style={styles.variableLabel}>사용 가능 변수</span>
      <div style={styles.variableList}>
        {variables.map(variable => (
          <code key={variable} style={styles.variableChip}>{variable}</code>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '24px', maxWidth: 860, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14 },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' },
  subtitle: { margin: '6px 0 0', color: '#6b7280', fontSize: 14 },
  loading: { padding: 40, textAlign: 'center', color: '#6b7280' },
  msg: { padding: '10px 14px', borderRadius: 8, background: '#f9fafb', marginBottom: 12, fontSize: 14 },
  section: { background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px 24px', marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: 800, margin: '0 0 16px 0', color: '#111827' },
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' },
  saveBtn: { background: '#d6483e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  variableBox: { borderTop: '1px solid #f3f4f6', paddingTop: 12, marginTop: 4 },
  variableLabel: { display: 'block', color: '#6b7280', fontSize: 12, fontWeight: 700, marginBottom: 8 },
  variableList: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  variableChip: { border: '1px solid #e5e7eb', borderRadius: 999, padding: '4px 8px', background: '#f9fafb', color: '#374151', fontSize: 12 },
};
