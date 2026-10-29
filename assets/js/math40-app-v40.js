
let UNITS=[],LESSONS={},MAPS={},TESTS={},RANGES=[],currentUnit="u03",currentTab="visual",practiceSet=[],practiceIndex=0;
const stateKey="math40_state";
const $=id=>document.getElementById(id);
function loadState(){try{return JSON.parse(localStorage.getItem(stateKey))||{xp:0,attempts:{},completed:{},uncertain:{}}}catch(e){return {xp:0,attempts:{},completed:{},uncertain:{}}}}
function saveState(s){localStorage.setItem(stateKey,JSON.stringify(s))}
let STATE=loadState();

async function getJSON(u){const r=await fetch(u,{cache:"no-store"});if(!r.ok)throw new Error(u+" "+r.status);return r.json()}
async function init(){
 try{
  const [cfg,units,lessons,maps,e1,e2,e3]=await Promise.all([
   getJSON("data/math/config.json"),getJSON("data/math/units.json"),getJSON("data/math/visual_lessons.json"),
   getJSON("data/math/mindmaps.json"),getJSON("data/math/exam1.json"),getJSON("data/math/exam2.json"),getJSON("data/math/exam3.json")
  ]);
  RANGES=cfg.ranges;UNITS=units;LESSONS=lessons;MAPS=maps;
  TESTS={"0A":e1.A,"0B":e1.B,"1A":e2.A,"1B":e2.B,"2A":e3.A,"2B":e3.B};
  bindTabs();bindSearch();renderSidebar();selectUnit("u03");
 }catch(err){document.body.innerHTML=`<div style="max-width:760px;margin:70px auto;font-family:sans-serif;background:#fff;padding:24px;border-radius:16px"><h1>資料載入失敗</h1><p>請用 GitHub Pages 或 START_LOCAL.bat 開啟。</p><pre>${err}</pre></div>`}
}
function bindTabs(){document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{currentTab=b.dataset.tab;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("on",x===b));renderLesson()}))}
function bindSearch(){$("topSearch").addEventListener("keydown",e=>{if(e.key==="Enter"){const q=e.target.value.trim().toLowerCase();const u=UNITS.find(x=>(x.title+" "+x.core+" "+x.old).toLowerCase().includes(q));if(u)selectUnit(u.id)}})}
function examName(n){return ["第一次段考","第二次段考","第三次段考"][n]||""}
function mastery(id){const a=STATE.attempts[id]||{c:0,t:0};let p=a.t?Math.round(a.c/a.t*85):0;if(STATE.completed[id])p+=10;if(STATE.uncertain[id])p-=5;return Math.max(0,Math.min(100,p))}
function masteryClass(p){return p>=80?"ok":p>=55?"mid":p>0?"low":""}
function renderSidebar(){
 $("sideUnits").innerHTML=[0,1,2].map(ex=>`<div><div class="examTitle">▣ ${examName(ex)}</div>${UNITS.filter(u=>u.exam===ex).map(u=>{const p=mastery(u.id);return `<div class="unitLink ${u.id===currentUnit?"on":""}" onclick="selectUnit('${u.id}')"><span class="dot ${masteryClass(p)}"></span><span class="unitName">${u.title.replace(/^\d+\.\s*/,"")}</span><span class="unitPct">${p?`${p}%`:""}</span></div>`}).join("")}</div>`).join("")
}
function selectUnit(id){currentUnit=id;currentTab="visual";document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("on",b.dataset.tab==="visual"));renderSidebar();renderUnitTop();renderLesson();refreshPractice();renderBoost();window.scrollTo({top:84,behavior:"smooth"})}
function renderUnitTop(){
 const u=UNITS.find(x=>x.id===currentUnit),l=LESSONS[currentUnit],p=mastery(currentUnit);
 $("unitExam").textContent=examName(u.exam);$("unitTitle").textContent=u.title;$("unitMission").textContent=l.mission;$("masteryPct").textContent=p+"%";
 $("heroTitle").textContent=l.hook.split("。")[0]+"。";$("heroHook").textContent=l.hook;$("heroMastery").textContent="掌握度 "+p+"%";$("heroXp").textContent="XP "+STATE.xp;$("xpRingText").innerHTML="XP<br>"+STATE.xp;
}
function renderLesson(){
 const u=UNITS.find(x=>x.id===currentUnit),l=LESSONS[currentUnit],el=$("lessonPane");
 if(currentTab==="visual")el.innerHTML=visualPane(u,l);
 if(currentTab==="quick")el.innerHTML=quickPane(u,l);
 if(currentTab==="example")el.innerHTML=examplePane(u,l);
 if(currentTab==="prior")el.innerHTML=priorPane(u,l);
}
function visualPane(u,l){return `<div class="sectionHead"><span class="num pink">1</span><h3>${l.hook}</h3></div><div class="conceptGrid"><div class="visualBox">${renderVisual(l.visual)}</div><div class="conceptCard"><h4>這單元你要抓住什麼？</h4><div class="stepList">${l.steps.map((s,i)=>`<div class="step"><span class="stepNo">${i+1}</span><div><b>${s[0]}</b><p>${s[1]}</p></div></div>`).join("")}</div></div></div><div class="sectionHead" style="margin-top:14px"><span class="num green">2</span><h3>把圖變成考場步驟</h3></div><div class="conceptGrid"><div class="conceptCard"><h4>國中先備</h4><p>${l.prior.join("、")}</p></div><div class="conceptCard"><h4>高中升級</h4><p>${l.target.join("、")}</p></div></div>`}
function quickPane(u,l){return `<div class="sectionHead"><span class="num green">1</span><h3>先學會少走冤枉路</h3></div><div class="quickGrid"><div class="quickCard fast"><h3>⚡ 快解</h3><p>${l.quick}</p></div><div class="quickCard trap"><h3>⚠️ 最容易踩的雷</h3><p>${l.trap}</p></div></div><div class="sectionHead" style="margin-top:14px"><span class="num purple">2</span><h3>生活情境</h3></div><div class="conceptCard"><p>${l.context}</p><p style="margin-top:8px;color:#66748c">這些情境不是裝飾，而是幫你先判斷「這題在問哪種數學」。</p></div>`}
function examplePane(u,l){
 const examples=getUnitQuestions(currentUnit).filter(q=>q.type==="single"||q.type==="fill").slice(0,2);const q=examples[0]||getUnitQuestions(currentUnit)[0];
 if(!q)return `<p>目前沒有例題。</p>`;
 const ans=q.type==="single"?String.fromCharCode(65+q.answer):Array.isArray(q.answer)?q.answer[0]:q.answer;
 return `<div class="sectionHead"><span class="num amber">1</span><h3>例題拆成三步，不直接丟答案</h3></div><div class="example"><div class="exampleQ">${q.text}</div><div class="exampleSteps"><div class="exStep show">① 先判斷：這題屬於「${u.title.replace(/^\d+\.\s*/,"")}」哪一種基本型？</div><div class="exStep">② ${q.quick||l.quick}</div><div class="exStep">③ 正解：${ans}。${q.explain||""}</div></div><div class="exampleBtns"><button class="btn" onclick="nextExampleStep(this)">下一步</button><button class="btn2" onclick="resetExample(this)">重來</button></div></div>`}
