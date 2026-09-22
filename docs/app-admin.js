let adminNotifications=[];
async function importLesson(){
 if(!isAdmin())return toast('Action réservée à l’administrateur.');
 try{
  const parsed=parseImport($('importText').value);if(!parsed.raw_text)throw new Error('Fiche vide.');
  const existing=lessons.find(l=>l.lesson_date===parsed.lesson_date&&l.name.toLowerCase()===parsed.name.toLowerCase());
  let res;
  if(existing)res=await sb.from('arizona_lessons').update({...parsed,updated_by:session.user.id,updated_at:new Date().toISOString()}).eq('id',existing.id);
  else res=await sb.from('arizona_lessons').insert({...parsed,created_by:session.user.id,updated_by:session.user.id});
  if(res.error)throw res.error;
  $('importText').value='';$('importMsg').textContent='Fiche publiée.';await loadLessons();renderAll();await loadAdmin();toast('Fiche synchronisée sur tous les appareils.')
 }catch(e){$('importMsg').textContent=e.message}
}
function openEdit(id){
 if(!isAdmin())return;const l=lessons.find(x=>Number(x.id)===Number(id));if(!l)return;
 $('editId').value=l.id;$('editDate').value=l.lesson_date;$('editName').value=l.name;$('editSymbol').value=compactSymbol(l);$('editImages').value=(l.image_urls||[]).join('\n');$('editRaw').value=l.raw_text;$('editModal').classList.add('open')
}
async function saveEdit(){
 if(!isAdmin())return;const id=Number($('editId').value);const payload={lesson_date:$('editDate').value,name:$('editName').value.trim(),symbol:$('editSymbol').value.trim(),raw_text:$('editRaw').value.trim(),image_urls:$('editImages').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),updated_by:session.user.id,updated_at:new Date().toISOString()};
 const {error}=await sb.from('arizona_lessons').update(payload).eq('id',id);if(error)return toast(error.message);$('editModal').classList.remove('open');await loadLessons();renderAll();await loadAdmin();toast('Fiche modifiée.')
}
async function deleteLesson(){
 if(!isAdmin())return;const id=Number($('editId').value),l=lessons.find(x=>Number(x.id)===id);if(!confirm('Supprimer définitivement la fiche '+(l?.name||'')+' ?'))return;
 const {error}=await sb.from('arizona_lessons').delete().eq('id',id);if(error)return toast(error.message);$('editModal').classList.remove('open');await loadLessons();renderAll();await loadAdmin();toast('Fiche supprimée.')
}
function newLesson(){
 const today=new Date().toISOString().slice(0,10);$('editId').value='';$('editDate').value=today;$('editName').value='';$('editSymbol').value='';$('editImages').value='';$('editRaw').value=today+'\n\nNOM DU MINÉRAL\n\nRÉSUMÉ EXÉCUTIF\n\nCARACTÉRISTIQUES CHIMIQUES\nFormule :\nSymbole :\nClasse :\nNuméro atomique :\nComposition :\nÉléments associés / impuretés :\nSystème cristallin :\nValence / états d’oxydation :\nRéactivité :\nAutres propriétés chimiques importantes :\n\nCARACTÉRISTIQUES PHYSIQUES\nCouleur :\nÉclat :\nDureté (Mohs) :\nDensité :\nTrait :\nClivage :\nFracture :\nTénacité :\nMagnétisme :\nConductivité :\nPoint de fusion :\nAutres :'; $('editModal').classList.add('open')
}
async function loadAdmin(){
 if(!isAdmin())return;
 const [{data:users,error:uerr},{data:acts,error:aerr},{data:logs,error:lerr},{data:notifs,error:nerr}]=await Promise.all([
   sb.from('profiles').select('*').order('created_at',{ascending:true}),
   sb.from('user_activity').select('*'),
   sb.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(500),
   sb.from('admin_notifications').select('*').order('created_at',{ascending:false}).limit(100)
 ]);
 if(uerr||aerr||lerr||nerr){console.warn(uerr||aerr||lerr||nerr);return}
 const amap=new Map((acts||[]).map(a=>[a.user_id,a.last_seen_at]));
 adminUsers=(users||[]).map(u=>({...u,last_seen_at:amap.get(u.user_id)||null}));
 auditLogs=logs||[];
 adminNotifications=notifs||[];
 renderAdmin()
}
function renderAdmin(){
 $('adminUsers').textContent=adminUsers.length;
 $('adminLessons').textContent=lessons.length;
 $('adminImports').textContent=auditLogs.filter(x=>['import','create'].includes(x.action)).length;
 $('adminRecent').textContent=auditLogs.filter(x=>Date.now()-new Date(x.created_at).getTime()<7*864e5).length;

 $('usersBody').innerHTML=adminUsers.map(u=>{
   const self=u.user_id===session.user.id;
   return '<tr><td>'+esc(u.email)+'</td><td style="font-family:monospace">'+esc(u.user_id)+'</td><td><select class="select roleSelect" data-user="'+u.user_id+'" style="min-width:140px"><option value="standard"'+(u.role==='standard'?' selected':'')+'>Standard</option><option value="admin"'+(u.role==='admin'?' selected':'')+'>Administrateur</option></select></td><td>'+esc(new Date(u.created_at).toLocaleString('fr-FR'))+'</td><td>'+(u.last_seen_at?esc(new Date(u.last_seen_at).toLocaleString('fr-FR')):'—')+'</td><td><button class="btn danger deleteUserBtn" data-delete-user="'+u.user_id+'" '+(self?'disabled title="Impossible de supprimer votre propre compte"':'')+'>Supprimer</button></td></tr>'
 }).join('');

 document.querySelectorAll('.roleSelect').forEach(s=>s.onchange=()=>changeRole(s.dataset.user,s.value));
 document.querySelectorAll('.deleteUserBtn:not([disabled])').forEach(b=>b.onclick=()=>deleteArizonaUser(b.dataset.deleteUser));
 renderNotifications();
 renderLogs()
}
async function changeRole(userId,role){
 if(!isAdmin())return;
 const target=adminUsers.find(u=>u.user_id===userId);
 if(userId===session.user.id&&role!=='admin'&&!confirm('Tu es sur le point de retirer tes propres droits administrateur. Continuer ?')){renderAdmin();return}
 const {error}=await sb.from('profiles').update({role}).eq('user_id',userId);
 if(error){toast(error.message);await loadAdmin();return}
 toast('Rôle de '+(target?.email||userId)+' mis à jour.');
 await loadAdmin()
}
async function deleteArizonaUser(userId){
 if(!isAdmin())return;
 const target=adminUsers.find(u=>u.user_id===userId);
 if(!target)return;
 if(!confirm('Supprimer définitivement le compte '+target.email+' ?\n\nSes favoris, progression et données personnelles associées seront supprimés.'))return;
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
 box.innerHTML=adminNotifications.length?adminNotifications.map(n=>'<div class="card notificationItem '+(!n.read_at?'unread':'')+'"><div class="notificationDot"></div><div><div class="lessonTitle">'+esc(n.email||'Utilisateur Standard')+'</div><div class="small">'+esc(n.message)+'</div><div class="lessonDesc">'+esc(new Date(n.created_at).toLocaleString('fr-FR'))+'</div></div></div>').join(''):'<div class="card cardPad small">Aucune notification de connexion Standard.</div>';
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
 const q=$('logSearch').value.trim().toLowerCase(),act=$('logAction').value;const rows=auditLogs.filter(l=>(!act||l.action===act)&&(!q||(String(l.actor_email||'')+' '+l.action+' '+l.entity_type+' '+String(l.entity_id||'')+' '+JSON.stringify(l.metadata||{})).toLowerCase().includes(q)));
 $('logsBody').innerHTML=rows.map(l=>'<tr><td>'+esc(new Date(l.created_at).toLocaleString('fr-FR'))+'</td><td>'+esc(l.actor_email||'Système')+'</td><td><span class="roleBadge">'+esc(l.action)+'</span></td><td>'+esc(l.entity_type)+' '+esc(l.entity_id||'')+'</td><td>'+esc(JSON.stringify(l.metadata||{}))+'</td></tr>').join('')
}
function switchView(v){
 document.querySelectorAll('.view').forEach(e=>e.classList.add('hidden'));$('view-'+v).classList.remove('hidden');document.querySelectorAll('#mainTabs .tab').forEach(e=>e.classList.toggle('active',e.dataset.view===v));if(v==='admin'&&isAdmin())loadAdmin();if(typeof setMenuOpen==='function')setMenuOpen(false)
}
function switchAdmin(sub){
 document.querySelectorAll('.adminPane').forEach(e=>e.classList.add('hidden'));
 $('admin-'+sub).classList.remove('hidden');
 document.querySelectorAll('.adminSub').forEach(e=>e.classList.toggle('active',e.dataset.sub===sub));
 if(sub==='notifications') markNotificationsRead(true);
}
$('loginBtn').onclick=signIn;$('signupBtn').onclick=signUp;$('logoutBtn').onclick=logout;if($('togglePassword'))$('togglePassword').onchange=()=>{const p=$('password'),c=$('togglePassword');p.type=c.checked?'text':'password';};
$('themeBtn').onclick=()=>{const next=document.body.classList.contains('light')?'dark':'light';localStorage.setItem('az_theme',next);applyTheme()};
$('openToday').onclick=()=>lessons[0]&&openLesson(Number(lessons[0].id));$('todayName').onclick=()=>lessons[0]&&openLesson(Number(lessons[0].id));if($('lessonsKpi'))$('lessonsKpi').onclick=()=>{switchView('history');setTimeout(()=>$('historySearch')?.focus(),80)};if($('favoritesKpi'))$('favoritesKpi').onclick=()=>switchView('favorites');$('closeLesson').onclick=()=>$('lessonModal').classList.remove('open');$('modalFav').onclick=()=>activeLesson&&toggleFavorite(Number(activeLesson.id));$('editLessonBtn').onclick=()=>activeLesson&&openEdit(Number(activeLesson.id));
$('historySearch').oninput=renderLessonLists;$('importBtn').onclick=importLesson;$('newLessonBtn').onclick=newLesson;$('closeEdit').onclick=()=>$('editModal').classList.remove('open');$('saveEdit').onclick=async()=>{if($('editId').value)await saveEdit();else{const payload={lesson_date:$('editDate').value,name:$('editName').value.trim(),symbol:$('editSymbol').value.trim(),raw_text:$('editRaw').value.trim(),image_urls:$('editImages').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),created_by:session.user.id,updated_by:session.user.id};const {error}=await sb.from('arizona_lessons').insert(payload);if(error)return toast(error.message);$('editModal').classList.remove('open');await loadLessons();renderAll();await loadAdmin();toast('Fiche créée.')}};$('deleteLesson').onclick=deleteLesson;
if($('markNotificationsRead'))$('markNotificationsRead').onclick=()=>markNotificationsRead(false);$('logSearch').oninput=renderLogs;$('logAction').onchange=renderLogs;document.querySelectorAll('#mainTabs .tab').forEach(b=>b.onclick=()=>switchView(b.dataset.view));document.querySelectorAll('.backTodayBtn').forEach(b=>b.onclick=()=>switchView('home'));document.querySelectorAll('.adminSub').forEach(b=>b.onclick=()=>switchAdmin(b.dataset.sub));
$('lessonModal').addEventListener('click',e=>{if(e.target===$('lessonModal'))$('lessonModal').classList.remove('open')});$('editModal').addEventListener('click',e=>{if(e.target===$('editModal'))$('editModal').classList.remove('open')});
(async()=>{
 applyTheme();
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
 const {data}=await sb.auth.getSession();session=data.session;if(session){try{await enterApp()}catch(e){console.error(e);$('authMsg').textContent='Erreur de chargement : '+e.message;$('loginView').classList.remove('hidden');$('appView').classList.add('hidden')}}else{$('loginView').classList.remove('hidden')}
 sb.auth.onAuthStateChange((_event,s)=>{session=s})
})();

// --- Synchronisation automatique + raccourcis administrateur ---
async function refreshArizona(showToast=false){
  if(!session) return;
  try{
    setSync('Synchronisation…',false);
    const before=lessons.length ? String(lessons[0].lesson_date)+'|'+String(lessons[0].name) : '';
    await Promise.all([loadLessons(),loadFavorites(),loadProgress()]);
    renderAll();
    if(isAdmin()) await loadAdmin();
    const after=lessons.length ? String(lessons[0].lesson_date)+'|'+String(lessons[0].name) : '';
    setSync('Synchronisé',true);
    if(showToast) toast(before!==after ? 'Nouvelle fiche récupérée.' : 'ARIZONA est à jour.');
  }catch(e){
    console.error(e);
    setSync('Erreur synchro',false);
    if(showToast) toast('Synchronisation impossible : '+e.message);
  }
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
setInterval(()=>{ if(session) refreshArizona(false); }, 60000);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden && session) refreshArizona(false); });
window.addEventListener('focus',()=>{ if(session) refreshArizona(false); });


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
