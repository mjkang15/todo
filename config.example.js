// config.js 로 복사 후 실제 값 입력 (config.js는 .gitignore 처리됨)
const db = window.supabase.createClient(
  'https://<project-ref>.supabase.co',
  '<anon-key>'
);
