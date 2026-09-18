/* 로그인 — 아이디·비밀번호가 맞는지 같은 오리진의 프록시(api/login.js)에 물어본다.
 * 정답은 Vercel 환경변수(id · password)에 있고 브라우저에는 오지 않는다.
 *
 * 보안 등급(level)은 서버에서 받지 않고 사용자가 화면에서 직접 고른다(좌측 하단 선택 상자).
 * 데모·테스트 전용이다 — 실제 접근 통제로 삼으면 안 된다.
 *
 * level 은 메모리에만 둔다 — 새로고침하면 다시 로그인하고 기본 등급으로 돌아간다.
 */
const LOGIN_URL = '/api/login'

/** 기본 등급. 백엔드(router.py MIN_SECURITY_LEVEL)와 같이 모르면 막는 쪽인 0 으로 둔다. */
const DEFAULT_LEVEL = 0

let profile = null // { userId, level }

/** 로그인한 사용자. 로그인 전이면 null. */
export const currentUser = () => profile

/** 보안 등급. 로그인 전이면 null. */
export const securityLevel = () => profile?.level ?? null

/** 보안 등급 변경. 로그인 전이면 아무것도 하지 않는다. */
export function setSecurityLevel(level) {
  if (profile) profile.level = level
}

/** 로그인. 실패하면 사람이 읽을 수 있는 메시지로 throw 한다. */
export async function login(userId, password) {
  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, password }),
  })

  let payload
  try {
    payload = await res.json()
  } catch {
    throw new Error(`로그인에 실패했습니다 (HTTP ${res.status})`)
  }

  if (payload.code !== 0) throw new Error(payload.errMsg || '로그인에 실패했습니다')

  profile = { userId: payload.data.userId, level: DEFAULT_LEVEL }
  return profile
}
