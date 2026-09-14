import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPushPayload, describePushDestinations } from './pushNavigation.js';

const catalog = { version: 1, destinations: [
  { target: 'home', label: '홈', idKey: null },
  { target: 'profile', label: '프로필', idKey: 'userId' },
] };

test('기존 입력은 기존 요청 그대로 유지한다', () => {
  assert.deepEqual(buildPushPayload({ title: '제목', body: '내용' }, null), { title: '제목', body: '내용' });
});
test('새 목적지와 기존 알림 동작을 함께 보내고 확인 문구를 만든다', () => {
  const payload = buildPushPayload({ title: '제목', body: '내용', target: 'profile', targetId: '7', legacyType: 'like', legacyNoteId: '31' }, catalog);
  assert.deepEqual(payload.navigation, { version: 1, target: 'profile', params: { userId: 7 } });
  assert.deepEqual(payload.legacy, { type: 'like', noteId: 31 });
  assert.deepEqual(describePushDestinations(payload, catalog), { legacy: '기존 좋아요 알림 — 게시글 댓글 #31', updated: '프로필 #7' });
});
test('목적지가 없는 경우 업데이트 앱도 기존 알림 동작을 사용한다', () => {
  const payload = buildPushPayload({ title: '제목', body: '내용', legacyType: 'inquiry' }, catalog);
  assert.equal(describePushDestinations(payload, catalog).updated, describePushDestinations(payload, catalog).legacy);
});
test('목적지 목록 오류와 잘못된 ID로는 확인·발송하지 않는다', () => {
  for (const id of ['', '0', '-1', '1.5', '7abc', '2147483648']) {
    assert.throws(() => buildPushPayload({ target: 'profile', targetId: id }, catalog));
  }
  assert.throws(() => buildPushPayload({ target: 'profile', targetId: '7' }, null));
  assert.throws(() => buildPushPayload({ target: 'unknown' }, catalog));
  assert.throws(() => buildPushPayload({ legacyType: 'like', legacyNoteId: '' }, catalog));
});
test('확인한 수신자 목록은 이후 폼 변경에 영향받지 않는다', () => {
  const userIds = [7];
  const payload = buildPushPayload({ title: '제목', body: '내용', userIds }, catalog);
  userIds.push(8);
  assert.deepEqual(payload.userIds, [7]);
});
