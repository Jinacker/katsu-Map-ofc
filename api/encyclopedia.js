const PAGE_URL = 'https://katsu-map-ofc.vercel.app/encyclopedia/9';
// 앱의 assets/logo/icon_1k.svg에 포함된 마스코트를 버튼 크기로 담는다. 외부 아이콘 요청 없이 표시한다.
const APP_ICON_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAA8CAYAAACQPx/OAAABTmlDQ1BJQ0MgUHJvZmlsZQAAKJF9kL9LAnEYxj9qYYoRVFBDww3SZBEW0RbqIEGDWEHWdJ4/wR/fzotor6GpaIjGamlprtWhPyAIGqKgudGgpeR6TwutqBceng/Pvd/j4QV3QFeq1KNBuWKZyXhUW02tad5n/PgYYRCfbtRUJJFYRObLv8/rHS7Hbyecf/3+/u/4M9maIf4uChrKtMAlbUhsWcphJTxsSinhHYfzbT52ON3mi9bOcjImXBfWjIKeEX4SDqW78nwXl0ubxmcHp30gW1lZEu8TjVEjSZzoHzszrZ0YVRTbmBTJU8BCIyKJokRWeIEKBpOEhMNMiWad2/68WSernsBcAzz7nSx9BFd7MHrfyYKyN7ALl9dKN/VW5BG5c0VonEN/CoZu5LTrtdx0uN0+MA+9j7b9Mg7eA2ge2vbbqW03z+TxA9Q3PgDkpl3ETs0WPAAAAJxlWElmTU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABgAAAAAQAAAGAAAAABAAWQAAAHAAAABDAyMTCRAQAHAAAABAECAwCgAAAHAAAABDAxMDCgAgAEAAAAAQAAAGSgAwAEAAAAAQAAADwAAAAAKrNE0wAAAAlwSFlzAAAOxAAADsQBlSsOGwAABEJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDYuMC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIj4KICAgICAgICAgPHRpZmY6WVJlc29sdXRpb24+OTY8L3RpZmY6WVJlc29sdXRpb24+CiAgICAgICAgIDx0aWZmOlJlc29sdXRpb25Vbml0PjI8L3RpZmY6UmVzb2x1dGlvblVuaXQ+CiAgICAgICAgIDx0aWZmOlhSZXNvbHV0aW9uPjk2PC90aWZmOlhSZXNvbHV0aW9uPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8ZXhpZjpQaXhlbFhEaW1lbnNpb24+NTAwPC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgICAgPGV4aWY6Q29sb3JTcGFjZT42NTUzNTwvZXhpZjpDb2xvclNwYWNlPgogICAgICAgICA8ZXhpZjpFeGlmVmVyc2lvbj4wMjEwPC9leGlmOkV4aWZWZXJzaW9uPgogICAgICAgICA8ZXhpZjpDb21wb25lbnRzQ29uZmlndXJhdGlvbj4KICAgICAgICAgICAgPHJkZjpTZXE+CiAgICAgICAgICAgICAgIDxyZGY6bGk+MTwvcmRmOmxpPgogICAgICAgICAgICAgICA8cmRmOmxpPjI8L3JkZjpsaT4KICAgICAgICAgICAgICAgPHJkZjpsaT4zPC9yZGY6bGk+CiAgICAgICAgICAgICAgIDxyZGY6bGk+MDwvcmRmOmxpPgogICAgICAgICAgICA8L3JkZjpTZXE+CiAgICAgICAgIDwvZXhpZjpDb21wb25lbnRzQ29uZmlndXJhdGlvbj4KICAgICAgICAgPGV4aWY6Rmxhc2hQaXhWZXJzaW9uPjAxMDA8L2V4aWY6Rmxhc2hQaXhWZXJzaW9uPgogICAgICAgICA8ZXhpZjpQaXhlbFlEaW1lbnNpb24+MzAwPC9leGlmOlBpeGVsWURpbWVuc2lvbj4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+Cp+8lK4AABu7SURBVHgB7ZwJlJ5Vecef+67fMlsmTPYJJCQhQECoQUlEUECsqFRF6OEUj0Xo0aK1YFU49WBjPadFqWJR8KigHA6tLQhFqogQLRSq7LIGyB6SzGSbZJZvvu3d+nvuN19IAkFnMqDg3Mn3rve9977P/9nvfSMyUSYoMEGBCQpM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';

