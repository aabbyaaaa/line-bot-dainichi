# 大日煤油暖爐 LINE 圖文選單

## 📋 概述

本專案是**大日 (Dainichi) 煤油暖爐** LINE Bot 圖文選單。
- **左側**：點擊跳轉官網商品頁面
- **右側**：點擊顯示商品 Flex Message 輪播卡片

## 🚀 快速開始

### 查看目前狀態
```bash
node scripts/richmenu.js list
```
顯示目前所有圖文選單的詳細資訊（JSON 格式）

### 暫停程式設定的圖文選單
```bash
node scripts/richmenu.js disable
```
- ✅ 取消預設圖文選單，使用者將看不到程式設定的選單
- ✅ 圖文選單設定仍保留在 LINE 伺服器，未刪除
- ✅ 可隨時恢復，不需重新上傳圖片和設定

### 部署煤油暖爐圖文選單
```bash
node scripts/richmenu.js deploy --dir richmenus --default 大日煤油暖爐主選單
```
- 重新讀取 `richmenus/` 資料夾中的設定
- 上傳到 LINE 伺服器
- 將煤油暖爐圖文選單設定為預設

### 完全刪除所有圖文選單
```bash
node scripts/richmenu.js delete-all
```
⚠️ **警告**：會永久刪除所有圖文選單，無法復原

## 📖 使用情境

### 情境 1：暫停使用程式設定，改用 LINE 後台
1. **暫停程式版本**
   ```bash
   node scripts/richmenu.js disable
   ```

2. **前往 LINE 後台設定**
   - 登入 [LINE Official Account Manager](https://manager.line.biz/)
   - 選擇你的官方帳號
   - 左側選單點選「圖文選單」
   - 建立並啟用新的圖文選單

3. **完成！** 現在使用的是後台版本

### 情境 2：從後台版本切換回程式版本
1. **在 LINE 後台停用圖文選單**
   - 進入 LINE Official Account Manager
   - 關閉或刪除後台建立的圖文選單

2. **恢復程式版本**
   ```bash
   node scripts/richmenu.js deploy --dir richmenus --default 大日煤油暖爐主選單
   ```

3. **完成！** 現在使用的是程式版本

### 情境 3：檢查目前使用哪個版本
```bash
node scripts/richmenu.js list
```
查看輸出的 JSON，確認目前啟用的圖文選單

## 🗂️ 檔案結構

```
line-bot-dainichi/
├── index.js                 # 主程式（簡化版）
├── handlers/
│   └── dainichi.js          # 煤油暖爐 Flex Message 處理
├── richmenus/               # 圖文選單設定檔資料夾
│   └── bloodPressure/       # 圖文選單（資料夾名稱保留）
│       ├── menu.json        # 選單配置（左右 50% 切割）
│       └── image.png        # 選單圖片 2500×1686 (需 < 1MB)
└── scripts/
    └── richmenu.js          # 圖文選單管理腳本
```

## 🎨 圖文選單規格

- **尺寸**：2500 × 1686 px
- **切割方式**：左右對半 (50% / 50%)
  - **左側** (0-1250px)：跳轉 https://dgs.com.tw/hotcategory/Dainichi/
  - **右側** (1250-2500px)：顯示商品 Flex Message

## 🔧 指令參考

| 指令 | 說明 | 適用情況 |
|------|------|---------|
| `list` | 列出所有圖文選單 | 查看狀態 |
| `disable` | 取消預設圖文選單（暫停） | 改用後台管理 |
| `delete-all` | 刪除所有圖文選單 | 完全清空 |
| `deploy --dir <folder> --default <name>` | 部署並啟用圖文選單 | 恢復程式版本 |

## ⚠️ 重要提醒

1. **Postback 事件處理**
   - 無論使用程式版本或後台版本，`index.js` 中的 postback 處理邏輯都需要保留
   - 在後台設定時，確保 postback 的 `data` 值與程式邏輯一致

2. **圖片規格**
   - 圖片大小必須 < 1MB
   - 支援格式：PNG、JPEG
   - 檔名：`image.png` 或 `image.jpg`

3. **程式版本 vs 後台版本**
   - 只能同時使用其中一種
   - LINE 官方帳號同時間只能有一個預設圖文選單

## 📝 範例

### 檢查並暫停當前圖文選單
```bash
# 先查看目前狀態
node scripts/richmenu.js list

# 暫停程式設定的圖文選單
node scripts/richmenu.js disable
```

### 重新部署圖文選單
```bash
# 部署 richmenus 資料夾中的所有選單，並設定為預設
node scripts/richmenu.js deploy --dir richmenus --default 大日煤油暖爐主選單
```

## ✏️ 修改商品資訊

開啟 [handlers/dainichi.js](handlers/dainichi.js)，找到商品卡片範本：

```javascript
{
  type: "text",
  text: "煤油暖爐 FW-XXXX",  // ← 改這裡：商品型號
  size: "sm",
  wrap: true,
},
{
  type: "text",
  text: "9坪適用 | 油箱9L",   // ← 改這裡：規格描述
  size: "xs",
  wrap: true,
  color: "#888888",
},
{
  type: "text",
  text: "$XX,XXX",            // ← 改這裡：優惠價
  color: "#EA4343",
  weight: "bold",
},
{
  type: "text",
  text: "$XX,XXX",            // ← 改這裡：原價
  decoration: "line-through",
  size: "sm",
  color: "#9E9E9E",
},
```

修改後需要重新部署到 Vercel：
```bash
vercel --prod
```

## 🆘 疑難排解

### 執行 disable 後顯示「目前沒有設定預設圖文選單」
- 這是正常的，表示已經成功取消預設圖文選單

### 執行 deploy 後報錯「Image too large」
- 圖片檔案超過 1MB，請壓縮圖片後重試

### 後台和程式同時啟用了圖文選單
- LINE 只會顯示後台設定的版本
- 建議先執行 `disable` 停用程式版本，避免衝突

## 📞 相關資源

- [LINE Developers 文件](https://developers.line.biz/en/docs/)
- [LINE Official Account Manager](https://manager.line.biz/)
- [Rich Menu API 說明](https://developers.line.biz/en/docs/messaging-api/using-rich-menus/)
