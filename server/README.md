# NB Clinical App — Server

病人追蹤／查房指引功能的後端 API。Express + `pg`（純 SQL，沒有用 Prisma —— 開發環境連不到 Prisma 需要的引擎檔案下載，所以改用更輕量、不需要額外下載二進位檔的 `pg`，跟 Neon 相容性完全一樣，且已經整套端對端測試過）。

## ⚠️ 如果你已經部署過舊版，這次更新必須重新跑一次 migrate

這次新增了「查房指引」功能，資料庫多了新欄位跟新資料表。**你現有 Neon 資料庫裡的病人資料不會不見**，但必須讓資料庫結構跟上，不然新功能會出錯。做法（跟你上次手動跑 migrate 的方式一樣）：

```bash
cd server
npm install
set "DATABASE_URL=你的完整 Neon 連線字串"
npm run migrate
```

看到 `Migration complete.` 就完成了，這個指令可以放心重複執行（新增的欄位/表格都是「不存在才新增」，不會刪除或覆蓋你既有的資料）。

## 資料庫欄位設計說明

`patients` 表刻意用 `identifier`（床號/內部代號）而不是姓名或病歷號。ROP 三項風險因子、Synagis 的 CLD/心臟病適應症，都是醫師手動勾選（非系統自動判斷），因為這些判斷牽涉到系統沒有在追蹤的臨床細節（生長百分位、超音波結果等）。**不會**存到任何可以單獨識別病人身分的真實個資欄位——如果你之後想加姓名或病歷號欄位，請再次跟醫院端確認過範圍。

## 本機開發

需要一個 PostgreSQL（本機安裝或用 Docker 都可以）。

```bash
cp .env.example .env
# 編輯 .env，填入本機資料庫連線字串、JWT_SECRET、SHARED_PASSWORD

npm install
npm run migrate   # 建立/更新所有資料表
npm run dev        # 啟動於 http://localhost:8787
```

## 部署到 Render + Neon（第一次部署）

1. **Neon**：建立一個新的 Postgres 資料庫，複製連線字串（用 pooled connection）。
2. **Render**：
   - New → Web Service → 連接這個 GitHub repo，Root Directory 設為 `server`
   - Build command: `npm install`
   - Start command: `npm start`
   - 環境變數（Render Dashboard → Environment）：
     - `DATABASE_URL`：Neon 的連線字串
     - `JWT_SECRET`：一串隨機字串（例如用 `openssl rand -hex 32` 或 `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 產生）
     - `SHARED_PASSWORD`：科內共用密碼，正式使用前務必更改，不要用預設值
     - `CORS_ORIGIN`：你的 Cloudflare Pages 網址（正式環境不建議留 `*`）
3. **建資料表**：Render 免費方案沒有 Shell 功能，改成在自己電腦上執行（見上方「本機開發」的 `npm run migrate`，`DATABASE_URL` 填 Neon 的連線字串），只需要跑一次
4. 回到前端專案根目錄，建立 `.env.production`，內容為 `VITE_API_URL=https://你的render網址.onrender.com`，重新 `npm run build` 並部署前端

## API 一覽

| Method | Path | 說明 | 需要登入 |
|---|---|---|---|
| POST | /api/login | 用共用密碼換取 token | 否 |
| GET | /api/patients?status=active | 病人列表 | 是 |
| POST | /api/patients | 新增病人（含完整出生史） | 是 |
| GET | /api/patients/:id | 病人詳細資料（含 rounds/lines/vaccineEvents） | 是 |
| PATCH | /api/patients/:id | 更新病人資料/狀態 | 是 |
| DELETE | /api/patients/:id | 刪除病人（連同所有紀錄） | 是 |
| PUT | /api/patients/:id/rounds/:date | 新增或更新某一天的查房紀錄（upsert） | 是 |
| POST | /api/patients/:id/lines | 新增管路 | 是 |
| PATCH | /api/lines/:lineId | 標記管路移除日期 | 是 |
| DELETE | /api/lines/:lineId | 刪除管路紀錄 | 是 |
| POST | /api/patients/:id/vaccine-events | 記錄疫苗/Synagis施打 | 是 |
| DELETE | /api/vaccine-events/:eventId | 刪除施打紀錄 | 是 |
| POST | /api/patients/:id/logs | （舊版簡易每日紀錄，保留供相容，新版UI已不使用） | 是 |
| DELETE | /api/logs/:logId | 刪除舊版每日紀錄 | 是 |

登入機制是「全科共用一組密碼」，不是個人帳號系統——足夠應付「同事都要看得到同一份資料」的需求，但如果之後想追蹤「誰改了什麼」，需要再加個人帳號機制。
