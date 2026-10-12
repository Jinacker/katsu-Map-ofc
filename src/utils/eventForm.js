export function addEvent(events) {
  return [...events, { id: Math.max(0, ...events.map((event) => event.id)) + 1, title: '새 이벤트', webPath: '/seongbukcheon', buttonImageUrl: '', enabled: false, publicData: {} }];
}

export function updateEvent(events, id, patch) {
  return events.map((event) => event.id === id ? { ...event, ...patch }
    : patch.enabled === true ? { ...event, enabled: false } : event);
}

export async function sendEventAsset(apiClient, file) {
  if (!['image/png', 'image/gif', 'image/svg+xml'].includes(file.type) || file.size > 10 * 1024 * 1024) {
    throw new Error('PNG, GIF, SVG 파일을 10MB 이하로 선택해주세요.');
  }
  const data = new FormData();
  data.append('file', file, file.name);
  const response = await apiClient.post('/api/v1/admin/events/assets', data, { headers: { 'Content-Type': undefined } });
  const url = response.data?.data?.url;
  if (typeof url !== 'string' || !url.startsWith('https://')) throw new Error('업로드된 이미지 주소를 확인할 수 없습니다.');
  return url;
}
