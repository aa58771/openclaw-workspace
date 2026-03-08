#!/usr/bin/env node
const https = require('https');

const SOLAR_TERMS = [
  { name: '立春', start: '02/03', tips: '養肝好時節｜多吃綠色蔬菜｜早睡早起' },
  { name: '雨水', start: '02/18', tips: '健脾去濕｜喝薏仁紅豆湯｜避免受寒' },
  { name: '驚蟄', start: '03/05', tips: '春雷響萬物生｜多吃清淡食物｜保護肝臟' },
  { name: '春分', start: '03/20', tips: '陰陽平衡｜多吃蔬菜水果｜適度運動' },
  { name: '清明', start: '04/04', tips: '踏青好時節｜養肝明目｜喝菊花茶' },
  { name: '穀雨', start: '04/19', tips: '雨生百穀｜祛濕健脾｜喝四神湯' },
  { name: '立夏', start: '05/05', tips: '養心時節｜多吃紅色食物｜午睡補充' },
  { name: '小滿', start: '05/20', tips: '濕熱季節｜清熱利濕｜喝綠豆湯' },
  { name: '芒種', start: '06/05', tips: '梅雨季節｜防濕防霉｜運動排濕' },
  { name: '夏至', start: '06/21', tips: '陽氣最旺｜清淡飲食｜多喝水' },
  { name: '小暑', start: '07/06', tips: '酷暑來臨｜清熱解暑｜喝冬瓜湯' },
  { name: '大暑', start: '07/22', tips: '最熱時節｜防中暑｜喝西瓜汁' },
  { name: '立秋', start: '08/07', tips: '秋燥來臨｜潤肺養陰｜吃百合' },
  { name: '處暑', start: '08/22', tips: '暑氣漸消｜秋老虎｜清淡進補' },
  { name: '白露', start: '09/07', tips: '日夜溫差大｜保暖防寒｜吃銀耳' },
  { name: '秋分', start: '09/22', tips: '陰陽平衡｜潤肺止咳｜吃梨子' },
  { name: '寒露', start: '10/08', tips: '露水寒涼｜養腎防寒｜吃黑豆' },
  { name: '霜降', start: '10/23', tips: '霜降進補｜牛肉羊肉｜暖身養生' },
  { name: '立冬', start: '11/07', tips: '冬令進補｜羊肉爐｜薑母鴨' },
  { name: '小雪', start: '11/22', tips: '初雪時節｜溫補腎氣｜吃堅果' },
  { name: '大雪', start: '12/06', tips: '大雪封山｜驅寒保暖｜喝紅棗茶' },
  { name: '冬至', start: '12/21', tips: '黑夜最長｜團圓進補｜吃湯圓' },
  { name: '小寒', start: '01/05', tips: '寒冷開始｜暖身驅寒｜喝桂圓紅棗' },
  { name: '大寒', start: '01/20', tips: '一年最冷｜防寒保暖｜足部保暖' }
];

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_SEASONAL || 'https://discordapp.com/api/webhooks/1479916819467997247/YIgTDd4JcH95fPfnC09Bvu8iQ5o1h8Ke1Q4dE67-SLi9bMfLQ55KtyiEi0zNv3gZCqoz';

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
          console.log('[Webhook] ✅ 節氣養生已發送');
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

function getCurrentTerm() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  for (let i = SOLAR_TERMS.length - 1; i >= 0; i--) {
    const [m, d] = SOLAR_TERMS[i].start.split('/').map(Number);
    if (month > m || (month === m && day >= d)) return SOLAR_TERMS[i];
  }
  return SOLAR_TERMS[0];
}

function formatMessage() {
  const term = getCurrentTerm();
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const tips = term.tips.split('｜');
  let msg = `🌿 **節氣養生** - ${today}\n\n現在是**${term.name}**節氣\n\n💡 **養生建議：**\n`;
  tips.forEach(tip => { msg += `• ${tip}\n` });
  msg += '\n🌤️ **今日提醒：**\n記得適度運動、早睡早起！\n';
  return msg;
}

async function main() {
  const message = formatMessage();
  console.log(message);
  
  // 發送到 Discord
  await sendDiscordWebhook(message);
}

main().catch(console.error);
