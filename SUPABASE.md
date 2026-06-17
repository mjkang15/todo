# Supabase 마이그레이션 가이드

localStorage → Supabase 전환 계획 및 설정 가이드

---

## 0. 이메일 인증 기능 활성화 (신규)

### 0-1. Supabase Auth 설정
[app.supabase.com](https://app.supabase.com) → 프로젝트 → **Authentication > Providers > Email**

- **Enable Email provider**: ON
- **Confirm email**: OFF 권장 (file:// 앱에서 리다이렉트가 불가하므로)

> `Confirm email`을 ON으로 유지하려면 Supabase 대시보드 **Authentication > URL Configuration** 에서  
> `Site URL`을 앱이 호스팅되는 URL로 설정해야 합니다.

### 0-2. todos 테이블에 user_id 컬럼 추가 및 RLS 설정
Supabase **SQL Editor**에서 아래 SQL을 실행합니다.

```sql
-- 기존 데이터 초기화 (필요 시)
-- DELETE FROM todos;

-- user_id 컬럼 추가
ALTER TABLE todos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- RLS 활성화
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- 본인 데이터만 접근 허용 정책 (이미 존재하면 삭제 후 재생성)
DROP POLICY IF EXISTS "본인 todos만 접근" ON todos;
CREATE POLICY "본인 todos만 접근"
  ON todos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

> 위 SQL을 실행해야 회원가입/로그인 후 할 일 추가가 정상 동작합니다.

---

## 1. Supabase 프로젝트 연결

### 1-1. 프로젝트 정보 확인
[app.supabase.com](https://app.supabase.com) → 프로젝트 선택 → **Settings > API**

| 항목 | 위치 |
|------|------|
| Project URL | `https://<project-ref>.supabase.co` |
| anon public key | `eyJ...` (공개 키, 노출 무방) |

### 1-2. 클라이언트 연결 (빌드 도구 없는 순수 HTML 앱)
`index.html` `<head>`에 CDN 추가:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

`config.js` (별도 파일로 분리, .gitignore에 추가):
```js
const SUPABASE_URL  = 'https://<project-ref>.supabase.co';
const SUPABASE_ANON = '<anon-key>';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
```

`index.html`에서 순서 보장:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="config.js"></script>   <!-- supabase 클라이언트 초기화 -->
<script src="app.js"></script>      <!-- 앱 로직 -->
```

> `config.js`는 **.gitignore에 추가**해 키가 저장소에 올라가지 않도록 한다.
> 대신 `config.example.js`를 커밋해 형식을 공유한다.

---

## 2. 테이블 구조

### todos 테이블

```sql
CREATE TABLE todos (
  id          BIGSERIAL    PRIMARY KEY,
  text        TEXT         NOT NULL,
  done        BOOLEAN      NOT NULL DEFAULT FALSE,
  priority    TEXT         NOT NULL DEFAULT 'medium'
                           CHECK (priority IN ('high', 'medium', 'low')),
  category    TEXT         NOT NULL DEFAULT 'personal'
                           CHECK (category IN ('work', 'personal', 'study', 'other')),
  due_date    DATE,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | BIGSERIAL | PK (기존 timestamp id 대체) |
| `text` | TEXT | 할 일 내용 |
| `done` | BOOLEAN | 완료 여부 |
| `priority` | TEXT | `high` / `medium` / `low` |
| `category` | TEXT | `work` / `personal` / `study` / `other` |
| `due_date` | DATE | 마감일 (nullable) |
| `sort_order` | INTEGER | 드래그 앤 드롭 수동 정렬 순서 |
| `created_at` | TIMESTAMPTZ | 생성 시각 (자동) |

> **`sort_order`가 필요한 이유**: 현재 localStorage는 배열 순서로 드래그 정렬을 유지하지만, DB는 삽입 순서가 보장되지 않으므로 별도 컬럼으로 관리해야 한다.

---

## 3. Row Level Security (RLS)

### 인증 없이 사용하는 경우 (빠른 프로토타입)
```sql
-- RLS 비활성화 (anon key로 전체 접근 허용)
ALTER TABLE todos DISABLE ROW LEVEL SECURITY;
```
> 단점: URL과 anon key를 아는 누구나 데이터에 접근 가능. **개발/데모 전용**.

### 인증 포함 (권장 — 사용자별 데이터 분리)
```sql
-- user_id 컬럼 추가
ALTER TABLE todos ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- RLS 활성화
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- 본인 데이터만 조회/수정/삭제
CREATE POLICY "본인 todos만 접근"
  ON todos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 4. app.js 변경 포인트

기존 `loadTodos` / `saveTodos` 두 함수를 Supabase 비동기 호출로 교체하면 된다.

### 기존 (localStorage)
```js
function loadTodos() {
  return JSON.parse(localStorage.getItem('todos') || '[]');
}
function saveTodos(todos) {
  localStorage.setItem('todos', JSON.stringify(todos));
}
```

### 변경 후 (Supabase)
```js
async function loadTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) console.error(error);
  return data || [];
}

async function saveTodo(todo) {            // 단건 추가
  const { error } = await supabase.from('todos').insert(todo);
  if (error) console.error(error);
}

async function updateTodo(id, changes) {   // 단건 수정 (toggle, inline edit)
  const { error } = await supabase.from('todos').update(changes).eq('id', id);
  if (error) console.error(error);
}

async function deleteTodo(id) {
  const { error } = await supabase.from('todos').delete().eq('id', id);
  if (error) console.error(error);
}
```

> `renderTodos()`를 포함한 모든 호출부를 `async/await`로 전환해야 한다.

### 실시간 동기화 (선택)
```js
supabase
  .channel('todos')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, renderTodos)
  .subscribe();
```
탭 여러 개를 열거나 다른 기기에서 변경해도 즉시 반영된다.

---

## 5. 마이그레이션 순서

1. Supabase에서 테이블 생성 (위 DDL 실행)
2. `config.js` 작성 및 `.gitignore`에 추가
3. `index.html`에 CDN + `config.js` 삽입
4. `app.js`의 `loadTodos` / `saveTodos` 교체
5. `addTodo`, `toggleTodo`, `deleteTodo`, `clearCompleted` async 전환
6. `renderTodos` async 전환 및 `await` 추가
7. 기존 localStorage 데이터를 Supabase로 일회성 이전 (필요 시)

---

## 6. .gitignore 추가 항목

```
config.js
```
