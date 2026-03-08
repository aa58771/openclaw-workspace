#!/usr/bin/env node
/**
 * 疾病疫情警示 - 監控流感、登革熱等
 */

const { spawn } = require('child_process');
const https = require('https');

const TAVILY_KEY = process.env.TAVILY_API_KEY || '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';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_DISEASE || 'https://discordapp.com/api/webhooks/1479916845543854150/bVIC5OsRdNudpbroYJzyIQGYQeTDIVFGPqzNnSZhJIm0eKa5JBHuRiCwTkCY9aGhl_b5';

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
          console.log('[Webhook] ✅ 疾病警示已發送');
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

function searchDisease(keyword) {
  return new Promise((resolve) => {
    const opts = { 
      cwd: process.env.HOME + '/.openclaw/workspace/skills/tavily-search', 
      stdio: 'pipe',
      env: { ...process.env, TAVILY_API_KEY: TAVILY_KEY }
    };
    const proc = spawn('node', ['scripts/search.mjs', keyword, '-n', '3'], opts);
    let output = '';
    proc.stdout.on('data', d => output += d);
    proc.stderr.on('data', d => output += d);
    proc.on('close', () => resolve(output));
  });
}

async function checkDiseaseAlerts() {
  const keywords = [
    '流感 疫情 台灣 2026',
    '登革熱 病例 台灣',
    '腸病毒 疫情 2026'
  ];
  
  let alerts = [];
  
  for (const keyword of keywords) {
    const result = await searchDisease(keyword);
    // 簡單檢查是否有新的嚴重疫情
    if (result && result.length > 100) {
      const lines = result.split('\n').filter(l => l.trim()).slice(0, 2);
      alerts.push(...lines);
    }
  }
  
  return alerts;
}

function formatMessage(alerts) {
  const today = new Date().toLocaleDateString('zh-TW', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  
  let msg = `🏥 **疾病疫情警示** - ${today}\n\n`;
  
  if (alerts.length > 0) {
    msg += '⚠️ **近期疫情資訊：**\n\n';
    alerts.slice(0, 5).forEach(a => {
      msg += `• ${a.substring(0, 100)}\n`;
    });
  } else {
    msg += '✅ 目前沒有重大疫情資訊\n';
  }
  
  msg += '\n💡 提醒：如有症狀請就醫，平時勤洗手、戴口罩！';
  
  return msg;
}

async function main() {
  const alerts = await checkDiseaseAlerts();
  const message = formatMessage(alerts);
  console.log(message);
  
  // 發送到 Discord
  await sendDiscordWebhook(message);
}

main().catch(console.error);
