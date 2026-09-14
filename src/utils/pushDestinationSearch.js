export function getPushDestinationSearch(idKey, query) {
  const term = query.trim();
  if (!term) return null;
  if (idKey === 'userId') return { url: '/api/v1/admin/users/search', params: { query: term } };
  if (idKey === 'restaurantId') return { url: '/api/v1/admin/restaurants/search', params: { query: term } };
  return null;
}

export function describePushDestinationItem(idKey, item) {
  if (idKey === 'userId') return `${item.nickname || '닉네임 없음'} #${item.id}${item.isProfilePublic === false ? ' · 비공개' : ''}`;
  return `${item.name || '식당'} #${item.id}${item.addr || item.area ? ` · ${item.addr || item.area}` : ''}`;
}