export const article = {
  title: '원육 품종별 특징',
  summary: '원육에 따라 달라지는 돈가스의 맛과 식감',
  thumbnailUrl: 'https://storage.googleapis.com/katsu-map-images/encyclopedia/1784183123337_9mkyxl.jpg',
  bodyMarkdown: `# 🥩 원육 품종 가이드

### 돈가스의 맛을 결정하는 돼지고기 품종 이야기

같은 돈가스라도 어떤 품종의 돼지고기를 사용했는지에 따라 육향과 식감, 지방의 풍미가 달라집니다. 원육 품종별 특징을 확인하고 내 취향에 맞는 돈가스를 찾아보세요.

---

## YLD

\`#깔끔하고담백한\` \`#균형잡힌맛\`

국내 돼지고기 유통의 중심을 차지하는 삼원교잡종으로, 요크셔·랜드레이스·듀록을 교배한 품종입니다. 부드러운 살코기와 적당한 지방의 균형이 좋으며, 호불호 없이 깔끔하고 담백한 맛이 특징입니다.

---

## YBD

\`#진한감칠맛\` \`#쫄깃한식감\`

대중적인 YLD에 흑돼지인 버크셔의 유전자를 더한 프리미엄 교잡종입니다. 짙은 육색과 쫄깃한 식감이 특징이며, 씹을수록 진한 감칠맛과 깊은 풍미가 퍼집니다.

---

## 버크셔

\`#촉촉하고부드러운\` \`#달콤한지방\`

순종 흑돼지 특유의 섬세하고 탄력 있는 육질이 매력적인 품종입니다. 수분 보유력이 높아 촉촉하고 부드러우며, 은은한 단맛이 감도는 고소한 지방이 풍미를 더합니다.

---

## 듀록

\`#풍부한육즙\` \`#진한육향\`

근내지방이 고르게 발달하는 품종으로, 진한 육향과 풍부한 육즙을 머금고 있습니다. 지방이 부드럽게 녹아내리는 듯한 촉촉한 식감을 선호한다면 잘 어울리는 품종입니다.

---

## 난축맛돈

\`#촘촘한마블링\` \`#깊고진한풍미\`

제주 재래흑돼지의 뛰어난 맛과 랜드레이스의 생산성을 결합해 탄생한 국산 품종입니다. 등심과 안심에도 근내지방이 고르게 발달해 전 부위에서 부드러운 식감과 깊은 풍미를 느낄 수 있습니다.

---

## 우리흑돈

\`#탄력있는육질\` \`#풍부한육즙\`

재래돼지 고유의 맛을 살리기 위해 듀록과 교배하여 개량한 국산 흑돼지 품종입니다. 탄력 있고 쫄깃한 식감이 살아 있으며, 씹을수록 풍부한 육즙과 고소함이 입안에 퍼집니다.

---

## 조선흑돈

\`#달콤하고소한지방\` \`#탄탄한육질\`

경북 김천의 토종 지례흑돼지를 현대적으로 재현하고 개량한 품종입니다. 눈처럼 하얗고 단단한 지방에서 우러나오는 밀도 높은 고소함과 은은한 단맛, 탄탄한 육질의 조화가 특징입니다.

---

## 탐라흑돈

\`#깊은지방풍미\` \`#선명한감칠맛\`

제주 지역에서 전문적인 사육 기술을 바탕으로 키워낸 프리미엄 흑돼지입니다. 두툼하고 깨끗한 지방이 익으면서 만들어내는 깊은 풍미와 선명한 감칠맛이 매력적입니다.

---

## 산청초월흑돈

\`#깔끔한육향\` \`#은은한고소함\`

지리산 자락의 산청 지역에서 엄격한 환경 관리를 통해 키워낸 흑돼지입니다. 잡내가 적고 맛이 깔끔하며, 씹을수록 은은한 고소함이 짙어지는 차별화된 육질을 지니고 있습니다.

---

## 제주 토종돼지

\`#쫀득한식감\` \`#야성적인고소함\`

제주의 자연환경에 적응하며 자라온 토종돼지입니다. 껍질과 지방의 쫀득한 식감이 살아 있으며, 일반적인 개량종과는 다른 짙고 투박한 고소함이 특징입니다.`,
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 이 글에서 사용하는 제목·문단·구분선·인라인 코드만 렌더한다. HTML은 텍스트로 처리한다.
export function renderArticleMarkdown(markdown) {
  return String(markdown).trim().split(/\r?\n\s*\r?\n/).map((block) => {
    const text = block.trim();
    if (/^---+$/.test(text)) return '<hr />';
    const heading = text.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length + 1;
      return `<h${level}>${escapeHtml(heading[2])}</h${level}>`;
    }
    const inline = escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');
    return `<p>${inline}</p>`;
  }).join('\n');
}

