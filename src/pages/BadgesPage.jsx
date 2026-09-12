import React, { useEffect, useMemo, useState } from 'react';
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [userInventory, setUserInventory] = useState([]);
  const [awardReason, setAwardReason] = useState('이벤트 및 운영 수여');
  const [userLoading, setUserLoading] = useState(false);

  const visibleBadges = useMemo(
    () => badges.filter((badge) => badge.type === tab),
    [badges, tab],
  );
  const ownedAwardIds = useMemo(
    () => new Set(userInventory.filter((item) => item.badge?.type === 'AWARD').map((item) => item.badgeId)),
    [userInventory],
  );

  const loadBadges = async () => {
    try {
      setLoading(true);
      const response = await getAdminBadges();
      setBadges(unwrap(response) || []);
    } catch (error) {
      console.error(error);
      alert(errorMessage(error, '뱃지 목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBadges(); }, []);

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
      console.error(error);
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
    if (!userQuery.trim()) return;
    try {
      setUserLoading(true);
      const response = await searchAdminUsers(userQuery.trim());
      setUserResults(unwrap(response) || []);
    } catch (error) {
      alert(errorMessage(error, '사용자를 검색하지 못했습니다.'));
    } finally {
      setUserLoading(false);
    }
  };

  const selectUser = async (user) => {
    setSelectedUser(user);
    setUserResults([]);
    try {
      setUserLoading(true);
      const response = await getAdminUserBadges(user.id);
      setUserInventory(unwrap(response)?.badges || []);
    } catch (error) {
      alert(errorMessage(error, '사용자 뱃지를 불러오지 못했습니다.'));
    } finally {
      setUserLoading(false);
    }
  };

  const refreshInventory = async () => {
    if (!selectedUser) return;
    const response = await getAdminUserBadges(selectedUser.id);
    setUserInventory(unwrap(response)?.badges || []);
  };

  const toggleAward = async (badge) => {
    if (!selectedUser) {
      alert('먼저 사용자를 선택해주세요.');
      return;
    }
    const owned = ownedAwardIds.has(badge.id);
    if (owned && !confirm(`${selectedUser.nickname || selectedUser.id} 사용자에게서 ${badge.name} 뱃지를 회수할까요?`)) {
      return;
    }
    try {
      if (owned) await revokeAdminBadge(badge.id, selectedUser.id);
      else await awardAdminBadge(badge.id, selectedUser.id, awardReason.trim());
      await Promise.all([refreshInventory(), loadBadges()]);
    } catch (error) {
      alert(errorMessage(error, owned ? '뱃지를 회수하지 못했습니다.' : '뱃지를 수여하지 못했습니다.'));
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

      {tab === 'AWARD' && (
        <section className="badge-award-panel">
          <div className="badge-award-search">
            <h2>사용자 수여 관리</h2>
            <form onSubmit={searchUsers}>
              <input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="사용자 ID 또는 닉네임" />
              <button type="submit" disabled={userLoading}>검색</button>
            </form>
            {userResults.length > 0 && (
              <div className="badge-user-results">
                {userResults.map((user) => (
                  <button type="button" key={user.id} onClick={() => selectUser(user)}>
                    <strong>{user.nickname || '닉네임 없음'}</strong><span>ID {user.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="badge-selected-user">
            {selectedUser ? (
              <>
                <div><strong>{selectedUser.nickname || '닉네임 없음'}</strong><span>ID {selectedUser.id}</span></div>
                <label>공개 수여 사유<input value={awardReason} onChange={(event) => setAwardReason(event.target.value)} maxLength={300} /></label>
                <small>입력한 사유는 사용자의 앱 프로필 뱃지 상세에 공개됩니다.</small>
                <p>아래 뱃지 카드의 버튼으로 지급하거나 회수할 수 있습니다.</p>
              </>
            ) : <p>수여 상태를 관리할 사용자를 검색해 선택하세요.</p>}
          </div>
        </section>
      )}

      {loading ? (
        <div className="badge-loading">뱃지 목록을 불러오는 중...</div>
      ) : (
        <div className="badge-admin-grid">
          {visibleBadges.map((badge) => {
            const owned = ownedAwardIds.has(badge.id);
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
                  {badge.type === 'AWARD' && selectedUser && (
                    <button type="button" className={owned ? 'revoke' : 'award'} disabled={!badge.isActive && !owned} onClick={() => toggleAward(badge)}>
                      {owned ? '회수' : '수여'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {visibleBadges.length === 0 && <div className="badge-empty">등록된 뱃지가 없습니다.</div>}
        </div>
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
