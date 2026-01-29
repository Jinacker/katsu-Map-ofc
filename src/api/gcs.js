import { SignJWT, importPKCS8 } from 'jose';

const BUCKET = import.meta.env.VITE_GCS_BUCKET;

// 이미지 압축 설정
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const JPEG_QUALITY = 0.85;

// 이미지 압축 함수
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // 긴 변 기준 리사이징
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            // 원본 파일명에서 확장자 제거 후 .jpg 붙이기
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFile = new File([blob], `${baseName}.jpg`, {
              type: 'image/jpeg',
            });
            resolve(compressedFile);
          } else {
            reject(new Error('이미지 압축 실패'));
          }
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지 로드 실패'));
    };

    img.src = url;
  });
}
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
  // 이미지 압축 (모든 이미지를 JPEG로 변환)
  const compressedFile = await compressImage(file);

  const token = await getAccessToken();

  // 파일명: timestamp + 랜덤 + .jpg (압축 후 항상 JPEG)
  const fileName = `restaurants/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;

  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(fileName)}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': compressedFile.type,
    },
    body: compressedFile,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`업로드 실패: ${error}`);
  }

  const data = await response.json();

  // 공개 URL 반환
  return `https://storage.googleapis.com/${BUCKET}/${data.name}`;
}
