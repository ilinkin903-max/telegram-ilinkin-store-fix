# v84.4 — HARD STOP Workflow Reseller

- Payment watcher hanya menjalankan workflow jika belum ada run atau run masih `queued`.
- Run `running`, `attention`, `failed`, `canceled`, atau `delivered` tidak pernah dijalankan kembali oleh payment watcher.
- Semua error workflow, termasuk `WORKFLOW_BUSY`, sekarang menjadi `attention`, bukan `queued`.
- `retryWorkflowOrder()` menolak retry tanpa `forceRestart=true` jika invoice sudah memiliki workflow run.
- Restart hanya dapat dilakukan melalui aksi manual owner dengan `forceRestart=true`.
- Worker API tidak menjadwalkan ulang dan status error selalu `attention`.
- Memutus jalur retry berantai yang menyebabkan workflow supplier terkirim 2x dan saldo terpotong berulang.
