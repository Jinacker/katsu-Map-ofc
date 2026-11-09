import { logAdminError } from '../utils/safeLogger';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  awardAdminBadge,
  createAdminBadge,
  getAdminBadges,
  getAdminUserBadges,
  revokeAdminBadge,
  searchAdminUsers,
  updateAdminBadge,
} from '../api/badges';
import { uploadImageToGCS } from '../api/gcs';
import { awardSelectedUsers, hasAwardBadge } from '../utils/batchBadgeAward';
import './BadgesPage.css';

const METRICS = [
  ['APP_VISIT_DAYS', '앱 방문일수'],
  ['RECORD_COUNT', '기록 수'],
  ['COMMENT_COUNT', '커뮤니티 댓글 수'],
  ['DISTINCT_AREAS', '서로 다른 지역 수'],
  ['MAX_RECORDS_IN_AREA', '한 지역 최대 기록 수'],
  ['DISTINCT_RESTAURANT_COUNT', '서로 다른 식당 기록 수'],
  ['DISTINCT_SEOUL_RESTAURANT_COUNT', '서울 서로 다른 식당 기록 수'],
  ['DISTINCT_JEONNAM_GWANGJU_RESTAURANT_COUNT', '전남·광주 서로 다른 식당 기록 수'],
  ['VALID_COMMUNICATION_COUNT', '유효 소통 수'],
  ['RECORD_COUNT_IN_REGION:SEOUL', '서울 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:BUSAN', '부산 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:DAEGU', '대구 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:INCHEON', '인천 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:GWANGJU', '광주 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:DAEJEON', '대전 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:ULSAN', '울산 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:SEJONG', '세종 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:GYEONGGI', '경기도 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:GANGWON', '강원도 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:CHUNGBUK', '충청북도 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:CHUNGNAM', '충청남도 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:JEONBUK', '전북 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:JEONNAM', '전남 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:JEONNAM_GWANGJU', '전남·광주 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:GYEONGBUK', '경북 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:GYEONGNAM', '경남 지역 기록 수'],
  ['RECORD_COUNT_IN_REGION:JEJU', '제주 지역 기록 수'],
];

const emptyForm = (type) => ({
  code: '',
  name: '',
  description: '',
  type,
  metricKey: type === 'QUEST' ? 'RECORD_COUNT' : null,
  imageUrl: '',
  displayOrder: 0,
  isActive: true,
  levels: type === 'QUEST'
    ? [1, 5, 15, 30, 60, 100, 200].map((threshold, index) => ({ level: index + 1, threshold, imageUrl: '' }))
    : [],
});

const unwrap = (response) => response?.data?.data ?? response?.data;

