let adminNotifications=[],adminMadagascarEntities=[];
async function importLesson(){
 if(!isAdmin())return toast('Action réservée à l’administrateur.');
 try{
  const parsed=parseImport($('importText').value);if(!parsed.raw_text)throw new Error('Fiche vide.');
  const existing=lessons.find(l=>l.lesson_date===parsed.lesson_date&&l.name.toLowerCase()===parsed.name.toLowerCase());
  let res;
  const structured=typeof deriveStructuredDataV20==='function'?deriveStructuredDataV20(parsed):{};
  if(existing)res=await sb.from('arizona_lessons').update({...parsed,structured_data:structured,data_status:'draft',updated_by:session.user.id,updated_at:new Date().toISOString()}).eq('id',existing.id);
  else res=await sb.from('arizona_lessons').insert({...parsed,structured_data:structured,data_status:'draft',created_by:session.user.id,updated_by:session.user.id});
  if(res.error)throw res.error;
  $('importText').value='';$('importMsg').textContent='Fiche publiée.';await loadLessons();if(typeof loadArizonaV20==='function')await loadArizonaV20();renderAll();await loadAdmin();toast('Fiche synchronisée sur tous les appareils.')
 }catch(e){$('importMsg').textContent=e.message}
}
async function openEdit(id){
 if(!isAdmin())return;
 const run=async()=>{
   const l=typeof ensureLessonDetail==='function'?await ensureLessonDetail(id):lessons.find(x=>Number(x.id)===Number(id));
   if(!l)return;
   if(typeof loadArizonaV20==='function')await loadArizonaV20(l.id);
   $('editId').value=l.id;$('editDate').value=l.lesson_date;$('editName').value=l.name;$('editSymbol').value=compactSymbol(l);$('editImages').value=(l.image_urls||[]).join('\n');$('editRaw').value=l.raw_text||'';if(typeof populateV20Editor==='function')populateV20Editor(l);$('editModal').classList.add('open');
 };
 if(typeof withLoading==='function')return withLoading('Chargement de l’éditeur…',run,{subtitle:'Récupération de la fiche complète et de ses sources.'});
 return run();
}
async function saveEdit(){
 if(!isAdmin())return;const id=Number($('editId').value);const status=$('v20DataStatus')?.value||'legacy';const payload={lesson_date:$('editDate').value,name:$('editName').value.trim(),symbol:$('editSymbol').value.trim(),raw_text:$('editRaw').value.trim(),image_urls:$('editImages').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),structured_data:typeof collectStructuredDataV20==='function'?collectStructuredDataV20():{},data_status:status,last_verified_at:status==='verified'?new Date().toISOString():null,updated_by:session.user.id,updated_at:new Date().toISOString()};
 const {error}=await sb.from('arizona_lessons').update(payload).eq('id',id);if(error)return toast(error.message);$('editModal').classList.remove('open');await loadLessons();if(typeof loadArizonaV20==='function')await loadArizonaV20();renderAll();await loadAdmin();toast('Fiche modifiée et version précédente archivée.')
}
async function deleteLesson(){
 if(!isAdmin())return;const id=Number($('editId').value),l=lessons.find(x=>Number(x.id)===id);if(!confirm('Supprimer définitivement la fiche '+(l?.name||'')+' ?'))return;
 const {error}=await sb.from('arizona_lessons').delete().eq('id',id);if(error)return toast(error.message);$('editModal').classList.remove('open');await loadLessons();if(typeof loadArizonaV20==='function')await loadArizonaV20();renderAll();await loadAdmin();toast('Fiche supprimée.')
}
function newLesson(){
 const today=new Date().toISOString().slice(0,10);$('editId').value='';$('editDate').value=today;$('editName').value='';$('editSymbol').value='';$('editImages').value='';if(typeof populateV20Editor==='function')populateV20Editor({id:0,raw_text:'',structured_data:{},data_status:'draft'});$('editRaw').value=today+'\n\nNOM DU MINÉRAL\n\nRÉSUMÉ EXÉCUTIF\n\nCARACTÉRISTIQUES CHIMIQUES\nFormule :\nSymbole :\nClasse :\nNuméro atomique :\nComposition :\nÉléments associés / impuretés :\nSystème cristallin :\nValence / états d’oxydation :\nRéactivité :\nAutres propriétés chimiques importantes :\n\nCARACTÉRISTIQUES PHYSIQUES\nCouleur :\nÉclat :\nDureté (Mohs) :\nDensité :\nTrait :\nClivage :\nFracture :\nTénacité :\nMagnétisme :\nConductivité :\nPoint de fusion :\nAutres :'; $('editModal').classList.add('open')
}
async function loadAdmin(){
 if(!isAdmin())return;
 const loadToken=typeof beginLoading==='function'?beginLoading('Chargement de l’administration…',{delay:80,subtitle:'Utilisateurs, activité et supervision.'}):null;
 try{
 const [{data:users,error:uerr},{data:acts,error:aerr},{data:logs,error:lerr},{data:notifs,error:nerr},{data:entities,error:eerr}]=await Promise.all([
   sb.from('profiles').select('*').order('created_at',{ascending:true}),
   sb.from('user_activity').select('*'),
   sb.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(400),
   sb.from('admin_notifications').select('*').order('created_at',{ascending:false}).limit(100),
   sb.from('madagascar_entities').select('*').order('updated_at',{ascending:false}).limit(300)
 ]);
 if(uerr||aerr||lerr||nerr||eerr){console.warn(uerr||aerr||lerr||nerr||eerr);return}
 const amap=new Map((acts||[]).map(a=>[a.user_id,a.last_seen_at]));
 adminUsers=(users||[]).map(u=>({...u,last_seen_at:amap.get(u.user_id)||null}));
 auditLogs=logs||[];
 adminNotifications=notifs||[];
 adminMadagascarEntities=entities||[];
 renderAdmin()
 }finally{if(loadToken&&typeof endLoading==='function')endLoading(loadToken)}
}
function renderAdmin(){
 $('adminUsers').textContent=adminUsers.length;
 $('adminLessons').textContent=lessons.length;
 $('adminImports').textContent=auditLogs.filter(x=>['import','create'].includes(x.action)).length;
 $('adminRecent').textContent=auditLogs.filter(x=>Date.now()-new Date(x.created_at).getTime()<7*864e5).length;
 renderAdminAnalytics();
 renderAdminEntitiesV216();

 $('usersBody').innerHTML=adminUsers.map(u=>{
   const self=u.user_id===session.user.id;
   const profileBits=[
     u.birth_date?'Naissance : '+new Date(u.birth_date+'T12:00:00').toLocaleDateString('fr-FR'):'',
     u.gender?'Genre : '+u.gender:'',
     u.study_field?'Études : '+u.study_field:''
   ].filter(Boolean);
   return '<tr><td><b>'+esc(String(u.display_name||'Utilisateur').trim()||'Utilisateur')+'</b></td><td class="adminProfileCell">'+(profileBits.length?profileBits.map(x=>'<div>'+esc(x)+'</div>').join(''):'<span class="small">Non renseigné</span>')+'</td><td>'+esc(u.email)+'</td><td class="adminUuidCell" title="'+esc(u.user_id)+'">'+esc(String(u.user_id).slice(0,8))+'…</td><td><select class="select roleSelect" data-user="'+u.user_id+'" style="min-width:140px"><option value="standard"'+(u.role==='standard'?' selected':'')+'>Standard</option><option value="admin"'+(u.role==='admin'?' selected':'')+'>Administrateur</option></select></td><td>'+esc(new Date(u.created_at).toLocaleString('fr-FR'))+'</td><td>'+(u.last_seen_at?esc(new Date(u.last_seen_at).toLocaleString('fr-FR')):'—')+'</td><td><button class="btn danger deleteUserBtn" data-delete-user="'+u.user_id+'" '+(self?'disabled title="Impossible de supprimer votre propre compte"':'')+'>Supprimer</button></td></tr>'
 }).join('');

 document.querySelectorAll('.roleSelect').forEach(s=>s.onchange=()=>changeRole(s.dataset.user,s.value));
 document.querySelectorAll('.deleteUserBtn:not([disabled])').forEach(b=>b.onclick=()=>deleteArizonaUser(b.dataset.deleteUser));
 renderNotifications();
 renderLogs()
}

