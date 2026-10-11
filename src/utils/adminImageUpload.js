export async function sendAdminImage(apiClient, file, folder = 'restaurants') {
  const data = new FormData();
  data.append('file', file, file.name);
  data.append('folder', folder);
  // 기본 JSON 헤더를 제거해 브라우저가 multipart boundary를 지정하도록 한다.
  let response;
  try {
    response = await apiClient.post('/api/v1/admin/images/upload', data, {
      headers: { 'Content-Type': undefined },
    });
  } catch (error) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message) throw new Error(message);
    throw error;
  }
  const url = response.data?.data?.url;
  if (typeof url !== 'string' || !url.startsWith('https://')) throw new Error('업로드 응답에 이미지 주소가 없습니다.');
  return url;
}
