/* ---------- NAV / ROUTING / BOOT ---------- */
let currentView="home";
let activeCat="Всички";

function renderNav(){
  const nav=document.getElementById("navbar");
  if(!signedIn()){nav.innerHTML=`<div class="logo">Вкус у дома</div>`;return}
  nav.innerHTML=`<div class="logo">Вкус у дома</div>
<button onclick="showHome()">Начало</button>
<button onclick="showPublic()">Рецепти</button>
<button onclick="showFriends()">Приятели</button>
<button onclick="showDashboard()">Моят профил</button>
<button class="primary" onclick="openRecipeForm()">+ Добави рецепта</button>
<button class="ghost" onclick="logout()" title="Изход">⏻ ${escHtml(me().username||"")}</button>`;
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
  document.getElementById("app").innerHTML=loadingHtml("Зареждане на профила...");
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
      ||!window.SUPABASE_ANON_KEY||window.SUPABASE_ANON_KEY.includes("YOUR-PUBLIC");
}

async function boot(){
  if(configMissing()){
    document.getElementById("app").innerHTML=
      `<div class="authwrap"><h2 style="margin-top:0">Липсва конфигурация</h2>
<p class="muted">Попълни <b>SUPABASE_URL</b> и <b>SUPABASE_ANON_KEY</b> в <code>js/config.js</code>.</p></div>`;
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
