/* ---------- CONSTANTS ---------- */
const DAYS=["Понеделник","Вторник","Сряда","Четвъртък","Петък","Събота","Неделя"];
const MEALS=["Закуска","Обяд","Вечеря","Друго"];
const UNITS=["г","кг","мл","л","бр","ч.л.","с.л.","ч.ч","кафена чаша","щипка","шепа","пакет","стрък","скилидка"];

/* ---------- HELPERS ---------- */
/* Разчита количество, писано както е удобно на човек:
   "2", "0.5", "0,5", "1/2", "3 / 4", "1 1/2". Връща число (0 при глупост). */
function parseQty(v){
  if(typeof v==="number")return isFinite(v)?v:0;
  const s=String(v??"").trim().replace(",",".");
  if(!s)return 0;
  const m=s.match(/^(?:(\d+(?:\.\d+)?)\s+)?(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if(m){
    const den=parseFloat(m[3]);
    if(!den)return 0;
    return (m[1]?parseFloat(m[1]):0)+parseFloat(m[2])/den;
  }
  const n=parseFloat(s);
  return isFinite(n)?n:0;
}

/* Показва число обратно като дроб, когато така се чете по-лесно:
   0.5 → "1/2", 1.25 → "1 1/4", 2 → "2", 0.33 → "1/3", 1.07 → "1.07". */
const QTY_FRACTIONS=[[1/2,"1/2"],[1/3,"1/3"],[2/3,"2/3"],[1/4,"1/4"],[3/4,"3/4"]];
function fmtQty(n){
  if(!isFinite(n))return "0";
  const sign=n<0?"-":"";
  n=Math.abs(n);
  const whole=Math.floor(n+1e-9);
  const frac=n-whole;
  if(frac<0.005)return sign+whole;
  for(const [value,label] of QTY_FRACTIONS){
    if(Math.abs(frac-value)<0.01)return sign+(whole?whole+" ":"")+label;
  }
  return sign+String(Number(n.toFixed(2)));
}
function escHtml(s){return String(s??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
/* За стойност, която влиза в JS низ в единични кавички ВЪТРЕ в HTML атрибут:
   първо екранираме за JS, после за HTML — браузърът връща точния низ обратно. */
function escJs(s){return escHtml(String(s ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'"))}
function toast(t){const e=document.getElementById("toast");e.textContent=t;e.classList.remove("hidden");clearTimeout(toast._t);toast._t=setTimeout(()=>e.classList.add("hidden"),2200)}
function openModal(html){
  const m=document.getElementById("modal");
  m.classList.remove("hidden");
  m.innerHTML=html;
  document.body.style.overflow="hidden";
}
function closeModal(){
  document.getElementById("modal").classList.add("hidden");
  document.body.style.overflow="";
}
/* Обща рамка за модал: закачена заглавка, скролващо тяло, закачен ред с бутони. */
function modalShell(title,body,foot,cls){
  return `<div class="modalbox ${cls||""}">
<div class="modal-head"><h2>${title}</h2><button class="close" onclick="closeModal()" aria-label="Затвори">×</button></div>
<div class="modal-body">${body}</div>
${foot?`<div class="modal-foot">${foot}</div>`:""}
</div>`;
}
/* Затваряне с клик върху фона и с Esc. */
document.addEventListener("click",e=>{
  if(e.target&&e.target.id==="modal")closeModal();
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!document.getElementById("modal").classList.contains("hidden"))closeModal();
});

/* ---------- ПРАЗНИ СЪСТОЯНИЯ / ЗАРЕЖДАНЕ ---------- */
function emptyState(icon,title,text,action){
  return `<div class="empty"><span class="ei">${icon}</span><h3>${escHtml(title)}</h3>${text?`<p>${escHtml(text)}</p>`:""}${action||""}</div>`;
}
function skeletonCards(n){
  return `<div class="grid">${Array.from({length:n||6},()=>`
<div class="sk-card"><div class="sk sk-img"></div><div class="sk-body">
<div class="sk" style="height:11px;width:35%"></div>
<div class="sk" style="height:17px;width:75%"></div>
<div class="sk" style="height:11px;width:55%"></div>
</div></div>`).join("")}</div>`;
}
function initials(name){
  const s=String(name||"").trim();
  if(!s)return "?";
  const parts=s.split(/[\s._-]+/).filter(Boolean);
  return (parts.length>1?parts[0][0]+parts[1][0]:s.slice(0,2)).toUpperCase();
}
function unitsLinkHtml(){return `<a href="https://www.supichka.com/%D1%80%D0%B5%D1%86%D0%B5%D0%BF%D1%82%D0%B0/453/%D0%BC%D0%B5%D1%80%D0%BD%D0%B8-%D0%B5%D0%B4%D0%B8%D0%BD%D0%B8%D1%86%D0%B8-%D0%B2-%D0%BA%D1%83%D1%85%D0%BD%D1%8F%D1%82%D0%B0-%D0%BA%D1%83%D1%85%D0%BD%D0%B5%D0%BD%D1%81%D0%BA%D0%B8-%D0%BC%D0%B5%D1%80%D0%BA%D0%B8" target="_blank" rel="noopener" style="font-size:12px;color:var(--green);text-decoration:none;margin-left:10px;font-weight:400">📏 Мерни единици</a>`}

/* Спира двойно натискане на бутон, докато чакаме базата. */
async function guard(btn,fn){
  if(btn){if(btn.disabled)return;btn.disabled=true}
  try{return await fn()}
  catch(e){console.error(e);toast(e&&e.message?e.message:"Възникна грешка")}
  finally{if(btn)btn.disabled=false}
}
/* ---------- СНИМКИ ---------- */
const PHOTO_MAX_SIDE = 1280;      // по-голямо няма смисъл за карта/детайл
const PHOTO_QUALITY  = 0.82;
const PHOTO_MAX_INPUT_BYTES = 20 * 1024 * 1024;

/* Смалява снимката в браузъра преди качване — снимка от телефон е 5-8 MB,
   а на екрана се вижда като 1280px. Връща JPEG blob. */
async function resizeImage(file, maxSide=PHOTO_MAX_SIDE, quality=PHOTO_QUALITY){
  const bitmap = await createImageBitmap(file, {imageOrientation:"from-image"});
  const scale = Math.min(1, maxSide/Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width*scale));
  const h = Math.max(1, Math.round(bitmap.height*scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  if(bitmap.close)bitmap.close();
  const blob = await new Promise(res=>canvas.toBlob(res, "image/jpeg", quality));
  if(!blob)throw new Error("Неуспешна обработка на снимката");
  return blob;
}

function loadingHtml(text){return `<p class="muted" style="padding:22px 0">${escHtml(text||"Зареждане...")}</p>`}
