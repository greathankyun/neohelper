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

## 病人追蹤功能

新增了 `/patients` 路徑，需要輸入科內共用密碼才能進入（見 `server/README.md` 設定 `SHARED_PASSWORD`）。功能包含：

- 病人列表（在院/已出院篩選）、新增病人（床號/代號、GA、出生日期、出生體重）
- 病人詳細頁：自動依「此病人目前日齡 + GA」查詢黃疸照光/積極照光/換血標準，並依「最新體重」試算 TPN 電解質每日劑量——不用再手動輸入這些值去查表
- 每日紀錄（體重、TDF、餵奶量、備註），可累積追蹤病程

**重要：** 資料庫欄位設計上刻意用「床號/代號」取代真實姓名或病歷號，避免存放可直接識別身分的欄位。這是為了降低風險而做的設計選擇，不是醫院端的正式審查結果——實際存哪些欄位、要不要存真實病歷號，仍請以你們醫院資安/個資規範的實際決議為準。

沒有設定後端（`VITE_API_URL` 未設定或後端未部署）時，其餘所有內容（篩檢、流程、計算機）完全不受影響，仍可正常使用。

## 已知待補資料

- 本次僅涵蓋 2026 工作手冊 Neonatology 部分頁面（篩檢、黃疸、感染、肚臍炎、低血糖、換血、BPD、高血壓、奶粉配方、TPN/藥物、查房小抄），手冊其餘章節可後續比照相同 JSON 結構加入。

## 更新紀錄

- 黃疸模組已補上完整的治療標準數值表（照光 / 積極照光 / 換血標準，2025.05.08 第五版修訂），並新增「依 GA / 日齡查詢」互動計算機
- 新增病人追蹤功能（見上）與對應後端 `server/`

## 未來規劃（尚未實作）

- 個人帳號登入（目前是全科共用一組密碼，無法區分是誰新增/修改了資料）
- 資料版本化管理，方便科內流程更新時追溯歷史版本
