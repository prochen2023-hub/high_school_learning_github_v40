
let UNITS=[],LESSONS={},TYPELESSONS={},CONCEPTS={},PRACTICE={},MAPS={},QUESTFLOW={},TESTS={},RANGES=[],currentUnit="u03",currentTab="visual",practiceSet=[],practiceIndex=0,practiceMode="foundation",viewMode="quest",questReviewId=null,questCursor=null;
const stateKey="math53_state",legacyStateKey="math52_state",legacyStateKey2="math51_state";
const $=id=>document.getElementById(id);
function blankState(){return {xp:0,attempts:{},completed:{},uncertain:{},typeMastered:{},modeAttempts:{},stars:{},rewardedStars:{},questBoss:{}}}
function loadState(){
 try{
  const account=window.HSLAccount?.getAccount?.();
  const accountState=window.HSLAccount?.loadProgress?.("math");
  if(accountState)return {...blankState(),...accountState};
  const legacy=JSON.parse(localStorage.getItem(stateKey)||localStorage.getItem(legacyStateKey)||localStorage.getItem(legacyStateKey2)||"null");
  if(account&&legacy&&!localStorage.getItem("hsl_legacy_progress_claimed_v1")){
   localStorage.setItem("hsl_legacy_progress_claimed_v1",account.id);
   window.HSLAccount.saveProgress("math",legacy);
   return {...blankState(),...legacy}
  }
  return account?blankState():({...blankState(),...(legacy||{})})
 }catch(e){return blankState()}
}
function saveState(s){
 localStorage.setItem(stateKey,JSON.stringify(s));
 window.HSLAccount?.saveProgress?.("math",s)
}
let STATE=loadState();

async function getJSON(u){const r=await fetch(u,{cache:"no-store"});if(!r.ok)throw new Error(u+" "+r.status);return r.json()}
async function init(){
 window.HSLAccount?.boot?.({promptIfMissing:true});
 try{
  const [cfg,units,lessons,typeLessons,concepts,practice,maps,questFlow,e1,e2,e3]=await Promise.all([
   getJSON("data/math/config.json"),getJSON("data/math/units.json"),getJSON("data/math/visual_lessons.json"),getJSON("data/math/type_lessons.json"),getJSON("data/math/concept_details.json"),getJSON("data/math/practice_bank.json"),
   getJSON("data/math/mindmaps.json"),getJSON("data/math/quest_flow.json"),getJSON("data/math/exam1.json"),getJSON("data/math/exam2.json"),getJSON("data/math/exam3.json")
  ]);
  RANGES=cfg.ranges;UNITS=units;LESSONS=lessons;TYPELESSONS=typeLessons;CONCEPTS=concepts;PRACTICE=practice;MAPS=maps;QUESTFLOW=questFlow;
  TESTS={"0A":e1.A,"0B":e1.B,"1A":e2.A,"1B":e2.B,"2A":e3.A,"2B":e3.B};
  bindTabs();bindSearch();renderSidebar();selectUnit(STATE.lastUnit&&UNITS.some(u=>u.id===STATE.lastUnit)?STATE.lastUnit:"u05");
 }catch(err){document.body.innerHTML=`<div style="max-width:760px;margin:70px auto;font-family:sans-serif;background:#fff;padding:24px;border-radius:16px"><h1>資料載入失敗</h1><p>請用 GitHub Pages 或 START_LOCAL.bat 開啟。</p><pre>${err}</pre></div>`}
}
function bindTabs(){document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{currentTab=b.dataset.tab;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("on",x===b));renderLesson()}))}
function bindSearch(){$("topSearch").addEventListener("keydown",e=>{if(e.key==="Enter"){const q=e.target.value.trim().toLowerCase();const u=UNITS.find(x=>(x.title+" "+x.core+" "+x.old).toLowerCase().includes(q));if(u)selectUnit(u.id)}})}
function examName(n){return ["第一次段考","第二次段考","第三次段考"][n]||""}
function mastery(id){const a=STATE.attempts[id]||{c:0,t:0};let p=a.t?Math.round(a.c/a.t*85):0;if(STATE.completed[id])p+=10;if(STATE.uncertain[id])p-=5;return Math.max(0,Math.min(100,p))}
function masteryClass(p){return p>=80?"ok":p>=55?"mid":p>0?"low":""}
function modeStat(id,mode){return STATE.modeAttempts?.[id]?.[mode]||{c:0,t:0}}
function acc(id,mode){const s=modeStat(id,mode);return s.t?s.c/s.t:0}
function computeStars(id){const tc=typeCount(id),d=CONCEPTS[id]||{},min=d.min_types||2;let stars=0;if(tc.done>=min&&modeStat(id,"foundation").t>=3&&acc(id,"foundation")>=2/3)stars=1;if(stars>=1&&tc.done===tc.total&&modeStat(id,"standard").t>=3&&acc(id,"standard")>=2/3)stars=2;if(stars>=2&&modeStat(id,"literacy").t>=3&&modeStat(id,"challenge").t>=3&&acc(id,"literacy")>=2/3&&acc(id,"challenge")>=2/3)stars=3;return stars}
function unitStars(id){const stars=computeStars(id);STATE.stars[id]=stars;return stars}
function totalStars(){return UNITS.reduce((s,u)=>s+computeStars(u.id),0)}
function showStarToast(msg){const el=document.getElementById("starToast");if(!el)return;el.innerHTML=msg;el.classList.add("show");clearTimeout(showStarToast.t);showStarToast.t=setTimeout(()=>el.classList.remove("show"),2600)}
function rewardStars(id){STATE.rewardedStars=STATE.rewardedStars||{};const old=STATE.rewardedStars[id]||0,now=computeStars(id);if(now>old){const rewards=[0,20,30,50];let add=0;for(let s=old+1;s<=now;s++)add+=rewards[s];STATE.xp+=add;STATE.rewardedStars[id]=now;saveState(STATE);showStarToast(`<b>${starText(now)} 新星級達成！</b><br>獎勵 +${add} XP。下一顆星需要更高一級的闖關穩定度。`)}return now}
function starText(n){return "★".repeat(n)+"☆".repeat(3-n)}
function modeUnlocked(id,mode){const tc=typeCount(id),d=CONCEPTS[id]||{},min=d.min_types||2;if(mode==="foundation")return tc.done>=1;if(mode==="standard")return tc.done>=min;if(mode==="literacy")return tc.done===tc.total;if(mode==="challenge")return tc.done===tc.total&&acc(id,"standard")>=2/3;return true}
function renderSidebar(){
 $("sideUnits").innerHTML=[0,1,2].map(ex=>`<div><div class="examTitle">▣ ${examName(ex)}</div>${UNITS.filter(u=>u.exam===ex).map(u=>{const p=mastery(u.id),st=unitStars(u.id);return `<div class="unitLink ${u.id===currentUnit?"on":""}" onclick="selectUnit('${u.id}')"><span class="dot ${masteryClass(p)}"></span><span class="unitName">${u.title.replace(/^\d+\.\s*/,"")}<small class="sideStars">${starText(st)}</small></span><span class="unitPct">${p?`${p}%`:""}</span></div>`}).join("")}</div>`).join("")
}
function selectUnit(id){closeMobileNav();currentUnit=id;STATE.lastUnit=id;saveState(STATE);currentTab="visual";practiceMode="foundation";viewMode="quest";questReviewId=null;questCursor=null;document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("on",b.dataset.tab==="visual"));syncViewMode();renderSidebar();renderUnitTop();renderLesson();refreshPractice();renderBoost();window.scrollTo({top:84,behavior:"smooth"})}
function renderUnitTop(){
 const u=UNITS.find(x=>x.id===currentUnit),l=LESSONS[currentUnit],p=mastery(currentUnit),st=unitStars(currentUnit);
 $("unitExam").textContent=examName(u.exam);$("unitTitle").textContent=u.title;$("unitMission").textContent=l.mission;$("masteryPct").textContent=p+"%";
 $("starDisplay").textContent=starText(st);$("starDisplay").title=`本單元 ${st}/3 星`;
 $("heroTitle").textContent=l.hook.split("。")[0]+"。";$("heroHook").textContent=l.hook;$("heroMastery").textContent="掌握度 "+p+"%";$("heroXp").textContent="XP "+STATE.xp;if($("totalStars"))$("totalStars").textContent=`全站星星 ${totalStars()}/36`;$("xpRingText").innerHTML="XP<br>"+STATE.xp;
}
function syncViewMode(){
 document.body.classList.toggle("questMode",viewMode==="quest");
 document.body.classList.toggle("fullMode",viewMode==="full");
 document.documentElement.classList.toggle("questSnap",viewMode==="quest");
 $("questViewBtn")?.classList.toggle("on",viewMode==="quest");
 $("fullViewBtn")?.classList.toggle("on",viewMode==="full")
}
function setViewMode(mode){
 viewMode=mode==="full"?"full":"quest";questReviewId=null;questCursor=null;syncViewMode();
 if(viewMode==="full"){currentTab="visual";document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("on",b.dataset.tab==="visual"))}
 renderLesson();if(viewMode==="full")renderPractice()
}
function renderLesson(){
 window.HSLVoice?.stop?.();
 syncViewMode();
 document.body.classList.toggle("interactiveFocus",viewMode==="full"&&currentUnit==="u05"&&currentTab==="types");
 const u=UNITS.find(x=>x.id===currentUnit),l=LESSONS[currentUnit],el=$("lessonPane");
 if(viewMode==="quest"){el.innerHTML=questPane(u,l);return}
 if(currentTab==="visual")el.innerHTML=visualPane(u,l);
 if(currentTab==="types")el.innerHTML=typesPane(u,l);
 if(currentTab==="quick")el.innerHTML=quickPane(u,l);
 if(currentTab==="example")el.innerHTML=examplePane(u,l);
 if(currentTab==="prior")el.innerHTML=priorPane(u,l);
}

function questPane(u,l){
 if(currentUnit==="u05"&&QUESTFLOW.u05)return u05QuestPane(u,l);
 return genericQuestPane(u,l)
}
function questDoneCount(id){
 const arr=TYPELESSONS[id]||[],m=masteredTypes(id);let n=0;
 for(const t of arr){if(m[t.id])n++;else break}
 return n
}
function stageForQuest(n){
 const flow=QUESTFLOW.u05;if(!flow)return null;
 return flow.stages.find(s=>n>=s.range[0]&&n<=s.range[1])||flow.stages[flow.stages.length-1]
}
function youthNudge(done){
 const msg={
  0:"先不用想整章，拿下一關就好。",
  1:"有了，手感開始來了。再收一關。",
  2:"這波很順，下一關開始把斜率看得更直覺。",
  3:"差一關到第一個休息站，這波收掉。",
  4:"第一段收下。你已經會看一條線了。",
  5:"開始有高手感了：不是背，是在控線。",
  6:"過半前的節奏很穩，照這速度走。",
  7:"剩一關到第二個小結，穩住。",
  8:"你已經不是在背公式了，後面是在拿招式打題。",
  9:"九關收下，後面只剩實戰招。",
  10:"剩兩關，快封關了。",
  11:"最後一關。打完直接見 Boss。",
  12:"12關全收。Boss 已經在門口。"
 };return msg[Math.max(0,Math.min(12,done))]||"再一關就好。"
}
function questRailHtml(done,active){
 const arr=TYPELESSONS.u05||[];
 return `<div class="questRail"><div class="questRailTop"><b>任務進度</b><span>${done}/12 已完成</span></div><div class="questDots">${arr.map((t,i)=>{const completed=i<done,current=i===active,open=completed||i===done;return `<button class="${completed?"done":""} ${current?"current":""} ${open?"":"locked"}" ${open?`onclick="reviewQuestIndex(${i})"`:"disabled"} title="${t.name}">${i+1}</button>`}).join("")}</div></div>`
}
function reviewQuestIndex(idx){
 const done=questDoneCount("u05"),arr=TYPELESSONS.u05||[];
 idx=Math.max(0,Math.min(idx,arr.length-1));
 if(idx>done)return;
 questReviewId=null;questCursor=idx;renderLesson();window.scrollTo({top:110,behavior:"smooth"})
}
function backToCurrentQuest(){questReviewId=null;questCursor=null;renderLesson();window.scrollTo({top:110,behavior:"smooth"})}
function u05QuestPane(u,l){
 const arr=TYPELESSONS.u05||[],flow=QUESTFLOW.u05,done=questDoneCount("u05");
 if(questReviewId){
  const idx=arr.findIndex(t=>t.id===questReviewId),t=arr[idx];
  if(t)return questSummaryPane(t,idx)
 }
 if(done>=arr.length&&questCursor===null){
  return STATE.questBoss?.u05?u05FinalMap():u05BossPane()
 }
 let idx=questCursor===null?done:questCursor;
 idx=Math.max(0,Math.min(idx,Math.min(done,arr.length-1)));
 const reviewing=idx<done,t=arr[idx],stage=stageForQuest(idx+1),pct=Math.round(done/arr.length*100);
 const nav=`<div class="questNav">${idx>0?`<button onclick="reviewQuestIndex(${idx-1})">← 前一關</button>`:"<span></span>"}${reviewing?`<button onclick="backToCurrentQuest()">回目前進度 ${done<12?`第${done+1}關`:"Boss"} →</button>`:(done>0?`<button onclick="reviewQuestIndex(${done-1})">回看上一關</button>`:"<span></span>")}</div>`;
 const action=reviewing?`<div class="reviewActions"><div class="reviewFlag">👀 回看模式｜這關已完成，不會重複加 XP</div><div class="reviewButtons"><button class="btn2" onclick="showQuestSummary(${idx})">看30秒小結</button>${idx<done-1?`<button class="questPrimary compact" onclick="reviewQuestIndex(${idx+1})">下一關 →</button>`:`<button class="questPrimary compact" onclick="backToCurrentQuest()">回目前進度 →</button>`}</div></div>`:questCheckHtml(t);
 return `<section class="questShell">
   ${questRailHtml(done,idx)}
   ${nav}
   <div class="questTopline"><span>${stage.title}</span><b>第 ${idx+1} / ${arr.length} 關${reviewing?" · 回看":""}</b></div>
   <div class="questProgress"><i style="width:${pct}%"></i></div>
   <div class="youthNudge">🔥 ${youthNudge(done)}</div>
   <div class="questHeroCard swipeCard">
    <div class="questKicker">${reviewing?"回來看懂，不用重刷":"今天只做這一關"}</div>
    <h2>${t.name.replace(/^第\d+關｜/,"")}</h2>
    <p>${t.meaning}</p>
   </div>
   <div class="questVisualCard">
    <div class="questPrompt"><b>先玩30秒</b><span>拖一下，再猜圖會怎麼變。</span></div>
    <div class="typeDiagram interactiveStage simpleStage" id="diagram_${t.id}">
     <div class="interactiveCanvas">${u05InteractiveVisual(t.id)}</div>
    </div>
   </div>
   <div class="questCoach"><span>🧠 高手一句話</span><b>${questMasterLine(t,idx)}</b></div>
   ${action}
   <button class="quietLink" onclick="setViewMode('full');currentTab='types';document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.tab==='types'));renderLesson()">我想看完整教學與例題</button>
  </section>`
}
function showQuestSummary(idx){const t=(TYPELESSONS.u05||[])[idx];if(!t)return;questCursor=null;questReviewId=t.id;renderLesson();window.scrollTo({top:110,behavior:"smooth"})}

function questMasterLine(t,i){
 const lines=[
  "方程式不是一串字，它就是座標上那一條線。",
  "從左往右看：上升正、下降負；先看方向，再看多陡。",
  "兩個不同點一放上去，直線就被鎖死了。",
  "第三點要不要加入這條線？只要方向，也就是斜率一樣。",
  "m 是方向盤，b 是起跑點。",
  "聯立不是新東西：兩條線碰到的地方就是答案。",
  "斜率一樣卻起點不同，就像人生平行線，走再久也碰不到。",
  "一個點鎖位置，斜率鎖方向，直線就只剩一條。",
  "平行線最省事：方向直接照抄。",
  "垂直線就是把方向轉90°：斜率變負倒數。",
  "一般式別怕，找兩個截距點就能把它畫出來。",
  "生活題問『何時一樣』，幾乎就是在找兩條線的交點。"
 ];return lines[i]||t.meaning
}
function questCheckHtml(t){
 return `<div class="questCheck">
   <div class="questCheckHead"><span>⚔️ 只做1題就過關</span><b>${t.check.question}</b></div>
   <div class="questChoices">${t.check.options.map((o,j)=>`<label><input type="radio" name="quest_${t.id}" value="${j}"><span>${String.fromCharCode(65+j)}. ${o}</span></label>`).join("")}</div>
   <button class="questPrimary" onclick="checkQuest('${t.id}')">我選好了</button>
   <div class="questFeedback" id="questFb_${t.id}"></div>
  </div>`
}
function checkQuest(id){
 const t=(TYPELESSONS[currentUnit]||[]).find(x=>x.id===id),x=document.querySelector(`input[name="quest_${id}"]:checked`),fb=$("questFb_"+id);
 if(!x){if(fb){fb.className="questFeedback show bad";fb.textContent="先選一個答案，再出發。"}return}
 const ok=Number(x.value)===t.check.answer;
 if(!ok){fb.className="questFeedback show bad";fb.innerHTML=`差一點，不急。先把圖再拖一次。<br>${t.check.explain}`;return}
 STATE.typeMastered=STATE.typeMastered||{};STATE.typeMastered[currentUnit]=STATE.typeMastered[currentUnit]||{};
 if(!STATE.typeMastered[currentUnit][id]){STATE.typeMastered[currentUnit][id]=true;STATE.xp+=15}
 saveState(STATE);const done=questDoneCount("u05");fb.className="questFeedback show good";fb.innerHTML=`漂亮，這關收下。${done===4||done===8?" 休息站到了。":done===12?" 12關全收，Boss見。":" "+youthNudge(done)}`;
 setTimeout(()=>{questReviewId=id;questCursor=null;renderUnitTop();renderSidebar();renderBoost();renderLesson();window.scrollTo({top:110,behavior:"smooth"})},420)
}
function questSummaryPane(t,idx){
 const n=idx+1,stage=stageForQuest(n),isCheckpoint=n===stage.range[1],trap=(CONCEPTS.u05?.traps||[])[idx%(CONCEPTS.u05?.traps||[1]).length]||"畫圖先看方向，再做代數。";
 const done=questDoneCount("u05");
 return `<section class="questShell summaryScreen">
   ${questRailHtml(done,idx)}
   <div class="questNav">${idx>0?`<button onclick="reviewQuestIndex(${idx-1})">← 前一關</button>`:"<span></span>"}<button onclick="reviewQuestIndex(${idx})">回這一關再看</button></div>
   <div class="summaryBadge">✓ 第 ${n} 關完成</div>
   <h2>30秒小結</h2>
   <div class="youthNudge">✨ ${isCheckpoint?"這段收得很漂亮。先把骨架整理一下，再往下。":youthNudge(done)}</div>
   <div class="threeTakeaways">
    <div><span>我剛學會</span><b>${t.meaning}</b></div>
    <div><span>看到這種題</span><b>${t.signal}</b></div>
    <div><span>最容易掉坑</span><b>${trap}</b></div>
   </div>
   ${isCheckpoint?checkpointHtml(stage):""}
   <div class="summaryActions">
    <button class="btn2" onclick="reviewQuestIndex(${idx})">← 回去玩一次</button>
    <button class="questPrimary questPulse compact" onclick="continueQuest()">${n===12?"去最後 Boss 關":"繼續下一關 →"}</button>
   </div>
  </section>`
}
function checkpointHtml(stage){
 return `<div class="checkpointCard">
  <div class="checkpointTag">🏕️ 階段整理</div>
  <h3>${stage.checkpoint_title}</h3>
  <p>${stage.checkpoint_motto}</p>
  <div class="checkpointList">${stage.takeaways.map(x=>`<span>✓ ${x}</span>`).join("")}</div>
 </div>`
}
function continueQuest(){questReviewId=null;questCursor=null;renderLesson();window.scrollTo({top:110,behavior:"smooth"})}
function u05BossPane(){
 const flow=QUESTFLOW.u05,qs=flow.boss_questions||[];
 return `<section class="questShell bossScreen">
  ${questRailHtml(12,11)}
  <div class="questNav"><button onclick="reviewQuestIndex(11)">← 回第12關</button><button onclick="reviewQuestIndex(0)">從第1關重看</button></div>
  <div class="summaryBadge boss">👑 最後 Boss 關</div>
  <h2>12關都收了。現在只問：你能不能把招式混在一起用？</h2>
  <div class="youthNudge">⚡ 這波過 4/5 就封關。Boss 題全部是新的，不拿前面題目重播。</div>
  <p class="bossLead">5題混合：點斜式、平行、垂直、生活交點、三點共線。答對4題解鎖全貌地圖。</p>
  <div class="bossQuestions">${qs.map((q,i)=>bossQuestionHtml(q,i)).join("")}</div>
  <button class="questPrimary" onclick="submitU05Boss()">挑戰 Boss</button>
  <div class="questFeedback" id="bossFeedback"></div>
 </section>`
}
function bossQuestionHtml(q,i){
 return `<article class="bossQ"><div class="bossNo">${i+1}</div><div><b>${q.text}</b>${q.options.map((o,j)=>`<label><input type="radio" name="boss_${q.id}" value="${j}"> ${String.fromCharCode(65+j)}. ${o}</label>`).join("")}</div></article>`
}
function submitU05Boss(){
 const qs=QUESTFLOW.u05?.boss_questions||[];let score=0;
 for(const q of qs){const x=document.querySelector(`input[name="boss_${q.id}"]:checked`);if(x&&Number(x.value)===q.answer)score++}
 const fb=$("bossFeedback");fb.className="questFeedback show "+(score>=4?"good":"bad");
 if(score>=4){STATE.questBoss=STATE.questBoss||{};const first=!STATE.questBoss.u05;STATE.questBoss.u05=true;if(first)STATE.xp+=40;saveState(STATE);fb.innerHTML=`🔥 ${score}/${qs.length}，Boss 收掉。這章全貌現在可以看了。`;setTimeout(()=>renderLesson(),650)}
 else fb.innerHTML=`這次 ${score}/${qs.length}。差一點，不用整章重來；上面可以直接回第12關或從任一已完成關卡補一下。`
}
function u05FinalMap(){
 const flow=QUESTFLOW.u05,nodes=flow.map_nodes||[],edges=flow.map_edges||[],nodeBy=Object.fromEntries(nodes.map(n=>[n.id,n]));
 const lines=edges.map(([a,b])=>{const A=nodeBy[a],B=nodeBy[b];if(!A||!B)return"";return `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`}).join("");
 return `<section class="questShell finalMapScreen">
  ${questRailHtml(12,-1)}
  <div class="questNav"><button onclick="reviewQuestIndex(0)">↶ 從第1關重看</button><button onclick="reviewQuestIndex(11)">回第12關</button></div>
  <div class="summaryBadge final">★ 單元全貌解鎖</div>
  <h2>封關不是結束。現在你可以從全貌回去補任何一塊。</h2>
  <div class="youthNudge">🏆 這章你真的打穿了。接下來不是重背，是需要時點回去看一招。</div>
  <div class="finalMotto">${flow.final_motto}</div>
  <div class="knowledgeMap">
   <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
   ${nodes.map(n=>`<button style="left:${n.x}%;top:${n.y}%" onclick="jumpFromMap('${n.id}')">${n.label}</button>`).join("")}
  </div>
  <div class="finalLegend"><span>方向：斜率 m</span><span>位置：點／截距 b</span><span>兩條線：看會不會碰到</span></div>
  <div class="summaryActions"><button class="btn2" onclick="STATE.questBoss.u05=false;saveState(STATE);renderLesson()">Boss 再打一輪</button><button class="questPrimary compact" onclick="setViewMode('full')">查看完整章節整理</button></div>
 </section>`
}
function jumpFromMap(typeId){
 setViewMode("full");currentTab="types";document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("on",b.dataset.tab==="types"));renderLesson();
 setTimeout(()=>{const el=document.getElementById("type_"+typeId);if(el){el.scrollIntoView({behavior:"smooth",block:"start"});document.getElementById("typebody_"+typeId)?.classList.remove("hidden")}},80)
}
function genericQuestPane(u,l){
 const d=CONCEPTS[currentUnit]||{},q=(PRACTICE[currentUnit]?.foundation||[])[0];
 return `<section class="questShell genericQuest">
  <div class="questTopline"><span>${examName(u.exam)}</span><b>今天只做 1 件事</b></div>
  <div class="questHeroCard"><div class="questKicker">8分鐘小任務</div><h2>${l.hook.split("。")[0]}</h2><p>${d.deep?.[0]||l.mission}</p></div>
  <div class="questVisualCard swipeCard"><div class="questPrompt"><b>先看／先玩30秒</b><span>不用先讀完整章。</span></div><div class="simpleGenericVisual">${renderVisual(l.visual)}</div><details class="microPeek"><summary>✨ 再玩一個小實驗</summary>${secondaryLab(currentUnit)}</details></div>
  <div class="questCoach swipeCard"><span>🧠 高手一句話</span><b>${l.quick}</b></div>
  ${q?simpleQuestQuestion(q):""}
  <button class="quietLink" onclick="setViewMode('full')">我想看完整概念、題型與快解</button>
 </section>`
}
function simpleQuestQuestion(q){
 let opts="";
 if(q.type==="single")opts=q.options.map((o,i)=>`<label><input type="radio" name="simpleQ" value="${i}"><span>${String.fromCharCode(65+i)}. ${o}</span></label>`).join("");
 else if(q.type==="multi")opts=q.options.map((o,i)=>`<label><input type="checkbox" name="simpleQ" value="${i}"><span>${String.fromCharCode(65+i)}. ${o}</span></label>`).join("");
 else opts=`<input id="simpleFill" class="simpleFill" placeholder="輸入答案">`;
 return `<div class="questCheck swipeCard"><div class="questCheckHead"><span>⚔️ 今天只做1題</span><b>${q.text}</b></div><div class="questChoices">${opts}</div><button class="questPrimary" onclick="checkSimpleQuest()">送出</button><div class="questFeedback" id="simpleQuestFb"></div></div>`
}
function checkSimpleQuest(){
 const q=(PRACTICE[currentUnit]?.foundation||[])[0],fb=$("simpleQuestFb");if(!q)return;let ok=false;
 if(q.type==="single"){const x=document.querySelector('input[name="simpleQ"]:checked');ok=!!x&&Number(x.value)===q.answer}
 else if(q.type==="multi"){const xs=[...document.querySelectorAll('input[name="simpleQ"]:checked')].map(x=>Number(x.value)).sort(),a=[...q.answer].sort();ok=xs.length===a.length&&xs.every((x,i)=>x===a[i])}
 else {const v=$("simpleFill")?.value||"";ok=(q.answer||[]).map(normalize).includes(normalize(v))}
 fb.className="questFeedback show "+(ok?"good":"bad");
 if(ok){fb.innerHTML=`✅ 今天任務完成。<br><b>${q.explain||""}</b>`;STATE.xp+=10;let a=STATE.attempts[currentUnit]||{c:0,t:0};a.t++;a.c++;STATE.attempts[currentUnit]=a;saveState(STATE);renderUnitTop();renderSidebar()}
 else fb.innerHTML=`再想一下。<br>${q.quick||LESSONS[currentUnit].quick}`
}



