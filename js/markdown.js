/* 아주 작은 마크다운 렌더러.
 *
 * 툴 결과가 마크다운 파이프 표로 오므로 **표와 굵게만** 처리한다.
 * 그 밖의 문법(제목·목록·코드펜스)은 일부러 다루지 않는다 — 스트리밍 중 반쯤 온 마크업을
 * 매 토큰마다 다시 파싱해야 해서, 문법을 늘릴수록 깜빡임과 오파싱이 늘어난다.
 *
 * 숫자만 있는 열은 우측 정렬 + 고정폭 글꼴로 바꾼다 (.num).
 */
import { esc } from './dom.js'

/** 텍스트를 문단/표 블록으로 나눈다. */
function parse(text) {
  const blocks = []
  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i += 1) {
    // 표의 시작: `| ... |` 다음 줄이 `|--` 로 시작하는 구분선
    const isTable = lines[i].trim().startsWith('|') && (lines[i + 1] || '').trim().startsWith('|--')
    if (!isTable) {
      blocks.push({ kind: 'p', text: lines[i] })
      continue
    }

    const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
    const header = cells(lines[i])
    const rows = []
    i += 2 // 헤더 줄과 구분선을 건너뛴다
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      rows.push(cells(lines[i]))
      i += 1
    }
    i -= 1 // 바깥 for 가 다시 +1 하므로 되돌린다
    blocks.push({ kind: 'table', header, rows })
  }

  return blocks
}

const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
const isNum = (v) => /^-?[\d,.]+$/.test(v)

function tableHtml(block) {
  // 모든 행이 숫자인 열만 우측 정렬한다
  const numCol = block.header.map((_, c) => block.rows.every((r) => isNum(r[c] || '')))
  const cls = (c) => (numCol[c] ? 'num' : '')

  const head = block.header.map((h, c) => `<th class="${cls(c)}">${esc(h)}</th>`).join('')
  const body = block.rows
    .map((r) => '<tr>' + block.header.map((_, c) => `<td class="${cls(c)}">${esc(r[c] || '')}</td>`).join('') + '</tr>')
    .join('')

  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
}

/** 마크다운 텍스트 → HTML 문자열. */
export function render(text) {
  let html = ''
  let buffer = []

  // 연속된 문단 줄을 모았다가 한 덩어리로 내보낸다 (줄바꿈은 CSS 의 pre-wrap 이 살린다)
  const flush = () => {
    if (!buffer.length) return
    const body = buffer.join('\n').replace(/^\n+|\n+$/g, '')
    if (body) html += `<div class="para">${inline(body)}</div>`
    buffer = []
  }

  for (const block of parse(text)) {
    if (block.kind === 'p') {
      buffer.push(block.text)
      continue
    }
    flush()
    html += tableHtml(block)
  }
  flush()

  return html
}
