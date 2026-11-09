import test from 'node:test';
import assert from 'node:assert/strict';
import { awardSelectedUsers } from './batchBadgeAward.js';

const response = (owned = false) => ({ data: { data: { badges: owned ? [{ badgeId: 8, badge: { type: 'AWARD' } }] : [] } } });

test('선택한 사용자를 순서대로 수여하고 기존 보유자와 중복 선택은 건너뛴다', async () => {
  const calls = [];
  const result = await awardSelectedUsers({
    users: [{ id: 1 }, { id: 2 }, { id: 1 }, { id: 3 }], badgeId: 8, reason: '참여 감사',
    getUserBadges: async (id) => { calls.push(`check:${id}`); return response(id === 2); },
    awardBadge: async (badgeId, id, reason) => { calls.push(`award:${badgeId}:${id}:${reason}`); },
  });
  assert.deepEqual(calls, ['check:1', 'award:8:1:참여 감사', 'check:2', 'check:3', 'award:8:3:참여 감사']);
  assert.deepEqual(result.awarded.map((user) => user.id), [1, 3]);
  assert.deepEqual(result.skipped.map((user) => user.id), [2]);
  assert.equal(result.failed.length, 0);
});

test('사용자별 조회·수여 실패를 남기고 나머지는 계속 처리한다', async () => {
  const calls = [];
  const result = await awardSelectedUsers({
    users: [{ id: 1 }, { id: 2 }, { id: 3 }], badgeId: 8, reason: '',
    getUserBadges: async (id) => { if (id === 1) throw new Error('조회 실패'); return response(); },
    awardBadge: async (_badge, id) => { calls.push(id); if (id === 2) throw new Error('수여 실패'); },
  });
  assert.deepEqual(calls, [2, 3]);
  assert.deepEqual(result.failed.map(({ user }) => user.id), [1, 2]);
  assert.deepEqual(result.awarded.map((user) => user.id), [3]);
});

test('응답 유실 후 재시도 시 이미 수여된 사용자의 사유를 덮어쓰지 않는다', async () => {
  let held = false;
  let writes = 0;
  const args = {
    users: [{ id: 1 }], badgeId: 8, reason: '최초 사유',
    getUserBadges: async () => response(held),
    awardBadge: async () => { writes++; held = true; throw new Error('응답 유실'); },
  };
  assert.equal((await awardSelectedUsers(args)).failed.length, 1);
  assert.equal((await awardSelectedUsers(args)).skipped.length, 1);
  assert.equal(writes, 1);
});

test('선택할 때 이미 보유한 사용자는 재조회 장애와 관계없이 건너뛴다', async () => {
  const result = await awardSelectedUsers({
    users: [{ id: 1, ownsBadge: true }], badgeId: 8, reason: '사유',
    getUserBadges: async () => { throw new Error('호출되면 안 됨'); },
    awardBadge: async () => { throw new Error('호출되면 안 됨'); },
  });
  assert.deepEqual(result.skipped.map((user) => user.id), [1]);
  assert.equal(result.failed.length, 0);
});
