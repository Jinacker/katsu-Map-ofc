import { SignJWT, importPKCS8 } from 'jose';

const BUCKET = import.meta.env.VITE_GCS_BUCKET;

// 이미지 압축 설정
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const JPEG_QUALITY = 0.85;
const BADGE_MAX_SIZE = 512;

async function resizeImage(file, { maxWidth, maxHeight, outputType, quality }) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // 긴 변 기준 리사이징
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
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
            const extension = outputType === 'image/webp' ? 'webp' : outputType === 'image/png' ? 'png' : 'jpg';
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFile = new File([blob], `${baseName}.${extension}`, {
              type: outputType,
            });
            resolve(compressedFile);
          } else {
            reject(new Error('이미지 압축 실패'));
          }
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지 로드 실패'));
    };

    img.src = url;
  });
}

// 일반 사진은 기존처럼 JPEG로 압축한다.
async function compressImage(file) {
  return resizeImage(file, {
    maxWidth: MAX_WIDTH,
    maxHeight: MAX_HEIGHT,
    outputType: 'image/jpeg',
    quality: JPEG_QUALITY,
  });
}

// 뱃지는 투명 프레임을 유지해야 하므로 PNG/WebP 알파 채널을 보존한다.
async function optimizeBadgeImage(file) {
  const outputType = file.type === 'image/webp' ? 'image/webp' : 'image/png';
  return resizeImage(file, {
    maxWidth: BADGE_MAX_SIZE,
    maxHeight: BADGE_MAX_SIZE,
    outputType,
    quality: outputType === 'image/webp' ? 0.92 : undefined,
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
export async function uploadImageToGCS(file, folder = 'restaurants', options = {}) {
  const preserveTransparency = options.preserveTransparency === true;
  const compressedFile = preserveTransparency
    ? await optimizeBadgeImage(file)
    : await compressImage(file);

  const token = await getAccessToken();

  const extension = compressedFile.type === 'image/webp' ? 'webp' : compressedFile.type === 'image/png' ? 'png' : 'jpg';
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;

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
