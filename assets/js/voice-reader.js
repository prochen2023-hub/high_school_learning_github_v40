(function(){
"use strict";
const synth=window.speechSynthesis;
let activeBtn=null, activeTarget=null, utterance=null, voices=[], mutationTimer=null;

const TARGETS=[
 ".questHeroCard",".questCoach",".threeTakeaways>div",".checkpointCard",".finalMotto",
 ".conceptCard",".termCard",".signalBox",".worked",".variationBox",".quickCard",
 ".priorCard",".recallCard",".minimumCard",".scenarioCard",".lifeProblem",
 ".firstLearnNote",".masterIntro",".hintStrip",".whyBox",".feedback",".questFeedback",".lifeFeedback","[data-voice]"
].join(",");

const REMOVE_SELECTORS=[
 "button","input","select","textarea",".voiceReadBtn",".exampleBtns",".qactions",
 ".lifeOptions",".questChoices",".presetRow",".controlRow",".dualSliders",
 ".threeControls",".fourControls",".soloSlider",".interactiveToolbar",
 ".previewOptions",".reviewButtons",".summaryActions",".typeBadge",".valueBadge",
 ".questNav",".questRail",".youthNudge",".whyBox",".workedStep:not(.show)","details:not([open])",".hidden","[hidden]","[aria-hidden='true']"
].join(",");

function loadVoices(){voices=synth?synth.getVoices():[]}
if(synth){
 loadVoices();
 if("onvoiceschanged" in synth)synth.onvoiceschanged=loadVoices;
}

function scoreVoice(v){
 const lang=(v.lang||"").toLowerCase(),name=(v.name||"").toLowerCase();
 let s=0;
 if(lang==="zh-tw")s+=120;
 else if(lang.startsWith("zh-tw"))s+=110;
 else if(lang.includes("hant"))s+=100;
 else if(lang.startsWith("zh"))s+=75;
 if(/hsiao|yating|meijia|mei-jia|ting-ting|國語|mandarin|taiwan/.test(name))s+=28;
 if(v.localService)s+=4;
 return s;
}
function bestVoice(){
 loadVoices();
 const c=voices.filter(v=>(v.lang||"").toLowerCase().startsWith("zh"));
 if(!c.length)return null;
 return c.slice().sort((a,b)=>scoreVoice(b)-scoreVoice(a))[0]||null
}
function cleanText(el){
 const c=el.cloneNode(true);
 c.querySelectorAll(REMOVE_SELECTORS).forEach(n=>n.remove());
 let t=(c.innerText||c.textContent||"").replace(/\s+/g," ").trim();
 return speechFriendly(t)
}
function speechFriendly(t){
 return t
  .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu," ")
  .replace(/([=（(,，:]\s*)[−-](\d+(?:\.\d+)?)/g,"$1負 $2")
  .replace(/(\d+)\s*\/\s*(\d+)/g,"$2 分之 $1")
  .replace(/m₁/g,"m 一").replace(/m₂/g,"m 二")
  .replace(/x₁/g,"x 一").replace(/x₂/g,"x 二")
  .replace(/y₁/g,"y 一").replace(/y₂/g,"y 二")
  .replace(/Δx/g,"delta x").replace(/Δy/g,"delta y")
  .replace(/≥/g," 大於等於 ").replace(/≤/g," 小於等於 ")
  .replace(/≠/g," 不等於 ").replace(/≈/g," 約等於 ")
  .replace(/→/g,"，所以 ").replace(/⇔/g,"，等價於 ")
  .replace(/×/g," 乘以 ").replace(/÷/g," 除以 ")
  .replace(/\+/g," 加 ").replace(/[−–—]/g," 減 ")
  .replace(/=/g," 等於 ").replace(/>/g," 大於 ").replace(/</g," 小於 ")
  .replace(/\^2\b/g," 的平方 ").replace(/\^3\b/g," 的三次方 ")
  .replace(/²/g," 平方 ").replace(/³/g," 三次方 ")
  .replace(/\//g," 除以 ")
  .replace(/\bGB\b/gi," G B ")
  .replace(/\bXP\b/gi," X P ")
  .replace(/\s+/g," ").trim()
}
function resetButton(btn){
 if(!btn)return;
 btn.classList.remove("speaking","paused");
 btn.innerHTML="🔊";
 btn.setAttribute("aria-label","播放語音導讀");
 btn.title="播放語音導讀"
}
function resetActive(){
 resetButton(activeBtn);
 activeBtn=null;activeTarget=null;utterance=null
}
function stop(){
 if(synth){synth.cancel()}
 resetActive()
}
function speakTarget(target,btn){
 if(!synth)return;
 if(activeTarget===target){
  if(synth.paused){
   synth.resume();btn.classList.remove("paused");btn.classList.add("speaking");
   btn.innerHTML="⏸";btn.setAttribute("aria-label","暫停語音導讀");btn.title="暫停語音導讀";
   return
  }
  if(synth.speaking){
   synth.pause();btn.classList.remove("speaking");btn.classList.add("paused");
   btn.innerHTML="▶";btn.setAttribute("aria-label","繼續語音導讀");btn.title="繼續語音導讀";
   return
  }
 }
 if(activeBtn)resetButton(activeBtn);
 synth.cancel();
 const text=cleanText(target);
 if(!text)return;
 utterance=new SpeechSynthesisUtterance(text);
 utterance.lang="zh-TW";
 utterance.rate=.88;
 utterance.pitch=1.0;
 utterance.volume=1;
 const v=bestVoice();if(v)utterance.voice=v;
 activeBtn=btn;activeTarget=target;
 btn.classList.add("speaking");btn.innerHTML="⏸";
 btn.setAttribute("aria-label","暫停語音導讀");btn.title="暫停語音導讀";
 utterance.onend=resetActive;
 utterance.onerror=()=>resetActive();
 setTimeout(()=>synth.speak(utterance),45)
}
function eligible(el){
 if(!el||el.dataset.voiceReady==="1")return false;
 if(el.closest(".modal:not(.show),.hidden"))return false;
 const text=(el.innerText||el.textContent||"").replace(/\s+/g," ").trim();
 return text.length>=14
}
function enhance(root=document){
 if(!synth)return;
 root.querySelectorAll?.(TARGETS).forEach(el=>{
  if(!eligible(el))return;
  // Avoid nested duplicate controls: prefer the most specific inner teaching card.
  if(el.matches(".conceptCard,.worked,.checkpointCard,.scenarioCard,.lifeProblem,.quickCard,.priorCard,.recallCard,.termCard,.signalBox,.threeTakeaways>div,.questCoach,.questHeroCard,.finalMotto,.minimumCard,.firstLearnNote,.masterIntro,.hintStrip,.whyBox,.feedback,.questFeedback,.lifeFeedback,[data-voice]")){
   el.dataset.voiceReady="1";el.classList.add("voiceReadable");
   const btn=document.createElement("button");
   btn.type="button";btn.className="voiceReadBtn";btn.innerHTML="🔊";
   btn.setAttribute("aria-label","播放語音導讀");btn.title="播放語音導讀";
   btn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();speakTarget(el,btn)});
   el.appendChild(btn)
  }
 })
}
function boot(){
 if(!synth){document.documentElement.classList.add("noSpeechApi");return}
 enhance(document);
 const obs=new MutationObserver(()=>{
  clearTimeout(mutationTimer);mutationTimer=setTimeout(()=>enhance(document),90)
 });
 obs.observe(document.body,{childList:true,subtree:true});
 document.addEventListener("visibilitychange",()=>{if(document.hidden&&synth.speaking&&!synth.paused)synth.pause()});
 window.addEventListener("beforeunload",stop)
}
window.HSLVoice={boot,stop,enhance,bestVoice};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
else boot();
})();