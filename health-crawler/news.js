#!/usr/bin/env node
const https = require('https');
const { spawn } = require('child_process');

// 使用本地 SearXNG
const SEARXNG_URL = 'http://searxng.zeabur.internal:8080/search';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_NEWS || 'https://discordapp.com/api/webhooks/1479916815454048306/IcYeBP9rtcmgplEDrUS_Cj-s3O0efsHcxmtX14X-9q_8tSiWJ1C7kWUM8-7BlwYR5TJA';

const EXCLUDE_KEYWORDS = ['武器', '軍事', 'defense', 'arm', 'military', 'war', '戰爭', '導彈', '飛彈', ' defence', '選舉', ' politics'];

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

// 使用本地 SearXNG 搜尋
function searchSearXNG(keyword) {
  return new Promise((resolve, reject) => {
    const opts = { 
      cwd: process.env.HOME + '/.openclaw/workspace/skills/searxng-search', 
      stdio: 'pipe',
    };
    
    const proc = spawn('node', ['scripts/search.mjs', keyword], opts);
    let output = '';
    proc.stdout.on('data', d => output += d);
    proc.stderr.on('data', d => output += d);
    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const results = JSON.parse(output);
          resolve(results);
        } catch (e) {
          console.error('Parse error:', e.message);
          resolve([]);
        }
      } else {
        console.error('Search error:', output);
        resolve([]);
      }
    });
  });
}

// 過濾新聞：檢查標題是否包含排除關鍵字
function shouldExclude(title) {
  const lowerTitle = title.toLowerCase();
  return EXCLUDE_KEYWORDS.some(kw => lowerTitle.includes(kw.toLowerCase()));
}

async function main() {
  // 精準的繁體中文關鍵字
  const keywords = [
    '台灣 健康 醫療 養生',
    '台灣 流感 疫情 最新',
    '台灣 登革熱 病例'
  ];
  
  let allNews = [];
  
  console.log('🔍 開始透過 SearXNG 抓取台灣健康新聞...\n');
  
  for (const keyword of keywords) {
    console.log(`📌 搜尋關鍵字: ${keyword}`);
    const results = await searchSearXNG(keyword);
    
    console.log(`   抓到 ${results.length} 條`);
    
    for (const r of results) {
      // 檢查是否排除
      if (shouldExclude(r.title)) {
        console.log(`   🚫 [排除] ${r.title.substring(0, 40)}...`);
        continue;
      }
      
      console.log(`   📰 ${r.title.substring(0, 50)}...`);
      console.log(`      🔗 ${r.url}`);
      
      allNews.push({
        title: r.title,
        url: r.url,
        content: r.content || ''
      });
    }
  }
  
  // 去除重複
  const uniqueNews = [];
  const seenUrls = new Set();
  for (const news of allNews) {
    if (!seenUrls.has(news.url)) {
      seenUrls.add(news.url);
      uniqueNews.push(news);
    }
  }
  
  console.log(`\n✅ 總共抓到 ${uniqueNews.length} 條不重複的新聞\n`);
  
  if (uniqueNews.length === 0) {
    console.log('⚠️ 沒有抓到任何新聞');
    return;
  }
  
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  
  let msg = `📰 **台灣健康新聞快報** - ${today}\n\n`;
  
  // 取前 5 條
  uniqueNews.slice(0, 5).forEach((n, i) => {
    msg += `${i+1}. **${n.title}**\n`;
    msg += `   ${n.url}\n`;
  });
  
  msg += '\n💡 資料來源：SearXNG (台灣, 新聞)';
  
  console.log('=== Discord 訊息內容 ===');
  console.log(msg);
  console.log('========================\n');
  
  // 發送到 Discord
  await sendDiscordWebhook(msg);
}

main().catch(console.error);
