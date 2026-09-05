/* ---------- HOME (my recipes) ---------- */
/* Смяна на категория без пълно пре-рендиране — на споделените рецепти
   пълният render() значеше ново теглене от базата при всеки клик. */
function setCat(c){
  activeCat=c;
  const chips=document.querySelectorAll("#app .catlist .cat");
  if(!chips.length){render();return}
  chips.forEach(b=>b.classList.toggle("active",b.dataset.c===c));
  const h=document.querySelector("#app .browse .section-head h2");
  if(h)h.textContent=(c==="Всички")?homeTitle():c;
  renderCards();
}
function homeTitle(){return homeSource==="shared"?"Споделени рецепти":"Моите рецепти"}

/* Страничната лента с категории. `counts` е {категория: брой}. */
function catSidebar(cats,counts,total,addBtn){
  const item=(c,n)=>`<button class="cat ${activeCat===c?"active":""}" data-c="${escHtml(c)}" onclick="setCat(this.dataset.c)">${escHtml(c)}<span class="cnt">${n}</span></button>`;
  return `<div class="side-title">Категории</div>
<div class="categories catlist">
${item("Всички",total)}
${cats.map(c=>item(c,counts[c]||0)).join("")}
</div>
${addBtn?`<button class="cat add" onclick="openAddCategoryModal()">+ Категория</button>`:""}`;
}
function catSidebarMine(){
  const counts={};
  me().recipes.forEach(r=>{counts[r.cat]=(counts[r.cat]||0)+1});
  return catSidebar(me().categories,counts,me().recipes.length,true);
}
function catSidebarPublic(){
  const counts={};
  me().publicRecipes.forEach(x=>{counts[x.r.cat]=(counts[x.r.cat]||0)+1});
  return catSidebar(publicCategories(),counts,me().publicRecipes.length,false);
}
function openAddCategoryModal(){
  openModal(modalShell("Нова категория",
    `<div class="field"><label>Име на категория</label><input id="quickCatName" placeholder="напр. Скара"></div>`,
    `<button class="btn ghost" onclick="closeModal()">Откажи</button>
     <button class="btn primary" onclick="confirmQuickCategory(this)">Добави</button>`));
  setTimeout(()=>document.getElementById("quickCatName")?.focus(),0);
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
function recipeMeta(r){
  const bits=[];
  if(r.time)bits.push("\u23F1 "+escHtml(r.time));
  if(r.servings)bits.push("\u{1F37D} "+escHtml(r.servings)+" порции");
  if(r.cal)bits.push("\u{1F525} "+escHtml(r.cal));
  return bits.length?`<div class="meta">${bits.map(b=>`<span>${b}</span>`).join("")}</div>`:"";
}
function card(r){
  return `<article class="card">
${recipePhotoHtml(r,"photo")}${r.fav?`<span class="fav-dot" title="Любима">\u2665</span>`:""}
<div class="cardbody">
<div class="card-tags"><span class="tag">${escHtml(r.cat)}${r.public?" · Публична":""}</span></div>
<h3>${escHtml(r.name)}</h3>
${recipeMeta(r)}
<div class="actions">
<button class="btn ghost btn-sm" onclick="openRecipe('${escJs(r.id)}')">Виж рецепта</button>
<button class="btn primary btn-sm" onclick="addToWeek('${escJs(r.id)}')">+ В меню</button>
</div></div></article>`;
}
function homeCardsHtml(){
  if(homeSource==="shared"){
    const items=publicItems();
    if(items.length)return `<div class="grid">${items.map(x=>publicCard(x.owner,x.r)).join("")}</div>`;
    if(me().publicRecipes.length)
      return emptyState("\u{1F50D}","Няма намерени рецепти","Опитай с друга дума или категория.");
    return emptyState("\u{1F30D}","Още няма споделени рецепти","Сподели своя рецепта и тя ще се появи тук за всички.");
  }
  const list=filtered();
  if(list.length)return `<div class="grid">${list.map(card).join("")}</div>`;
  if(me().recipes.length)
    return emptyState("\u{1F50D}","Няма намерени рецепти","Опитай с друга дума или избери друга категория.");
  return emptyState("\u{1F4D2}","Тук още е празно","Добави първата си рецепта и започни да планираш седмицата.",
    `<button class="btn primary" onclick="openRecipeForm()">+ Нова рецепта</button>`);
}
function homeCount(){
  return homeSource==="shared"
    ? `${publicItems().length} от общността`
    : (()=>{const n=filtered().length;return `${n} ${n===1?"рецепта":"рецепти"}`})();
}
function sourceSwitch(){
  return `<div class="seg">
<button class="${homeSource==="mine"?"active":""}" onclick="setHomeSource('mine')">Моите</button>
<button class="${homeSource==="shared"?"active":""}" onclick="setHomeSource('shared')">Споделени</button>
</div>`;
}
function setHomeSource(src){
  if(homeSource===src)return;
  homeSource=src;activeCat="Всички";
  const box=document.getElementById("search");
  if(box)box.value="";
  renderHome(document.getElementById("app"));
}

/* Един и същ hero и при зареждане, и след това — иначе заглавието премигва. */
function homeHeroHtml(){
  return homeSource==="shared"
    ? `<section class="hero"><div class="eyebrow">Общност</div>
<h1>Рецепти от общността</h1>
<p>Разгледай публичните рецепти на всички потребители и ги добави към своите.</p></section>`
    : `<section class="hero"><div class="eyebrow">Домашно меню · рецепти · пазаруване</div>
<h1>Какво ще готвим днес?</h1>
<p>Събирай любимите си рецепти, планирай седмицата и превръщай избраното меню в един удобен списък за пазаруване.</p></section>`;
}
function homeShellHtml(sidebar){
  return `${homeHeroHtml()}
<div class="browse">
<aside class="sidebar">${sidebar}</aside>
<div>
<div class="section-head" style="margin-top:0"><div><h2>${activeCat==="Всички"?homeTitle():escHtml(activeCat)}</h2><div class="sub" id="cardCount">${homeCount()}</div></div>
${homeSource==="mine"?`<button class="btn ghost" onclick="openRecipeForm()">+ Нова рецепта</button>`:""}</div>
<div id="cards">${homeCardsHtml()}</div>
</div></div>`;
}

async function renderHome(app){
  if(homeSource==="shared"){
    /* показваме рамката веднага, картите — след като дойдат от базата */
    app.innerHTML=`${homeHeroHtml()}
<div class="browse"><aside class="sidebar">${sourceSwitch()}</aside><div>${skeletonCards(6)}</div></div>`;
    try{ await dbLoadPublic(); }
    catch(e){
      console.error(e);
      app.innerHTML=`${homeHeroHtml()}
<div class="browse"><aside class="sidebar">${sourceSwitch()}</aside><div>${
        emptyState("\u26A0\uFE0F","Неуспешно зареждане","Провери връзката си и опитай пак.",
          `<button class="btn ghost" onclick="renderHome(document.getElementById('app'))">Опитай пак</button>`)}</div></div>`;
      return;
    }
    if(currentView!=="home"||homeSource!=="shared")return;
    app.innerHTML=homeShellHtml(sourceSwitch()+catSidebarPublic());
    return;
  }
  app.innerHTML=homeShellHtml(sourceSwitch()+catSidebarMine());
}

function renderCards(){
  const e=document.getElementById("cards");
  if(e)e.innerHTML=homeCardsHtml();
  const c=document.getElementById("cardCount");
  if(c)c.textContent=homeCount();
}

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
  return `<article class="card">
${recipePhotoHtml(r,"photo")}
<div class="cardbody">
<div class="card-tags"><span class="tag">${escHtml(r.cat)}</span><span class="badge">${mine?"твоя":"@"+escHtml(owner)}</span></div>
<h3>${escHtml(r.name)}</h3>
${recipeMeta(r)}
<div class="actions">${mine
  ?`<button class="btn ghost btn-sm" onclick="openRecipe('${escJs(r.id)}')">Виж рецепта</button><button class="btn primary btn-sm" onclick="addToWeek('${escJs(r.id)}')">+ В меню</button>`
  :`<button class="btn ghost btn-sm" onclick="openForeignRecipe('${escJs(r.id)}')">Виж рецепта</button>`}</div>
</div></article>`;
}
function publicCardsHtml(){
  const items=publicItems();
  if(items.length)return `<div class="grid">${items.map(x=>publicCard(x.owner,x.r)).join("")}</div>`;
  if(me().publicRecipes.length)
    return emptyState("\u{1F50D}","Няма намерени рецепти","Опитай с друга дума или категория.");
  return emptyState("\u{1F30D}","Още няма споделени рецепти","Сподели своя рецепта и тя ще се появи тук за всички.");
}
function openForeignRecipe(id){
  const item=findPublic(id);
  if(!item)return;
  const r=item.r, owner=item.owner;
  const steps=(r.steps||"").split(/\n+/).filter(Boolean);
  openModal(modalShell(escHtml(r.name),
`${recipePhotoHtml(r,"recipe-img")}
<span class="tag">${escHtml(r.cat)} · от @${escHtml(owner)}</span>
${recipeMeta(r)}
<h2>Необходими продукти${unitsLinkHtml()}</h2>
<div class="ingredient-list">${r.ings.map(x=>`<div><b>${escHtml(x[0])} ${escHtml(x[1])}</b> ${escHtml(x[2])}</div>`).join("")}</div>
<h2>Начин на приготвяне</h2>${steps.map((s,i)=>`<div class="step"><span class="stepno">${i+1}</span><div>${escHtml(s)}</div></div>`).join("")||`<p class="muted">Няма описани стъпки.</p>`}`,
`<button class="btn primary" onclick="addFriendRecipe('${escJs(r.id)}')">+ Добави към моите рецепти</button>`,
"recipe-detail"));
}
function addFriendRecipe(id){
  const item=findPublic(id);
  if(!item)return;
  const r=item.r;
  openModal(modalShell("Добави към твоите рецепти",
`<p class="muted" style="margin-bottom:16px">„${escHtml(r.name)}“ ще стане твоя лична рецепта — можеш да я променяш свободно.</p>
<div class="field"><label>Категория при теб</label><select id="fcat">${me().categories.map(c=>`<option>${escHtml(c)}</option>`).join("")}</select></div>
<div class="field" style="margin-top:14px"><label>Или нова категория (по желание)</label><input id="fnewcat" placeholder="напр. От приятели"></div>`,
`<button class="btn ghost" onclick="closeModal()">Откажи</button>
 <button class="btn primary" onclick="confirmAddFriendRecipe('${escJs(r.id)}',this)">Добави</button>`));
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
    copy.photo=await dbCopyPhoto(r.photo);   // собствено копие на файла
    await dbInsertRecipe({...copy,cat,public:false,fav:false,fromFriend:item.owner});
    closeModal();toast("Добавено към твоите рецепти");showHome();
  });
}

