import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLaunchBannerPayload, EMPTY_LAUNCH_BANNER_FORM, launchBannerToForm } from './launchBannerForm.js';

const catalog = { version: 1, destinations: [{ target: 'home', label: '홈', idKey: null },
  { target: 'encyclopedia_post', label: '백과 글', idKey: 'postId' }] };
const form = { ...EMPTY_LAUNCH_BANNER_FORM, enabled: true, title: ' 배너 ', imageUrl: 'https://example.com/banner.jpg', target: 'encyclopedia_post', targetId: '9' };

test('배너 저장은 기존 화면 이동 계약과 generation을 유지한다', () => {
  const payload = buildLaunchBannerPayload(form, '9007199254740999', catalog);
  assert.equal(payload.generation, '9007199254740999');
  assert.equal(payload.title, '배너');
  assert.deepEqual(payload.navigation, { version: 1, target: 'encyclopedia_post', params: { postId: 9 } });
  assert.deepEqual(launchBannerToForm(payload, catalog), { ...form, title: '배너' });
});

test('최초 미노출 설정은 이미지나 목적지 없이 유지할 수 있다', () => {
  assert.deepEqual(buildLaunchBannerPayload(EMPTY_LAUNCH_BANNER_FORM, null, catalog), {
    generation: null, enabled: false, title: '', imageUrl: '', imageAspectRatio: 1, navigation: null,
  });
});

test('필수 내용·HTTPS·이미지 비율·상세 ID·목적지 오류를 저장 전에 거부한다', () => {
  for (const patch of [{ title: '' }, { imageUrl: '' }, { imageUrl: 'javascript:alert(1)' },
    { imageAspectRatio: NaN }, { imageAspectRatio: 0.1 }, { imageAspectRatio: 6 },
    { targetId: '' }, { targetId: '9.1' }, { target: 'unknown' }, { target: '' }]) {
    assert.throws(() => buildLaunchBannerPayload({ ...form, ...patch }, null, catalog));
  }
  assert.throws(() => buildLaunchBannerPayload(form, null, null));
});
