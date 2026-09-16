/* Vercel 서버리스 프록시 — 브라우저와 GenOS 게이트웨이 사이에 선다.
 *
 * 왜 필요한가
 *   브라우저가 genos.genon.ai 를 직접 부르면 CORS 로 막힌다. 두 군데서 막힌다.
 *     1. 프리플라이트 OPTIONS → 401. 게이트웨이가 Bearer 를 요구하는데,
 *        브라우저는 스펙상 프리플라이트에 Authorization 을 싣지 않는다. 통과 불가능.
 *     2. 응답에 Access-Control-Allow-Origin 이 없다.
 *   백엔드(코드서빙)에 CORSMiddleware 를 넣어도 안 고쳐진다 — OPTIONS 는 파드까지 오지 않는다.
 *
 *   이 함수는 프론트와 같은 오리진(/api/chat)에 있으므로 CORS 자체가 발생하지 않는다.
 *   서버 → 서버 호출에는 CORS 가 적용되지 않으므로 게이트웨이도 그대로 응답한다.
 *
 * 인증키
 *   브라우저가 Authorization 헤더로 보내면 그것을 쓰고, 없으면 환경변수 GENOS_AUTH_KEY 를 쓴다.
 *   환경변수를 설정해 두면 키가 브라우저에 전혀 노출되지 않는다 (권장).
 *
 * 환경변수 (Vercel > Project > Settings > Environment Variables)
 *   GENOS_AUTH_KEY  게이트웨이 인증키.  미설정 시 브라우저가 보낸 키를 쓴다
 *   SERVING_ID      코드서빙 ID.        기본값 688
 *   GENOS_URL       게이트웨이 주소.    기본값 https://genos.genon.ai
 *
 * edge 런타임을 쓰는 이유: SSE 응답 body 를 버퍼링 없이 그대로 흘려보내기 위해서다.
 */
export const config = { runtime: 'edge' }

const GENOS_URL = process.env.GENOS_URL || 'https://genos.genon.ai'
const SERVING_ID = process.env.SERVING_ID || '688'

/* 브라우저에서 받아 게이트웨이로 넘기는 커스텀 헤더 — 세션 ID 와 보안 등급.
 * x-genos-* 는 게이트웨이가 지우므로(AuthKeyBearer) 스크럽 목록에 없는 이름을 쓴다.
 * 이 프록시는 헤더를 새로 만들어 보내므로, 여기서 명시적으로 넘기지 않으면 브라우저 값이 끊긴다.
 * ⚠ js/api.js 의 SESSION_HEADER·LEVEL_HEADER, 백엔드 router.py 와 같은 이름이어야 한다. */
const PASS_THROUGH_HEADERS = ['x-hc-session-id', 'x-hc-security-level']

/** 프론트가 이해하는 실패 응답 모양 — 백엔드 schemas.py 의 ChatResponse 와 같다. */
const fail = (status, errMsg) =>
  new Response(JSON.stringify({ code: 1, errMsg, data: { text: '' } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export default async function handler(req) {
  if (req.method !== 'POST') return fail(405, 'POST 만 허용합니다')

  const fromClient = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  const key = fromClient || process.env.GENOS_AUTH_KEY || ''
  if (!key) {
    return fail(401, '인증키가 없습니다. 헤더의 「인증키」로 등록하거나 GENOS_AUTH_KEY 를 설정해 주세요.')
  }

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }
  for (const name of PASS_THROUGH_HEADERS) {
    const value = req.headers.get(name)
    if (value) headers[name] = value
  }

  let upstream
  try {
    upstream = await fetch(`${GENOS_URL}/api/gateway/code_serving/${SERVING_ID}/chat`, {
      method: 'POST',
      headers,
      body: await req.text(),
    })
  } catch (err) {
    return fail(502, `게이트웨이에 연결하지 못했습니다: ${err.message}`)
  }

  // SSE 는 body 를 그대로 흘려보낸다. 여기서 await 로 다 읽으면 스트리밍이 죽는다.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no', // 앞단 프록시가 SSE 를 모아 한 번에 보내는 것을 막는다
    },
  })
}
