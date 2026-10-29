(function(){
"use strict";
const STORE_KEY="hsl_accounts_v1";
const CURRENT_KEY="hsl_current_account_v1";
const SCHEMA=1;

function safeParse(x,fallback){try{return JSON.parse(x)||fallback}catch(e){return fallback}}
function store(){const s=safeParse(localStorage.getItem(STORE_KEY),null);return s&&s.schema===SCHEMA?s:{schema:SCHEMA,accounts:{},updatedAt:null}}
function write(s){s.updatedAt=new Date().toISOString();localStorage.setItem(STORE_KEY,JSON.stringify(s))}
function normalizeId(id){return String(id||"").trim().toLowerCase()}
function validId(id){return /^[a-z0-9_\-\u4e00-\u9fff]{2,24}$/i.test(id)}
function currentId(){return localStorage.getItem(CURRENT_KEY)||""}
function getAccount(id=currentId()){const s=store();return s.accounts[normalizeId(id)]||null}
function allAccounts(){return Object.values(store().accounts).sort((a,b)=>(b.lastActivityAt||b.lastLoginAt||"").localeCompare(a.lastActivityAt||a.lastLoginAt||""))}
function login(id,displayName){
 id=normalizeId(id);displayName=String(displayName||"").trim();
 if(!validId(id))throw new Error("帳號請用 2–24 個中文字、英數字、_ 或 -。");
 const s=store(),now=new Date().toISOString();
 let a=s.accounts[id];
 if(!a){
  a={id,displayName:displayName||id,role:"student",createdAt:now,lastLoginAt:now,lastActivityAt:now,
     auth:{mode:"none",passwordHash:null},progress:{},profile:{grade:"高一",target:"中上"}};
  s.accounts[id]=a;
 }else{
  if(displayName)a.displayName=displayName;
  a.lastLoginAt=now;
 }
 write(s);localStorage.setItem(CURRENT_KEY,id);emit("login",a);return a
}
function logout(){const a=getAccount();localStorage.removeItem(CURRENT_KEY);emit("logout",a)}
function loadProgress(namespace){const a=getAccount();return a?.progress?.[namespace]||null}
function saveProgress(namespace,data){
 const id=currentId();if(!id)return false;
 const s=store(),a=s.accounts[id];if(!a)return false;
 a.progress=a.progress||{};a.progress[namespace]=data;a.lastActivityAt=new Date().toISOString();
 write(s);emit("progress",a);return true
}
function deleteAccount(id){id=normalizeId(id);const s=store();if(!s.accounts[id])return false;delete s.accounts[id];write(s);if(currentId()===id)localStorage.removeItem(CURRENT_KEY);return true}
function exportAll(){return JSON.stringify(store(),null,2)}
function importAll(text){
 const incoming=safeParse(text,null);
 if(!incoming||incoming.schema!==SCHEMA||!incoming.accounts)throw new Error("備份格式不正確。");
 const s=store();
 for(const [id,a] of Object.entries(incoming.accounts))s.accounts[id]=a;
 write(s);emit("import",null);return Object.keys(incoming.accounts).length
}
function emit(type,account){window.dispatchEvent(new CustomEvent("hsl-account-change",{detail:{type,account}}))}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function inject(){
 if(document.getElementById("hslAccountOverlay"))return;
 const div=document.createElement("div");div.id="hslAccountOverlay";div.className="accountOverlay";
 div.innerHTML=`<div class="accountDialog"><button class="accountClose" id="accountCloseBtn" aria-label="關閉">×</button>
 <div class="accountLogo">∑</div><h2 id="accountDialogTitle">登入學習帳號</h2>
 <p class="accountLead">目前先用簡單帳號辨識，不設定密碼。之後可升級成帳密或雲端登入。</p>
 <div id="accountCurrent"></div>
 <form id="accountLoginForm">
  <label>帳號代號<input id="accountIdInput" autocomplete="username" placeholder="例如 chen01" maxlength="24"></label>
  <label>顯示名稱<input id="accountNameInput" placeholder="例如 阿哲" maxlength="20"></label>
  <button class="accountPrimary" type="submit">登入／建立帳號</button>
 </form>
 <div class="accountPrivacy">進度目前儲存在此網站網域的瀏覽器中；更新網站版本不會清掉。清除瀏覽器資料或換裝置則不會自動帶過去。</div>
 </div>`;
 document.body.appendChild(div);
 div.addEventListener("click",e=>{if(e.target===div)closePanel()});
 document.getElementById("accountCloseBtn").onclick=closePanel;
 document.getElementById("accountLoginForm").onsubmit=e=>{
  e.preventDefault();
  const msg=document.getElementById("accountCurrent");
  try{
   const a=login(document.getElementById("accountIdInput").value,document.getElementById("accountNameInput").value);
   msg.innerHTML=`<div class="accountSuccess">✓ 已登入 ${esc(a.displayName)}（${esc(a.id)}）</div>`;
   setTimeout(()=>location.reload(),350);
  }catch(err){msg.innerHTML=`<div class="accountError">${esc(err.message)}</div>`}
 };
}
function openPanel(){
 inject();const overlay=document.getElementById("hslAccountOverlay"),a=getAccount(),cur=document.getElementById("accountCurrent");
 if(a){
  document.getElementById("accountDialogTitle").textContent="學習帳號";
  cur.innerHTML=`<div class="accountSigned"><b>${esc(a.displayName)}</b><span>@${esc(a.id)}</span><small>進度會自動存到此帳號</small><button type="button" id="accountLogoutBtn">登出／切換帳號</button></div>`;
  document.getElementById("accountLoginForm").style.display="none";
  document.getElementById("accountLogoutBtn").onclick=()=>{logout();location.reload()};
 }else{
  document.getElementById("accountDialogTitle").textContent="登入學習帳號";
  cur.innerHTML="";document.getElementById("accountLoginForm").style.display="grid";
 }
 overlay.classList.add("show");document.body.classList.add("accountModalOpen");
}
function closePanel(){document.getElementById("hslAccountOverlay")?.classList.remove("show");document.body.classList.remove("accountModalOpen")}
function updateBadges(){
 const a=getAccount();
 document.querySelectorAll("[data-account-name]").forEach(el=>el.textContent=a?a.displayName:"登入");
 document.querySelectorAll("[data-account-id]").forEach(el=>el.textContent=a?"@"+a.id:"尚未登入");
 document.querySelectorAll("[data-account-avatar]").forEach(el=>el.textContent=a?(a.displayName||a.id).slice(0,2).toUpperCase():"登入");
}
function boot(opts={}){
 inject();updateBadges();
 if(opts.promptIfMissing&&!getAccount())setTimeout(openPanel,250);
}
window.HSLAccount={STORE_KEY,CURRENT_KEY,SCHEMA,store,getAccount,allAccounts,login,logout,loadProgress,saveProgress,deleteAccount,exportAll,importAll,openPanel,closePanel,boot,updateBadges};
document.addEventListener("DOMContentLoaded",updateBadges);
})();