import { SignJWT, importPKCS8 } from 'jose';

const BUCKET = import.meta.env.VITE_GCS_BUCKET;
const CLIENT_EMAIL = import.meta.env.VITE_GCS_CLIENT_EMAIL;
const PRIVATE_KEY = import.meta.env.VITE_GCS_PRIVATE_KEY.replace(/\\n/g, '\n');

let cachedToken = null;
let tokenExpiry = 0;

// Access Token 발급
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);

  // 캐시된 토큰이 유효하면 재사용
  if (cachedToken && tokenExpiry > now + 60) {
    return cachedToken;
  }

  const privateKey = await importPKCS8(PRIVATE_KEY, 'RS256');

  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/devstorage.read_write',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(CLIENT_EMAIL)
    .setSubject(CLIENT_EMAIL)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`토큰 발급 실패: ${error}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = now + data.expires_in;

  return cachedToken;
}

// 이미지 업로드
export async function uploadImageToGCS(file) {
  const token = await getAccessToken();

  // 파일명: timestamp + 랜덤 + 원본확장자
  const ext = file.name.split('.').pop();
  const fileName = `restaurants/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(fileName)}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`업로드 실패: ${error}`);
  }

  const data = await response.json();

  // 공개 URL 반환
  return `https://storage.googleapis.com/${BUCKET}/${data.name}`;
}