export function renderEncyclopediaHtml() {
  const title = escapeHtml(article.title);
  const summary = escapeHtml(article.summary);
  const thumbnailUrl = escapeHtml(article.thumbnailUrl);

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#FDFBF6" />
  <title>${title} | 돈가스 지도</title>
  <meta name="description" content="${summary}" />
  <link rel="canonical" href="${PAGE_URL}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="돈가스 지도" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${summary}" />
  <meta property="og:url" content="${PAGE_URL}" />
  <meta property="og:image" content="${thumbnailUrl}" />
  <meta property="og:image:alt" content="${title}" />
  <meta name="twitter:card" content="summary_large_image" />
  <style>
    :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #21221c; background: #FDFBF6; }
    * { box-sizing: border-box; }
    body { margin: 0; overflow-wrap: anywhere; }
    .page-header { padding: calc(18px + env(safe-area-inset-top)) 20px 18px; border-bottom: 1px solid #E7E1D6; }
    .header-inner { max-width: 640px; margin: 0 auto; text-align: center; }
    main { max-width: 680px; margin: 0 auto; padding: 24px 20px calc(164px + env(safe-area-inset-bottom)); }
    .thumbnail { display: block; width: 100%; height: auto; border-radius: 14px; background: #F7F3EC; }
    h1 { margin: 0 0 8px; font-size: 22px; line-height: 1.35; letter-spacing: -0.6px; }
    .summary { margin: 0; color: #6b6b62; font-size: 14px; line-height: 1.7; }
    .markdown { margin-top: 24px; font-size: 14px; line-height: 1.75; }
    .markdown h2 { font-size: 20px; line-height: 1.4; margin: 18px 0 8px; }
    .markdown h3 { font-size: 17px; line-height: 1.45; margin: 16px 0 6px; }
    .markdown h4 { font-size: 15px; line-height: 1.5; margin: 12px 0 12px; }
    .markdown p { margin: 0 0 12px; }
    .markdown code { display: inline-block; margin: 0 3px 4px 0; padding: 2px 7px; border-radius: 5px; background: #F1EDE7; color: #B4432F; font-family: inherit; font-size: 12px; line-height: 1.7; }
    .markdown hr { margin: 26px 0; height: 1px; border: 0; background: #E7E1D6; }
    .app-bar { position: fixed; z-index: 10; inset: auto 0 0; padding: 14px 20px calc(14px + env(safe-area-inset-bottom)); background: #FDFBF6; border-top: 1px solid #E7E1D6; }
    .app-bar-inner { max-width: 640px; margin: 0 auto; }
    .app-bar p { margin: 0 0 10px; color: #6b6b62; font-size: 12px; line-height: 1.6; text-align: center; }
    .app-button { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 12px 16px; background: #d6483e; color: #fff; border-radius: 12px; font-size: 14px; font-weight: 700; text-decoration: none; text-align: center; }
    .app-icon { width: 46px; height: 28px; flex-shrink: 0; object-fit: contain; }
    .app-button:hover { background: #bd3c33; }
    .app-button:focus-visible { outline: 3px solid #21221c; outline-offset: 3px; }
    @media (min-width: 680px) { main { padding-top: 32px; } h1 { font-size: 25px; } .markdown { font-size: 15px; } }
  </style>
</head>
<body>
  <header class="page-header">
    <div class="header-inner">
      <h1 id="article-title">${title}</h1>
      <p class="summary">${summary}</p>
    </div>
  </header>
  <main>
    <article aria-labelledby="article-title">
      <img class="thumbnail" src="${thumbnailUrl}" alt="${title}" fetchpriority="high" />
      <div class="markdown">${renderArticleMarkdown(article.bodyMarkdown)}</div>
    </article>
  </main>
  <footer class="app-bar" aria-label="돈가스 지도 앱 안내">
    <div class="app-bar-inner">
      <p>더 많은 돈가스 이야기를 돈가스 지도에서 만나보세요.</p>
      <a class="app-button" href="/open"><img class="app-icon" src="${APP_ICON_URL}" alt="" width="46" height="28" /><span>지금 바로 「돈가스 지도」 다운로드 !</span></a>
    </div>
  </footer>
</body>
</html>`;
}

// 고정 콘텐츠로 만든 HTML을 반환한다. DB·백엔드 API·인증을 사용하지 않는다.
const PAGE_HTML = renderEncyclopediaHtml();

export default function handler(_req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600');
  res.status(200).send(PAGE_HTML);
}
