/* Vercel 서버리스 프록시 — 로그인 + 보안 등급 조회를 한 번에 처리한다.
 *
 * 왜 프록시인가
 *   브라우저가 genos.genon.ai 를 직접 부르면 CORS 로 막힌다. 자세한 이유는 api/chat.js 주석 참고.
 *
 * 왜 두 호출을 여기서 묶는가
 *   access_token 을 브라우저로 내려보내지 않기 위해서다. 토큰은 이 함수 안에서만 쓰이고,
 *   프론트로 나가는 것은 보안 등급(level) 뿐이다. 비밀번호도 여기까지만 오고 저장하지 않는다.
 *
 * 환경변수
 *   GENOS_URL  게이트웨이 주소. 기본값 https://genos.genon.ai  (api/chat.js 와 공유)
 */
export const config = { runtime: 'edge' }

const GENOS_URL = process.env.GENOS_URL || 'https://genos.genon.ai'

/** 프론트가 이해하는 응답 모양 — 백엔드 schemas.py 의 ChatResponse 와 같은 {code, errMsg, data}. */
const json = (status, payload) =>
  new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })

const fail = (status, errMsg) => json(status, { code: 1, errMsg, data: null })

/** GenOS API 응답을 읽는다. 평문 오류(게이트웨이 502 등)도 삼키고 null 을 돌려준다. */
const readJson = async (res) => {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export default async function handler(req) {
  if (req.method !== 'POST') return fail(405, 'POST 만 허용합니다')

  const body = await readJson(req)
  const userId = (body?.user_id || '').trim()
  const password = body?.password || ''
  if (!userId || !password) return fail(400, '아이디와 비밀번호를 입력해 주세요')

  // ① 로그인 → access_token
  let token
  try {
    const res = await fetch(`${GENOS_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, password }),
    })
    const payload = await readJson(res)
    token = payload?.data?.access_token
    if (!token) {
      return fail(res.status === 200 ? 401 : res.status,
                  payload?.errMsg || '아이디 또는 비밀번호를 확인해 주세요')
    }
  } catch (err) {
    return fail(502, `로그인 요청에 실패했습니다: ${err.message}`)
  }

  // ② 그 토큰으로 보안 등급 조회 → level
  try {
    const res = await fetch(`${GENOS_URL}/api/admin/security-level/my-level`, {
      headers: { accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    const payload = await readJson(res)
    const level = payload?.data?.level
    if (typeof level !== 'number') {
      return fail(res.status === 200 ? 502 : res.status,
                  payload?.errMsg || '보안 등급을 확인하지 못했습니다')
    }
    return json(200, { code: 0, errMsg: 'success', data: { userId, ...payload.data } })
  } catch (err) {
    return fail(502, `보안 등급 조회에 실패했습니다: ${err.message}`)
  }
}