function renderAdminEntitiesV216(){
 const summary=$('adminEntitySummary'),list=$('adminEntityList');if(!summary||!list)return;
 const byOwner=new Map();
 adminMadagascarEntities.forEach(e=>{const k=e.owner_user_id||'legacy';byOwner.set(k,(byOwner.get(k)||0)+1)});
 const ownerRows=[...byOwner.entries()].sort((a,b)=>b[1]-a[1]);
 const top=ownerRows[0];
 const topUser=top?adminUsers.find(u=>u.user_id===top[0]):null;
 summary.innerHTML=
  '<div class="card adminUsageCard"><strong>'+adminMadagascarEntities.length+'</strong><span>entités structurées</span></div>'+
  '<div class="card adminUsageCard"><strong>'+ownerRows.filter(([k])=>k!=='legacy').length+'</strong><span>utilisateurs contributeurs</span></div>'+
  '<div class="card adminUsageCard"><strong>'+(top?top[1]:0)+'</strong><span>maximum par utilisateur</span></div>'+
  '<div class="card adminUsageCard"><strong>'+adminMadagascarEntities.filter(e=>e.status==='operation').length+'</strong><span>en exploitation</span></div>';
 list.innerHTML=adminMadagascarEntities.length?adminMadagascarEntities.slice(0,30).map(e=>{
   const u=adminUsers.find(x=>x.user_id===e.owner_user_id);
   const who=u?.display_name||u?.email||(e.owner_user_id?'Utilisateur':'Ancienne donnée');
   return '<div class="adminEntityRow"><div><b>'+esc(e.name)+'</b><small>'+esc([(typeof v21TypeLabel==='function'?v21TypeLabel(e.entity_type):e.entity_type),e.region].filter(Boolean).join(' · '))+'</small></div><div><span>'+esc(who)+'</span><small>'+esc(new Date(e.updated_at||e.created_at).toLocaleDateString('fr-FR'))+'</small></div></div>';
 }).join(''):'<div class="small">Aucune entité structurée utilisateur.</div>';
}
function renderAdminAnalytics(){
 const summary=$('adminUsageSummary'),searchBox=$('adminSearchTerms'),lessonBox=$('adminTopLessons'),highlights=$('adminHighlights');
 if(!summary||!searchBox||!lessonBox||!highlights)return;
 const now=Date.now(),d7=7*864e5,d30=30*864e5;
 const recent7=auditLogs.filter(x=>now-new Date(x.created_at).getTime()<=d7);
 const recent30=auditLogs.filter(x=>now-new Date(x.created_at).getTime()<=d30);
 const searches=recent30.filter(x=>x.action==='search'&&String(x.metadata?.query||'').trim().length>=2);
 const views=recent30.filter(x=>x.action==='view_lesson');
 const activeUsers=new Set(recent7.map(x=>x.actor_user_id).filter(Boolean));
 const uniqueViewed=new Set(views.map(x=>String(x.entity_id||x.metadata?.lesson_name||'')).filter(Boolean));

 summary.innerHTML=
  '<div class="card adminUsageCard"><strong>'+recent7.filter(x=>x.action==='search').length+'</strong><span>recherches · 7 j</span></div>'+
  '<div class="card adminUsageCard"><strong>'+recent7.filter(x=>x.action==='view_lesson').length+'</strong><span>consultations · 7 j</span></div>'+
  '<div class="card adminUsageCard"><strong>'+activeUsers.size+'</strong><span>utilisateurs actifs · 7 j</span></div>'+
  '<div class="card adminUsageCard"><strong>'+uniqueViewed.size+'</strong><span>fiches distinctes vues · 30 j</span></div>';

 const normalize=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const counts=(items,keyFn)=>{
   const m=new Map();
   for(const item of items){
     const raw=keyFn(item),key=normalize(raw);
     if(!key)continue;
     const prev=m.get(key)||{label:String(raw).trim(),count:0};
     prev.count++;m.set(key,prev);
   }
   return [...m.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'fr')).slice(0,10);
 };
 const topSearch=counts(searches,x=>x.metadata?.query||'');
 const topViews=counts(views,x=>x.metadata?.lesson_name||lessons.find(l=>String(l.id)===String(x.entity_id))?.name||('Fiche '+x.entity_id));

 const rankHtml=arr=>arr.length?arr.map((x,i)=>'<div class="adminRankItem"><span class="adminRankPos">'+(i+1)+'</span><span class="adminRankLabel">'+esc(x.label)+'</span><strong>'+x.count+'</strong></div>').join(''):'<div class="small">Pas encore assez de données.</div>';
 searchBox.innerHTML=rankHtml(topSearch);
 lessonBox.innerHTML=rankHtml(topViews);

 const lastSearch=searches[0],lastView=views[0],topS=topSearch[0],topV=topViews[0];
 const rows=[];
 if(topS)rows.push('<div><b>Recherche dominante</b><span>« '+esc(topS.label)+' » · '+topS.count+' recherche'+(topS.count>1?'s':'')+' sur 30 jours</span></div>');
 if(topV)rows.push('<div><b>Fiche la plus consultée</b><span>'+esc(topV.label)+' · '+topV.count+' consultation'+(topV.count>1?'s':'')+' sur 30 jours</span></div>');
 if(lastSearch)rows.push('<div><b>Dernière recherche</b><span>« '+esc(lastSearch.metadata?.query||'')+' » · '+esc(new Date(lastSearch.created_at).toLocaleString('fr-FR'))+'</span></div>');
 if(lastView)rows.push('<div><b>Dernière consultation</b><span>'+esc(lastView.metadata?.lesson_name||('Fiche '+lastView.entity_id))+' · '+esc(new Date(lastView.created_at).toLocaleString('fr-FR'))+'</span></div>');
 highlights.innerHTML=rows.join('')||'<div class="small">Les tendances apparaîtront dès que des recherches et consultations auront été enregistrées.</div>';
}

