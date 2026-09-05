/* ---------- HOME (my recipes) ---------- */
function setCat(c){activeCat=c;render()}

function catChips(){
  return ["Всички",...me().categories].map(c=>
    `<button class="cat ${activeCat===c?"active":""}" data-c="${escHtml(c)}" onclick="setCat(this.dataset.c)">${escHtml(c)}</button>`
  ).join("")+`<button class="cat" onclick="openAddCategoryModal()">+ Категория</button>`;
}
function openAddCategoryModal(){
  openModal(`<div class="modalbox"><button class="close" onclick="closeModal()">×</button>
<h2>Нова категория</h2>
<div class="field"><label>Име на категория</label><input id="quickCatName" placeholder="напр. Скара"></div>
<button class="primary" style="margin-top:16px" onclick="confirmQuickCategory(this)">Добави</button>
</div>`);
}
async function confirmQuickCategory(btn){
  await guard(btn, async ()=>{
    const v=document.getElementById("quickCatName").value.trim();
    if(!v){toast("Въведи име на категория");return}
    if(me().categories.includes(v)){toast("Тази категория вече съществува");closeModal();return}
    await dbAddCategory(v);
    closeModal();toast("Категорията е добавена");render();
  });
}

function filtered(){
  const q=(document.getElementById("search")?.value||"").toLowerCase();
  return me().recipes.filter(r=>(activeCat==="Всички"||r.cat===activeCat)&&
    (q===""||r.name.toLowerCase().includes(q)||r.cat.toLowerCase().includes(q)));
}
function card(r){
  return `<article class="card"><div class="photo">${r.emoji||"🍽️"}</div><div class="cardbody"><span class="tag">${escHtml(r.cat)}${r.public?" · Публична":" · Лична"}</span><h3>${escHtml(r.name)}</h3><div class="muted">${r.time?escHtml(r.time)+" · ":""}${r.servings?escHtml(r.servings)+" порции":""}${r.cal?" · "+escHtml(r.cal):""}</div><div class="actions"><button onclick="openRecipe('${escJs(r.id)}')">Виж рецепта</button><button class="add" onclick="addToWeek('${escJs(r.id)}')">+ В меню</button></div></div></article>`;
}
function renderHome(app){
  app.innerHTML=`<section class="hero"><div class="eyebrow">Домашно меню · рецепти · пазаруване</div><h1>Какво ще готвим днес?</h1><p>Събирай любимите си рецепти, планирай седмицата и превръщай избраното меню в един удобен списък за пазаруване.</p>
<div class="search"><input id="search" placeholder="🔎 Търси рецепта..." oninput="renderCards()"><button class="primary">Търси</button></div></section>
<div class="section-title"><h2>Категории</h2></div><div class="categories">${catChips()}</div>
<div class="section-title"><h2>Моите рецепти</h2><button class="ghost" onclick="openRecipeForm()">+ Нова рецепта</button></div>
<div id="cards" class="grid">${filtered().map(card).join("")||"<p class='muted'>Няма намерени рецепти.</p>"}</div>`;
}
function renderCards(){const e=document.getElementById("cards");if(e)e.innerHTML=filtered().map(card).join("")||"<p class='muted'>Няма намерени рецепти.</p>"}

