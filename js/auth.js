/* ---------- AUTH (Supabase Auth) ---------- */
let authMode = "login";   // login | register | forgot | recovery

function switchAuth(m){authMode=m;renderAuth()}

async function doRegister(ev){
  ev.preventDefault();
  const btn = ev.target.querySelector("button");
  await guard(btn, async ()=>{
    const u=document.getElementById("reg_user").value.trim();
    const email=document.getElementById("reg_email").value.trim();
    const p1=document.getElementById("reg_pass").value;
    const p2=document.getElementById("reg_pass2").value;
    if(!u||!email||!p1){toast("Попълни всички полета");return}
    if(u.length<2||u.length>32){toast("Потребителското име е между 2 и 32 символа");return}
    if(p1.length<6){toast("Паролата трябва да е поне 6 символа");return}
    if(p1!==p2){toast("Паролите не съвпадат");return}

    const free = ok(await sb.rpc("username_available",{uname:u}));
    if(!free){toast("Това потребителско име вече е заето");return}

    const {data,error} = await sb.auth.signUp({email,password:p1,options:{data:{username:u}}});
    if(error){toast(error.message);return}
    if(!data.session){
      toast("Провери имейла си за потвърждение");
      authMode="login";renderAuth();return;
    }
    await bootSession(data.session);
  });
}

async function doLogin(ev){
  ev.preventDefault();
  const btn = ev.target.querySelector("button");
  await guard(btn, async ()=>{
    const login=document.getElementById("log_user").value.trim();
    const p=document.getElementById("log_pass").value;
    let email = login;
    if(!login.includes("@")){
      const found = ok(await sb.rpc("email_for_username",{uname:login}));
      if(!found){toast("Грешно потребителско име или парола");return}
      email = found;
    }
    const {data,error} = await sb.auth.signInWithPassword({email,password:p});
    if(error){toast("Грешно потребителско име или парола");return}
    await bootSession(data.session);
  });
}

async function doForgot(ev){
  ev.preventDefault();
  const btn = ev.target.querySelector("button");
  await guard(btn, async ()=>{
    const email=document.getElementById("fg_email").value.trim();
    if(!email){toast("Въведи имейл");return}
    const {error} = await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    if(error){toast(error.message);return}
    toast("Изпратихме ти линк за смяна на паролата");
    authMode="login";renderAuth();
  });
}

async function doRecovery(ev){
  ev.preventDefault();
  const btn = ev.target.querySelector("button");
  await guard(btn, async ()=>{
    const p1=document.getElementById("rc_pass").value;
    const p2=document.getElementById("rc_pass2").value;
    if(p1.length<6){toast("Паролата трябва да е поне 6 символа");return}
    if(p1!==p2){toast("Паролите не съвпадат");return}
    const {error} = await sb.auth.updateUser({password:p1});
    if(error){toast(error.message);return}
    toast("Паролата е сменена");
    history.replaceState(null,"",location.pathname);
    const {data} = await sb.auth.getSession();
    await bootSession(data.session);
  });
}

async function logout(){
  await sb.auth.signOut();
  clearState();
  currentView="home";authMode="login";
  render();
}

function authHeader(title){
  return `<div class="auth-logo"><span class="mark">\u{1F958}</span><h2>${title}</h2></div>`;
}
function renderAuth(){
  const app=document.getElementById("app");
  const tabs=`<div class="authtabs">
<button class="${authMode==="login"?"active":""}" onclick="switchAuth('login')">Вход</button>
<button class="${authMode==="register"?"active":""}" onclick="switchAuth('register')">Регистрация</button>
</div>`;

  if(authMode==="login"){
    app.innerHTML=`<div class="authwrap">
${authHeader("Добре дошъл отново")}
${tabs}
<form onsubmit="doLogin(event)">
<div class="field"><label>Потребителско име или имейл</label><input id="log_user" required autocomplete="username" placeholder="stela или stela@mail.com"></div>
<div class="field"><label>Парола</label><input id="log_pass" type="password" required autocomplete="current-password" placeholder="••••••••"></div>
<button class="btn primary btn-block" style="margin-top:20px">Вход</button>
</form>
<p style="margin-top:16px;text-align:center"><a href="#" onclick="switchAuth('forgot');return false">Забравена парола?</a></p>
</div>`;
  }else if(authMode==="register"){
    app.innerHTML=`<div class="authwrap">
${authHeader("Създай профил")}
${tabs}
<form onsubmit="doRegister(event)">
<div class="field"><label>Потребителско име</label><input id="reg_user" required autocomplete="username" placeholder="Как да те намират приятелите"></div>
<div class="field"><label>Имейл</label><input id="reg_email" type="email" required autocomplete="email" placeholder="stela@mail.com"></div>
<div class="field"><label>Парола</label><input id="reg_pass" type="password" required autocomplete="new-password" placeholder="Поне 6 символа"></div>
<div class="field"><label>Потвърди парола</label><input id="reg_pass2" type="password" required autocomplete="new-password" placeholder="••••••••"></div>
<button class="btn primary btn-block" style="margin-top:20px">Регистрирай се</button>
</form>
</div>`;
  }else if(authMode==="recovery"){
    app.innerHTML=`<div class="authwrap">
${authHeader("Задай нова парола")}
<form onsubmit="doRecovery(event)">
<div class="field"><label>Нова парола</label><input id="rc_pass" type="password" required autocomplete="new-password" placeholder="Поне 6 символа"></div>
<div class="field"><label>Потвърди новата парола</label><input id="rc_pass2" type="password" required autocomplete="new-password" placeholder="••••••••"></div>
<button class="btn primary btn-block" style="margin-top:20px">Запази паролата</button>
</form>
</div>`;
  }else{
    app.innerHTML=`<div class="authwrap">
${authHeader("Забравена парола")}
<p class="muted" style="text-align:center;margin-bottom:22px">Въведи имейла си — ще ти изпратим линк за нова парола.</p>
<form onsubmit="doForgot(event)">
<div class="field"><label>Имейл</label><input id="fg_email" type="email" required autocomplete="email" placeholder="stela@mail.com"></div>
<button class="btn primary btn-block" style="margin-top:20px">Изпрати линк</button>
</form>
<p style="margin-top:16px;text-align:center"><a href="#" onclick="switchAuth('login');return false">← Обратно към вход</a></p>
</div>`;
  }
}
