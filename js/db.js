/* ============================================================
   DATA LAYER — всичко минава през Supabase.
   `state` е кеш в паметта; всяка промяна първо отива в базата.
   ============================================================ */
const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const state = {
  user: null,            // supabase auth user
  username: null,        // от profiles
  categories: [],        // ["Закуска", ...]
  recipes: [],           // мои рецепти (app формат)
  week: {},              // {"Понеделник":[{id,meal}]}
  shopping: {},          // {"домати|бр": true} — отметки по продуктите от рецептите
  customItems: [],       // [{id,name,qty,unit,done}] — ръчно добавени продукти
  friends: [],           // [{id, username}]
  publicRecipes: []      // [{owner, ownerId, r}] — кеш за общия феед
};
function me(){return state}
function signedIn(){return !!state.user}

/* ---------- MAPPERS ---------- */
function rowToRecipe(row){
  return {id:row.id,name:row.name,cat:row.cat,emoji:row.emoji||"🍽️",time:row.time||"",
    servings:row.servings||"",cal:row.cal||"",public:!!row.is_public,fav:!!row.fav,
    fromFriend:row.from_friend||null,ings:row.ings||[],steps:row.steps||""};
}
function recipeToRow(r){
  return {name:r.name,cat:r.cat,emoji:r.emoji||"🍽️",time:r.time||"",servings:String(r.servings||""),
    cal:r.cal||"",is_public:!!r.public,fav:!!r.fav,from_friend:r.fromFriend||null,
    ings:r.ings||[],steps:r.steps||""};
}
function ok(res){if(res.error)throw res.error;return res.data}

/* ---------- LOAD ---------- */
async function loadAll(){
  const uid = state.user.id;
  const [prof,cats,recs,week,shop,items,fr] = await Promise.all([
    sb.from("profiles").select("username").eq("id",uid).single(),
    sb.from("categories").select("name").eq("owner",uid).order("name"),
    sb.from("recipes").select("*").eq("owner",uid).order("created_at"),
    sb.from("week_plan").select("day,meal,recipe_id").eq("owner",uid),
    sb.from("shopping_state").select("item_key,done").eq("owner",uid),
    sb.from("shopping_items").select("id,name,qty,unit,done").eq("owner",uid).order("created_at"),
    sb.from("friends").select("friend, profiles!friends_friend_fkey(username)").eq("owner",uid)
  ]);
  state.username = prof.error ? null : prof.data.username;
  state.categories = ok(cats).map(x=>x.name);
  state.recipes = ok(recs).map(rowToRecipe);
  state.week = {};
  ok(week).forEach(e=>{(state.week[e.day]=state.week[e.day]||[]).push({id:e.recipe_id,meal:e.meal})});
  state.shopping = {};
  ok(shop).forEach(s=>{state.shopping[s.item_key]=s.done});
  state.customItems = ok(items);
  state.friends = ok(fr).map(x=>({id:x.friend,username:x.profiles?x.profiles.username:"?"}));
}
function clearState(){
  state.user=null;state.username=null;state.categories=[];state.recipes=[];
  state.week={};state.shopping={};state.customItems=[];state.friends=[];state.publicRecipes=[];
}

/* ---------- CATEGORIES ---------- */
async function dbAddCategory(name){
  ok(await sb.from("categories").insert({owner:state.user.id,name}));
  state.categories.push(name);state.categories.sort();
}
async function dbRemoveCategory(name){
  ok(await sb.from("categories").delete().eq("owner",state.user.id).eq("name",name));
  state.categories = state.categories.filter(c=>c!==name);
}

/* ---------- RECIPES ---------- */
async function dbInsertRecipe(recipe){
  const row = ok(await sb.from("recipes").insert({owner:state.user.id,...recipeToRow(recipe)}).select().single());
  const r = rowToRecipe(row);state.recipes.push(r);return r;
}
async function dbUpdateRecipe(id,patch){
  const row = ok(await sb.from("recipes").update(patch).eq("id",id).select().single());
  const r = rowToRecipe(row);
  const i = state.recipes.findIndex(x=>x.id===id);
  if(i>-1)state.recipes[i]=r;
  return r;
}
async function dbDeleteRecipe(id){
  ok(await sb.from("recipes").delete().eq("id",id));   // week_plan се чисти с ON DELETE CASCADE
  state.recipes = state.recipes.filter(x=>x.id!==id);
  Object.keys(state.week).forEach(d=>{state.week[d]=state.week[d].filter(x=>x.id!==id)});
}