/* ---------- FRIENDS ---------- */
let friendResults=[];
function renderFriends(app){
  friendResults=[];
  app.innerHTML=`<section class="hero">
<div class="eyebrow">Общност</div><h1>Приятели</h1>
<p>Търси потребители по потребителско име и разгледай публичните им рецепти.</p>
</section>
<div class="search" style="margin-bottom:26px"><span class="si">\u{1F50E}</span><input id="friendSearch" placeholder="Потребителско име..." oninput="searchFriends()"></div>
<div class="panel"><div class="panel-head"><h2>Резултати</h2></div>
<div id="friendResults"><p class="muted">Въведи потребителско име за търсене.</p></div></div>
<div class="panel" style="margin-top:22px"><div class="panel-head"><h2>Твоите приятели</h2></div>
<div id="friendList">${friendListHtml()}</div></div>`;
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
    return `<div class="friendrow"><span class="friend-id"><span class="avatar">${escHtml(initials(u.username))}</span>@${escHtml(u.username)}</span>${isFriend
      ?`<button class="btn ghost btn-sm" onclick="viewFriend('${escJs(u.id)}','${escJs(u.username)}')">Виж рецептите</button>`
      :`<button class="btn primary btn-sm" onclick="addFriend('${escJs(u.id)}','${escJs(u.username)}',this)">+ Добави</button>`}</div>`;
  }).join("");
}
function friendListHtml(){
  if(!me().friends.length)return '<p class="muted">Все още нямаш добавени приятели.</p>';
  return me().friends.map(f=>`<div class="friendrow"><span class="friend-id"><span class="avatar">${escHtml(initials(f.username))}</span>@${escHtml(f.username)}</span><span style="display:flex;gap:8px"><button class="btn ghost btn-sm" onclick="viewFriend('${escJs(f.id)}','${escJs(f.username)}')">Виж рецептите</button><button class="btn ghost btn-sm" onclick="removeFriend('${escJs(f.id)}',this)" title="Премахни приятел">×</button></span></div>`).join("");
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
  openModal(modalShell(`Рецепти на @${escHtml(username)}`,`<div id="friendRecipes">${skeletonCards(2)}</div>`));
  try{
    const ids=await dbLoadFriendPublic(id);
    const box=document.getElementById("friendRecipes");
    if(!box)return;
    const cards=ids.map(rid=>{const it=findPublic(rid);return it?publicCard(it.owner,it.r):""}).join("");
    box.innerHTML=cards
      ?`<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">${cards}</div>`
      :emptyState("\u{1F373}","Няма публични рецепти","Този потребител още не е споделил нищо.");
  }catch(e){
    console.error(e);
    const b=document.getElementById("friendRecipes");
    if(b)b.innerHTML=emptyState("\u26A0\uFE0F","Неуспешно зареждане","Провери връзката си и опитай пак.");
  }
}

