import React, { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import AdminTemplateModal from '../components/AdminTemplateModal';
import AdminTemplatePicker from '../components/AdminTemplatePicker';

const CONFIRM_STEPS = [
  '정말 전송하시겠습니까?',
  '전송 후 취소할 수 없습니다. 계속하시겠습니까?',
  null, // 마지막 단계: 수신자 수 표시 후 동적 생성
];

export default function PushNotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetMode, setTargetMode] = useState('all'); // 'all' | 'specific'
  const [userSearch, setUserSearch] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [confirmStep, setConfirmStep] = useState(0); // 0 = 닫힘, 1~3 = 확인 단계
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null);
  const [dispatch, setDispatch] = useState(null); // 진행 중/완료된 발송 상태
  const [pollingId, setPollingId] = useState(null); // 폴링 대상 dispatchId
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateRefreshKey, setTemplateRefreshKey] = useState(0);

  // 발송 진행 상황 폴링 (1.5초 간격, 완료 시 중단, 최대 3분)
  useEffect(() => {
    if (!pollingId) return undefined;
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/api/v1/admin/push/dispatches/${pollingId}`);
        const d = res.data?.data;
        if (d) {
          setDispatch(d);
          if (d.status === 'completed') {
            setPollingId(null);
            fetchHistory(); // 완료된 발송을 기록 목록에 반영
          }
        }
      } catch {
        // 일시 오류는 다음 폴링에서 재시도
      }
    }, 1500);
    const timeout = setTimeout(() => setPollingId(null), 180000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pollingId]);

  const [history, setHistory] = useState([]);
  const fetchHistory = () => {
    apiClient
      .get('/api/v1/admin/push/dispatches', { params: { limit: 20 } })
      .then((res) => setHistory(res.data?.data ?? []))
      .catch(() => {});
  };
  useEffect(() => {
    fetchHistory();
  }, []);

  const formatKst = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  useEffect(() => {
    apiClient.get('/api/v1/admin/users').then(res => {
      const users = res.data?.data ?? [];
      setAllUsers(Array.isArray(users) ? users : []);
    }).catch(() => {});
  }, []);

  const searchResults = userSearch.trim()
    ? allUsers.filter(u =>
        (u.nickname || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        String(u.id).includes(userSearch)
      ).slice(0, 20)
    : [];

  const toggleUser = (user) => {
    setSelectedUsers(prev =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  const recipientCount = targetMode === 'all' ? '전체 유저' : `${selectedUsers.length}명`;

  const handleSendClick = () => {
    if (!title.trim() || !body.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }
    if (targetMode === 'specific' && selectedUsers.length === 0) {
      alert('수신할 유저를 선택해주세요.');
      return;
    }
    setConfirmStep(1);
  };

  const handleConfirmNext = async () => {
    if (confirmStep < 3) {
      setConfirmStep(prev => prev + 1);
      return;
    }
    // 최종 전송
    setIsSending(true);
    try {
      const payload = {
        title,
        body,
        ...(targetMode === 'specific' ? { userIds: selectedUsers.map(u => u.id) } : {}),
      };
      const res = await apiClient.post('/api/v1/admin/push/send', payload);
      const data = res.data?.data ?? {};
      const sent = data.sent ?? 0;
      if (data.dispatchId) {
        // 진행 바 모드: 폴링으로 상태 갱신
        setResult(null);
        setDispatch({ targets: sent, totalChunks: 0, sentChunks: 0, failedChunks: 0, status: 'in_progress' });
        setPollingId(data.dispatchId);
      } else {
        setResult({ success: true, sent });
      }
      setTitle('');
      setBody('');
      setSelectedUsers([]);
      setUserSearch('');
    } catch (err) {
      setResult({
        success: false,
        message:
          err?.response?.status === 409
            ? '이미 진행 중인 발송이 있습니다. 잠시 후 다시 시도해주세요.'
            : null,
      });
    } finally {
      setIsSending(false);
      setConfirmStep(0);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>푸시 알림</h1>
          <p style={styles.subtitle}>앱 사용자에게 푸시 알림을 발송합니다.</p>
        </div>
        <button style={styles.templateBtn} onClick={() => setShowTemplateModal(true)}>
          푸시 템플릿
        </button>
      </div>

      {result && (
        <div style={{ ...styles.resultBanner, background: result.success ? '#e8f5e9' : '#fdecea', borderColor: result.success ? '#a5d6a7' : '#ef9a9a' }}>
          {result.success
            ? `✅ 발송 시작 — 대상 ${result.sent}명에게 순차 전송 중입니다.`
            : `❌ ${result.message || '발송에 실패했습니다. 다시 시도해주세요.'}`}
          <button style={styles.dismissBtn} onClick={() => setResult(null)}>✕</button>
        </div>
      )}
      {dispatch && (() => {
        const done = (dispatch.sentChunks ?? 0) + (dispatch.failedChunks ?? 0);
        const total = dispatch.totalChunks || 0;
        const pct = dispatch.status === 'completed' ? 100 : total ? Math.round((done / total) * 100) : 0;
        const isDone = dispatch.status === 'completed';
        return (
          <div style={{ ...styles.resultBanner, display: 'block', background: isDone ? '#e8f5e9' : '#e3f2fd', borderColor: isDone ? '#a5d6a7' : '#90caf9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>
                {isDone
                  ? `✅ 발송 완료 — 대상 ${dispatch.targets}명${dispatch.failedChunks ? ` · 실패 ${dispatch.failedChunks}묶음` : ''}`
                  : `📤 발송 중 — ${pct}% (${done}/${total || '?'}묶음 · 대상 ${dispatch.targets}명)`}
              </span>
              {isDone && (
                <button style={styles.dismissBtn} onClick={() => setDispatch(null)}>✕</button>
              )}
            </div>
            <div style={styles.progressOuter}>
              <div style={{ ...styles.progressInner, width: `${pct}%`, background: isDone ? '#4caf50' : '#2196f3' }} />
            </div>
          </div>
        );
      })()}

      <div style={styles.card}>
        <div style={styles.formGroup}>
          <label style={styles.label}>제목</label>
          <input
            style={styles.input}
            placeholder="알림 제목"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={50}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>내용</label>
          <textarea
            style={{ ...styles.input, height: 100, resize: 'vertical' }}
            placeholder="알림 내용"
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={200}
          />
          <div style={styles.charCount}>{body.length}/200</div>
        </div>

        <div style={styles.formGroup}>
          <AdminTemplatePicker
            type="push_notification"
            refreshKey={templateRefreshKey}
            onSelect={(template) => {
              setTitle(template.title || '');
              setBody(template.content);
            }}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>수신 대상</label>
          <div style={styles.targetRow}>
            <button
              style={{ ...styles.targetBtn, ...(targetMode === 'all' ? styles.targetBtnActive : {}) }}
              onClick={() => setTargetMode('all')}
            >
              전체 유저
            </button>
            <button
              style={{ ...styles.targetBtn, ...(targetMode === 'specific' ? styles.targetBtnActive : {}) }}
              onClick={() => setTargetMode('specific')}
            >
              특정 유저 선택
            </button>
          </div>
        </div>

        {targetMode === 'specific' && (
          <div style={styles.formGroup}>
            <div style={styles.searchRow}>
              <input
                style={{ ...styles.input, flex: 1 }}
                placeholder="닉네임 또는 ID로 검색"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>

            {searchResults.length > 0 && (
              <div style={styles.searchResults}>
                {searchResults.map(u => (
                  <div
                    key={u.id}
                    style={{
                      ...styles.searchItem,
                      background: selectedUsers.find(s => s.id === u.id) ? '#fff3e0' : '#fff',
                    }}
                    onClick={() => toggleUser(u)}
                  >
                    <span style={styles.searchNickname}>{u.nickname || '익명'}</span>
                    <span style={styles.searchId}>#{u.id}</span>
                    {selectedUsers.find(s => s.id === u.id) && <span style={styles.checkmark}>✓</span>}
                  </div>
                ))}
              </div>
            )}

            {selectedUsers.length > 0 && (
              <div style={styles.selectedChips}>
                {selectedUsers.map(u => (
                  <div key={u.id} style={styles.chip}>
                    {u.nickname || '익명'}
                    <button style={styles.chipRemove} onClick={() => toggleUser(u)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button style={styles.sendBtn} onClick={handleSendClick}>
          📣 발송하기
        </button>
      </div>

      {/* 확인 팝업 */}
      {confirmStep > 0 && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>발송 확인 ({confirmStep}/3)</h3>
            <p style={styles.modalMessage}>
              {confirmStep === 3
                ? `최종 확인: ${recipientCount}에게 발송합니다.`
                : CONFIRM_STEPS[confirmStep - 1]}
            </p>
            <div style={styles.modalButtons}>
              <button style={styles.cancelBtn} onClick={() => setConfirmStep(0)}>취소</button>
              <button
                style={{ ...styles.confirmBtn, opacity: isSending ? 0.6 : 1 }}
                onClick={handleConfirmNext}
                disabled={isSending}
              >
                {isSending ? '전송 중...' : confirmStep === 3 ? '최종 전송' : '계속'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 발송 기록 — 방문 급증과 대조할 수 있게 시각·내용·대상 수를 남긴다 */}
      <div style={{ ...styles.card, marginTop: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>발송 기록</h2>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 16px' }}>
          최근 20건 · 방문자 추이와 대조용 (기록은 2026-08-10 이후 발송부터)
        </p>
        {history.length === 0 ? (
          <p style={{ fontSize: 14, color: '#999' }}>아직 기록이 없습니다.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#888', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '8px 6px' }}>발송 시각</th>
                <th style={{ padding: '8px 6px' }}>제목</th>
                <th style={{ padding: '8px 6px' }}>내용</th>
                <th style={{ padding: '8px 6px', textAlign: 'right' }}>대상</th>
                <th style={{ padding: '8px 6px' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {history.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>{formatKst(d.createdAt)}</td>
                  <td style={{ padding: '8px 6px', fontWeight: 600 }}>{d.title}</td>
                  <td style={{ padding: '8px 6px', color: '#666', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.body || '-'}
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'right' }}>{d.targets}명</td>
                  <td style={{ padding: '8px 6px' }}>
                    {d.status === 'completed'
                      ? (d.failedChunks > 0 ? `완료 (실패 ${d.failedChunks}묶음)` : '완료')
                      : '진행 중'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AdminTemplateModal
        open={showTemplateModal}
        type="push_notification"
        onClose={() => {
          setShowTemplateModal(false);
          setTemplateRefreshKey((key) => key + 1);
        }}
        onUse={(template) => {
          setTitle(template.title);
          setBody(template.content);
        }}
      />
    </div>
  );
}

const styles = {
  page: { padding: '24px', maxWidth: 720, margin: '0 auto' },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 16, marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  subtitle: { color: '#666', marginTop: 6 },
  templateBtn: {
    padding: '10px 16px', border: 'none', borderRadius: 8,
    background: '#d6483e', color: '#fff', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  resultBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderRadius: 8, border: '1px solid', marginBottom: 20,
    fontSize: 14,
  },
  dismissBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#666' },
  progressOuter: { marginTop: 10, height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' },
  progressInner: { height: '100%', borderRadius: 4, transition: 'width 0.6s ease' },
  card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  formGroup: { marginBottom: 20 },
  label: { display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14 },
  input: {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
    border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none',
    fontFamily: 'inherit',
  },
  charCount: { textAlign: 'right', fontSize: 12, color: '#999', marginTop: 4 },
  targetRow: { display: 'flex', gap: 8 },
  targetBtn: {
    padding: '8px 18px', borderRadius: 20, border: '1px solid #ddd',
    cursor: 'pointer', background: '#f5f5f5', fontSize: 14,
  },
  targetBtnActive: { background: '#d6483e', color: '#fff', borderColor: '#d6483e' },
  searchRow: { display: 'flex', gap: 8, marginBottom: 8 },
  searchBtn: {
    padding: '10px 16px', background: '#333', color: '#fff', border: 'none',
    borderRadius: 8, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap',
  },
  searchResults: {
    border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', marginBottom: 8,
  },
  searchItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
    transition: 'background 0.1s',
  },
  searchNickname: { fontWeight: 600, fontSize: 14 },
  searchId: { color: '#999', fontSize: 12 },
  checkmark: { marginLeft: 'auto', color: '#d6483e', fontWeight: 700 },
  selectedChips: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: '#fff3e0', border: '1px solid #ffcc80',
    borderRadius: 20, padding: '4px 12px', fontSize: 13,
  },
  chipRemove: { background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 14, padding: 0 },
  sendBtn: {
    width: '100%', padding: '14px', background: '#d6483e', color: '#fff',
    border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700,
    cursor: 'pointer', marginTop: 8,
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: 12, padding: 28, width: 360,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  modalTitle: { margin: '0 0 12px', fontSize: 18, fontWeight: 700 },
  modalMessage: { color: '#444', marginBottom: 24, lineHeight: 1.6 },
  modalButtons: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  cancelBtn: {
    padding: '10px 20px', background: '#f5f5f5', border: '1px solid #ddd',
    borderRadius: 8, cursor: 'pointer', fontSize: 14,
  },
  confirmBtn: {
    padding: '10px 20px', background: '#d6483e', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700,
  },
};
