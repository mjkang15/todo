# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git 규칙

- 브랜치 병합 시 **rebase가 아닌 merge** 를 사용한다.
- git 명령 실행 시 이 디렉토리(`day02/todo/`) 이하의 파일만 읽으면 된다. 상위 디렉토리나 다른 프로젝트 파일은 참조하지 않는다.

## 프로젝트 개요

순수 프론트엔드 TODO LIST 앱. 빌드 도구 없음. `index.html`을 브라우저에서 직접 열면 동작한다.

## 파일 구조

| 파일 | 역할 |
|------|------|
| `index.html` | 앱 마크업 (Google Fonts/Material Icons CDN 포함) |
| `style.css` | Material Design 3 기반 스타일 (CSS 변수로 토큰 관리) |
| `app.js` | 앱 로직 전체 (상태, 렌더링, 이벤트) |
| `seed.html` | localStorage 초기 데이터 주입용 (한 번만 열면 됨) |

## 아키텍처

- **데이터 저장소**: 브라우저 `localStorage` (키: `todos`)
- **데이터 구조**: `Array<{ id: number, text: string, done: boolean, priority: 'high'|'medium'|'low', category: 'work'|'personal'|'study'|'other', dueDate: string|null }>`
- **상태**: `app.js` 모듈 스코프 변수 (`currentFilter`, `currentCategory`, `searchQuery`, `dragSrcId`)
- **렌더링**: 상태 변경 시마다 `renderTodos()`로 전체 재렌더링
- **이벤트**: `ul#todo-list`에 이벤트 위임 (단, 삭제 버튼은 `stopPropagation` 때문에 버튼 자체 핸들러에서 직접 처리)

## 반응형 브레이크포인트

- `< 600px`: 모바일 — sticky 앱바, FAB 버튼 노출
- `≥ 600px`: 데스크탑 — 중앙 카드 레이아웃, FAB 숨김
