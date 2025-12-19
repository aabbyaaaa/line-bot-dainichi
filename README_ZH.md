# 多圖文選單 LINE Bot 專案說明（README）

本專案是一個以多圖文選單（Rich Menu）為導向的 LINE Bot 後端（Node.js + Express + @line/bot-sdk）。目標是讓行銷/營運同仁只要維護 CSV 與 JSON，就能快速更新商品卡片、調整圖文選單版位與 postback 邏輯；同時讓工程師可以用一致的設計模式擴充新的主題選單。

- 主要主題（範例）：血壓計（bloodPressure）
- 多圖文選單：A/B/C/D 四塊區域各綁不同 postback，導向相對應的內容
- 內容輸出：Flex Message（JSON/CSV 生成）
- 部署：Vercel（Serverless），Rich Menu 以腳本呼叫 LINE API 建立/上傳/設為預設

---

## 📁 專案資料夾結構說明

以樹狀展示（不列出 `node_modules` 與暫存/備份檔）：

```
.
├─ index.js                          # 主程式入口：Webhook 路由與事件分流
├─ handlers/
│  └─ bloodPressure.js               # 血壓計主題的應用邏輯（分流/回覆組裝）
├─ scripts/
│  ├─ richmenu.js                    # Rich Menu 管理腳本（list/deploy/delete-all）
│  ├─ build_flex_fat_from_csv.js     # 由 flex_fat.csv 產生 flex_fat.json
│  └─ build_flex_blood_from_csv.js   # 由 flex_blood.csv 產生 flex_blood.json + 索引
├─ bloodPressure/
│  ├─ flex_fat.csv                   # A 區卡片資料來源（CSV）
│  ├─ flex_fat.json                  # A 區卡片（完整 Flex 訊息）由 CSV 產出
│  ├─ flex_blood.csv                 # B 區商品卡片資料來源（CSV）
│  ├─ flex_blood.json                # B 區卡片（完整 Flex 訊息）由 CSV 產出
│  ├─ flex_blood_index.json          # B 區分類索引（由 CSV 同步產生）
│  ├─ flex_discount202509.json       # C 區卡片容器（carousel/bubbles）
│  └─ flex_whyus.json                # D 區卡片容器（carousel/bubbles）
├─ richmenus/
│  ├─ bloodPressure/
│  │  ├─ image.png                   # Rich Menu 背景圖（2500x1686，<1MB）
│  │  └─ menu.json                   # Rich Menu 座標與 postback 定義
│  ├─ bloodSugar/                    # 範例/預留（同結構）
│  └─ vitamix/                       # 範例/預留（同結構）
├─ package.json                      # 依賴、啟動與 npm scripts
├─ vercel.json                       # Vercel 部署設定（@vercel/node）
├─ README_EN.md                      # 英文說明
└─ README_ZH.md                      # 中文說明（本檔）
```

---

## 🧩 專案設計邏輯

- 主題分離：每個主題（例如血壓計）都有自己的內容資料夾（`bloodPressure/`）與處理邏輯（`handlers/bloodPressure.js`），便於擴充及維護。
- 內容外部化：
  - CSV → JSON（Flex）：非工程人員可用表格管理商品資料與文案，經腳本轉出 Flex JSON。
  - Rich Menu 與內容分工：`richmenus/<topic>/` 放選單資產（背景圖與熱區）；`<topic>/` 放回覆用的 Flex JSON 與 CSV。
- Postback 規則清晰：按鈕/Quick Reply/data 前綴即行為（例如 `fat`、`fat_info`、`bp:sku=`、`category=`），後端按規則回應，避免耦合。
- 可移植、可擴充：
  - 新主題僅需新增 `<topic>/` 與 `handlers/<topic>.js`，再加一組 `richmenus/<topic>/` 與路由即可。
  - CSV 欄位可逐步擴充；若需更多外觀控制，集中修改 builder 腳本。

---

## 📂 每個資料夾的功能說明

- `handlers/`
  - 放各主題的邏輯模組。現有 `handlers/bloodPressure.js`，封裝血壓計的回覆流程與 Quick Reply 組裝。
- `scripts/`
  - `richmenu.js`：Rich Menu 管理（list/deploy/delete-all），上傳圖片、設為預設，並檢查圖片大小（< 1MB，支援 PNG/JPG）。
  - `build_flex_fat_from_csv.js`、`build_flex_blood_from_csv.js`：將 CSV 轉出 Flex JSON，並（B）建立分類索引。
- `<topic>/`（例如 `bloodPressure/`）
  - 放該主題的 Flex JSON 與 CSV 資料。CSV 可被 builder 轉成最終 JSON。
- `richmenus/<topic>/`
  - 放 Rich Menu 背景圖 `image.png`（2500x1686、<1MB）與 `menu.json`（座標/動作），由 `scripts/richmenu.js` 部署。
- 根目錄
  - `index.js`：Webhook 入口與事件分流。
  - `vercel.json`：指定以 `@vercel/node` 執行 `index.js`。
  - `.env`：LINE Channel 憑證（不入庫）。

---

## 📄 每個檔案的用途說明

