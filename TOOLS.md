# TOOLS.md - 工具地圖

## 🎯 我有的工具

### 🔍 搜尋工具
| 工具 | 位置 | 用法 |
|------|------|------|
| AI 雙引擎 | `~/skills/ai-search/` | `node search.js "query" [--deep]` |
| SearXNG 搜尋 |  |  |
| 想法驗證 | `~/idea-check/` | `ideaCheck('想法', {depth:'deep'})` |

### 📊 爬蟲/自動化
| 工具 | 位置 | 排程 |
|------|------|------|
| 美股報告 | `~/us-stock-daily/` | 每天 8:00 |
| 健康新聞 | `~/health-crawler/news.js` | 每天 7:00 |
| 節氣養生 | `~/health-crawler/seasonal.js` | 每天 7:30 |
| 疾病警示 | `~/health-crawler/disease.js` | 每天 8:00 |
| 自動備份 | `~/workspace/backup.sh` | 每 6 小時 |

### ⏰ 排程工具
| 工具 | 位置 |
|------|------|
| Cron 排程 | `~/cron-tool/` |
| Scheduler Daemon | `~/cron-tool/scheduler.js` (常駐程序) |

### 💾 知識庫
| 工具 | 位置 |
|------|------|
| RAG 系統 | `~/rag-plugin/` |
| 記憶系統 | `~/memory-plugin/` |

---

## 🔐 API Keys (詳細在 `MEMORY.md`)

| 服務 | 狀態 |
|------|------|
| GitHub | ✅ 已設定 |
| Tavily | ✅ 已設定 |
| Felo | ✅ 已設定 |

---

## 📁 常用位置

| 類別 | 位置 |
|------|------|
| 技能 | `~/.openclaw/workspace/skills/` |
| 每日日誌 | `~/.openclaw/workspace/memory/` |
| 備份 | `~/.openclaw/backups/` |
| 網站 | `~/pharmacy-website/` |

---

💡 **需要什麼就來這裡找！**

---

## 🛡️ Security Tools

### Skill Sanitizer
- **Location**: `~/skills/skill-sanitizer/`
- **用途**: 7 層資安掃描
- **用法**:
  ```bash
  python3 skills/skill-sanitizer/skill_sanitizer.py scan < skill-name < SKILL.md
  ```

---

💡 **未來修復參考:**
1. **Cron 不會動** → 檢查 scheduler.js 是否在跑 (`ps aux | grep scheduler`)
2. **Agent 幻觉** → 備份並清除 `~/.openclaw/agents/main/sessions/*.jsonl`
3. **Pod 重啟後排程不見** → 檢查 ConfigMap startup 腳本