/* ---------- PUBLIC FEED (everyone's shared recipes) ---------- */
function publicCategories(){const set=new Set();me().publicRecipes.forEach(x=>set.add(x.r.cat));return[...set]}
function publicItems(){
  const q=(document.getElementById("search")?.value||"").toLowerCase();
  let items=me().publicRecipes.slice();
  if(activeCat!=="Всички")items=items.filter(x=>x.r.cat===activeCat);
  if(q)items=items.filter(x=>x.r.name.toLowerCase().includes(q));
  return items;
}
function publicCard(owner,r){
  const mine=owner===me().username;
  return `<article class="card"><div class="photo">${r.emoji||"🍽️"}</div><div class="cardbody"><span class="tag">${escHtml(r.cat)}</span><span class="badge">${mine?"твоя":"от @"+escHtml(owner)}</span><h3>${escHtml(r.name)}</h3><div class="muted">${r.time?escHtml(r.time)+" · ":""}${r.servings?escHtml(r.servings)+" порции":""}${r.cal?" · "+escHtml(r.cal):""}</div><div class="actions">${mine?`<button onclick="openRecipe('${escJs(r.id)}')">Виж рецепта</button><button class="add" onclick="addToWeek('${escJs(r.id)}')">+ В меню</button>`:`<button onclick="openForeignRecipe('${escJs(r.id)}')">Виж рецепта</button>`}</div></div></article>`;
}
async function renderPublicFeed(app){
  app.innerHTML=`<section class="hero"><div class="eyebrow">Общност</div><h1>Споделени рецепти</h1><p>Разгледай публичните рецепти на всички потребители и ги добави към своите.</p>
<div class="search"><input id="search" placeholder="🔎 Търси рецепта..." oninput="renderPublicCards()"><button class="primary">Търси</button></div></section>
<div id="publicBody">${loadingHtml("Зареждане на споделените рецепти...")}</div>`;
  try{ await dbLoadPublic(); }
  catch(e){ console.error(e); const b=document.getElementById("publicBody"); if(b)b.innerHTML="<p class='muted'>Неуспешно зареждане.</p>"; return; }
  if(currentView!=="public")return;
  const body=document.getElementById("publicBody");
  if(!body)return;
  body.innerHTML=`<div class="section-title"><h2>Категории</h2></div><div class="categories">${["Всички",...publicCategories()].map(c=>`<button class="cat ${activeCat===c?"active":""}" data-c="${escHtml(c)}" onclick="setCat(this.dataset.c)">${escHtml(c)}</button>`).join("")}</div>
<div class="section-title"><h2>Всички споделени рецепти</h2></div>
<div id="cards" class="grid">${publicItems().map(x=>publicCard(x.owner,x.r)).join("")||"<p class='muted'>Все още няма споделени рецепти.</p>"}</div>`;
}
function renderPublicCards(){const e=document.getElementById("cards");if(e)e.innerHTML=publicItems().map(x=>publicCard(x.owner,x.r)).join("")||"<p class='muted'>Все още няма споделени рецепти.</p>"}

function openForeignRecipe(id){
  const item=findPublic(id);
  if(!item)return;
  const r=item.r, owner=item.owner;
  const steps=(r.steps||"").split(/\n+/).filter(Boolean);
  openModal(`<div class="modalbox recipe-detail"><button class="close" onclick="closeModal()">×</button>
<div class="recipe-img">${r.emoji||"🍽️"}</div><span class="tag">${escHtml(r.cat)} · от @${escHtml(owner)}</span><h1>${escHtml(r.name)}</h1>
<p class="muted">${r.time?escHtml(r.time)+" · ":""}${r.servings?escHtml(r.servings)+" порции · ":""}${escHtml(r.cal||"")}</p>
<div class="actions"><button class="add" onclick="addFriendRecipe('${escJs(r.id)}')">+ Добави към моите рецепти</button></div>
<h2>Необходими продукти${unitsLinkHtml()}</h2><div class="ingredient-list">${r.ings.map(x=>`<div><b>${escHtml(x[0])} ${escHtml(x[1])}</b> ${escHtml(x[2])}</div>`).join("")}</div>
<h2>Начин на приготвяне</h2>${steps.map((s,i)=>`<div class="step"><span class="stepno">${i+1}</span><div>${escHtml(s)}</div></div>`).join("")}
</div>`);
}
function addFriendRecipe(id){
  const item=findPublic(id);
  if(!item)return;
  const r=item.r;
  openModal(`<div class="modalbox"><button class="close" onclick="closeModal()">×</button>
<h2>Добави „${escHtml(r.name)}“ към твоите рецепти</h2>
<div class="field"><label>Категория при теб</label><select id="fcat">${me().categories.map(c=>`<option>${escHtml(c)}</option>`).join("")}</select></div>
<div class="field" style="margin-top:10px"><label>Или нова категория (по желание)</label><input id="fnewcat" placeholder="напр. От приятели"></div>
<button class="primary" style="margin-top:16px" onclick="confirmAddFriendRecipe('${escJs(r.id)}',this)">Добави</button>
</div>`);
}
async function confirmAddFriendRecipe(id,btn){
  await guard(btn, async ()=>{
    const item=findPublic(id);
    if(!item)return;
    const r=item.r;
    const newcat=document.getElementById("fnewcat").value.trim();
    const cat=newcat||document.getElementById("fcat").value;
    if(newcat&&!me().categories.includes(newcat))await dbAddCategory(newcat);
    const copy=JSON.parse(JSON.stringify(r));
    await dbInsertRecipe({...copy,cat,public:false,fav:false,fromFriend:item.owner});
    closeModal();toast("Добавено към твоите рецепти");showHome();
  });
}