function priorPane(u,l){return `<div class="sectionHead"><span class="num purple">1</span><h3>你不是從零開始</h3></div><div class="priorGrid"><div class="priorCard"><h4>國中已經會的</h4><ul>${l.prior.map(x=>`<li>${x}</li>`).join("")}</ul></div><div class="priorCard"><h4>高中把它升級成</h4><ul>${l.target.map(x=>`<li>${x}</li>`).join("")}</ul></div></div><div class="sectionHead" style="margin-top:14px"><span class="num green">2</span><h3>心智串聯</h3></div><div class="conceptCard"><p>${u.bridge}</p></div>`}
function nextExampleStep(btn){const xs=[...btn.closest(".example").querySelectorAll(".exStep")];const i=xs.findIndex(x=>!x.classList.contains("show"));if(i>=0)xs[i].classList.add("show");else btn.textContent="都看完了"}
function resetExample(btn){const xs=[...btn.closest(".example").querySelectorAll(".exStep")];xs.forEach((x,i)=>x.classList.toggle("show",i===0));btn.previousElementSibling.textContent="下一步"}

function renderVisual(type){
 if(type==="absolute_value")return absVisual();
 if(type==="amgm")return amgmVisual();
 if(type==="growth")return growthVisual();
 if(type==="slope")return slopeVisual();
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

function allQuestions(){return Object.values(TESTS).flat()}
function getUnitQuestions(id){return allQuestions().filter(q=>q.unit===id)}
function refreshPractice(){practiceSet=getUnitQuestions(currentUnit).filter(q=>["single","multi","fill"].includes(q.type)).sort(()=>Math.random()-.5).slice(0,5);practiceIndex=0;renderPractice()}
function renderPractice(){
 const el=$("practiceArea");if(!practiceSet.length){el.innerHTML="<p>這個單元目前沒有可互動題。</p>";return}
 const q=practiceSet[practiceIndex];let h=`<div class="qcount">題目 ${practiceIndex+1} / ${practiceSet.length}｜${q.level||"標準"}</div><div class="question">${q.text}</div>`;
 if(q.type==="single")h+=q.options.map((o,i)=>`<label class="option"><input type="radio" name="miniQ" value="${i}"> ${String.fromCharCode(65+i)}. ${o}</label>`).join("");
 if(q.type==="multi")h+=q.options.map((o,i)=>`<label class="option"><input type="checkbox" name="miniQ" value="${i}"> ${String.fromCharCode(65+i)}. ${o}</label>`).join("");
 if(q.type==="fill")h+=`<input id="miniFill" style="width:100%;padding:9px;border:1px solid #dce5f2;border-radius:10px" placeholder="輸入答案">`;
 h+=`<label style="display:block;margin-top:8px;font-size:12px;color:#a96d13"><input type="checkbox" id="miniUncertain"> 我其實不太確定／是猜的</label><div class="qactions"><button class="btn" onclick="submitMini()">送出答案</button><button class="btn2" onclick="showHint()">提示</button></div><div class="hint" id="miniHint" style="display:none">${q.quick||LESSONS[currentUnit].quick}</div><div class="feedback" id="miniFeedback"></div>`;
 el.innerHTML=h;
}
function normalize(x){return String(x).trim().replace(/\s+/g,"").replace(/−/g,"-").toLowerCase()}
function submitMini(){
 const q=practiceSet[practiceIndex];let ok=false,user=null;
 if(q.type==="single"){const x=document.querySelector('input[name="miniQ"]:checked');user=x?Number(x.value):null;ok=user===q.answer}
 if(q.type==="multi"){const xs=[...document.querySelectorAll('input[name="miniQ"]:checked')].map(x=>Number(x.value)).sort();const a=[...q.answer].sort();ok=xs.length===a.length&&xs.every((x,i)=>x===a[i]);user=xs}
 if(q.type==="fill"){user=$("miniFill").value;ok=(q.answer||[]).map(normalize).includes(normalize(user))}
 const unc=$("miniUncertain").checked;const f=$("miniFeedback");f.className="feedback show "+(ok?"good":"bad");f.innerHTML=`<b>${ok?"✅ 這題過關":"🟠 這題先補一下"}</b><br>${q.explain||""}<br><b>快解：</b>${q.quick||LESSONS[currentUnit].quick}`;
 let a=STATE.attempts[currentUnit]||{c:0,t:0};a.t++;if(ok)a.c++;STATE.attempts[currentUnit]=a;if(unc)STATE.uncertain[currentUnit]=true;if(ok&&!unc)STATE.xp+=10;saveState(STATE);renderUnitTop();renderSidebar();renderBoost();
 setTimeout(()=>{if(practiceIndex<practiceSet.length-1){practiceIndex++;renderPractice()}else{STATE.completed[currentUnit]=true;STATE.xp+=20;saveState(STATE);renderUnitTop();renderSidebar();renderPractice()}},ok?1100:1800)
}
function showHint(){$("miniHint").style.display="block"}
function renderBoost(){const u=UNITS.find(x=>x.id===currentUnit),l=LESSONS[currentUnit];$("boostList").innerHTML=`<li>1分鐘：只看圖，不看文字</li><li>3分鐘：把 ${l.steps[0][0]} 說給自己聽</li><li>4分鐘：做2題隨堂題</li><li>2分鐘：只看快解與陷阱</li>`;$("xpRingText").innerHTML="XP<br>"+STATE.xp}
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
init();
