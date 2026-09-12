import apiClient from './axios';

export const getAdminBadges = () => apiClient.get('/api/v1/admin/badges');
export const createAdminBadge = (payload) => apiClient.post('/api/v1/admin/badges', payload);
export const updateAdminBadge = (badgeId, payload) => apiClient.patch(`/api/v1/admin/badges/${badgeId}`, payload);
export const searchAdminUsers = (query) => apiClient.get('/api/v1/admin/users/search', { params: { query } });
export const getAdminUserBadges = (userId) => apiClient.get(`/api/v1/admin/badges/users/${userId}`);
export const awardAdminBadge = (badgeId, userId, reason) => (
  apiClient.post(`/api/v1/admin/badges/${badgeId}/users/${userId}`, { reason })
);
export const revokeAdminBadge = (badgeId, userId) => (
  apiClient.delete(`/api/v1/admin/badges/${badgeId}/users/${userId}`)
);
