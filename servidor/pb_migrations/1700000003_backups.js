/// <reference path="../pb_data/types.d.ts" />
// Backup automático diário às 6h UTC (3h em Brasília), guardando os 7 mais recentes no próprio disco.
migrate((app) => {
  const s = app.settings();
  s.backups.cron = '0 6 * * *';
  s.backups.cronMaxKeep = 7;
  app.save(s);
}, (app) => {
  const s = app.settings(); s.backups.cron = ''; app.save(s);
});