- `index.js`
  - 啟動 Express 與 `/webhook` 路由，接收 LINE 事件，呼叫 `handleEvent` 分流。
  - `handlePostback(data)` 內分流：
    - `"fat"` → `bp.handleFat()`（A 區卡片；卡片後追加導語文字）
    - `"fat_info"` 或 `"fat_detail:"` 前綴 → `bp.handleFatInfo()`（回 1 則官方說明）
    - 以 `"bp:"` 前綴 → `bp.handleProductInquiry()`（回 2 則官方文字＋四分類 QR）
    - `"blood"`、`"action=bp_categories"`、`"action=current_offers"`、`"action=why_choose_us"` → 分別呼叫 `handlers/bloodPressure.js` 的對應函式
    - `"category=omron_arm|omron_other|citizen_bp|nissei_bp"` → `bp.handleCategory(key)`
- `handlers/bloodPressure.js`
  - `handleFat()`：回 A 區 Flex（>10 自動分段）＋ 導語文字（😍 熱敷墊加價購 最低69折起）。
  - `handleFatInfo()`：A 卡片按鈕的官方說明（無 QR）。
  - `handleBloodIntro()`：B 的導覽（客服時間/說明/分類 QR）– 可從圖文選單 B 或文字入口觸發。
  - `handleBpCategories()`：單則「📌請選擇您想了解的血壓計分類：」＋四分類 QR。
  - `handleCategory(key)`：回該分類的卡片（>10 自動分段），不再追加提示（避免與商品按鈕回覆重複）。
  - `handleProductInquiry()`：B 的商品按鈕回覆：兩則文字＋四分類 QR。
  - `handleOffers()`/`handleWhyUs()`：C/D 的卡片；若 JSON 是容器（`{type: "carousel"}`），自動包裝成完整 Flex 訊息 `{ type:"flex", altText, contents }`，不附文字與 QR。
  - `quickReplyItems()`：四分類 Quick Reply 的標籤與 `category=` 資料鍵（已用你指定的中文）。
- `scripts/richmenu.js`
  - `list`：列出目前 LINE 帳號的所有 Rich Menu。
  - `deploy --dir <dir> --default <name>`：從 `<dir>/<topic>/` 讀 `menu.json` 與 `image.png|jpg` 建立與上傳，並將 `<name>` 設為預設。
  - `delete-all`：刪除所有 Rich Menu（小心使用）。
  - 圖片大小檢查（<1MB），自動設定 Content-Type（PNG/JPG）。
- `scripts/build_flex_blood_from_csv.js`
  - 讀取 `bloodPressure/flex_blood.csv`，輸出 `flex_blood.json`（完整 Flex 訊息）與 `flex_blood_index.json`（分類→bubble 索引）。
  - `price` 原樣輸出；`price_original` 自動補 `$`；原價右移 `offsetStart: "20px"`。
  - 徽章樣式在 `buildBadge()`；預設寬 60px 高 25px（可在此調整）。
- `scripts/build_flex_fat_from_csv.js`
  - 讀取 `bloodPressure/flex_fat.csv`，輸出 `flex_fat.json`（完整 Flex 訊息，僅取前 10 個）。
  - 預設按鈕 `postback data` 為 `fat_info`；只有 CSV 欄位 `button_display_text` 有填才會顯示使用者氣泡。
- `bloodPressure/flex_*.csv` / `flex_*.json`
  - CSV 是資料來源，JSON 是最終回覆。Flex 規格務必保持正確；builder 已做必要欄位與皮膚預設。
- `richmenus/<topic>/menu.json`
  - Rich Menu 尺寸、座標與按下後的行為（postback data）。
  - 血壓計版位（2500x1686）：
    - A：`{x:0,y:0,w:2500,h:852}` → `data:"fat"`
    - B：`{x:0,y:852,w:833,h:834}` → `data:"action=bp_categories"`
    - C：`{x:833,y:852,w:833,h:834}` → `data:"action=current_offers"`
    - D：`{x:1666,y:852,w:834,h:834}` → `data:"action=why_choose_us"`
- `vercel.json`
  - 使用 `@vercel/node` 執行 `index.js`；有 `builds` 設定時，控制台 Build 設定不生效（提示非錯誤）。

---

## 🎨 如何調整樣式、postback 文字、產品資料

- 圖文選單樣式
  - 圖片：`richmenus/bloodPressure/image.png`（建議 2500x1686，<1MB；超過會 413）
  - 熱區：`richmenus/bloodPressure/menu.json`（修改 `areas[*].bounds` 與 `action.data`）
  - 部署：`node scripts/richmenu.js deploy --dir richmenus_deploy --default bloodPressure`
- POSTBACK 資料設計與對應
  - 圖文選單（menu.json）：填 `action.data`（例如 `fat`、`action=bp_categories`、`category=omron_arm`）
  - 卡片按鈕（CSV）：填 `button_type`、`button_data_or_url`、`button_display_text`
    - 不想出使用者氣泡 → `button_display_text` 留空
    - 讓 B 商品按鈕走「兩則文字＋四分類 QR」→ `button_type=postback`、`button_data_or_url=bp:sku=<id>`
    - 讓 A 商品按鈕回一則官方說明 → `button_type=postback`、`button_data_or_url=fat_info`
