/* 로그인 — 테스트 계정 하나로만 통과시킨다. GenOS 연동은 없다.
 *
 * 보안 등급(level)은 서버에서 받지 않고 사용자가 화면에서 직접 고른다(좌측 하단 선택 상자).
 * 데모·테스트 전용이다 — 실제 접근 통제로 삼으면 안 된다.
 *
 * level 은 메모리에만 둔다 — 새로고침하면 다시 로그인하고 기본 등급으로 돌아간다.
 */
const ACCOUNT = { userId: 'test', password: 'test1234' }

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
  if (userId !== ACCOUNT.userId || password !== ACCOUNT.password) {
    throw new Error('아이디 또는 비밀번호를 확인해 주세요')
  }
  profile = { userId, level: DEFAULT_LEVEL }
  return profile
}
