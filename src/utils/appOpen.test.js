import assert from 'node:assert/strict';
import test from 'node:test';
import { renderAppOpenHtml } from '../../api/open.js';

test('NFC 앱 열기 페이지는 앱 스킴과 두 스토어 폴백을 제공한다', () => {
  const html = renderAppOpenHtml();

  assert.match(html, /href="katsumap:\/\/"/);
  assert.match(html, /window\.location\.href = deepLink/);
  assert.match(html, /apps\.apple\.com\/kr\/app/);
  assert.match(html, /play\.google\.com\/store\/apps\/details\?id=com\.katsumap\.app/);
  assert.match(html, /isAndroid \? playStore : appStore/);
});
