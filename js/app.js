/* 진입점 — 화면 상태를 들고 있고, 전송·수신·이벤트 바인딩을 엮는다.
 *
 * 한 턴의 흐름
 *   send()  →  api.streamChat()  →  handle(frame)  →  messages.* / hitl.*
 *
 * 상태는 셋뿐이다.
 *   busy      스트리밍 중 (입력 잠금)
 *   awaiting  HITL 응답 대기 중 (입력 잠금 — 카드의 버튼으로만 진행할 수 있다)
 *   sessionId 대화 하나를 묶는 키. 백엔드 LangGraph 의 thread_id 가 된다.
 *
 * 화면은 로그인(<dialog id="login">) 을 통과해야 열린다. 로그인은 테스트 계정으로만 통과한다.
 * 보안 등급(level) 은 로그인 뒤 좌측 하단에서 사용자가 직접 고르고, auth.js 가 들고 있다.
 */
import { refs, el, esc, bottom } from './dom.js'
import { savedKey, savedServingId, saveSettings } from './config.js'
import { login, setSecurityLevel } from './auth.js'
import { streamChat, verify } from './api.js'
import { addUser, appendToken, closeAnswer, addSources, addNotice } from './messages.js'
import { addHitl } from './hitl.js'

let sessionId = crypto.randomUUID()
let busy = false
let awaiting = false
let history = []

/* ── 입력 잠금 상태를 화면에 반영한다 ───────────────────────── */
function sync() {
  const locked = busy || awaiting
  refs.btnSend.disabled = locked
  refs.input.disabled = locked
  refs.btnVerify.disabled = busy
  refs.input.placeholder = awaiting ? '위 확인 요청에 먼저 응답해 주세요' : '무엇이든 물어보세요'
}

/* ── 전송 ───────────────────────────────────────────────────
 * humanInput 이 있으면 HITL 응답(질문 없음), 없으면 새 질문이다. */
async function send(humanInput) {
  const question = humanInput ? '' : refs.input.value.trim()
  if (!humanInput && !question) return

  if (!humanInput) {
    addUser(question)
    history.push(question)
    if (history.length === 1) {
      refs.title.textContent = question
      renderNav()
    }
    refs.input.value = ''
    refs.input.style.height = 'auto'
  }

  busy = true
  awaiting = false
  sync()

  try {
    await streamChat({ question, humanInput, sessionId }, handle)
  } catch (err) {
    addNotice('응답을 받지 못했습니다', String(err && err.message ? err.message : err))
  } finally {
    closeAnswer()
    busy = false
    sync()
    bottom()
  }
}

/* ── SSE 프레임 한 개를 화면에 반영한다 ─────────────────────── */
function handle(frame) {
  if (frame.event === 'token') return appendToken(frame.data)
  if (frame.event === 'sourceDocuments') return addSources(frame.data || [])
  if (frame.event === 'action') {
    awaiting = addHitl(frame.data || {}, send)
    sync()
    return
  }
  if (frame.event === 'error') return addNotice('처리 중 오류가 발생했습니다', frame.data || '')
  // end: send() 의 finally 에서 정리한다
}

/* ── 화면 조작 ──────────────────────────────────────────────── */
function renderNav() {
  refs.navList.innerHTML = ''
  history.slice(0, 1).forEach((q) => refs.navList.appendChild(el(`<div class="nav-item on">${esc(q)}</div>`)))
}

/** 새 대화 — 세션 ID 를 새로 뽑으면 백엔드의 체크포인트도 새 것이 된다. */
function reset() {
  sessionId = crypto.randomUUID()
  refs.feedInner.innerHTML = ''
  refs.navList.innerHTML = ''
  history = []
  busy = false
  awaiting = false
  closeAnswer()
  refs.badge.textContent = '에이전트 미선택'
  refs.title.textContent = '새 대화'
  sync()
  refs.input.focus()
}

async function runVerify() {
  refs.btnVerify.disabled = true
  try {
    const json = await verify()
    addNotice('검증 응답', `code ${json.code} · ${json.errMsg} · ${json.data && json.data.text}`)
  } catch (err) {
    addNotice('검증 실패', String(err && err.message ? err.message : err))
  } finally {
    refs.btnVerify.disabled = false
  }
}

/* ── 이벤트 바인딩 ─────────────────────────────────────────── */
refs.btnSend.onclick = () => send(null)
refs.btnKey.onclick = openSettings
refs.btnReset.onclick = reset
refs.btnNew.onclick = reset
refs.btnVerify.onclick = runVerify

refs.input.onkeydown = (e) => {
  // Shift+Enter 는 줄바꿈. isComposing 은 한글 조합 중 Enter 가 전송되는 것을 막는다.
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    send(null)
  }
}

refs.input.oninput = () => {
  refs.input.style.height = 'auto'
  refs.input.style.height = `${Math.min(refs.input.scrollHeight, 160)}px`
}

/* ── 로그인 ─────────────────────────────────────────────────
 * 테스트 계정(auth.js)으로만 통과하는 관문. 성공할 때까지 대화 화면을 쓸 수 없다. */
refs.login.addEventListener('cancel', (e) => e.preventDefault())   // Esc 로 닫히면 관문이 무의미하다

refs.loginForm.onsubmit = async (e) => {
  e.preventDefault()
  const userId = refs.loginId.value.trim()
  const password = refs.loginPw.value
  if (!userId || !password) return

  lockLogin(true)
  try {
    const user = await login(userId, password)
    refs.userAv.textContent = user.userId.slice(0, 1).toUpperCase()
    refs.userName.textContent = user.userId
    refs.level.value = String(user.level)
    refs.level.disabled = false
    showLevel(user.level)
    refs.login.close()
    refs.input.focus()
  } catch (err) {
    refs.loginError.textContent = err.message
    refs.loginError.hidden = false
    refs.loginPw.value = ''
    refs.loginPw.focus()
  } finally {
    lockLogin(false)
  }
}

/* ── 보안 등급 ───────────────────────────────────────────────
 * 사용자가 직접 고른다. api.js 가 매 요청에 auth.securityLevel() 을 실어 보낸다.
 * ⚠ 브라우저 값이라 위조할 수 있다 — 데모용이고 실제 접근 통제가 아니다. */
const showLevel = (level) => { refs.userOrg.textContent = `보안등급 ${level}` }

refs.level.onchange = () => {
  const level = Number(refs.level.value)
  setSecurityLevel(level)
  showLevel(level)
}

/* ── 연결 설정 ───────────────────────────────────────────────
 * 모델 서빙 ID 와 인증 토큰. 둘 다 선택이고, 비우면 서버 기본값으로 돌아간다. */
function openSettings() {
  refs.settingsServing.value = savedServingId()
  refs.settingsKey.value = savedKey()
  refs.settings.showModal()
}

refs.settingsForm.onsubmit = (e) => {
  e.preventDefault()
  saveSettings({ servingId: refs.settingsServing.value, key: refs.settingsKey.value })
  refs.settings.close()
}

function lockLogin(busyNow) {
  refs.loginSubmit.disabled = busyNow
  refs.loginId.disabled = busyNow
  refs.loginPw.disabled = busyNow
  refs.loginSubmit.textContent = busyNow ? '확인 중...' : '로그인'
  if (busyNow) refs.loginError.hidden = true
}

sync()
refs.login.showModal()