/* ---------- FRIENDS ---------- */
let friendResults=[];
function renderFriends(app){
  friendResults=[];
  app.innerHTML=`<section class="hero" style="padding-bottom:20px"><div class="eyebrow">Общност</div><h1>Приятели</h1><p>Търси потребители по потребителско име и разгледай публичните им рецепти.</p>
<div class="search"><input id="friendSearch" placeholder="🔎 Потребителско име..." oninput="searchFriends()"><button class="primary">Търси</button></div></section>
<div class="section-title"><h2>Резултати</h2></div><div id="friendResults"><p class="muted">Въведи потребителско име за търсене.</p></div>
<div class="section-title"><h2>Твоите приятели</h2></div><div id="friendList">${friendListHtml()}</div>`;
}
function searchFriends(){
  const q=(document.getElementById("friendSearch")?.value||"").trim();
  const box=document.getElementById("friendResults");
  if(!box)return;
  if(!q){friendResults=[];box.innerHTML='<p class="muted">Въведи потребителско име за търсене.</p>';return}
  clearTimeout(searchFriends._t);
  searchFriends._t=setTimeout(async()=>{
    try{
      const rows=await dbSearchProfiles(q);
      if((document.getElementById("friendSearch")?.value||"").trim()!==q)return;
      friendResults=rows;
      renderFriendResults();
    }catch(e){console.error(e);const b=document.getElementById("friendResults");if(b)b.innerHTML='<p class="muted">Неуспешно търсене.</p>'}
  },250);
}
function friendResultsHtml(){
  if(!friendResults.length)return '<p class="muted">Няма намерени потребители.</p>';
  return friendResults.map(u=>{
    const isFriend=me().friends.some(f=>f.id===u.id);
    return `<div class="friendrow"><span>@${escHtml(u.username)}</span>${isFriend
      ?`<button class="ghost" onclick="viewFriend('${escJs(u.id)}','${escJs(u.username)}')">Виж рецептите</button>`
      :`<button class="primary" onclick="addFriend('${escJs(u.id)}','${escJs(u.username)}',this)">+ Добави приятел</button>`}</div>`;
  }).join("");
}
function friendListHtml(){
  if(!me().friends.length)return '<p class="muted">Все още нямаш добавени приятели.</p>';
  return me().friends.map(f=>`<div class="friendrow"><span>@${escHtml(f.username)}</span><span><button class="ghost" onclick="viewFriend('${escJs(f.id)}','${escJs(f.username)}')">Виж рецептите</button> <button class="ghost" onclick="removeFriend('${escJs(f.id)}',this)" title="Премахни">×</button></span></div>`).join("");
}
function renderFriendResults(){const e=document.getElementById("friendResults");if(e)e.innerHTML=friendResultsHtml()}
async function addFriend(id,username,btn){
  await guard(btn, async ()=>{
    await dbAddFriend(id,username);
    toast("Добавен приятел @"+username);
    renderFriendResults();
    const l=document.getElementById("friendList");if(l)l.innerHTML=friendListHtml();
  });
}
async function removeFriend(id,btn){
  await guard(btn, async ()=>{
    await dbRemoveFriend(id);
    toast("Приятелят е премахнат");
    renderFriendResults();
    const l=document.getElementById("friendList");if(l)l.innerHTML=friendListHtml();
  });
}
async function viewFriend(id,username){
  openModal(`<div class="modalbox"><button class="close" onclick="closeModal()">×</button>
<h2>Публични рецепти на @${escHtml(username)}</h2>
<div id="friendRecipes">${loadingHtml()}</div></div>`);
  try{
    const ids=await dbLoadFriendPublic(id);
    const box=document.getElementById("friendRecipes");
    if(!box)return;
    box.className="grid";box.style.marginTop="14px";
    box.innerHTML=ids.map(rid=>{const it=findPublic(rid);return it?publicCard(it.owner,it.r):""}).join("")
      ||'<p class="muted">Няма публични рецепти все още.</p>';
  }catch(e){console.error(e);const b=document.getElementById("friendRecipes");if(b)b.innerHTML='<p class="muted">Неуспешно зареждане.</p>'}
}

