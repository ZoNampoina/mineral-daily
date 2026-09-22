const SUPABASE_URL="https://uhuxkkiqpzcfefjkjwqn.supabase.co";
const SUPABASE_KEY=atob("c2JfcHVibGlzaGFibGVfOXdMa0dGRWZZN3pvQU9Ia3I4aDc5QV9WWWF3ejZlag==");
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
let session=null, profile=null, lessons=[], favorites=new Set(), progress=new Map(), activeLesson=null, adminUsers=[], auditLogs=[];
const HEADINGS=['NOM DU MINÉRAL','RÉSUMÉ EXÉCUTIF','CARACTÉRISTIQUES CHIMIQUES','CARACTÉRISTIQUES PHYSIQUES','GÉOLOGIE ET GENÈSE','ZONES MONDIALES','MADAGASCAR','EXPLOITATION','TRAITEMENT / MINÉRALURGIE','USAGES','MARCHÉ INTERNATIONAL','CONVERSION ARIARY','PRODUCTION ANNUELLE','ÉCONOMIE','ENVIRONNEMENT','GÉOPOLITIQUE','À RETENIR','VOCABULAIRE','CAS CONCRET','MINI-CAS PRATIQUE','ERREUR FRÉQUENTE','QUIZ'];
const SECTION_LABELS={
 'CARACTÉRISTIQUES CHIMIQUES':'Caractéristiques chimiques','CARACTÉRISTIQUES PHYSIQUES':'Caractéristiques physiques','GÉOLOGIE ET GENÈSE':'Géologie et genèse','ZONES MONDIALES':'Zones mondiales','MADAGASCAR':'Madagascar','EXPLOITATION':'Exploitation','TRAITEMENT / MINÉRALURGIE':'Traitement / minéralurgie','USAGES':'Usages','MARCHÉ INTERNATIONAL':'Marché international','CONVERSION ARIARY':'Conversion ariary','PRODUCTION ANNUELLE':'Production annuelle','ÉCONOMIE':'Économie','ENVIRONNEMENT':'Environnement','GÉOPOLITIQUE':'Géopolitique','À RETENIR':'À retenir','VOCABULAIRE':'Vocabulaire','CAS CONCRET':'Cas concret','MINI-CAS PRATIQUE':'Mini-cas pratique','ERREUR FRÉQUENTE':'Erreur fréquente'
};
const IMG_QUERY={'Or':'native gold mineral specimen','Cobalt':'cobaltite mineral specimen','Nickel':'pentlandite mineral specimen','Étain':'cassiterite mineral specimen','Etain':'cassiterite mineral specimen','Graphite':'graphite mineral specimen'};

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function toast(msg){const e=$('toast');e.textContent=msg;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),3200)}
function isAdmin(){return profile?.role==='admin'}
function formatDate(d){try{return new Intl.DateTimeFormat('fr-FR',{dateStyle:'long'}).format(new Date(d+'T12:00:00'))}catch{return d}}
function section(text,h){text=String(text||'');const i=HEADINGS.indexOf(h),start=text.indexOf(h);if(start<0)return'';let end=text.length;for(let j=i+1;j<HEADINGS.length;j++){const p=text.indexOf(HEADINGS[j],start+h.length);if(p>=0){end=p;break}}return text.slice(start+h.length,end).trim()}
function kv(text){const out={};String(text||'').split(/\r?\n/).forEach(line=>{const m=line.match(/^([^:]+)\s*:\s*(.+)$/);if(m)out[m[1].trim()]=m[2].trim()});return out}
function compactSymbol(l){const c=kv(section(l.raw_text,'CARACTÉRISTIQUES CHIMIQUES'));let s=String(c['Symbole']||l.symbol||c['Formule']||'').trim();if(s.length>10||/\s/.test(s)){const m=s.match(/^[A-Z][a-z]?/);s=c['Symbole']||(m?m[0]:'M')}return s||'M'}
function parseFrenchDate(text){
 const months={janvier:1,'février':2,fevrier:2,mars:3,avril:4,mai:5,juin:6,juillet:7,'août':8,aout:8,septembre:9,octobre:10,novembre:11,'décembre':12,decembre:12};
 for(const line of String(text||'').split(/\r?\n/).slice(0,8)){let m=line.toLowerCase().match(/\b(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})\b/);if(m)return m[3]+'-'+String(months[m[2]]).padStart(2,'0')+'-'+String(+m[1]).padStart(2,'0');m=line.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);if(m)return m[1]+'-'+m[2]+'-'+m[3]}
 return new Date().toISOString().slice(0,10)
}
function parseImport(text){
 const name=section(text,'NOM DU MINÉRAL').split(/\r?\n/)[0]?.trim();
 if(!name)throw new Error('Le titre NOM DU MINÉRAL ou le nom est introuvable.');
 const c=kv(section(text,'CARACTÉRISTIQUES CHIMIQUES'));
 return {lesson_date:parseFrenchDate(text),name,symbol:(c['Symbole']||c['Formule']||'').slice(0,12),raw_text:text.trim()}
}
function parseQuiz(raw){
 const q=section(raw,'QUIZ'); if(!q)return[];
 const chunks=q.split(/\n(?=Q\d+\s*:)/g).filter(x=>/^Q\d+\s*:/.test(x.trim()));
 return chunks.map(ch=>{
   const qm=ch.match(/^Q\d+\s*:\s*(.+)$/m); const answer=ch.match(/Réponse\s*:\s*([A-D])/i)?.[1]?.toUpperCase();
   const explanation=ch.match(/Explication\s*:\s*([\s\S]*?)(?=\nQ\d+\s*:|$)/i)?.[1]?.trim()||'';
   const options={}; [...ch.matchAll(/^([A-D])\)\s*(.+)$/gm)].forEach(m=>options[m[1]]=m[2].trim());
   return {question:qm?.[1]?.trim()||'',options,answer,explanation};
 }).filter(x=>x.question&&x.answer);
}
async function imageSearch(name,limit=4){
 const cacheKey='az_img_'+name.toLowerCase();
 try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(cached?.length)return cached.slice(0,limit)}catch{}
 const q=encodeURIComponent(IMG_QUERY[name]||(name+' mineral specimen'));
 try{
   const u='https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch='+q+'&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url&iiurlwidth=1000&format=json&origin=*';
   const r=await fetch(u);const j=await r.json();const arr=Object.values(j.query?.pages||{}).map(p=>p.imageinfo?.[0]?.thumburl||p.imageinfo?.[0]?.url).filter(Boolean).slice(0,limit);
   if(arr.length)localStorage.setItem(cacheKey,JSON.stringify(arr));return arr
 }catch(e){return[]}
}
async function getImages(l,limit=4){if(Array.isArray(l.image_urls)&&l.image_urls.length)return l.image_urls.slice(0,limit);return imageSearch(l.name,limit)}
async function fillGallery(id,l){const box=$(id);box.innerHTML='<div class="small">Chargement des images réelles…</div>';const urls=await getImages(l,4);box.innerHTML=urls.length?urls.map(u=>'<img src="'+esc(u)+'" loading="lazy" referrerpolicy="no-referrer" alt="'+esc(l.name)+'">').join(''):'<div class="card cardPad small">Aucune image disponible pour le moment.</div>'}
async function thumbFor(img,l){const urls=await getImages(l,1);if(urls[0]){img.src=urls[0];img.classList.remove('thumbFallback');img.textContent=''}}

