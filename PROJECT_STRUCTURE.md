# 3.4 完整網站結構

```text
.
├─ index.html                 首頁
├─ math.html                  學生版數學
├─ manager.html               題庫管理
├─ START_LOCAL.bat
├─ README.md
├─ PROJECT_STRUCTURE.md
├─ .nojekyll
├─ assets/
│  ├─ css/
│  │  ├─ math.css
│  │  └─ manager.css
│  ├─ js/
│  │  ├─ math-app.js
│  │  └─ question-manager.js
│  └─ img/
│     └─ math34_hero_concept.png
└─ data/
   ├─ subjects.json
   └─ math/
      ├─ config.json
      ├─ units.json
      ├─ mindmaps.json
      ├─ diagrams.json
      ├─ similar.json
      ├─ exam1.json
      ├─ exam2.json
      └─ exam3.json
```

學生學習資料目前仍存在瀏覽器 localStorage。
題庫內容存在 JSON，可由 manager.html 編輯後匯出。


4.2 additional math data:
- data/math/concept_details.json
- data/math/practice_bank.json
- math-v41.html (previous student version)