async function changeRole(userId,role){
 if(!isAdmin())return;
 const target=adminUsers.find(u=>u.user_id===userId);
 if(userId===session.user.id&&role!=='admin'&&!confirm('Tu es sur le point de retirer tes propres droits administrateur. Continuer ?')){renderAdmin();return}
 const {error}=await sb.from('profiles').update({role}).eq('user_id',userId);
 if(error){toast(error.message);await loadAdmin();return}
 toast('Rôle de '+(target?.display_name||target?.email||userId)+' mis à jour.');
 await loadAdmin()
}
async function deleteArizonaUser(userId){
 if(!isAdmin())return;
 const target=adminUsers.find(u=>u.user_id===userId);
 if(!target)return;
 if(!confirm('Supprimer définitivement '+(target.display_name||'Utilisateur')+' ('+target.email+') ?\n\nSes favoris, progression et données personnelles associées seront supprimés.'))return;
 const {data,error}=await sb.functions.invoke('delete-arizona-user',{body:{user_id:userId}});
 if(error)return toast('Suppression impossible : '+error.message);
 if(data?.error)return toast('Suppression impossible : '+data.error);
 toast('Utilisateur supprimé.');
 await loadAdmin();
}
function renderNotifications(){
 const box=$('notificationsList'),badge=$('notificationBadge');
 if(!box||!badge)return;
 const unread=adminNotifications.filter(n=>!n.read_at).length;
 badge.textContent=String(unread);
 badge.classList.toggle('hidden',unread===0);
 box.innerHTML=adminNotifications.length?adminNotifications.map(n=>{const u=adminUsers.find(x=>x.email===n.email);const label=u?.display_name||n.email||'Utilisateur';return '<div class="card notificationItem '+(!n.read_at?'unread':'')+'"><div class="notificationDot"></div><div><div class="lessonTitle">'+esc(label)+'</div><div class="small">'+esc(n.message)+'</div><div class="lessonDesc">'+esc(new Date(n.created_at).toLocaleString('fr-FR'))+'</div></div></div>'}).join(''):'<div class="card cardPad small">Aucune notification de connexion Standard.</div>';
}
async function markNotificationsRead(silent=false){
 if(!isAdmin())return;
 const unread=adminNotifications.filter(n=>!n.read_at);
 const ids=unread.map(n=>n.id);
 if(!ids.length){if(!silent)toast('Aucune notification non lue.');return}
 const now=new Date().toISOString();
 const {error}=await sb.from('admin_notifications').update({read_at:now}).in('id',ids);
 if(error){if(!silent)toast(error.message);return}
 adminNotifications=adminNotifications.map(n=>ids.includes(n.id)?{...n,read_at:now}:n);
 renderNotifications();
 if(!silent)toast('Notifications marquées comme lues.');
}
function renderLogs(){
 const q=$('logSearch').value.trim().toLowerCase(),act=$('logAction').value;
 const rows=auditLogs.filter(l=>(!act||l.action===act)&&(!q||(String(l.actor_email||'')+' '+l.action+' '+l.entity_type+' '+String(l.entity_id||'')+' '+JSON.stringify(l.metadata||{})).toLowerCase().includes(q)));
 $('logsBody').innerHTML=rows.map(l=>{
   const dt=new Date(l.created_at);
   const date=dt.toLocaleDateString('fr-FR')+' '+dt.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
   const object=(l.entity_type||'')+(l.entity_id?' · '+l.entity_id:'');
   const details=JSON.stringify(l.metadata||{});
   const actor=adminUsers.find(u=>u.user_id===l.actor_user_id);const actorLabel=actor?.display_name||l.actor_email||'Système';
   return '<tr><td data-label="Date">'+esc(date)+'</td><td data-label="Utilisateur" class="logUser">'+esc(actorLabel)+'</td><td data-label="Action"><span class="roleBadge">'+esc(l.action)+'</span></td><td data-label="Objet" class="logObject">'+esc(object)+'</td><td data-label="Détails" class="logDetails" title="'+esc(details)+'">'+esc(details)+'</td></tr>'
 }).join('')
}
async function switchView(v){
 document.querySelectorAll('.view').forEach(e=>e.classList.add('hidden'));
 $('view-'+v).classList.remove('hidden');
 document.querySelectorAll('#appMenu [data-view]').forEach(e=>e.classList.toggle('active',e.dataset.view===v));
 if(['history','favorites','admin'].includes(v)&&typeof renderLessonLists==='function')renderLessonLists(v);
 if(v==='admin'&&isAdmin())await loadAdmin();
 if(typeof onArizonaViewChange==='function')await onArizonaViewChange(v);
 if(typeof onArizonaIntelligenceViewChange==='function')await onArizonaIntelligenceViewChange(v);
 if(typeof onEngineerViewChange==='function')onEngineerViewChange(v);
 if(typeof onArizonaV21ViewChange==='function')await onArizonaV21ViewChange(v);
 if(typeof onArizonaV215ViewChange==='function')await onArizonaV215ViewChange(v);
 if(typeof setMenuOpen==='function')setMenuOpen(false)
}
function switchAdmin(sub){
 document.querySelectorAll('.adminPane').forEach(e=>e.classList.add('hidden'));
 $('admin-'+sub).classList.remove('hidden');
 document.querySelectorAll('.adminSub').forEach(e=>e.classList.toggle('active',e.dataset.sub===sub));
 if(sub==='notifications') markNotificationsRead(true);
 if(sub==='dashboard') renderAdminAnalytics();
}
$('loginBtn').onclick=signIn;$('signupBtn').onclick=signUp;$('logoutBtn').onclick=logout;if($('togglePassword'))$('togglePassword').onchange=()=>{const p=$('password'),c=$('togglePassword'),s=c.closest('.passwordCheck')?.querySelector('span');p.type=c.checked?'text':'password';if(s)s.textContent=c.checked?'Masquer':'Afficher';};
if($('menuThemeBtn'))$('menuThemeBtn').onclick=()=>{const next=document.body.classList.contains('light')?'dark':'light';localStorage.setItem('az_theme',next);applyTheme()};
if($('userProfileBtn'))$('userProfileBtn').onclick=openProfileEditor;
if($('closeProfileModal'))$('closeProfileModal').onclick=()=>$('profileModal').classList.remove('open');
if($('saveProfileName'))$('saveProfileName').onclick=saveProfileDisplayName;
if($('profileDisplayName'))$('profileDisplayName').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();saveProfileDisplayName()}};
if($('profileModal'))$('profileModal').addEventListener('click',e=>{if(e.target===$('profileModal'))$('profileModal').classList.remove('open')});
$('openToday').onclick=()=>lessons[0]&&openLesson(Number(lessons[0].id));$('todayName').onclick=()=>lessons[0]&&openLesson(Number(lessons[0].id));if($('lessonsKpi'))$('lessonsKpi').onclick=()=>{switchView('history');setTimeout(()=>$('historySearch')?.focus(),80)};if($('favoritesKpi'))$('favoritesKpi').onclick=()=>switchView('favorites');$('closeLesson').onclick=()=>$('lessonModal').classList.remove('open');$('modalFav').onclick=()=>activeLesson&&toggleFavorite(Number(activeLesson.id));$('editLessonBtn').onclick=()=>activeLesson&&openEdit(Number(activeLesson.id));
$('historySearch').oninput=renderLessonLists;$('importBtn').onclick=importLesson;$('newLessonBtn').onclick=newLesson;$('closeEdit').onclick=()=>$('editModal').classList.remove('open');$('saveEdit').onclick=async()=>{if($('editId').value)await saveEdit();else{const status=$('v20DataStatus')?.value||'draft';const payload={lesson_date:$('editDate').value,name:$('editName').value.trim(),symbol:$('editSymbol').value.trim(),raw_text:$('editRaw').value.trim(),image_urls:$('editImages').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),structured_data:typeof collectStructuredDataV20==='function'?collectStructuredDataV20():{},data_status:status,last_verified_at:status==='verified'?new Date().toISOString():null,created_by:session.user.id,updated_by:session.user.id};const {error}=await sb.from('arizona_lessons').insert(payload);if(error)return toast(error.message);$('editModal').classList.remove('open');await loadLessons();if(typeof loadArizonaV20==='function')await loadArizonaV20();renderAll();await loadAdmin();toast('Fiche créée.')}};$('deleteLesson').onclick=deleteLesson;
if($('markNotificationsRead'))$('markNotificationsRead').onclick=()=>markNotificationsRead(false);if($('refreshAdminAnalytics'))$('refreshAdminAnalytics').onclick=async()=>{await loadAdmin();toast('Statistiques actualisées.');};$('logSearch').oninput=renderLogs;$('logAction').onchange=renderLogs;document.querySelectorAll('#appMenu [data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));document.querySelectorAll('.backTodayBtn').forEach(b=>b.onclick=()=>switchView('home'));document.querySelectorAll('.adminSub').forEach(b=>b.onclick=()=>switchAdmin(b.dataset.sub));
$('lessonModal').addEventListener('click',e=>{if(e.target===$('lessonModal'))$('lessonModal').classList.remove('open')});$('editModal').addEventListener('click',e=>{if(e.target===$('editModal'))$('editModal').classList.remove('open')});
(async()=>{
 applyTheme();
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
 const {data}=await sb.auth.getSession();session=data.session;if(session){try{await enterApp()}catch(e){console.error(e);$('authMsg').textContent='Erreur de chargement : '+e.message;$('loginView').classList.remove('hidden');$('appView').classList.add('hidden')}}else{$('loginView').classList.remove('hidden')}
 sb.auth.onAuthStateChange((_event,s)=>{session=s})
})();

// --- Synchronisation automatique + raccourcis administrateur ---
async function refreshArizona(showToast=false){
  if(!session)return;
  const view=typeof currentViewV217==='function'?currentViewV217():'home';
  const token=typeof beginLoading==='function'?beginLoading(showToast?'Synchronisation ARIZONA…':'Synchronisation…',{soft:!showToast,delay:showToast?0:260,subtitle:'Mise à jour des données utiles à l’écran actuel.'}):null;
  try{
    setSync('Synchronisation…',false);
    const before=lessons.length?String(lessons[0].updated_at||'')+'|'+String(lessons[0].id||''):'';
    if(typeof syncCoreV217==='function')await syncCoreV217(true);
    else await Promise.all([loadLessons(),loadFavorites(),loadProgress()]);
    if((view==='madagascar'||view==='knowledge')&&typeof loadArizonaV21==='function')await loadArizonaV21(true);
    if(view==='projects'&&typeof loadArizonaV215==='function')await loadArizonaV215(true);
    if(view==='admin'&&isAdmin())await loadAdmin();
    if(view==='history'||view==='favorites'||view==='admin')renderLessonLists(view);
    const after=lessons.length?String(lessons[0].updated_at||'')+'|'+String(lessons[0].id||''):'';
    setSync('Synchronisé',true);
    if(showToast)toast(before!==after?'Nouvelles données récupérées.':'ARIZONA est à jour.');
  }catch(e){
    console.error(e);setSync('Erreur synchro',false);
    if(showToast)toast('Synchronisation impossible : '+e.message);
  }finally{if(token&&typeof endLoading==='function')endLoading(token)}
}

if($('refreshBtn')) $('refreshBtn').onclick=()=>refreshArizona(true);

if($('quickImportBtn')) $('quickImportBtn').onclick=()=>{
  if(!isAdmin()) return;
  switchView('admin');
  switchAdmin('lessons');
  setTimeout(()=>{
    const el=$('importText');
    if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); el.focus(); }
  },80);
};

