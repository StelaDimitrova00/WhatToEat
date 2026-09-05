/* ---------- WEEKLY MENU ---------- */
function addToWeek(id){pickDay(null,id)}
function pickDay(day,id){
  const r=id?me().recipes.find(x=>x.id===id):null;
  openModal(`<div class="modalbox"><button class="close" onclick="closeModal()">×</button>
<h2>Добави ${r?"„"+escHtml(r.name)+"“":"рецепта"} към ден</h2>
<div class="field"><label>Ден</label><select id="pickDay">${DAYS.map(d=>`<option ${day===d?"selected":""}>${d}</option>`).join("")}</select></div>
<div class="field" style="margin-top:10px"><label>Кога</label><select id="pickMeal">${MEALS.map(m=>`<option>${m}</option>`).join("")}</select></div>
${!r?`<div class="field" style="margin-top:10px"><label>Рецепта</label><select id="pickRecipe">${me().recipes.map(x=>`<option value="${escHtml(x.id)}">${escHtml(x.name)}</option>`).join("")}</select></div>`:""}
<button class="primary" style="margin-top:16px" onclick="confirmDay('${escJs(id||"")}',this)">Добави</button>
</div>`);
}
async function confirmDay(id,btn){
  await guard(btn, async ()=>{
    const d=document.getElementById("pickDay").value;
    const meal=document.getElementById("pickMeal").value;
    const rid=id||document.getElementById("pickRecipe")?.value;
    if(!rid){toast("Нямаш рецепти за добавяне");return}
    await dbAddWeek(d,meal,rid);
    closeModal();toast("Добавено в "+d);
    if(currentView==="dashboard")renderDashboard(document.getElementById("app"));
  });
}
async function removeFromDay(day,id,meal,btn){
  await guard(btn, async ()=>{
    await dbRemoveWeek(day,meal,id);
    toast("Рецептата е махната от "+day);
    renderDashboard(document.getElementById("app"));
  });
}

/* ---------- RECIPE DETAIL ---------- */
function openRecipe(id){
  const r=me().recipes.find(x=>x.id===id);
  if(!r)return;
  const steps=(r.steps||"").split(/\n+/).filter(Boolean);
  openModal(`<div class="modalbox recipe-detail"><button class="close" onclick="closeModal()">×</button>
<div class="recipe-img">${r.emoji||"🍽️"}</div><span class="tag">${escHtml(r.cat)}${r.public?" · Публична":" · Лична"}${r.fromFriend?" · от @"+escHtml(r.fromFriend):""}</span><h1>${escHtml(r.name)}</h1>
<p class="muted">${r.time?escHtml(r.time)+" · ":""}${r.servings?escHtml(r.servings)+" порции · ":""}${escHtml(r.cal||"")}</p>
<div class="actions">
<button onclick="toggleFav('${escJs(r.id)}',this)">${r.fav?"♥ Премахни от любими":"♡ Добави в любими"}</button>
<button class="add" onclick="addToWeek('${escJs(r.id)}')">+ В меню</button>
<button onclick="editRecipe('${escJs(r.id)}')">✏️ Редактирай</button>
<button onclick="shareRecipe('${escJs(r.id)}',this)">🔗 ${r.public?"Направи лична":"Направи публична"}</button>
<button onclick="deleteRecipe('${escJs(r.id)}',this)" style="border-color:#d8b8b0;color:#8d493e">🗑️ Изтрий</button>
</div>
<h2>Необходими продукти${unitsLinkHtml()}</h2><div class="ingredient-list">${r.ings.map(x=>`<div><b>${escHtml(x[0])} ${escHtml(x[1])}</b> ${escHtml(x[2])}</div>`).join("")}</div>
<h2>Начин на приготвяне</h2>${steps.map((s,i)=>`<div class="step"><span class="stepno">${i+1}</span><div>${escHtml(s)}</div></div>`).join("")}
</div>`);
}
async function toggleFav(id,btn){
  await guard(btn, async ()=>{
    const r=me().recipes.find(x=>x.id===id);
    if(!r)return;
    await dbUpdateRecipe(id,{fav:!r.fav});
    openRecipe(id);
  });
}
async function shareRecipe(id,btn){
  await guard(btn, async ()=>{
    const r=me().recipes.find(x=>x.id===id);
    if(!r)return;
    const next=!r.public;
    await dbUpdateRecipe(id,{is_public:next});
    toast(next?"Рецептата вече е публична":"Рецептата вече е лична");
    openRecipe(id);
  });
}
async function deleteRecipe(id,btn){
  const r=me().recipes.find(x=>x.id===id);
  if(!r)return;
  if(!confirm("Сигурни ли сте, че искате да изтриете „"+r.name+"“?"))return;
  await guard(btn, async ()=>{
    await dbDeleteRecipe(id);
    closeModal();toast("Рецептата е изтрита");currentView="home";render();
  });
}

