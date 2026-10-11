import assert from 'node:assert/strict';
import test from 'node:test';
import { searchRestaurants } from './restaurantQuickSearch.js';

const restaurants = [
  { id: 1, name: '카츠 지도', addr: '서울 강남구 테헤란로 123', area: '강남', isActive: true },
  { id: 10, name: '카츠 지도', addr: '부산 해운대구 달맞이길', area: '해운대', isActive: false },
  { id: 42, name: 'KATSU House', addr: null, area: '전남광주' },
];

test('이름 검색은 공백·대소문자를 정규화하고 동명 가게와 비활성 가게를 모두 유지한다', () => {
  assert.deepEqual(searchRestaurants(restaurants, '카츠지도').map((r) => r.id), [1, 10]);
  assert.deepEqual(searchRestaurants(restaurants, ' katsu house ').map((r) => r.id), [42]);
});

test('주소·지역으로 동명 가게를 구분하고 주소가 없는 가게도 검색한다', () => {
  assert.deepEqual(searchRestaurants(restaurants, '부산 해운대').map((r) => r.id), [10]);
  assert.deepEqual(searchRestaurants(restaurants, '전남 광주').map((r) => r.id), [42]);
});

test('숫자 ID는 정확히 일치하고 # 접두어와 전각 숫자를 처리한다', () => {
  assert.deepEqual(searchRestaurants(restaurants, '#1').map((r) => r.id), [1]);
  assert.deepEqual(searchRestaurants(restaurants, '４２').map((r) => r.id), [42]);
  assert.deepEqual(searchRestaurants(restaurants, '#999'), []);
});

test('빈 검색·결과 없음·누락된 필드를 안전하게 처리하고 원본 목록을 변경하지 않는다', () => {
  const before = structuredClone(restaurants);
  assert.deepEqual(searchRestaurants(restaurants, '  '), []);
  assert.deepEqual(searchRestaurants(restaurants, '없는 가게'), []);
  assert.deepEqual(searchRestaurants([{ id: 5 }], '서울'), []);
  assert.deepEqual(searchRestaurants([{ id: 5 }], '#5'), [{ id: 5 }]);
  assert.deepEqual(restaurants, before);
});
