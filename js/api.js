/* 백엔드 통신 — 요청을 만들고 SSE 스트림을 프레임 단위로 풀어 준다.
 * 화면을 건드리는 코드는 여기 없다. 그리기는 app.js 가 onFrame 으로 받아서 한다.
 *
 * 부르는 곳은 같은 오리진의 프록시(api/chat.js)다. 프록시가 GenOS 게이트웨이로 중계한다.
 *
 * SSE 프레임 모양 (백엔드 sse.py)
 *     data: {"event": "token", "data": "조각"}\n\n
 *   event 종류: token | sourceDocuments | action | error | end
 */
import { CHAT_URL, savedKey } from './config.js'

/** 세션 ID 를 싣는 커스텀 헤더. 게이트웨이가 `x-genos-*` 주체 헤더(x-genos-session-id 포함)를
 *  외부 인증키 호출에서 지우므로, 스크럽 목록에 없는 이름으로 우회한다.
 *  ⚠ 프록시(api/chat.js)와 백엔드(router.py)에 같은 이름이 박혀 있다. 바꾸려면 셋 다 바꾼다. */
export const SESSION_HEADER = 'x-hc-session-id'

const FRAME_SEP = '\n\n'
const DATA_PREFIX = 'data: '

/** 저장된 키가 있을 때만 실어 보낸다. 없으면 프록시가 서버 키로 처리한다. */
function headers(sessionId) {
  const h = { 'Content-Type': 'application/json' }
  const key = savedKey()
  if (key) h.Authorization = `Bearer ${key}`
  if (sessionId) h[SESSION_HEADER] = sessionId
  return h
}

/** 실패 응답의 errMsg 를 꺼내 사람이 읽을 메시지로 만든다. */
async function failure(res) {
  let detail = ''
  try {
    detail = (await res.json()).errMsg || ''
  } catch {
    // JSON 이 아니면(게이트웨이 평문 오류 등) 상태 코드만 쓴다
  }
  if (!detail && res.status === 401) detail = '인증키를 확인해 주세요'
  return new Error(`HTTP ${res.status}${detail ? ` — ${detail}` : ''}`)
}

/**
 * 한 턴을 보내고 SSE 응답을 받는다. 프레임이 올 때마다 onFrame({event, data}) 을 부른다.
 * 스트림이 끝나면 resolve 된다.
 *
 * 세션 ID 는 커스텀 헤더(SESSION_HEADER)로 보낸다 — 게이트웨이가 x-genos-session-id 를 지운다.
 * 바디에도 같이 실어 둔다(프록시가 헤더를 흘렸을 때의 폴백).
 */
export async function streamChat({ question, humanInput, sessionId }, onFrame) {
  const body = humanInput
    ? { question: '', stream: true, humanInput, sessionId }
    : { question, stream: true, sessionId }

  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: headers(sessionId),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw await failure(res)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // 마지막 조각은 아직 안 끝난 프레임일 수 있으니 버퍼에 남긴다
    const frames = buffer.split(FRAME_SEP)
    buffer = frames.pop()

    for (const frame of frames) {
      const line = frame.split('\n').find((l) => l.startsWith(DATA_PREFIX))
      if (!line) continue
      let parsed
      try {
        parsed = JSON.parse(line.slice(DATA_PREFIX.length))
      } catch {
        continue // 깨진 줄은 버린다
      }
      onFrame(parsed)
    }
  }
}

/** 「검증」 버튼 — 백엔드가 살아 있는지 스트리밍 없이 한 번 확인한다. */
export async function verify() {
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ question: '__verify__' }),
  })
  return res.json() // 실패도 {code, errMsg} 모양으로 오므로 그대로 보여 준다
}
