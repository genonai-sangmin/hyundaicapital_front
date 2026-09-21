/* 조직표 — 부서·팀의 AI 드라이브 노드 ID. 이 앱에서 조직 구조를 아는 곳은 여기 하나다.
 *
 * VDB 청크의 ai_drive_node_path 는 드라이브 루트→파일의 노드 ID 체인이다.
 *     /4171/4174/4222/4228/     = VDB / 부서 / 팀 / 문서
 * 그래서 「볼 수 있는 범위」는 **접두어 하나**로 표현된다. 백엔드는 이 접두어로 LIKE 검색만 한다.
 *
 * ⚠ 이 값은 브라우저가 보내는 것이라 위조할 수 있다 — 데모용이고 실제 접근 통제가 아니다.
 *   (보안 등급 x-hc-security-level 과 같은 신뢰 수준. 실제 집행은 백엔드가 사용자 토큰으로
 *    본인 소속을 직접 확인해야 한다.)
 */

/** 드라이브 루트(= VDB) 노드 ID. 경로의 첫 세그먼트. */
export const ROOT = '4171'

/** 부서 노드 ID → { 이름, 산하 팀 }. 조직이 늘면 여기만 고친다. */
export const ORG = {
  4174: { label: '부서1', teams: { 4222: '팀1', 4225: '팀2' } },
  4210: { label: '부서2', teams: { 4216: '팀1', 4219: '팀2' } },
}

/** 권한 범위. 값이 클수록 넓다 — UI 문구도 여기서 나온다. */
export const SCOPES = {
  team: '팀원',
  dept: '부서 상급자',
  all: '전체 상급자',
}

export const DEFAULT_DEPT = Object.keys(ORG)[0]
export const DEFAULT_TEAM = Object.keys(ORG[DEFAULT_DEPT].teams)[0]

/**
 * 볼 수 있는 범위를 노드 경로 접두어로 만든다. 끝 슬래시가 있어야 `/4174` 가 `/41740` 에
 * 걸리는 일이 없다.
 *     team  /4171/4174/4222/   내 팀 문서만
 *     dept  /4171/4174/        산하 팀 전부 (다른 부서는 안 보인다)
 *     all   /4171/             전 부서
 */
export function nodePath(dept, team, scope) {
  if (scope === 'all') return `/${ROOT}/`
  if (scope === 'dept') return `/${ROOT}/${dept}/`
  return `/${ROOT}/${dept}/${team}/`
}
