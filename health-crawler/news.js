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
    const proc = spawn('node', ['scripts/search.mjs', keyword, '-n', '3'], opts);
    let output = '';
    proc.stdout.on('data', d => output += d);
    proc.on('close', () => resolve(output));
  });
}

async function main() {
  const topics = ['衛福部 最新', '流感 疫苗', '健康 保險'];
  let allNews = [];
  
  for (const topic of topics) {
    const result = await searchHealth(topic);
    // 提取標題
    const lines = result.split('\n').filter(l => l.trim() && !l.startsWith('##'));
    allNews.push(...lines.slice(0, 2));
  }
  
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  
  let msg = `📰 **健康新聞快報** - ${today}\n\n`;
  
  // 取前 5 條
  allNews.slice(0, 5).forEach((n, i) => {
    const clean = n.replace(/[#*]/g, '').trim().substring(0, 100);
    if (clean) msg += `${i+1}. ${clean}\n`;
  });
  
  msg += '\n💡 資料來源：Google 新聞';
  
  console.log(msg);
  
  // 發送到 Discord
  await sendDiscordWebhook(msg);
}

main().catch(console.error);
