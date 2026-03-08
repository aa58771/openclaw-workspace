#!/usr/bin/env node
const { spawn } = require('child_process');
const https = require('https');

const TAVILY_KEY = process.env.TAVILY_API_KEY || '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';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_NEWS || 'https://discordapp.com/api/webhooks/1479916815454048306/IcYeBP9rtcmgplEDrUS_Cj-s3O0efsHcxmtX14X-9q_8tSiWJ1C7kWUM8-7BlwYR5TJA';

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
    // 使用 --topic news --days 7 強制抓取最近7天的新聞
    const proc = spawn('node', ['scripts/search.mjs', keyword, '-n', '5', '--topic', 'news', '--days', '7'], opts);
    let output = '';
    proc.stdout.on('data', d => output += d);
    proc.stderr.on('data', d => output += d);
    proc.on('close', () => resolve(output));
  });
}

async function main() {
  const topics = ['台灣 衛福部 2026', '台灣 流感 疫苗 2026', '台灣 健康 保險 2026'];
  let allNews = [];
  
  console.log('🔍 開始抓取最新健康新聞...\n');
  
  for (const topic of topics) {
    console.log(`📌 搜尋關鍵字: ${topic}`);
    const result = await searchHealth(topic);
    
    // 解析結果，提取標題和 URL
    const lines = result.split('\n');
    let currentTitle = '';
    
    for (const line of lines) {
      // 偵測標題 (以 "- **" 開頭)
      if (line.startsWith('- **')) {
        currentTitle = line.replace('- **', '').replace('**', '').trim();
      }
      // 偵測 URL
      if (line.trim().startsWith('http')) {
        const url = line.trim();
        if (currentTitle) {
          allNews.push({ title: currentTitle, url: url });
          console.log(`   📰 ${currentTitle}`);
          console.log(`      🔗 ${url}`);
        }
        currentTitle = '';
      }
    }
  }
  
  console.log(`\n✅ 總共抓到 ${allNews.length} 條新聞\n`);
  
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  
  let msg = `📰 **健康新聞快報** - ${today}\n\n`;
  
  // 取前 5 條
  allNews.slice(0, 5).forEach((n, i) => {
    msg += `${i+1}. **${n.title}**\n`;
    msg += `   ${n.url}\n`;
  });
  
  msg += '\n💡 資料來源：Tavily 新聞搜尋 (最近7天)';
  
  console.log('=== Discord 訊息內容 ===');
  console.log(msg);
  console.log('========================\n');
  
  // 發送到 Discord
  await sendDiscordWebhook(msg);
}

main().catch(console.error);
