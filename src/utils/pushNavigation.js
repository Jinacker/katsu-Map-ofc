export const LEGACY_PUSH_OPTIONS = [
  { type: '', label: '기본 동작 — 별도 화면 이동 없음', needsNoteId: false },
  { type: 'like', label: '기존 좋아요 알림 — 게시글 댓글', needsNoteId: true },
  { type: 'comment', label: '기존 댓글 알림 — 게시글 상세', needsNoteId: true },
  { type: 'reply', label: '기존 답글 알림 — 게시글 상세', needsNoteId: true },
  { type: 'inquiry', label: '기존 문의 답변 알림 — 메시지함', needsNoteId: false },
  { type: 'pendingPlaceApproved', label: '기존 가게 승인 알림 — 내 테이스팅', needsNoteId: true },
];

export const PUSH_ID_LABELS = { userId: '사용자 ID', restaurantId: '식당 ID', noteId: '게시글 ID', postId: '백과 글 ID' };

function parseId(value, label) {
  if (!/^\d+$/.test(String(value).trim())) throw new Error(`${label}를 입력해주세요.`);
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) throw new Error(`${label}는 유효한 양의 정수여야 합니다.`);
  return id;
}

export function buildPushPayload({ title, body, userIds, target = '', targetId = '', legacyType = '', legacyNoteId = '' }, catalog) {
  const payload = { title, body, ...(userIds?.length ? { userIds: [...userIds] } : {}) };
  if (target) {
    if (catalog?.version !== 1 || !Array.isArray(catalog.destinations)) throw new Error('이동 목적지를 불러오지 못했어요. 다시 시도해주세요.');
    const destination = catalog.destinations.find((item) => item.target === target);
    if (!destination) throw new Error('지원하지 않는 이동 목적지입니다.');
    payload.navigation = {
      version: 1,
      target,
      params: destination.idKey ? { [destination.idKey]: parseId(targetId, PUSH_ID_LABELS[destination.idKey] || '상세 ID') } : {},
    };
  }
  if (legacyType) {
    const legacy = LEGACY_PUSH_OPTIONS.find((item) => item.type === legacyType);
    if (!legacy) throw new Error('지원하지 않는 기존 알림 동작입니다.');
    payload.legacy = {
      type: legacyType,
      ...(legacy.needsNoteId ? { noteId: parseId(legacyNoteId, '구버전용 게시글 ID') } : {}),
    };
  }
  return payload;
}

export function describePushDestinations(payload, catalog) {
  const legacy = LEGACY_PUSH_OPTIONS.find((item) => item.type === (payload?.legacy?.type || ''));
  const oldDestination = `${legacy?.label || '기본 동작'}${payload?.legacy?.noteId ? ` #${payload.legacy.noteId}` : ''}`;
  const destination = catalog?.destinations?.find((item) => item.target === payload?.navigation?.target);
  const id = destination?.idKey ? payload.navigation.params[destination.idKey] : null;
  return {
    legacy: oldDestination,
    updated: destination ? `${destination.label}${id ? ` #${id}` : ''}` : oldDestination,
  };
}
