import assert from 'node:assert/strict';
import test, { beforeEach, afterEach } from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import handler from '../../api/share.js';

const originalFetch = globalThis.fetch;
const post = { id: 9, status: 'published', title: '원육 품종별 특징', summary: '맛과 식감', emoji: '🥩', category: '부위와 고기', thumbnailUrl: 'https://example.com/thumbnail.jpg' };
let calls;
beforeEach(() => {
  calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return new Response(JSON.stringify({ data: post }), { headers: { 'Content-Type': 'application/json' } });
  };
});
afterEach(() => { globalThis.fetch = originalFetch; });

async function request(query = { type: 'encyclopedia', ref: '9' }) {
  const result = { headers: {}, status: null, body: '' };
  await handler({ query }, {
    setHeader(name, value) { result.headers[name] = value; },
    status(code) { result.status = code; return this; },
    send(body) { result.body = body; },
  });
  return result;
}

test('백과 공유는 공개 API 한 번으로 제목·요약·썸네일과 앱 글 열기를 제공한다', async () => {
  const result = await request();
  assert.equal(result.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0]).pathname, '/api/v1/encyclopedia/posts/9');
  assert.match(result.body, /<h1>원육 품종별 특징<\/h1>/);
  assert.match(result.body, /property="og:title" content="원육 품종별 특징 \| 돈가스 지도"/);
  assert.match(result.body, /property="og:description" content="맛과 식감"/);
  assert.match(result.body, /property="og:image" content="https:\/\/example.com\/thumbnail.jpg"/);
  assert.match(result.body, /href="katsumap:\/\/encyclopedia\/9"/);
  assert.match(result.body, /var deepLink = "katsumap:\/\/encyclopedia\/9"/);
  assert.match(result.body, /앱에서 백과 글 보기/);
  assert.match(result.body, /apps\.apple\.com|play\.google\.com/);
  assert.equal(result.headers['Cache-Control'], 'no-store, max-age=0, must-revalidate');
});

test('iOS·Android는 해당 글로 앱 실행을 시도하고 앱으로 전환하지 못한 경우에만 스토어로 이동한다', async () => {
  const { body } = await request();
  const script = body.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const [userAgent, storePattern] of [['Android', /play\.google\.com/], ['iPhone', /apps\.apple\.com/]]) {
    for (const appOpened of [false, true]) {
      const navigations = [];
      const document = { hidden: false, addEventListener(_name, callback) { this.visibilityChanged = callback; } };
      let fallback;
      runInNewContext(script, {
        navigator: { userAgent }, document,
        window: { location: { set href(value) { navigations.push(value); } } },
        setTimeout(callback) { fallback = callback; },
      });
      assert.deepEqual(navigations, ['katsumap://encyclopedia/9']);
      if (appOpened) { document.hidden = true; document.visibilityChanged(); }
      fallback();
      if (appOpened) assert.equal(navigations.length, 1);
      else { assert.equal(navigations.length, 2); assert.match(navigations[1], storePattern); }
    }
  }
});

test('유효하지 않은 글 번호는 조회하지 않고 404를 반환한다', async () => {
  for (const ref of ['0', '-1', '1.5', '9abc', '2147483648', '', undefined]) {
    assert.equal((await request({ type: 'encyclopedia', ref })).status, 404);
  }
  assert.equal(calls.length, 0);
});

test('미발행 글·다른 글·삭제된 글은 미리보기를 노출하지 않는다', async () => {
  for (const data of [{ ...post, status: 'draft' }, { ...post, id: 10 }, null]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ data }));
    const result = await request();
    assert.equal(result.status, 404);
    assert.equal(result.body, 'Not found');
  }
  globalThis.fetch = async () => new Response('Not found', { status: 404 });
  assert.equal((await request()).status, 404);
});

test('서버 장애·잘못된 응답은 상세 정보를 노출하지 않고 재시도 가능한 오류를 반환한다', async () => {
  for (const fetchFailure of [
    async () => { throw new Error('internal details'); },
    async () => new Response('temporary failure', { status: 503 }),
    async () => new Response('invalid JSON'),
  ]) {
    globalThis.fetch = fetchFailure;
    const result = await request();
    assert.equal(result.status, 503);
    assert.equal(result.body, '글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
});

test('제목·요약을 HTML로 실행하지 않고 안전한 이미지 주소만 사용한다', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ data: {
    ...post, title: '<img src=x onerror="alert(1)">', summary: '<script>alert(2)</script>', thumbnailUrl: 'javascript:alert(3)',
  } }));
  const result = await request();
  assert.equal(result.status, 200);
  assert.match(result.body, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(result.body, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
  assert.doesNotMatch(result.body, /<img src=x|<script>alert\(2\)|javascript:alert\(3\)/);
});

test('기존 식당·커뮤니티·프로필 공유의 앱 스킴을 유지한다', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ data: { name: '가게', restaurantName: '가게', nickname: '유저', isProfilePublic: true } }));
  const restaurantRef = (15485863 + 42).toString(36);
  for (const [query, deepLink] of [
    [{ ref: restaurantRef }, `katsumap://r/${restaurantRef}`],
    [{ type: 'community', ref: 'abc' }, 'katsumap://c/abc'],
    [{ type: 'profile', ref: '7' }, 'katsumap://profile/7'],
  ]) {
    const result = await request(query);
    assert.equal(result.status, 200);
    assert.ok(result.body.includes(`href="${deepLink}"`));
  }
});

test('새 공유 주소는 관리자 SPA 앞에 등록하고 기존 정적 QR 주소는 유지한다', async () => {
  const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const index = config.rewrites.findIndex((route) => route.source === '/e/:ref');
  assert.ok(index >= 0 && index < config.rewrites.findIndex((route) => route.source === '/(.*)'));
  assert.equal(config.rewrites[index].destination, '/api/share?type=encyclopedia&ref=:ref');
  assert.deepEqual(config.rewrites.find((route) => route.source === '/encyclopedia/9'), { source: '/encyclopedia/9', destination: '/api/encyclopedia' });
});
