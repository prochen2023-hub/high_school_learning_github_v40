
let UNITS=[],LESSONS={},TYPELESSONS={},CONCEPTS={},PRACTICE={},MAPS={},QUESTFLOW={},TESTS={},RANGES=[],currentUnit="u03",currentTab="visual",practiceSet=[],practiceIndex=0,practiceMode="foundation",viewMode="quest",questReviewId=null,questCursor=null;
const stateKey="math49_state",legacyStateKey="math48_state",legacyStateKey2="math47_state";
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
   <div class="questHeroCard">
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
  <div class="questVisualCard"><div class="questPrompt"><b>先看／先玩30秒</b><span>不用先讀完整章。</span></div><div class="simpleGenericVisual">${renderVisual(l.visual)}</div></div>
  <div class="questCoach"><span>🧠 高手一句話</span><b>${l.quick}</b></div>
  ${q?simpleQuestQuestion(q):""}
  <button class="quietLink" onclick="setViewMode('full')">我想看完整概念、題型與快解</button>
 </section>`
}
function simpleQuestQuestion(q){
 let opts="";
 if(q.type==="single")opts=q.options.map((o,i)=>`<label><input type="radio" name="simpleQ" value="${i}"><span>${String.fromCharCode(65+i)}. ${o}</span></label>`).join("");
 else if(q.type==="multi")opts=q.options.map((o,i)=>`<label><input type="checkbox" name="simpleQ" value="${i}"><span>${String.fromCharCode(65+i)}. ${o}</span></label>`).join("");
 else opts=`<input id="simpleFill" class="simpleFill" placeholder="輸入答案">`;
 return `<div class="questCheck"><div class="questCheckHead"><span>⚔️ 今天只做1題</span><b>${q.text}</b></div><div class="questChoices">${opts}</div><button class="questPrimary" onclick="checkSimpleQuest()">送出</button><div class="questFeedback" id="simpleQuestFb"></div></div>`
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

function visualPane(u,l){const c=typeCount(currentUnit),d=CONCEPTS[currentUnit]||{},st=unitStars(currentUnit);return `<div class="learnRoute"><span class="routeChip now">1 看懂概念</span><span class="routeChip ${c.done?"done":""}">2 學題型 ${c.done}/${c.total}</span><span class="routeChip">3 分級闖關</span><span class="routeChip">4 快解加速</span></div><div class="minimumCard"><div><b>🎯 本單元最低要學會</b><p>${d.minimum||l.mission}</p></div><div class="minimumStars"><b>${starText(st)}</b><small>目前 ${st}/3 星</small><div class="starRewardNote">⭐+20 XP　⭐⭐+30 XP　⭐⭐⭐+50 XP</div></div></div><div class="mustGrid">${(d.must_master||[]).map(x=>`<div class="mustItem"><span class="mustCheck">✓</span><span>${x}</span></div>`).join("")}</div><div class="sectionHead"><span class="num pink">1</span><h3>${l.hook}</h3></div><div class="conceptGrid"><div class="visualBox">${renderVisual(l.visual)}</div><div class="conceptCard"><h4>先把核心意思講清楚 <span class="deepCount">${(d.deep||[]).length}個關鍵</span></h4>${(d.deep||[]).map(x=>`<p class="deepP">${x}</p>`).join("")}<div class="stepList">${l.steps.map((s,i)=>`<div class="step"><span class="stepNo">${i+1}</span><div><b>${s[0]}</b><p>${s[1]}</p></div></div>`).join("")}</div></div></div><div class="sectionHead" style="margin-top:14px"><span class="num purple">2</span><h3>重要名詞：定義＋一個最短例子</h3></div><div class="termGrid">${(d.terms||[]).map(t=>`<div class="termCard"><b>${t[0]}</b><p>${t[1]}</p>${t[2]?`<div class="termExample">例｜${t[2]}</div>`:""}</div>`).join("")}</div><div class="starRoad"><div><b>⭐ 1星｜基本會做</b><span>達最低題型數＋基礎闖關至少 2/3</span><span class="starRewardNote">達成獎勵 +20 XP</span></div><div><b>⭐⭐ 2星｜段考基本分穩定</b><span>學完全部核心題型＋標準題至少 2/3</span><span class="starRewardNote">再獎勵 +30 XP</span></div><div><b>⭐⭐⭐ 3星｜往中上前進</b><span>素養與挑戰各至少 2/3</span><span class="starRewardNote">再獎勵 +50 XP</span></div></div>`}
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
  u11t4:`<svg viewBox="0 0 620 240"><line x1="60" y1="175" x2="560" y2="175" stroke="#8795aa"/><path d="M145 45 Q310 260 475 45" fill="none" stroke="#3478f6" stroke-width="4"/><circle cx="210" cy="175" r="7" fill="#ff6f9a"/><circle cx="410" cy="175" r="7" fill="#ff6f9a"/><text x="205" y="205" font-size="13">根1</text><text x="405" y="205" font-size="13">根2</text><text x="190" y="32" font-size="17">Δ&gt;0 → 與 x 軸交兩點</text></svg>`,
  u12t4:`<svg viewBox="0 0 620 240"><line x1="60" y1="125" x2="560" y2="125" stroke="#8795aa"/><path d="M70 65 C150 65 170 185 250 185 S360 65 440 65 S510 185 555 185" fill="none" stroke="#3478f6" stroke-width="4"/><text x="95" y="55" font-size="15" fill="#27a66f">f(x)&gt;0</text><text x="245" y="210" font-size="15" fill="#d45454">f(x)&lt;0</text><text x="420" y="55" font-size="15" fill="#27a66f">看圖在 x 軸上／下</text></svg>`
 }; return V[id]||""
}
function typeCard(t,i){
 const ok=!!masteredTypes(currentUnit)[t.id],isU05=t.id.startsWith("u05");
 const visual=u05InteractiveVisual(t.id)||advancedTypeVisual(t.id)||typeVisual(t.id);
 const diagram=isU05?`<div class="typeDiagram interactiveStage" id="diagram_${t.id}"><div class="interactiveToolbar"><b>🎛️ 互動實驗室｜先拖、先猜，再看結果</b><button class="expandInteractiveBtn" onclick="toggleInteractiveStage('${t.id}',this)">⛶ 放大互動</button></div><div class="interactiveCanvas">${visual}</div><div class="controlHint">提示：拖拉時先預測圖會往哪裡動。能預測，代表你真的在理解，不是在背。</div></div>`:`<div class="typeDiagram">${visual}</div>`;
 return `<article class="typeCard ${ok?"mastered":""} ${isU05?"u05Wide":""}" id="type_${t.id}"><div class="typeHead" onclick="toggleType('${t.id}')"><div><h3>${t.name}</h3><small>${t.meaning}</small></div><span class="typeBadge ${ok?"ok":""}">${ok?"✓ 已懂這型":"先學這型"}</span></div><div class="typeBody ${i===0?"":"hidden"}" id="typebody_${t.id}"><div class="signalGrid"><div class="signalBox look"><b>👀 看到什麼？</b><p>${t.signal}</p></div><div class="signalBox think"><b>🧠 馬上想到什麼？</b><p>${t.meaning}</p></div></div>${diagram}<div class="recipe">${t.steps.map((s,j)=>`<div class="recipeStep"><span>${j+1}</span><p>${s}</p></div>`).join("")}</div><div class="worked"><div class="workedQ">📘 跟著做：${t.example.question}</div><div class="workedSteps">${t.example.steps.map((s,j)=>`<div class="workedStep ${j===0?"show":""}">${j+1}. ${s}</div>`).join("")}</div><div class="exampleBtns"><button class="btn" onclick="nextWorked('${t.id}')">下一步</button><button class="btn2" onclick="showWhy('${t.id}')">為什麼這樣做？</button></div><div class="whyBox" id="why_${t.id}"><b>答案：${t.example.answer}</b><br>${t.example.why}</div></div><div class="variationBox"><b>🔄 變形會怎麼考：</b>${t.variation}</div>${microCheckHtml(t,ok)}</div></article>`
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
function circleVisual(){return `<svg viewBox="0 0 620 280"><circle cx="310" cy="140" r="90" fill="#eaf1ff" stroke="#3478f6" stroke-width="4"/><circle cx="310" cy="140" r="6" fill="#3478f6"/><line x1="310" y1="140" x2="390" y2="100" stroke="#ef6687" stroke-width="3"/><text x="325" y="160" font-size="16">(h,k)</text><text x="375" y="92" font-size="16">r</text><text x="155" y="260" font-size="21" font-weight="700">(x−h)²+(y−k)²=r²</text></svg>`}
function lineCircleVisual(){return `<div id="lcBox">${lineCircleSvg(6)}</div><div class="controlRow"><label>直線 x = <span class="valueBadge" id="lineX">6</span></label><input type="range" min="0" max="8" step=".5" value="6" oninput="updateLC(this.value)"><span class="valueBadge" id="lcState">相離</span></div>`}
function lineCircleSvg(xv){const cx=270,cy=140,r=85,scale=17,line=cx+xv*scale;const d=Math.abs(xv),st=d<5?"交兩點":d==5?"相切":"相離";return `<svg viewBox="0 0 620 280"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#edf4ff" stroke="#3478f6" stroke-width="4"/><line x1="${line}" y1="35" x2="${line}" y2="245" stroke="#ef6687" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="6" fill="#3478f6"/><text x="380" y="55" font-size="17">半徑 r=5</text><text x="380" y="85" font-size="17">距離 d=${d}</text><text x="380" y="120" font-size="20" font-weight="700">${st}</text></svg>`}
window.updateLC=v=>{const x=Number(v),d=Math.abs(x),st=d<5?"交兩點":d==5?"相切":"相離";$("lineX").textContent=x;$("lcState").textContent=st;$("lcBox").innerHTML=lineCircleSvg(x)}
function divisionVisual(){return `<svg viewBox="0 0 620 260"><rect x="45" y="65" width="150" height="70" rx="15" fill="#eaf1ff"/><text x="85" y="107" font-size="20">除式 × 商</text><text x="230" y="108" font-size="28">＋</text><rect x="285" y="65" width="135" height="70" rx="15" fill="#eefaf5"/><text x="330" y="108" font-size="20">餘式</text><text x="455" y="108" font-size="28">＝</text><rect x="500" y="65" width="90" height="70" rx="15" fill="#fff5e4"/><text x="512" y="108" font-size="19">被除式</text><text x="150" y="205" font-size="18" font-weight="700">餘式次數一定 &lt; 除式次數</text></svg>`}
function remainderVisual(){return `<svg viewBox="0 0 620 260"><rect x="65" y="70" width="170" height="90" rx="16" fill="#eaf1ff"/><text x="105" y="115" font-size="24">f(x)</text><text x="96" y="145" font-size="15">除以 x−a</text><path d="M255 115 L390 115" stroke="#3478f6" stroke-width="4"/><polygon points="390,115 374,106 374,124" fill="#3478f6"/><rect x="410" y="70" width="150" height="90" rx="16" fill="#edf9f4"/><text x="444" y="115" font-size="22">餘式 f(a)</text><text x="175" y="220" font-size="18" font-weight="700">若 f(a)=0 → x−a 是因式</text></svg>`}
function parabolaVisual(){return `<div id="paraBox">${parabolaSvg(1,0,0)}</div><div class="controlRow"><label>a <span class="valueBadge" id="pa">1</span></label><input id="paR" type="range" min="-3" max="3" step=".5" value="1" oninput="updatePara()"><label>h <span class="valueBadge" id="ph">0</span></label><input id="phR" type="range" min="-3" max="3" value="0" oninput="updatePara()"><label>k <span class="valueBadge" id="pk">0</span></label><input id="pkR" type="range" min="-3" max="3" value="0" oninput="updatePara()"></div>`}
function parabolaSvg(a,h,k){let pts=[];for(let x=-5;x<=5;x+=.2){let y=a*Math.pow(x-h,2)+k;let sx=310+x*45,sy=150-y*18;if(sy>-80&&sy<350)pts.push(`${sx},${sy}`)}return `<svg viewBox="0 0 620 300"><line x1="40" y1="150" x2="580" y2="150" stroke="#8da0bf"/><line x1="310" y1="25" x2="310" y2="275" stroke="#8da0bf"/><polyline points="${pts.join(" ")}" fill="none" stroke="#3478f6" stroke-width="4"/><circle cx="${310+h*45}" cy="${150-k*18}" r="7" fill="#ef6687"/><text x="360" y="45" font-size="18" font-weight="700">y=${a}(x−${h})²+${k}</text></svg>`}
window.updatePara=()=>{const a=Number($("paR").value),h=Number($("phR").value),k=Number($("pkR").value);$("pa").textContent=a;$("ph").textContent=h;$("pk").textContent=k;$("paraBox").innerHTML=parabolaSvg(a,h,k)}
function signVisual(){return `<svg viewBox="0 0 620 270"><line x1="65" y1="140" x2="560" y2="140" stroke="#7f8ea5" stroke-width="2"/><circle cx="220" cy="140" r="7" fill="#3478f6"/><circle cx="420" cy="140" r="7" fill="#3478f6"/><text x="203" y="170" font-size="15">−2</text><text x="414" y="170" font-size="15">1</text><text x="125" y="105" font-size="24" fill="#27b67a">＋</text><text x="310" y="105" font-size="24" fill="#e25858">−</text><text x="500" y="105" font-size="24" fill="#27b67a">＋</text><text x="115" y="225" font-size="19" font-weight="700">(x+2)(x−1)&gt;0 → x&lt;−2 或 x&gt;1</text></svg>`}



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
  if(n===1)return parabolaSvg(1,2,1);
  if(n===2)return `<svg viewBox="0 0 620 230"><text x="80" y="55" font-size="22">y=2x²−8x+3</text><text x="80" y="95" font-size="18">對稱軸 x=−b/(2a)=2</text><path d="M310 115 L310 205" stroke="#ff6f9a" stroke-dasharray="6 6" stroke-width="3"/><path d="M175 75 Q310 230 445 75" fill="none" stroke="#3478f6" stroke-width="4"/><circle cx="310" cy="190" r="7" fill="#ff6f9a"/><text x="330" y="195" font-size="14">頂點</text></svg>`;
  return `<svg viewBox="0 0 620 230"><path d="M130 190 Q310 20 490 190" fill="none" stroke="#3478f6" stroke-width="4"/><circle cx="310" cy="65" r="8" fill="#ff6f9a"/><text x="330" y="60" font-size="16">最高點＝最大值</text><text x="180" y="215" font-size="14">收入、軌跡、人氣模型常把頂點翻成實際意義</text></svg>`;
 }
 if(u==='u12'){
  if(n===1)return `<svg viewBox="0 0 620 210"><line x1="65" y1="115" x2="555" y2="115" stroke="#7e8da5"/><circle cx="210" cy="115" r="7" fill="#3478f6"/><circle cx="410" cy="115" r="11" fill="none" stroke="#ff6f9a" stroke-width="4"/><text x="180" y="155" font-size="14">單根：常換號</text><text x="375" y="155" font-size="14">二重根：常不換號</text><text x="165" y="55" font-size="18">根的「重數」會影響符號是否翻轉</text></svg>`;
  if(n===2)return signVisual();
  return `<svg viewBox="0 0 620 220"><path d="M80 120 C170 65 220 120 300 120 C390 120 420 70 540 115" fill="none" stroke="#3478f6" stroke-width="4"/><line x1="300" y1="70" x2="300" y2="165" stroke="#ff6f9a" stroke-dasharray="5 5"/><text x="240" y="190" font-size="15">偶重根：碰到 x 軸又回去，符號不換</text></svg>`;
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
