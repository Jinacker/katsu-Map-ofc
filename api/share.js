const RESTAURANT_SHARE_REF_OFFSET = 15485863;
const SHARE_ORIGIN = 'https://katsu-map-ofc.vercel.app';
const APP_STORE_URL = 'https://apps.apple.com/kr/app/%EB%8F%88%EA%B0%80%EC%8A%A4-%EC%A7%80%EB%8F%84/id6755211452';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.katsumap.app';
const DEFAULT_API_URL = 'https://katsu-map-api-181871710999.asia-northeast3.run.app';
const DEFAULT_SHARE_TITLE_TEMPLATE = '{name} | 돈가스 지도';
const DEFAULT_SHARE_DESCRIPTION_TEMPLATE = '{area}의 돈가스 맛집, 돈가스 지도에서 확인해보세요.';
const DEFAULT_SHARE_CTA_TEXT = '돈가스 지도에서 이 가게 보기';
const DEFAULT_FEED_SHARE_TITLE_TEMPLATE = '{restaurantName} 피드 | 돈가스 지도';
const DEFAULT_FEED_SHARE_DESCRIPTION_TEMPLATE = '{review}';
const DEFAULT_FEED_SHARE_CTA_TEXT = '돈가스 피드 보기';

function decodeRestaurantShareRef(ref) {
  if (typeof ref !== 'string' || !ref.trim()) return null;

  const decoded = Number.parseInt(ref.trim().toLowerCase(), 36) - RESTAURANT_SHARE_REF_OFFSET;
  return Number.isInteger(decoded) && decoded > 0 ? decoded : null;
}

