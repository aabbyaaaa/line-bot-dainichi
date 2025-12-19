const express = require("express");
const line = require("@line/bot-sdk");
const dainichi = require("./handlers/dainichi");
require("dotenv").config();

const app = express();

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// 處理 LINE Webhook
app.post("/webhook", line.middleware(config), (req, res) => {
  console.log('Received webhook:', JSON.stringify(req.body));
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => {
      console.log('Webhook handled successfully:', JSON.stringify(result));
      res.json(result);
    })
    .catch((err) => {
      console.error('Error handling webhook:', err);
      res.status(500).end();
    });
});

// 處理各種事件
async function handleEvent(event) {
  if (event.type !== "message" && event.type !== "postback") {
    return Promise.resolve(null);
  }

  let replyMessage;

  if (event.type === "postback") {
    // 處理圖文選單點擊
    replyMessage = handlePostback(event.postback.data);
  } else if (event.type === "message" && event.message.type === "text") {
    // 處理文字訊息
    replyMessage = handleTextMessage(event.message.text);
  }

  if (replyMessage) {
    return client.replyMessage(event.replyToken, replyMessage);
  }
}

// 處理 Postback 事件
function handlePostback(data) {
  console.log("Postback data:", data);

  // 右邊點擊：顯示煤油暖爐商品列表
  if (data === "action=dainichi_products") {
    return dainichi.handleDainichiProducts();
  }

  // 預設回覆
  return {
    type: "text",
    text: "歡迎來到大日煤油暖爐專區！有任何問題歡迎詢問客服。",
  };
}

// 處理文字訊息
function handleTextMessage(text) {
  // 可以根據需要添加關鍵字回覆
  // 例如：用戶輸入「煤油暖爐」就回傳商品列表
  if (text.includes("煤油暖爐") || text.includes("大日") || text.includes("Dainichi")) {
    return dainichi.handleDainichiProducts();
  }

  // 預設：不回覆（避免每句話都回應）
  return null;
}

// 健康檢查路由
app.get("/", (req, res) => {
  res.send("LINE Bot is running! (Dainichi Kerosene Heater)");
});

// 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`伺服器運行在 port ${port}`);
});

// 匯出給 Vercel 使用
module.exports = app;