function visualPane(u,l){
 const c=typeCount(currentUnit), d=CONCEPTS[currentUnit]||{};
 const termCards=(d.terms||[]).slice(0,5).map(t=>`<div class="termCard" data-voice><h4>${t[0]}</h4><p>${t[1]||""}</p><div class="termExample">例：${t[2]||""}</div></div>`).join("");
 const whyCards=(d.deep||[]).map((p,i)=>`<div class="conceptCard" data-voice><h4>${["先抓定義","把圖看懂","把圖翻成式子"][i]||"為什麼"}</h4><p>${p}</p></div>`).join("");
 const stepCards=(l.steps||[]).map((s,i)=>`<div class="stepCard" data-voice><div class="stepNo">${i+1}</div><div><h4>${Array.isArray(s)?s[0]:"步驟"}</h4><p>${Array.isArray(s)?(s[1]||""):s}</p></div></div>`).join("");
 const prior=(l.prior||[]).map(x=>`<span class="miniTag">${x}</span>`).join("");
 const targets=(l.target||[]).map(x=>`<span class="miniTag goal">${x}</span>`).join("");
 const recall=(d.recall_checks||[]).slice(0,2).map(x=>`<div class="recallCard" data-voice><b>回想：</b>${x[0]}<br><span>${x[1]}</span></div>`).join("");
 const sketchSteps=(l.sketch_steps||[]).map((x,i)=>`<li><span>${i+1}</span><div>${x}</div></li>`).join("");
 const drawFirst = l.draw_first ? `<div class="drawFirstBoard">
   <div class="drawFirstCard big" data-voice><h4>🎯 這章先畫什麼？</h4><p>${l.draw_first}</p></div>
   <div class="drawFirstCard" data-voice><h4>👀 畫圖時先盯什麼</h4><p>${l.watch_for||"先盯最關鍵的形狀、位置變化與關係。"}</p></div>
   <div class="drawFirstCard" data-voice><h4>🗣 看完圖要說得出來</h4><p>${l.say_after||"先用自己的話說出圖在表達什麼，再去套公式。"}</p></div>
 </div>
 <div class="sketchMission" data-voice><h4>✍️ 畫圖先懂｜1分鐘起手式</h4><ol>${sketchSteps}</ol></div>` : "";
 const genericHint = `<div class="feedback" data-voice><b>這章建議打法：</b>先玩圖、先說人話、再寫算式。若你一開始只盯著公式，很容易覺得抽象；先看圖反而會快很多。</div>`;
 const unitHint=currentUnit==="u07"?`<div class="feedback" data-voice><b>本章主軸：</b>圓方程式不是硬背公式，而是「半徑都一樣」→「距離都一樣」→「畢氏定理」→「平方式」。</div>`:
                  currentUnit==="u08"?`<div class="feedback" data-voice><b>本章主軸：</b>先畫出圓心到直線的垂線段。那條最短線段才叫距離 d，再和半徑 r 比。相切就是一點、一組解；相交就是兩點、兩組解。</div>`:"";
 return `<div class="sectionHead"><span class="num pink">1</span><div><h3>先看懂，別急著背</h3><p>${l.mission}</p></div></div>
 <div class="storyHero voiceReadable" data-voice>
   <div class="storyKicker">各單元畫圖先懂</div>
   <h2>${l.hook}</h2>
   <p>這一章最重要的不是一串公式，而是：先知道它在描述什麼圖形、什麼距離、什麼變化，然後再把圖翻成式子。</p>
 </div>
 <div class="tagWrap"><div><b>舊知識：</b>${prior}</div><div><b>本章任務：</b>${targets}</div></div>
 ${drawFirst}
 <div class="visualFrame">
   <div class="visualExplain" data-voice><b>主互動：</b>先用眼睛看懂，手去拖動，腦中能說出變化，再回頭看公式，理解會更牢。</div>
   <div class="simpleGenericVisual">${renderVisual(l.visual)}</div>
 </div>
 <div class="sectionHead compactHead"><span class="num purple">+</span><div><h3>再玩一個小實驗</h3><p>同一個觀念換一個角度，看懂會更穩。</p></div></div>
 ${secondaryLab(currentUnit)}
 ${unitDeepDive(currentUnit)}
 ${genericHint}
 ${unitHint}
 <div class="sectionHead"><span class="num blue">2</span><div><h3>為什麼會這樣？</h3><p>把結論拆回圖像與定義，讓公式有來處。</p></div></div>
 <div class="conceptGrid whyGrid">${whyCards}</div>
 <div class="sectionHead"><span class="num amber">3</span><div><h3>最短學習路徑</h3><p>先畫、先說、再算，比死背更穩。</p></div></div>
 <div class="stepFlow">${stepCards}</div>
 <div class="sectionHead"><span class="num green">4</span><div><h3>名詞＋圖像一起記</h3><p>看到名詞時，要立刻想到畫面。</p></div></div>
 <div class="termGrid">${termCards}</div>
 <div class="quickStrip">
   <div class="signalBox" data-voice><h4>快解提醒</h4><p>${l.quick}</p></div>
   <div class="quickCard" data-voice><h4>常見陷阱</h4><p>${l.trap||"先畫圖，再決定用哪個公式。"}</p></div>
   <div class="scenarioCard" data-voice><h4>生活感</h4><p>${l.context||"把數學翻回圖形，再翻回生活。"}。</p></div>
 </div>
 <div class="sectionHead"><span class="num purple">5</span><div><h3>學完要會什麼</h3><p>不要一次追求全會，先把最低標準拿下。</p></div></div>
 <div class="minimumCard" data-voice><b>至少要會：</b><p>${d.minimum||l.mission}</p></div>
 <div class="recallGrid">${recall}</div>
 <div class="starRoad"><div><b>⭐ 1星｜看懂圖</b><span>能說出圖在表達什麼</span></div><div><b>⭐ 2星｜會翻成式子</b><span>能從圖找到做題線索</span></div><div><b>⭐ 3星｜會講理由</b><span>能說出為什麼用這個方法</span></div></div>`
}
function masteredTypes(id){return STATE.typeMastered?.[id]||{}}
function typeCount(id){const all=TYPELESSONS[id]||[],m=masteredTypes(id);return {done:all.filter(t=>m[t.id]).length,total:all.length}}
function typesPane(u,l){
 const arr=TYPELESSONS[currentUnit]||[],c=typeCount(currentUnit),pct=c.total?Math.round(c.done/c.total*100):0;
 const intro=currentUnit==="u05"?`<div class="masterIntro"><div class="masterTag">這章的破關密技</div><h3>別急著背公式。先把線畫出來，你會發現答案一直在圖上。</h3><p>順序是故意排的：先會畫 <b>x+y=0、x−y=0</b> → 看懂斜率 → 兩點成線 → 三點共線 → 再進到聯立、平行、垂直。每關都先動圖，再算。</p><div class="masterMotto">「公式不是咒語，是把你已經看懂的圖，寫得更快。」</div></div>`:`<div class="firstLearnNote"><b>第一次學習模式：</b>不用一次看完整章。先學一種題型 → 跟著例題走 → 做1題確認。會一型，就多拿一塊分數。</div>`;
 return `${intro}<div class="typeProgress"><b>題型進度 ${c.done}/${c.total}</b><div class="typeProgressBar"><div class="typeProgressFill" style="width:${pct}%"></div></div><span>${pct}%</span></div><div class="typeDeck">${arr.map((t,i)=>typeCard(t,i)).join("")}</div>`
}

function advancedTypeVisual(id){
 const V={
  u01t4:`<svg viewBox="0 0 620 210"><text x="75" y="75" font-size="28">0.006284</text><path d="M210 68 L345 68" stroke="#3478f6" stroke-width="4"/><polygon points="345,68 330,59 330,77" fill="#3478f6"/><text x="375" y="75" font-size="28" font-weight="700">0.0063</text><text x="120" y="130" font-size="16">2位有效數字：6、2｜下一位8 → 進位</text><text x="165" y="170" font-size="14" fill="#66748c">有效數字從第一個非零數開始算</text></svg>`,
  u02t4:`<svg viewBox="0 0 620 210"><text x="90" y="85" font-size="30">3/√2</text><text x="205" y="85" font-size="24">× √2/√2</text><path d="M365 78 L440 78" stroke="#3478f6" stroke-width="4"/><polygon points="440,78 425,69 425,87" fill="#3478f6"/><text x="465" y="85" font-size="30">3√2/2</text><text x="160" y="150" font-size="16">分子分母同乘同一個數，值不變；分母根號消失</text></svg>`,
  u03t4:`<svg viewBox="0 0 620 220"><line x1="70" y1="120" x2="550" y2="120" stroke="#7e8da5"/><circle cx="220" cy="120" r="7" fill="#3478f6"/><circle cx="430" cy="120" r="7" fill="#ff6f9a"/><text x="207" y="150" font-size="14">1</text><text x="418" y="150" font-size="14">4</text><line x1="220" y1="90" x2="430" y2="90" stroke="#7c67ef" stroke-width="5"/><text x="210" y="55" font-size="17">|x−1| + |x−4| = 3（在兩點之間）</text></svg>`,
  u04t4:`<svg viewBox="0 0 620 210"><rect x="65" y="50" width="190" height="95" rx="16" fill="#eef4ff"/><text x="102" y="105" font-size="28">log₂x = 5</text><path d="M275 98 L390 98" stroke="#7c67ef" stroke-width="4"/><polygon points="390,98 375,89 375,107" fill="#7c67ef"/><rect x="410" y="50" width="150" height="95" rx="16" fill="#eefaf5"/><text x="445" y="105" font-size="28">x = 2⁵</text><text x="190" y="180" font-size="15">對數方程式先翻回指數式，通常一眼就懂</text></svg>`,
  u05t6:`<svg viewBox="0 0 620 250"><line x1="65" y1="205" x2="565" y2="205" stroke="#8795aa"/><line x1="85" y1="225" x2="85" y2="35" stroke="#8795aa"/><line x1="110" y1="175" x2="525" y2="80" stroke="#3478f6" stroke-width="4"/><line x1="110" y1="195" x2="470" y2="55" stroke="#ff6f9a" stroke-width="4"/><circle cx="310" cy="129" r="8" fill="#7c67ef"/><text x="325" y="126" font-size="14">交點＝兩方案費用相同</text><text x="120" y="55" font-size="14" fill="#3478f6">A方案</text><text x="445" y="48" font-size="14" fill="#cc4773">B方案</text></svg>`,
  u06t4:`<svg viewBox="0 0 620 230"><polygon points="120,185 120,70 390,185" fill="#dce8ff" stroke="#5078df" stroke-width="2"/><circle cx="120" cy="185" r="7" fill="#ff6f9a"/><circle cx="120" cy="70" r="7" fill="#ff6f9a"/><circle cx="390" cy="185" r="7" fill="#ff6f9a"/><text x="160" y="120" font-size="18" font-weight="700">可行區域</text><text x="430" y="90" font-size="15">極值先查頂點</text></svg>`,
  u07t4:`<svg viewBox="0 0 620 230"><circle cx="310" cy="115" r="85" fill="#eef4ff" stroke="#3478f6" stroke-width="3"/><line x1="242" y1="64" x2="378" y2="166" stroke="#ff6f9a" stroke-width="4"/><circle cx="242" cy="64" r="7" fill="#ff6f9a"/><circle cx="378" cy="166" r="7" fill="#ff6f9a"/><circle cx="310" cy="115" r="6" fill="#3478f6"/><text x="205" y="205" font-size="16">直徑兩端 → 中點就是圓心 → 長度一半是半徑</text></svg>`,
  u08t4:`<svg viewBox="0 0 620 220"><circle cx="270" cy="110" r="70" fill="#eef4ff" stroke="#3478f6" stroke-width="3"/><line x1="340" y1="35" x2="340" y2="185" stroke="#ff6f9a" stroke-width="4"/><line x1="270" y1="110" x2="340" y2="110" stroke="#7c67ef" stroke-dasharray="6 5" stroke-width="3"/><text x="365" y="100" font-size="18">d = r</text><text x="365" y="130" font-size="15">相切參數題</text></svg>`,
  u09t4:`<svg viewBox="0 0 620 210"><text x="70" y="65" font-size="20">x²+3x+2 = (x+1)(x+a)+b</text><text x="80" y="115" font-size="17">x項：a+1 = 3 → a=2</text><text x="80" y="150" font-size="17">常數：a+b = 2 → b=0</text><text x="345" y="185" font-size="14" fill="#66748c">恆等式 → 同次方係數相等</text></svg>`,
  u10t4:`<svg viewBox="0 0 620 220"><rect x="55" y="60" width="150" height="90" rx="15" fill="#eef4ff"/><text x="80" y="105" font-size="22">f(1)=0</text><text x="75" y="135" font-size="15">找到零點 1</text><path d="M225 105 L345 105" stroke="#3478f6" stroke-width="4"/><polygon points="345,105 330,96 330,114" fill="#3478f6"/><rect x="365" y="60" width="190" height="90" rx="15" fill="#eefaf5"/><text x="395" y="102" font-size="21">先除掉 (x−1)</text><text x="405" y="132" font-size="15">高次式降一階</text></svg>`,
  u11t4_legacy:`<svg viewBox="0 0 620 240"><line x1="60" y1="175" x2="560" y2="175" stroke="#8795aa"/><path d="M145 45 Q310 260 475 45" fill="none" stroke="#3478f6" stroke-width="4"/><circle cx="210" cy="175" r="7" fill="#ff6f9a"/><circle cx="410" cy="175" r="7" fill="#ff6f9a"/><text x="205" y="205" font-size="13">根1</text><text x="405" y="205" font-size="13">根2</text><text x="190" y="32" font-size="17">Δ&gt;0 → 與 x 軸交兩點</text></svg>`,
  u12t4_legacy:`<svg viewBox="0 0 620 240"><line x1="60" y1="125" x2="560" y2="125" stroke="#8795aa"/><path d="M70 65 C150 65 170 185 250 185 S360 65 440 65 S510 185 555 185" fill="none" stroke="#3478f6" stroke-width="4"/><text x="95" y="55" font-size="15" fill="#27a66f">f(x)&gt;0</text><text x="245" y="210" font-size="15" fill="#d45454">f(x)&lt;0</text><text x="420" y="55" font-size="15" fill="#27a66f">看圖在 x 軸上／下</text></svg>`
 }; return V[id]||""
}
function typeCard(t,i){
 const ok=!!masteredTypes(currentUnit)[t.id],isU05=t.id.startsWith("u05");
 const visual=u05InteractiveVisual(t.id)||advancedTypeVisual(t.id)||typeVisual(t.id);
 const l=LESSONS[currentUnit]||{},drawCue=(l.sketch_steps||[])[0]||l.draw_first||"先畫一張簡圖，再開始列式。";
 const diagram=`<div class="typeDiagram ${isU05?"interactiveStage":""}" id="diagram_${t.id}">${isU05?`<div class="interactiveToolbar"><b>🎛️ 互動實驗室｜先拖、先猜，再看結果</b><button class="expandInteractiveBtn" onclick="toggleInteractiveStage('${t.id}',this)">⛶ 放大互動</button></div><div class="interactiveCanvas">${visual}</div><div class="controlHint">提示：拖拉時先預測圖會往哪裡動。能預測，代表你真的在理解，不是在背。</div>`:visual}</div>`;
 return `<article class="typeCard ${ok?"mastered":""} ${isU05?"u05Wide":""}" id="type_${t.id}"><div class="typeHead" onclick="toggleType('${t.id}')"><div><h3>${t.name}</h3><small>${t.meaning}</small></div><span class="typeBadge ${ok?"ok":""}">${ok?"✓ 已懂這型":"先學這型"}</span></div><div class="typeBody ${i===0?"":"hidden"}" id="typebody_${t.id}"><div class="signalGrid"><div class="signalBox look"><b>👀 看到什麼？</b><p>${t.signal}</p></div><div class="signalBox think"><b>🧠 馬上想到什麼？</b><p>${t.meaning}</p></div></div><div class="drawBeforeSolve" data-voice><span>✍️ 先畫再解</span><b>${drawCue}</b><small>先把圖畫出來，再看題目要你找哪個量。</small></div>${diagram}<div class="recipe">${t.steps.map((s,j)=>`<div class="recipeStep"><span>${j+1}</span><p>${s}</p></div>`).join("")}</div><div class="worked"><div class="workedQ">📘 跟著做：${t.example.question}</div><div class="workedSteps">${t.example.steps.map((s,j)=>`<div class="workedStep ${j===0?"show":""}">${j+1}. ${s}</div>`).join("")}</div><div class="exampleBtns"><button class="btn" onclick="nextWorked('${t.id}')">下一步</button><button class="btn2" onclick="showWhy('${t.id}')">為什麼這樣做？</button></div><div class="whyBox" id="why_${t.id}"><b>答案：${t.example.answer}</b><br>${t.example.why}</div></div><div class="variationBox"><b>🔄 變形會怎麼考：</b>${t.variation}</div>${microCheckHtml(t,ok)}</div></article>`
}
function toggleInteractiveStage(id,btn){
 const el=document.getElementById("diagram_"+id);if(!el)return;
 const open=!el.classList.contains("expanded");
 el.classList.toggle("expanded",open);
 document.body.style.overflow=open?"hidden":"";
 if(btn)btn.textContent=open?"✕ 回到課程":"⛶ 放大互動";
 if(open)setTimeout(()=>el.scrollTo({top:0,behavior:"smooth"}),30)
}
window.addEventListener("keydown",e=>{if(e.key==="Escape"){const el=document.querySelector(".interactiveStage.expanded");if(el){el.classList.remove("expanded");document.body.style.overflow="";const b=el.querySelector(".expandInteractiveBtn");if(b)b.textContent="⛶ 放大互動"}}});

function microCheckHtml(t,ok){return `<div class="microCheck"><h4>30秒確認：${t.check.question}</h4>${t.check.options.map((o,j)=>`<label class="microOpt"><input type="radio" name="mc_${t.id}" value="${j}"> ${String.fromCharCode(65+j)}. ${o}</label>`).join("")}<button class="btn2" onclick="checkType('${t.id}')">確認答案</button><div class="microFeedback" id="mcf_${t.id}"></div><button class="masterBtn" id="mb_${t.id}" onclick="markTypeMastered('${t.id}')" ${ok?"disabled":"disabled"}>${ok?"✓ 已學會這型":"先答對30秒確認"}</button></div>`}
function toggleType(id){document.getElementById('typebody_'+id)?.classList.toggle('hidden')}
function nextWorked(id){const box=document.getElementById('type_'+id),xs=[...box.querySelectorAll('.workedStep')],n=xs.findIndex(x=>!x.classList.contains('show'));if(n>=0)xs[n].classList.add('show');else showWhy(id)}
function showWhy(id){document.getElementById('why_'+id)?.classList.add('show')}
function checkType(id){const t=(TYPELESSONS[currentUnit]||[]).find(x=>x.id===id),x=document.querySelector(`input[name="mc_${id}"]:checked`),f=document.getElementById('mcf_'+id);if(!x){f.textContent='先選一個答案。';return}const ok=Number(x.value)===t.check.answer;f.innerHTML=ok?`<span style="color:#177052"><b>✅ 對。</b> ${t.check.explain}</span>`:`<span style="color:#a44747"><b>再看一次。</b> ${t.check.explain}</span>`;if(ok){STATE.xp+=5;saveState(STATE);const b=document.getElementById('mb_'+id);if(b){b.disabled=false;b.textContent='我懂這一型了'}}}
function markTypeMastered(id){STATE.typeMastered=STATE.typeMastered||{};STATE.typeMastered[currentUnit]=STATE.typeMastered[currentUnit]||{};STATE.typeMastered[currentUnit][id]=true;STATE.xp+=10;saveState(STATE);rewardStars(currentUnit);renderLesson();renderPractice();renderUnitTop();renderSidebar();renderBoost()}
function goTypes(){currentTab='types';document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.tab==='types'));renderLesson();document.getElementById('lessonPane').scrollIntoView({behavior:'smooth',block:'start'})}