const resolveImageUrl = (imageUrl) => {
  if (!imageUrl || /^(https?:|data:)/i.test(imageUrl)) return imageUrl || '';
  const base = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return `${base}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
};

const errorMessage = (error, fallback) => {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join('\n') : message || fallback;
};

export default function BadgesPage() {
  const [tab, setTab] = useState('QUEST');
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState(null);
  const [form, setForm] = useState(emptyForm('QUEST'));
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [batchFeedback, setBatchFeedback] = useState('');
  const [awardReason, setAwardReason] = useState('이벤트 및 운영 수여');
  const [userLoading, setUserLoading] = useState(false);
  const [awardBadge, setAwardBadge] = useState(null);
  const [awardSaving, setAwardSaving] = useState(false);
  const [toast, setToast] = useState('');
  const awardDialogRef = useRef(null);
  const awardSearchRef = useRef(null);
  const awardBusyRef = useRef(false);
  const userRequestRef = useRef(0);

  const visibleBadges = useMemo(
    () => badges.filter((badge) => badge.type === tab),
    [badges, tab],
  );
  const selectedOwned = selectedUsers.length === 1 && selectedUsers[0].ownsBadge;
  const awardableCount = selectedUsers.filter((user) => !user.ownsBadge).length;

  const loadBadges = async () => {
    try {
      setLoading(true);
      const response = await getAdminBadges();
      setBadges(unwrap(response) || []);
    } catch (error) {
      logAdminError(error, '뱃지 요청 실패');
      alert(errorMessage(error, '뱃지 목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBadges(); }, []);

  useEffect(() => {
    if (awardBadge) {
      awardDialogRef.current?.showModal();
      awardSearchRef.current?.focus();
    }
  }, [awardBadge]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const openAward = (badge) => {
    if (awardBusyRef.current) return;
    userRequestRef.current += 1;
    setUserQuery('');
    setUserResults([]);
    setSelectedUsers([]);
    setBatchFeedback('');
    setAwardReason('이벤트 및 운영 수여');
    setUserLoading(false);
    setToast('');
    setAwardBadge(badge);
  };

  const closeAward = () => {
    if (awardBusyRef.current) return;
    userRequestRef.current += 1;
    setAwardBadge(null);
  };

  const openCreate = () => {
    setEditingBadge(null);
    setForm(emptyForm(tab));
    setImageDragOver(false);
    setModalOpen(true);
  };

  const openEdit = (badge) => {
    setEditingBadge(badge);
    setForm({
      code: badge.code,
      name: badge.name,
      description: badge.description,
      type: badge.type,
      metricKey: badge.metricKey,
      imageUrl: badge.imageUrl,
      displayOrder: badge.displayOrder,
      isActive: badge.isActive,
      levels: (badge.levels || []).map((level) => ({
        level: level.level,
        threshold: level.threshold,
        imageUrl: level.imageUrl || '',
      })),
    });
    setImageDragOver(false);
    setModalOpen(true);
  };

  const uploadBadgeImage = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    try {
      setUploadingImage(true);
      const imageUrl = await uploadImageToGCS(file, 'badges', { preserveTransparency: true });
      setForm((current) => ({ ...current, imageUrl }));
    } catch (error) {
      logAdminError(error, '뱃지 요청 실패');
      alert(errorMessage(error, '이미지를 업로드하지 못했습니다.'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageFileChange = async (event) => {
    const file = event.target.files?.[0];
    await uploadBadgeImage(file);
    event.target.value = '';
  };

  const handleImagePaste = async (event) => {
    const imageItem = [...(event.clipboardData?.items || [])]
      .find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    event.preventDefault();
    await uploadBadgeImage(imageItem.getAsFile());
  };

  const handleImageDrop = async (event) => {
    event.preventDefault();
    setImageDragOver(false);
    await uploadBadgeImage(event.dataTransfer.files?.[0]);
  };

  const updateLevel = (index, field, value) => {
    setForm((current) => ({
      ...current,
      levels: current.levels.map((level, levelIndex) => (
        levelIndex === index
          ? { ...level, [field]: field === 'imageUrl' ? value : Number(value) }
          : level
      )),
    }));
  };

  const addLevel = () => {
    setForm((current) => {
      const last = current.levels[current.levels.length - 1];
      return {
        ...current,
        levels: [...current.levels, {
          level: (last?.level || 0) + 1,
          threshold: (last?.threshold || 0) + 1,
          imageUrl: '',
        }],
      };
    });
  };

  const submitBadge = async (event) => {
    event.preventDefault();
    const payload = {
      name: form.name,
      description: form.description,
      type: form.type,
      metricKey: form.type === 'QUEST' ? form.metricKey : null,
      imageUrl: form.imageUrl,
      displayOrder: Number(form.displayOrder),
      isActive: form.isActive,
      levels: form.type === 'QUEST'
        ? form.levels.map((level) => ({
          level: Number(level.level),
          threshold: Number(level.threshold),
          imageUrl: level.imageUrl || null,
        }))
        : [],
    };
    if (!editingBadge) payload.code = form.code.trim().toUpperCase();

    try {
      setSaving(true);
      if (editingBadge) await updateAdminBadge(editingBadge.id, payload);
      else await createAdminBadge(payload);
      setModalOpen(false);
      await loadBadges();
    } catch (error) {
      alert(errorMessage(error, '뱃지를 저장하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  const searchUsers = async (event) => {
    event.preventDefault();
    if (!userQuery.trim() || userLoading || awardBusyRef.current) return;
    const request = ++userRequestRef.current;
    try {
      setUserLoading(true);
      setUserResults([]);
      const response = await searchAdminUsers(userQuery.trim());
      if (request !== userRequestRef.current) return;
      setUserResults(unwrap(response) || []);
    } catch (error) {
      if (request !== userRequestRef.current) return;
      alert(errorMessage(error, '사용자를 검색하지 못했습니다.'));
    } finally {
      if (request === userRequestRef.current) setUserLoading(false);
    }
  };

  const selectUser = async (user) => {
    if (userLoading || awardBusyRef.current) return;
    if (selectedUsers.some((item) => item.id === user.id)) {
      setSelectedUsers((current) => current.filter((item) => item.id !== user.id));
      setBatchFeedback('');
      return;
    }
    const request = ++userRequestRef.current;
    try {
      setUserLoading(true);
      const response = await getAdminUserBadges(user.id);
      if (request !== userRequestRef.current) return;
      setSelectedUsers((current) => [...current, { ...user, ownsBadge: hasAwardBadge(response, awardBadge.id) }]);
      setBatchFeedback('');
    } catch (error) {
      if (request !== userRequestRef.current) return;
      alert(errorMessage(error, '사용자 뱃지를 불러오지 못했습니다.'));
    } finally {
      if (request === userRequestRef.current) setUserLoading(false);
    }
  };

  const toggleAward = async (badge) => {
    if (awardBusyRef.current || userLoading) return;
    if (!selectedUsers.length) {
      alert('먼저 사용자를 선택해주세요.');
      return;
    }
    if (selectedOwned && !confirm(`${selectedUsers[0].nickname || selectedUsers[0].id} 사용자에게서 ${badge.name} 뱃지를 회수할까요?`)) {
      return;
    }
    try {
      awardBusyRef.current = true;
      setAwardSaving(true);
      setBatchFeedback('');
      if (selectedOwned) {
        await revokeAdminBadge(badge.id, selectedUsers[0].id);
        userRequestRef.current += 1;
        setAwardBadge(null);
        setToast(`${selectedUsers[0].nickname || selectedUsers[0].id}님의 ${badge.name} 뱃지를 회수했습니다.`);
        await loadBadges();
        return;
      }
      const result = await awardSelectedUsers({
        users: selectedUsers, badgeId: badge.id, reason: awardReason.trim(),
        getUserBadges: getAdminUserBadges, awardBadge: awardAdminBadge,
      });
      const summary = `수여 ${result.awarded.length}명 · 기존 보유로 건너뜀 ${result.skipped.length}명 · 실패 ${result.failed.length}명`;
      if (result.failed.length) {
        const failedIds = new Set(result.failed.map(({ user }) => user.id));
        setSelectedUsers((current) => current.filter((user) => failedIds.has(user.id)));
        setBatchFeedback(`${summary}\n실패: ${result.failed.map(({ user, error }) => `${user.nickname || '닉네임 없음'} (ID ${user.id}): ${errorMessage(error, '요청 실패')}`).join('\n')}\n실패한 사용자만 남겨두었습니다. 다시 시도할 수 있습니다.`);
      } else {
        userRequestRef.current += 1;
        setAwardBadge(null);
        setToast(`${badge.name}: ${summary}`);
      }
      if (result.awarded.length) await loadBadges();
    } catch (error) {
      alert(errorMessage(error, selectedOwned ? '뱃지를 회수하지 못했습니다.' : '뱃지를 수여하지 못했습니다.'));
    } finally {
      awardBusyRef.current = false;
      setAwardSaving(false);
    }
  };

  return (
    <div className="badge-admin-page">
      <header className="badge-admin-header">
        <div>
          <h1>뱃지 관리</h1>
          <p>앱 업데이트 없이 뱃지 정의·이미지·레벨 조건과 사용자 수여 상태를 관리합니다.</p>
        </div>
        <button type="button" className="badge-primary-button" onClick={openCreate}>새 뱃지</button>
      </header>

      <div className="badge-admin-tabs">
        <button type="button" className={tab === 'QUEST' ? 'active' : ''} onClick={() => setTab('QUEST')}>
          퀘스트 뱃지
        </button>
        <button type="button" className={tab === 'AWARD' ? 'active' : ''} onClick={() => setTab('AWARD')}>
          수여 뱃지
        </button>
      </div>

      {loading ? (
        <div className="badge-loading">뱃지 목록을 불러오는 중...</div>
      ) : (
        <div className="badge-admin-grid">
          {visibleBadges.map((badge) => {
            return (
              <article key={badge.id} className={`badge-admin-card ${!badge.isActive ? 'inactive' : ''}`}>
                <div className="badge-card-top">
                  <img src={resolveImageUrl(badge.imageUrl)} alt="" />
                  <div>
                    <div className="badge-card-tags">
                      <span>{badge.type === 'QUEST' ? '퀘스트' : '수여'}</span>
                      <span className={badge.isActive ? 'active' : 'inactive'}>{badge.isActive ? '활성' : '비활성'}</span>
                    </div>
                    <h3>{badge.name}</h3>
                    <code>{badge.code}</code>
                  </div>
                </div>
                <p className="badge-card-description">{badge.description}</p>
                {badge.type === 'QUEST' ? (
                  <div className="badge-level-summary">
                    <strong>{METRICS.find(([key]) => key === badge.metricKey)?.[1] || badge.metricKey}</strong>
                    <span>{badge.levels.map((level) => `Lv.${level.level} ${level.threshold}`).join(' · ')}</span>
                  </div>
                ) : (
                  <div className="badge-level-summary"><strong>현재 보유</strong><span>{badge._count?.userBadges ?? 0}명</span></div>
                )}
                <div className="badge-card-actions">
                  <button type="button" onClick={() => openEdit(badge)}>정의 수정</button>
                  {badge.type === 'AWARD' && (
                    <button type="button" className="award" onClick={() => openAward(badge)}>
                      수여
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {visibleBadges.length === 0 && <div className="badge-empty">등록된 뱃지가 없습니다.</div>}
        </div>
      )}

      {toast && <div className="badge-toast" role="status">{toast}</div>}

      {awardBadge && (
        <dialog ref={awardDialogRef} className="badge-modal badge-award-modal" aria-labelledby="badge-award-title"
          onCancel={(event) => { event.preventDefault(); closeAward(); }}>
          <header>
            <h2 id="badge-award-title">{awardBadge.name} 수여</h2>
            <button type="button" aria-label="수여 창 닫기" disabled={awardSaving} onClick={closeAward}>×</button>
          </header>
          <section className="badge-award-panel" aria-label="사용자 수여 관리">
            <div className="badge-award-search">
              <h3>사용자 검색</h3>
              <form onSubmit={searchUsers}>
                <input ref={awardSearchRef} aria-label="사용자 ID 또는 닉네임" value={userQuery} disabled={userLoading || awardSaving}
                  onChange={(event) => setUserQuery(event.target.value)} placeholder="사용자 ID 또는 닉네임" />
                <button type="submit" disabled={userLoading || awardSaving || !userQuery.trim()}>검색</button>
              </form>
              {userLoading && <p role="status">사용자 정보를 불러오는 중...</p>}
              {userResults.length > 0 && (
                <div className="badge-user-results">
                  {userResults.map((user) => (
                    <label className="badge-user-result" key={user.id}>
                      <input type="checkbox" checked={selectedUsers.some((item) => item.id === user.id)}
                        disabled={userLoading || awardSaving} onChange={() => selectUser(user)}
                        aria-label={`${user.nickname || '닉네임 없음'} ID ${user.id} 선택`} />
                      <strong>{user.nickname || '닉네임 없음'}</strong><span>ID {user.id}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="badge-selected-user">
              {selectedUsers.length ? (
                <>
                  <strong>선택한 사용자 {selectedUsers.length}명</strong>
                  <div className="badge-selected-list">
                    {selectedUsers.map((user) => <div className="badge-selected-row" key={user.id}>
                      <div><strong>{user.nickname || '닉네임 없음'}</strong><span>ID {user.id}{user.ownsBadge ? ' · 이미 보유' : ''}</span></div>
                      <button type="button" disabled={awardSaving || userLoading} aria-label={`${user.nickname || '닉네임 없음'} ID ${user.id} 선택 해제`}
                        onClick={() => { setSelectedUsers((current) => current.filter((item) => item.id !== user.id)); setBatchFeedback(''); }}>×</button>
                    </div>)}
                  </div>
                  {selectedOwned ? <p>이미 이 뱃지를 보유한 사용자입니다. 아래 버튼으로 회수할 수 있습니다.</p> : (
                    <>
                      {selectedUsers.some((user) => user.ownsBadge) && <p>이미 보유한 사용자는 수여 시 건너뜁니다. 회수하려면 해당 사용자만 선택하세요.</p>}
                      <label>공개 수여 사유<input value={awardReason} disabled={awardSaving || userLoading}
                        onChange={(event) => setAwardReason(event.target.value)} maxLength={300} /></label>
                      <small>입력한 사유는 선택한 사용자의 앱 프로필 뱃지 상세에 동일하게 공개됩니다.</small>
                    </>
                  )}
                </>
              ) : <p>뱃지를 수여할 사용자를 검색해 선택하세요.</p>}
            </div>
            {batchFeedback && <p className="badge-batch-feedback" role="status">{batchFeedback}</p>}
            {!awardBadge.isActive && <p className="badge-award-notice">비활성 뱃지는 수여할 수 없으며, 기존 보유자의 뱃지만 회수할 수 있습니다.</p>}
            <footer>
              <button type="button" disabled={awardSaving} onClick={closeAward}>취소</button>
              <button type="button" className={selectedOwned ? 'badge-revoke-button' : 'badge-primary-button'}
                disabled={!selectedUsers.length || userLoading || awardSaving || (!selectedOwned && (!awardBadge.isActive || !awardableCount))}
                onClick={() => toggleAward(awardBadge)}>
                {awardSaving ? '처리 중...' : selectedOwned ? '회수' : selectedUsers.length > 1 ? `${awardableCount}명 수여하기` : '수여하기'}
              </button>
            </footer>
          </section>
        </dialog>
      )}

      {modalOpen && (
        <div className="badge-modal-backdrop" onMouseDown={() => setModalOpen(false)}>
          <div className="badge-modal" onMouseDown={(event) => event.stopPropagation()}>
            <header><h2>{editingBadge ? '뱃지 정의 수정' : '새 뱃지 만들기'}</h2><button type="button" onClick={() => setModalOpen(false)}>×</button></header>
            <form onSubmit={submitBadge} onPaste={handleImagePaste}>
              <div className="badge-form-grid">
                <label>유형<input value={form.type === 'QUEST' ? '퀘스트 뱃지' : '수여 뱃지'} disabled /></label>
                <label>코드<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} disabled={!!editingBadge} placeholder="NEW_BADGE_CODE" required /></label>
                <label>이름<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={60} required /></label>
                <label>표시 순서<input type="number" min="0" value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: event.target.value })} required /></label>
                <label className="wide">설명<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={300} rows="3" required /></label>
                <label className="wide">이미지 URL<input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="HTTPS 이미지 URL을 입력하거나 아래에 이미지를 올려주세요" required /></label>
                <div
                  className={`badge-image-uploader wide ${imageDragOver ? 'drag-over' : ''} ${uploadingImage ? 'uploading' : ''}`}
                  onDragOver={(event) => { event.preventDefault(); setImageDragOver(true); }}
                  onDragLeave={() => setImageDragOver(false)}
                  onDrop={handleImageDrop}
                >
                  {form.imageUrl ? (
                    <img src={resolveImageUrl(form.imageUrl)} alt="뱃지 미리보기" />
                  ) : (
                    <div className="badge-upload-placeholder">+</div>
                  )}
                  <div>
                    <strong>{uploadingImage ? '이미지 업로드 중...' : '이미지를 붙여넣거나 끌어놓으세요'}</strong>
                    <span>투명 PNG 또는 WebP 권장 · 512×512px 정사각형으로 올리면 선명하게 표시됩니다.</span>
                  </div>
                  <label className={`badge-image-file-button ${uploadingImage ? 'disabled' : ''}`}>
                    {uploadingImage ? '업로드 중' : '파일 선택'}
                    <input type="file" accept="image/*" onChange={handleImageFileChange} disabled={uploadingImage} />
                  </label>
                </div>
                <label className="badge-checkbox wide"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />앱에 활성 상태로 노출</label>
              </div>

              {form.type === 'QUEST' && (
                <section className="badge-level-editor">
                  {editingBadge && (
                    <p className="badge-definition-warning">
                      현재 획득 이력 {editingBadge._count?.userBadges ?? 0}명 · 생성 후에는 지표 변경과 기존 레벨 삭제가 제한됩니다. 기준값을 바꾸면 보유자의 레벨도 다시 계산됩니다.
                    </p>
                  )}
                  <label>자동 계산 지표<select value={form.metricKey} onChange={(event) => setForm({ ...form, metricKey: event.target.value })}>{METRICS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
                  <div className="badge-level-editor-header"><h3>레벨 조건</h3><button type="button" onClick={addLevel} disabled={form.levels.length >= 7}>레벨 추가</button></div>
                  {form.levels.map((level, index) => (
                    <div className="badge-level-row" key={`${level.level}-${index}`}>
                      <label>레벨<input type="number" min="1" max="7" value={level.level} onChange={(event) => updateLevel(index, 'level', event.target.value)} required /></label>
                      <label>기준값<input type="number" min="1" value={level.threshold} onChange={(event) => updateLevel(index, 'threshold', event.target.value)} required /></label>
                      <label>전용 이미지 URL<input value={level.imageUrl} onChange={(event) => updateLevel(index, 'imageUrl', event.target.value)} placeholder="비우면 대표 이미지" /></label>
                      <button type="button" className="badge-remove-level" disabled={form.levels.length === 1} onClick={() => setForm({ ...form, levels: form.levels.filter((_, itemIndex) => itemIndex !== index) })}>삭제</button>
                    </div>
                  ))}
                  <p>퀘스트는 Lv.7이 최고입니다. 기준값을 변경하면 현재 최고 활동값을 기준으로 레벨이 다시 계산됩니다.</p>
                </section>
              )}

              <footer><button type="button" onClick={() => setModalOpen(false)}>취소</button><button type="submit" className="badge-primary-button" disabled={saving || uploadingImage}>{saving ? '저장 중...' : uploadingImage ? '업로드 중...' : '저장'}</button></footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
