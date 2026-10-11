import apiClient from './axios';
import { sendAdminImage } from '../utils/adminImageUpload.js';

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
// 이미지 업로드
export async function uploadImageToGCS(file, folder = 'restaurants', options = {}) {
  const preserveTransparency = options.preserveTransparency === true;
  const compressedFile = preserveTransparency
    ? await optimizeBadgeImage(file)
    : await compressImage(file);

  return sendAdminImage(apiClient, compressedFile, folder);
}