function answerText(q){if(!q)return "";if(q.type==="single")return `${String.fromCharCode(65+q.answer)}. ${q.options?.[q.answer]??""}`;if(q.type==="multi")return q.answer.map(i=>String.fromCharCode(65+i)).join("、");if(q.type==="fill")return Array.isArray(q.answer)?q.answer[0]:q.answer;return q.answer||""}
function answerText(q){if(!q)return "";if(q.type==="single")return `${String.fromCharCode(65+q.answer)}. ${q.options?.[q.answer]??""}`;if(q.type==="multi")return q.answer.map(i=>String.fromCharCode(65+i)).join("、");if(q.type==="fill")return Array.isArray(q.answer)?q.answer[0]:q.answer;return q.answer||""}
function lifeProblemsHtml(d){const ps=d.life_problems||[];if(!ps.length)return "";return `<div class="sectionHead" style="margin-top:14px"><span class="num purple">4</span><h3>生活情境不要只看故事：直接把它解掉</h3></div><div class="lifeProblemGrid">${ps.map((p,i)=>`<article class="lifeProblem"><div class="lifeTitle">${p.title}</div><p>${p.story}</p><div class="lifeOptions">${p.options.map((o,j)=>`<button class="lifeOpt" onclick="checkLife(${i},${j},this)">${String.fromCharCode(65+j)}. ${o}</button>`).join("")}</div><div class="lifeFeedback" id="lifeFb_${i}"></div></article>`).join("")}</div>`}
function checkLife(i,j,btn){const p=CONCEPTS[currentUnit]?.life_problems?.[i],fb=document.getElementById("lifeFb_"+i);if(!p||!fb)return;btn.parentElement.querySelectorAll(".lifeOpt").forEach(x=>x.classList.remove("good","bad"));const ok=j===p.answer;btn.classList.add(ok?"good":"bad");fb.innerHTML=ok?`<b>✅ 這才叫真的會用。</b> ${p.explain}`:`<b>再看一次圖的意思。</b> ${p.explain}`;fb.className="lifeFeedback show "+(ok?"good":"bad")}
function quickPane(u,l){const d=CONCEPTS[currentUnit]||{},signals=(TYPELESSONS[currentUnit]||[]).map(t=>t.signal),drills=[...(PRACTICE[currentUnit]?.foundation||[]),...(PRACTICE[currentUnit]?.standard||[])].slice(0,2);return `<div class="sectionHead"><span class="num green">1</span><h3>${currentUnit==="u05"?"高手先看圖，公式只是收尾":"快解不是偷吃步，是先辨認結構"}</h3></div><div class="quickGrid"><div class="quickCard fast"><h3>⚡ 這章最值得記的快解</h3><ol>${(d.quick_rules||[l.quick]).map(x=>`<li>${x}</li>`).join("")}</ol></div><div class="quickCard trap"><h3>⚠️ 老師最愛抓的陷阱</h3><ol>${(d.traps||[l.trap]).map(x=>`<li>${x}</li>`).join("")}</ol></div></div><div class="sectionHead" style="margin-top:14px"><span class="num amber">2</span><h3>考場看到這些字，腦袋立刻切換解法</h3></div><div class="signalChecklist">${signals.map((x,i)=>`<div><b>${i+1}</b><span>${x}</span></div>`).join("")}</div><div class="sectionHead" style="margin-top:14px"><span class="num green">3</span><h3>快解演練：先想10秒，再打開答案</h3></div><div class="quickDrills">${drills.map(q=>`<div class="quickDrill"><b>${q.text}</b><p>${q.quick||l.quick}</p><details><summary>看答案與理由</summary><div class="recallAnswer"><b>${answerText(q)}</b><br>${q.explain||""}</div></details></div>`).join("")}</div>${currentUnit==="u05"?lifeProblemsHtml(d):`<div class="sectionHead" style="margin-top:14px"><span class="num purple">4</span><h3>生活情境怎麼翻成數學</h3></div><div class="conceptCard"><p>${l.context}</p><p style="margin-top:8px;color:#66748c">先抓「固定量、變化率、距離、限制、交點、最大最小」等關鍵字，再決定模型，不要一看到長文字就開始計算。</p></div>`}` }
function examplePane(u,l){
 const examples=getUnitQuestions(currentUnit).filter(q=>q.type==="single"||q.type==="fill").slice(0,2);const q=examples[0]||getUnitQuestions(currentUnit)[0];
 if(!q)return `<p>目前沒有例題。</p>`;
 const ans=q.type==="single"?String.fromCharCode(65+q.answer):Array.isArray(q.answer)?q.answer[0]:q.answer;
 return `<div class="sectionHead"><span class="num amber">1</span><h3>例題拆成三步，不直接丟答案</h3></div><div class="example"><div class="exampleQ">${q.text}</div><div class="exampleSteps"><div class="exStep show">① 先判斷：這題屬於「${u.title.replace(/^\d+\.\s*/,"")}」哪一種基本型？</div><div class="exStep">② ${q.quick||l.quick}</div><div class="exStep">③ 正解：${ans}。${q.explain||""}</div></div><div class="exampleBtns"><button class="btn" onclick="nextExampleStep(this)">下一步</button><button class="btn2" onclick="resetExample(this)">重來</button></div></div>`}
function priorPane(u,l){const d=CONCEPTS[currentUnit]||{};return `<div class="sectionHead"><span class="num purple">1</span><h3>先把國中記憶叫回來：不是列名詞，而是先做一個小例子</h3></div><div class="priorVisual">${priorVisual(currentUnit)}</div><div class="priorGrid">${(d.prior_examples||[]).map(x=>`<div class="priorCard"><h4>${x[0]}</h4><p>${x[1]}</p></div>`).join("")}</div><div class="sectionHead" style="margin-top:14px"><span class="num amber">2</span><h3>30秒回憶：先在腦中回答，再打開</h3></div><div class="recallGrid">${(d.recall_checks||[]).map(x=>`<div class="recallCard"><b>${x[0]}</b><details><summary>我想好了，看答案</summary><div class="recallAnswer">${x[1]}</div></details></div>`).join("")}</div><div class="sectionHead" style="margin-top:14px"><span class="num green">3</span><h3>高中把舊知識往哪裡升級？</h3></div><div class="priorGrid"><div class="priorCard"><h4>國中已會</h4><ul>${l.prior.map(x=>`<li>${x}</li>`).join("")}</ul></div><div class="priorCard"><h4>高中新增</h4><ul>${l.target.map(x=>`<li>${x}</li>`).join("")}</ul></div></div><div class="conceptCard" style="margin-top:10px"><b>🔗 串聯：</b><p>${u.bridge}</p></div>`}
function nextExampleStep(btn){const xs=[...btn.closest(".example").querySelectorAll(".exStep")];const i=xs.findIndex(x=>!x.classList.contains("show"));if(i>=0)xs[i].classList.add("show");else btn.textContent="都看完了"}
function resetExample(btn){const xs=[...btn.closest(".example").querySelectorAll(".exStep")];xs.forEach((x,i)=>x.classList.toggle("show",i===0));btn.previousElementSibling.textContent="下一步"}


function secondaryLab(unit=currentUnit){
 const labs={
  u01:()=>`<div class="microLab" id="ml_u01"><div class="microLabHead"><b>第二個小實驗｜數量級差一階，差幾倍？</b><span>拖 10 的次方</span></div><div id="ml_u01_box">${magnitudeLabSvg(6)}</div><label class="labSlider">指數 n = <span id="ml_u01_v">6</span><input type="range" min="-3" max="10" step="1" value="6" oninput="updateMagnitudeLab(this.value)"></label></div>`,
  u02:()=>`<div class="microLab"><div class="microLabHead"><b>第二個小實驗｜固定和，怎麼分乘積最大？</b><span>把20拆成兩段</span></div><div id="ml_u02_box">${splitAreaSvg(10)}</div><label class="labSlider">a = <span id="ml_u02_v">10</span><input type="range" min="1" max="19" step="1" value="10" oninput="updateSplitLab(this.value)"></label></div>`,
  u03:()=>`<div class="microLab"><div class="microLabHead"><b>第二個小實驗｜絕對值就是兩點距離</b><span>拖 x 看 |x-a|</span></div><div id="ml_u03_box">${distanceLabSvg(3,6)}</div><div class="dualSliders"><label>a=<span id="ml_u03_a_v">3</span><input id="ml_u03_a" type="range" min="-4" max="6" value="3" oninput="updateDistanceLab()"></label><label>x=<span id="ml_u03_x_v">6</span><input id="ml_u03_x" type="range" min="-4" max="8" value="6" oninput="updateDistanceLab()"></label></div></div>`,
  u04:()=>`<div class="microLab"><div class="microLabHead"><b>第二個小實驗｜百分比成長會越拉越開</b><span>調整成長率</span></div><div id="ml_u04_box">${growthRateLabSvg(20,6)}</div><div class="dualSliders"><label>每期成長 <span id="ml_u04_p_v">20</span>%<input id="ml_u04_p" type="range" min="5" max="50" step="5" value="20" oninput="updateGrowthRateLab()"></label><label>期數 <span id="ml_u04_n_v">6</span><input id="ml_u04_n" type="range" min="1" max="10" value="6" oninput="updateGrowthRateLab()"></label></div></div>`,
  u05:()=>`<div class="microLab"><div class="microLabHead"><b>第二個小實驗｜m 轉方向、b 搬位置</b><span>兩條滑桿控整條線</span></div>${lineMasterVisualId("ml_u05",1,0)}</div>`,
  u06:()=>`<div class="microLab"><div class="microLabHead"><b>第二個小實驗｜邊界線一移，陰影跟著變</b><span>x+y≤c</span></div><div id="ml_u06_box">${halfplaneShiftSvg(4)}</div><label class="labSlider">c = <span id="ml_u06_v">4</span><input type="range" min="-2" max="8" step="1" value="4" oninput="updateHalfplaneShift(this.value)"></label></div>`,
  u07:()=>`<div class="microLab"><div class="microLabHead"><b>第二個小實驗｜同一個圓，圓上點怎麼跑半徑都不變</b><span>拖圓上點</span></div><div id="ml_u07_box">${circleOrbitSvg(40)}</div><label class="labSlider">圓上點角度 = <span id="ml_u07_v">40°</span><input type="range" min="0" max="355" step="5" value="40" oninput="updateCircleOrbit(this.value)"></label></div>`,
  u08:()=>`<div class="microLab"><div class="microLabHead"><b>第二個小實驗｜把直線推近圓</b><span>看 0 / 1 / 2 個交點</span></div><div id="ml_u08_box">${lineCircleMiniSvg(6)}</div><label class="labSlider">直線 x = <span id="ml_u08_v">6</span><input type="range" min="-7" max="7" step="1" value="6" oninput="updateLineCircleMini(this.value)"></label></div>`,
  u09:()=>`<div class="microLab"><div class="microLabHead"><b>第二個小實驗｜乘回去看結構</b><span>(x+1)(x+a)</span></div><div id="ml_u09_box">${divisionStructureSvg(2)}</div><label class="labSlider">a = <span id="ml_u09_v">2</span><input type="range" min="-5" max="5" step="1" value="2" oninput="updateDivisionStructure(this.value)"></label></div>`,
  u10:()=>`<div class="microLab"><div class="microLabHead"><b>第二個小實驗｜直接代入，就知道餘式</b><span>f(x)=x²−3x+2</span></div><div id="ml_u10_box">${remainderEvalSvg(1)}</div><label class="labSlider">代入 a = <span id="ml_u10_v">1</span><input type="range" min="-3" max="5" step="1" value="1" oninput="updateRemainderEval(this.value)"></label></div>`,
  u11:()=>`<div class="microLab"><div class="microLabHead"><b>第二層｜固定 a=1，只看 h、k 搬頂點</b><span>y=(x-h)²+k</span></div><div class="parameterRoles mini"><span><b>h</b> 左右搬</span><span><b>k</b> 上下搬</span><span><b>x</b> 仍是輸入</span><span><b>y</b> 仍是輸出</span></div><div id="ml_u11_box">${vertexLabSvg(0,0)}</div><div class="dualSliders"><label>h = <span id="ml_u11_h_v">0</span><input id="ml_u11_h" type="range" min="-4" max="4" value="0" oninput="updateVertexLab()"></label><label>k = <span id="ml_u11_k_v">0</span><input id="ml_u11_k" type="range" min="-4" max="4" value="0" oninput="updateVertexLab()"></label></div></div>`,
  u12:()=>`<div class="microLab"><div class="microLabHead"><b>第二個小實驗｜重根：穿過還是碰回？</b><span>比較一重根與二重根</span></div><div id="ml_u12_box">${multiplicityLabSvg("double")}</div><div class="modeButtons"><button class="on" onclick="setMultiplicityMode('double',this)">二重根：不換號</button><button onclick="setMultiplicityMode('single',this)">一重根：換號</button></div></div>`
 };
 return (labs[unit]||(()=>''))()
}
function magnitudeLabSvg(n){const v=Math.pow(10,n),label=n>=0?`10^${n}`:`10^(${n})`;return `<svg viewBox="0 0 620 220"><rect x="60" y="70" width="500" height="58" rx="18" fill="#eef3ff"/><rect x="60" y="70" width="${Math.max(35,Math.min(500,(n+3)/13*500))}" height="58" rx="18" fill="#6485ee"/><text x="75" y="108" font-size="22" fill="#fff">${label}</text><text x="75" y="166" font-size="16">相差 1 個次方，就是差 10 倍；先看指數，再看前面的係數。</text><text x="430" y="108" font-size="15" fill="#42516c">${v.toExponential(1)}</text></svg>`}
window.updateMagnitudeLab=v=>{$("ml_u01_v").textContent=v;$("ml_u01_box").innerHTML=magnitudeLabSvg(Number(v))}
function splitAreaSvg(a){a=Number(a);const b=20-a,area=a*b,w=250,h=Math.max(25,area/100*110);return `<svg viewBox="0 0 620 235"><rect x="80" y="${185-h}" width="${w}" height="${h}" fill="#dfe9ff" stroke="#4d78e3" stroke-width="3"/><text x="90" y="${175-h}" font-size="16">a=${a}</text><text x="340" y="${185-h/2}" font-size="16">b=${b}</text><text x="390" y="90" font-size="24" font-weight="800">面積 ab = ${area}</text><text x="390" y="125" font-size="15">a+b固定為20</text><text x="390" y="153" font-size="15">越接近平分，面積越大</text></svg>`}
window.updateSplitLab=v=>{$("ml_u02_v").textContent=v;$("ml_u02_box").innerHTML=splitAreaSvg(Number(v))}
function distanceLabSvg(a,x){const X=v=>70+(v+4)*40,d=Math.abs(x-a);return `<svg viewBox="0 0 620 220"><line x1="70" y1="115" x2="550" y2="115" stroke="#718096" stroke-width="2"/><line x1="${X(a)}" y1="85" x2="${X(x)}" y2="85" stroke="#7c67ef" stroke-width="5"/><circle cx="${X(a)}" cy="115" r="8" fill="#3478f6"/><circle cx="${X(x)}" cy="115" r="8" fill="#ff6f9a"/><text x="${X(a)-12}" y="150" font-size="14">a=${a}</text><text x="${X(x)-12}" y="150" font-size="14">x=${x}</text><text x="225" y="45" font-size="22" font-weight="800">|x−a| = ${d}</text><text x="190" y="190" font-size="14">絕對值就是兩點在數線上的距離</text></svg>`}
window.updateDistanceLab=()=>{const a=Number($("ml_u03_a").value),x=Number($("ml_u03_x").value);$("ml_u03_a_v").textContent=a;$("ml_u03_x_v").textContent=x;$("ml_u03_box").innerHTML=distanceLabSvg(a,x)}
function growthRateLabSvg(p,n){p=Number(p)/100;n=Number(n);const vals=Array.from({length:n+1},(_,i)=>100*Math.pow(1+p,i)),max=Math.max(...vals);const pts=vals.map((v,i)=>`${70+i*450/Math.max(1,n)},${190-v/max*120}`).join(" ");return `<svg viewBox="0 0 620 230"><line x1="60" y1="195" x2="560" y2="195" stroke="#8795aa"/><line x1="70" y1="200" x2="70" y2="50" stroke="#8795aa"/><polyline points="${pts}" fill="none" stroke="#4b78e8" stroke-width="4"/><circle cx="${70+n*450/Math.max(1,n)}" cy="${190-vals[n]/max*120}" r="7" fill="#ff6f9a"/><text x="350" y="55" font-size="17">起點100 → 第${n}期約 ${vals[n].toFixed(1)}</text><text x="350" y="82" font-size="14">每期不是加 ${Math.round(p*100)}，而是乘 ${(1+p).toFixed(2)}</text></svg>`}
window.updateGrowthRateLab=()=>{const p=Number($("ml_u04_p").value),n=Number($("ml_u04_n").value);$("ml_u04_p_v").textContent=p;$("ml_u04_n_v").textContent=n;$("ml_u04_box").innerHTML=growthRateLabSvg(p,n)}
function halfplaneShiftSvg(c){c=Number(c);const X=v=>310+v*35,Y=v=>150-v*35;const x1=-5,y1=c+5,x2=5,y2=c-5;return `<svg viewBox="0 0 620 300"><defs><clipPath id="hpMini"><rect x="55" y="35" width="500" height="220" rx="12"/></clipPath></defs><rect x="55" y="35" width="500" height="220" rx="12" fill="#fbfdff" stroke="#dce5f2"/><g clip-path="url(#hpMini)"><polygon points="55,255 555,255 ${X(x2)},${Y(y2)} ${X(x1)},${Y(y1)}" fill="rgba(67,118,232,.16)"/><line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="#4777e8" stroke-width="4"/></g><line x1="60" y1="${Y(0)}" x2="550" y2="${Y(0)}" stroke="#8795aa"/><line x1="${X(0)}" y1="40" x2="${X(0)}" y2="250" stroke="#8795aa"/><text x="350" y="55" font-size="18" font-weight="800">x+y ≤ ${c}</text><text x="350" y="82" font-size="14">線是邊界；陰影才是解的集合</text></svg>`}
window.updateHalfplaneShift=v=>{$("ml_u06_v").textContent=v;$("ml_u06_box").innerHTML=halfplaneShiftSvg(Number(v))}
function circleOrbitSvg(a){a=Number(a)*Math.PI/180;const cx=280,cy=125,r=85,px=cx+r*Math.cos(a),py=cy-r*Math.sin(a);return `<svg viewBox="0 0 620 260"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#eef4ff" stroke="#4779ee" stroke-width="3"/><line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" stroke="#ff668c" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="6" fill="#2d60cc"/><circle cx="${px}" cy="${py}" r="7" fill="#ff668c"/><text x="390" y="80" font-size="20" font-weight="800">CP = r 永遠固定</text><text x="390" y="112" font-size="14">點 P 在圓上跑，半徑長度不變</text><text x="390" y="142" font-size="14">所以所有 P 都滿足同一個距離方程式</text></svg>`}
window.updateCircleOrbit=v=>{$("ml_u07_v").textContent=v+"°";$("ml_u07_box").innerHTML=circleOrbitSvg(Number(v))}
function lineCircleMiniSvg(x){x=Number(x);const r=5,d=Math.abs(x),rel=d>r?"相離：0個交點":d===r?"相切：1個交點":"相交：2個交點",cx=260,cy=125,s=22,lx=cx+x*s;return `<svg viewBox="0 0 620 260"><circle cx="${cx}" cy="${cy}" r="${r*s}" fill="#eef4ff" stroke="#4779ee" stroke-width="3"/><line x1="${lx}" y1="30" x2="${lx}" y2="230" stroke="#364d75" stroke-width="4"/><line x1="${cx}" y1="${cy}" x2="${lx}" y2="${cy}" stroke="#ff873b" stroke-width="5"/><rect x="${lx-7}" y="${cy-7}" width="14" height="14" fill="#fff" stroke="#ff873b"/><text x="405" y="75" font-size="20" font-weight="800">${rel}</text><text x="405" y="108" font-size="14">d=${d}，r=5</text><text x="405" y="140" font-size="14">${d===r?"切點半徑 ⟂ 切線":d<r?"穿過圓，所以有兩組解":"沒有交點，所以無實數解"}</text></svg>`}
window.updateLineCircleMini=v=>{$("ml_u08_v").textContent=v;$("ml_u08_box").innerHTML=lineCircleMiniSvg(Number(v))}
function divisionStructureSvg(a){a=Number(a);return `<svg viewBox="0 0 620 220"><rect x="65" y="55" width="180" height="95" rx="15" fill="#eef4ff"/><text x="95" y="105" font-size="24">(x+1)(x+${a})</text><path d="M265 100 L365 100" stroke="#5577d9" stroke-width="4"/><polygon points="365,100 350,91 350,109" fill="#5577d9"/><rect x="390" y="55" width="175" height="95" rx="15" fill="#eefaf5"/><text x="407" y="92" font-size="21">x² + ${a+1}x + ${a}</text><text x="407" y="122" font-size="14">乘回去，看係數怎麼來</text></svg>`}
window.updateDivisionStructure=v=>{$("ml_u09_v").textContent=v;$("ml_u09_box").innerHTML=divisionStructureSvg(Number(v))}
function remainderEvalSvg(a){a=Number(a);const val=a*a-3*a+2;return `<svg viewBox="0 0 620 220"><rect x="75" y="55" width="210" height="105" rx="17" fill="#eef4ff"/><text x="96" y="95" font-size="18">f(x)=x²−3x+2</text><text x="96" y="130" font-size="24">f(${a}) = ${val}</text><path d="M305 108 L390 108" stroke="#4f76dd" stroke-width="4"/><polygon points="390,108 375,99 375,117" fill="#4f76dd"/><text x="415" y="95" font-size="20" font-weight="800">${val===0?`x−${a} 是因式`:`餘式就是 ${val}`}</text><text x="415" y="125" font-size="14">不用真的做長除法</text></svg>`}
window.updateRemainderEval=v=>{$("ml_u10_v").textContent=v;$("ml_u10_box").innerHTML=remainderEvalSvg(Number(v))}
function vertexLabSvg(h,k){h=Number(h);k=Number(k);const X=x=>300+x*40,Y=y=>160-y*28,pts=[];for(let x=-5;x<=5;x+=.18){const y=(x-h)*(x-h)+k;if(y>-4&&y<5.2)pts.push(`${X(x)},${Y(y)}`)}return `<svg viewBox="0 0 620 320"><defs><clipPath id="vclip"><rect x="45" y="35" width="520" height="235" rx="12"/></clipPath></defs><rect x="45" y="35" width="520" height="235" rx="12" fill="#fbfdff" stroke="#d8e2ef"/><line x1="50" y1="${Y(0)}" x2="560" y2="${Y(0)}" stroke="#8795aa"/><line x1="${X(0)}" y1="40" x2="${X(0)}" y2="265" stroke="#8795aa"/><g clip-path="url(#vclip)"><polyline points="${pts.join(" ")}" fill="none" stroke="#4779ee" stroke-width="4"/></g><line x1="${X(h)}" y1="45" x2="${X(h)}" y2="260" stroke="#b9c7dc" stroke-dasharray="6 6"/><circle cx="${X(h)}" cy="${Y(k)}" r="8" fill="#ff668c"/><text x="${X(h)+10}" y="${Y(k)-10}" font-size="14">頂點 (${h},${k})</text><text x="390" y="55" font-size="16" font-weight="800">a 固定 = 1</text><text x="390" y="82" font-size="14">h 只管左右</text><text x="390" y="105" font-size="14">k 只管上下</text><text x="390" y="128" font-size="14">x、y 仍是變數</text></svg>`}
window.updateVertexLab=()=>{const h=Number($("ml_u11_h").value),k=Number($("ml_u11_k").value);$("ml_u11_h_v").textContent=h;$("ml_u11_k_v").textContent=k;$("ml_u11_box").innerHTML=vertexLabSvg(h,k)}
function multiplicityLabSvg(mode="double"){const dbl=mode==="double",X=x=>300+x*48,Y=y=>155-y*22,pts=[];for(let x=-4;x<=5;x+=.1){const y=dbl?(x-1)*(x-1)*(x+2):(x-1)*(x+2);if(y>-5.2&&y<5.2)pts.push(`${X(x)},${Y(y)}`)}return `<svg viewBox="0 0 620 300"><line x1="60" y1="${Y(0)}" x2="560" y2="${Y(0)}" stroke="#8795aa"/><line x1="${X(0)}" y1="35" x2="${X(0)}" y2="260" stroke="#8795aa"/><polyline points="${pts.join(" ")}" fill="none" stroke="#4779ee" stroke-width="4"/><circle cx="${X(1)}" cy="${Y(0)}" r="8" fill="#ff668c"/><text x="${X(1)+10}" y="${Y(0)-10}" font-size="14">x=1 ${dbl?"二重根":"一重根"}</text><text x="365" y="55" font-size="17" font-weight="800">${dbl?"(x−1)²(x+2)":"(x−1)(x+2)"}</text><text x="365" y="84" font-size="14">${dbl?"碰到 x 軸後折返":"穿過 x 軸"}</text><text x="365" y="108" font-size="14">${dbl?"兩側不換號":"兩側換號"}</text></svg>`}
window.setMultiplicityMode=(mode,btn)=>{document.querySelectorAll("#ml_u12_box + .modeButtons button,.modeButtons button").forEach(b=>b.classList.remove("on"));btn?.classList.add("on");$("ml_u12_box").innerHTML=multiplicityLabSvg(mode)}
function signProbeSvg(a,b,x){a=Number(a);b=Number(b);x=Number(x);const f=(x-a)*(x-b),X=v=>80+(v+5)*44;return `<svg viewBox="0 0 620 220"><line x1="80" y1="110" x2="520" y2="110" stroke="#8795aa" stroke-width="2"/><circle cx="${X(a)}" cy="110" r="8" fill="#3478f6"/><circle cx="${X(b)}" cy="110" r="8" fill="#3478f6"/><circle cx="${X(x)}" cy="110" r="9" fill="#ff668c"/><text x="${X(a)-8}" y="145" font-size="13">${a}</text><text x="${X(b)-8}" y="145" font-size="13">${b}</text><text x="330" y="50" font-size="20" font-weight="800">f(x)=(x+2)(x−2)</text><text x="330" y="78" font-size="16">x=${x} 時，f(x)=${f.toFixed(2)} → ${f>0?"正":f<0?"負":"0"}</text><text x="160" y="190" font-size="14">零點把數線切成區間，測一點就知道那一段的正負。</text></svg>`}
window.updateSignProbe=v=>{$("ml_u12_v").textContent=v;$("ml_u12_box").innerHTML=signProbeSvg(-2,2,Number(v))}


