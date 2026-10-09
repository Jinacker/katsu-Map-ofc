const PAGE_URL = 'https://katsu-map-ofc.vercel.app/encyclopedia/9';

export const article = {
  title: '원육 품종별 특징',
  summary: '원육에 따라 달라지는 돈가스의 맛과 식감',
  thumbnailUrl: 'https://storage.googleapis.com/katsu-map-images/encyclopedia/1784183123337_9mkyxl.jpg',
  bodyMarkdown: `# 원육 품종 가이드

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
    .header-inner { max-width: 640px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .brand { font-size: 15px; font-weight: 750; }
    .header-label { font-size: 12px; color: #6b6b62; }
    main { max-width: 680px; margin: 0 auto; padding: 24px 20px calc(164px + env(safe-area-inset-bottom)); }
    .thumbnail { display: block; width: 100%; height: auto; border-radius: 14px; background: #F7F3EC; }
    .article-header { margin: 24px 0 28px; }
    .category { margin: 0 0 10px; font-size: 12px; color: #6b6b62; }
    h1 { margin: 0 0 10px; font-size: 25px; line-height: 1.35; letter-spacing: -0.6px; }
    .summary { margin: 0; color: #6b6b62; font-size: 14px; line-height: 1.7; }
    .markdown { font-size: 14px; line-height: 1.75; }
    .markdown h2 { font-size: 20px; line-height: 1.4; margin: 18px 0 8px; }
    .markdown h3 { font-size: 17px; line-height: 1.45; margin: 16px 0 6px; }
    .markdown h4 { font-size: 15px; line-height: 1.5; margin: 12px 0 12px; }
    .markdown p { margin: 0 0 12px; }
    .markdown code { display: inline-block; margin: 0 3px 4px 0; padding: 2px 7px; border-radius: 5px; background: #F1EDE7; color: #B4432F; font-family: inherit; font-size: 12px; line-height: 1.7; }
    .markdown hr { margin: 26px 0; height: 1px; border: 0; background: #E7E1D6; }
    .app-bar { position: fixed; z-index: 10; inset: auto 0 0; padding: 14px 20px calc(14px + env(safe-area-inset-bottom)); background: #FDFBF6; border-top: 1px solid #E7E1D6; }
    .app-bar-inner { max-width: 640px; margin: 0 auto; }
    .app-bar p { margin: 0 0 10px; color: #6b6b62; font-size: 12px; line-height: 1.6; text-align: center; }
    .app-button { display: flex; align-items: center; justify-content: center; min-height: 48px; padding: 12px 16px; background: #d6483e; color: #fff; border-radius: 12px; font-size: 14px; font-weight: 700; text-decoration: none; text-align: center; }
    .app-button:hover { background: #bd3c33; }
    .app-button:focus-visible { outline: 3px solid #21221c; outline-offset: 3px; }
    @media (min-width: 680px) { main { padding-top: 32px; } h1 { font-size: 28px; } .markdown { font-size: 15px; } }
  </style>
</head>
<body>
  <header class="page-header">
    <div class="header-inner"><span class="brand">돈가스 지도</span><span class="header-label">돈가스 백과</span></div>
  </header>
  <main>
    <article aria-labelledby="article-title">
      <img class="thumbnail" src="${thumbnailUrl}" alt="${title}" fetchpriority="high" />
      <header class="article-header">
        <p class="category">🥩 부위와 고기</p>
        <h1 id="article-title">${title}</h1>
        <p class="summary">${summary}</p>
      </header>
      <div class="markdown">${renderArticleMarkdown(article.bodyMarkdown)}</div>
    </article>
  </main>
  <footer class="app-bar" aria-label="돈가스 지도 앱 안내">
    <div class="app-bar-inner">
      <p>더 많은 돈가스 이야기는 돈가스 지도에서 만나보세요.</p>
      <a class="app-button" href="/open">돈가스 지도 열기 · 다운로드</a>
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
