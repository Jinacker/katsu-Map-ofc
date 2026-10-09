import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import handler, { article, renderArticleMarkdown, renderEncyclopediaHtml } from '../../api/encyclopedia.js';

test('공개 백과 페이지는 제공한 제목·요약·썸네일과 열 가지 품종을 로그인 없이 표시한다', () => {
  const html = renderEncyclopediaHtml();

  assert.ok(html.includes(`<h1 id="article-title">🥩 ${article.title}</h1>`));
  assert.ok(html.includes(`<p class="summary">${article.summary}</p>`));
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.equal((html.match(/<p class="summary">/g) || []).length, 1);
  assert.doesNotMatch(html, /class="article-header"|🥩 부위와 고기/);
  assert.ok(html.includes(`src="${article.thumbnailUrl}"`));
  for (const breed of ['YLD', 'YBD', '버크셔', '듀록', '난축맛돈', '우리흑돈', '조선흑돈', '탐라흑돈', '산청초월흑돈', '제주 토종돼지']) {
    assert.ok(html.includes(`<h3>${breed}</h3>`), breed);
  }
  assert.equal((html.match(/<code>/g) || []).length, 20);
  assert.ok(html.includes('일반적인 개량종과는 다른 짙고 투박한 고소함이 특징입니다.'));
});

test('본문을 읽는 동안 앱을 자동 실행하지 않고 버튼으로 기존 앱 열기에 연결한다', () => {
  const html = renderEncyclopediaHtml();

  assert.match(html, /href="\/open"/);
  assert.doesNotMatch(html, /<script|window\.location|http-equiv="refresh"/i);
});

test('마크다운은 HTML을 실행하지 않고 제목·구분선·태그를 표시한다', () => {
  const html = renderArticleMarkdown('# 가이드\n\n---\n\n`#풍부한육즙`\n\n<script>alert("test")</script>');

  assert.match(html, /<h2>가이드<\/h2>/);
  assert.match(html, /<hr \/>/);
  assert.match(html, /<code>#풍부한육즙<\/code>/);
  assert.match(html, /&lt;script&gt;alert\(&quot;test&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('공개 페이지 핸들러는 세션이나 쿼리 없이 캐시 가능한 HTML을 반환한다', () => {
  const headers = {};
  let status;
  let body;
  const res = {
    setHeader(name, value) { headers[name] = value; },
    status(value) { status = value; return this; },
    send(value) { body = value; },
  };

  handler({}, res);

  assert.equal(status, 200);
  assert.equal(headers['Content-Type'], 'text/html; charset=utf-8');
  assert.equal(headers['Cache-Control'], 'public, max-age=0, s-maxage=3600');
  assert.equal(body, renderEncyclopediaHtml());
});

test('9번 글 공개 주소는 관리자 SPA보다 먼저 매칭되고 기존 공유 주소를 유지한다', async () => {
  const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const publicIndex = config.rewrites.findIndex((route) => route.source === '/encyclopedia/9');
  const catchAllIndex = config.rewrites.findIndex((route) => route.source === '/(.*)');

  assert.ok(publicIndex >= 0 && publicIndex < catchAllIndex);
  assert.equal(config.rewrites[publicIndex].destination, '/api/encyclopedia');
  for (const source of ['/open', '/r/:ref', '/c/:ref', '/u/:ref']) {
    assert.ok(config.rewrites.some((route) => route.source === source), source);
  }
});