const QUAD={a:1,b:0,c:0,focus:"a"};
function unitDeepDive(unit=currentUnit){
 if(unit==="u11")return u11DeepDive();
 if(unit==="u12")return u12DeepDive();
 return ""
}
function u11DeepDive(){
 return `<section class="deepDive">
   <div class="sectionHead compactHead"><span class="num blue">A</span><div><h3>第三層｜一般式 a、b、c：一次只研究一個</h3><p>不是三個滑桿一起亂拖。先選現在要研究誰，再用同一支滑桿看它造成什麼變化。</p></div></div>
   <div class="roleLegend">
     <span class="var"><b>x</b> 輸入／未知位置</span><span class="var"><b>y</b> 輸出／結果</span>
     <span><b>a</b> 開口與寬窄</span><span><b>b</b> 和 a 一起移動對稱軸</span><span><b>c</b> y 軸交點</span>
   </div>
   <div class="microLab quadraticGeneralLab">
     <div class="modeButtons parameterMode"><button class="on" onclick="setQuadFocus('a',this)">只研究 a</button><button onclick="setQuadFocus('b',this)">只研究 b</button><button onclick="setQuadFocus('c',this)">只研究 c</button></div>
     <div id="quadGeneralBox">${quadraticGeneralSvg()}</div>
     <label class="heroSlider"><span id="qgLabel">a</span> = <span id="qgValue">1</span><input id="qgRange" type="range" min="-4" max="4" step=".5" value="1" oninput="updateQuadFocus(this.value)"></label>
     <div id="qgExplain" class="plainExplain" data-voice><b>a：</b>只管開口方向與寬窄；不要把 b 誤認成開口大小。</div>
   </div>
   <details class="conceptExpansion" open>
     <summary>📐 為什麼拋物線也會碰到「距離公式／畢氏定理」？</summary>
     <div class="expansionBody">
       <div class="plainExplain" data-voice><b>先分清楚：</b>高中二次函數平常理解 y=a(x−h)²+k，最簡單的方法是從 y=x² 做伸縮與平移；它不是像圓方程式那樣直接從畢氏定理生出來。若改用拋物線的幾何定義「到焦點與準線等距」推導，才會用到距離公式，而距離公式就是畢氏定理的座標版。</div>
       <div id="focusDirectrixBox">${focusDirectrixSvg(2)}</div>
       <label class="labSlider">拖圓錐曲線上的 x = <span id="fdx">2</span><input type="range" min="-4" max="4" step=".5" value="2" oninput="updateFocusDirectrix(this.value)"></label>
     </div>
   </details>
   <details class="conceptExpansion">
     <summary>↔ 延伸｜左右開口要不要學？</summary>
     <div class="expansionBody">
       <div class="plainExplain" data-voice><b>核心課程先不用把它和二次函數混在一起。</b> y=f(x) 的二次函數是上下開口；左右開口仍是拋物線，但一般不是單一 y=f(x)。先當成幾何延伸，知道概念即可。</div>
       <div id="sideParaBox">${sideParabolaSvg(1)}</div>
       <label class="labSlider">方向／寬窄係數 A = <span id="sideA">1</span><input type="range" min="-3" max="3" step=".5" value="1" oninput="updateSideParabola(this.value)"></label>
     </div>
   </details>
   <div class="sectionHead compactHead"><span class="num amber">文</span><div><h3>生活題怎麼從文字變成二次式？</h3><p>這不是算式技巧，是翻譯技巧。</p></div></div>
   <div class="modelingFlow">
     <div><b>1. 先問誰會變？</b><p>把時間、價格、長度等設成 x，寫清楚單位。</p></div>
     <div><b>2. 其他量用 x 表示</b><p>固定總量常變成「總量−x」。</p></div>
     <div><b>3. 找關係</b><p>面積＝長×寬；收益＝價格×數量；高度＝時間的二次模型。</p></div>
     <div><b>4. 選最好用的形式</b><p>給頂點用頂點式；給兩個零點用因式式；給係數才用一般式。</p></div>
   </div>
   <div class="workedScenario" data-voice><b>例｜40公尺燈條圍長方形</b><p>設寬 x 公尺。因為 2(長+寬)=40，所以長=20−x。面積 A=x(20−x)=−x²+20x。這時才去找頂點，得到 x=10 時面積最大。重點不是背 A 的公式，而是先把文字翻成「長=20−x」。</p></div>
 </section>`
}
function setQuadFocus(focus,btn){
 QUAD.focus=focus;document.querySelectorAll(".parameterMode button").forEach(b=>b.classList.remove("on"));btn?.classList.add("on");
 const ranges={a:{min:-3,max:3,step:.5},b:{min:-4,max:4,step:1},c:{min:-4,max:4,step:1}},r=ranges[focus],el=$("qgRange");
 el.min=r.min;el.max=r.max;el.step=r.step;el.value=QUAD[focus];$("qgLabel").textContent=focus;$("qgValue").textContent=QUAD[focus];renderQuadGeneral()
}
function updateQuadFocus(v){let n=Number(v);if(QUAD.focus==="a"&&Math.abs(n)<.001){n=.5;$("qgRange").value=n}QUAD[QUAD.focus]=n;$("qgValue").textContent=n;renderQuadGeneral()}
function renderQuadGeneral(){
 $("quadGeneralBox").innerHTML=quadraticGeneralSvg();
 const e={a:"a 只管開口方向與寬窄；|a| 越大越窄。",b:"b 不管開口大小；它會和 a 一起改變對稱軸 x=−b/(2a)。",c:"c 是 x=0 時的 y，所以就是 y 軸交點 (0,c)。"}[QUAD.focus];
 $("qgExplain").innerHTML=`<b>${QUAD.focus}：</b>${e}`
}
function quadraticGeneralSvg(){
 let {a,b,c}=QUAD;if(Math.abs(a)<.01)a=.5;const X=x=>205+x*25,Y=y=>165-y*21,pts=[];
 for(let x=-6;x<=6;x+=.12){const y=a*x*x+b*x+c;if(y>-6&&y<6)pts.push(`${X(x)},${Y(y)}`)}
 const axis=-b/(2*a),vy=a*axis*axis+b*axis+c,disc=b*b-4*a*c,roots=disc>=0?[(-b-Math.sqrt(disc))/(2*a),(-b+Math.sqrt(disc))/(2*a)]:[];
 return `<svg viewBox="0 0 620 340"><defs><clipPath id="qgclip"><rect x="45" y="35" width="325" height="245" rx="12"/></clipPath></defs><rect x="45" y="35" width="325" height="245" rx="12" fill="#fbfdff" stroke="#d8e2ef"/><line x1="50" y1="${Y(0)}" x2="365" y2="${Y(0)}" stroke="#8795aa"/><line x1="${X(0)}" y1="40" x2="${X(0)}" y2="275" stroke="#8795aa"/><g clip-path="url(#qgclip)"><polyline points="${pts.join(" ")}" fill="none" stroke="#4779ee" stroke-width="4"/><line x1="${X(axis)}" y1="40" x2="${X(axis)}" y2="275" stroke="#b3c0d4" stroke-dasharray="6 5"/></g><circle cx="${X(0)}" cy="${Y(c)}" r="7" fill="#36a46f"/>${roots.filter(r=>r>=-6&&r<=6).map(r=>`<circle cx="${X(r)}" cy="${Y(0)}" r="7" fill="#ff668c"/>`).join("")}<circle cx="${X(axis)}" cy="${Y(vy)}" r="7" fill="#7c67ef"/>
 <rect x="392" y="48" width="185" height="196" rx="15" fill="#f7f9fd" stroke="#dce5f2"/>
 <text x="408" y="76" font-size="15" font-weight="800">y=${a}x² ${b>=0?"+":""}${b}x ${c>=0?"+":""}${c}</text>
 <text x="408" y="105" font-size="13">a=${a} → 開口</text>
 <text x="408" y="130" font-size="13">b=${b} → 軸 x=${axis.toFixed(2)}</text>
 <text x="408" y="155" font-size="13">c=${c} → y截距 (0,${c})</text>
 <text x="408" y="180" font-size="13">x截距：${disc<0?"無":roots.map(r=>r.toFixed(2)).join("、")}</text>
 <text x="408" y="205" font-size="13">頂點：(${axis.toFixed(2)},${vy.toFixed(2)})</text>
 <text x="408" y="230" font-size="11" fill="#718097">一次只拖一個係數，觀察它的工作。</text></svg>`
}
function focusDirectrixSvg(x){
 x=Number(x);const p=1,y=x*x/4,F={x:0,y:1},D={x:x,y:-1},X=v=>275+v*45,Y=v=>155-v*34,pts=[];
 for(let t=-4.5;t<=4.5;t+=.12){pts.push(`${X(t)},${Y(t*t/4)}`)}
 const pf=Math.sqrt(x*x+(y-p)*(y-p)),pd=y+p;
 return `<svg viewBox="0 0 620 340"><line x1="65" y1="${Y(0)}" x2="550" y2="${Y(0)}" stroke="#8795aa"/><line x1="${X(0)}" y1="45" x2="${X(0)}" y2="280" stroke="#8795aa"/><polyline points="${pts.join(" ")}" fill="none" stroke="#4779ee" stroke-width="4"/><line x1="65" y1="${Y(-1)}" x2="550" y2="${Y(-1)}" stroke="#d36a82" stroke-width="3" stroke-dasharray="7 6"/><text x="440" y="${Y(-1)-8}" font-size="13" fill="#b34e68">準線 y=−1</text><circle cx="${X(0)}" cy="${Y(1)}" r="7" fill="#36a46f"/><text x="${X(0)+10}" y="${Y(1)-10}" font-size="13">焦點 F(0,1)</text><circle cx="${X(x)}" cy="${Y(y)}" r="7" fill="#7c67ef"/><text x="${X(x)+8}" y="${Y(y)-8}" font-size="13">P(${x},${y.toFixed(2)})</text><line x1="${X(x)}" y1="${Y(y)}" x2="${X(0)}" y2="${Y(1)}" stroke="#36a46f" stroke-width="3"/><line x1="${X(x)}" y1="${Y(y)}" x2="${X(x)}" y2="${Y(-1)}" stroke="#ff873b" stroke-width="3"/><rect x="380" y="185" width="180" height="88" rx="12" fill="#fff7e8" stroke="#efd59f"/><text x="395" y="211" font-size="13">PF = ${pf.toFixed(2)}</text><text x="395" y="235" font-size="13">P到準線距離 = ${pd.toFixed(2)}</text><text x="395" y="258" font-size="12" font-weight="800">兩距離相等 → 拋物線</text><text x="72" y="45" font-size="14" fill="#576782">PF 用距離公式（畢氏定理）；到準線是垂直距離</text></svg>`
}
window.updateFocusDirectrix=v=>{$("fdx").textContent=v;$("focusDirectrixBox").innerHTML=focusDirectrixSvg(Number(v))}
function sideParabolaSvg(A){
 A=Number(A);const X=x=>205+x*27,Y=y=>155-y*31,pts=[];
 if(Math.abs(A)>.001){for(let y=-3.5;y<=3.5;y+=.1){const x=A*y*y;if(x>-5.5&&x<5.5)pts.push(`${X(x)},${Y(y)}`)}}
 return `<svg viewBox="0 0 620 330"><rect x="45" y="35" width="325" height="235" rx="12" fill="#fbfdff" stroke="#d8e2ef"/><line x1="50" y1="${Y(0)}" x2="365" y2="${Y(0)}" stroke="#8795aa"/><line x1="${X(0)}" y1="40" x2="${X(0)}" y2="265" stroke="#8795aa"/>${Math.abs(A)>.001?`<polyline points="${pts.join(" ")}" fill="none" stroke="#4779ee" stroke-width="4"/>`:`<line x1="${X(0)}" y1="45" x2="${X(0)}" y2="260" stroke="#4779ee" stroke-width="5"/>`}<circle cx="${X(0)}" cy="${Y(0)}" r="7" fill="#ff668c"/>
 <rect x="395" y="55" width="180" height="150" rx="15" fill="#eef4ff" stroke="#d8e4fb"/>
 <text x="412" y="83" font-size="17" font-weight="800">x=${A}y²</text>
 <text x="412" y="111" font-size="14">${A>0?"向右開":A<0?"向左開":"A=0：不是拋物線"}</text>
 <text x="412" y="139" font-size="13">頂點固定在 (0,0)</text>
 <text x="412" y="165" font-size="13">左右開口是幾何延伸</text>
 <text x="412" y="190" font-size="12">通常不當作單一 y=f(x)</text></svg>`
}
window.updateSideParabola=v=>{$("sideA").textContent=v;$("sideParaBox").innerHTML=sideParabolaSvg(Number(v))}
function u12DeepDive(){
 return `<section class="deepDive">
   <div class="sectionHead compactHead"><span class="num blue">根</span><div><h3>三次式怎麼拆？先找到一個根，再降階</h3><p>把「解方程式」看成「找 x 軸交點」。</p></div></div>
   <div class="factorFlow">
     <div><b>原式</b><span>x³−6x²+11x−6=0</span></div><i>→</i>
     <div><b>試簡單根</b><span>f(1)=0</span></div><i>→</i>
     <div><b>提出因式</b><span>(x−1)(x²−5x+6)</span></div><i>→</i>
     <div><b>再分解</b><span>(x−1)(x−2)(x−3)</span></div><i>→</i>
     <div><b>根</b><span>1、2、3</span></div>
   </div>
   <div class="plainExplain" data-voice><b>一句話：</b>根 r 是解，所以會對應因式 (x−r)。三次式不用硬解；先找到一個根，就可以除掉一個一次因式，把問題降成你熟悉的二次式。</div>
   <div class="sectionHead compactHead"><span class="num amber">區</span><div><h3>多項式不等式：不是看整條式子，是逐因式看每個區間</h3><p>根先切區間，各因式在同一區間內正負不變。</p></div></div>
   <div class="signFactorTable">
     <div class="head">區間</div><div class="head">x+2</div><div class="head">x−1</div><div class="head">x−3</div><div class="head">乘積</div>
     <div>x&lt;−2</div><div>−</div><div>−</div><div>−</div><div class="neg">−</div>
     <div>−2&lt;x&lt;1</div><div>＋</div><div>−</div><div>−</div><div class="pos">＋</div>
     <div>1&lt;x&lt;3</div><div>＋</div><div>＋</div><div>−</div><div class="neg">−</div>
     <div>x&gt;3</div><div>＋</div><div>＋</div><div>＋</div><div class="pos">＋</div>
   </div>
   <div class="sectionHead compactHead"><span class="num green">文</span><div><h3>應用題怎麼列式、怎麼拆？</h3><p>先抓「臨界值」，再把每一個臨界值翻成因式。</p></div></div>
   <div class="modelingFlow">
     <div><b>1. 定義 x</b><p>先寫 x 代表價格、時間、濃度或其他可變量。</p></div>
     <div><b>2. 找臨界值</b><p>文字說「x=2 時剛好為0」→ 根2 → 因式(x−2)。</p></div>
     <div><b>3. 組成乘積</b><p>三個臨界值2、5、8 → a(x−2)(x−5)(x−8)。</p></div>
     <div><b>4. 翻回條件</b><p>題目說有效／獲利／正值 → 解 f(x)>0；低於標準 → 解 f(x)<0。</p></div>
   </div>
   <div class="workedScenario" data-voice><b>例｜三個臨界點的模型</b><p>若模型在 x=2、5、8 時都剛好為0，且最高次係數為正，可先寫 f(x)=a(x−2)(x−5)(x−8)，a&gt;0。根把數線切成四段；從最右側正區開始，三個一重根依序換號，就能讀出 f(x)&gt;0 的區間是 2&lt;x&lt;5 或 x&gt;8。</p></div>
 </section>`
}

function renderVisual(type){
 if(type==="absolute_value")return absVisual();
 if(type==="amgm")return amgmVisual();
 if(type==="growth")return growthVisual();
 if(type==="slope")return slopeVisual();
 if(type==="line_master")return lineMasterVisual();
 if(type==="line_system")return lineSystemVisual();
 if(type==="halfplane")return halfplaneVisual();
 if(type==="circle")return circleVisual();
 if(type==="line_circle")return lineCircleVisual();
 if(type==="parabola")return parabolaVisual();
 if(type==="signchart")return signVisual();
 if(type==="remainder")return remainderVisual();
 if(type==="division")return divisionVisual();
 return numberSetVisual();
}
function numberSetVisual(){return `<svg viewBox="0 0 620 280"><rect x="35" y="30" width="550" height="210" rx="30" fill="#eef3ff" stroke="#7189e6" stroke-width="3"/><rect x="85" y="55" width="430" height="160" rx="28" fill="#faf3ff" stroke="#a685df" stroke-width="3"/><rect x="135" y="80" width="315" height="110" rx="25" fill="#effaf5" stroke="#64b68e" stroke-width="3"/><rect x="190" y="105" width="180" height="60" rx="25" fill="#fff6d9" stroke="#d7aa36" stroke-width="3"/><text x="55" y="60" font-size="22" font-weight="700">實數 R</text><text x="100" y="88" font-size="19">有理數 Q</text><text x="150" y="112" font-size="18">整數 Z</text><text x="210" y="142" font-size="18">自然數 N</text><text x="455" y="145" font-size="18" fill="#8e4d9f">√2、π…</text><text x="420" y="170" font-size="14" fill="#8e4d9f">無理數</text></svg>`}
function amgmVisual(){return `<div id="amgmBox">${amgmSvg(10)}</div><div class="controlRow"><label>a = <span class="valueBadge" id="aVal">10</span></label><input type="range" min="1" max="19" value="10" oninput="updateAMGM(this.value)"><span class="valueBadge" id="prodVal">ab=100</span></div>`}
function amgmSvg(a){a=Number(a);const b=20-a,p=a*b,x=60+a*25,y=230-p*1.5;return `<svg viewBox="0 0 620 270"><line x1="55" y1="230" x2="570" y2="230" stroke="#8da0bf" stroke-width="2"/><line x1="60" y1="240" x2="60" y2="45" stroke="#8da0bf" stroke-width="2"/><path d="M85 202 Q310 55 535 202" fill="none" stroke="#4877ea" stroke-width="5"/><circle cx="${x}" cy="${y}" r="8" fill="#ef6687"/><line x1="${x}" y1="${y}" x2="${x}" y2="230" stroke="#ef6687" stroke-dasharray="5 5"/><text x="330" y="35" font-size="18" font-weight="700">a+b=20</text><text x="${Math.min(x+12,470)}" y="${Math.max(y-8,45)}" font-size="15">a=${a}, b=${b}, ab=${p}</text><text x="235" y="258" font-size="15">最平衡時乘積最高</text></svg>`}
window.updateAMGM=v=>{const a=Number(v),b=20-a,p=a*b;$("aVal").textContent=a;$("prodVal").textContent="ab="+p;$("amgmBox").innerHTML=amgmSvg(a)}
function absVisual(){return `<div id="absBox">${absSvg(3,2)}</div><div class="controlRow"><label>中心 a <span class="valueBadge" id="absA">3</span></label><input type="range" min="-2" max="6" value="3" oninput="updateAbs()"><label>半徑 r <span class="valueBadge" id="absR">2</span></label><input id="absRange" type="range" min="1" max="4" value="2" oninput="updateAbs()"></div>`}
function absSvg(a,r){let x=v=>70+(v+4)*50;return `<svg viewBox="0 0 620 260"><line x1="60" y1="135" x2="560" y2="135" stroke="#66768d" stroke-width="2"/>${[-4,-3,-2,-1,0,1,2,3,4,5,6].map(v=>`<line x1="${x(v)}" y1="126" x2="${x(v)}" y2="144" stroke="#66768d"/><text x="${x(v)-5}" y="165" font-size="13">${v}</text>`).join("")}<line x1="${x(a-r)}" y1="135" x2="${x(a+r)}" y2="135" stroke="#ff6f9a" stroke-width="10" stroke-linecap="round"/><circle cx="${x(a-r)}" cy="135" r="8" fill="#fff" stroke="#ff6f9a" stroke-width="3"/><circle cx="${x(a+r)}" cy="135" r="8" fill="#fff" stroke="#ff6f9a" stroke-width="3"/><circle cx="${x(a)}" cy="135" r="7" fill="#3478f6"/><text x="${x(a)-28}" y="95" font-size="15">中心 ${a}</text><text x="155" y="225" font-size="20" font-weight="700">|x−${a}| &lt; ${r}  ⇔  ${a-r} &lt; x &lt; ${a+r}</text></svg>`}
window.updateAbs=()=>{const ranges=[...document.querySelectorAll('.visualBox input[type=range]')],a=Number(ranges[0].value),r=Number($("absRange").value);$("absA").textContent=a;$("absR").textContent=r;$("absBox").innerHTML=absSvg(a,r)}
function growthVisual(){return `<div id="growthBox">${growthSvg(5)}</div><div class="controlRow"><label>週數 <span class="valueBadge" id="weekVal">5</span></label><input type="range" min="0" max="10" value="5" oninput="updateGrowth(this.value)"><span class="valueBadge" id="growthVal"></span></div>`}
function growthSvg(n){const lin=100+20*n,exp=Math.round(100*Math.pow(1.2,n)),w1=Math.min(450,lin*1.6),w2=Math.min(450,exp*1.6);return `<svg viewBox="0 0 620 260"><text x="45" y="55" font-size="16">起點都是 100</text><text x="45" y="105" font-size="14">固定 +20</text><rect x="150" y="82" width="${w1}" height="28" rx="8" fill="#94a3b8"/><text x="${Math.min(155+w1,550)}" y="102" font-size="14">${lin}</text><text x="45" y="170" font-size="14">每週 ×1.2</text><rect x="150" y="147" width="${w2}" height="28" rx="8" fill="#4d7bf0"/><text x="${Math.min(155+w2,550)}" y="167" font-size="14">${exp}</text><text x="210" y="230" font-size="18" font-weight="700">週數 ${n}：百分比成長會越拉越開</text></svg>`}
window.updateGrowth=v=>{const n=Number(v);$("weekVal").textContent=n;$("growthBox").innerHTML=growthSvg(n);$("growthVal").textContent="1.2^"+n}
function slopeVisual(){return `<div id="slopeBox">${slopeSvg(2,4)}</div><div class="controlRow"><label>Δy <span class="valueBadge" id="riseVal">2</span></label><input id="riseRange" type="range" min="-4" max="5" value="2" oninput="updateSlope()"><label>Δx <span class="valueBadge" id="runVal">4</span></label><input id="runRange" type="range" min="1" max="6" value="4" oninput="updateSlope()"><span class="valueBadge" id="mVal">m=0.5</span></div>`}
function slopeSvg(rise,run){const x1=140,y1=205,x2=140+run*60,y2=205-rise*28;return `<svg viewBox="0 0 620 280"><line x1="70" y1="220" x2="560" y2="220" stroke="#8da0bf"/><line x1="95" y1="245" x2="95" y2="45" stroke="#8da0bf"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3478f6" stroke-width="5"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}" stroke="#ef6687" stroke-width="3"/><line x1="${x2}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ef6687" stroke-width="3"/><text x="${(x1+x2)/2-18}" y="${y1+22}" font-size="14">Δx=${run}</text><text x="${x2+8}" y="${(y1+y2)/2}" font-size="14">Δy=${rise}</text><text x="215" y="45" font-size="20" font-weight="700">m = ${rise}/${run} = ${(rise/run).toFixed(2)}</text></svg>`}
window.updateSlope=()=>{const r=Number($("riseRange").value),run=Number($("runRange").value);$("riseVal").textContent=r;$("runVal").textContent=run;$("mVal").textContent="m="+(r/run).toFixed(2);$("slopeBox").innerHTML=slopeSvg(r,run)}
function halfplaneVisual(){return `<svg viewBox="0 0 620 280"><polygon points="120,220 120,70 500,220" fill="#dfe8ff"/><line x1="120" y1="70" x2="500" y2="220" stroke="#3478f6" stroke-width="4"/><line x1="65" y1="220" x2="565" y2="220" stroke="#8190a8"/><line x1="120" y1="245" x2="120" y2="40" stroke="#8190a8"/><circle cx="220" cy="190" r="7" fill="#2bb67c"/><text x="233" y="194" font-size="14">(測試點)</text><text x="230" y="135" font-size="20" font-weight="700">符合 x+y≤6 的區域</text></svg>`}

