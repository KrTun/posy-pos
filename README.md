# Posy POS

擺攤用的手機收銀本。拍照 → 選品項 → 按金額 → 選收款方式，一筆三秒。
給手做飾品攤位用：每件樣式不同、價格不一樣，所以品項有預設價，現場可以當場改。

**上線網址**：https://krtun.github.io/posy-pos/

不用註冊、不用登入、不用裝 App。資料存在那支手機裡，設定好 Google 同步之後會寫進你自己的試算表。

---

## 手機上變成 App（加到主畫面）

| 系統 | 做法 |
|---|---|
| **Android／Chrome** | 開網址 → 右上「⋮」→ **安裝應用程式**（或「加到主畫面」） |
| **iPhone／Safari** | 開網址 → 下方「分享」→ **加入主畫面**。必須用 Safari，Chrome 開不行 |

裝完會有圖示、全螢幕、沒有網址欄，**沒網路也能記帳**（照片、帳目都先存在手機，有網路再同步）。

---

## 功能

- **記一筆**：照片（選填）、品項、金額（內建大鍵盤＋最常用價格快捷）、收款方式（現金／匯款／LINE Pay）。按下收款方式就完成，6 秒內可撤銷
- **一張訂單多件**：同一個客人買好幾件就按「繼續新增」加進同一張單，最後只選一次收款方式
- **今天**：今日營收、幾單幾件、三種收款方式各收多少；一鍵複製今日結帳
- **紀錄**：按日期分組，每天小計；點任一張單可看大圖、單獨改其中一件、改整張單的收款／時間／備註，或刪除
- **統計**：本月／全部；營收、訂單數、件數、平均客單價、平均單品價；收款方式與品項佔比；近 14 天柱狀圖
- **設定**：品項與預設價（排序、改名、刪除）、Google 雲端同步、備份／還原、CSV 匯出

品項改名會連過去的紀錄一起改；刪除只是從按鈕列拿掉，舊紀錄保持原樣。

### 訂單是怎麼存的

**一列永遠是賣掉的一件**，不是一張訂單。同一張訂單的那幾件共用一個 `oid`（訂單編號），畫面上才併成一列顯示。

這樣選是為了不用搬既有資料：改版前記的紀錄沒有 `oid`，`orderKey()` 就拿它自己的 `id` 當訂單編號，等於一張單一件，舊紀錄原封不動照樣讀得出來。品項統計、CSV、Google 試算表也都維持「一件一列」，要算客單價時用訂單編號做樞紐分析。

反過來（一列存一張單、裡面塞商品清單）會讓品項統計、平均單價、CSV、後端全部重寫，而且舊紀錄要搬家。不要改成那樣。

---

## Google 雲端同步

帳目寫進 **Google 試算表**，照片存到 **Google Drive 資料夾**。後端是一支 Apps Script，掛在攤主自己的 Google 帳號下，免費。

設定步驟全部寫在 [`apps-script/Code.gs`](apps-script/Code.gs) 檔案最上面的註解裡，照著做：

1. 開一份空白 Google 試算表，記下網址裡的 `SHEET_ID`
2. 在 Drive 開一個放照片的資料夾，記下 `FOLDER_ID`
3. script.google.com 新增專案，把 `Code.gs` 整份貼進去
4. 專案設定 → 指令碼屬性，填 `TOKEN`（自己想一串）、`SHEET_ID`、`FOLDER_ID`
5. 部署 → 網頁應用程式，執行身分「我」、誰可以存取「任何人」，授權
6. 複製 `/exec` 結尾的網址，貼進 App 的「設定 → Google 雲端同步」，金鑰填一樣的 `TOKEN`
7. 按「測試連線」確認通了，再按「上傳到 Google」

**為什麼網址和金鑰不寫在程式碼裡**：GitHub Pages 的 repo 必須公開，寫進去等於公告「這份試算表誰都能寫」。所以它只存在那支手機的瀏覽器裡。

同步的行為：
- **上傳**只傳沒傳過的；改過的紀錄會標記成待傳，下次會覆蓋試算表同一列（用 id 對）
- **拉回**只合併這支手機沒有的 id，不會蓋掉本機資料；**照片不會下載**，留在 Drive

**改過 `Code.gs` 之後要重新部署**：部署 → 管理部署作業 → 編輯 → 版本選「新版本」→ 部署。網址不變，App 裡的網址和金鑰都不用動。

