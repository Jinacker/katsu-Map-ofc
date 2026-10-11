import { buildPushPayload } from './pushNavigation.js';

export const EMPTY_LAUNCH_BANNER_FORM = {
  enabled: false, title: '', imageUrl: '', imageAspectRatio: 1, target: '', targetId: '',
};

export function launchBannerToForm(config, catalog) {
  const destination = catalog.destinations.find((item) => item.target === config.navigation?.target);
  return {
    enabled: config.enabled, title: config.title, imageUrl: config.imageUrl, imageAspectRatio: config.imageAspectRatio,
    target: config.navigation?.target ?? '',
    targetId: destination?.idKey ? String(config.navigation.params[destination.idKey]) : '',
  };
}

export function buildLaunchBannerPayload(form, generation, catalog) {
  const title = form.title.trim();
  const imageUrl = form.imageUrl.trim();
  if (title.length > 80) throw new Error('제목은 80자까지 입력해주세요.');
  if (imageUrl) {
    try { if (new URL(imageUrl).protocol !== 'https:') throw new Error(); }
    catch { throw new Error('이미지는 HTTPS 주소를 입력해주세요.'); }
  }
  if (!Number.isFinite(form.imageAspectRatio) || form.imageAspectRatio < 0.2 || form.imageAspectRatio > 5) {
    throw new Error('이미지의 가로/세로 비율은 0.2~5 사이여야 합니다.');
  }
  const navigation = buildPushPayload({ target: form.target, targetId: form.targetId }, catalog).navigation ?? null;
  if (form.enabled && (!title || !imageUrl || !navigation)) throw new Error('제목, 이미지, 이동 목적지를 설정해주세요.');
  return { generation, enabled: form.enabled, title, imageUrl, imageAspectRatio: form.imageAspectRatio, navigation };
}