/* ---------- DASHBOARD / WEEK / SHOPPING / CATEGORIES ---------- */
function categoryChipsManage(){
  return me().categories.map(c=>`<span class="chip" draggable="true" data-c="${escHtml(c)}" ondragstart="catDragStart(event,this)" ondragover="catDragOver(event,this)" ondragend="catDragEnd(this)"><span class="grip" onpointerdown="catGripDown(event,this)" title="Влачи за пренареждане">⠿</span>${escHtml(c)}<button title="Преименувай" onclick="openRenameCategory(this.closest('.chip').dataset.c)">✎</button><button class="del" title="Изтрий" onclick="removeCategory(this.closest('.chip').dataset.c,this)">×</button></span>`).join("");
}

/* --- пренареждане на категориите ---
   Работи и с мишка (HTML5 drag), и с пръст (pointer events върху дръжката). */
function catOrderFromDom(){
  return [...document.querySelectorAll("#catManage .chip")].map(el=>el.dataset.c);
}
function catMoveTo(dragged,target,clientX){
  if(!dragged||!target||dragged===target||target.parentNode!==dragged.parentNode)return;
  const r=target.getBoundingClientRect();
  const after=(clientX-r.left)>r.width/2;
  target.parentNode.insertBefore(dragged,after?target.nextSibling:target);
}
async function catPersistOrder(){
  const names=catOrderFromDom();
  if(names.length!==me().categories.length||names.every((n,i)=>n===me().categories[i]))return;
  try{
    await dbSetCategoryOrder(names);
    render();
  }catch(e){
    console.error(e);toast("Неуспешно записване на подредбата");
    renderDashboard(document.getElementById("app"));
  }
}

