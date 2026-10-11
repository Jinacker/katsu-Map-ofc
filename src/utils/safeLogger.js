const SAFE_ERROR_CODES = new Set([
  'ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED',
  'ERR_BAD_REQUEST', 'ERR_BAD_RESPONSE', 'ERR_INVALID_URL',
  'ERR_NOT_SUPPORT', 'ERR_FR_TOO_MANY_REDIRECTS',
]);

function summarizeError(error) {
  const status = error?.response?.status;
  return {
    status: Number.isInteger(status) && status >= 100 && status <= 599 ? status : null,
    code: SAFE_ERROR_CODES.has(error?.code) ? error.code : 'UNKNOWN_ERROR',
  };
}

// context에는 작업명을 사용한다. 요청/응답 본문, 헤더, URL, 오류 메시지는 출력하지 않는다.
export function logAdminError(error, context = '관리자 요청 실패') {
  console.error(context, summarizeError(error));
}

export function logAdminWarning(error, context = '관리자 요청 경고') {
  console.warn(context, summarizeError(error));
}