/* ---------- RECIPE FORM (create + edit) ---------- */
function ingredientNames(){const set=new Set();me().recipes.forEach(r=>r.ings.forEach(i=>{if(i[2])set.add(i[2])}));return[...set]}
function openRecipeForm(editId){
  const r=editId?me().recipes.find(x=>x.id===editId):null;
  openModal(`<div class="modalbox"><button class="close" onclick="closeModal()">×</button>
<h2>${r?"Редактирай рецепта":"Нова рецепта"}</h2>
<datalist id="ingNames">${ingredientNames().map(n=>`<option value="${escHtml(n)}">`).join("")}</datalist>
<form onsubmit="${r?`saveEditRecipe(event,'${escJs(r.id)}')`:"createRecipe(event)"}">
<div class="formgrid">
<div class="field full"><label>Име *</label><input id="rn" required value="${r?escHtml(r.name):""}" placeholder="Напр. Мусака - 4 порции"></div>
<div class="field"><label>Категория *</label><select id="rc">${me().categories.map(c=>`<option ${r&&r.cat===c?"selected":""}>${escHtml(c)}</option>`).join("")}</select></div>
<div class="field"><label>Нова категория (по желание)</label><input id="rnewcat" placeholder="напр. Meal prep"></div>
<div class="field"><label>Време (по желание)</label><input id="rt" value="${r?escHtml(r.time||""):""}" placeholder="45 мин"></div>
<div class="field"><label>Порции (по желание)</label><input id="rs" type="number" min="1" value="${r&&r.servings?escHtml(r.servings):""}"></div>
<div class="field full"><label>Калории (по желание)</label><div style="display:flex;gap:10px"><input id="rk" type="number" min="0" placeholder="250" value="${r&&r.cal?escHtml(r.cal.split(" ")[0]):""}"><select id="rkunit"><option>за 100 г</option><option>за порция</option></select></div></div>
<div class="field full"><label>Продукти *</label><div class="ingredients" id="ings"></div><div style="display:flex;gap:8px;margin-top:4px"><button type="button" class="ghost" onclick="addIng()">+ Добави продукт</button><a class="ghost" style="text-decoration:none;display:inline-flex;align-items:center" href="https://www.supichka.com/%D1%80%D0%B5%D1%86%D0%B5%D0%BF%D1%82%D0%B0/453/%D0%BC%D0%B5%D1%80%D0%BD%D0%B8-%D0%B5%D0%B4%D0%B8%D0%BD%D0%B8%D1%86%D0%B8-%D0%B2-%D0%BA%D1%83%D1%85%D0%BD%D1%8F%D1%82%D0%B0-%D0%BA%D1%83%D1%85%D0%BD%D0%B5%D0%BD%D1%81%D0%BA%D0%B8-%D0%BC%D0%B5%D1%80%D0%BA%D0%B8" target="_blank" rel="noopener">📏 Мерни единици</a></div></div>
<div class="field full"><label>Начин на приготвяне</label><textarea id="rsteps" placeholder="Напиши стъпките свободно...">${r?escHtml(r.steps):""}</textarea></div>
</div>
<div style="margin-top:18px"><button class="primary">${r?"Запази промените":"Запази рецептата"}</button></div>
</form></div>`);
  if(r){r.ings.forEach(i=>addIng(i))}else{addIng();addIng();addIng()}
}
function addIng(prefill){
  const e=document.createElement("div");
  e.className="ingrow";
  const amt=prefill?escHtml(prefill[0]):"";
  const unit=prefill?prefill[1]:"г";
  const name=prefill?escHtml(prefill[2]):"";
  e.innerHTML=`<input placeholder="Кол." value="${amt}"><select>${UNITS.map(u=>`<option ${u===unit?"selected":""}>${u}</option>`).join("")}</select><input placeholder="Продукт" value="${name}" list="ingNames"><button type="button" onclick="this.parentElement.remove()">×</button>`;
  document.getElementById("ings").appendChild(e);
}
/* Само редовете ВЪТРЕ формата — на екрана има и друг .ingrow
   (реда за ръчно добавяне на продукт в списъка за пазаруване). */
function readIngRows(){return[...document.querySelectorAll("#ings .ingrow")].map(row=>{const a=row.querySelectorAll("input");return[a[0].value.trim(),row.querySelector("select").value,a[1].value.trim()]}).filter(x=>x[2])}
function readForm(){
  const newcat=document.getElementById("rnewcat").value.trim();
  const cat=newcat||document.getElementById("rc").value;
  const ings=readIngRows();
  const k=document.getElementById("rk").value.trim();
  return {newcat,cat,ings,
    name:document.getElementById("rn").value.trim(),
    time:document.getElementById("rt").value.trim(),
    servings:document.getElementById("rs").value,
    cal:k?(k+" kcal / "+document.getElementById("rkunit").value.replace("за ","")):"",
    steps:document.getElementById("rsteps").value.trim()};
}
async function createRecipe(ev){
  ev.preventDefault();
  const btn=ev.target.querySelector("button.primary");
  await guard(btn, async ()=>{
    const f=readForm();
    if(!f.ings.length){toast("Добави поне един продукт");return}
    if(f.newcat&&!me().categories.includes(f.cat))await dbAddCategory(f.cat);
    await dbInsertRecipe({name:f.name,cat:f.cat,emoji:"🍽️",time:f.time,servings:f.servings,
      cal:f.cal,public:false,fav:false,ings:f.ings,steps:f.steps});
    closeModal();toast("Рецептата е запазена");showHome();
  });
}
function editRecipe(id){closeModal();openRecipeForm(id)}
async function saveEditRecipe(ev,id){
  ev.preventDefault();
  const btn=ev.target.querySelector("button.primary");
  await guard(btn, async ()=>{
    const r=me().recipes.find(x=>x.id===id);
    if(!r)return;
    const f=readForm();
    if(!f.ings.length){toast("Добави поне един продукт");return}
    if(f.newcat&&!me().categories.includes(f.cat))await dbAddCategory(f.cat);
    await dbUpdateRecipe(id,{name:f.name,cat:f.cat,time:f.time,servings:String(f.servings||""),
      cal:f.cal,ings:f.ings,steps:f.steps});
    closeModal();toast("Промените са запазени");openRecipe(id);
  });
}
