/* Vercel 서버리스 — 테스트 계정 로그인. GenOS 연동은 없다.
 *
 * 왜 서버인가
 *   아이디·비밀번호가 Vercel 환경변수에 있어서 정적 프론트에서는 읽을 수 없다.
 *   브라우저로 나가는 것은 통과 여부와 userId 뿐이다 — 비밀번호는 여기까지만 온다.
 *
 * 보안 등급은 여기서 정하지 않는다. 로그인 뒤 사용자가 화면에서 직접 고른다(js/auth.js).
 *
 * 환경변수 (Vercel > Project > Settings > Environment Variables)
 *   id        로그인 아이디
 *   password  로그인 비밀번호
 */
export const config = { runtime: 'edge' }

/** 프론트가 이해하는 응답 모양 — 백엔드 schemas.py 의 ChatResponse 와 같은 {code, errMsg, data}. */
const json = (status, payload) =>
  new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })

const fail = (status, errMsg) => json(status, { code: 1, errMsg, data: null })

export default async function handler(req) {
  if (req.method !== 'POST') return fail(405, 'POST 만 허용합니다')

  const { id, password } = process.env
  // 환경변수가 없으면 막는다 — 빈 값끼리 맞아떨어져 아무나 들어오면 안 된다
  if (!id || !password) return fail(500, '서버에 계정(id · password)이 설정되지 않았습니다')

  let body
  try {
    body = await req.json()
  } catch {
    return fail(400, '요청 형식이 올바르지 않습니다')
  }

  if ((body?.user_id || '').trim() !== id || (body?.password || '') !== password) {
    return fail(401, '아이디 또는 비밀번호를 확인해 주세요')
  }

  return json(200, { code: 0, errMsg: 'success', data: { userId: id } })
}
