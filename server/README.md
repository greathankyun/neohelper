# NB Clinical App — Server

病人追蹤功能的後端 API。Express + `pg`（純 SQL，沒有用 Prisma —— 這個沙盒環境連不到 Prisma 需要的引擎檔案下載，所以改用更輕量、不需要額外下載二進位檔的 `pg`，跟 Neon 相容性完全一樣，且已經整套端對端測試過）。

## 資料庫欄位設計說明

`patients` 表刻意用 `identifier`（床號/內部代號）而不是姓名或病歷號，`daily_logs` 只存體重/TDF/餵奶量等臨床追蹤數值。**不會**存到任何可以單獨識別病人身分的真實個資欄位——如果你之後想加姓名或病歷號欄位，請再次跟醫院端確認過範圍。

## 本機開發

需要一個 PostgreSQL（本機安裝或用 Docker 都可以）。

```bash
cp .env.example .env
# 編輯 .env，填入本機資料庫連線字串、JWT_SECRET、SHARED_PASSWORD

npm install
npm run migrate   # 建立 patients / daily_logs 資料表
npm run dev        # 啟動於 http://localhost:8787
```

## 部署到 Render + Neon

1. **Neon**：建立一個新的 Postgres 資料庫（跟你 pedgi-app 用的可以是同一個 Neon 帳號、不同的 database），複製連線字串（用 pooled connection）。
2. **Render**：
   - New → Web Service → 連接這個 GitHub repo，Root Directory 設為 `server`
   - Build command: `npm install`
   - Start command: `npm start`
   - 環境變數（Render Dashboard → Environment）：
     - `DATABASE_URL`：Neon 的連線字串
     - `JWT_SECRET`：一串隨機字串（例如用 `openssl rand -hex 32` 產生）
     - `SHARED_PASSWORD`：科內共用密碼，正式使用前務必更改，不要用預設值
     - `CORS_ORIGIN`：你的 Cloudflare Pages 網址，例如 `https://nb-clinical-app.pages.dev`（正式環境不建議留 `*`）
3. 部署成功後，跑一次資料表建立：Render Shell 執行 `npm run migrate`（或本機用同一組 `DATABASE_URL` 跑一次也可以，只需要跑一次）
4. 回到前端專案根目錄，Cloudflare Pages 專案設定裡加一個環境變數 `VITE_API_URL`，值填 Render 給你的網址（例如 `https://nb-clinical-app-server.onrender.com`），然後重新部署前端

## API 一覽

| Method | Path | 說明 | 需要登入 |
|---|---|---|---|
| POST | /api/login | 用共用密碼換取 token | 否 |
| GET | /api/patients?status=active | 病人列表 | 是 |
| POST | /api/patients | 新增病人 | 是 |
| GET | /api/patients/:id | 病人詳細資料 + 所有紀錄 | 是 |
| PATCH | /api/patients/:id | 更新病人資料/狀態 | 是 |
| DELETE | /api/patients/:id | 刪除病人（連同紀錄） | 是 |
| POST | /api/patients/:id/logs | 新增每日紀錄 | 是 |
| DELETE | /api/logs/:logId | 刪除單筆紀錄 | 是 |

登入機制是「全科共用一組密碼」，不是個人帳號系統——足夠應付「同事都要看得到同一份資料」的需求，但如果之後想追蹤「誰改了什麼」，需要再加個人帳號機制。
