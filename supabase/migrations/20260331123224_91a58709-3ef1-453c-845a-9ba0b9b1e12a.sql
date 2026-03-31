SELECT cron.schedule(
  'discover-clean-products-weekly',
  '0 3 * * 1',
  $$
  SELECT net.http_post(
    url:='https://hoxoaubghdifiprzfcmq.supabase.co/functions/v1/discover-clean-products',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhveG9hdWJnaGRpZmlwcnpmY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzkxMTUsImV4cCI6MjA4MDc1NTExNX0.ZDK6YAG_r7OH3vNjzj6Nh99rioFUILZgBjMkB3tr1Zk"}'::jsonb,
    body:='{"time": "weekly"}'::jsonb
  ) AS request_id;
  $$
);