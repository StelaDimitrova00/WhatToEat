/* ---------- CONSTANTS ---------- */
const DAYS=["Понеделник","Вторник","Сряда","Четвъртък","Петък","Събота","Неделя"];
const MEALS=["Закуска","Обяд","Вечеря","Друго"];
const DEFAULT_CATS=["Закуска","Салата","Основно","Гарнитура","Десерт","Снакс","Друго"];
const UNITS=["г","кг","мл","л","бр","ч.л.","с.л.","ч.ч","кафена чаша","щипка","шепа","пакет","стрък","скилидка"];

/* ---------- HELPERS ---------- */
function fmt(n){return Number.isInteger(n)?n:n.toFixed(2).replace(/\.00$/,"")}
function escHtml(s){return String(s??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
/* За стойност, която влиза в JS низ в единични кавички ВЪТРЕ в HTML атрибут:
   първо екранираме за JS, после за HTML — браузърът връща точния низ обратно. */
function escJs(s){return escHtml(String(s ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'"))}
function toast(t){const e=document.getElementById("toast");e.textContent=t;e.classList.remove("hidden");clearTimeout(toast._t);toast._t=setTimeout(()=>e.classList.add("hidden"),2200)}
function openModal(html){const m=document.getElementById("modal");m.classList.remove("hidden");m.innerHTML=html}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
function unitsLinkHtml(){return `<a href="https://www.supichka.com/%D1%80%D0%B5%D1%86%D0%B5%D0%BF%D1%82%D0%B0/453/%D0%BC%D0%B5%D1%80%D0%BD%D0%B8-%D0%B5%D0%B4%D0%B8%D0%BD%D0%B8%D1%86%D0%B8-%D0%B2-%D0%BA%D1%83%D1%85%D0%BD%D1%8F%D1%82%D0%B0-%D0%BA%D1%83%D1%85%D0%BD%D0%B5%D0%BD%D1%81%D0%BA%D0%B8-%D0%BC%D0%B5%D1%80%D0%BA%D0%B8" target="_blank" rel="noopener" style="font-size:12px;color:var(--green);text-decoration:none;margin-left:10px;font-weight:400">📏 Мерни единици</a>`}

/* Спира двойно натискане на бутон, докато чакаме базата. */
async function guard(btn,fn){
  if(btn){if(btn.disabled)return;btn.disabled=true}
  try{return await fn()}
  catch(e){console.error(e);toast(e&&e.message?e.message:"Възникна грешка")}
  finally{if(btn)btn.disabled=false}
}
function loadingHtml(text){return `<p class="muted" style="padding:20px 0">${escHtml(text||"Зареждане...")}</p>`}
