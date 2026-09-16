/* 로그인 — GenOS 계정으로 로그인해 **보안 등급(level)** 을 받아 둔다.
 *
 * 부르는 곳은 같은 오리진의 프록시(api/login.js)다. 프록시가 로그인 → 보안 등급 조회를
 * 서버에서 이어서 하고 level 만 돌려준다. access_token 과 비밀번호는 브라우저에 남지 않는다.
 *
 * level 은 메모리에만 둔다 — 새로고침하면 다시 로그인한다.
 * localStorage 에 넣으면 사용자가 콘솔에서 고칠 수 있어서 등급이 의미를 잃는다.
 */
const LOGIN_URL = '/api/login'

let profile = null // { userId, level, name, color }

/** 로그인한 사용자. 로그인 전이면 null. */
export const currentUser = () => profile

/** 보안 등급. 로그인 전이면 null. */
export const securityLevel = () => profile?.level ?? null

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

  profile = payload.data
  return profile
}
