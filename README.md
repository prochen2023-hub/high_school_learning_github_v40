# 高中各科學習｜GitHub Pages 版

目前完成：**高一上數學 3.4**。

## 這一版為什麼改成多檔案？

3.2 是單一 HTML 原型，方便下載後測試；3.3 把畫面、程式與資料拆開：

```text
.
├─ index.html
├─ math.html
├─ .nojekyll
├─ START_LOCAL.bat
├─ assets/
│  ├─ css/
│  │  └─ math.css
│  └─ js/
│     └─ math-app.js
└─ data/
   └─ math/
      ├─ config.json
      ├─ units.json
      ├─ mindmaps.json
      ├─ similar.json
      ├─ exam1.json
      ├─ exam2.json
      └─ exam3.json
```

之後新增題目時，原則上改 JSON 即可，不必把整個 HTML 改掉。

## GitHub Pages 部署（最簡單）

1. 在 GitHub 建立一個 repository，例如 `high-school-learning`。
2. 把這個資料夾內的**所有檔案與資料夾**放到 repository 根目錄。
3. Commit / Push 到 `main` branch。
4. GitHub repository → **Settings → Pages**。
5. `Build and deployment` 的 `Source` 選 **Deploy from a branch**。
6. Branch 選 `main`，folder 選 `/(root)`，按 **Save**。
7. 發布網址通常是：
   `https://你的帳號.github.io/high-school-learning/`

如果 repository 名稱就是 `你的帳號.github.io`，則網址會是：
`https://你的帳號.github.io/`

本專案已包含空白 `.nojekyll`，讓 GitHub Pages 直接發布靜態 HTML/CSS/JS/JSON。

## Windows 本機預覽

因為 3.3 題庫用 `fetch()` 讀取 JSON，瀏覽器通常不允許直接用 `file://` 雙擊 HTML 讀取資料。

如果電腦已有 Python：

- 雙擊 `START_LOCAL.bat`
- 瀏覽器開啟 `http://localhost:8000/`

或在專案資料夾執行：

```bash
python -m http.server 8000
```

## 題庫如何新增？

例如在 `data/math/exam1.json` 加題。每題都包含：

- `id`
- `type`
- `text`
- `answer`
- `explain`
- `quick`
- `unit`
- `level`
- `points`

單元內容則放在 `data/math/units.json`。

## 現在還沒有後端資料庫

學生進度仍保存在瀏覽器 `localStorage`，所以同一個 GitHub Pages 網址在同一瀏覽器可保留紀錄，但**不會跨裝置同步**。

未來若要做到：
- 學生登入
- 手機 / 電腦同步
- 多學生帳號
- 教師查看班級進度

再把「使用者與作答紀錄」接到 Supabase / Firebase / PostgreSQL；題庫 JSON 仍可保留或再搬入資料庫。

## 資料內容與著作權

核心題目應以自建／重新設計題目為主；時事素養題可以引用官方公開數據作為背景並標示來源。不要直接大量複製出版社或其他網站的完整題庫。


## 3.4 新增：本站原生圖解

`data/math/diagrams.json` 定義每個單元的圖解類型與說明，`math-app.js` 以 SVG 即時畫出。

目前包含：
- 實數數系包含圖
- AM-GM 固定和與乘積最大圖
- 絕對值數線
- 線性 vs 指數成長
- 斜率三角形
- 二元不等式可行區域
- 圓方程式
- 直線與圓 d/r 判斷
- 多項式除法結構
- 餘式定理流程圖
- 二次函數頂點
- 多項式號線

這些圖解全部存在本站，不需要連到外部網站。外部影片只保留為延伸資源。


# 3.4 完整版：題庫管理頁

新增 `manager.html`、`assets/js/question-manager.js`、`assets/css/manager.css` 與 `data/subjects.json`。

## 題庫管理可以做什麼？

- 依科目、段考、A/B卷、題型、單元篩選
- 全文搜尋題目、ID、解析、快解與標籤
- 新增題目
- 修改題目
- 複製題目並自動產生新 ID
- 刪除題目
- 支援單選、複選、填充、非選四種題型
- 編輯解析、快解、難度、配分、情境、Tags、來源
- 驗證必填欄位、答案格式、ID 重複
- 驗證 A/B 卷總分是否為 100 分
- 本機草稿自動存在 `localStorage`
- 匯入 `{A:[...],B:[...]}` JSON
- 匯出目前段考 JSON
- 匯出全數學題庫管理備份

## GitHub Pages 的限制

GitHub Pages 是靜態網站，因此瀏覽器中的「題庫管理」**不會直接改 GitHub repository 的檔案**。

正確流程：

1. 在 `manager.html` 編輯題庫。
2. 按「匯出目前段考 JSON」。
3. 假設你編輯第一次段考，下載檔會是 `exam1.json`。
4. 用這個檔案覆蓋 repository 裡的 `data/math/exam1.json`。
5. Git commit / push。
6. GitHub Pages 重新部署後，學生網站就會讀到新題庫。

這種做法不需要把 GitHub Personal Access Token 寫進公開網頁，因此更安全。

## 未來擴充其他科

`data/subjects.json` 是科目註冊表。未來建立：

- `data/physics/...`
- `data/chemistry/...`
- `data/english/...`

並在 `subjects.json` 加上 active 科目，題庫管理器即可沿用相同架構。


# 4.0 視覺互動學生版

`math.html` 已全面改為 4.0；原 3.4 學生版保留為 `math-classic.html`。

設計對象：高一男生、中下程度，希望逐步提升至中上。
設計原則：
- 先圖像理解，再公式
- 每次只做一個小任務，降低數學恐懼
- 快解與陷阱分開呈現
- 題目採校園、社群、運動、科技、遊戲資源等熟悉脈絡
- 不幼兒化，採夜景／科技儀表板視覺
- 10分鐘也能完成一輪

4.0 動態圖解元件：
- 實數集合圖
- AM-GM 滑桿
- 絕對值中心／半徑滑桿
- 線性 vs 指數成長滑桿
- 斜率 rise/run 滑桿
- 可行區域
- 圓方程式
- 直線與圓 d/r 滑桿
- 多項式除法
- 餘式定理
- 二次函數 a/h/k 滑桿
- 多項式號線

完整題庫管理仍由 `manager.html` 負責。


# 4.1 第一次學也看得懂

設計假設：學生可能在學校沒有聽懂，甚至這是第一次真正學習。

新增：
- `data/math/type_lessons.json`：12單元 × 3核心題型 = 36種題型教學
- 每型固定結構：看到什麼 → 想什麼 → 解題步驟 → 跟著做完整例題 → 為什麼 → 變形 → 30秒確認
- 完成至少一種題型教學後才開啟該單元隨堂題，避免一開始直接刷題造成挫折
- 每一型可標記「我懂這一型了」，保存於 localStorage
- 4.0 保留為 `math-v40.html`
- 3.4 經典版仍保留 `math-classic.html`

學生端主頁仍為 `math.html`。