async function signUp(){
 const email=$('email').value.trim(),password=$('password').value;
 if(!email||password.length<6){$('authMsg').textContent='Entre un e-mail valide et un mot de passe de 6 caractères minimum.';return}
 $('authMsg').textContent='Création du compte…';
 const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:location.href.split('#')[0]}});
 if(error){$('authMsg').textContent=error.message;return}
 if(data.session){session=data.session;await enterApp()}else $('authMsg').textContent='Compte créé. Confirme l’e-mail reçu, puis reviens ici et connecte-toi.'
}
async function signIn(){
 const {data,error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
 if(error){$('authMsg').textContent=error.message;return}
 session=data.session;await enterApp()
}
async function logout(){await sb.auth.signOut();location.reload()}
async function enterApp(){
 $('loginView').classList.add('hidden');$('appView').classList.remove('hidden');setSync('Synchronisation…',false);
 await loadProfile();
 await Promise.all([loadLessons(),loadFavorites(),loadProgress()]);
 await touchActivity();
 await recordLogin();
 renderAll();
 if(isAdmin())await loadAdmin();
 setSync('Synchronisé',true);
}
function setSync(t,ok){
 const el=$('syncStatus');if(!el)return;
 const label=String(t||'Synchronisation');
 const isError=!ok && /(erreur|impossible|non synchron)/i.test(label);
 const state=ok?'synced':(isError?'error':'syncing');
 el.textContent='';
 el.className='status syncMini '+state;
 el.title=label;
 el.setAttribute('aria-label',label);
}
async function loadProfile(){
 for(let i=0;i<8;i++){
   const {data,error}=await sb.from('profiles').select('*').eq('user_id',session.user.id).maybeSingle();
   if(data){profile=data;break}
   if(error)console.warn(error);await new Promise(r=>setTimeout(r,350));
 }
 if(!profile)throw new Error('Profil utilisateur non initialisé.');
 $('roleBadge').textContent=profile.role==='admin'?'Administrateur':'Standard';
 document.querySelectorAll('.adminOnly').forEach(e=>e.classList.toggle('hidden',!isAdmin()));
}
async function touchActivity(){await sb.from('user_activity').upsert({user_id:session.user.id,last_seen_at:new Date().toISOString()},{onConflict:'user_id'})}
async function recordLogin(){await sb.from('audit_logs').insert({actor_user_id:session.user.id,action:'login',entity_type:'session',entity_id:session.user.id,metadata:{user_agent:navigator.userAgent.slice(0,180)}})}
async function loadLessons(){const {data,error}=await sb.from('arizona_lessons').select('*').order('lesson_date',{ascending:false}).order('id',{ascending:false});if(error)throw error;lessons=data||[]}
async function loadFavorites(){const {data,error}=await sb.from('user_favorites').select('lesson_id').eq('user_id',session.user.id);if(error)throw error;favorites=new Set((data||[]).map(x=>Number(x.lesson_id)))}
async function loadProgress(){const {data,error}=await sb.from('quiz_progress').select('*').eq('user_id',session.user.id);if(error)throw error;progress=new Map((data||[]).map(x=>[Number(x.lesson_id),x]))}

function renderAll(){applyTheme();renderHome();renderLessonLists();renderProgress()}
function applyTheme(){const theme=localStorage.getItem('az_theme')||'dark';document.body.classList.toggle('light',theme==='light');$('themeBtn').textContent=theme==='light'?'☾':'☼'}
function renderHome(){
 const l=lessons[0];$('countLessons').textContent=lessons.length;$('countFav').textContent=favorites.size;
 const scores=[...progress.values()].map(x=>Number(x.score||0));$('avgQuiz').textContent=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1)+'/3':'—';
 if(!l){$('todayName').textContent='Aucune fiche';$('todaySummary').textContent='Aucune fiche publiée.';return}
 $('todayName').textContent=l.name;$('todayDate').textContent=formatDate(l.lesson_date);$('todaySymbol').textContent=compactSymbol(l);$('todaySummary').textContent=section(l.raw_text,'RÉSUMÉ EXÉCUTIF');
 fillGallery('homeGallery',l)
}
function lessonCard(l,admin=false){
 const fav=favorites.has(Number(l.id));
 return '<div class="card lessonCard" data-card-id="'+l.id+'"><div class="thumb thumbFallback" data-thumb="'+l.id+'">'+esc(compactSymbol(l))+'</div><div class="lessonMain"><div class="lessonTitle">'+esc(l.name)+' <span class="roleBadge">'+esc(compactSymbol(l))+'</span></div><div class="lessonDesc">'+esc(formatDate(l.lesson_date))+'</div><div class="lessonSummary">'+esc(section(l.raw_text,'RÉSUMÉ EXÉCUTIF'))+'</div></div><div class="lessonActions"><button class="btn favToggle" data-fav="'+l.id+'" title="Favori">'+(fav?'★':'☆')+'</button><button class="btn openLesson" data-open="'+l.id+'">Ouvrir</button>'+(admin?'<button class="btn editLesson" data-edit="'+l.id+'">Modifier</button>':'')+'</div></div>'
}
function renderLessonLists(){
 const q=$('historySearch').value.trim().toLowerCase();const filtered=lessons.filter(l=>!q||l.name.toLowerCase().includes(q)||l.raw_text.toLowerCase().includes(q));
 $('historyList').innerHTML=filtered.map(l=>lessonCard(l)).join('')||'<div class="card cardPad small">Aucun résultat.</div>';
 const favs=lessons.filter(l=>favorites.has(Number(l.id)));$('favoritesList').innerHTML=favs.map(l=>lessonCard(l)).join('')||'<div class="card cardPad small">Aucun favori pour le moment.</div>';
 if(isAdmin())$('adminLessonsList').innerHTML=lessons.map(l=>lessonCard(l,true)).join('');
 wireLessonCards();
}
function wireLessonCards(){
 document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openLesson(Number(b.dataset.open)));
 document.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>toggleFavorite(Number(b.dataset.fav)));
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEdit(Number(b.dataset.edit)));
 document.querySelectorAll('[data-thumb]').forEach(async el=>{const l=lessons.find(x=>Number(x.id)===Number(el.dataset.thumb));const urls=await getImages(l,1);if(urls[0]){const img=document.createElement('img');img.className='thumb';img.src=urls[0];img.loading='lazy';img.referrerPolicy='no-referrer';el.replaceWith(img)}})
}
async function toggleFavorite(id){
 if(favorites.has(id)){const {error}=await sb.from('user_favorites').delete().eq('user_id',session.user.id).eq('lesson_id',id);if(error)return toast(error.message);favorites.delete(id)}
 else{const {error}=await sb.from('user_favorites').insert({user_id:session.user.id,lesson_id:id});if(error)return toast(error.message);favorites.add(id)}
 renderAll();if(activeLesson?.id===id)$('modalFav').textContent=favorites.has(id)?'★':'☆'
}
async function openLesson(id){
 const l=lessons.find(x=>Number(x.id)===Number(id));if(!l)return;activeLesson=l;$('lessonModal').classList.add('open');
 $('modalName').textContent=l.name+' · '+compactSymbol(l);$('modalDate').textContent=formatDate(l.lesson_date);$('modalFav').textContent=favorites.has(Number(l.id))?'★':'☆';
 $('modalSummary').textContent=section(l.raw_text,'RÉSUMÉ EXÉCUTIF');await fillGallery('modalGallery',l);renderDetails(l);renderQuiz(l)
}
function renderDetails(l){
 const raw=l.raw_text;let html='';
 for(const h of ['CARACTÉRISTIQUES CHIMIQUES','CARACTÉRISTIQUES PHYSIQUES']){
   const obj=kv(section(raw,h));const rows=Object.entries(obj).map(([k,v])=>'<div class="k">'+esc(k)+'</div><div class="v">'+esc(v)+'</div>').join('');
   html+='<details class="detailCard" open><summary>'+esc(SECTION_LABELS[h])+'</summary><div class="kv">'+(rows||'<div class="v">Non renseigné</div>')+'</div></details>'
 }
 for(const h of Object.keys(SECTION_LABELS).filter(x=>!['CARACTÉRISTIQUES CHIMIQUES','CARACTÉRISTIQUES PHYSIQUES'].includes(x))){
   const s=section(raw,h);html+='<details class="detailCard"><summary>'+esc(SECTION_LABELS[h])+'</summary><div class="detailBody">'+esc(s||'Non renseigné')+'</div></details>'
 }
 $('modalDetails').innerHTML=html
}
function setAllTechnicalDetails(open){
 document.querySelectorAll('#modalDetails details.detailCard').forEach(card=>{card.open=open});
}
if($('expandAllDetails')) $('expandAllDetails').onclick=()=>setAllTechnicalDetails(true);
if($('collapseAllDetails')) $('collapseAllDetails').onclick=()=>setAllTechnicalDetails(false);
function renderQuiz(l){
 const qs=parseQuiz(l.raw_text);if(!qs.length){$('modalQuiz').innerHTML='<div class="card cardPad small">Quiz non disponible.</div>';return}
 const prev=progress.get(Number(l.id));$('modalQuiz').innerHTML='<div class="card cardPad">'+qs.map((q,i)=>'<div class="quizQ"><b>Q'+(i+1)+'. '+esc(q.question)+'</b><div class="quizOpts">'+Object.entries(q.options).map(([k,v])=>'<label class="quizOpt"><input type="radio" name="q'+i+'" value="'+k+'"> <span><b>'+k+')</b> '+esc(v)+'</span></label>').join('')+'</div><div class="small quizFeedback" id="fb'+i+'"></div></div>').join('')+'<button id="submitQuiz" class="btn primary">Valider le quiz</button>'+(prev?'<span class="small" style="margin-left:8px">Meilleur score : '+prev.score+'/3</span>':'')+'</div>';
 $('submitQuiz').onclick=()=>submitQuiz(l,qs)
}
async function submitQuiz(l,qs){
 let score=0,answers={};qs.forEach((q,i)=>{const val=document.querySelector('input[name="q'+i+'"]:checked')?.value||'';answers[i]=val;if(val===q.answer)score++;const fb=$('fb'+i);fb.textContent=val?((val===q.answer?'✓ Correct':'✗ Réponse correcte : '+q.answer)+'. '+q.explanation):('Aucune réponse. '+q.explanation);fb.style.color=val===q.answer?'var(--green)':'var(--muted)'});
 const best=Math.max(score,Number(progress.get(Number(l.id))?.score||0));const {error}=await sb.from('quiz_progress').upsert({user_id:session.user.id,lesson_id:l.id,score:best,answers,updated_at:new Date().toISOString()},{onConflict:'user_id,lesson_id'});if(error)return toast(error.message);await loadProgress();renderProgress();toast('Quiz : '+score+'/'+qs.length)
}
function renderProgress(){
 const done=progress.size,total=lessons.filter(l=>parseQuiz(l.raw_text).length).length;const scores=[...progress.values()].map(x=>Number(x.score||0));const avg=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1):'—';
 $('progressSummary').textContent=done+' quiz réalisés sur '+total+'. Score moyen : '+avg+'/3.';
 $('progressList').innerHTML=lessons.map(l=>{const p=progress.get(Number(l.id));return '<div class="card lessonCard"><div class="badge">'+esc(compactSymbol(l))+'</div><div class="lessonMain"><div class="lessonTitle">'+esc(l.name)+'</div><div class="lessonDesc">'+(p?'Meilleur score : '+p.score+'/3':'Quiz non réalisé')+'</div></div><button class="btn" data-open="'+l.id+'">'+(p?'Revoir':'Commencer')+'</button></div>'}).join('');document.querySelectorAll('#progressList [data-open]').forEach(b=>b.onclick=()=>openLesson(Number(b.dataset.open)))
}