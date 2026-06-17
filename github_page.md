# GitHub Pages 배포 가이드

배포 후 접근 URL:
```
https://weable-kosa.github.io/kosa-vibecoding-2026-3rd/mjkang-todo/
```

---

## 핵심 문제: config.js가 .gitignore에 있다

`config.js`(Supabase 연결 키)는 `.gitignore`로 커밋에서 제외되어 있어,
그대로 GitHub Pages에 올리면 앱이 동작하지 않는다.

해결 방법은 두 가지다.

---

## 방법 A. GitHub Actions + Secrets 자동 배포 (권장)

키를 저장소에 커밋하지 않고, GitHub Secrets에 보관한 뒤
Actions가 배포 시점에 `config.js`를 생성해 `gh-pages` 브랜치에 올린다.

### 1단계 — GitHub Secrets 등록

`https://github.com/weable-kosa/kosa-vibecoding-2026-3rd/settings/secrets/actions`

| Secret 이름 | 값 |
|------------|-----|
| `SUPABASE_URL` | `https://silvxqcunplpwjizieoy.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` (anon public key 전체) |

### 2단계 — 워크플로 파일 생성

저장소 루트에 `.github/workflows/deploy-mjkang-todo.yml` 파일 추가:

```yaml
name: Deploy mjkang TODO to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'src/exercise/mjkang/day02/todo/**'

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: config.js 생성 (Secrets → 파일)
        run: |
          cat > src/exercise/mjkang/day02/todo/config.js <<'CONF'
          const db = window.supabase.createClient(
            '${{ secrets.SUPABASE_URL }}',
            '${{ secrets.SUPABASE_ANON_KEY }}'
          );
          CONF

      - name: gh-pages 브랜치에 배포
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: src/exercise/mjkang/day02/todo
          destination_dir: mjkang-todo
```

### 3단계 — GitHub Pages 활성화

`https://github.com/weable-kosa/kosa-vibecoding-2026-3rd/settings/pages`

| 항목 | 설정 |
|------|------|
| Source | **Deploy from a branch** |
| Branch | `gh-pages` / `/ (root)` |

### 4단계 — main 브랜치에 push

todo 파일을 수정해 push하면 Actions가 자동 실행되어 배포된다.

---

## 방법 B. config.js 직접 커밋 (간단)

Supabase anon key는 "공개 키"로 설계되어 브라우저에 노출되어도 무방하다.
`.gitignore`에서 제외하고 커밋하는 방법이다.

### 1단계 — .gitignore에서 제거

`.gitignore` 파일에서 `config.js` 줄 삭제 후 커밋:

```bash
git add .gitignore config.js
git commit -m "feat: config.js 커밋 추가"
git push
```

### 2단계 — GitHub Pages 활성화

`https://github.com/weable-kosa/kosa-vibecoding-2026-3rd/settings/pages`

| 항목 | 설정 |
|------|------|
| Source | **Deploy from a branch** |
| Branch | `main` / `/ (root)` |

### 접근 URL

```
https://weable-kosa.github.io/kosa-vibecoding-2026-3rd/src/exercise/mjkang/day02/todo/
```

> 단점: URL이 길고, config.js가 git 히스토리에 영구 기록된다.

---

## 방법 비교

| | 방법 A (Actions) | 방법 B (직접 커밋) |
|-|-----------------|------------------|
| 보안 | ✅ 키가 저장소에 없음 | △ 키가 히스토리에 기록 |
| 복잡도 | 워크플로 파일 작성 필요 | 간단 |
| URL | 짧고 깔끔 | 경로가 긺 |
| 자동 배포 | push 시 자동 | 수동 or 자동 |
| 권장 대상 | 실제 서비스 | 학습/데모 |
