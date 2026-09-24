
/* ARIZONA V21.7 · Performance Core */
const AZ_CORE_CACHE_VERSION=219;
let azLessonDetailCache=new Map();
let azLoadingSeq=0,azLoadingJobs=new Map(),azLoaderTimer=null;
let azLastCoreRefresh=0,azCoreRefreshPromise=null;

function azLoaderRender(){
  const el=$('globalLoader');if(!el)return;
  if(!azLoadingJobs.size){clearTimeout(azLoaderTimer);azLoaderTimer=null;el.classList.add('hidden');el.classList.remove('soft');return}
  const jobs=[...azLoadingJobs.values()],job=jobs[jobs.length-1];
  const hard=jobs.some(x=>!x.soft);
  $('globalLoaderTitle').textContent=job.title||'Chargement…';
  $('globalLoaderSubtitle').textContent=job.subtitle||'ARIZONA prépare les données.';
  el.classList.toggle('soft',!hard);
  el.classList.remove('hidden');
}
function beginLoading(title,opts={}){
  const token=++azLoadingSeq;
  azLoadingJobs.set(token,{title,subtitle:opts.subtitle||'',soft:!!opts.soft});
  clearTimeout(azLoaderTimer);
  azLoaderTimer=setTimeout(azLoaderRender,Number.isFinite(opts.delay)?opts.delay:120);
  return token;
}
function endLoading(token){azLoadingJobs.delete(token);azLoaderRender()}
async function withLoading(title,fn,opts={}){
  const token=beginLoading(title,opts);
  try{return await fn()}finally{endLoading(token)}
}
function currentViewV217(){
  const el=[...document.querySelectorAll('.view')].find(x=>!x.classList.contains('hidden'));
  return el?.id?.replace(/^view-/,'')||'home';
}
function lessonSummaryV217(l){return String(l?.summary_text||section(l?.raw_text,'RÉSUMÉ EXÉCUTIF')||'').trim()}
function lessonMadagascarV217(l){return String(l?.madagascar_text||section(l?.raw_text,'MADAGASCAR')||'').trim()}
function lessonHasQuizV217(l){return typeof l?.has_quiz==='boolean'?l.has_quiz:parseQuiz(l?.raw_text).length>0}
function coreCacheKeyV217(){return 'az_core_v217_'+String(session?.user?.id||'anonymous')}
function detailCacheKeyV217(){return 'az_details_v217_'+String(session?.user?.id||'anonymous')}
function coreLessonIndexV217(l){
  return {
    id:l.id,lesson_date:l.lesson_date,name:l.name,symbol:l.symbol,image_urls:Array.isArray(l.image_urls)?l.image_urls:[],
    created_at:l.created_at,updated_at:l.updated_at,data_status:l.data_status,last_verified_at:l.last_verified_at,
    summary_text:l.summary_text||lessonSummaryV217(l),madagascar_text:l.madagascar_text||lessonMadagascarV217(l),
    has_quiz:lessonHasQuizV217(l)
  };
}
function saveCoreCacheV217(){
  if(!session)return;
  try{
    localStorage.setItem(coreCacheKeyV217(),JSON.stringify({
      version:AZ_CORE_CACHE_VERSION,saved_at:Date.now(),
      lessons:lessons.map(coreLessonIndexV217),
      favorites:[...favorites],
      progress:[...progress.entries()]
    }));
  }catch(e){console.warn('Cache ARIZONA',e)}
}
function readRecentDetailsV217(){
  if(!session)return[];
  try{
    const data=JSON.parse(localStorage.getItem(detailCacheKeyV217())||'[]');
    return Array.isArray(data)?data:[];
  }catch{return[]}
}
function hydrateRecentDetailsV217(){
  const details=readRecentDetailsV217();
  details.forEach(d=>{
    const i=lessons.findIndex(l=>Number(l.id)===Number(d.id));
    if(i<0)return;
    if(d.updated_at&&lessons[i].updated_at&&String(d.updated_at)!==String(lessons[i].updated_at))return;
    lessons[i]={...lessons[i],...d};
    azLessonDetailCache.set(Number(d.id),lessons[i]);
  });
}
function cacheLessonDetailV217(l){
  if(!session||!l?.raw_text)return;
  azLessonDetailCache.set(Number(l.id),l);
  try{
    const arr=readRecentDetailsV217().filter(x=>Number(x.id)!==Number(l.id));
    arr.unshift(l);
    localStorage.setItem(detailCacheKeyV217(),JSON.stringify(arr.slice(0,8)));
  }catch(e){console.warn('Cache détail',e)}
}
function restoreCoreCacheV217(){
  if(!session)return false;
  try{
    const data=JSON.parse(localStorage.getItem(coreCacheKeyV217())||'null');
    if(!data||data.version!==AZ_CORE_CACHE_VERSION||!Array.isArray(data.lessons)||!data.lessons.length)return false;
    const cachedAll=data.lessons;
    weeklyReports=cachedAll.filter(isWeeklyReport);
    lessons=cachedAll.filter(l=>!isWeeklyReport(l));
    favorites=new Set((data.favorites||[]).map(Number));
    progress=new Map((data.progress||[]).map(([k,v])=>[Number(k),v]));
    hydrateRecentDetailsV217();
    return true;
  }catch{return false}
}

