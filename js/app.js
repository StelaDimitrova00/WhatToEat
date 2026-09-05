/* ---------- NAV / ROUTING / BOOT ---------- */
let currentView="home";
let activeCat="Всички";

const NAV_ITEMS=[
  {view:"home",      label:"Начало",   icon:"\u{1F3E0}", go:"showHome()"},
  {view:"public",    label:"Рецепти",  icon:"\u{1F4D6}", go:"showPublic()"},
  {view:"friends",   label:"Приятели", icon:"\u{1F465}", go:"showFriends()"},
  {view:"dashboard", label:"Профил",   icon:"\u{1F4C5}", go:"showDashboard()"}
];
const LOGO_HTML=`<div class="logo"><span class="mark">\u{1F958}</span><span class="logo-text">Вкус у дома</span></div>`;

/* Хедърът се строи веднъж; после само се обновява кой раздел е активен.
   Така полето за търсене не се пресъздава и не губи фокус, докато пишеш. */
let navBuilt=false;

function renderNav(){
  const nav=document.getElementById("navbar");
  const tabs=document.getElementById("tabbar");

  if(!signedIn()){
    nav.innerHTML=LOGO_HTML;
    tabs.innerHTML="";tabs.classList.add("hidden");
    navBuilt=false;
    return;
  }

  if(!navBuilt){
    nav.innerHTML=`${LOGO_HTML}
<div class="nav-links">${NAV_ITEMS.map(i=>
  `<button class="navlink" data-view="${i.view}" onclick="${i.go}">${i.label}</button>`).join("")}</div>
<div class="nav-search"><span class="si">\u{1F50E}</span><input id="search" type="search" placeholder="Търси рецепта..." aria-label="Търси рецепта" oninput="onHeaderSearch()"></div>
<div class="nav-right">
<button class="btn primary" onclick="openRecipeForm()">+ Рецепта</button>
<button class="user-chip ghost" onclick="showDashboard()" title="Моят профил"><span class="avatar">${escHtml(initials(me().username))}</span><span class="uname">${escHtml(me().username||"")}</span></button>
<button class="icon-btn" onclick="logout()" title="Изход" aria-label="Изход">⏻</button>
</div>`;
    tabs.innerHTML=`${NAV_ITEMS.map(i=>
  `<button class="tab" data-view="${i.view}" onclick="${i.go}"><i>${i.icon}</i>${i.label}</button>`).join("")}
<button class="tab tab-add" onclick="openRecipeForm()"><i>+</i>Нова</button>`;
    navBuilt=true;
  }

  tabs.classList.remove("hidden");
  nav.querySelectorAll(".navlink").forEach(b=>
    b.classList.toggle("active",b.dataset.view===currentView));
  tabs.querySelectorAll(".tab[data-view]").forEach(b=>
    b.classList.toggle("active",b.dataset.view===currentView));
}

function searchQuery(){return (document.getElementById("search")?.value||"").trim()}

/* Едно поле за търсене обслужва и моите рецепти, и споделените.
   От друг изглед писането те връща в „Моите рецепти“. */
function onHeaderSearch(){
  if(currentView==="public"){renderPublicCards();return}
  if(currentView==="home"){renderCards();return}
  if(!searchQuery())return;
  currentView="home";activeCat="Всички";
  render();
}

function showHome(){currentView="home";activeCat="Всички";render()}
function showPublic(){currentView="public";activeCat="Всички";render()}
function showDashboard(){currentView="dashboard";render()}
function showFriends(){currentView="friends";render()}

function render(){
  renderNav();
  const app=document.getElementById("app");
  if(!signedIn()){renderAuth();return}
  if(currentView==="dashboard"){renderDashboard(app);return}
  if(currentView==="friends"){renderFriends(app);return}
  if(currentView==="public"){renderPublicFeed(app);return}
  renderHome(app);
}

/* Влизане в приложението след успешна автентикация. */
async function bootSession(session){
  if(!session){render();return}
  state.user=session.user;
  document.getElementById("app").innerHTML=skeletonCards(6);
  try{
    await loadAll();
  }catch(e){
    console.error(e);
    toast("Неуспешно зареждане на данните");
    await sb.auth.signOut();clearState();render();return;
  }
  currentView="home";activeCat="Всички";
  render();
}

function isRecoveryUrl(){return /type=recovery/.test(location.hash)||/type=recovery/.test(location.search)}

function configMissing(){
  return !window.SUPABASE_URL||window.SUPABASE_URL.includes("YOUR-PROJECT-REF")
      ||!SUPABASE_KEY||SUPABASE_KEY.includes("YOUR-PUBLISHABLE-KEY");
}

async function boot(){
  if(configMissing()){
    document.getElementById("app").innerHTML=
      `<div class="authwrap"><div class="auth-logo"><span class="mark">\u{1F958}</span><h2>Липсва конфигурация</h2></div>
<p class="muted" style="text-align:center">Попълни <b>SUPABASE_URL</b> и <b>SUPABASE_PUBLISHABLE_KEY</b> в <code>js/config.js</code>.</p></div>`;
    return;
  }
  document.getElementById("app").innerHTML=loadingHtml();

  sb.auth.onAuthStateChange((event)=>{
    if(event==="SIGNED_OUT"){clearState();currentView="home";authMode="login";render()}
  });

  const {data}=await sb.auth.getSession();

  if(isRecoveryUrl()){
    authMode="recovery";
    render();                       // state.user е null → показваме формата за нова парола
    return;
  }
  await bootSession(data.session);
}

boot();
