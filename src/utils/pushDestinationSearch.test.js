import assert from 'node:assert/strict';
import test from 'node:test';
import { describePushDestinationItem, getPushDestinationSearch } from './pushDestinationSearch.js';

test('검색한 사용자·식당의 ID를 각각 올바른 API로 조회한다', () => {
  assert.deepEqual(getPushDestinationSearch('userId', ' 인하대 '), { url: '/api/v1/admin/users/search', params: { query: '인하대' } });
  assert.deepEqual(getPushDestinationSearch('restaurantId', '7'), { url: '/api/v1/admin/restaurants/search', params: { query: '7' } });
  assert.equal(getPushDestinationSearch('userId', '  '), null);
  assert.equal(getPushDestinationSearch('postId', '글'), null);
});
test('동명이인·동명 식당을 구분할 정보와 실제 ID를 표시한다', () => {
  assert.equal(describePushDestinationItem('userId', { id: 7, nickname: '유저', isProfilePublic: false }), '유저 #7 · 비공개');
  assert.equal(describePushDestinationItem('restaurantId', { id: 31, name: '식당', addr: '인천 미추홀구' }), '식당 #31 · 인천 미추홀구');
});
