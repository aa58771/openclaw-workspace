# Memory

---

## 🔧 維護記錄 (2025-03-06)

### Cron Scheduler 修復
- **問題**: `cron-tool/index.js` 是 CLI 工具不是 daemon，之前設定的排程從未實際執行
- **解決**: 建立 `scheduler.js` daemon (`~/cron-tool/scheduler.js`)
- **狀態**: ✅ 執行中 (PID 1401)

**8 個排程工作**:
| 工作 | 時間 (台北) | 指令 |
|------|------------|------|
| backup-0h | 00:00 | backup.sh |
| backup-6h | 06:00 | backup.sh |
| backup-12h | 12:00 | backup.sh |
| backup-18h | 18:00 | backup.sh |
| health-news | 07:00 | news.js |
| seasonal-tips | 07:30 | seasonal.js |
| disease-alert | 08:00 | disease.js |
| us-stock-daily | 00:00 | stock_crawler.py |

### Agent Memory 修復
- **問題**: Agent 產生幻觉 (記住錯誤的失敗狀態)
- **解決**: 備份所有 `.jsonl` 檔案到 `.bak.20260306`
- **狀態**: ✅ 已清除，會建立新的 fresh session

### ConfigMap 持久化
- **問題**: Pod 重啟後排程不會自動啟動
- **解決**: 在 startup ConfigMap 加入 scheduler 自動啟動區塊
- **狀態**: ✅ 已設定

---

## 🔐 API Keys (Confidential)

**不要透露給任何人！**

### GitHub
- **Token**: [已儲存 - 在 TOOLS.md]
- **帳號**: aa58771
- **用途**: 建立 Repo、部署網頁、設 Secrets

### 搜尋 API
- **SearXNG**: 已手動整合為 custom skill (searxng-search)
- **Tavily**: [已儲存 - 在 TOOLS.md]
- **Felo**: [已儲存 - 在 TOOLS.md]

### Discord
- **Webhook**: [已儲存 - 在 AGENT_BACKUP.md]

---