/* мишка */
function catDragStart(ev,el){
  el.classList.add("dragging");
  ev.dataTransfer.effectAllowed="move";
  try{ev.dataTransfer.setData("text/plain",el.dataset.c)}catch(e){}
}
function catDragOver(ev,el){
  ev.preventDefault();
  catMoveTo(document.querySelector("#catManage .chip.dragging"),el,ev.clientX);
}
function catDragEnd(el){
  el.classList.remove("dragging");
  catPersistOrder();
}

/* пръст/писалка — HTML5 drag не работи на телефон */
let catGrip=null;
function catGripDown(ev,grip){
  if(ev.pointerType==="mouse")return;         // мишката минава по горния път
  ev.preventDefault();
  const chip=grip.closest(".chip");
  if(!chip)return;
  catGrip=chip;
  chip.classList.add("dragging");
  grip.setPointerCapture(ev.pointerId);
  grip.onpointermove=e=>{
    if(!catGrip)return;
    const under=document.elementFromPoint(e.clientX,e.clientY);
    catMoveTo(catGrip,under&&under.closest?under.closest(".chip"):null,e.clientX);
  };
  grip.onpointerup=grip.onpointercancel=()=>{
    if(catGrip)catGrip.classList.remove("dragging");
    catGrip=null;
    grip.onpointermove=grip.onpointerup=grip.onpointercancel=null;
    catPersistOrder();
  };
}

