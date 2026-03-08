#!/usr/bin/env node
const https = require('https');
const { spawn } = require('child_process');

// 使用本地 SearXNG
const SEARXNG_URL = 'http://searxng.zeabur.internal:8080/search';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_NEWS || 'https://discordapp.com/api/webhooks/1479916815454048306/IcYeBP9rtcmgplEDrUS_Cj-s3O0efsHcxmtX14X-9q_8tSiWJ1C7kWUM8-7BlwYR5TJA';

// 簡體中文 / 中國網站 排除列表
const EXCLUDE_DOMAINS = ['.cn', 'china.com', 'sina.com', 'sohu.com', 'qq.com', '163.com', 'ifeng.com'];
const SIMPLIFIED_CHINESE_CHARS = ['春节', '预计', '新闻网', '新华社', '人民日报', '央视', '中国', '大陆', '内地', '港币', '人民币', '防控', '卫健委', '央视网'];

// OpenAI / LLM API 配置
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

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

// 嚴格過濾：排除簡體中文和中國網站
function isTaiwanNews(result) {
  const url = result.url.toLowerCase();
  const title = result.title;
  const content = result.content || '';
  
  // 排除中國網域（包括路徑中的 /cn/）
  for (const domain of EXCLUDE_DOMAINS) {
    if (url.includes(domain)) {
      return { pass: false, reason: `中國網域 ${domain}` };
    }
  }
  
  // 排除 /cn/ 路徑（簡體中文版）
  if (url.includes('/cn/') || url.includes('/cn/')) {
    return { pass: false, reason: '簡體中文路徑 /cn/' };
  }
  
  // 排除簡體中文關鍵字
  for (const keyword of SIMPLIFIED_CHINESE_CHARS) {
    if (title.includes(keyword) || content.includes(keyword)) {
      return { pass: false, reason: `簡體/中國用語: ${keyword}` };
    }
  }
  
  // 排除包含簡體字的標題
  const simplifiedPattern = /[\u4e00-\u9fff].*[\u4e00-\u9fff]/; // 這會匹配任何中文
  // 更精確：檢測簡體特有詞彙
  const simplifiedWords = ['预计', '春节', '元宵', '中秋', '国庆', '两会', '央行', '证监会', '保监会'];
  for (const word of simplifiedWords) {
    if (title.includes(word) || content.includes(word)) {
      return { pass: false, reason: `簡體詞: ${word}` };
    }
  }
  
  return { pass: true };
}

// 使用 LLM 產生新聞總結
async function generateSummary(newsItems) {
  if (!OPENAI_API_KEY) {
    console.log('[LLM] ⚠️ 沒有 API Key，產生簡易總結...');
    return generateSimpleSummary(newsItems);
  }
  
  // 準備新聞資料
  const newsList = newsItems.slice(0, 5).map((n, i) => `${i+1}. ${n.title}`).join('\n');
  
  const prompt = `你是台灣健康新聞助理。請閱讀以下今日台灣健康新聞標題，並用繁體中文撰寫一段 150-200 字的精華總結，重點包括：1) 最新健康政策/措施 2) 重要疫情或疾病資訊 3) 養生保健建議。\n\n新聞標題：\n${newsList}\n\n請直接給我總結，不需要標題。`;
  
  try {
    console.log('[LLM] 🔄 正在產生新聞總結...');
    
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();
    
    if (summary) {
      console.log('[LLM] ✅ 總結產生成功');
      return summary;
    } else {
      console.log('[LLM] ⚠️ 無法產生總結');
      return null;
    }
  } catch (e) {
    console.log('[LLM] ❌ Error:', e.message);
    return null;
  }
}
// 簡易總結（無 LLM 時使用）
function generateSimpleSummary(newsItems) {
  const titles = newsItems.slice(0, 5).map(n => n.title);
  
  // 簡單的規則式總結
  let summary = "今日台灣健康新聞重點：";
  
  // 提取關鍵字
  const keywords = [];
  for (const title of titles) {
    if (title.includes("流感")) keywords.push("流感疫情");
    if (title.includes("登革熱")) keywords.push("登革熱");
    if (title.includes("疫苗")) keywords.push("疫苗資訊");
    if (title.includes("健保")) keywords.push("健保制度");
    if (title.includes("養生")) keywords.push("養生保健");
    if (title.includes("疾管署") || title.includes("CDC")) keywords.push("官方防疫");
  }
  
  // 去重
  const uniqueKeywords = [...new Set(keywords)];
  
  if (uniqueKeywords.length > 0) {
    summary += "\n\n主要議題：" + uniqueKeywords.join("、") + "。";
  }
  
  summary += "\n\n詳情請參考下方新聞來源。";
  
  return summary;
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
    
    console.log(`   抓到 ${results.length} 條，開始過濾...`);
    
    for (const r of results) {
      const filterResult = isTaiwanNews(r);
      
      if (!filterResult.pass) {
        console.log(`   🚫 [排除] ${filterResult.reason}: ${r.title.substring(0, 30)}...`);
        continue;
      }
      
      console.log(`   ✅ [通過] ${r.title.substring(0, 40)}...`);
      
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
  
  console.log(`\n✅ 過濾後總共 ${uniqueNews.length} 條台灣新聞\n`);
  
  if (uniqueNews.length === 0) {
    console.log('⚠️ 沒有抓到任何台灣新聞');
    return;
  }
  
  // 取前 5 條高品質新聞
  const topNews = uniqueNews.slice(0, 5);
  
  // 使用 LLM 產生總結
  const llmSummary = await generateSummary(topNews);
  
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  
  let msg = `📰 **台灣健康新聞快報** - ${today}\n\n`;
  
  // 加入 LLM 總結
  if (llmSummary) {
    msg += `📋 **今日重點：**\n${llmSummary}\n\n`;
  }
  
  msg += `📰 **新聞來源：**\n`;
  
  // 條列新聞
  topNews.forEach((n, i) => {
    msg += `${i+1}. **${n.title}**\n`;
    msg += `   🔗 ${n.url}\n`;
  });
  
  msg += '\n💡 資料來源：SearXNG (台灣, 新聞) | AI 總結：OpenAI';
  
  console.log('=== Discord 訊息內容 ===');
  console.log(msg);
  console.log('========================\n');
  
  // 發送到 Discord
  await sendDiscordWebhook(msg);
}

main().catch(console.error);