/* ---------- DASHBOARD / WEEK / SHOPPING / CATEGORIES ---------- */
function categoryChipsManage(){
  return me().categories.map(c=>`<span class="chip">${escHtml(c)}${DEFAULT_CATS.includes(c)?"":` <button data-c="${escHtml(c)}" onclick="removeCategory(this.dataset.c,this)" style="border:0;background:transparent;color:#8d493e;cursor:pointer">×</button>`}</span>`).join("");
}
async function addCategory(btn){
  await guard(btn, async ()=>{
    const v=document.getElementById("newCatName").value.trim();
    if(!v)return;
    if(me().categories.includes(v)){toast("Тази категория вече съществува");return}
    await dbAddCategory(v);toast("Категорията е добавена");renderDashboard(document.getElementById("app"));
  });
}
async function removeCategory(c,btn){
  await guard(btn, async ()=>{
    if(me().recipes.some(r=>r.cat===c)){toast("Има рецепти в тази категория — премести ги първо");return}
    await dbRemoveCategory(c);renderDashboard(document.getElementById("app"));
  });
}
/* --- ръчно добавени продукти в списъка за пазаруване --- */
function customItemHtml(it){
  const amount=[it.qty,it.unit].filter(Boolean).join(" ");
  return `<li class="${it.done?"done":""}" data-id="${escHtml(it.id)}" onclick="toggleCustomItem(this.dataset.id,this)"><span>${escHtml(it.name)}</span><span style="display:flex;align-items:center;gap:8px"><b>${escHtml(amount)}</b><button class="no-print" title="Изтрий" onclick="event.stopPropagation();deleteCustomItem(this.closest('li').dataset.id,this)" style="border:0;background:#eee9dd;border-radius:6px;width:21px;height:21px;padding:0;line-height:1">×</button></span></li>`;
}
async function addCustomItem(btn){
  await guard(btn, async ()=>{
    const nameEl=document.getElementById("ciName");
    const name=nameEl.value.trim();
    if(!name){toast("Въведи продукт");nameEl.focus();return}
    const qty=document.getElementById("ciQty").value.trim();
    const unit=qty?document.getElementById("ciUnit").value:"";
    await dbAddCustomItem(name,qty,unit);
    renderDashboard(document.getElementById("app"));
    document.getElementById("ciName")?.focus();
  });
}
async function toggleCustomItem(id,el){
  const it=me().customItems.find(x=>x.id===id);
  if(!it)return;
  const next=!it.done;
  if(el)el.classList.toggle("done",next);
  try{ await dbSetCustomItemDone(id,next); }
  catch(e){ console.error(e); toast("Неуспешен запис"); if(el)el.classList.toggle("done",!next); }
}
async function deleteCustomItem(id,btn){
  await guard(btn, async ()=>{
    await dbDeleteCustomItem(id);
    renderDashboard(document.getElementById("app"));
  });
}
async function clearDoneCustomItems(btn){
  await guard(btn, async ()=>{
    if(!me().customItems.some(i=>i.done)){toast("Няма отметнати продукти");return}
    await dbClearDoneCustomItems();
    toast("Отметнатите са изчистени");
    renderDashboard(document.getElementById("app"));
  });
}