function circleVisual(){
 return `<div class="circleDemoWrap">
   <div id="circleBox">${circleIntroSvg(1,-1,4,35)}</div>
   <div class="fourControls">
     <label>圓心 h=<span class="valueBadge" id="ciH">1</span><input id="ci_h" type="range" min="-4" max="4" step="1" value="1" oninput="updateCircleIntro()"></label>
     <label>圓心 k=<span class="valueBadge" id="ciK">-1</span><input id="ci_k" type="range" min="-4" max="4" step="1" value="-1" oninput="updateCircleIntro()"></label>
     <label>半徑 r=<span class="valueBadge" id="ciR">4</span><input id="ci_r" type="range" min="2" max="5" step="1" value="4" oninput="updateCircleIntro()"></label>
     <label>圓上點位置 θ=<span class="valueBadge" id="ciA">35°</span><input id="ci_a" type="range" min="10" max="340" step="5" value="35" oninput="updateCircleIntro()"></label>
   </div>
   <div class="feedback" data-voice><b>看圖講人話：</b>藍點 P 在圓上亂跑，但它到圓心 C 的距離都固定是 r。把水平差、垂直差畫成直角三角形，再用畢氏定理，圓方程式就自己長出來了。</div>
 </div>`
}
function circleIntroSvg(h,k,r,deg){
 const W=620,H=330,cx=310,cy=165,s=24,X=x=>cx+x*s,Y=y=>cy-y*s;
 const rad=deg*Math.PI/180, px=h+r*Math.cos(rad), py=k+r*Math.sin(rad);
 const xPart=`x ${h>=0?"− "+h:"＋ "+Math.abs(h)}`;
 const yPart=`y ${k>=0?"− "+k:"＋ "+Math.abs(k)}`;
 const eq1=`CP² = (${xPart})² + (${yPart})²`;
 const eq2=`(${xPart})² + (${yPart})² = ${r*r}`;
 const labx=(px+h)/2, laby=(py+k)/2;
 return `<svg viewBox="0 0 ${W} ${H}">
   <rect x="18" y="18" width="${W-36}" height="${H-36}" rx="18" fill="#fff"/>
   <g opacity=".85">
     ${Array.from({length:13},(_,i)=>`<line x1="${X(-6+i)}" y1="${Y(-6)}" x2="${X(-6+i)}" y2="${Y(6)}" stroke="#eef2f7"/>`).join("")}
     ${Array.from({length:13},(_,i)=>`<line x1="${X(-6)}" y1="${Y(-6+i)}" x2="${X(6)}" y2="${Y(-6+i)}" stroke="#eef2f7"/>`).join("")}
   </g>
   <line x1="${X(-6)}" y1="${Y(0)}" x2="${X(6)}" y2="${Y(0)}" stroke="#8aa0bc" stroke-width="2"/>
   <line x1="${X(0)}" y1="${Y(-6)}" x2="${X(0)}" y2="${Y(6)}" stroke="#8aa0bc" stroke-width="2"/>
   <circle cx="${X(h)}" cy="${Y(k)}" r="${r*s}" fill="rgba(83,137,255,.10)" stroke="#4d7cff" stroke-width="3"/>
   <line x1="${X(h)}" y1="${Y(k)}" x2="${X(px)}" y2="${Y(py)}" stroke="#ff6a8a" stroke-width="4"/>
   <line x1="${X(h)}" y1="${Y(k)}" x2="${X(px)}" y2="${Y(k)}" stroke="#59b57a" stroke-width="3" stroke-dasharray="7 6"/>
   <line x1="${X(px)}" y1="${Y(k)}" x2="${X(px)}" y2="${Y(py)}" stroke="#f7a83a" stroke-width="3" stroke-dasharray="7 6"/>
   <rect x="${X(px)-8}" y="${Y(k)-8}" width="16" height="16" fill="#fff" stroke="#8aa0bc"/>
   <circle cx="${X(h)}" cy="${Y(k)}" r="6" fill="#1f5fd5"/>
   <circle cx="${X(px)}" cy="${Y(py)}" r="7" fill="#ff5c87"/>
   <text x="${X(h)+8}" y="${Y(k)-8}" font-size="15" fill="#1f5fd5">C(${h},${k})</text>
   <text x="${X(px)+10}" y="${Y(py)-10}" font-size="15" fill="#d93b67">P(x,y)</text>
   <text x="${X(labx)+8}" y="${Y(laby)-8}" font-size="15" fill="#d93b67">半徑 CP = r = ${r}</text>
   <text x="${X((h+px)/2)}" y="${Y(k)+20}" font-size="14" fill="#4d7c56">x−h</text>
   <text x="${X(px)+10}" y="${Y((k+py)/2)}" font-size="14" fill="#c27a17">y−k</text>
   <rect x="394" y="42" width="188" height="98" rx="16" fill="#eef5ff" stroke="#d7e5ff"/>
   <text x="408" y="68" font-size="18" font-weight="700" fill="#3157ad">為什麼有平方？</text>
   <text x="408" y="95" font-size="14" fill="#405066">因為距離公式來自畢氏定理：</text>
   <text x="408" y="118" font-size="16" fill="#254a95">${eq1}</text>
   <rect x="394" y="160" width="188" height="120" rx="16" fill="#fff7e8" stroke="#f0d18a"/>
   <text x="408" y="186" font-size="18" font-weight="700" fill="#8b6100">圓的方程式怎麼來？</text>
   <text x="408" y="212" font-size="14" fill="#5c4a1b">圓上每一點都滿足 CP = r</text>
   <text x="408" y="236" font-size="16" fill="#7a5600">${eq2}</text>
   <text x="408" y="258" font-size="13" fill="#6b5846">不是背模板，而是「半徑都一樣」</text>
   <text x="58" y="42" font-size="19" font-weight="700" fill="#2b4167">圓方程式＝把『距離固定』翻成代數</text>
   <text x="58" y="66" font-size="14" fill="#66758d">P 在圓上怎麼動，CP 都維持同一個長度。</text>
 </svg>`
}
window.updateCircleIntro=()=>{
 const h=Number($("ci_h").value),k=Number($("ci_k").value),r=Number($("ci_r").value),a=Number($("ci_a").value);
 $("ciH").textContent=h;$("ciK").textContent=k;$("ciR").textContent=r;$("ciA").textContent=a+"°";
 $("circleBox").innerHTML=circleIntroSvg(h,k,r,a)
}

function lineCircleVisual(){
 return `<div class="circleLineWrap">
   <div id="lcdBox">${lineCircleSceneSvg(6)}</div>
   <div class="threeControls">
     <label>直線位置 x=<span class="valueBadge" id="lcdX">6</span><input id="lcd_x" type="range" min="-8" max="8" step="1" value="6" oninput="updateLCDemo()"></label>
     <label>提示：拖到 x=5 看相切；拖到 x=3 看相交兩點；拖到 x=6 看相離。</label>
   </div>
   <div class="feedback" data-voice><b>本章最重要的圖：</b>從圓心 O 到直線可以畫很多條線段，但只有和直線垂直的最短那條才叫距離 d。相切時，這條最短線段同時是一條半徑，所以會有「切點半徑垂直切線」。</div>
 </div>`
}
function lineCircleSceneSvg(xv){
 const W=620,H=340,cx=255,cy=175,s=24,r=5,X=x=>cx+x*s,Y=y=>cy-y*s, lx=X(xv);
 const inside=Math.abs(xv)<r, tangent=Math.abs(xv)===r;
 const root=inside?Math.sqrt(r*r-xv*xv):0;
 const st=inside?"相交兩點":tangent?"相切一點":"相離";
 const info=inside?`d = ${Math.abs(xv)} < r = 5，所以直線穿過圓。<tspan x="400" dy="22">交點有 2 個，聯立會有 2 組解。</tspan>`:
               tangent?`d = ${Math.abs(xv)} = r = 5，所以剛好切一點。<tspan x="400" dy="22">相切 ↔ 1個交點 ↔ 1組解。</tspan>`:
               `d = ${Math.abs(xv)} > r = 5，所以完全碰不到。<tspan x="400" dy="22">相離 ↔ 沒有交點 ↔ 0組解。</tspan>`;
 return `<svg viewBox="0 0 ${W} ${H}">
   <rect x="18" y="18" width="${W-36}" height="${H-36}" rx="18" fill="#fff"/>
   <g opacity=".85">
    ${Array.from({length:13},(_,i)=>`<line x1="${X(-6+i)}" y1="${Y(-6)}" x2="${X(-6+i)}" y2="${Y(6)}" stroke="#eef2f7"/>`).join("")}
    ${Array.from({length:13},(_,i)=>`<line x1="${X(-6)}" y1="${Y(-6+i)}" x2="${X(6)}" y2="${Y(-6+i)}" stroke="#eef2f7"/>`).join("")}
   </g>
   <line x1="${X(-6)}" y1="${Y(0)}" x2="${X(6)}" y2="${Y(0)}" stroke="#8aa0bc" stroke-width="2"/>
   <line x1="${X(0)}" y1="${Y(-6)}" x2="${X(0)}" y2="${Y(6)}" stroke="#8aa0bc" stroke-width="2"/>
   <circle cx="${X(0)}" cy="${Y(0)}" r="${r*s}" fill="rgba(83,137,255,.10)" stroke="#4d7cff" stroke-width="3"/>
   <line x1="${lx}" y1="${Y(-6)}" x2="${lx}" y2="${Y(6)}" stroke="#394f78" stroke-width="4"/>
   <text x="${lx+8}" y="${Y(5.45)}" font-size="15" fill="#394f78">直線 x=${xv}</text>

   <!-- several segments from center to the line -->
   <line x1="${X(0)}" y1="${Y(0)}" x2="${lx}" y2="${Y(4.1)}" stroke="#d3dae6" stroke-width="3"/>
   <line x1="${X(0)}" y1="${Y(0)}" x2="${lx}" y2="${Y(2.2)}" stroke="#d3dae6" stroke-width="3"/>
   <line x1="${X(0)}" y1="${Y(0)}" x2="${lx}" y2="${Y(-3.4)}" stroke="#d3dae6" stroke-width="3"/>

   <!-- shortest perpendicular distance -->
   <line x1="${X(0)}" y1="${Y(0)}" x2="${lx}" y2="${Y(0)}" stroke="#ff8a3d" stroke-width="5"/>
   <rect x="${lx-8}" y="${Y(0)-8}" width="16" height="16" fill="#fff" stroke="#ff8a3d"/>
   <text x="${(X(0)+lx)/2-8}" y="${Y(0)-10}" font-size="15" fill="#cc5a00">最短距離 d = ${Math.abs(xv)}</text>
   <text x="${(X(0)+lx)/2-8}" y="${Y(0)+18}" font-size="13" fill="#7b6149">因為 O 到直線的這條線段 ⟂ 直線</text>

   <!-- separate radius not overlapping -->
   <line x1="${X(0)}" y1="${Y(0)}" x2="${X(3.2)}" y2="${Y(3.84)}" stroke="#39a869" stroke-width="4"/>
   <circle cx="${X(3.2)}" cy="${Y(3.84)}" r="5" fill="#39a869"/>
   <text x="${X(1.8)}" y="${Y(2.3)}" font-size="15" fill="#20794a">另一條半徑 r = 5</text>

   ${inside?`<circle cx="${X(xv)}" cy="${Y(root)}" r="6" fill="#ff5b87"/><circle cx="${X(xv)}" cy="${Y(-root)}" r="6" fill="#ff5b87"/><text x="${X(xv)+10}" y="${Y(root)-8}" font-size="14" fill="#c23563">(${xv},${root.toFixed(0)})</text><text x="${X(xv)+10}" y="${Y(-root)+18}" font-size="14" fill="#c23563">(${xv},${(-root).toFixed(0)})</text>`:""}
   ${tangent?`<circle cx="${X(xv)}" cy="${Y(0)}" r="7" fill="#ff5b87"/><text x="${X(xv)+10}" y="${Y(0)-10}" font-size="14" fill="#c23563">切點 T(${xv},0)</text><text x="${X(-0.7)}" y="${Y(1.1)}" font-size="14" fill="#cc5a00">OT 是半徑，也是圓心到切線的距離</text><text x="${X(-0.7)}" y="${Y(.35)}" font-size="14" fill="#cc5a00">而且 OT ⟂ 切線</text>`:""}

   <circle cx="${X(0)}" cy="${Y(0)}" r="6" fill="#1f5fd5"/>
   <text x="${X(0)+8}" y="${Y(0)-10}" font-size="15" fill="#1f5fd5">O(0,0)</text>

   <rect x="390" y="44" width="190" height="118" rx="16" fill="#eef5ff" stroke="#d7e5ff"/>
   <text x="404" y="68" font-size="18" font-weight="700" fill="#3157ad">何謂距離？</text>
   <text x="404" y="94" font-size="14" fill="#44546f">從圓心到直線能畫很多條線段，</text>
   <text x="404" y="114" font-size="14" fill="#44546f">只有『和直線垂直』的那條最短，</text>
   <text x="404" y="134" font-size="14" fill="#44546f">所以它才叫距離 d。</text>

   <rect x="390" y="182" width="190" height="118" rx="16" fill="#fff7e8" stroke="#f0d18a"/>
   <text x="404" y="206" font-size="18" font-weight="700" fill="#8b6100">${st}</text>
   <text x="404" y="232" font-size="14" fill="#5c4a1b">${info}</text>

   <text x="56" y="44" font-size="19" font-weight="700" fill="#2b4167">直線與圓：先比 d 和 r，再決定要不要聯立</text>
   <text x="56" y="67" font-size="14" fill="#66758d">先用圖看懂誰跟誰垂直；相切看 1 點 / 1 組解，相交看 2 點 / 2 組解。</text>
 </svg>`
}
window.updateLCDemo=()=>{
 const x=Number($("lcd_x").value);
 $("lcdX").textContent=x;
 $("lcdBox").innerHTML=lineCircleSceneSvg(x)
}
function divisionVisual(){return `<svg viewBox="0 0 620 260"><rect x="45" y="65" width="150" height="70" rx="15" fill="#eaf1ff"/><text x="85" y="107" font-size="20">除式 × 商</text><text x="230" y="108" font-size="28">＋</text><rect x="285" y="65" width="135" height="70" rx="15" fill="#eefaf5"/><text x="330" y="108" font-size="20">餘式</text><text x="455" y="108" font-size="28">＝</text><rect x="500" y="65" width="90" height="70" rx="15" fill="#fff5e4"/><text x="512" y="108" font-size="19">被除式</text><text x="150" y="205" font-size="18" font-weight="700">餘式次數一定 &lt; 除式次數</text></svg>`}
function remainderVisual(){return `<svg viewBox="0 0 620 260"><rect x="65" y="70" width="170" height="90" rx="16" fill="#eaf1ff"/><text x="105" y="115" font-size="24">f(x)</text><text x="96" y="145" font-size="15">除以 x−a</text><path d="M255 115 L390 115" stroke="#3478f6" stroke-width="4"/><polygon points="390,115 374,106 374,124" fill="#3478f6"/><rect x="410" y="70" width="150" height="90" rx="16" fill="#edf9f4"/><text x="444" y="115" font-size="22">餘式 f(a)</text><text x="175" y="220" font-size="18" font-weight="700">若 f(a)=0 → x−a 是因式</text></svg>`}
function parabolaVisual(){
 return `<div class="parabolaStage">
   <div class="parameterRoles">
     <span class="var"><b>x</b><small>輸入／位置，會變</small></span>
     <span class="var"><b>y</b><small>輸出／結果，會跟著變</small></span>
     <span class="coef focus"><b>a</b><small>固定係數：先只研究它</small></span>
   </div>
   <div id="paraBox">${parabolaASvg(1)}</div>
   <label class="heroSlider">只拖 a：<span class="valueBadge" id="pa">1</span>
     <input id="paR" type="range" min="-3" max="3" step=".5" value="1" oninput="updateParaA()">
   </label>
   <div class="plainExplain" data-voice><b>先只記一件事：</b> a 的正負決定開口朝上或朝下；|a| 越大，圖越窄。先不要把 h、k、b、c 一次塞進來。</div>
 </div>`
}
function parabolaASvg(a){
 a=Number(a);const W=620,H=330,cx=205,cy=185,sx=27,sy=25,X=x=>cx+x*sx,Y=y=>cy-y*sy,pts=[];
 for(let x=-5.5;x<=5.5;x+=.12){const y=a*x*x;if(y>-5.2&&y<6.2)pts.push(`${X(x)},${Y(y)}`)}
 const dir=a>0?"向上開":a<0?"向下開":"a=0：不是二次函數";
 const width=a===0?"—":Math.abs(a)>=2?"較窄":Math.abs(a)<=.5?"較寬":"一般";
 return `<svg viewBox="0 0 ${W} ${H}">
  <defs><clipPath id="paraAclip"><rect x="42" y="35" width="325" height="245" rx="12"/></clipPath></defs>
  <rect x="42" y="35" width="325" height="245" rx="12" fill="#fbfdff" stroke="#d7e1ee"/>
  <line x1="48" y1="${Y(0)}" x2="360" y2="${Y(0)}" stroke="#8595aa" stroke-width="2"/>
  <line x1="${X(0)}" y1="40" x2="${X(0)}" y2="275" stroke="#8595aa" stroke-width="2"/>
  <text x="340" y="${Y(0)-9}" font-size="13" fill="#65758e">x</text>
  <text x="${X(0)+9}" y="55" font-size="13" fill="#65758e">y</text>
  <g clip-path="url(#paraAclip)"><polyline points="${pts.join(" ")}" fill="none" stroke="#4779ee" stroke-width="5"/></g>
  <circle cx="${X(0)}" cy="${Y(0)}" r="7" fill="#ff668c"/>
  <text x="${X(0)+10}" y="${Y(0)+22}" font-size="12" fill="#b94369">頂點 (0,0)</text>
  <rect x="390" y="50" width="180" height="150" rx="16" fill="#eef4ff" stroke="#d8e4fb"/>
  <text x="406" y="80" font-size="18" font-weight="800" fill="#314e90">y = ${a}x²</text>
  <text x="406" y="112" font-size="14" fill="#52617a">x：輸入，會變</text>
  <text x="406" y="136" font-size="14" fill="#52617a">y：輸出，會跟著變</text>
  <text x="406" y="160" font-size="14" fill="#52617a">a：${dir}</text>
  <text x="406" y="184" font-size="14" fill="#52617a">|a|：${width}</text>
  <text x="390" y="235" font-size="13" fill="#718097">先只研究 a；h、k 下一張再看。</text>
 </svg>`
}
window.updateParaA=()=>{
 const a=Number($("paR").value);$("pa").textContent=a;$("paraBox").innerHTML=parabolaASvg(a)
}

