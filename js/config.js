/* 백엔드 엔드포인트와 인증키.
 *
 * GenOS 게이트웨이를 직접 부르지 않고 같은 오리진의 프록시(api/chat.js)를 거친다 —
 * 브라우저가 게이트웨이를 직접 부르면 CORS 로 막힌다. 이유는 api/chat.js 주석 참고.
 *
 * 게이트웨이 주소·서빙 ID 는 여기 없다. 프록시(서버)만 알면 되므로 Vercel 환경변수에 둔다.
 */

export const CHAT_URL = '/api/chat'

const TOKEN_KEY = 'genos_auth_key'

/**
 * 브라우저에 저장된 인증키. 없으면 빈 문자열.
 *
 * 없어도 된다 — 프록시에 GENOS_AUTH_KEY 가 설정돼 있으면 서버 키로 처리된다.
 * 그 경우 키가 브라우저에 전혀 남지 않는다(권장). 설정이 없을 때만 이 키가 쓰인다.
 */
export const savedKey = () => localStorage.getItem(TOKEN_KEY) || ''

/** 헤더의 「인증키」 버튼 — 키를 입력받아 저장한다. */
export function promptKey() {
  const key = (window.prompt('GenOS 인증키를 입력하세요', savedKey()) || '').trim()
  if (key) localStorage.setItem(TOKEN_KEY, key)
  return key
}
