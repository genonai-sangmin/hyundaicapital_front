/* HITL(Human In The Loop) 카드 — SSE `action` 프레임을 사람이 누를 수 있는 UI 로 바꾼다.
 *
 * 두 종류뿐이다.
 *   single-select / multi-select  에이전트 선택        → addSelect
 *   approve-button (+ reject-button)  SQL 실행 승인    → addApprove
 *
 * 응답은 respond(humanInput) 으로 밖에 넘긴다. 실제 전송은 app.js 가 한다 —
 * 이 파일이 전송까지 맡으면 app.js 와 서로를 import 하는 순환이 생긴다.
 *
 * 한 번 누르면 카드를 잠근다(버튼 disabled). 같은 카드로 두 번 응답하면
 * 그래프가 이미 지나간 지점이라 서버에서 조용히 무시되고, 화면만 어긋난다.
 */
import { refs, el, esc } from './dom.js'
import { botRow, closeAnswer, addNotice } from './messages.js'
import * as icons from './icons.js'

/**
 * action 프레임을 그린다.
 * @returns {boolean} 사용자 응답을 기다리는 상태가 되었는지 (false = 그릴 수 없었음)
 */
export function addHitl(data, respond) {
  closeAnswer()
  const elements = data.elements || []

  const select = elements.find((e) => e.type === 'single-select' || e.type === 'multi-select')
  if (select) {
    addSelect(select, respond)
    return true
  }

  const approve = elements.find((e) => e.type === 'approve-button')
  if (approve) {
    addApprove(approve, elements.find((e) => e.type === 'reject-button'), respond)
    return true
  }

  addNotice('표시할 수 없는 확인 요청', `지원하지 않는 요소입니다: ${elements.map((e) => e.type).join(', ')}`)
  return false
}

/* ── 에이전트 선택 ─────────────────────────────────────────── */
function addSelect(element, respond) {
  const comp = element.component || {}

  const card = el('<div class="card"></div>')
  card.appendChild(el(
    `<div class="card-head"><div class="t">${icons.CHECK_CIRCLE}사용자 확인 필요</div>` +
    `<div class="k">${esc(element.type)}</div></div>`,
  ))

  const body = el('<div class="card-body"></div>')
  body.appendChild(el(`<div class="card-q">${esc(comp.title || '선택해 주세요.')}</div>`))

  // 응답을 보내고 나면 카드를 잠그고, 고른 값을 헤더 배지에 남긴다
  const lock = (chosenBtn, label) => {
    card.querySelectorAll('button, input').forEach((n) => { n.disabled = true })
    if (chosenBtn) chosenBtn.classList.add('on')
    if (label) refs.badge.textContent = label
  }

  ;(comp.options || []).forEach((opt) => {
    const btn = el(
      `<button class="opt"><span class="mark"></span><span><span class="l">${esc(opt.label)}</span>` +
      (opt.desc ? `<span class="d">${esc(opt.desc)}</span>` : '') +
      '</span></button>',
    )
    btn.onclick = () => {
      lock(btn, opt.label)
      respond({
        interactionId: element.interactionId,
        action: 'submit',
        values: { selected: [opt.value], customInput: '' },
      })
    }
    body.appendChild(btn)
  })

  // 선택지에 없는 답을 직접 적는 칸
  const custom = el(
    '<div class="custom"><input placeholder="직접 입력">' +
    '<button class="btn-primary sm">보내기</button></div>',
  )
  const field = custom.querySelector('input')
  const submit = () => {
    const value = field.value.trim()
    if (!value) return
    lock(null, '직접 입력')
    respond({
      interactionId: element.interactionId,
      action: 'submit',
      values: { selected: [], customInput: value },
    })
  }
  custom.querySelector('button').onclick = submit
  field.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }
  body.appendChild(custom)

  card.appendChild(body)
  botRow(card)
}

/* ── SQL 실행 승인 ─────────────────────────────────────────── */
const SQL_MARKER = '실행할 SQL:'

function addApprove(approve, reject, respond) {
  // 서버는 제목 한 줄에 설명과 SQL 을 `실행할 SQL:` 로 이어 붙여 보낸다. 여기서 둘로 가른다.
  const fullTitle = (approve.component && approve.component.title) || '이 작업을 실행할까요?'
  const at = fullTitle.indexOf(SQL_MARKER)
  const headText = at === -1 ? fullTitle : fullTitle.slice(0, at).trim()
  const sql = at === -1 ? '' : fullTitle.slice(at + SQL_MARKER.length).trim()

  const card = el('<div class="card"></div>')
  card.appendChild(el(
    `<div class="card-head"><div class="t">${icons.SHIELD}실행 승인 필요</div>` +
    '<div class="k">approve-button</div></div>',
  ))

  const body = el('<div class="card-body"></div>')
  body.appendChild(el(`<div class="card-q">${esc(headText)}</div>`))

  if (sql) {
    body.appendChild(el('<div class="sql-label">실행할 SQL</div>'))
    body.appendChild(el(`<pre class="sql">${esc(sql)}</pre>`))
    body.appendChild(el(
      `<div class="chips"><span class="chip ok">${icons.TICK}조회 전용(SELECT) 검사 통과</span>` +
      '<span class="chip">LIMIT 200 자동 부착</span>' +
      '<span class="chip">표시된 SQL 이 그대로 실행됩니다</span></div>',
    ))
  }

  const actions = el('<div class="actions"></div>')
  const yes = el('<button class="btn-primary">답변 진행</button>')
  const no = el('<button class="btn-reject">답변 거절</button>')

  const decide = (ok) => {
    yes.disabled = true
    no.disabled = true
    actions.remove()
    body.appendChild(el(
      `<div class="decided"><i class="${ok ? 'ok' : ''}"></i>` +
      (ok ? '승인됨 · SQL 을 실행했습니다' : '거절됨 · SQL 을 실행하지 않았습니다') +
      '</div>',
    ))
    // 거절 버튼이 따로 없으면 승인 버튼의 interactionId 에 cancel 을 보낸다
    const target = ok ? approve : (reject || approve)
    respond({
      interactionId: target.interactionId,
      action: ok ? 'submit' : 'cancel',
      values: { selected: [], customInput: '' },
    })
  }

  yes.onclick = () => decide(true)
  no.onclick = () => decide(false)
  actions.appendChild(yes)
  actions.appendChild(no)
  body.appendChild(actions)

  card.appendChild(body)
  botRow(card)
}
