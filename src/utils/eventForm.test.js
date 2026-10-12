import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addEvent, updateEvent, sendEventAsset } from './eventForm.js';

test('새 ID 발급과 단일 활성 전환은 지난 이벤트를 보존한다', () => {
  const first = [{ id: 3, title: '이전', enabled: true }];
  const added = addEvent(first); assert.equal(added[1].id, 4); assert.equal(first.length, 1);
  const active = updateEvent(added, 4, { enabled: true }); assert.equal(active[0].enabled, false); assert.equal(active[1].enabled, true);
  assert.equal(updateEvent(active, 4, { title: '변경' })[0].title, '이전');
});
test('GIF는 캔버스 변환 없이 원본 FormData를 인증 API로 전송한다', async () => {
  const file = new File(['GIF89a'], 'button.gif', { type: 'image/gif' });
  const client = { post: async (url, data, options) => {
    assert.equal(url, '/api/v1/admin/events/assets'); assert.equal(options.headers['Content-Type'], undefined);
    assert.equal(data.get('file').type, 'image/gif'); assert.equal(await data.get('file').text(), 'GIF89a');
    return { data: { data: { url: 'https://example.com/a.gif' } } };
  } };
  assert.equal(await sendEventAsset(client, file), 'https://example.com/a.gif');
  await assert.rejects(sendEventAsset(client, new File(['x'], 'a.html', { type: 'text/html' })));
});
