/* DOM 참조와 아주 작은 헬퍼.  index.html 의 id 를 아는 곳은 여기 한 군데뿐이다 —
 * 마크업에서 id 를 바꾸면 이 파일만 따라 고치면 된다. */

/** id 로 찾은 엘리먼트들. 이름은 카멜케이스, id 는 케밥케이스. */
export const refs = {
  feed: document.getElementById('feed'),
  feedInner: document.getElementById('feed-inner'),
  input: document.getElementById('input'),
  btnSend: document.getElementById('btn-send'),
  btnReset: document.getElementById('btn-reset'),
  btnNew: document.getElementById('btn-new'),
  btnVerify: document.getElementById('btn-verify'),
  btnKey: document.getElementById('btn-key'),
  badge: document.getElementById('badge'),
  title: document.getElementById('title'),
  navList: document.getElementById('nav-list'),
  userAv: document.getElementById('user-av'),
  userName: document.getElementById('user-name'),
  userOrg: document.getElementById('user-org'),
  level: document.getElementById('level'),
  dept: document.getElementById('dept'),
  team: document.getElementById('team'),
  scope: document.getElementById('scope'),
  scopePath: document.getElementById('scope-path'),
  login: document.getElementById('login'),
  loginForm: document.getElementById('login-form'),
  loginId: document.getElementById('login-id'),
  loginPw: document.getElementById('login-pw'),
  loginError: document.getElementById('login-error'),
  loginSubmit: document.getElementById('login-submit'),
  settings: document.getElementById('settings'),
  settingsForm: document.getElementById('settings-form'),
  settingsServing: document.getElementById('settings-serving'),
  settingsKey: document.getElementById('settings-key'),
}

/** HTML 특수문자를 이스케이프한다. innerHTML 에 넣는 모든 사용자·모델 문자열은 반드시 통과시킨다. */
export const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/** HTML 문자열 → 엘리먼트 한 개. */
export const el = (html) => {
  const d = document.createElement('div')
  d.innerHTML = html.trim()
  return d.firstElementChild
}

/** 피드를 맨 아래로 스크롤한다. */
export const bottom = () => {
  refs.feed.scrollTop = refs.feed.scrollHeight
}
