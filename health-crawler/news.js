#!/usr/bin/env node
const { spawn } = require('child_process');
const https = require('https');

const TAVILY_KEY = process.env.TAVILY_API_KEY || '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';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_NEWS || 'https://discordapp.com/api/webhooks/1479916815454048306/IcYeBP9rtcmgplEDrUS_Cj-s3O0efsHcxmtX14X-9q_8tSiWJ1C7kWUM8-7BlwYR5TJA';

const MIN_RELEVANCE = 0.05; // 過濾掉相關性低於 5% 的無關新聞
const EXCLUDE_KEYWORDS = ['武器', '軍事', 'defense', 'arm', 'military', 'war', '戰爭', '導彈', '飛彈', ' defence']; // 排除關鍵字

function sendDiscordWebhook(message) {
  return new Promise((resolve, reject) => {
    const url = new URL(WEBHOOK_URL);
    const payload = JSON.stringify({ content: message });
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('[Webhook] ✅ 健康新聞已發送');
          resolve();
        } else {
          console.log('[Webhook] ❌ 發送失敗:', res.statusCode, body);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (e) => {
      console.log('[Webhook] ❌ 發送錯誤:', e.message);
      reject(e);
    });
    
    req.write(payload);
    req.end();
  });
}

function searchHealth(keyword) {
  return new Promise((resolve) => {
    const opts = { 
      cwd: process.env.HOME + '/.openclaw/workspace/skills/tavily-search', 
      stdio: 'pipe',
      env: { ...process.env, TAVILY_API_KEY: TAVILY_KEY }
    };
    const proc = spawn('node', ['scripts/search.mjs', keyword, '-n', '10', '--topic', 'news', '--days', '7'], opts);
    let output = '';
    proc.stdout.on('data', d => output += d);
    proc.stderr.on('data', d => output += d);
    proc.on('close', () => resolve(output));
  });
}

// 解析 Tavily 回傳的結果
function parseResults(output) {
  const results = [];
  const lines = output.split('\n');
  let currentItem = null;
  
  for (const line of lines) {
    // 偵測新結果的開始（包含相關性分數）
    const itemMatch = line.match(/^- \*\*([^*]+)\*\* \((relevance:\s*(\d+)%)\)/);
    if (itemMatch) {
      // 保存上一個結果
      if (currentItem && currentItem.url) {
        results.push(currentItem);
      }
      // 開始新結果
      currentItem = {
        title: itemMatch[1].trim(),
        score: parseInt(itemMatch[3]) / 100,
        url: '',
        content: ''
      };
      continue;
    }
    
    // 偵測 URL
    if (currentItem && line.trim().startsWith('http')) {
      currentItem.url = line.trim();
      continue;
    }
    
    // 偵測內容
    if (currentItem && line.startsWith('  ') && !line.startsWith('  http') && line.trim() && !line.startsWith('  #')) {
      currentItem.content += line.trim() + ' ';
    }
  }
  
  // 保存最後一個結果
  if (currentItem && currentItem.url) {
    results.push(currentItem);
  }
  
  return results;
}

async function main() {
  // 更精準的繁體中文關鍵字
  const topics = [
    '台灣 衛福部 最新',
    '台灣 流感 疫情',
    '台灣 疫苗 施打',
    '台灣 登革熱',
    '台灣 健保 醫療'
  ];
  let allNews = [];
  
  console.log('🔍 開始抓取台灣健康新聞...\n');
  
  for (const topic of topics) {
    console.log(`📌 搜尋關鍵字: ${topic}`);
    const result = await searchHealth(topic);
    const parsed = parseResults(result);
    
    console.log(`   抓到 ${parsed.length} 條`);
    
    // 過濾：只保留相關性 >= MIN_RELEVANCE 的結果，並排除軍事/武器相關
    for (const r of parsed) {
      // 檢查是否包含排除關鍵字
      const exclude = EXCLUDE_KEYWORDS.some(kw => r.title.toLowerCase().includes(kw.toLowerCase()));
      if (exclude) {
        console.log(`   🚫 [排除] ${r.title.substring(0, 40)}...`);
        continue;
      }
      console.log(`   📰 [${(r.score * 100).toFixed(0)}%] ${r.title.substring(0, 50)}`);
      if (r.score >= MIN_RELEVANCE) {
        allNews.push(r);
      }
    }
  }
  
  // 按相關性排序
  allNews.sort((a, b) => b.score - a.score);
  
  console.log(`\n✅ 總共抓到 ${allNews.length} 條高相關新聞 (相關性>=${MIN_RELEVANCE * 100}%)`);
  
  if (allNews.length === 0) {
    console.log('⚠️ 沒有抓到任何高相關性新聞');
    return;
  }
  
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  
  let msg = `📰 **台灣健康新聞快報** - ${today}\n\n`;
  
  // 取前 5 條
  allNews.slice(0, 5).forEach((n, i) => {
    msg += `${i+1}. **${n.title}** (${(n.score * 100).toFixed(0)}%)\n`;
    msg += `   ${n.url}\n`;
  });
  
  msg += '\n💡 資料來源：Tavily 新聞搜尋 (台灣, 最近7天, 相關性>5%)';
  
  console.log('\n=== Discord 訊息內容 ===');
  console.log(msg);
  console.log('========================\n');
  
  // 發送到 Discord
  await sendDiscordWebhook(msg);
}

main().catch(console.error);