function signVisual(){
 return `<div class="cubicRootStage">
   <div class="rootMeaning" data-voice><b>根是什麼？</b><span>根 r 就是讓 f(r)=0 的 x。圖上就是曲線碰到 x 軸的地方 (r,0)，代數上就是因式 (x−r)。</span></div>
   <div id="cubicRootBox">${cubicRootSvg(0)}</div>
   <label class="heroSlider">拖測試 x = <span class="valueBadge" id="crx">0</span>
     <input id="crxR" type="range" min="-4" max="5" step=".5" value="0" oninput="updateCubicRoot()">
   </label>
 </div>`
}
function cubicRootSvg(x){
 x=Number(x);const roots=[-2,1,3],X=v=>285+v*48,Y=v=>165-v*8;
 const f=v=>(v+2)*(v-1)*(v-3),pts=[];
 for(let t=-4.5;t<=5;t+=.08){const y=f(t);if(y>-15&&y<15)pts.push(`${X(t)},${Y(y)}`)}
 const vals=[x+2,x-1,x-3],prod=f(x);
 const sign=v=>v>0?"+":v<0?"−":"0";
 return `<svg viewBox="0 0 620 350">
   <defs><clipPath id="cubicClip"><rect x="55" y="35" width="500" height="245" rx="12"/></clipPath></defs>
   <rect x="55" y="35" width="500" height="245" rx="12" fill="#fbfdff" stroke="#d7e1ee"/>
   <line x1="60" y1="${Y(0)}" x2="550" y2="${Y(0)}" stroke="#8795aa" stroke-width="2"/>
   <line x1="${X(0)}" y1="40" x2="${X(0)}" y2="275" stroke="#8795aa" stroke-width="2"/>
   <g clip-path="url(#cubicClip)"><polyline points="${pts.join(" ")}" fill="none" stroke="#4779ee" stroke-width="4"/></g>
   ${roots.map(r=>`<circle cx="${X(r)}" cy="${Y(0)}" r="7" fill="#ff668c"/><text x="${X(r)-12}" y="${Y(0)+24}" font-size="13" fill="#ad3f63">${r}</text>`).join("")}
   <circle cx="${X(x)}" cy="${Y(Math.max(-14,Math.min(14,prod)))}" r="7" fill="#7c67ef"/>
   <text x="72" y="62" font-size="19" font-weight="800" fill="#324a78">f(x)=(x+2)(x−1)(x−3)</text>
   <text x="72" y="88" font-size="13" fill="#65758d">三個根：−2、1、3 → 三個 x 軸交點 → 三個一次因式</text>
   <rect x="350" y="190" width="188" height="74" rx="12" fill="#fff6df" stroke="#edd49d"/>
   <text x="365" y="216" font-size="13" fill="#66532c">x=${x} 時：</text>
   <text x="365" y="239" font-size="14" font-weight="800" fill="#5b4a28">${sign(vals[0])} × ${sign(vals[1])} × ${sign(vals[2])} = ${sign(prod)}</text>
   <text x="365" y="258" font-size="11" fill="#76674f">逐因式判號，再把正負乘起來</text>
 </svg>`
}
window.updateCubicRoot=()=>{const x=Number($("crxR").value);$("crx").textContent=x;$("cubicRootBox").innerHTML=cubicRootSvg(x)}




function plotBase(extra=""){
 const W=620,H=330,cx=310,cy=165,s=17.5,X=x=>cx+x*s,Y=y=>cy-y*s;
 const bounds={xmin:-15.4,xmax:15.4,ymin:-7.45,ymax:7.45};
 return {W,H,cx,cy,s,X,Y,bounds,grid:`<rect x="40" y="35" width="540" height="260" rx="12" fill="#fbfdff" stroke="#cfd9e8" stroke-width="1.5"/>${[-12,-8,-4,4,8,12].map(v=>`<line x1="${X(v)}" y1="35" x2="${X(v)}" y2="295" stroke="#edf1f7"/><text x="${X(v)-8}" y="${cy+18}" font-size="10" fill="#93a0b3">${v}</text>`).join("")}${[-6,-4,-2,2,4,6].map(v=>`<line x1="40" y1="${Y(v)}" x2="580" y2="${Y(v)}" stroke="#edf1f7"/><text x="${cx+7}" y="${Y(v)+4}" font-size="10" fill="#93a0b3">${v}</text>`).join("")}<line x1="40" y1="${cy}" x2="580" y2="${cy}" stroke="#718096" stroke-width="2"/><line x1="${cx}" y1="35" x2="${cx}" y2="295" stroke="#718096" stroke-width="2"/><text x="566" y="${cy-8}" font-size="12" fill="#718096">x</text><text x="${cx+8}" y="48" font-size="12" fill="#718096">y</text>${extra}`}}
function clipLineData(m,b,bounds){
 const {xmin,xmax,ymin,ymax}=bounds,pts=[],eps=1e-8;
 const add=(x,y)=>{if(x>=xmin-eps&&x<=xmax+eps&&y>=ymin-eps&&y<=ymax+eps&&!pts.some(p=>Math.abs(p.x-x)<1e-6&&Math.abs(p.y-y)<1e-6))pts.push({x,y})};
 add(xmin,m*xmin+b);add(xmax,m*xmax+b);
 if(Math.abs(m)>eps){add((ymin-b)/m,ymin);add((ymax-b)/m,ymax)}
 if(pts.length<2)return null;
 let best=[pts[0],pts[1]],bestD=-1;
 for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const d=(pts[i].x-pts[j].x)**2+(pts[i].y-pts[j].y)**2;if(d>bestD){bestD=d;best=[pts[i],pts[j]]}}
 return best
}
function lineSegSvg(m,b,color="#3478f6",dash=""){
 const P=plotBase(),pts=clipLineData(m,b,P.bounds);if(!pts)return "";
 const [a,c]=pts;return `<line x1="${P.X(a.x)}" y1="${P.Y(a.y)}" x2="${P.X(c.x)}" y2="${P.Y(c.y)}" stroke="${color}" stroke-width="4" stroke-linecap="round" ${dash?`stroke-dasharray="${dash}"`:""}/>`
}
function lineLabel(m,b){return `y=${m===1?"":m===-1?"−":m}x${b===0?"":b>0?"+"+b:b}`}
function lineMasterSvg(m,b){const P=plotBase(),{X,Y}=P;const xint=Math.abs(m)>1e-9?-b/m:null;let slopeText=m>0?"正斜率：往右上":m<0?"負斜率：往右下":"斜率0：水平";return `<svg viewBox="0 0 620 330"><defs><clipPath id="lmclip"><rect x="35" y="25" width="550" height="275" rx="12"/></clipPath></defs>${P.grid}<g clip-path="url(#lmclip)">${lineSegSvg(m,b)}</g><circle cx="${X(0)}" cy="${Y(b)}" r="7" fill="#ff6f9a"/><text x="${X(0)+10}" y="${Y(b)-9}" font-size="13" fill="#bb466b">y截距 (0,${b})</text>${xint!==null&&Math.abs(xint)<=8?`<circle cx="${X(xint)}" cy="${Y(0)}" r="6" fill="#27b67a"/><text x="${X(xint)+8}" y="${Y(0)+22}" font-size="12" fill="#247a58">x截距 ${xint.toFixed(1)}</text>`:""}<text x="48" y="50" font-size="18" font-weight="800" fill="#244eaf">${lineLabel(m,b)}</text><text x="390" y="50" font-size="14" font-weight="700" fill="${m<0?"#c34e6f":"#2c765b"}">${slopeText}</text><text x="395" y="72" font-size="12" fill="#66748c">m 控制方向；b 控制起點</text></svg>`}
function lineMasterVisual(){return `<div class="coachCallout"><b>先玩30秒：</b>拖 m，看直線轉方向；拖 b，看整條線上下平移。你不是在背 y=mx+b，你是在控制一條線。</div><div id="lineMasterBox">${lineMasterSvg(1,0)}</div><div class="dualSliders"><label>斜率 m <span class="valueBadge" id="lmM">1</span><input id="lmMr" type="range" min="-4" max="4" step=".5" value="1" oninput="updateLineMaster()"></label><label>y截距 b <span class="valueBadge" id="lmB">0</span><input id="lmBr" type="range" min="-5" max="5" step="1" value="0" oninput="updateLineMaster()"></label></div><div class="presetRow"><button class="miniPreset" onclick="setLineMaster(-1,0)">x+y=0</button><button class="miniPreset" onclick="setLineMaster(1,0)">x−y=0</button><button class="miniPreset" onclick="setLineMaster(0,3)">y=3</button><button class="miniPreset" onclick="setLineMaster(2,-2)">y=2x−2</button></div>`}
window.updateLineMaster=()=>{const m=Number($("lmMr")?.value??1),b=Number($("lmBr")?.value??0);if($("lmM"))$("lmM").textContent=m;if($("lmB"))$("lmB").textContent=b;if($("lineMasterBox"))$("lineMasterBox").innerHTML=lineMasterSvg(m,b)}
window.setLineMaster=(m,b)=>{if($("lmMr"))$("lmMr").value=m;if($("lmBr"))$("lmBr").value=b;updateLineMaster()}

function lineMasterVisualId(id,m=1,b=0){return `<div id="lmBox_${id}">${lineMasterSvg(m,b)}</div><div class="dualSliders"><label>斜率 m <span class="valueBadge" id="lmMV_${id}">${m}</span><input id="lmMR_${id}" type="range" min="-4" max="4" step=".5" value="${m}" oninput="updateLineMasterId('${id}')"></label><label>y截距 b <span class="valueBadge" id="lmBV_${id}">${b}</span><input id="lmBR_${id}" type="range" min="-5" max="5" step="1" value="${b}" oninput="updateLineMasterId('${id}')"></label></div><div class="presetRow"><button class="miniPreset" onclick="setLineMasterId('${id}',-1,0)">x+y=0</button><button class="miniPreset" onclick="setLineMasterId('${id}',1,0)">x−y=0</button><button class="miniPreset" onclick="setLineMasterId('${id}',0,3)">y=3</button><button class="miniPreset" onclick="setLineMasterId('${id}',2,-2)">y=2x−2</button></div>`}
window.updateLineMasterId=id=>{const mr=document.getElementById("lmMR_"+id),br=document.getElementById("lmBR_"+id),box=document.getElementById("lmBox_"+id);if(!mr||!br||!box)return;const m=Number(mr.value),b=Number(br.value);document.getElementById("lmMV_"+id).textContent=m;document.getElementById("lmBV_"+id).textContent=b;box.innerHTML=lineMasterSvg(m,b)}
window.setLineMasterId=(id,m,b)=>{const mr=document.getElementById("lmMR_"+id),br=document.getElementById("lmBR_"+id);if(mr)mr.value=m;if(br)br.value=b;updateLineMasterId(id)}

function slopeLabSvg(m){const P=plotBase(),{X,Y}=P;const sign=m>0?"正：左下→右上":m<0?"負：左上→右下":"0：水平";const q=m>0?"通過 I、III 象限（若過原點）":m<0?"通過 II、IV 象限（若過原點）":"沿 x 軸（若過原點）";return `<svg viewBox="0 0 620 330"><defs><clipPath id="slclip"><rect x="35" y="25" width="550" height="275" rx="12"/></clipPath></defs>${P.grid}<text x="430" y="55" font-size="30" fill="#d8dee9">I</text><text x="130" y="55" font-size="30" fill="#d8dee9">II</text><text x="125" y="270" font-size="30" fill="#d8dee9">III</text><text x="435" y="270" font-size="30" fill="#d8dee9">IV</text><g clip-path="url(#slclip)">${lineSegSvg(m,0,"#7c67ef")}</g><circle cx="${X(0)}" cy="${Y(0)}" r="7" fill="#ff6f9a"/><text x="55" y="52" font-size="18" font-weight="800">${lineLabel(m,0)}</text><text x="355" y="52" font-size="14" font-weight="800">${sign}</text><text x="350" y="75" font-size="12" fill="#66748c">${q}</text></svg>`}
window.updateSlopeLab=id=>{const r=document.getElementById("slopeLabR_"+id),box=document.getElementById("slopeLabBox_"+id),v=document.getElementById("slopeLabV_"+id);if(!r||!box)return;const m=Number(r.value);if(v)v.textContent=m;box.innerHTML=slopeLabSvg(m)}

function twoPointSvg(x1,y1,x2,y2){const P=plotBase(),{X,Y}=P,dx=x2-x1,dy=y2-y1,m=Math.abs(dx)<1e-9?null:dy/dx;return `<svg viewBox="0 0 620 330">${P.grid}${m===null?`<line x1="${X(x1)}" y1="30" x2="${X(x1)}" y2="300" stroke="#3478f6" stroke-width="4"/>`:lineSegSvg(m,y1-m*x1)}<circle cx="${X(x1)}" cy="${Y(y1)}" r="8" fill="#3478f6"/><circle cx="${X(x2)}" cy="${Y(y2)}" r="8" fill="#ff6f9a"/><text x="${X(x1)+9}" y="${Y(y1)-8}" font-size="13">A(${x1},${y1})</text><text x="${X(x2)+9}" y="${Y(y2)-8}" font-size="13">B(${x2},${y2})</text><text x="48" y="52" font-size="16" font-weight="800">${m===null?"x="+x1+"（鉛直線，斜率不存在）":"m="+dy+"/"+dx+" = "+m.toFixed(2)}</text><text x="360" y="52" font-size="13" fill="#66748c">兩個不同點 → 唯一一條直線</text></svg>`}
window.updateTwoPoint=id=>{const val=n=>Number(document.getElementById(n+"_"+id).value),box=document.getElementById("tpBox_"+id);if(!box)return;const a=[val("tpX1"),val("tpY1"),val("tpX2"),val("tpY2")];["X1","Y1","X2","Y2"].forEach((n,i)=>{const v=document.getElementById("tpV"+n+"_"+id);if(v)v.textContent=a[i]});box.innerHTML=twoPointSvg(...a)}

function collinearSvg(cyVal){const A=[0,0],B=[2,4],C=[3,cyVal],P=plotBase(),{X,Y}=P,m1=2,m2=cyVal/3,ok=Math.abs(m1-m2)<1e-9;return `<svg viewBox="0 0 620 330">${P.grid}${lineSegSvg(2,0,"#3478f6")}<circle cx="${X(0)}" cy="${Y(0)}" r="7" fill="#3478f6"/><circle cx="${X(2)}" cy="${Y(4)}" r="7" fill="#3478f6"/><circle cx="${X(3)}" cy="${Y(cyVal)}" r="9" fill="${ok?"#27b67a":"#ff6f9a"}"/><text x="${X(3)+10}" y="${Y(cyVal)-8}" font-size="13">C(3,${cyVal})</text><text x="48" y="52" font-size="15" font-weight="800">mAB=2；mAC=${m2.toFixed(2)} → ${ok?"✅ 三點共線":"❌ 不共線"}</text></svg>`}
window.updateCollinear=id=>{const r=document.getElementById("colR_"+id),box=document.getElementById("colBox_"+id),v=document.getElementById("colV_"+id);if(!r||!box)return;const y=Number(r.value);if(v)v.textContent=y;box.innerHTML=collinearSvg(y)}

function pointSlopeSvg(m,x0,y0,color="#3478f6",refM=null){const P=plotBase(),{X,Y}=P,b=y0-m*x0;return `<svg viewBox="0 0 620 330">${P.grid}${refM===null?"":lineSegSvg(refM,0,"#aab5c7","7 5")}${lineSegSvg(m,b,color)}<circle cx="${X(x0)}" cy="${Y(y0)}" r="9" fill="#ff6f9a"/><text x="${X(x0)+10}" y="${Y(y0)-10}" font-size="13">A(${x0},${y0})</text><text x="48" y="52" font-size="16" font-weight="800">${lineLabel(m,Number(b.toFixed(2)))}</text><text x="385" y="52" font-size="13" fill="#66748c">點決定位置；m 決定方向</text></svg>`}
window.updatePointSlope=id=>{const m=Number(document.getElementById("psM_"+id).value),x=Number(document.getElementById("psX_"+id).value),y=Number(document.getElementById("psY_"+id).value),box=document.getElementById("psBox_"+id);if(!box)return;document.getElementById("psMV_"+id).textContent=m;document.getElementById("psXV_"+id).textContent=x;document.getElementById("psYV_"+id).textContent=y;box.innerHTML=pointSlopeSvg(m,x,y)}

function parallelThroughSvg(m,b,x0,y0){const P=plotBase(),{X,Y}=P,b2=y0-m*x0;return `<svg viewBox="0 0 620 330">${P.grid}${lineSegSvg(m,b,"#94a3b8","7 5")}${lineSegSvg(m,b2,"#3478f6")}<circle cx="${X(x0)}" cy="${Y(y0)}" r="9" fill="#ff6f9a"/><text x="48" y="50" font-size="14" fill="#68758c">原線：${lineLabel(m,b)}</text><text x="48" y="72" font-size="16" font-weight="800" fill="#285fc4">新線：${lineLabel(m,Number(b2.toFixed(2)))}</text><text x="365" y="50" font-size="13">同斜率 → 平行</text></svg>`}
window.updateParallel=id=>{const m=Number(document.getElementById("parM_"+id).value),y=Number(document.getElementById("parY_"+id).value),box=document.getElementById("parBox_"+id);if(!box)return;document.getElementById("parMV_"+id).textContent=m;document.getElementById("parYV_"+id).textContent=y;box.innerHTML=parallelThroughSvg(m,-2,1,y)}

function perpendicularSvg(m,x0,y0){const P=plotBase(),{X,Y}=P;if(Math.abs(m)<1e-9)return `<svg viewBox="0 0 620 330">${P.grid}${lineSegSvg(0,0,"#94a3b8","7 5")}<line x1="${X(x0)}" y1="30" x2="${X(x0)}" y2="300" stroke="#3478f6" stroke-width="4"/><circle cx="${X(x0)}" cy="${Y(y0)}" r="9" fill="#ff6f9a"/><text x="48" y="52" font-size="15">原線 m=0 → 垂線是 x=${x0}</text></svg>`;const pm=-1/m,b2=y0-pm*x0;return `<svg viewBox="0 0 620 330">${P.grid}${lineSegSvg(m,0,"#94a3b8","7 5")}${lineSegSvg(pm,b2,"#3478f6")}<circle cx="${X(x0)}" cy="${Y(y0)}" r="9" fill="#ff6f9a"/><text x="48" y="50" font-size="14">原線 m₁=${m}</text><text x="48" y="72" font-size="16" font-weight="800">垂線 m₂=${pm.toFixed(2)}；m₁m₂=−1</text></svg>`}
window.updatePerp=id=>{const m=Number(document.getElementById("perM_"+id).value),y=Number(document.getElementById("perY_"+id).value),box=document.getElementById("perBox_"+id);if(!box)return;document.getElementById("perMV_"+id).textContent=m;document.getElementById("perYV_"+id).textContent=y;box.innerHTML=perpendicularSvg(m,1,y)}

function interceptSvg(c){const P=plotBase(),{X,Y}=P,m=-2/3,b=c/3,xi=c/2;return `<svg viewBox="0 0 620 330">${P.grid}${lineSegSvg(m,b,"#3478f6")}<circle cx="${X(xi)}" cy="${Y(0)}" r="8" fill="#27b67a"/><circle cx="${X(0)}" cy="${Y(b)}" r="8" fill="#ff6f9a"/><text x="${X(xi)+8}" y="${Y(0)+22}" font-size="13">x截距 (${xi.toFixed(1)},0)</text><text x="${X(0)+8}" y="${Y(b)-8}" font-size="13">y截距 (0,${b.toFixed(1)})</text><text x="48" y="52" font-size="17" font-weight="800">2x+3y=${c}</text></svg>`}
window.updateIntercept=id=>{const c=Number(document.getElementById("intC_"+id).value),box=document.getElementById("intBox_"+id);if(!box)return;document.getElementById("intCV_"+id).textContent=c;box.innerHTML=interceptSvg(c)}

function planSvg(x,aBase=100,aRate=20,bBase=40,bRate=30){
 const A=aBase+aRate*x,B=bBase+bRate*x,max=Math.max(240,aBase+aRate*15,bBase+bRate*15)+40,scale=165/max,px=90+x*30;
 const denom=aRate-bRate,ix=Math.abs(denom)<1e-9?null:(bBase-aBase)/denom,iy=ix===null?null:aBase+aRate*ix;
 const inter=(ix!==null&&ix>=0&&ix<=15)?`<circle cx="${90+ix*30}" cy="${225-iy*scale}" r="9" fill="#8b5cf6"/><text x="${Math.min(100+ix*30,455)}" y="${Math.max(42,215-iy*scale)}" font-size="12" font-weight="700" fill="#6c50c7">交點 x=${ix.toFixed(1)}</text>`:"";
 return `<svg viewBox="0 0 620 305"><line x1="70" y1="225" x2="560" y2="225" stroke="#8a98ad"/><line x1="90" y1="245" x2="90" y2="35" stroke="#8a98ad"/><text x="545" y="245" font-size="12" fill="#6f7f96">GB</text><text x="98" y="45" font-size="12" fill="#6f7f96">費用(元)</text><line x1="90" y1="${225-aBase*scale}" x2="540" y2="${225-(aRate*15+aBase)*scale}" stroke="#3478f6" stroke-width="4"/><line x1="90" y1="${225-bBase*scale}" x2="540" y2="${225-(bRate*15+bBase)*scale}" stroke="#ff6f9a" stroke-width="4"/>${inter}<line x1="${px}" y1="45" x2="${px}" y2="225" stroke="#8b5cf6" stroke-dasharray="5 5"/><circle cx="${px}" cy="${225-A*scale}" r="8" fill="#3478f6"/><circle cx="${px}" cy="${225-B*scale}" r="8" fill="#ff6f9a"/><text x="315" y="48" font-size="13" fill="#3478f6">A：${aBase}+${aRate}x</text><text x="315" y="69" font-size="13" fill="#d94e79">B：${bBase}+${bRate}x</text><text x="108" y="270" font-size="14" font-weight="700">x=${x}GB：A=${A}元，B=${B}元</text><text x="108" y="294" font-size="13" fill="#5d4bb5">${Math.abs(aRate-bRate)<1e-9?(aBase===bBase?"兩方案完全重合：任何使用量都同價":"兩條費用線平行：永遠不會同價"):A===B?"🎯 現在正好在同價交點":A<B?"此時 A 比較便宜":"此時 B 比較便宜"}</text></svg>`
}
window.updatePlan=id=>{
 const get=(n,d)=>Number(document.getElementById(n+"_"+id)?.value??d);
 const x=get("planX",6),ab=get("planAB",100),ar=get("planAR",20),bb=get("planBB",40),br=get("planBR",30),box=document.getElementById("planBox_"+id);
 [["planXV",x],["planABV",ab],["planARV",ar],["planBBV",bb],["planBRV",br]].forEach(([n,v])=>{const e=document.getElementById(n+"_"+id);if(e)e.textContent=v});
 if(box)box.innerHTML=planSvg(x,ab,ar,bb,br)
}

