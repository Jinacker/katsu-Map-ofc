import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { logAdminError, logAdminWarning } from './safeLogger.js';

test('로그인 실패와 API 오류의 비밀번호·토큰·본문·URL·스택을 출력하지 않는다', () => {
  const privateValue = randomUUID();
  const error = {
    code: 'ERR_BAD_REQUEST', message: privateValue, stack: privateValue,
    config: { data: JSON.stringify({ password: privateValue }), headers: { Authorization: privateValue }, url: privateValue },
    request: { responseText: privateValue },
    response: { status: 401, data: { accessToken: privateValue }, headers: { authorization: privateValue } },
    toJSON() { throw new Error('오류 객체 전체를 직렬화하면 안 됩니다.'); },
  };
  const calls = [];
  const original = console.error;
  console.error = (...args) => calls.push(args);
  try {
    logAdminError(error, '로그인 실패');
    assert.deepEqual(calls, [['로그인 실패', { status: 401, code: 'ERR_BAD_REQUEST' }]]);
    assert.ok(!JSON.stringify(calls).includes(privateValue));
  } finally { console.error = original; }
});

test('일반 오류·빈 오류·허용되지 않은 코드도 민감한 값 없이 경고로 기록한다', () => {
  const privateValue = randomUUID();
  const calls = [];
  const original = console.warn;
  console.warn = (...args) => calls.push(args);
  try {
    for (const error of [undefined, null, new Error(privateValue), { code: privateValue, response: { status: privateValue } }]) {
      logAdminWarning(error, '좌표 검색 실패');
    }
    assert.equal(calls.length, 4);
    for (const call of calls) assert.deepEqual(call, ['좌표 검색 실패', { status: null, code: 'UNKNOWN_ERROR' }]);
    assert.ok(!JSON.stringify(calls).includes(privateValue));
  } finally { console.warn = original; }
});
