/* 백엔드 엔드포인트와 연결 설정(모델 서빙 ID · 인증 토큰).
 *
 * GenOS 게이트웨이를 직접 부르지 않고 같은 오리진의 프록시(api/chat.js)를 거친다 —
 * 브라우저가 게이트웨이를 직접 부르면 CORS 로 막힌다. 이유는 api/chat.js 주석 참고.
 *
 * 게이트웨이 주소는 여기 없다. 프록시(서버)만 알면 되므로 Vercel 환경변수에 둔다.
 * 서빙 ID·인증 토큰은 헤더의 「연결 설정」에서 사용자가 입력할 수 있고, 둘 다 없으면
 * 프록시의 서버 기본값(SERVING_ID · GENOS_AUTH_KEY)이 쓰인다.
 */

export const CHAT_URL = '/api/chat'

const TOKEN_KEY = 'genos_auth_key'
const SERVING_KEY = 'genos_serving_id'

/**
 * 브라우저에 저장된 인증 토큰. 없으면 빈 문자열.
 *
 * 없어도 된다 — 프록시에 GENOS_AUTH_KEY 가 설정돼 있으면 서버 키로 처리된다.
 * 그 경우 키가 브라우저에 전혀 남지 않는다(권장). 설정이 없을 때만 이 키가 쓰인다.
 */
export const savedKey = () => localStorage.getItem(TOKEN_KEY) || ''

/** 브라우저에 저장된 모델 서빙 ID. 없으면 빈 문자열 → 프록시의 SERVING_ID 가 쓰인다. */
export const savedServingId = () => localStorage.getItem(SERVING_KEY) || ''

/** 「연결 설정」 저장. 빈 값은 지운다 — 지우면 다시 서버 기본값으로 돌아간다. */
export function saveSettings({ servingId, key }) {
  const store = (name, value) =>
    value ? localStorage.setItem(name, value) : localStorage.removeItem(name)
  store(SERVING_KEY, servingId.trim())
  store(TOKEN_KEY, key.trim())
}