function u05InteractiveVisual(id){
 if(!id.startsWith("u05"))return "";
 if(id==="u05t1")return `<div class="coachCallout">先點預設：<b>x+y=0</b> 與 <b>x−y=0</b>。係數 1 沒寫，但方向完全不同。</div>${lineMasterVisualId(id,-1,0)}`;
 if(id==="u05t2")return `<div id="slopeLabBox_${id}">${slopeLabSvg(1)}</div><div class="soloSlider"><label>拖斜率 m：<span class="valueBadge" id="slopeLabV_${id}">1</span><input id="slopeLabR_${id}" type="range" min="-4" max="4" step=".25" value="1" oninput="updateSlopeLab('${id}')"></label></div><div class="hintStrip">正斜率過原點時穿 I、III 象限；負斜率穿 II、IV。先看方向，再比陡度。</div>`;
 if(id==="u05t3")return `<div id="tpBox_${id}">${twoPointSvg(0,1,2,5)}</div><div class="fourControls"><label>x₁ <span id="tpVX1_${id}">0</span><input id="tpX1_${id}" type="range" min="-4" max="3" value="0" oninput="updateTwoPoint('${id}')"></label><label>y₁ <span id="tpVY1_${id}">1</span><input id="tpY1_${id}" type="range" min="-4" max="4" value="1" oninput="updateTwoPoint('${id}')"></label><label>x₂ <span id="tpVX2_${id}">2</span><input id="tpX2_${id}" type="range" min="-3" max="5" value="2" oninput="updateTwoPoint('${id}')"></label><label>y₂ <span id="tpVY2_${id}">5</span><input id="tpY2_${id}" type="range" min="-4" max="7" value="5" oninput="updateTwoPoint('${id}')"></label></div>`;
 if(id==="u05t4")return `<div id="colBox_${id}">${collinearSvg(6)}</div><div class="soloSlider"><label>只拖 C 的 y：C=(3,<span class="valueBadge" id="colV_${id}">6</span>)<input id="colR_${id}" type="range" min="-2" max="8" step=".5" value="6" oninput="updateCollinear('${id}')"></label></div><div class="hintStrip">找得到 mAB=mAC 的那一刻，C 就「啪」一聲落回同一條線。</div>`;
 if(id==="u05t5")return lineMasterVisualId(id,-2,3);
 if(id==="u05t6")return lineSystemVisualId(id,1,1,-1,5);
 if(id==="u05t7")return `<div class="coachCallout">把兩條線斜率調成一樣，再改截距：你會親眼看到「人生平行線」為什麼永遠沒有交點。</div>${lineSystemVisualId(id,2,1,2,-3)}`;
 if(id==="u05t8")return `<div id="psBox_${id}">${pointSlopeSvg(2,1,3)}</div><div class="threeControls"><label>m <span id="psMV_${id}">2</span><input id="psM_${id}" type="range" min="-4" max="4" step=".5" value="2" oninput="updatePointSlope('${id}')"></label><label>A.x <span id="psXV_${id}">1</span><input id="psX_${id}" type="range" min="-4" max="4" value="1" oninput="updatePointSlope('${id}')"></label><label>A.y <span id="psYV_${id}">3</span><input id="psY_${id}" type="range" min="-4" max="5" value="3" oninput="updatePointSlope('${id}')"></label></div>`;
 if(id==="u05t9")return `<div id="parBox_${id}">${parallelThroughSvg(2,-2,1,4)}</div><div class="dualSliders"><label>原線斜率 m <span id="parMV_${id}">2</span><input id="parM_${id}" type="range" min="-3" max="3" step=".5" value="2" oninput="updateParallel('${id}')"></label><label>A=(1,y)，y=<span id="parYV_${id}">4</span><input id="parY_${id}" type="range" min="-4" max="5" value="4" oninput="updateParallel('${id}')"></label></div><div class="hintStrip">灰線是原線；藍線一定跟它同方向，只被 A 點拉到新位置。</div>`;
 if(id==="u05t10")return `<div id="perBox_${id}">${perpendicularSvg(2,1,3)}</div><div class="dualSliders"><label>原線 m₁ <span id="perMV_${id}">2</span><input id="perM_${id}" type="range" min="-3" max="3" step=".5" value="2" oninput="updatePerp('${id}')"></label><label>A=(1,y)，y=<span id="perYV_${id}">3</span><input id="perY_${id}" type="range" min="-4" max="5" value="3" oninput="updatePerp('${id}')"></label></div><div class="hintStrip">藍線永遠穿過 A，並跟灰線保持 90°。</div>`;
 if(id==="u05t11")return `<div id="intBox_${id}">${interceptSvg(6)}</div><div class="soloSlider"><label>2x+3y = C，拖 C：<span class="valueBadge" id="intCV_${id}">6</span><input id="intC_${id}" type="range" min="-12" max="18" step="3" value="6" oninput="updateIntercept('${id}')"></label></div>`;
 if(id==="u05t12")return `<div class="scenarioCard"><span class="sceneTag">📱 真實情境題</span><h4>你正在選手機上網方案</h4><p><b>A方案</b>：每月先付 100 元，之後每用 1GB 再加 20 元。</p><p><b>B方案</b>：每月先付 40 元，之後每用 1GB 再加 30 元。</p><div class="scenarioVars"><span>x＝本月使用量（GB）</span><span>y＝本月總費用（元）</span><span>A：y=20x+100</span><span>B：y=30x+40</span></div><p class="scenarioQuestion">原題：用到多少 GB 時兩方案同價？超過交點後，哪一個方案會比較便宜？</p><p>先用預設值找答案；找到後，再玩下面的「高手模式」：自己改月費與每GB費率，觀察交點怎麼跑。</p></div><div id="planBox_${id}">${planSvg(6,100,20,40,30)}</div><div class="soloSlider"><label>目前使用量 x：<span class="valueBadge" id="planXV_${id}">6</span> GB<input id="planX_${id}" type="range" min="0" max="15" step="1" value="6" oninput="updatePlan('${id}')"></label></div><div class="fourControls"><label>A固定月費 <span id="planABV_${id}">100</span><input id="planAB_${id}" type="range" min="0" max="200" step="10" value="100" oninput="updatePlan('${id}')"></label><label>A每GB費率 <span id="planARV_${id}">20</span><input id="planAR_${id}" type="range" min="5" max="50" step="5" value="20" oninput="updatePlan('${id}')"></label><label>B固定月費 <span id="planBBV_${id}">40</span><input id="planBB_${id}" type="range" min="0" max="200" step="10" value="40" oninput="updatePlan('${id}')"></label><label>B每GB費率 <span id="planBRV_${id}">30</span><input id="planBR_${id}" type="range" min="5" max="50" step="5" value="30" oninput="updatePlan('${id}')"></label></div><div class="hintStrip"><b>高手玩法：</b>把兩個「每GB費率」調成相同，看看會不會變成人生平行線；再把月費也調成一樣，看兩條線是不是整條重合。</div>`;
 return "";
}

function lineSystemVisual(){return `<div id="sysBox">${lineSystemSvg(1,1,-1,3)}</div><div class="controlRow systemControls"><label>線A m₁ <span id="m1v" class="valueBadge">1</span></label><input id="m1r" type="range" min="-3" max="3" step=".5" value="1" oninput="updateSystem()"><label>b₁ <span id="b1v" class="valueBadge">1</span></label><input id="b1r" type="range" min="-5" max="5" step="1" value="1" oninput="updateSystem()"><label>線B m₂ <span id="m2v" class="valueBadge">-1</span></label><input id="m2r" type="range" min="-3" max="3" step=".5" value="-1" oninput="updateSystem()"><label>b₂ <span id="b2v" class="valueBadge">3</span></label><input id="b2r" type="range" min="-5" max="5" step="1" value="3" oninput="updateSystem()"></div><div class="systemLegend"><span class="blueLine">A：y=m₁x+b₁</span><span class="pinkLine">B：y=m₂x+b₂</span><b id="sysExplain">交點就是聯立解</b></div>`}
function lineSystemSvg(m1,b1,m2,b2){
 const P=plotBase(),{X,Y,bounds}=P;
 const seg=(m,b,color)=>{const pts=clipLineData(m,b,bounds);if(!pts)return "";return `<line x1="${X(pts[0].x)}" y1="${Y(pts[0].y)}" x2="${X(pts[1].x)}" y2="${Y(pts[1].y)}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`};
 let inter='',msg='';
 if(Math.abs(m1-m2)<1e-9){msg=Math.abs(b1-b2)<1e-9?'兩式重合 → 無限多解':'兩線平行 → 無解'}
 else{
  const x=(b2-b1)/(m1-m2),y=m1*x+b1;
  msg=`交點 ≈ (${x.toFixed(2)}, ${y.toFixed(2)}) → 聯立解`;
  if(x>=bounds.xmin&&x<=bounds.xmax&&y>=bounds.ymin&&y<=bounds.ymax)inter=`<circle cx="${X(x)}" cy="${Y(y)}" r="8" fill="#8b5cf6"/><text x="${Math.min(X(x)+12,500)}" y="${Math.max(Y(y)-10,52)}" font-size="14" font-weight="700" fill="#6d4ad1">(${x.toFixed(1)},${y.toFixed(1)})</text>`
 }
 const xint1=Math.abs(m1)>1e-9?-b1/m1:null,xint2=Math.abs(m2)>1e-9?-b2/m2:null;
 return `<svg viewBox="0 0 620 330">${P.grid}${seg(m1,b1,'#3478f6')}${seg(m2,b2,'#ff6f9a')}<circle cx="${X(0)}" cy="${Y(b1)}" r="6" fill="#3478f6"/>${b2>=bounds.ymin&&b2<=bounds.ymax?`<circle cx="${X(0)}" cy="${Y(b2)}" r="6" fill="#ff6f9a"/>`:""}${xint1!==null&&xint1>=bounds.xmin&&xint1<=bounds.xmax?`<circle cx="${X(xint1)}" cy="${Y(0)}" r="5" fill="#3478f6"/>`:''}${xint2!==null&&xint2>=bounds.xmin&&xint2<=bounds.xmax?`<circle cx="${X(xint2)}" cy="${Y(0)}" r="5" fill="#ff6f9a"/>`:''}${inter}<rect x="45" y="42" width="250" height="42" rx="9" fill="rgba(255,255,255,.88)"/><text x="55" y="59" font-size="12" fill="#3478f6">A：y=${m1}x${b1>=0?'+':''}${b1}</text><text x="55" y="78" font-size="12" fill="#e85885">B：y=${m2}x${b2>=0?'+':''}${b2}</text><text x="350" y="316" font-size="12" font-weight="700" fill="#52617b">${msg}</text></svg>`
}
window.updateSystem=()=>{const m1=Number($("m1r").value),b1=Number($("b1r").value),m2=Number($("m2r").value),b2=Number($("b2r").value);$("m1v").textContent=m1;$("b1v").textContent=b1;$("m2v").textContent=m2;$("b2v").textContent=b2;$("sysBox").innerHTML=lineSystemSvg(m1,b1,m2,b2);const e=$("sysExplain");if(e)e.textContent=Math.abs(m1-m2)<1e-9?(Math.abs(b1-b2)<1e-9?'同一條線：無限多解':'平行：無解'):'交點就是唯一聯立解'}
function lineSystemVisualId(id,m1=1,b1=1,m2=-1,b2=3){return `<div id="sysBox_${id}">${lineSystemSvg(m1,b1,m2,b2)}</div><div class="fourControls"><label>m₁ <span id="m1v_${id}">${m1}</span><input id="m1r_${id}" type="range" min="-3" max="3" step=".5" value="${m1}" oninput="updateSystemId('${id}')"></label><label>b₁ <span id="b1v_${id}">${b1}</span><input id="b1r_${id}" type="range" min="-5" max="5" value="${b1}" oninput="updateSystemId('${id}')"></label><label>m₂ <span id="m2v_${id}">${m2}</span><input id="m2r_${id}" type="range" min="-3" max="3" step=".5" value="${m2}" oninput="updateSystemId('${id}')"></label><label>b₂ <span id="b2v_${id}">${b2}</span><input id="b2r_${id}" type="range" min="-5" max="5" value="${b2}" oninput="updateSystemId('${id}')"></label></div><div class="hintStrip" id="sysText_${id}">拖到兩斜率相同，再看截距會發生什麼。</div>`}
window.updateSystemId=id=>{const v=n=>Number(document.getElementById(n+"_"+id).value),m1=v("m1r"),b1=v("b1r"),m2=v("m2r"),b2=v("b2r"),box=document.getElementById("sysBox_"+id),txt=document.getElementById("sysText_"+id);["m1","b1","m2","b2"].forEach(n=>{const el=document.getElementById(n+"v_"+id);if(el)el.textContent=({m1,b1,m2,b2})[n]});if(box)box.innerHTML=lineSystemSvg(m1,b1,m2,b2);if(txt)txt.textContent=Math.abs(m1-m2)<1e-9?(Math.abs(b1-b2)<1e-9?"同一條線 → 無限多解":"人生平行線 → 無解"):"有交點 → 唯一解"}

