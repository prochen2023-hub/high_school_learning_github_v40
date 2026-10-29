let THEMES=[],UNITS=[],TESTS={},MAPS={},RANGES=[],SIMILAR={},DIAGRAMS={};
async function loadData(){
  const getJSON = async (url) => {
    const r = await fetch(url, {cache:"no-store"});
    if(!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    return r.json();
  };
  const [config,units,maps,similar,diagrams,e1,e2,e3] = await Promise.all([
    getJSON("data/math/config.json"),
    getJSON("data/math/units.json"),
    getJSON("data/math/mindmaps.json"),
    getJSON("data/math/similar.json"),
    getJSON("data/math/diagrams.json"),
    getJSON("data/math/exam1.json"),
    getJSON("data/math/exam2.json"),
    getJSON("data/math/exam3.json")
  ]);
  THEMES=config.themes;
  RANGES=config.ranges;
  UNITS=units;
  MAPS=maps;
  SIMILAR=similar;
  DIAGRAMS=diagrams;
  TESTS={"0A":e1.A,"0B":e1.B,"1A":e2.A,"1B":e2.B,"2A":e3.A,"2B":e3.B};
}
let exam=0,activeCode=null,timerId=null,secondsLeft=3000;
const load=(k,d)=>{try{const raw=localStorage.getItem("mathv32_"+k)??localStorage.getItem("mathv31_"+k);return raw===null?d:(JSON.parse(raw)??d)}catch(e){return d}},save=(k,v)=>localStorage.setItem("mathv32_"+k,JSON.stringify(v)),nowUnits=()=>UNITS.filter(u=>u.exam===exam);
function init(){document.getElementById("themeBar").innerHTML=THEMES.map(t=>`<button id="th_${t.id}" class="themeBtn" onclick="applyTheme('${t.id}',true)">${t.name}</button>`).join("");applyTheme(load("theme","campus"),false);renderTabs();render()}
function applyTheme(id,keep=true){const t=THEMES.find(x=>x.id===id)||THEMES[0];document.documentElement.style.setProperty("--bg1",t.bg1);document.documentElement.style.setProperty("--bg2",t.bg2);document.documentElement.style.setProperty("--accent",t.accent);document.querySelectorAll(".themeBtn").forEach(b=>b.classList.toggle("on",b.id==="th_"+id));if(keep)save("theme",id)}
function renderTabs(){document.getElementById("tabs").innerHTML=["第一次段考","第二次段考","第三次段考"].map((t,i)=>`<button class="tab ${i===exam?"on":""}" onclick="exam=${i};renderTabs();render()">${t}</button>`).join("")}
function render(){document.getElementById("range").innerHTML=`<b>${RANGES[exam]}</b><br><span class="small">實際考試範圍仍以學校公告為準。</span>`;renderMap();renderUnits();renderTests();renderWeak();renderWrong();renderStats();renderSmart()}
function wrap(t,n){let a=[],x="";for(const c of t){x+=c;if(x.length>=n){a.push(x);x=""}}if(x)a.push(x);return a.slice(0,3)}
function masteryInfo(id){
 const done=load("done",[]),wr=load("wrong",[]);
 let earned=0,possible=0;
 Object.keys(TESTS).forEach(c=>{const sc=load("score_"+c,null);if(sc&&sc.stats&&sc.stats[id]){earned+=sc.stats[id][0];possible+=sc.stats[id][1]}});
 const recent=wr.filter(x=>x.unit===id).slice(0,6).length;
 if(!possible)return {score:done.includes(id)?35:0,evidence:false};
 let score=Math.round((earned/possible)*85+(done.includes(id)?10:0)-Math.min(recent*3,15));
 return {score:Math.max(0,Math.min(100,score)),evidence:true}
}
function masteryColor(info){
 if(!info.evidence)return "#cbd5e1";
 if(info.score>=80)return "#40a578";
 if(info.score>=60)return "#e1b93f";
 if(info.score>=40)return "#e58b48";
 return "#d85c5c"
}
function renderMap(){
 const m=MAPS[String(exam)],xs=[25,215,405,595,785];
 let s=`<svg viewBox="0 0 970 218" width="100%" height="218"><text x="20" y="28" font-size="21" font-weight="700" fill="#1f2937">${m.title}</text>`;
 xs.forEach((x,i)=>{if(i<4)s+=`<line x1="${x+145}" y1="112" x2="${xs[i+1]}" y2="112" stroke="#94a3ff" stroke-width="4"/><polygon points="${xs[i+1]-10},106 ${xs[i+1]},112 ${xs[i+1]-10},118" fill="#94a3ff"/>`});
 m.nodes.forEach((n,i)=>{
  const info=masteryInfo(n[2]),color=masteryColor(info),label=info.evidence?info.score+"%":"未測";
  s+=`<g class="mapNode" onclick="gotoUnit('${n[2]}')"><rect x="${xs[i]}" y="62" width="145" height="108" rx="18" fill="#fff" stroke="${color}" stroke-width="3"/><circle cx="${xs[i]+128}" cy="80" r="7" fill="${color}"/><text x="${xs[i]+12}" y="88" font-size="15" font-weight="700" fill="#4254d0">${n[0]}</text>${wrap(n[1],12).map((x,j)=>`<text x="${xs[i]+12}" y="${112+j*18}" font-size="13" fill="#475569">${x}</text>`).join("")}<text x="${xs[i]+12}" y="158" font-size="11" fill="#64748b">掌握 ${label}</text></g>`
 });
 s+="</svg>";document.getElementById("mindMap").innerHTML=s
}
function jumpUnit(id){const e=document.getElementById("unit_"+id);if(!e)return;e.scrollIntoView({behavior:"smooth",block:"center"});e.classList.remove("flash");void e.offsetWidth;e.classList.add("flash")}
function gotoUnit(id){const u=UNITS.find(x=>x.id===id);if(!u)return;if(exam!==u.exam){exam=u.exam;renderTabs();render();setTimeout(()=>jumpUnit(id),120)}else jumpUnit(id)}

function diagramSVG(id){
 const d=DIAGRAMS[id]; if(!d) return "";
 const w=720,h=250;
 const axis=(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="2"/>`;
 if(d.type==="number_sets"){
  return `<svg class="diagramSvg" viewBox="0 0 720 250">
  <rect x="40" y="30" width="640" height="185" rx="30" fill="#eef2ff" stroke="#8797ea" stroke-width="2"/>
  <rect x="90" y="55" width="500" height="135" rx="28" fill="#f7f2ff" stroke="#aa8de6" stroke-width="2"/>
  <rect x="140" y="78" width="355" height="90" rx="25" fill="#eefbf5" stroke="#67b48f" stroke-width="2"/>
  <rect x="195" y="98" width="210" height="50" rx="24" fill="#fff7df" stroke="#d6ad3e" stroke-width="2"/>
  <text x="58" y="55" font-size="18" font-weight="700">實數 R</text><text x="108" y="82" font-size="17">有理數 Q</text><text x="158" y="104" font-size="16">整數 Z</text><text x="214" y="129" font-size="16">自然數 N</text>
  <text x="505" y="130" font-size="17" fill="#8a4aa2">無理數：√2、π…</text>
  <text x="278" y="232" font-size="14" fill="#64748b">一層包含一層，而無理數與有理數一起組成所有實數</text></svg>`;
 }
 if(d.type==="amgm"){
  return `<svg class="diagramSvg" viewBox="0 0 720 250">
  ${axis(60,205,675,205)}${axis(80,220,80,35)}
  <path d="M105 190 Q350 35 610 190" fill="none" stroke="#5368e0" stroke-width="5"/>
  <line x1="350" y1="205" x2="350" y2="73" stroke="#e36a78" stroke-dasharray="6 6" stroke-width="2"/>
  <circle cx="350" cy="73" r="7" fill="#e36a78"/><text x="365" y="78" font-size="16">a=b=10 → ab最大100</text>
  <text x="280" y="235" font-size="14">a（當 a+b=20）</text><text x="15" y="45" font-size="14">ab</text>
  <text x="115" y="178" font-size="14">太懸殊</text><text x="555" y="178" font-size="14">太懸殊</text>
  </svg>`;
 }
 if(d.type==="absolute_value"){
  return `<svg class="diagramSvg" viewBox="0 0 720 250">
  ${axis(70,135,650,135)}
  ${[-1,0,1,2,3,4,5,6,7].map((v,i)=>`<line x1="${100+i*60}" y1="125" x2="${100+i*60}" y2="145" stroke="#64748b"/><text x="${95+i*60}" y="170" font-size="14">${v}</text>`).join("")}
  <line x1="220" y1="135" x2="460" y2="135" stroke="#e86c98" stroke-width="10" stroke-linecap="round"/>
  <circle cx="220" cy="135" r="8" fill="#fff" stroke="#e86c98" stroke-width="3"/><circle cx="460" cy="135" r="8" fill="#fff" stroke="#e86c98" stroke-width="3"/>
  <circle cx="340" cy="135" r="7" fill="#5368e0"/><text x="325" y="105" font-size="17" font-weight="700">中心3</text>
  <text x="205" y="95" font-size="15" fill="#d94678">距離2</text><text x="410" y="95" font-size="15" fill="#d94678">距離2</text>
  <text x="240" y="220" font-size="20" font-weight="700">|x−3| &lt; 2  ⇔  1 &lt; x &lt; 5</text></svg>`;
 }
 if(d.type==="growth"){
  return `<svg class="diagramSvg" viewBox="0 0 720 250">
  ${axis(65,205,670,205)}${axis(80,220,80,35)}
  <path d="M100 190 L610 75" fill="none" stroke="#6b7280" stroke-width="4"/>
  <path d="M100 190 C250 185 390 160 610 50" fill="none" stroke="#5368e0" stroke-width="5"/>
  <text x="500" y="92" font-size="15" fill="#5368e0">固定百分比：指數成長</text><text x="470" y="145" font-size="15" fill="#4b5563">固定增加量：線性</text>
  <text x="120" y="232" font-size="14">時間</text><text x="14" y="45" font-size="14">數量</text></svg>`;
 }
 if(d.type==="slope"){
  return `<svg class="diagramSvg" viewBox="0 0 720 250">
  ${axis(70,205,660,205)}${axis(100,220,100,35)}
  <line x1="150" y1="185" x2="560" y2="65" stroke="#5368e0" stroke-width="5"/>
  <line x1="260" y1="153" x2="410" y2="153" stroke="#e16a7d" stroke-width="3"/><line x1="410" y1="153" x2="410" y2="109" stroke="#e16a7d" stroke-width="3"/>
  <text x="312" y="145" font-size="15">Δx</text><text x="420" y="135" font-size="15">Δy</text><text x="275" y="225" font-size="18" font-weight="700">m = Δy / Δx</text></svg>`;
 }
 if(d.type==="halfplane"){
  return `<svg class="diagramSvg" viewBox="0 0 720 250">
  <polygon points="110,205 110,75 500,205" fill="#dfe8ff" opacity=".85"/>
  ${axis(75,205,655,205)}${axis(110,225,110,35)}
  <line x1="110" y1="75" x2="500" y2="205" stroke="#5368e0" stroke-width="4"/>
  <line x1="110" y1="205" x2="110" y2="75" stroke="#64748b" stroke-width="3"/><line x1="110" y1="205" x2="500" y2="205" stroke="#64748b" stroke-width="3"/>
  <text x="230" y="165" font-size="18" font-weight="700">可行區域</text><text x="430" y="115" font-size="15">x+y≤6</text></svg>`;
 }
 if(d.type==="circle"){
  return `<svg class="diagramSvg" viewBox="0 0 720 250">
  <circle cx="340" cy="125" r="85" fill="#eef2ff" stroke="#5368e0" stroke-width="4"/><circle cx="340" cy="125" r="6" fill="#5368e0"/><line x1="340" y1="125" x2="420" y2="95" stroke="#e16a7d" stroke-width="3"/>
  <text x="350" y="145" font-size="16">(h,k)</text><text x="395" y="90" font-size="16">r</text><text x="180" y="232" font-size="20" font-weight="700">(x−h)²+(y−k)²=r²</text></svg>`;
 }
 if(d.type==="line_circle"){
  return `<svg class="diagramSvg" viewBox="0 0 720 250">
  <circle cx="205" cy="125" r="70" fill="#eef7ff" stroke="#5368e0" stroke-width="3"/><line x1="130" y1="90" x2="275" y2="155" stroke="#e16a7d" stroke-width="4"/><text x="165" y="222" font-size="14">d&lt;r：交兩點</text>
  <circle cx="445" cy="125" r="70" fill="#eef7ff" stroke="#5368e0" stroke-width="3"/><line x1="515" y1="45" x2="515" y2="205" stroke="#e16a7d" stroke-width="4"/><text x="405" y="222" font-size="14">d=r：相切</text>
  <line x1="625" y1="45" x2="625" y2="205" stroke="#e16a7d" stroke-width="4"/><text x="550" y="120" font-size="14">d&gt;r：相離</text></svg>`;
 }
 if(d.type==="division"){
  return `<svg class="diagramSvg" viewBox="0 0 720 250"><rect x="70" y="70" width="150" height="70" rx="14" fill="#eef2ff"/><rect x="285" y="70" width="150" height="70" rx="14" fill="#ecfdf3"/><rect x="500" y="70" width="150" height="70" rx="14" fill="#fff7ed"/><text x="106" y="112" font-size="20">除式 × 商</text><text x="245" y="112" font-size="28">＋</text><text x="548" y="112" font-size="20">餘式</text><text x="245" y="185" font-size="22" font-weight="700">＝ 被除式</text><text x="185" y="225" font-size="14">餘式次數一定小於除式次數</text></svg>`;
 }
 if(d.type==="remainder"){
  return `<svg class="diagramSvg" viewBox="0 0 720 250"><rect x="75" y="60" width="180" height="100" rx="16" fill="#eef2ff"/><text x="115" y="105" font-size="24">f(x)</text><text x="105" y="140" font-size="16">除以 x−a</text><path d="M270 110 C340 110 360 110 420 110" fill="none" stroke="#5368e0" stroke-width="4"/><polygon points="420,110 405,102 405,118" fill="#5368e0"/><rect x="440" y="60" width="200" height="100" rx="16" fill="#ecfdf3"/><text x="488" y="105" font-size="24">餘式 f(a)</text><text x="475" y="140" font-size="16">若 f(a)=0 → x−a 是因式</text></svg>`;
 }
 if(d.type==="parabola"){
  return `<svg class="diagramSvg" viewBox="0 0 720 250">${axis(70,200,655,200)}${axis(100,220,100,35)}<path d="M180 55 Q360 250 540 55" fill="none" stroke="#5368e0" stroke-width="5"/><circle cx="360" cy="200" r="7" fill="#e16a7d"/><line x1="360" y1="45" x2="360" y2="205" stroke="#94a3b8" stroke-dasharray="6 6"/><text x="375" y="190" font-size="16">頂點(h,k)</text><text x="430" y="90" font-size="15">a&gt;0：頂點是最小</text></svg>`;
 }
 if(d.type==="sign_chart"){
  return `<svg class="diagramSvg" viewBox="0 0 720 250">${axis(75,135,650,135)}
  <circle cx="250" cy="135" r="7" fill="#5368e0"/><circle cx="470" cy="135" r="7" fill="#5368e0"/><text x="235" y="165" font-size="15">−2</text><text x="462" y="165" font-size="15">1</text>
  <text x="140" y="105" font-size="22" fill="#40a578">＋</text><text x="350" y="105" font-size="22" fill="#d85c5c">−</text><text x="555" y="105" font-size="22" fill="#40a578">＋</text>
  <text x="190" y="220" font-size="18" font-weight="700">(x+2)(x−1)&gt;0 → x&lt;−2 或 x&gt;1</text></svg>`;
 }
 return "";
}
function diagramCard(id){
 const d=DIAGRAMS[id]; if(!d) return "";
 return `<div class="diagramCard"><div class="diagramHead"><div class="diagramTitle">🖼️ ${d.title}</div><button class="diagramBtn" onclick="this.closest('.diagramCard').querySelector('.diagramBody').classList.toggle('hiddenDiagram')">收合／展開</button></div><div class="diagramBody">${diagramSVG(id)}<div class="diagramCaption">${d.caption}</div></div></div>`;
}

function renderUnits(){const done=load("done",[]),weak=load("weak",[]);document.getElementById("units").innerHTML=nowUnits().map(u=>`<div class="unit" id="unit_${u.id}"><div class="row"><div><span class="badge">${u.topic}</span><h3>${u.title}</h3><div class="small">${u.mood}</div></div><button class="weakBtn ${weak.includes(u.id)?"on":""}" onclick="toggleWeak('${u.id}')">⚑ 需加強</button></div><div class="box old"><b>回憶以前</b><br>${u.old}</div><div class="box core"><b>高中核心</b><br>${u.core}</div>${diagramCard(u.id)}<div class="box"><b>🧠 記憶鉤子</b><br>${u.memory}</div><div class="box fast"><b>⚡ 快解法</b><br>${u.fast}</div><div class="box trap"><b>⚠️ 易錯陷阱</b><br>${u.trap}</div><div class="box bridge"><b>🔗 發展脈絡</b><br>${u.bridge}</div><div class="box think"><b>30秒想一想</b><br>${u.question}<br><button class="btn2" style="margin-top:7px" onclick="toggleAns(this)">看答案</button><div class="answer">${u.answer}</div></div><div class="actions"><a class="btn2" href="${u.video}" target="_blank">▶ 補充影片</a><button class="${done.includes(u.id)?"btn2":"btn"}" onclick="toggleDone('${u.id}')">${done.includes(u.id)?"✓ 已完成":"標記完成"}</button><button class="btn2" onclick="showSimilar('${u.id}',this)">再來一題</button></div></div>`).join("")}
function toggleAns(b){const a=b.nextElementSibling;a.style.display=a.style.display==="block"?"none":"block"}
function toggleDone(id){let d=load("done",[]);d=d.includes(id)?d.filter(x=>x!==id):[...d,id];save("done",d);renderUnits();renderStats();renderMap();renderSmart()}
function toggleWeak(id){let w=load("weak",[]);w=w.includes(id)?w.filter(x=>x!==id):[...w,id];save("weak",w);renderUnits();renderWeak();renderStats();renderMap();renderSmart()}
function showSimilar(id,b){const host=b.closest(".unit");host.querySelectorAll(".similarBox").forEach(x=>x.remove());const a=SIMILAR[id]||[],q=a[Math.floor(Math.random()*a.length)];const d=document.createElement("div");d.className="similarBox";d.innerHTML=`<b>相似題：</b>${q.q}<br><button class="btn2" style="margin-top:6px" onclick="this.nextElementSibling.style.display='block'">看答案</button><div class="answer">${q.a}</div>`;host.appendChild(d)}
function renderTests(){document.getElementById("tests").innerHTML=["A","B"].map(l=>{const code=String(exam)+l,sc=load("score_"+code,null);return `<div class="testcard"><h3>${l}卷｜${l==="A"?"基礎→標準→素養":"標準→素養→挑戰"}</h3><div class="small">20題／100分／建議50分鐘。</div><div class="levels"><span class="lv">單選36</span><span class="lv">複選10</span><span class="lv">填充18</span><span class="lv">非選36</span></div>${sc?`<div class="small">上次成績：<b>${sc.score} / 100</b></div>`:""}<div class="actions" style="margin-top:10px"><button class="btn" onclick="openQuiz('${code}')">開始作答</button><button class="btn2" onclick="openQuiz('${code}',true)">列印題卷</button></div></div>`}).join("")}
function startTimer(){clearInterval(timerId);secondsLeft=3000;updateTimer();timerId=setInterval(()=>{secondsLeft--;updateTimer();if(secondsLeft<=0){clearInterval(timerId);alert("50分鐘到。可以先完成目前題目，再交卷。")}},1000)}
function updateTimer(){const m=Math.floor(secondsLeft/60),s=secondsLeft%60;document.getElementById("timer").textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}
function openQuiz(code,printMode=false){activeCode=code;const qs=TESTS[code],names={single:"第一部分｜單選題 12題×3分",multi:"第二部分｜複選題 2題×5分",fill:"第三部分｜填充題 3題×6分",written:"第四部分｜非選題 3題×12分"};document.getElementById("quizTitle").textContent=`第${exam+1}次段考｜${code.slice(-1)}卷｜100分`;let h="",prev="";qs.forEach((q,i)=>{if(q.type!==prev){h+=`<div class="sectionTitle">${names[q.type]}</div>`;prev=q.type}h+=`<div class="q" data-unit="${q.unit}" id="q_${q.id}"><div class="qmeta">${q.level}｜${UNITS.find(u=>u.id===q.unit).title}｜${q.points}分</div><b>${i+1}. ${q.text}</b>`;if(q.type==="single")h+=q.options.map((o,j)=>`<label class="opt"><input type="radio" name="${q.id}" value="${j}"> ${String.fromCharCode(65+j)}. ${o}</label>`).join("");if(q.type==="multi")h+=q.options.map((o,j)=>`<label class="opt"><input type="checkbox" name="${q.id}" value="${j}"> ${String.fromCharCode(65+j)}. ${o}</label>`).join("");if(q.type==="fill")h+=`<input class="fillInput" id="ans_${q.id}" placeholder="輸入答案">`;if(q.type==="written")h+=`<textarea id="ans_${q.id}" placeholder="寫下計算、理由或說明。"></textarea>`;h+=`<label class="uncertain"><input type="checkbox" id="unc_${q.id}"> 我不確定／這題是猜的</label><div class="explain" id="ex_${q.id}"></div>`;if(q.type==="written")h+=`<div class="selfscore" id="self_${q.id}"><b>依量規自評：</b><div class="actions" style="margin-top:7px"><button class="btn2" onclick="setSelf('${q.id}',12,this)">完整（12分）</button><button class="btn2" onclick="setSelf('${q.id}',6,this)">部分（6分）</button><button class="btn2" onclick="setSelf('${q.id}',0,this)">不會（0分）</button></div><input type="hidden" id="score_${q.id}" value=""></div>`;h+="</div>"});h+=`<div class="screenOnly" style="margin-top:14px"><button class="btn" onclick="gradeQuiz()">交卷並看解析</button></div>`;document.getElementById("quizBody").innerHTML=h;document.getElementById("modal").classList.add("open");if(printMode)setTimeout(()=>window.print(),250);else startTimer()}
function setSelf(id,v,b){document.getElementById("score_"+id).value=v;b.parentElement.querySelectorAll("button").forEach(x=>x.style.opacity=".55");b.style.opacity="1"}
function norm(s){return String(s).trim().replace(/\s+/g,"").replace(/−/g,"-").toLowerCase()}
function eqArr(a,b){return a.length===b.length&&a.slice().sort().every((x,i)=>x===b.slice().sort()[i])}
function addWrong(q,user,reason){
 let w=load("wrong",[]);
 const existing=w.findIndex(x=>x.id===q.id);
 const item={id:q.id,unit:q.unit,text:q.text,user:user,answer:q.answer,reason:reason,time:new Date().toLocaleString(),category:existing>=0?(w[existing].category||""):"",reviewStage:existing>=0?(w[existing].reviewStage||0):0,due:existing>=0?(w[existing].due||Date.now()):Date.now()};
 if(existing>=0)w.splice(existing,1);
 w.unshift(item);save("wrong",w.slice(0,80))
}
function gradeQuiz(){
 const qs=TESTS[activeCode];
 const missing=qs.filter(q=>q.type==="written"&&document.getElementById("score_"+q.id).value==="");
 if(missing.length){
  missing.forEach(q=>{document.getElementById("self_"+q.id).style.display="block";const ex=document.getElementById("ex_"+q.id);ex.style.display="block";ex.innerHTML=`<b>參考答案：</b>${q.answer}<br><b>量規：</b>${q.rubric.join("；")}<br>請比較自己的作答後選擇「完整／部分／不會」。`});
  alert("非選題的參考答案與評分量規已顯示。完成自評後，再按一次交卷。");return
 }
 let total=0,weak=load("weak",[]),stats={};
 for(const q of qs){
  if(!stats[q.unit])stats[q.unit]=[0,0];stats[q.unit][1]+=q.points;
  const unc=document.getElementById("unc_"+q.id).checked;
  let earned=0,ok=false,user="";
  if(q.type==="single"){const x=document.querySelector(`input[name="${q.id}"]:checked`);user=x?Number(x.value):null;ok=user===q.answer;earned=ok?q.points:0}
  if(q.type==="multi"){const xs=[...document.querySelectorAll(`input[name="${q.id}"]:checked`)].map(x=>Number(x.value));user=xs;ok=eqArr(xs,q.answer);earned=ok?q.points:0}
  if(q.type==="fill"){user=document.getElementById("ans_"+q.id).value;ok=q.answer.map(norm).includes(norm(user));earned=ok?q.points:0}
  if(q.type==="written"){earned=Number(document.getElementById("score_"+q.id).value);ok=earned===q.points;user=document.getElementById("ans_"+q.id).value}
  total+=earned;stats[q.unit][0]+=earned;
  const ex=document.getElementById("ex_"+q.id);ex.style.display="block";
  const ref=q.type==="single"?String.fromCharCode(65+q.answer):q.type==="multi"?q.answer.map(i=>String.fromCharCode(65+i)).join("、"):q.answer;
  ex.innerHTML=`<b>${ok?"✅ 掌握":"🟠 需要再看"}</b><br><b>參考：</b>${ref}<br><b>解析：</b>${q.explain||q.answer}${q.quick?`<br><b>⚡快解：</b>${q.quick}`:""}${q.rubric?`<br><b>量規：</b>${q.rubric.join("；")}`:""}`;
  if(!ok||unc){if(!weak.includes(q.unit))weak.push(q.unit);addWrong(q,user,unc&&ok?"答對但不確定":"答錯／未完整掌握")}
 }
 clearInterval(timerId);save("weak",weak);save("score_"+activeCode,{score:total,time:new Date().toISOString(),stats:stats});
 const ranked=Object.entries(stats).map(([id,v])=>({id,rate:v[1]?v[0]/v[1]:0})).sort((a,b)=>a.rate-b.rate);
 const focus=ranked.slice(0,2).map(x=>UNITS.find(u=>u.id===x.id).title).join("、");
 const diag=Object.entries(stats).map(([id,v])=>`<div><b>${UNITS.find(u=>u.id===id).title}</b><br>${v[0]} / ${v[1]} 分</div>`).join("");
 document.querySelector("#quizBody .result")?.remove();
 document.getElementById("quizBody").insertAdjacentHTML("afterbegin",`<div class="result"><b>總分：${total} / 100</b><br>${total>=80?"整體掌握良好，下一步不是亂刷題，而是修掉最弱的1～2個單元。":total>=60?"已有基礎，先把低分單元補起來再做下一卷。":"先回核心概念，不急著再做整張卷。"}<div class="nextMove"><b>🎯 系統建議下一步：</b>先處理「${focus}」，並到錯題本標記錯因。</div><div class="diag">${diag}</div></div>`);
 renderWeak();renderWrong();renderStats();renderTests();renderMap();renderSmart()
}
function closeQuiz(){clearInterval(timerId);document.getElementById("modal").classList.remove("open")}
function renderWeak(){const w=load("weak",[]),lu=Object.fromEntries(UNITS.map(u=>[u.id,u.title]));document.getElementById("weak").innerHTML=w.length?w.map(id=>`<span class="weakitem" onclick="gotoUnit('${id}')" style="cursor:pointer">${lu[id]}</span>`).join(""):`<span class="small">目前沒有弱點紀錄。</span>`}
function reasonAdvice(cat){
 const m={"觀念不熟":"先回心智圖與『高中核心』，再做一題最基礎題。","公式/定義忘記":"先看記憶鉤子，關掉答案後自己默寫一次。","題意看錯":"圈出關鍵詞，把中文條件逐句翻成數學式。","計算失誤":"不要重讀整章，直接做2題短計算並檢查步驟。","方法太慢":"優先重看綠色『快解法』，比較快解與原方法。","粗心":"建立最後30秒檢查：符號、端點、單位、題目問什麼。"};
 return m[cat]||"先選一個最接近的錯因，系統才會調整補強方向。"
}
function setWrongCategory(i,val){let w=load("wrong",[]);if(!w[i])return;w[i].category=val;save("wrong",w);renderWrong();renderSmart()}
function markReviewed(i){let w=load("wrong",[]);if(!w[i])return;const days=[1,3,7,14],stage=Math.min((w[i].reviewStage||0)+1,4);w[i].reviewStage=stage;const d=days[Math.min(stage-1,days.length-1)];w[i].due=Date.now()+d*86400000;save("wrong",w);renderWrong();renderSmart()}
function renderWrong(){
 const w=load("wrong",[]),lu=Object.fromEntries(UNITS.map(u=>[u.id,u.title]));
 if(!w.length){document.getElementById("wrongArea").innerHTML=`<p class="small">目前沒有錯題。完成正式卷後會自動整理。</p>`;return}
 const opts=["","觀念不熟","公式/定義忘記","題意看錯","計算失誤","方法太慢","粗心"];
 document.getElementById("wrongArea").innerHTML=`<table class="wrongTable"><thead><tr><th>單元</th><th>題目／錯因</th><th>補強</th></tr></thead><tbody>${w.slice(0,20).map((x,i)=>`<tr><td><a href="#" onclick="gotoUnit('${x.unit}');return false">${lu[x.unit]}</a></td><td>${x.text}<br><span class="small">${x.reason}｜${x.time}</span><div style="margin-top:6px"><select class="reasonSelect" onchange="setWrongCategory(${i},this.value)">${opts.map(o=>`<option value="${o}" ${x.category===o?"selected":""}>${o||"選擇錯因…"}</option>`).join("")}</select><div class="reasonAdvice">${reasonAdvice(x.category)}</div></div></td><td><button class="btn2" onclick="wrongSimilar('${x.unit}',this)">相似題</button><button class="btn2" style="margin-top:6px" onclick="markReviewed(${i})">我已回想</button></td></tr>`).join("")}</tbody></table>`
}
function wrongSimilar(id,b){const a=SIMILAR[id]||[],q=a[Math.floor(Math.random()*a.length)];b.parentElement.querySelectorAll(".similarBox").forEach(x=>x.remove());const d=document.createElement("div");d.className="similarBox";d.innerHTML=`${q.q}<br><button class="btn2" style="margin-top:6px" onclick="this.nextElementSibling.style.display='block'">看答案</button><div class="answer">${q.a}</div>`;b.parentElement.appendChild(d)}
function renderSmart(){
 renderMastery();renderTodayPlan();renderReviewQueue();renderReasonStats()
}
function renderMastery(){
 const area=document.getElementById("masteryArea");if(!area)return;
 area.innerHTML=nowUnits().map(u=>{const info=masteryInfo(u.id),c=masteryColor(info);return `<div class="masteryRow"><span>${u.title.replace(/^\d+\.\s*/,"")}</span><div class="masteryBar"><div class="masteryFill" style="width:${info.evidence?info.score:8}%;background:${c}"></div></div><b>${info.evidence?info.score+"%":"未測"}</b></div>`}).join("")
}
function planScore(u){
 const m=masteryInfo(u.id),weak=load("weak",[]).includes(u.id),wrong=load("wrong",[]).filter(x=>x.unit===u.id).length;
 return (m.evidence?m.score:45)-(weak?20:0)-Math.min(wrong*4,20)
}
function dominantReason(id){
 const a=load("wrong",[]).filter(x=>x.unit===id&&x.category);if(!a.length)return "";
 const c={};a.forEach(x=>c[x.category]=(c[x.category]||0)+1);return Object.entries(c).sort((x,y)=>y[1]-x[1])[0][0]
}
function renderTodayPlan(){
 const area=document.getElementById("todayPlan");if(!area)return;
 const picks=nowUnits().slice().sort((a,b)=>planScore(a)-planScore(b)).slice(0,3);
 area.innerHTML=picks.map((u,i)=>{const r=dominantReason(u.id),ad=r?reasonAdvice(r):"先做30秒快問，再做一題相似題。";return `<div class="planItem"><b>${i+1}. ${u.title}</b>${r?` <span class="due">${r}</span>`:""}<div class="planStep">1分鐘：回想記憶鉤子<br>3分鐘：不看答案做30秒快問<br>4分鐘：做一題相似題<br>2分鐘：${ad}</div><button class="btn2" style="margin-top:6px" onclick="gotoUnit('${u.id}')">開始這單元</button></div>`}).join("")
}
function renderReviewQueue(){
 const area=document.getElementById("reviewQueue");if(!area)return;
 const w=load("wrong",[]),now=Date.now(),lu=Object.fromEntries(UNITS.map(u=>[u.id,u.title]));
 const due=w.map((x,i)=>({x,i})).filter(o=>(o.x.due||0)<=now).slice(0,5);
 if(!due.length){area.innerHTML=`<p class="small">目前沒有到期項目。已完成的錯題會依間隔自動排回來。</p>`;return}
 area.innerHTML=due.map(o=>`<div class="reviewItem"><div><b>${lu[o.x.unit]}</b><br><span class="small">${o.x.text}</span></div><div><span class="due">第${(o.x.reviewStage||0)+1}輪</span><br><button class="btn2" style="margin-top:5px" onclick="markReviewed(${o.i})">完成回想</button></div></div>`).join("")
}
function renderReasonStats(){
 const area=document.getElementById("reasonStats");if(!area)return;
 const w=load("wrong",[]),cats=["觀念不熟","公式/定義忘記","題意看錯","計算失誤","方法太慢","粗心"],count={};cats.forEach(c=>count[c]=0);w.forEach(x=>{if(x.category)count[x.category]=(count[x.category]||0)+1});
 const total=Object.values(count).reduce((a,b)=>a+b,0);
 if(!total){area.innerHTML=`<p class="small">還沒有分類資料。到錯題本替幾題選擇錯因後，這裡會開始顯示你的模式。</p>`;return}
 area.innerHTML=cats.filter(c=>count[c]).sort((a,b)=>count[b]-count[a]).map(c=>`<div class="masteryRow"><span>${c}</span><div class="masteryBar"><div class="masteryFill" style="width:${Math.round(count[c]/total*100)}%;background:#7c8bf0"></div></div><b>${count[c]}</b></div>`).join("")
}
function renderStats(){const d=load("done",[]),w=load("weak",[]),wr=load("wrong",[]);let papers=0;Object.keys(TESTS).forEach(c=>{if(load("score_"+c,null))papers++});document.getElementById("doneN").textContent=d.length;document.getElementById("weakN").textContent=w.length;document.getElementById("wrongN").textContent=wr.length;document.getElementById("paperN").textContent=papers;const p=Math.round(d.length/UNITS.length*100);document.getElementById("pct").textContent=p+"%";document.getElementById("fill").style.width=p+"%"}
window.addEventListener("click",e=>{if(e.target.id==="modal")closeQuiz()});
loadData().then(init).catch(err=>{
  console.error(err);
  document.body.innerHTML = `
    <div style="max-width:760px;margin:60px auto;padding:24px;font-family:sans-serif">
      <h1>資料載入失敗</h1>
      <p>這個 3.3 版本把題庫拆成 JSON 資料檔，因此請透過 GitHub Pages 或本機 HTTP 伺服器開啟，不要直接以 file:// 雙擊 HTML。</p>
      <pre style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:8px">${err}</pre>
    </div>`;
});