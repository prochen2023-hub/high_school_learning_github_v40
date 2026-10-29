
let SUBJECTS=[], subject=null, UNITS=[], examDef=null, bank={A:[],B:[]};
let originalBank={A:[],B:[]}, current=null, currentPaper=null, currentIndex=-1, dirty=false;

const $=id=>document.getElementById(id);
const clone=o=>JSON.parse(JSON.stringify(o));
const draftKey=()=>`hs_qm_v34_${subject?.id||"none"}_${examDef?.id||"none"}`;

async function getJSON(url){
  const r=await fetch(url,{cache:"no-store"});
  if(!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function downloadJSON(obj,name){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function status(msg,kind=""){
  const e=$("editorStatus"); if(!e)return;e.className=`status ${kind}`;e.textContent=msg;
}
function typeName(t){return {single:"單選",multi:"複選",fill:"填充",written:"非選"}[t]||t}
function paperQuestions(){return [...bank.A.map((q,i)=>({q,p:"A",i})),...bank.B.map((q,i)=>({q,p:"B",i}))]}

async function init(){
  try{
    SUBJECTS=await getJSON("data/subjects.json");
    const active=SUBJECTS.filter(x=>x.status==="active");
    $("subjectSelect").innerHTML=active.map(s=>`<option value="${s.id}">${s.name}｜${s.grade}</option>`).join("");
    $("subjectSelect").addEventListener("change",loadSubject);
    $("examSelect").addEventListener("change",loadExam);
    ["paperFilter","typeFilter","unitFilter"].forEach(id=>$(id).addEventListener("change",renderList));
    $("searchInput").addEventListener("input",renderList);
    $("fileImport").addEventListener("change",importJSON);
    await loadSubject();
  }catch(err){
    document.body.innerHTML=`<div style="max-width:760px;margin:60px auto;background:#fff;padding:24px;border-radius:16px;font-family:sans-serif"><h1>題庫管理資料載入失敗</h1><p>請用 GitHub Pages 或 START_LOCAL.bat 開啟，不要直接用 file:// 雙擊。</p><pre>${esc(err)}</pre></div>`;
  }
}
async function loadSubject(){
  subject=SUBJECTS.find(x=>x.id===$("subjectSelect").value)||SUBJECTS.find(x=>x.status==="active");
  $("examSelect").innerHTML=subject.exams.map(e=>`<option value="${e.id}">${e.name}</option>`).join("");
  UNITS=await getJSON(subject.units);
  const opts=UNITS.map(u=>`<option value="${u.id}">${u.title}</option>`).join("");
  $("unitFilter").innerHTML=`<option value="">全部單元</option>${opts}`;
  $("fUnit").innerHTML=opts;
  await loadExam();
}
async function loadExam(forceWeb=false){
  examDef=subject.exams.find(x=>x.id===$("examSelect").value)||subject.exams[0];
  originalBank=await getJSON(examDef.file);
  const saved=forceWeb?null:localStorage.getItem(draftKey());
  if(saved){
    try{bank=JSON.parse(saved);$("draftBadge").classList.remove("hidden")}catch(e){bank=clone(originalBank)}
  }else{
    bank=clone(originalBank);$("draftBadge").classList.add("hidden")
  }
  current=null;currentPaper=null;currentIndex=-1;dirty=false;
  closeEditor();renderList();renderStats();
}
function saveDraft(){
  localStorage.setItem(draftKey(),JSON.stringify(bank));
  $("draftBadge").classList.remove("hidden");dirty=true;
}
function renderStats(){
  const all=paperQuestions(),points=p=>bank[p].reduce((s,q)=>s+(Number(q.points)||0),0);
  const ids=all.map(x=>x.q.id).filter(Boolean),dups=ids.filter((id,i)=>ids.indexOf(id)!==i);
  const invalid=all.filter(x=>validateQuestion(x.q).length).length;
  $("stats").innerHTML=`
    <span class="stat">A卷 ${bank.A.length}題／${points("A")}分</span>
    <span class="stat">B卷 ${bank.B.length}題／${points("B")}分</span>
    <span class="stat">總題數 ${all.length}</span>
    <span class="stat ${dups.length?"bad":"good"}">重複ID ${new Set(dups).size}</span>
    <span class="stat ${invalid?"warn":"good"}">欄位待檢查 ${invalid}</span>`;
}
function filtered(){
  const paper=$("paperFilter").value,type=$("typeFilter").value,unit=$("unitFilter").value,s=$("searchInput").value.trim().toLowerCase();
  return paperQuestions().filter(x=>{
    const q=x.q,hay=[q.id,q.text,q.explain,q.quick,q.level,q.context,q.source,(q.tags||[]).join(" ")].join(" ").toLowerCase();
    return (!paper||x.p===paper)&&(!type||q.type===type)&&(!unit||q.unit===unit)&&(!s||hay.includes(s));
  });
}
function renderList(){
  const arr=filtered();
  $("qList").innerHTML=arr.length?arr.map(x=>`
    <div class="qitem ${currentPaper===x.p&&currentIndex===x.i?"on":""}" onclick="selectQuestion('${x.p}',${x.i})">
      <div class="qmeta"><span class="pill">${x.p}卷</span><span class="pill">${typeName(x.q.type)}</span><span class="pill">${esc(x.q.level||"")}</span><span class="pill">${Number(x.q.points)||0}分</span></div>
      <div class="qtext">${esc(x.q.text)}</div>
      <div class="qid">${esc(x.q.id)}｜${esc(UNITS.find(u=>u.id===x.q.unit)?.title||x.q.unit)}</div>
    </div>`).join(""):`<div class="note">沒有符合條件的題目。</div>`;
  renderStats();
}
function selectQuestion(p,i){
  currentPaper=p;currentIndex=i;current=clone(bank[p][i]);
  openEditor();fillForm(current,p);renderList();
}
function openEditor(){$("emptyEditor").classList.add("hidden");$("editorForm").classList.remove("hidden")}
function closeEditor(){$("emptyEditor").classList.remove("hidden");$("editorForm").classList.add("hidden");$("editorTitle").textContent="題目編輯器"}
function fillForm(q,p){
  $("editorTitle").textContent=`編輯｜${q.id||"新題目"}`;
  $("fPaper").value=p||"A";$("fType").value=q.type||"single";$("fUnit").value=q.unit||UNITS[0]?.id||"";
  $("fPoints").value=q.points??3;$("fId").value=q.id||"";$("fLevel").value=q.level||"";
  $("fContext").value=q.context||"";$("fText").value=q.text||"";$("fExplain").value=q.explain||"";
  $("fQuick").value=q.quick||"";$("fTags").value=Array.isArray(q.tags)?q.tags.join(", "):(q.tags||"");
  $("fSource").value=q.source||"";
  renderTypeFields(q);status("已載入題目。修改後按「儲存題目」。");
}
function renderTypeFields(q=null){
  const type=$("fType").value,q0=q||current||{},el=$("typeFields");
  if(type==="single"||type==="multi"){
    const ans=type==="multi"?(Array.isArray(q0.answer)?q0.answer.map(i=>String.fromCharCode(65+Number(i))).join(","):""):(Number.isInteger(q0.answer)?String.fromCharCode(65+q0.answer):"");
    el.innerHTML=`<div class="formGrid"><div class="field span2"><label>選項（每行一個）</label><textarea id="fOptions">${esc((q0.options||[]).join("\n"))}</textarea></div><div class="field span2"><label>${type==="single"?"正確答案":"正確答案（複選）"}</label><input id="fAnswerChoice" value="${esc(ans)}" placeholder="${type==="single"?"A":"A,C"}"><div class="help">用 A/B/C/D 表示；複選以逗號分隔。</div></div></div>`;
  }else if(type==="fill"){
    el.innerHTML=`<div class="field"><label>可接受答案（每行一個）</label><textarea id="fFillAnswers">${esc((Array.isArray(q0.answer)?q0.answer:[q0.answer||""]).join("\n"))}</textarea><div class="help">不同寫法都可各放一行，例如 -3/4 與 −3/4。</div></div>`;
  }else{
    el.innerHTML=`<div class="formGrid"><div class="field span2"><label>參考答案</label><textarea id="fWrittenAnswer">${esc(q0.answer||"")}</textarea></div><div class="field span2"><label>評分量規（每行一點）</label><textarea id="fRubric">${esc((q0.rubric||[]).join("\n"))}</textarea></div></div>`;
  }
}
function readForm(){
  const type=$("fType").value;
  const q=current?clone(current):{};
  q.id=$("fId").value.trim();q.type=type;q.unit=$("fUnit").value;q.points=Number($("fPoints").value)||0;
  q.level=$("fLevel").value.trim();q.text=$("fText").value.trim();q.explain=$("fExplain").value.trim();q.quick=$("fQuick").value.trim();
  q.context=$("fContext").value.trim();q.source=$("fSource").value.trim();
  q.tags=$("fTags").value.split(",").map(x=>x.trim()).filter(Boolean);
  if(type==="single"||type==="multi"){
    q.options=$("fOptions").value.split("\n").map(x=>x.trim()).filter(Boolean);
    const letters=$("fAnswerChoice").value.toUpperCase().split(",").map(x=>x.trim()).filter(Boolean);
    q.answer=type==="single"?(letters[0]?letters[0].charCodeAt(0)-65:null):letters.map(x=>x.charCodeAt(0)-65);
    delete q.rubric;
  }else if(type==="fill"){
    q.answer=$("fFillAnswers").value.split("\n").map(x=>x.trim()).filter(Boolean);delete q.options;delete q.rubric;
  }else{
    q.answer=$("fWrittenAnswer").value.trim();q.rubric=$("fRubric").value.split("\n").map(x=>x.trim()).filter(Boolean);delete q.options;
  }
  ["context","source"].forEach(k=>{if(!q[k])delete q[k]});if(!q.tags?.length)delete q.tags;
  return q;
}
function validateQuestion(q){
  const e=[];if(!q.id)e.push("缺少 id");if(!q.type)e.push("缺少 type");if(!q.unit)e.push("缺少 unit");if(!q.text)e.push("缺少題目文字");
  if(!Number.isFinite(Number(q.points))||Number(q.points)<=0)e.push("配分需 > 0");
  if(["single","multi"].includes(q.type)){
    if(!Array.isArray(q.options)||q.options.length<2)e.push("選項至少2個");
    if(q.type==="single"&&(!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length))e.push("單選答案索引錯誤");
    if(q.type==="multi"&&(!Array.isArray(q.answer)||!q.answer.length||q.answer.some(i=>!Number.isInteger(i)||i<0||i>=q.options.length)))e.push("複選答案索引錯誤");
  }
  if(q.type==="fill"&&(!Array.isArray(q.answer)||!q.answer.length))e.push("填充題至少1個可接受答案");
  if(q.type==="written"&&(!q.answer||!Array.isArray(q.rubric)||!q.rubric.length))e.push("非選題需參考答案與評分量規");
  return e;
}
function uniqueId(id,excludeP=null,excludeI=-1){
  return !paperQuestions().some(x=>x.q.id===id&&!(x.p===excludeP&&x.i===excludeI));
}
function autoId(p,type){
  const examNum=subject.exams.indexOf(examDef),prefix=`${examNum}${p}_${type[0]}`;
  let n=1,id;do{id=`${prefix}${String(n++).padStart(2,"0")}`}while(!uniqueId(id));return id;
}
function newQuestion(){
  current=null;currentPaper=null;currentIndex=-1;openEditor();
  const q={id:autoId("A","single"),type:"single",unit:UNITS[0]?.id||"",level:"標準",points:3,text:"",options:["","","",""],answer:0,explain:"",quick:""};
  fillForm(q,"A");current=q;$("editorTitle").textContent="新增題目";
}
function saveQuestion(){
  const q=readForm(),p=$("fPaper").value,errs=validateQuestion(q);
  if(!uniqueId(q.id,currentPaper,currentIndex))errs.push("題目 ID 已重複");
  if(errs.length){status("無法儲存："+errs.join("；"),"bad");return}
  if(currentPaper!==null&&currentIndex>=0){
    if(p===currentPaper) bank[p][currentIndex]=q;
    else{bank[currentPaper].splice(currentIndex,1);bank[p].push(q);currentIndex=bank[p].length-1;currentPaper=p}
  }else{
    bank[p].push(q);currentPaper=p;currentIndex=bank[p].length-1;
  }
  current=clone(q);saveDraft();renderList();renderStats();status("已儲存到瀏覽器草稿。匯出 JSON 後才會成為可上傳 GitHub 的檔案。","good");
  $("editorTitle").textContent=`編輯｜${q.id}`;
}
function duplicateQuestion(){
  if(!$("editorForm").classList.contains("hidden")){
    const q=readForm(),p=$("fPaper").value;q.id=autoId(p,q.type);bank[p].push(q);saveDraft();currentPaper=p;currentIndex=bank[p].length-1;current=clone(q);fillForm(q,p);renderList();status("已複製成新題，並自動產生新的 ID。","good");
  }
}
function deleteQuestion(){
  if(currentPaper===null||currentIndex<0)return;
  if(!confirm(`確定刪除 ${bank[currentPaper][currentIndex].id}？`))return;
  bank[currentPaper].splice(currentIndex,1);saveDraft();current=null;currentPaper=null;currentIndex=-1;closeEditor();renderList();renderStats();
}
function validateCurrent(){
  const q=readForm(),errs=validateQuestion(q);if(!uniqueId(q.id,currentPaper,currentIndex))errs.push("ID重複");
  status(errs.length?"檢查結果："+errs.join("；"):"這一題欄位完整，格式可用。",errs.length?"bad":"good");
}
function validateExam(){
  const all=paperQuestions(),errors=[];
  all.forEach(x=>validateQuestion(x.q).forEach(e=>errors.push(`${x.p}卷 ${x.q.id||"(無ID)"}：${e}`)));
  const ids=all.map(x=>x.q.id).filter(Boolean);[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))].forEach(id=>errors.push(`重複ID：${id}`));
  ["A","B"].forEach(p=>{const pts=bank[p].reduce((s,q)=>s+(Number(q.points)||0),0);if(pts!==100)errors.push(`${p}卷總分目前為 ${pts}，不是100分`);});
  alert(errors.length?`發現 ${errors.length} 個問題：\n\n${errors.slice(0,25).join("\n")}${errors.length>25?"\n…":""}`:"驗證通過：欄位格式、ID與A/B卷總分皆正常。");
}
function exportCurrentExam(){
  validateExam();
  downloadJSON(bank,`${examDef.id}.json`);
}
function exportCombined(){
  const obj={subject:subject.id,grade:subject.grade,exported_at:new Date().toISOString(),current_exam:examDef.id,current_bank:bank,
    note:"此檔為管理備份格式。正式學生網站仍使用 data/math/exam1.json、exam2.json、exam3.json。"};
  downloadJSON(obj,`${subject.id}_question_bank_backup.json`);
}
async function importJSON(e){
  const file=e.target.files[0];if(!file)return;
  try{
    const obj=JSON.parse(await file.text());
    if(!obj.A||!obj.B||!Array.isArray(obj.A)||!Array.isArray(obj.B))throw new Error("需要 {A:[...], B:[...]} 格式");
    bank=obj;saveDraft();current=null;currentPaper=null;currentIndex=-1;closeEditor();renderList();renderStats();alert("JSON 已載入本機草稿。確認後可重新匯出。");
  }catch(err){alert("匯入失敗："+err.message)}
  e.target.value="";
}
async function resetDraft(){
  if(!confirm("確定放棄這個段考的本機草稿，重新讀取網站上的 JSON？"))return;
  localStorage.removeItem(draftKey());await loadExam(true);
}
window.addEventListener("beforeunload",e=>{if(dirty){/* draft is autosaved; no blocking needed */}});
init();