「訂單編號」是第 9 欄，**新欄位一律加在最後**——`push`／`photo`／`pull` 都用固定欄號寫入。舊版部署的試算表標題列只有 8 欄，後端開工時會自己把第 9 欄標題補上（`fixHeaders`），不用手動加。App 送上去的欄位舊版後端不認得就會被忽略，所以**不重新部署也不會壞**，只是表上看不出哪幾列是同一張單。

---

## 資料會存多久（重要）

| 開法 | 會不會被清掉 |
|---|---|
| **Artifact 預覽版**（嵌在 claude.ai 的框裡） | **會。** 瀏覽器把第三方框的儲存空間當暫存，關掉瀏覽器就可能全空。只能拿來看畫面，不要拿來記真的帳 |
| **Android／Chrome 開網址** | 不會。第一方網站的 IndexedDB，關瀏覽器、重開機都在。只有「清除瀏覽資料」會清掉 |
| **iPhone／Safari 開網址（沒加到主畫面）** | **七天沒開就會被清掉。** WebKit 的 ITP 規定：對網站沒有使用者互動滿 7 天，就刪掉所有腳本可寫的儲存空間，明文包含 IndexedDB、LocalStorage、Service Worker 快取 |
| **iPhone 加到主畫面** | 不會。WebKit 明文把主畫面 Web App 的第一方網域排除在刪除演算法之外，而且資料跟 Safari 隔離 |

依據：[Tracking Prevention in WebKit](https://webkit.org/tracking-prevention/)。

所以**iPhone 一定要加到主畫面**，這不是方便性問題，是資料會不會被刪的問題。
App 啟動時會呼叫 `navigator.storage.persist()` 請瀏覽器別清掉這個網站，但 Apple 沒有保證這對 ITP 的 7 天計時有效，不能當作唯一防線。

兩條防線請都做：**加到主畫面** ＋ **設定好 Google 同步**。設定頁的「資料」卡片會顯示有沒有取得永久保存、用了多少空間。

## 改程式的流程

只有一份程式碼：`index.html`。它同時是 Claude Artifact 的頁面本體，也是網站的來源。

```powershell
# 1. 改 index.html
# 2. 包成網站版（補上 <head>、manifest、Service Worker 註冊）
.\build.ps1
# 3. 推上去
git add -A; git commit -m "說明"; git push
```

改過 `docs\sw.js` 裡的內容時，把 `CACHE` 的版本號加一（`posy-pos-v1` → `v2`），否則舊手機會繼續吃舊快取。改動比較大的時候也順手加一，新的 Service Worker 裝上去會把舊快取清掉，確保使用者拿到的是新版。

推之前先在本機跑一遍（Bun 已安裝，沒有 Node）：

```powershell
bun -e "const root='C:/Workspaces/daily/posy-pos/docs'; Bun.serve({port:8787, async fetch(req){ let p=new URL(req.url).pathname; if(p==='/') p='/index.html'; const f=Bun.file(root+p); return await f.exists()? new Response(f) : new Response('404',{status:404}); }});"
```

然後開 `http://localhost:8787/`。**重新整理前要先清掉 Service Worker 與 caches**，否則會看到舊版誤判成「改了沒效」：

```js
for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
for (const k of await caches.keys()) await caches.delete(k);
location.reload();
```

程式裡的 `var` 與 function 都在全域，所以可以直接在 Console 呼叫 `openSheet()`、讀 `sales`、`ordersOf(sales)` 來驗流程，不必手點。

`build.ps1` 必須存成 **UTF-8 帶 BOM**。PS 5.1 會把沒有 BOM 的檔案當 ANSI 讀，裡面的中文會變亂碼（2026-10-30 踩過一次，標題變成 `???斗?`）。

### 檔案

```
index.html              程式本體（唯一的來源）
build.ps1               包成 docs\index.html
docs\                   ← GitHub Pages 的來源（Settings > Pages > main /docs）
  index.html            產出，不要手改
  manifest.webmanifest
  sw.js
  icon-*.png
apps-script\Code.gs     Google 試算表／Drive 後端
```

---

## 已知限制

- **照片是用檔案選取器**，按下去會跳「拍照／相簿」，不是相機即時取景。網頁拿不到相機預覽
- **資料在哪支手機就在哪支手機**。換手機要靠 Google 同步或「匯出完整備份」的文字
- iPhone 不加到主畫面的話，七天沒開就會被 Safari 清空（見上面「資料會存多久」）
- 一張照片縮到 800px、JPEG 0.7，大約 50–90KB
- Apps Script 免費額度對一個攤位綽綽有餘（每天 20,000 次 UrlFetch、6 分鐘單次執行上限）
