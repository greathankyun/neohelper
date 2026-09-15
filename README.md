# 新生兒臨床照護手冊（NB Clinical Handbook）

新生兒 / 早產兒臨床照護速查工具。內容整理自科內工作手冊 Neonatology 部分章節與查房筆記，涵蓋篩檢時程、臨床決策流程、藥物與 TPN 劑量計算機，並支援跨裝置共用的病人追蹤功能。

## 技術架構

**前端**（本目錄）：
- React + Vite + Tailwind CSS
- react-router-dom（HashRouter，適合靜態託管如 Cloudflare Pages）
- vite-plugin-pwa（可安裝、離線可用）
- 主題內容為純前端 JSON（`src/data/*.json`），不需要後端

**後端**（`server/` 目錄，病人追蹤功能專用）：
- Express + `pg`（PostgreSQL），部署方式詳見 `server/README.md`
- 共用密碼登入（部門共用，非個人帳號系統）
- 靜態內容（篩檢/流程/計算機）完全不依賴後端；只有「病人追蹤」這個功能需要後端 + 資料庫

## 本機開發

```bash
npm install
npm run dev
```

## 建置

```bash
npm run build   # 產出 dist/
npm run preview # 本機預覽建置結果
```

## 部署到 Cloudflare Pages

1. 推上 GitHub：
   ```bash
   git init
   git add .
   git commit -m "init: NB clinical handbook"
   git remote add origin https://github.com/greathankyun/<repo-name>.git
   git push -u origin main
   ```
2. Cloudflare Pages → Create project → Connect to Git → 選這個 repo
3. Build command: `npm run build`
4. Build output directory: `dist`
5. 部署後即可安裝為 PWA（手機加到主畫面 / 桌面安裝）

## 內容更新方式

所有內容都在 `src/data/` 底下的 JSON 檔，一個主題一個檔案。修改 JSON 後重新 `npm run build` 部署即可，不需要改程式碼。若要新增一個全新主題：

1. 在 `src/data/` 新增一個 `xxx.json`（可參考既有檔案的欄位結構：`sections` / `points` / `table` / `flow` / `calculator` 等）
2. 在 `src/data/index.js` import 並加入 `MODULES` 陣列
3. 若有分類色系需求，在 `src/theme.js` 的 `COLOR_MAP` 補上對應顏色

## 病人追蹤功能 ／ 查房指引

新增了 `/patients` 路徑，需要輸入科內共用密碼才能進入（見 `server/README.md` 設定 `SHARED_PASSWORD`）。

**病人列表**：在院/已出院篩選、新增病人（含完整出生史：床號/代號、GA、出生日期時間、出生體重、EDC、GPA、生產方式、Apgar、ROP風險因子勾選、Synagis適應症勾選）。

**病人詳細頁（查房指引）** 是核心功能，包含：

- **日齡自動顯示**：足月兒顯示 Day數；早產兒在 PMA 滿 40 週前顯示 Day數+PMA，滿 40 週後自動切換顯示 Day數+CA（校正年齡）
- **提醒事項面板**，自動計算並提示：
  - 體重警示（跌幅>10%或第10天未回出生體重）與每日成長目標
  - HBV 疫苗第1/2劑（可一鍵記錄施打）
  - Vit.D／Fe／滿月血／BPD survey（依 oTDF 自動觸發）
  - 腦部超音波追蹤時程（沿用篩檢時程模組資料）
  - ROP 視網膜病變篩檢轉介判斷與照會週一日期（此為「該不該轉介＋何時發第一次照會」的判斷；轉介後續的 Zone/Stage 追蹤頻率仍使用「ROP 視網膜病變篩檢」主題模組那張表）
  - Synagis/Palivizumab 適應症判斷、已施打劑數、劑量上限、下一劑建議日（可一鍵記錄施打）
- **每日查房紀錄表單**：體重、呼吸支持（含備註）、Feeding（途徑/種類/單一或交替/餐數/oTDF自動計算）、TDF醫囑值、TPN、診斷、檢驗檢查，自動帶入前一筆紀錄可直接修改
- **管路管理**：AL/PICC/UA/UV/CVC，含部位與起訖日期
- 沿用既有的黃疸/TPN自動查表計算機

**重要（安全性）：** 資料庫欄位設計上刻意用「床號/代號」取代真實姓名或病歷號。Synagis 的先天性心臟病適應症、CLD/BPD 適應症，因涉及生長百分位、心臟超音波等本系統未追蹤的臨床判斷細節，做成醫師自行勾選（非系統自動判斷），系統只負責劑數與間隔的計算。ROP 轉介的三項風險因子亦為醫師勾選。這些設計是為了避免系統做出超出其資料掌握範圍的臨床判斷，不是醫院端的正式審查結果——實際存哪些欄位，仍請以你們醫院資安/個資規範的實際決議為準。

沒有設定後端（`VITE_API_URL` 未設定或後端未部署）時，其餘所有內容（篩檢、流程、計算機）完全不受影響，仍可正常使用。

## 已知待補資料

- 本次僅涵蓋 2026 工作手冊 Neonatology 部分頁面（篩檢、黃疸、感染、肚臍炎、低血糖、換血、BPD、高血壓、奶粉配方、TPN/藥物、查房小抄），手冊其餘章節可後續比照相同 JSON 結構加入。

## 更新紀錄

- 黃疸模組已補上完整的治療標準數值表（照光 / 積極照光 / 換血標準，2025.05.08 第五版修訂），並新增「依 GA / 日齡查詢」互動計算機
- 新增病人追蹤功能與對應後端 `server/`
- 頂部主題下拉選單更名為「學習資料」
- 新增「查房指引」：完整出生史記錄、Day/PMA/CA 自動年齡顯示、每日查房紀錄（呼吸/餵食/TDF/TPN/管路）、與一整套自動提醒（體重警示、HBV、Vit.D、Fe、滿月血、BPD survey、腦部超音波、ROP轉介判斷、Synagis劑量追蹤）

## 已知限制

- 疫苗/Synagis 的「已施打」記錄目前沒有「編輯日期」功能，記錯了只能刪除重加
- HBV 第1劑「滿1個月大」以 30 天概算，與精確的西曆月份計算會有 0-1 天誤差
- 腦部超音波、Vit.D、Fe、滿月血、BPD survey 這幾項目前只是「條件達成就提示」，不會記錄「已完成」狀態（跟 HBV/Synagis 不同），所以提醒不會因為你已經做過就自動消失，需要自行判斷

## 未來規劃（尚未實作）

- 個人帳號登入（目前是全科共用一組密碼，無法區分是誰新增/修改了資料）
- 資料版本化管理，方便科內流程更新時追溯歷史版本
