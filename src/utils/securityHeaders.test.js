import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
const headersFor = (path) => Object.fromEntries(config.headers
  .filter((rule) => new RegExp(`^${rule.source}$`).test(path))
  .flatMap((rule) => rule.headers.map(({ key, value }) => [key, value])));

test('관리자·공개 QR·공유 페이지 모두 외부 iframe 삽입과 MIME 오해석을 차단한다', () => {
  for (const path of ['/', '/login', '/restaurants', '/launch-banner', '/open', '/encyclopedia/9', '/r/abc', '/c/1', '/u/1', '/e/9', '/api/share']) {
    const headers = headersFor(path);
    assert.equal(headers['X-Frame-Options'], 'DENY', path);
    assert.equal(headers['X-Content-Type-Options'], 'nosniff', path);
    assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin', path);
    assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/, path);
    assert.match(headers['Content-Security-Policy'], /object-src 'none'/, path);
    assert.match(headers['Content-Security-Policy'], /base-uri 'self'/, path);
  }
});

test('스크립트 CSP 보고는 관리자 화면에 적용하고 공개 페이지·직접 API 주소에는 적용하지 않는다', () => {
  for (const path of ['/', '/login', '/restaurants', '/launch-banner', '/encyclopedia', '/encyclopedia/']) {
    const headers = headersFor(path);
    assert.ok(headers['Content-Security-Policy-Report-Only'], path);
    assert.match(headers['Content-Security-Policy-Report-Only'], /script-src 'self' https:\/\/dapi\.kakao\.com https:\/\/\*\.daumcdn\.net/, path);
    assert.match(headers['Content-Security-Policy-Report-Only'], /style-src 'self' 'unsafe-inline'/, path);
  }
  for (const path of ['/open', '/open/', '/encyclopedia/9', '/encyclopedia/9/', '/r/abc', '/c/1', '/u/1', '/e/9', '/e/9/', '/api', '/api/open', '/api/share', '/api/encyclopedia']) {
    const headers = headersFor(path);
    assert.equal(headers['Content-Security-Policy-Report-Only'], undefined, path);
    // 공유·앱 열기 페이지의 기존 인라인 스크립트 실행을 유지한다.
    assert.doesNotMatch(headers['Content-Security-Policy'], /(?:default|script)-src/, path);
  }
});