function normalizeApiBaseUrl() {
  return (process.env.KATSU_API_URL || process.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
}

function unwrapApiData(payload) {
  return payload?.data ?? payload;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

function getStarCount(restaurant) {
  if (restaurant?.isTop5) return 4;
  if (restaurant?.isBest) return 3;
  if (restaurant?.isGood) return 2;
  return 1;
}

function applyTemplate(template, values) {
  return Object.entries(values).reduce((result, [key, value]) => (
    result.replaceAll(`{${key}}`, value ?? '')
  ), String(template || ''));
}

function getAbsoluteImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return null;
}

function getPreviewText(text, maxLength = 90) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trim()}...` : normalized;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/\n/g, ' ');
}

function renderHtml({
  ref,
  deepLinkType = 'r',
  heading,
  eyebrow,
  title,
  description,
  ctaText,
  shareUrl,
  imageUrl,
}) {
  const displayHeading = heading || '돈가스 지도';
  const displayEyebrow = eyebrow || '';
  const deepLink = `katsumap://${deepLinkType}/${ref}`;
  const safeTitle = escapeAttribute(title);
  const safeDescription = escapeAttribute(description);
  const safeShareUrl = escapeAttribute(shareUrl);
  const safeImageUrl = imageUrl ? escapeAttribute(imageUrl) : '';

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />
  <link rel="canonical" href="${safeShareUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="돈가스 지도" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:url" content="${safeShareUrl}" />
  ${safeImageUrl ? `<meta property="og:image" content="${safeImageUrl}" />` : ''}
  ${safeImageUrl ? `<meta property="og:image:width" content="1200" />` : ''}
  ${safeImageUrl ? `<meta property="og:image:height" content="630" />` : ''}
  <meta name="twitter:card" content="${safeImageUrl ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  ${safeImageUrl ? `<meta name="twitter:image" content="${safeImageUrl}" />` : ''}
  <style>
    :root { color-scheme: light; }
    body { margin: 0; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fdfbf6; color: #2f2924; display: flex; align-items: center; justify-content: center; }
    main { width: min(420px, calc(100vw - 40px)); padding: 28px 20px; text-align: center; }
    img { width: 100%; max-height: 260px; object-fit: cover; border-radius: 14px; margin-bottom: 20px; background: #eee3d4; }
    .eyebrow { margin: 0 0 8px; color: #d6483e; font-size: 13px; font-weight: 800; }
    h1 { margin: 0 0 10px; font-size: 24px; line-height: 1.25; }
    p { margin: 0 0 18px; color: #6f6258; line-height: 1.5; white-space: pre-line; }
    a { display: block; text-decoration: none; border-radius: 12px; padding: 13px 16px; font-weight: 800; }
    .primary { background: #d6483e; color: #fff; margin-bottom: 10px; }
    .secondary { color: #6f6258; border: 1px solid #e5d8c7; }
    .stores { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  </style>
</head>
<body>
  <main>
    ${safeImageUrl ? `<img src="${safeImageUrl}" alt="" />` : ''}
    ${displayEyebrow ? `<div class="eyebrow">${escapeHtml(displayEyebrow)}</div>` : ''}
    <h1>${escapeHtml(displayHeading)}</h1>
    <p>${escapeHtml(description)}</p>
    <a class="primary" href="${escapeAttribute(deepLink)}">${escapeHtml(ctaText)}</a>
    <div class="stores">
      <a class="secondary" href="${escapeAttribute(APP_STORE_URL)}">App Store</a>
      <a class="secondary" href="${escapeAttribute(PLAY_STORE_URL)}">Google Play</a>
    </div>
  </main>
  <script>
    (function () {
      var deepLink = ${JSON.stringify(deepLink)};
      var appStore = ${JSON.stringify(APP_STORE_URL)};
      var playStore = ${JSON.stringify(PLAY_STORE_URL)};
      var ua = navigator.userAgent || '';
      var isAndroid = /Android/i.test(ua);
      var isIOS = /iPhone|iPad|iPod/i.test(ua);
      var fallbackUrl = isAndroid ? playStore : appStore;
      var didLeave = false;

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) didLeave = true;
      });

      if (isAndroid || isIOS) {
        setTimeout(function () {
          if (!didLeave) window.location.href = fallbackUrl;
        }, 1400);
        window.location.href = deepLink;
      }
    })();
  </script>
</body>
</html>`;
}

export default async function handler(req, res) {
  const ref = Array.isArray(req.query.ref) ? req.query.ref[0] : req.query.ref;
  const type = Array.isArray(req.query.type) ? req.query.type[0] : req.query.type;
  const isCommunityShare = type === 'community';

  if (typeof ref !== 'string' || !/^[a-z0-9]+$/i.test(ref)) {
    res.status(404).send('Not found');
    return;
  }

  if (isCommunityShare) {
    const apiBaseUrl = normalizeApiBaseUrl();
    const shareUrl = `${SHARE_ORIGIN}/c/${encodeURIComponent(ref)}`;

    try {
      const [notePayload, contentPayload] = await Promise.all([
        fetchJson(`${apiBaseUrl}/api/v1/community/share/${encodeURIComponent(ref)}`),
        fetchJson(`${apiBaseUrl}/api/v1/hunter-content`).catch(() => null),
      ]);
      const note = unwrapApiData(notePayload);
      const content = unwrapApiData(contentPayload) || {};
      const nickname = note?.user?.nickname?.trim() || '익명';
      const heading = note?.restaurantName || '돈가스 피드';
      const area = note?.area || '';
      const reviewPreview = getPreviewText(note?.review);
      const stars = note?.satisfaction ? `별 ${note.satisfaction}개` : '';
      const templateValues = {
        restaurantName: heading,
        name: heading,
        area,
        nickname,
        menuName: note?.menuName || '',
        review: reviewPreview,
        stars,
        url: shareUrl,
      };
      const title = applyTemplate(
        content.feedShareTitleTemplate || DEFAULT_FEED_SHARE_TITLE_TEMPLATE,
        templateValues,
      ).trim() || `${heading} 피드 | 돈가스 지도`;
      const description = applyTemplate(
        content.feedShareDescriptionTemplate || DEFAULT_FEED_SHARE_DESCRIPTION_TEMPLATE,
        templateValues,
      ).trim() || `${nickname}님의 돈가스 기록을 확인해보세요.`;
      const ctaText = applyTemplate(
        content.feedShareCtaText || DEFAULT_FEED_SHARE_CTA_TEXT,
        templateValues,
      ).trim() || DEFAULT_FEED_SHARE_CTA_TEXT;
      const imageUrl = getAbsoluteImageUrl(note?.photoUrl);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      res.status(200).send(renderHtml({
        ref,
        deepLinkType: 'c',
        heading,
        eyebrow: [area, `${nickname}님의 피드`].filter(Boolean).join(' · '),
        title,
        description,
        ctaText,
        shareUrl,
        imageUrl,
      }));
    } catch {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(500).send(renderHtml({
        ref,
        deepLinkType: 'c',
        heading: '돈가스 지도',
        eyebrow: '',
        title: '돈가스 지도',
        description: '돈가스 지도에서 피드를 확인해보세요.',
        ctaText: DEFAULT_FEED_SHARE_CTA_TEXT,
        shareUrl,
        imageUrl: null,
      }));
    }
    return;
  }

  const restaurantId = decodeRestaurantShareRef(ref);

  if (!restaurantId) {
    res.status(404).send('Not found');
    return;
  }

  const apiBaseUrl = normalizeApiBaseUrl();
  const shareUrl = `${SHARE_ORIGIN}/r/${encodeURIComponent(ref)}`;

  try {
    const [restaurantPayload, contentPayload] = await Promise.all([
      fetchJson(`${apiBaseUrl}/api/v1/restaurants/${restaurantId}`),
      fetchJson(`${apiBaseUrl}/api/v1/hunter-content`).catch(() => null),
    ]);

    const restaurant = unwrapApiData(restaurantPayload);
    const content = unwrapApiData(contentPayload) || {};
    const stars = `별 ${getStarCount(restaurant)}개`;
    const templateValues = {
      name: restaurant?.name || '돈가스 맛집',
      area: restaurant?.area || '돈가스',
      stars,
      url: shareUrl,
    };
    const title = applyTemplate(content.shareTitleTemplate || DEFAULT_SHARE_TITLE_TEMPLATE, templateValues);
    const description = applyTemplate(content.shareDescriptionTemplate || DEFAULT_SHARE_DESCRIPTION_TEMPLATE, templateValues);
    const ctaText = applyTemplate(content.shareCtaText || DEFAULT_SHARE_CTA_TEXT, templateValues);
    const imageUrl = getAbsoluteImageUrl(restaurant?.image_url_1 || restaurant?.imageUrl);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).send(renderHtml({
      ref,
      deepLinkType: 'r',
      heading: restaurant?.name || '돈가스 맛집',
      eyebrow: restaurant?.area || '',
      title,
      description,
      ctaText,
      shareUrl,
      imageUrl,
    }));
  } catch (error) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).send(renderHtml({
      ref,
      deepLinkType: 'r',
      heading: '돈가스 지도',
      eyebrow: '',
      title: '돈가스 지도',
      description: '돈가스 지도에서 맛집을 확인해보세요.',
      ctaText: DEFAULT_SHARE_CTA_TEXT,
      shareUrl,
      imageUrl: null,
    }));
  }
}