async function toggleShop(key,el){
  const next=!me().shopping[key];
  if(el)el.classList.toggle("done",next);
  try{ await dbSetShopping(key,next); }
  catch(e){ console.error(e); toast("Неуспешен запис"); if(el)el.classList.toggle("done",!next); }
}
function renderDashboard(app){
  const wk=me().week;
  const weekHtml=DAYS.map(d=>{
    const entries=wk[d]||[];
    const groups=MEALS.map(m=>{
      const items=entries.filter(e=>e.meal===m);
      if(!items.length)return "";
      return `<div class="mealgroup">${m}</div>`+items.map(e=>{
        const r=me().recipes.find(x=>x.id===e.id);
        if(!r)return "";
        return `<div class="dayitem" style="position:relative;padding-right:28px" onclick="openRecipe('${escJs(r.id)}')">${r.emoji} ${escHtml(r.name)}<button title="Махни" onclick="event.stopPropagation();removeFromDay('${escJs(d)}','${escJs(r.id)}','${escJs(m)}',this)" style="position:absolute;right:4px;top:4px;border:0;background:#eee9dd;border-radius:6px;width:21px;height:21px;padding:0">×</button></div>`;
      }).join("");
    }).join("");
    return `<div class="day"><strong>${d}</strong>${groups}<button style="border:0;background:transparent;color:var(--green);font-size:12px;margin-top:8px" onclick="pickDay('${escJs(d)}')">+ добави</button></div>`;
  }).join("");

  const all={};
  DAYS.forEach(d=>(wk[d]||[]).forEach(e=>{
    const r=me().recipes.find(x=>x.id===e.id);
    if(r)r.ings.forEach(([n,u,p])=>{const key=String(p).trim().toLowerCase()+"|"+u;all[key]=all[key]||{p,u,n:0};all[key].n+=Number(n)||0});
  }));
  const autoList=Object.values(all).map(x=>{
    const k=String(x.p).trim().toLowerCase()+"|"+x.u;
    return `<li class="${me().shopping[k]?"done":""}" data-k="${escHtml(k)}" onclick="toggleShop(this.dataset.k,this)"><span>${escHtml(x.p)}</span><b>${fmt(x.n)} ${escHtml(x.u)}</b></li>`;
  }).join("");
  const customList=me().customItems.map(customItemHtml).join("");
  const emptyMsg=(!autoList&&!customList)
    ?'<p class="muted">Добави рецепти към седмичното меню или продукт по-долу.</p>':"";
  const hasCustom=me().customItems.length>0;

  app.innerHTML=`<section class="hero" style="padding-bottom:20px"><div class="eyebrow">Личен профил</div><h1>Моето меню за тази седмица</h1><p>Подреди рецептите по дни и хранения и виж автоматично какво трябва да купиш.</p></section>
<div class="dashboard"><div class="panel"><div class="section-title" style="margin-top:0"><h2>Седмично меню</h2><button class="primary" onclick="openRecipeForm()">+ Рецепта</button></div><div class="week">${weekHtml}</div></div>
<div class="panel shopping"><div class="section-title" style="margin-top:0"><h2>🛒 Пазаруване</h2></div><p class="muted">Еднаквите продукти с една и съща мерна единица се обединяват.</p>
<ul>${autoList}${customList}</ul>${emptyMsg}
<div class="no-print"><div class="mealgroup" style="margin-top:14px">Добави свой продукт</div>
<div class="ingrow" style="margin-top:6px">
<input id="ciQty" placeholder="Кол." onkeydown="if(event.key==='Enter'){event.preventDefault();addCustomItem()}">
<select id="ciUnit">${["",...UNITS].map(u=>`<option value="${escHtml(u)}" ${u==="бр"?"selected":""}>${u||"—"}</option>`).join("")}</select>
<input id="ciName" placeholder="напр. хляб" list="shopNames" onkeydown="if(event.key==='Enter'){event.preventDefault();addCustomItem()}">
<button title="Добави" onclick="addCustomItem(this)">+</button>
</div>
<datalist id="shopNames">${ingredientNames().map(n=>`<option value="${escHtml(n)}">`).join("")}</datalist></div>
<div style="display:flex;gap:8px;margin-top:15px" class="no-print"><button class="ghost" onclick="window.print()">🖨️ Принтирай</button>${hasCustom?`<button class="ghost" onclick="clearDoneCustomItems(this)">🧹 Изчисти отметнатите</button>`:""}</div></div></div>
<div class="panel" style="margin-top:22px"><div class="section-title" style="margin-top:0"><h2>Категории</h2></div><div class="categories" id="catManage">${categoryChipsManage()}</div>
<div style="display:flex;gap:8px;margin-top:12px"><input id="newCatName" placeholder="Нова категория" style="flex:1;border:1px solid var(--line);border-radius:10px;padding:10px"><button class="primary" onclick="addCategory(this)">Добави</button></div></div>
<div class="panel" style="margin-top:22px"><div class="section-title" style="margin-top:0"><h2>Бърз преглед</h2></div><div class="profile-stats"><div class="stat"><span class="muted">Рецепти</span><b>${me().recipes.length}</b></div><div class="stat"><span class="muted">В менюто</span><b>${Object.values(wk).flat().length}</b></div><div class="stat"><span class="muted">Любими</span><b>${me().recipes.filter(r=>r.fav).length}</b></div></div></div>`;
}
