const APP_DEEP_LINK = 'katsumap://';
const APP_STORE_URL = 'https://apps.apple.com/kr/app/%EB%8F%88%EA%B0%80%EC%8A%A4-%EC%A7%80%EB%8F%84/id6755211452';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.katsumap.app';

export function renderAppOpenHtml() {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>돈가스 지도 열기</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fdfbf6; color: #2f2924; display: flex; align-items: center; justify-content: center; }
    main { width: min(420px, calc(100vw - 40px)); padding: 28px 20px; text-align: center; }
    h1 { margin: 0 0 10px; font-size: 24px; line-height: 1.25; }
    p { margin: 0 0 20px; color: #6f6258; line-height: 1.5; }
    a { display: block; box-sizing: border-box; width: 100%; text-decoration: none; border-radius: 12px; padding: 13px 16px; font-weight: 800; }
    .primary { background: #d6483e; color: #fff; }
  </style>
</head>
<body>
  <main>
    <h1>돈가스 지도를 여는 중이에요</h1>
    <p>앱이 열리지 않으면 아래 버튼을 눌러주세요.</p>
    <a class="primary" href="${APP_DEEP_LINK}">돈가스 지도 열기</a>
  </main>
  <script>
    (function () {
      var deepLink = ${JSON.stringify(APP_DEEP_LINK)};
      var appStore = ${JSON.stringify(APP_STORE_URL)};
      var playStore = ${JSON.stringify(PLAY_STORE_URL)};
      var isAndroid = /Android/i.test(navigator.userAgent || '');
      var didLeavePage = false;

      function markPageLeft() {
        didLeavePage = true;
      }

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) markPageLeft();
      });
      window.addEventListener('pagehide', markPageLeft);

      window.location.href = deepLink;
      window.setTimeout(function () {
        if (!didLeavePage) window.location.href = isAndroid ? playStore : appStore;
      }, 1400);
    })();
  </script>
</body>
</html>`;
}

export default function handler(_req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.status(200).send(renderAppOpenHtml());
}