async function loadLessons(){
  const fields='id,lesson_date,name,symbol,image_urls,created_at,updated_at,data_status,last_verified_at,summary_text,madagascar_text,has_quiz';
  const [allRes,reportsRes]=await Promise.all([
    sb.from('arizona_lessons').select(fields).order('lesson_date',{ascending:false}).order('id',{ascending:false}),
    sb.from('arizona_lessons').select(fields).like('name','BILAN HEBDOMADAIRE%').order('lesson_date',{ascending:false}).order('id',{ascending:false})
  ]);
  if(allRes.error)throw allRes.error;
  const all=allRes.data||[];
  weeklyReports=reportsRes.error?all.filter(isWeeklyReport):(reportsRes.data||[]);
  lessons=all.filter(l=>!isWeeklyReport(l));
  hydrateRecentDetailsV217();
}
async function ensureLessonDetail(id,force=false){
  const n=Number(id);
  let l=lessons.find(x=>Number(x.id)===n);
  if(!force&&l?.raw_text)return l;
  if(!force&&azLessonDetailCache.has(n))return azLessonDetailCache.get(n);
  const {data,error}=await sb.from('arizona_lessons').select('*').eq('id',n).single();
  if(error)throw error;
  const i=lessons.findIndex(x=>Number(x.id)===n);
  if(i>=0)lessons[i]={...lessons[i],...data};else lessons.push(data);
  l=i>=0?lessons[i]:data;
  cacheLessonDetailV217(l);
  return l;
}
async function requestLessonDataV218(id,opts={}){
  const n=Number(id);if(!n)return null;
  const title=opts.title||'Chargement du minerai…';
  const subtitle=opts.subtitle||'Récupération des données techniques nécessaires.';
  const run=async()=>{
    const l=await ensureLessonDetail(n,!!opts.force);
    if(opts.sources&&typeof loadArizonaV20==='function')await loadArizonaV20(n,!!opts.force);
    return l;
  };
  if(opts.loading===false||typeof withLoading!=='function')return run();
  return withLoading(title,run,{delay:Number.isFinite(opts.delay)?opts.delay:80,subtitle,soft:!!opts.soft});
}
async function ensureLessonDetails(ids){
  const unique=[...new Set((ids||[]).map(Number).filter(Boolean))];
  return Promise.all(unique.map(id=>ensureLessonDetail(id)));
}
async function ensureAllLessonDetails(){
  if(lessons.length&&lessons.every(l=>l.raw_text))return lessons;
  const {data,error}=await sb.from('arizona_lessons').select('*').order('lesson_date',{ascending:false}).order('id',{ascending:false});
  if(error)throw error;
  const all=data||[];
  weeklyReports=all.filter(isWeeklyReport);
  lessons=all.filter(l=>!isWeeklyReport(l));
  lessons.slice(0,8).forEach(cacheLessonDetailV217);
  return lessons;
}
async function syncCoreV217(render=true){
  if(azCoreRefreshPromise)return azCoreRefreshPromise;
  azCoreRefreshPromise=(async()=>{
    await Promise.all([loadLessons(),loadFavorites(),loadProgress()]);
    saveCoreCacheV217();
    azLastCoreRefresh=Date.now();
    if(render)renderAll();
  })();
  try{await azCoreRefreshPromise}finally{azCoreRefreshPromise=null}
}
async function signIn(){
  return withLoading('Connexion…',async()=>{
    const {data,error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
    if(error){$('authMsg').textContent=error.message;return}
    session=data.session;await enterApp();
  },{delay:0,subtitle:'Vérification du compte et ouverture de votre espace.'});
}
async function signUp(){
  const email=$('email').value.trim(),password=$('password').value;
  if(!email||!password){$('authMsg').textContent='E-mail et mot de passe requis.';return}
  return withLoading('Création du compte…',async()=>{
    const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:location.href.split('#')[0]}});
    if(error){$('authMsg').textContent=error.message;return}
    if(data.session){session=data.session;await enterApp()}
    else $('authMsg').textContent='Compte créé. Confirme l’e-mail reçu, puis reviens ici et connecte-toi.';
  },{delay:0,subtitle:'Création sécurisée de votre profil ARIZONA.'});
}
async function enterApp(){
  $('loginView').classList.add('hidden');$('appView').classList.remove('hidden');setSync('Préparation…',false);
  await withLoading('Ouverture d’ARIZONA…',async()=>{
    await loadProfile();
    const cached=restoreCoreCacheV217();
    if(cached){renderAll();setSync('Données locales chargées',true)}
    try{
      await syncCoreV217(true);
      setSync('Synchronisé',true);
    }catch(e){
      if(!cached)throw e;
      console.warn(e);setSync('Mode local',false);toast('Connexion lente : affichage des données locales.');
    }
  },{delay:0,subtitle:'Chargement du profil et des données essentielles.'});
  touchActivity().catch(()=>{});
  recordLogin().catch(()=>{});
  setTimeout(()=>{
    if(typeof loadArizonaExtras==='function')withLoading('Chargement de vos outils personnels…',()=>loadArizonaExtras(),{soft:true,delay:180,subtitle:'Notes, collections et révisions.'}).catch(console.warn);
  },120);
}