- 產品資訊（文字/圖片/URL）
  - A（fat）：編輯 `bloodPressure/flex_fat.csv` 後跑 `node scripts/build_flex_fat_from_csv.js`
  - B（blood）：編輯 `bloodPressure/flex_blood.csv` 後跑 `node scripts/build_flex_blood_from_csv.js`
- 樣式微調（B）
  - 原價靠右距：`scripts/build_flex_blood_from_csv.js` 內的價格列第 2 個 text 已加 `offsetStart: "20px"`
  - 徽章寬高：同檔 `buildBadge()`（預設寬 60/高 25）
  - 背景色與按鈕色：同檔 `toBubble()` 內可調，或用 CSV 欄位 `button_color`

---

## 🔄 切換測試帳號到正式帳號（換環境流程）

1) 取得正式帳號憑證（LINE Developers Console）
- 到正式 Channel 的 Basic settings / Messaging API 頁面
- 取用：
  - Channel access token（長期）
  - Channel secret

2) 設定環境變數
- 本機 `.env`：
  - `LINE_CHANNEL_ACCESS_TOKEN=...`
  - `LINE_CHANNEL_SECRET=...`
  - `PORT=3000`（可省）
- Vercel 專案 → Settings → Environment Variables：
  - 設定同上兩個變數（Production/Preview/Development 視需求）
  - 重新部署

3) Webhook 與 Rich Menu
- LINE Console 的 Webhook URL 指向你的服務 `/webhook`，並啟用 Webhook（正式帳號也要）
- Rich Menu 必須在「正式帳號」底下重新部署（資產綁帳號）
  - `node scripts/richmenu.js list`
  - `node scripts/richmenu.js deploy --dir richmenus_deploy --default bloodPressure`
  - 如需清空：`npm run richmenu:delete-all`（請先確認）

---

## ➕ 如何擴充新的圖文選單

- 放哪裡與命名
  - 新主題命名 `<topic>`（小駝峰或全小寫）
  - 內容：`<topic>/`（放 CSV/JSON）
  - 邏輯：`handlers/<topic>.js`
  - Rich Menu：`richmenus/<topic>/{image.png, menu.json}`
- 讓主程式讀取新的選單
  - 在 `index.js` 的 `handlePostback` 增加新主題的 postback 入口（依 `menu.json` 的 `action.data`）
  - 在 `handlers/<topic>.js` 實作對應 `handleXxx()` 回覆（可參照 `handlers/bloodPressure.js`）
- JSON/CSV 設計
  - 建議共用與血壓計一致的 CSV 欄位（便於複用 builder），或複製 builder 腳本為新主題調整
  - 若需要分類索引，請仿 `build_flex_blood_from_csv.js` 產出 `<topic>_index.json`

---

## ✅ 快速開始與部署說明

- 安裝
  - `npm install`
- 本機開發
  - `.env` 填入測試帳號的 token/secret
  - `npm start`
  - 用 ngrok/cloudflared 曝露 `http://localhost:3000` → 設定 LINE Console Webhook 為 `https://<public-url>/webhook`
- 部署（Vercel）
  - 連接 GitHub 專案；設定環境變數（Production/Preview 自行規劃）
  - 推到 main 後自動部署
  - Rich Menu 部署（圖片/座標）：`node scripts/richmenu.js deploy --dir richmenus_deploy --default bloodPressure`

---

## 📌 注意事項與常見錯誤排查

- Rich Menu 圖片上傳 413
  - 原因：圖片 >1MB
  - 解法：壓縮到 <1MB，建議使用 JPEG（品質 80–85）
- Rich Menu 已部署但手機沒變
  - 客戶端快取：關閉對話重開，或等 10–60 秒
  - 你曾對某使用者做過個別綁定：可先 `list` 確認；必要時 `delete-all` 後 `deploy`
- Flex 沒顯示或回 400
  - 容器缺外層：完整 Flex 訊息為 `{type:"flex", altText, contents:{...}}`；若你手動編 JSON 請確保外層存在
  - 泡泡超過 10：A 已限前 10；B/C/D 會自動分段
- 使用者氣泡與官方氣泡
  - 使用者氣泡來自按鈕/QR 的 `displayText`
  - 官方氣泡是我們後端回覆，內容由 handler 決定
  - 若不想出使用者氣泡 → 別填 `displayText`
- Postback data 未對上
  - B 商品按鈕需 `bp:` 前綴（例如 `bp:sku=HBF217`）才會回兩則＋QR
  - A 商品按鈕需 `fat_info` 或 `fat_detail:` 前綴才會回官方說明
- 編碼與亂碼
  - 所有檔案請存 UTF-8；CSV/JSON 內含中文時尤需注意

---

如需我把血壓以外的主題（例如 bloodSugar、vitamix）也套用同一套 CSV→JSON builder 與 handler 流程，或把 badge 寬高改為 CSV 可控，告訴我要的欄位與預設值，我可一併擴充。