/* ---------- WEEK PLAN ---------- */
async function dbAddWeek(day,meal,recipeId){
  ok(await sb.from("week_plan").upsert({owner:state.user.id,day,meal,recipe_id:recipeId},
                                       {onConflict:"owner,day,meal,recipe_id"}));
  const list = state.week[day]=state.week[day]||[];
  if(!list.some(x=>x.id===recipeId&&x.meal===meal))list.push({id:recipeId,meal});
}
async function dbRemoveWeek(day,meal,recipeId){
  ok(await sb.from("week_plan").delete().eq("owner",state.user.id)
       .eq("day",day).eq("meal",meal).eq("recipe_id",recipeId));
  state.week[day]=(state.week[day]||[]).filter(x=>!(x.id===recipeId&&x.meal===meal));
}

/* ---------- SHOPPING ---------- */
async function dbSetShopping(key,done){
  ok(await sb.from("shopping_state").upsert({owner:state.user.id,item_key:key,done},
                                            {onConflict:"owner,item_key"}));
  state.shopping[key]=done;
}

/* ---------- CUSTOM SHOPPING ITEMS ---------- */
async function dbAddCustomItem(name,qty,unit){
  const row = ok(await sb.from("shopping_items")
    .insert({owner:state.user.id,name,qty,unit,done:false}).select().single());
  state.customItems.push(row);
  return row;
}
async function dbSetCustomItemDone(id,done){
  ok(await sb.from("shopping_items").update({done}).eq("id",id));
  const it=state.customItems.find(x=>x.id===id);
  if(it)it.done=done;
}
async function dbDeleteCustomItem(id){
  ok(await sb.from("shopping_items").delete().eq("id",id));
  state.customItems=state.customItems.filter(x=>x.id!==id);
}
async function dbClearDoneCustomItems(){
  ok(await sb.from("shopping_items").delete().eq("owner",state.user.id).eq("done",true));
  state.customItems=state.customItems.filter(x=>!x.done);
}

/* ---------- FRIENDS / PROFILES ---------- */
async function dbSearchProfiles(q){
  return ok(await sb.from("profiles").select("id,username")
    .ilike("username","%"+q+"%").neq("id",state.user.id).limit(25));
}
async function dbAddFriend(id,username){
  ok(await sb.from("friends").upsert({owner:state.user.id,friend:id},{onConflict:"owner,friend"}));
  if(!state.friends.some(f=>f.id===id))state.friends.push({id,username});
}
async function dbRemoveFriend(id){
  ok(await sb.from("friends").delete().eq("owner",state.user.id).eq("friend",id));
  state.friends = state.friends.filter(f=>f.id!==id);
}

/* ---------- PUBLIC FEED ---------- */
function cachePublic(rows){
  rows.forEach(row=>{
    const item={owner:row.profiles?row.profiles.username:"?",ownerId:row.owner,r:rowToRecipe(row)};
    const i=state.publicRecipes.findIndex(x=>x.r.id===item.r.id);
    if(i>-1)state.publicRecipes[i]=item;else state.publicRecipes.push(item);
  });
}
async function dbLoadPublic(){
  const rows = ok(await sb.from("recipes").select("*, profiles!recipes_owner_fkey(username)")
    .eq("is_public",true).order("created_at",{ascending:false}).limit(500));
  state.publicRecipes = [];
  cachePublic(rows);
}
async function dbLoadFriendPublic(friendId){
  const rows = ok(await sb.from("recipes").select("*, profiles!recipes_owner_fkey(username)")
    .eq("owner",friendId).eq("is_public",true).order("created_at",{ascending:false}));
  cachePublic(rows);
  return rows.map(r=>r.id);
}
function findPublic(id){return state.publicRecipes.find(x=>x.r.id===id)}