function renderHome(){
  const l=lessons[0];$('countLessons').textContent=lessons.length;$('countFav').textContent=favorites.size;
  const scores=[...progress.values()].map(x=>Number(x.score||0));$('avgQuiz').textContent=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1)+'/3':'—';
  if(!l){$('todayName').textContent='Aucune fiche';$('todaySummary').textContent='Aucune fiche publiée.';return}
  $('todayName').textContent=l.name;$('todayDate').textContent=formatDate(l.lesson_date);$('todaySymbol').textContent=compactSymbol(l);$('todaySummary').textContent=lessonSummaryV217(l)||'Ouvrir la fiche pour consulter le résumé.';
  fillGallery('homeGallery',l);
}
function lessonCard(l,admin=false){
  const fav=favorites.has(Number(l.id)),summary=lessonSummaryV217(l);
  return '<div class="card lessonCard lessonCardClickable" data-open-card="'+l.id+'" tabindex="0" role="button" aria-label="Ouvrir la fiche '+esc(l.name)+'"><div class="thumb thumbFallback" data-thumb="'+l.id+'">'+esc(compactSymbol(l))+'</div><div class="lessonMain"><div class="lessonTitle">'+esc(l.name)+' <span class="roleBadge">'+esc(compactSymbol(l))+'</span></div><div class="lessonDesc">'+esc(formatDate(l.lesson_date))+'</div><div class="lessonSummary">'+esc(summary||'Ouvrir la fiche pour consulter les détails.')+'</div></div><div class="lessonActions"><button class="btn favToggle" data-fav="'+l.id+'" title="Favori" aria-label="Favori">'+(fav?'★':'☆')+'</button>'+(admin?'<button class="btn editLesson editIconBtn" data-edit="'+l.id+'" aria-label="Modifier" title="Modifier">✎</button>':'')+'</div></div>';
}
let azHistoryLimitV217=60,azFavoritesLimitV217=60;
function renderHistoryV217(){
  const box=$('historyList');if(!box)return;
  const q=String($('historySearch')?.value||'').trim().toLowerCase();
  const filtered=lessons.filter(l=>!q||[l.name,l.symbol,lessonSummaryV217(l),lessonMadagascarV217(l)].join(' ').toLowerCase().includes(q));
  const visible=filtered.slice(0,azHistoryLimitV217);
  box.innerHTML=visible.map(l=>lessonCard(l)).join('')||'<div class="card cardPad small">Aucun résultat.</div>';
  if(filtered.length>visible.length)box.insertAdjacentHTML('beforeend','<button id="historyLoadMoreV217" class="btn v217LoadMore">Afficher '+Math.min(60,filtered.length-visible.length)+' de plus</button>');
  if($('historyLoadMoreV217'))$('historyLoadMoreV217').onclick=()=>{azHistoryLimitV217+=60;renderHistoryV217();wireLessonCards()};
}
function renderFavoritesV217(){
  const box=$('favoritesList');if(!box)return;
  const favs=lessons.filter(l=>favorites.has(Number(l.id))),visible=favs.slice(0,azFavoritesLimitV217);
  box.innerHTML=visible.map(l=>lessonCard(l)).join('')||'<div class="card cardPad small">Aucun favori pour le moment.</div>';
  if(favs.length>visible.length)box.insertAdjacentHTML('beforeend','<button id="favoritesLoadMoreV217" class="btn v217LoadMore">Afficher '+Math.min(60,favs.length-visible.length)+' de plus</button>');
  if($('favoritesLoadMoreV217'))$('favoritesLoadMoreV217').onclick=()=>{azFavoritesLimitV217+=60;renderFavoritesV217();wireLessonCards()};
}
function renderAdminLessonsV217(){
  const box=$('adminLessonsList');if(!box||!isAdmin())return;
  box.innerHTML=lessons.slice(0,120).map(l=>lessonCard(l,true)).join('')+(lessons.length>120?'<div class="small v217ListNote">120 fiches affichées. Utilise la recherche/Explorer pour accéder aux autres.</div>':'');
}
function renderLessonLists(forceView=null){
  const view=forceView||currentViewV217();
  if(view==='history')renderHistoryV217();
  if(view==='favorites')renderFavoritesV217();
  if(view==='admin')renderAdminLessonsV217();
  wireLessonCards();
}
function renderProgress(){
  const done=progress.size,total=lessons.filter(lessonHasQuizV217).length;const scores=[...progress.values()].map(x=>Number(x.score||0));const avg=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1):'—';
  $('progressSummary').textContent=done+' quiz réalisés sur '+total+'. Score moyen : '+avg+'/3.';
  $('progressList').innerHTML=lessons.filter(lessonHasQuizV217).map(l=>{const p=progress.get(Number(l.id));return '<div class="card progressCard"><div class="badge">'+esc(compactSymbol(l))+'</div><div class="lessonMain"><div class="lessonTitle">'+esc(l.name)+'</div><div class="lessonDesc">'+(p?'Meilleur score : '+p.score+'/3':'Quiz non réalisé')+'</div></div><button class="btn progressOpenBtn" data-open="'+l.id+'">'+(p?'Revoir':'Commencer')+'</button></div>'}).join('')||'<div class="card cardPad small">Aucun quiz disponible.</div>';
  document.querySelectorAll('#progressList [data-open]').forEach(b=>b.onclick=()=>openLesson(Number(b.dataset.open)));
}
async function toggleFavorite(id){
  if(favorites.has(id)){const {error}=await sb.from('user_favorites').delete().eq('user_id',session.user.id).eq('lesson_id',id);if(error)return toast(error.message);favorites.delete(id)}
  else{const {error}=await sb.from('user_favorites').insert({user_id:session.user.id,lesson_id:id});if(error)return toast(error.message);favorites.add(id)}
  saveCoreCacheV217();renderHome();renderLessonLists();if(typeof azRenderDashboard==='function')azRenderDashboard();if(activeLesson?.id===id)$('modalFav').textContent=favorites.has(id)?'★':'☆';
}
async function openLesson(id){
  return withLoading('Chargement de la fiche…',async()=>{
    const l=await ensureLessonDetail(id);
    if(typeof loadArizonaV20==='function')await loadArizonaV20(l.id);
    activeLesson=l;
    if(typeof azTrackRecentlyViewed==='function')azTrackRecentlyViewed(id);
    recordUsageEvent('view_lesson','lesson',l.id,{lesson_name:l.name,symbol:compactSymbol(l)});
    $('lessonModal').classList.add('open');
    $('modalName').textContent=l.name+' · '+compactSymbol(l);$('modalDate').textContent=formatDate(l.lesson_date);$('modalFav').textContent=favorites.has(Number(l.id))?'★':'☆';
    $('modalSummary').textContent=lessonSummaryV217(l);renderDetails(l);renderQuiz(l);
    if(typeof renderLessonExtras==='function')renderLessonExtras(l);
    if(typeof renderLessonV20==='function')renderLessonV20(l);
    if(typeof renderLessonIntelligence==='function')renderLessonIntelligence(l);
    fillGallery('modalGallery',l);
    return l;
  },{subtitle:'Récupération des données techniques et des sources.'});
}

if($('historySearch'))$('historySearch').addEventListener('input',()=>{azHistoryLimitV217=60;if(currentViewV217()==='history'){renderHistoryV217();wireLessonCards()}});
