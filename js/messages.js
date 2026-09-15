/* 피드에 말풍선·답변·출처·알림을 붙인다.
 *
 * 답변(.answer)은 토큰이 올 때마다 innerHTML 을 통째로 다시 그린다. 표가 스트리밍 도중
 * 완성되기 때문에 부분 갱신이 오히려 복잡하다. 스트리밍 중에는 끝에 커서(.caret)를 붙이고,
 * closeAnswer() 에서 커서를 떼며 확정한다.
 */
import { refs, el, esc, bottom } from './dom.js'
import { render } from './markdown.js'
import * as icons from './icons.js'

let answerEl = null // 현재 스트리밍 중인 답변 노드 (없으면 null)
let answerText = '' // 그 노드에 지금까지 쌓인 원문

/** 봇 아바타가 달린 줄을 만들어 inner 를 담아 붙인다. */
export function botRow(inner) {
  const row = el(`<div class="row"><div class="av-bot">${icons.BOT}</div><div class="body"></div></div>`)
  row.querySelector('.body').appendChild(inner)
  refs.feedInner.appendChild(row)
  bottom()
  return row
}

/** 사용자 질문 말풍선. */
export function addUser(text) {
  refs.feedInner.appendChild(el(`<div class="row user"><div class="bubble">${esc(text)}</div></div>`))
  bottom()
}

/** 답변 토큰 한 조각을 이어 붙인다. 첫 조각이면 답변 노드를 새로 만든다. */
export function appendToken(text) {
  if (!answerEl) {
    answerEl = el('<div class="answer"></div>')
    answerText = ''
    botRow(answerEl)
  }
  answerText += text
  answerEl.innerHTML = render(answerText) + '<span class="caret"></span>'
  bottom()
}

/** 스트리밍을 끝내고 커서를 뗀다. 답변 뒤에 다른 것을 붙이기 전에 항상 먼저 부른다. */
export function closeAnswer() {
  if (answerEl) answerEl.innerHTML = render(answerText)
  answerEl = null
  answerText = ''
}

/** RAG 출처 문서 카드. */
export function addSources(docs) {
  closeAnswer()

  const card = el('<div class="card"></div>')
  card.appendChild(el(
    `<div class="card-head"><div class="t">${icons.DOC}출처 ${docs.length}건</div>` +
    '<div class="k">sourceDocuments</div></div>',
  ))

  const list = el('<div></div>')
  docs.forEach((doc, i) => {
    const m = doc.metadata || {}
    const meta = [
      m.i_page != null ? `p.${m.i_page}` : '',
      m.score != null ? `score ${Number(m.score).toFixed(2)}` : '',
    ].filter(Boolean).join(' · ')

    list.appendChild(el(
      `<div class="src"><span class="n">${i + 1}</span><span class="c">` +
      `<span class="h"><span class="f">${esc(m.file_name || '문서')}</span>` +
      `<span class="m">${esc(meta)}</span></span>` +
      `<div class="p">${esc(doc.pageContent || '')}</div></span></div>`,
    ))
  })
  card.appendChild(list)

  botRow(card)
}

/** 경고·오류 알림 박스. */
export function addNotice(title, detail) {
  closeAnswer()
  botRow(el(`<div class="notice"><div class="t">${esc(title)}</div><div class="d">${esc(detail)}</div></div>`))
}
