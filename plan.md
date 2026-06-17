# TODO LIST 앱 구현 계획

## Context
빈 디렉토리(`day02/todo/`)에 HTML/CSS/JavaScript를 분리된 파일로 작성하는 순수 프론트엔드 TODO LIST 앱을 구현한다.

---

## 생성 파일

| 파일 | 역할 |
|------|------|
| `index.html` | 앱 구조 마크업 |
| `style.css` | 스타일링 |
| `app.js` | 기능 로직 |

---

## 파일별 상세 계획

### index.html
- `<link>` → `style.css` 연결
- `<script>` → `app.js` 연결 (body 맨 아래)
- 구조:
  ```
  .container
    h1 "TODO LIST"
    .input-area
      input#todo-input (텍스트 입력)
      button#add-btn (추가)
    ul#todo-list (할 일 목록)
    .footer
      span#remaining (남은 할 일: N개)
      button#clear-btn (완료 항목 삭제)
  ```

### style.css
- 전체: 중앙 정렬, 최대 너비 500px, 깔끔한 카드 디자인
- input + button: flex 레이아웃, 같은 높이 정렬
- 할 일 항목(`li`): 체크박스 + 텍스트 + 삭제버튼 나란히
- 완료 상태(`.done`): 텍스트에 취소선, 회색 처리
- hover/transition 효과 적용

### app.js
**데이터 구조** (localStorage key: `todos`)
```js
[{ id: timestamp, text: string, done: boolean }]
```

**주요 함수**
| 함수 | 역할 |
|------|------|
| `loadTodos()` | localStorage에서 배열 로드 |
| `saveTodos()` | localStorage에 배열 저장 |
| `renderTodos()` | ul#todo-list 전체 재렌더링 + 남은 개수 업데이트 |
| `addTodo(text)` | 새 항목 추가 후 저장·렌더 |
| `toggleTodo(id)` | done 토글 후 저장·렌더 |
| `deleteTodo(id)` | 해당 항목 제거 후 저장·렌더 |
| `clearCompleted()` | done===true 항목 일괄 제거 |

**이벤트**
- `add-btn` click → `addTodo()`
- `todo-input` keydown Enter → `addTodo()`
- `ul#todo-list` click (이벤트 위임) → 체크박스: `toggleTodo()`, 삭제버튼: `deleteTodo()`
- `clear-btn` click → `clearCompleted()`

---

## 검증 방법
1. `index.html`을 브라우저에서 열기
2. 할 일 입력 후 추가 버튼 / Enter 키로 항목 추가 확인
3. 체크박스 클릭 → 취소선 표시 확인
4. 삭제 버튼 → 항목 제거 확인
5. 페이지 새로고침 후 데이터 유지 확인 (localStorage)
6. "완료 항목 삭제" 버튼 동작 확인
