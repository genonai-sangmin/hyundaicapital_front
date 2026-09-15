# 현대캐피탈 AI 어시스턴트 — 프론트

GenOS 코드서빙(`hyundaicapital_web`)에 붙는 정적 프론트엔드. 빌드 도구 없이 ES 모듈만 쓴다.

## 구조

```
index.html          마크업만. 스타일·로직 없음
css/
  base.css          디자인 토큰(:root) · 리셋 · 공통 유틸
  layout.css        골격 — 좌측 내비 / 헤더 / 피드 / 입력창
  components.css    부품 — 버튼 · 말풍선 · 답변(표) · 카드 · 알림
js/
  config.js         엔드포인트 · 인증키 (서버 주소가 바뀌면 여기만)
  dom.js            id → 엘리먼트 참조, esc() / el() / bottom()
  icons.js          동적으로 붙이는 SVG
  markdown.js       render() — 표와 **굵게** 만 처리
  messages.js       말풍선 · 답변 스트리밍 · 출처 · 알림
  hitl.js           확인 요청 카드 (에이전트 선택 / SQL 승인)
  api.js            fetch + SSE 프레임 파싱 (화면은 건드리지 않음)
  app.js            진입점 — 상태(busy/awaiting/sessionId), send(), 이벤트 바인딩
```

의존 방향은 한쪽이다. `app.js` → `api.js` / `messages.js` / `hitl.js` → `dom.js` / `icons.js`.
`hitl.js` 는 응답을 직접 보내지 않고 `respond` 콜백으로 넘긴다 — `app.js` 와 순환 import 를 피하기 위해서다.

## 어디를 고치면 되나

| 하고 싶은 것 | 고칠 곳 |
| --- | --- |
| 색·글꼴 바꾸기 | `css/base.css` 의 `:root` |
| 서버 주소·서빙 ID | `js/config.js` |
| 답변 표 렌더링 | `js/markdown.js` |
| 새 HITL 요소 지원 | `js/hitl.js` 의 `addHitl` |
| 새 SSE event 처리 | `js/app.js` 의 `handle` |

## 로컬 실행

ES 모듈은 `file://` 로 열면 CORS 로 막힌다. 반드시 서버로 띄운다.

```bash
python -m http.server 3000
# http://localhost:3000
```

## 배포

Vercel 정적 배포. 빌드 설정 없음(Output Directory = 루트).

## 알려진 문제 — CORS

브라우저가 `genos.genon.ai` 게이트웨이를 직접 부르는 구조라 **현재 막혀 있다.**

- 프리플라이트 `OPTIONS` → 401 (게이트웨이가 Bearer 를 요구하는데 브라우저는 프리플라이트에 토큰을 안 싣는다)
- 응답에 `Access-Control-Allow-Origin` 없음

백엔드에 CORSMiddleware 를 넣어도 안 고쳐진다 — `OPTIONS` 는 파드까지 오지 않는다.
Vercel 서버리스 프록시(`api/chat.js`)를 두고 `js/config.js` 의 `CHAT_URL` 을 `/api/chat` 으로
바꾸면 동일 오리진이 되어 해결된다. 인증키도 브라우저에서 서버로 옮겨간다.
