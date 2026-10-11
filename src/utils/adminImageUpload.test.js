import test from 'node:test';
import assert from 'node:assert/strict';
import { sendAdminImage } from './adminImageUpload.js';

test('관리자 API로 파일과 폴더를 전송하고 기존 URL 형태로 반환한다', async () => {
  for (const [folder, type, name] of [['restaurants', 'image/jpeg', 'photo.jpg'], ['badges', 'image/png', 'badge.png'], ['badges', 'image/webp', 'badge.webp']]) {
    const file = new File(['image bytes'], name, { type });
    const client = { async post(path, form, config) {
      assert.equal(path, '/api/v1/admin/images/upload');
      assert.equal(form.get('folder'), folder);
      assert.equal(form.get('file').type, type);
      assert.equal(form.get('file').name, name);
      assert.equal(await form.get('file').text(), 'image bytes');
      assert.equal(config.headers['Content-Type'], undefined);
      return { data: { data: { url: 'https://example.com/uploaded.png' } } };
    } };
    assert.equal(await sendAdminImage(client, file, folder), 'https://example.com/uploaded.png');
  }
});

test('폴더 생략 시 기존 가게 폴더를 사용한다', async () => {
  const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
  await sendAdminImage({ async post(_path, form) {
    assert.equal(form.get('folder'), 'restaurants');
    return { data: { data: { url: 'https://example.com/photo.jpg' } } };
  } }, file);
});

test('인증·저장 실패와 잘못된 URL 응답을 성공으로 처리하지 않는다', async () => {
  const file = new File(['image'], 'photo.jpg');
  const failure = new Error('upload failed');
  await assert.rejects(sendAdminImage({ post: async () => { throw failure; } }, file), failure);
  await assert.rejects(sendAdminImage({ post: async () => { throw { response: { data: { message: '이미지 업로드에 실패했습니다.' } } }; } }, file), /이미지 업로드에 실패/);
  for (const url of [undefined, 'javascript:alert(1)', 'http://example.com/photo.jpg']) {
    await assert.rejects(sendAdminImage({ post: async () => ({ data: { data: { url } } }) }, file), /이미지 주소/);
  }
});