/* --- преименуване --- */
function openRenameCategory(name){
  openModal(modalShell("Преименувай категория",
`<div class="field"><label>Ново име</label><input id="renameCatName" value="${escHtml(name)}"></div>
<p class="hint" style="margin-top:10px">Рецептите в тази категория ще се преместят автоматично.</p>`,
`<button class="btn ghost" onclick="closeModal()">Откажи</button>
 <button class="btn primary" onclick="confirmRenameCategory('${escJs(name)}',this)">Запази</button>`));
  setTimeout(()=>document.getElementById("renameCatName")?.focus(),0);
}
async function confirmRenameCategory(oldName,btn){
  await guard(btn, async ()=>{
    const v=document.getElementById("renameCatName").value.trim();
    if(!v){toast("Въведи име на категория");return}
    if(v===oldName){closeModal();return}
    if(me().categories.includes(v)){toast("Вече има категория с това име");return}
    await dbRenameCategory(oldName,v);
    closeModal();toast("Категорията е преименувана");render();
  });
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
  const used=me().recipes.filter(r=>r.cat===c).length;
  if(used){toast(`Има ${used} рецепти в „${c}“ — премести ги първо`);return}
  if(!confirm("Да изтрия ли категорията „"+c+"“?"))return;
  await guard(btn, async ()=>{
    if(activeCat===c)activeCat="Всички";
    await dbRemoveCategory(c);
    render();
  });
}
/* --- ръчно добавени продукти в списъка за пазаруване --- */
function customItemHtml(it){
  const amount=[it.qty,it.unit].filter(Boolean).join(" ");
  return `<li class="${it.done?"done":""}" data-id="${escHtml(it.id)}" onclick="toggleCustomItem(this.dataset.id,this)"><span>${escHtml(it.name)}</span><span style="display:flex;align-items:center;gap:8px"><b>${escHtml(amount)}</b><button title="Изтрий" onclick="event.stopPropagation();deleteCustomItem(this.closest('li').dataset.id,this)" style="border:0;background:#eee9dd;border-radius:6px;width:21px;height:21px;padding:0;line-height:1">×</button></span></li>`;
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
/* Групира продуктите от седмичното меню по име (не по име+мярка).
   Връща [{key, p, units:[{u,n}]}] в реда, в който се срещат. */
function shoppingFromWeek(){
  const wk=me().week, byName={}, order=[];
  DAYS.forEach(d=>(wk[d]||[]).forEach(e=>{
    const r=me().recipes.find(x=>x.id===e.id);
    if(!r)return;
    r.ings.forEach(([n,u,p])=>{
      const name=String(p||"").trim();
      if(!name)return;
      const key=name.toLowerCase();
      let item=byName[key];
      if(!item){item=byName[key]={key,p:name,units:[]};order.push(item)}
      let slot=item.units.find(x=>x.u===u);
      if(!slot){slot={u,n:0};item.units.push(slot)}
      slot.n+=parseQty(n);
    });
  }));
  return order;
}
/* „1 л + 1 ч.ч.“ */
function amountText(item){
  return item.units.map(x=>fmtQty(x.n)+(x.u?" "+x.u:"")).join(" + ");
}

function todayIndex(){return (new Date().getDay()+6)%7}   /* DAYS започва от понеделник */

function renderDashboard(app){
  const wk=me().week;
  const today=DAYS[todayIndex()];

  const weekHtml=DAYS.map(d=>{
    const entries=wk[d]||[];
    const groups=MEALS.map(m=>{
      const items=entries.filter(e=>e.meal===m);
      if(!items.length)return "";
      return `<div class="mealgroup">${m}</div>`+items.map(e=>{
        const r=me().recipes.find(x=>x.id===e.id);
        if(!r)return "";
        return `<div class="dayitem" onclick="openRecipe('${escJs(r.id)}')" title="${escHtml(r.name)}">${r.emoji} ${escHtml(r.name)}<button title="Махни" aria-label="Махни" onclick="event.stopPropagation();removeFromDay('${escJs(d)}','${escJs(r.id)}','${escJs(m)}',this)">×</button></div>`;
      }).join("");
    }).join("");
    return `<div class="day${d===today?" today":""}">
<div class="day-name">${d}${d===today?`<span class="day-today-dot" title="днес"></span>`:""}</div>
${groups}
<button class="day-add" onclick="pickDay('${escJs(d)}')">+ добави</button></div>`;
  }).join("");

  /* Сумиране на продуктите от менюто.
     Един ред на продукт; различните мерни единици се изброяват в него
     (напр. „мляко — 1 л + 1 ч.ч.“), вместо два отделни реда. */
  const all=shoppingFromWeek();
  const autoList=all.map(x=>
    `<li class="${me().shopping[x.key]?"done":""}" data-k="${escHtml(x.key)}" onclick="toggleShop(this.dataset.k,this)"><span>${escHtml(x.p)}</span><b>${escHtml(amountText(x))}</b></li>`
  ).join("");
  const customList=me().customItems.map(customItemHtml).join("");
  const hasCustom=me().customItems.length>0;
  const planned=Object.values(wk).flat().length;

  app.innerHTML=`<section class="hero">
<div class="eyebrow">Личен профил</div>
<h1>Моето меню за тази седмица</h1>
<p>Подреди рецептите по дни и хранения и виж автоматично какво трябва да купиш.</p>
</section>

<div class="stats" style="margin-bottom:26px">
<div class="stat"><span>Рецепти</span><b>${me().recipes.length}</b></div>
<div class="stat"><span>В менюто</span><b>${planned}</b></div>
<div class="stat"><span>Любими</span><b>${me().recipes.filter(r=>r.fav).length}</b></div>
</div>

<div class="panel">
<div class="panel-head"><h2>Седмично меню</h2><button class="btn ghost btn-sm" onclick="pickDay()">+ Добави ястие</button></div>
<div class="week">${weekHtml}</div>
</div>

<div class="dashboard" style="margin-top:22px">
<div class="panel shopping">
<div class="panel-head"><h2>🛒 Пазаруване</h2>${hasCustom?`<button class="btn ghost btn-sm" onclick="clearDoneCustomItems(this)" title="Маха отметнатите ръчно добавени продукти">Изчисти</button>`:""}</div>
${(autoList||customList)
  ?`<ul>${autoList}${customList}</ul>`
  :`<p class="muted" style="padding:6px 0 14px">Добави рецепти към менюто или запиши продукт по-долу.</p>`}
<div class="mealgroup" style="margin-top:18px">Добави свой продукт</div>
<div class="ingrow" style="margin-top:8px">
<input id="ciQty" placeholder="Кол." title="Може и дроб: 1/2, 1 1/4" onkeydown="if(event.key==='Enter'){event.preventDefault();addCustomItem()}">
<select id="ciUnit">${["",...UNITS].map(u=>`<option value="${escHtml(u)}" ${u==="бр"?"selected":""}>${u||"—"}</option>`).join("")}</select>
<input id="ciName" placeholder="напр. хляб" list="shopNames" onkeydown="if(event.key==='Enter'){event.preventDefault();addCustomItem()}">
<button title="Добави" aria-label="Добави" onclick="addCustomItem(this)">+</button>
</div>
<datalist id="shopNames">${ingredientNames().map(n=>`<option value="${escHtml(n)}">`).join("")}</datalist>
</div>

<div class="panel">
<div class="panel-head"><div><h2>Категории</h2><div class="sub">Влачи ⠿, за да ги подредиш както искаш</div></div></div>
<div class="categories" id="catManage">${categoryChipsManage()}</div>
<div class="add-row">
<input id="newCatName" placeholder="Нова категория" onkeydown="if(event.key==='Enter'){event.preventDefault();addCategory()}">
<button class="btn primary" onclick="addCategory(this)">Добави</button></div>
</div>
</div>`;
}