function typeVisual(id){
 const u=id.slice(0,3),n=Number(id.match(/t(\d+)/)?.[1]||1);
 if(u==='u01'){
  if(n===1)return numberSetVisual();
  if(n===2)return `<svg viewBox="0 0 620 210"><text x="55" y="70" font-size="28" font-weight="700">48,000,000</text><path d="M245 62 L365 62" stroke="#3478f6" stroke-width="4"/><polygon points="365,62 350,53 350,71" fill="#3478f6"/><text x="392" y="70" font-size="28" font-weight="700">4.8×10⁷</text><text x="165" y="125" font-size="16">小數點向左移 7 位</text><text x="165" y="160" font-size="15" fill="#66748c">係數保留 1≤a&lt;10；移動格數就是 10 的次方</text></svg>`;
  return `<svg viewBox="0 0 620 210"><rect x="85" y="120" width="90" height="45" rx="8" fill="#dbe6ff"/><rect x="215" y="90" width="90" height="75" rx="8" fill="#9fb8ff"/><rect x="345" y="55" width="90" height="110" rx="8" fill="#5f82ef"/><text x="105" y="190" font-size="15">10⁶</text><text x="235" y="190" font-size="15">10⁷</text><text x="365" y="190" font-size="15">10⁸</text><text x="450" y="90" font-size="16" font-weight="700">先看次方</text><text x="450" y="120" font-size="14">差1級 ≈ 差10倍</text></svg>`;
 }
 if(u==='u02'){
  if(n===1)return `<svg viewBox="0 0 620 210"><rect x="70" y="55" width="150" height="90" rx="15" fill="#eef4ff"/><text x="105" y="105" font-size="26">√18</text><path d="M235 100 L350 100" stroke="#3478f6" stroke-width="4"/><polygon points="350,100 335,91 335,109" fill="#3478f6"/><rect x="370" y="55" width="170" height="90" rx="15" fill="#eefaf5"/><text x="395" y="92" font-size="22">√(9×2)</text><text x="405" y="125" font-size="22">=3√2</text><text x="130" y="185" font-size="15">先拆完全平方數，再判斷能不能合併同類根式</text></svg>`;
  if(n===2)return amgmSvg(10);
  return `<svg viewBox="0 0 620 210"><rect x="85" y="50" width="180" height="80" rx="14" fill="#fff7df"/><rect x="355" y="50" width="180" height="80" rx="14" fill="#eefaf5"/><text x="120" y="92" font-size="21">x</text><text x="175" y="92" font-size="21">=</text><text x="205" y="92" font-size="21">4/x</text><text x="395" y="92" font-size="21">x=2</text><text x="115" y="175" font-size="16">AM-GM 要取到等號，兩個正數必須相等</text></svg>`;
 }
 if(u==='u03'){
  if(n===1)return `<svg viewBox="0 0 620 210"><line x1="70" y1="110" x2="550" y2="110" stroke="#7d8da7" stroke-width="2"/><circle cx="235" cy="110" r="8" fill="#ff6f9a"/><circle cx="385" cy="110" r="8" fill="#ff6f9a"/><circle cx="310" cy="110" r="7" fill="#3478f6"/><text x="220" y="145" font-size="14">a−r</text><text x="300" y="85" font-size="14">a</text><text x="375" y="145" font-size="14">a+r</text><text x="185" y="50" font-size="18">|x−a|=r → 距離中心 r 的兩個點</text></svg>`;
  if(n===2)return absSvg(3,2);
  return `<svg viewBox="0 0 620 210"><line x1="65" y1="112" x2="555" y2="112" stroke="#7e8da5"/><line x1="65" y1="112" x2="205" y2="112" stroke="#ff6f9a" stroke-width="10"/><line x1="415" y1="112" x2="555" y2="112" stroke="#ff6f9a" stroke-width="10"/><circle cx="205" cy="112" r="8" fill="#fff" stroke="#ff6f9a" stroke-width="3"/><circle cx="415" cy="112" r="8" fill="#fff" stroke="#ff6f9a" stroke-width="3"/><text x="215" y="55" font-size="19">|x−a|&gt;r → 距離夠遠，取外側</text></svg>`;
 }
 if(u==='u04'){
  if(n===1)return `<svg viewBox="0 0 620 220"><rect x="60" y="55" width="150" height="75" rx="14" fill="#eef4ff"/><text x="83" y="98" font-size="21">aᵐ·aⁿ=aᵐ⁺ⁿ</text><rect x="235" y="55" width="150" height="75" rx="14" fill="#eefaf5"/><text x="253" y="98" font-size="21">aᵐ/aⁿ=aᵐ⁻ⁿ</text><rect x="410" y="55" width="150" height="75" rx="14" fill="#fff5e5"/><text x="430" y="98" font-size="21">(aᵐ)ⁿ=aᵐⁿ</text><text x="155" y="178" font-size="16">同底數時先用指數律整理，不必急著按計算機</text></svg>`;
  if(n===2)return `<svg viewBox="0 0 620 220"><rect x="75" y="55" width="180" height="90" rx="16" fill="#eef4ff"/><text x="115" y="108" font-size="26">10³ = 1000</text><path d="M275 100 L375 100" stroke="#7c67ef" stroke-width="4"/><polygon points="375,100 360,91 360,109" fill="#7c67ef"/><path d="M375 122 L275 122" stroke="#7c67ef" stroke-width="4"/><polygon points="275,122 290,113 290,131" fill="#7c67ef"/><rect x="395" y="55" width="155" height="90" rx="16" fill="#f5efff"/><text x="420" y="108" font-size="25">log1000=3</text><text x="160" y="185" font-size="16">對數就是把「次方結果」反過來問「指數是多少」</text></svg>`;
  return growthSvg(6);
 }
 if(u==='u05'){
  if(n===1)return `<svg viewBox="0 0 560 190"><line x1="55" y1="155" x2="510" y2="155" stroke="#8795aa"/><line x1="85" y1="175" x2="85" y2="25" stroke="#8795aa"/><line x1="130" y1="135" x2="410" y2="55" stroke="#3478f6" stroke-width="4"/><path d="M210 112 L330 112 L330 78" fill="none" stroke="#ff6f9a" stroke-width="3"/><text x="240" y="105" font-size="13">Δx</text><text x="338" y="98" font-size="13">Δy</text><text x="170" y="35" font-size="18" font-weight="700">斜率 = Δy / Δx</text></svg>`;
  if(n===2)return `<svg viewBox="0 0 560 190"><line x1="55" y1="145" x2="510" y2="145" stroke="#8795aa"/><line x1="170" y1="170" x2="170" y2="25" stroke="#8795aa"/><line x1="110" y1="55" x2="350" y2="170" stroke="#3478f6" stroke-width="4"/><circle cx="170" cy="84" r="7" fill="#ff6f9a"/><circle cx="290" cy="145" r="7" fill="#27b67a"/><text x="180" y="78" font-size="13">y截距：x=0</text><text x="300" y="139" font-size="13">x截距：y=0</text></svg>`;
  if(n===3)return `<svg viewBox="0 0 560 190"><rect x="90" y="35" width="380" height="115" rx="16" fill="#eef4ff"/><text x="160" y="78" font-size="26" font-weight="700">y = m x + b</text><text x="130" y="115" font-size="16" fill="#3478f6">m：方向／變化率</text><text x="315" y="115" font-size="16" fill="#ff6f9a">b：y 截距／起點</text></svg>`;
  if(n===4)return lineSystemSvg(2,1,-1,7);
  return lineSystemSvg(2,1,2,-3);
 }
 if(u==='u06'){
  if(n===1)return halfplaneVisual();
  if(n===2)return `<svg viewBox="0 0 620 240"><polygon points="145,190 145,80 405,190" fill="#dbe8ff"/><polygon points="145,190 145,115 330,190" fill="#a9c5ff" opacity=".85"/><line x1="145" y1="80" x2="405" y2="190" stroke="#3478f6" stroke-width="3"/><line x1="145" y1="115" x2="330" y2="190" stroke="#ff6f9a" stroke-width="3"/><text x="220" y="155" font-size="16" font-weight="700">共同重疊＝可行區域</text></svg>`;
  return `<svg viewBox="0 0 620 220"><rect x="55" y="55" width="185" height="95" rx="15" fill="#fff7e8"/><text x="78" y="90" font-size="16">「總數不超過30」</text><text x="78" y="120" font-size="16">「男生至少10」</text><path d="M260 102 L355 102" stroke="#3478f6" stroke-width="4"/><polygon points="355,102 340,93 340,111" fill="#3478f6"/><rect x="375" y="55" width="190" height="95" rx="15" fill="#eef4ff"/><text x="415" y="90" font-size="19">x+y≤30</text><text x="415" y="120" font-size="19">x≥10</text></svg>`;
 }
 if(u==='u07'){
  if(n===1)return circleVisual();
  if(n===2)return `<svg viewBox="0 0 620 230"><text x="70" y="60" font-size="20">x²−6x + y²+4y −3 = 0</text><path d="M135 80 L135 150" stroke="#3478f6" stroke-width="3"/><path d="M360 80 L360 150" stroke="#ff6f9a" stroke-width="3"/><text x="70" y="178" font-size="18">(x−3)²</text><text x="300" y="178" font-size="18">(y+2)²</text><text x="430" y="178" font-size="18">=16</text><text x="165" y="215" font-size="14">x、y 各自配方 → 圓心(3,−2)、半徑4</text></svg>`;
  return `<svg viewBox="0 0 620 230"><circle cx="290" cy="115" r="75" fill="#eef4ff" stroke="#3478f6" stroke-width="3"/><circle cx="290" cy="115" r="6" fill="#3478f6"/><circle cx="360" cy="90" r="6" fill="#ff6f9a"/><line x1="290" y1="115" x2="360" y2="90" stroke="#ff6f9a" stroke-width="3"/><text x="375" y="88" font-size="14">已知圓上一點</text><text x="375" y="115" font-size="14">距離＝半徑</text><text x="200" y="210" font-size="16">由圓心＋半徑，直接建立標準式</text></svg>`;
 }
 if(u==='u08'){
  if(n===1)return `<svg viewBox="0 0 620 220"><circle cx="110" cy="110" r="55" fill="#eef4ff" stroke="#3478f6"/><line x1="65" y1="90" x2="155" y2="130" stroke="#ff6f9a" stroke-width="4"/><circle cx="305" cy="110" r="55" fill="#eef4ff" stroke="#3478f6"/><line x1="360" y1="45" x2="360" y2="175" stroke="#ff6f9a" stroke-width="4"/><circle cx="500" cy="110" r="55" fill="#eef4ff" stroke="#3478f6"/><line x1="570" y1="45" x2="570" y2="175" stroke="#ff6f9a" stroke-width="4"/><text x="70" y="200" font-size="13">d&lt;r：2交點</text><text x="275" y="200" font-size="13">d=r：相切</text><text x="470" y="200" font-size="13">d&gt;r：相離</text></svg>`;
  if(n===2)return lineCircleSvg(5);
  return `<svg viewBox="0 0 620 220"><circle cx="260" cy="110" r="70" fill="#eef4ff" stroke="#3478f6" stroke-width="3"/><line x1="140" y1="160" x2="395" y2="55" stroke="#ff6f9a" stroke-width="4"/><circle cx="205" cy="133" r="7" fill="#7c67ef"/><circle cx="330" cy="82" r="7" fill="#7c67ef"/><text x="415" y="90" font-size="16">先確定 d&lt;r</text><text x="415" y="120" font-size="16">真的要座標</text><text x="415" y="150" font-size="16" font-weight="700">才聯立求兩點</text></svg>`;
 }
 if(u==='u09'){
  if(n===1)return `<svg viewBox="0 0 620 210"><text x="70" y="65" font-size="22">5次 ÷ 2次</text><path d="M245 58 L365 58" stroke="#3478f6" stroke-width="4"/><polygon points="365,58 350,49 350,67" fill="#3478f6"/><text x="405" y="65" font-size="22">商最高3次</text><text x="70" y="125" font-size="22">餘式次數</text><path d="M245 118 L365 118" stroke="#ff6f9a" stroke-width="4"/><polygon points="365,118 350,109 350,127" fill="#ff6f9a"/><text x="405" y="125" font-size="22">一定 &lt; 2</text></svg>`;
  if(n===2)return `<svg viewBox="0 0 620 220"><text x="85" y="52" font-size="18">除以 x−2 → 用 2 做綜合除法</text><line x1="100" y1="90" x2="520" y2="90" stroke="#7f8ea5"/><text x="115" y="82" font-size="18">2 │ 1   0   0   −8</text><text x="165" y="122" font-size="18">↓   2   4    8</text><line x1="165" y1="135" x2="500" y2="135" stroke="#3478f6"/><text x="165" y="168" font-size="18">1   2   4    0</text><text x="160" y="202" font-size="14">商 x²+2x+4，餘式0</text></svg>`;
  return divisionVisual();
 }
 if(u==='u10'){
  if(n===1)return remainderVisual();
  if(n===2)return `<svg viewBox="0 0 620 210"><rect x="70" y="55" width="170" height="90" rx="15" fill="#eef4ff"/><text x="108" y="108" font-size="23">f(a)=0</text><path d="M265 100 L355 100" stroke="#27b67a" stroke-width="4"/><polygon points="355,100 340,91 340,109" fill="#27b67a"/><rect x="380" y="55" width="170" height="90" rx="15" fill="#eefaf5"/><text x="405" y="108" font-size="21">x−a 是因式</text><text x="175" y="185" font-size="15">零點、x截距、因式其實彼此相連</text></svg>`;
  return `<svg viewBox="0 0 620 220"><text x="70" y="60" font-size="18">已知餘式 → 代入特殊 x 值</text><rect x="70" y="85" width="180" height="70" rx="14" fill="#eef4ff"/><text x="105" y="128" font-size="20">f(2)=某個數</text><path d="M270 120 L370 120" stroke="#3478f6" stroke-width="4"/><polygon points="370,120 355,111 355,129" fill="#3478f6"/><rect x="395" y="85" width="155" height="70" rx="14" fill="#fff6e7"/><text x="420" y="128" font-size="20">解出參數</text></svg>`;
 }
 if(u==='u11'){
  if(n===1)return parabolaASvg(2);
  if(n===2)return vertexLabSvg(2,-1);
  if(n===3)return `<svg viewBox="0 0 620 260"><line x1="65" y1="190" x2="560" y2="190" stroke="#8795aa"/><line x1="285" y1="35" x2="285" y2="225" stroke="#8795aa"/><path d="M135 70 Q285 245 435 70" fill="none" stroke="#4779ee" stroke-width="4"/><circle cx="285" cy="124" r="7" fill="#36a46f"/><text x="300" y="122" font-size="13">y軸交點 c</text><line x1="350" y1="45" x2="350" y2="220" stroke="#b5c2d6" stroke-dasharray="6 5"/><text x="365" y="62" font-size="14">對稱軸 x=−b/(2a)</text><text x="80" y="45" font-size="18" font-weight="800">一般式 y=ax²+bx+c</text><text x="80" y="225" font-size="13">a 管開口｜b 和 a 一起管軸｜c 是 y 截距</text></svg>`;
  if(n===4)return `<svg viewBox="0 0 620 250"><line x1="60" y1="170" x2="560" y2="170" stroke="#8795aa"/><path d="M130 60 Q300 265 470 60" fill="none" stroke="#4779ee" stroke-width="4"/><circle cx="220" cy="170" r="8" fill="#ff668c"/><circle cx="380" cy="170" r="8" fill="#ff668c"/><text x="205" y="198" font-size="14">x=2</text><text x="365" y="198" font-size="14">x=3</text><text x="105" y="40" font-size="18" font-weight="800">根＝令 y=0 的 x＝x軸交點</text><text x="190" y="230" font-size="14">(x−2)(x−3)=0 ↔ 兩個交點</text></svg>`;
  if(n===5)return `<svg viewBox="0 0 620 260"><rect x="80" y="70" width="210" height="110" fill="#eef4ff" stroke="#4779ee" stroke-width="3"/><text x="100" y="55" font-size="16">周長固定40</text><text x="120" y="130" font-size="18">寬 x</text><text x="175" y="200" font-size="18">長 20−x</text><path d="M355 205 Q440 45 525 205" fill="none" stroke="#ff668c" stroke-width="4"/><circle cx="440" cy="92" r="8" fill="#7c67ef"/><text x="350" y="35" font-size="17" font-weight="800">文字 → A=x(20−x) → 頂點最大</text></svg>`;
  if(n===6)return sideParabolaSvg(1);
  return parabolaASvg(1);
 }
 if(u==='u12'){
  if(n===1)return `<svg viewBox="0 0 620 240"><line x1="70" y1="140" x2="550" y2="140" stroke="#8795aa" stroke-width="2"/><path d="M95 195 C180 40 235 220 310 140 S425 65 535 105" fill="none" stroke="#4779ee" stroke-width="4"/><circle cx="215" cy="140" r="8" fill="#ff668c"/><text x="180" y="115" font-size="16">f(r)=0</text><text x="175" y="175" font-size="14">(r,0)</text><text x="340" y="45" font-size="17" font-weight="800">根＝解＝x軸交點</text></svg>`;
  if(n===2)return `<svg viewBox="0 0 620 250"><rect x="55" y="75" width="145" height="70" rx="12" fill="#eef4ff"/><text x="72" y="116" font-size="17">三次式 f(x)</text><path d="M215 110 L285 110" stroke="#4779ee" stroke-width="4"/><polygon points="285,110 271,102 271,118" fill="#4779ee"/><rect x="300" y="75" width="145" height="70" rx="12" fill="#eefaf5"/><text x="315" y="103" font-size="15">找到根 r</text><text x="315" y="128" font-size="15">提出 (x−r)</text><path d="M460 110 L525 110" stroke="#4779ee" stroke-width="4"/><polygon points="525,110 511,102 511,118" fill="#4779ee"/><text x="180" y="195" font-size="18" font-weight="800">三次 → 除掉一次因式 → 變二次，再繼續分解</text></svg>`;
  if(n===3)return cubicRootSvg(0);
  if(n===4)return `<svg viewBox="0 0 620 260"><line x1="70" y1="145" x2="550" y2="145" stroke="#8795aa"/><circle cx="190" cy="145" r="7" fill="#3478f6"/><circle cx="320" cy="145" r="7" fill="#3478f6"/><circle cx="450" cy="145" r="7" fill="#3478f6"/><text x="178" y="172" font-size="13">−2</text><text x="314" y="172" font-size="13">1</text><text x="444" y="172" font-size="13">3</text><text x="120" y="105" font-size="22" fill="#d95368">−</text><text x="245" y="105" font-size="22" fill="#2f9b68">＋</text><text x="375" y="105" font-size="22" fill="#d95368">−</text><text x="500" y="105" font-size="22" fill="#2f9b68">＋</text><text x="105" y="55" font-size="17" font-weight="800">根把數線切段；每段逐因式判號</text></svg>`;
  if(n===5)return multiplicityLabSvg("double");
  if(n===6)return `<svg viewBox="0 0 620 250"><text x="70" y="52" font-size="18" font-weight="800">文字中的臨界值 → 根 → 因式 → 不等式</text><rect x="75" y="80" width="95" height="55" rx="10" fill="#eef4ff"/><text x="94" y="113" font-size="15">x=2</text><rect x="195" y="80" width="95" height="55" rx="10" fill="#eef4ff"/><text x="214" y="113" font-size="15">x=5</text><rect x="315" y="80" width="95" height="55" rx="10" fill="#eef4ff"/><text x="334" y="113" font-size="15">x=8</text><path d="M430 107 L500 107" stroke="#4779ee" stroke-width="4"/><polygon points="500,107 486,99 486,115" fill="#4779ee"/><text x="80" y="180" font-size="16">f(x)=a(x−2)(x−5)(x−8)</text><text x="80" y="212" font-size="14">題目說『正值才有效』 → 解 f(x)&gt;0</text></svg>`;
  return signVisual();
 }
 return numberSetVisual();
}
function priorVisual(id){if(id==='u05')return `<svg viewBox="0 0 620 230"><line x1="55" y1="180" x2="565" y2="180" stroke="#8290a7"/><line x1="130" y1="205" x2="130" y2="30" stroke="#8290a7"/><line x1="130" y1="145" x2="370" y2="65" stroke="#3478f6" stroke-width="4"/><circle cx="130" cy="145" r="6" fill="#ff6f9a"/><circle cx="190" cy="125" r="6" fill="#3478f6"/><text x="390" y="75" font-size="18" font-weight="700">國中：y=2x+1</text><text x="390" y="110" font-size="14">(0,1) 是 y 截距</text><text x="390" y="135" font-size="14">向右1、向上2 → 斜率2</text><text x="390" y="170" font-size="14" fill="#66748c">高中：再加入一般式、截距、交點與聯立解</text></svg>`;if(id==='u03')return absSvg(0,3);if(id==='u04')return `<svg viewBox="0 0 620 210"><text x="70" y="55" font-size="22">2¹=2</text><text x="210" y="55" font-size="22">2²=4</text><text x="350" y="55" font-size="22">2³=8</text><path d="M120 75 L440 75" stroke="#3478f6" stroke-width="3"/><text x="145" y="120" font-size="18">國中乘方：重複乘法</text><text x="145" y="155" font-size="18">高中：反過來問「幾次方？」→ 對數</text></svg>`;if(id==='u07')return `<svg viewBox="0 0 620 220"><path d="M160 170 L160 70 L300 170 Z" fill="#eef4ff" stroke="#3478f6" stroke-width="3"/><text x="175" y="120" font-size="16">3</text><text x="225" y="188" font-size="16">4</text><text x="240" y="112" font-size="16">5</text><text x="350" y="100" font-size="19" font-weight="700">3²+4²=5²</text><text x="350" y="140" font-size="15">距離公式 → 圓方程式</text></svg>`;if(id==='u09')return `<svg viewBox="0 0 620 190"><text x="90" y="70" font-size="24">17 = 5 × 3 + 2</text><text x="90" y="125" font-size="18">被除數 = 除數 × 商 + 餘數</text><text x="350" y="125" font-size="18" fill="#3478f6">→ 多項式完全同結構</text></svg>`;return `<div class="priorReuse">${renderVisual(LESSONS[id].visual)}</div>`}
function allQuestions(){return Object.values(TESTS).flat()}
function getUnitQuestions(id){return allQuestions().filter(q=>q.unit===id)}
function modeLabel(m){return {foundation:"基礎",standard:"標準",literacy:"素養",challenge:"挑戰"}[m]||m}
function modeDesc(m){return {foundation:"先確認觀念有沒有站穩",standard:"接近一般段考基本題",literacy:"把生活文字翻成數學模型",challenge:"兩步以上整合，目標往中上"}[m]||""}
function setPracticeMode(mode){practiceMode=mode;refreshPractice()}
function renderModePills(){document.querySelectorAll('.modePill').forEach(b=>{const m=b.dataset.mode,un=modeUnlocked(currentUnit,m),s=modeStat(currentUnit,m),n=(PRACTICE[currentUnit]?.[m]||[]).length;b.classList.toggle('on',m===practiceMode);b.classList.toggle('locked',!un);b.innerHTML=`${modeLabel(m)} <small>${n}題</small>${s.t?` <small>${s.c}/${s.t}</small>`:''}${!un?' <span class="previewEye">👁</span>':''}`})}
function refreshPractice(){practiceSet=[...(PRACTICE[currentUnit]?.[practiceMode]||[])].sort(()=>Math.random()-.5);practiceIndex=0;renderPractice()}
function previewQuestionHtml(q,i){
 let options="";
 if(q.type==="single"||q.type==="multi")options=`<div class="previewOptions">${(q.options||[]).map((o,j)=>`<div>${String.fromCharCode(65+j)}. ${o}</div>`).join("")}</div>`;
 if(q.type==="fill")options=`<div class="previewBlank">＿＿＿＿＿＿（填充題）</div>`;
 return `<article class="previewQuestion"><div class="previewNo">${i+1}</div><div><b>${q.text}</b>${options}</div></article>`
}
function renderLockedPreview(mode,need){
 const qs=PRACTICE[currentUnit]?.[mode]||[];
 return `<div class="practiceGate previewGate"><div class="previewBadge">👁 題庫預覽</div><h4>${modeLabel(mode)}關尚未正式解鎖，但可以先看會考什麼</h4><p>${need}。預覽不顯示答案、不能作答，也不計入掌握度。</p><div class="previewMeta">${modeLabel(mode)}｜共 ${qs.length} 題</div><div class="previewList">${qs.map(previewQuestionHtml).join("")}</div><button class="btn" onclick="goTypes()">回題型教學，開始解鎖</button></div>`
}
function renderPractice(){
 const el=$("practiceArea"),tc=typeCount(currentUnit),d=CONCEPTS[currentUnit]||{};renderModePills();
 const unlocked=modeUnlocked(currentUnit,practiceMode);
 if(!unlocked){
  const need=practiceMode==='foundation'?'先學會至少 1 種核心題型':practiceMode==='standard'?`至少先學會 ${d.min_types||2} 種核心題型`:practiceMode==='literacy'?'先把本單元核心題型全部學完':'先完成全部題型，且標準題正確率至少 2/3';
  el.innerHTML=renderLockedPreview(practiceMode,need);return
 }
 if(!practiceSet.length){el.innerHTML="<p>這個模式目前沒有題目。</p>";return}
 const q=practiceSet[practiceIndex];let h=`<div class="modeIntro"><b>${modeLabel(practiceMode)}｜${modeDesc(practiceMode)}</b><span>${practiceIndex+1}/${practiceSet.length}</span></div><div class="qcount">${q.level||modeLabel(practiceMode)}｜本輪答對會累積星級條件</div><div class="question">${q.text}</div>`;
 if(q.type==="single")h+=q.options.map((o,i)=>`<label class="option"><input type="radio" name="miniQ" value="${i}"> ${String.fromCharCode(65+i)}. ${o}</label>`).join("");
 if(q.type==="multi")h+=q.options.map((o,i)=>`<label class="option"><input type="checkbox" name="miniQ" value="${i}"> ${String.fromCharCode(65+i)}. ${o}</label>`).join("");
 if(q.type==="fill")h+=`<input id="miniFill" style="width:100%;padding:9px;border:1px solid #dce5f2;border-radius:10px" placeholder="輸入答案">`;
 h+=`<label style="display:block;margin-top:8px;font-size:12px;color:#a96d13"><input type="checkbox" id="miniUncertain"> 我其實不太確定／是猜的</label><div class="qactions"><button class="btn" onclick="submitMini()">送出答案</button><button class="btn2" onclick="showHint()">提示</button></div><div class="hint" id="miniHint" style="display:none">${q.quick||LESSONS[currentUnit].quick}</div><div class="feedback" id="miniFeedback"></div>`;
 el.innerHTML=h;
}
function normalize(x){return String(x).trim().replace(/\s+/g,"").replace(/−/g,"-").replace(/×/g,"*").toLowerCase()}
function submitMini(){
 const q=practiceSet[practiceIndex];let ok=false,user=null;
 if(q.type==="single"){const x=document.querySelector('input[name="miniQ"]:checked');user=x?Number(x.value):null;ok=user===q.answer}
 if(q.type==="multi"){const xs=[...document.querySelectorAll('input[name="miniQ"]:checked')].map(x=>Number(x.value)).sort();const a=[...q.answer].sort();ok=xs.length===a.length&&xs.every((x,i)=>x===a[i]);user=xs}
 if(q.type==="fill"){user=$("miniFill").value;ok=(q.answer||[]).map(normalize).includes(normalize(user))}
 const unc=$("miniUncertain").checked,f=$("miniFeedback");f.className="feedback show "+(ok?"good":"bad");f.innerHTML=`<b>${ok?"✅ 這題過關":"🟠 這題先補一下"}</b><br>${q.explain||""}<br><b>快解：</b>${q.quick||LESSONS[currentUnit].quick}`;
 let a=STATE.attempts[currentUnit]||{c:0,t:0};a.t++;if(ok)a.c++;STATE.attempts[currentUnit]=a;STATE.modeAttempts[currentUnit]=STATE.modeAttempts[currentUnit]||{};let ms=STATE.modeAttempts[currentUnit][practiceMode]||{c:0,t:0};ms.t++;if(ok)ms.c++;STATE.modeAttempts[currentUnit][practiceMode]=ms;if(unc)STATE.uncertain[currentUnit]=true;if(ok&&!unc)STATE.xp+=practiceMode==='challenge'?18:practiceMode==='literacy'?14:practiceMode==='standard'?12:8;saveState(STATE);rewardStars(currentUnit);renderUnitTop();renderSidebar();renderBoost();renderModePills();
 setTimeout(()=>{if(practiceIndex<practiceSet.length-1){practiceIndex++;renderPractice()}else{if(practiceMode==='foundation')STATE.completed[currentUnit]=true;saveState(STATE);rewardStars(currentUnit);renderUnitTop();renderSidebar();renderPractice()}},ok?900:1500)
}
function showHint(){$("miniHint").style.display="block"}
function renderBoost(){const l=LESSONS[currentUnit],tc=typeCount(currentUnit),st=unitStars(currentUnit),d=CONCEPTS[currentUnit]||{};$("boostList").innerHTML=`<li>2分鐘：看圖＋讀1個重要名詞</li><li>3分鐘：學1種題型（目前 ${tc.done}/${tc.total}）</li><li>3分鐘：做目前解鎖的分級闖關</li><li>2分鐘：只看快解與陷阱</li>`;$("xpRingText").innerHTML=`${starText(st)}<br>XP ${STATE.xp}`;const ring=document.querySelector('.xpRing');if(ring)ring.style.background=`conic-gradient(var(--green) 0 ${Math.max(15,st/3*100)}%,#e7edf7 ${Math.max(15,st/3*100)}%)`}
function startBoost(){currentTab="visual";document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("on",b.dataset.tab==="visual"));renderLesson();window.scrollTo({top:220,behavior:"smooth"})}
function scrollToTop(){window.scrollTo({top:0,behavior:"smooth"})}
function focusWeak(){const weak=UNITS.slice().sort((a,b)=>mastery(a.id)-mastery(b.id))[0];if(weak)selectUnit(weak.id)}
function showMap(){
 const ex=UNITS.find(x=>x.id===currentUnit).exam,m=MAPS[String(ex)];$("modalTitle").textContent=m.title;$("modalBody").innerHTML=`<div style="display:grid;gap:10px;margin-top:12px">${m.nodes.map((n,i)=>`<button class="btn2" style="text-align:left;padding:14px" onclick="closeModal();selectUnit('${n[2]}')"><b>${i+1}. ${n[0]}</b><br><span style="font-size:12px;color:#65738b">${n[1]}</span></button>`).join("")}</div>`;$("modal").classList.add("open")
}
function showExamPicker(){
 $("modalTitle").textContent="正式模考";$("modalBody").innerHTML=`<div class="conceptGrid" style="margin-top:12px">${[0,1,2].map(ex=>`<div class="conceptCard"><h4>${examName(ex)}</h4><p style="font-size:12px;color:#66748c">${RANGES[ex]}</p><div class="exampleBtns"><button class="btn" onclick="openExam('${ex}A')">A卷</button><button class="btn2" onclick="openExam('${ex}B')">B卷</button></div></div>`).join("")}</div>`;$("modal").classList.add("open")
}
function openExam(code){
 const qs=TESTS[code];$("modalTitle").textContent=`${examName(Number(code[0]))}｜${code[1]}卷`;
 $("modalBody").innerHTML=`<div class="examCard"><b>20題／100分</b><p style="font-size:12px;color:#66748c">先完成客觀與填充；非選題可看參考答案後自評。</p></div>${qs.map((q,i)=>examQuestion(q,i)).join("")}<button class="btn" onclick="gradeExam('${code}')">交卷</button>`;
}
function examQuestion(q,i){
 let h=`<div class="examQ" data-id="${q.id}"><div style="font-size:11px;color:#65738b">${i+1}. ${q.level||""}｜${q.points}分</div><div style="font-weight:700;margin:4px 0 7px">${q.text}</div>`;
 if(q.type==="single")h+=q.options.map((o,j)=>`<label class="option"><input type="radio" name="ex_${q.id}" value="${j}"> ${String.fromCharCode(65+j)}. ${o}</label>`).join("");
 else if(q.type==="multi")h+=q.options.map((o,j)=>`<label class="option"><input type="checkbox" name="ex_${q.id}" value="${j}"> ${String.fromCharCode(65+j)}. ${o}</label>`).join("");
 else if(q.type==="fill")h+=`<input id="ex_${q.id}" style="width:100%;padding:9px;border:1px solid #dce5f2;border-radius:10px">`;
 else h+=`<textarea id="ex_${q.id}" style="width:100%;min-height:90px;border:1px solid #dce5f2;border-radius:10px;padding:9px" placeholder="寫下過程"></textarea><select id="self_${q.id}" style="margin-top:6px;padding:7px"><option value="0">自評：未完成</option><option value="6">部分掌握 6分</option><option value="12">完整掌握 12分</option></select>`;
 return h+"</div>";
}
function gradeExam(code){
 let total=0,stats={};for(const q of TESTS[code]){let earned=0;if(q.type==="single"){const x=document.querySelector(`input[name="ex_${q.id}"]:checked`);if(x&&Number(x.value)===q.answer)earned=q.points}else if(q.type==="multi"){const xs=[...document.querySelectorAll(`input[name="ex_${q.id}"]:checked`)].map(x=>Number(x.value)).sort(),a=[...q.answer].sort();if(xs.length===a.length&&xs.every((x,i)=>x===a[i]))earned=q.points}else if(q.type==="fill"){const v=document.getElementById("ex_"+q.id).value;if((q.answer||[]).map(normalize).includes(normalize(v)))earned=q.points}else earned=Number(document.getElementById("self_"+q.id).value);total+=earned;let s=stats[q.unit]||{e:0,p:0};s.e+=earned;s.p+=q.points;stats[q.unit]=s}
 STATE.xp+=Math.round(total/5);for(const [id,s] of Object.entries(stats)){let a=STATE.attempts[id]||{c:0,t:0};a.c+=s.e;a.t+=s.p;STATE.attempts[id]=a}saveState(STATE);$("modalBody").insertAdjacentHTML("afterbegin",`<div class="examResult"><b>總分 ${total}/100</b><br>${total>=80?"已進入中上區間，下一步練穩定與速度。":total>=60?"基礎有了，優先救低分單元。":"先不要刷更多整卷，回單元把概念補起來。"}</div>`);renderSidebar();renderUnitTop();renderBoost()
}
function closeModal(){$("modal").classList.remove("open")}
window.addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});

function toggleMobileNav(){
 const s=document.querySelector(".sidebar"),shade=document.getElementById("mobileShade"),btn=document.getElementById("mobileMenuBtn");
 if(!s)return;
 const open=!s.classList.contains("mobileOpen");
 s.classList.toggle("mobileOpen",open);
 shade?.classList.toggle("show",open);
 if(btn){btn.setAttribute("aria-expanded",open?"true":"false");btn.setAttribute("aria-label",open?"關閉章節選單":"開啟章節選單")}
 document.body.style.overflow=open?"hidden":"";
}
function closeMobileNav(){
 const s=document.querySelector(".sidebar"),shade=document.getElementById("mobileShade"),btn=document.getElementById("mobileMenuBtn");
 s?.classList.remove("mobileOpen");shade?.classList.remove("show");
 if(btn){btn.setAttribute("aria-expanded","false");btn.setAttribute("aria-label","開啟章節選單")}
 document.body.style.overflow="";
}
window.addEventListener("resize",()=>{if(window.innerWidth>820)closeMobileNav()});

init();