// Vérifie le cloud automatiquement : utile si la fiche quotidienne arrive pendant que l'app est déjà ouverte.
setInterval(()=>{if(session)refreshArizona(false)},300000);
function refreshOnReturnV217(){
  if(!session)return;
  const stale=typeof azLastCoreRefresh!=='undefined'?Date.now()-azLastCoreRefresh>90000:true;
  if(stale)refreshArizona(false);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshOnReturnV217()});
window.addEventListener('focus',refreshOnReturnV217);


// --- Menu latéral compact ARIZONA ---
function setMenuOpen(open){
  const panel=$('appMenu'),backdrop=$('menuBackdrop'),brandBtn=$('brandMenuBtn');
  if(!panel||!backdrop) return;
  panel.classList.toggle('open',open);
  backdrop.classList.toggle('open',open);
  panel.setAttribute('aria-hidden',String(!open));
  backdrop.setAttribute('aria-hidden',String(!open));
  if(brandBtn) brandBtn.setAttribute('aria-expanded',String(open));
  document.body.classList.toggle('menuOpen',open);
}
if($('brandMenuBtn')) $('brandMenuBtn').onclick=()=>setMenuOpen(!$('appMenu').classList.contains('open'));
if($('closeMenuBtn')) $('closeMenuBtn').onclick=()=>setMenuOpen(false);
if($('menuBackdrop')) $('menuBackdrop').onclick=()=>setMenuOpen(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape')setMenuOpen(false)});
