
let userNotes=new Map(), userCollections=[], userCollectionItems=[], reviewStats=new Map();

async function loadArizonaExtras(){
  if(!session)return;
  const [notesRes,colsRes,itemsRes,reviewRes]=await Promise.all([
    sb.from('user_notes').select('*').eq('user_id',session.user.id),
    sb.from('user_collections').select('*').eq('user_id',session.user.id).order('created_at',{ascending:true}),
    sb.from('user_collection_lessons').select('*').eq('user_id',session.user.id),
    sb.from('revision_stats').select('*').eq('user_id',session.user.id)
  ]);
  const err=notesRes.error||colsRes.error||itemsRes.error||reviewRes.error;
  if(err){console.warn('ARIZONA extras',err);return}

  userNotes=new Map((notesRes.data||[]).map(x=>[Number(x.lesson_id),x]));
  userCollections=colsRes.data||[];
  userCollectionItems=itemsRes.data||[];
  reviewStats=new Map((reviewRes.data||[]).map(x=>[Number(x.lesson_id),x]));

  if(!userCollections.length){
    const defaults=['À réviser','Madagascar','Minéraux critiques','Marché à surveiller'];
    const {error}=await sb.from('user_collections').insert(defaults.map(name=>({user_id:session.user.id,name})));
    if(!error){
      const {data}=await sb.from('user_collections').select('*').eq('user_id',session.user.id).order('created_at',{ascending:true});
      userCollections=data||[];
    }
  }
  renderExtras();
}

function renderExtras(){
  renderComparePicker();
  renderCollections();
  renderReviewDashboard();
  if(activeLesson)renderLessonExtras(activeLesson);
}

async function onArizonaViewChange(view){
  if(view==='compare')renderComparePicker();
  if(view==='collections')renderCollections();
  if(view==='review')renderReviewDashboard();
}

function renderLessonExtras(l){
  const note=$('personalNote'),status=$('noteStatus'),select=$('lessonCollectionSelect'),list=$('lessonCollections');
  if(note)note.value=userNotes.get(Number(l.id))?.note||'';
  if(status)status.textContent='';
  if(select){
    select.innerHTML=userCollections.length
      ? userCollections.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('')
      : '<option value="">Aucune collection</option>';
  }
  if(list){
    const ids=userCollectionItems.filter(x=>Number(x.lesson_id)===Number(l.id)).map(x=>Number(x.collection_id));
    const names=userCollections.filter(c=>ids.includes(Number(c.id))).map(c=>c.name);
    list.textContent=names.length?'Présent dans : '+names.join(' · '):'Aucune collection pour cette fiche.';
  }
}

async function saveLessonNote(){
  if(!activeLesson||!session)return;
  const value=$('personalNote').value.trim();
  if(!value){
    const {error}=await sb.from('user_notes').delete().eq('user_id',session.user.id).eq('lesson_id',activeLesson.id);
    if(error)return toast(error.message);
    userNotes.delete(Number(activeLesson.id));
    $('noteStatus').textContent='Note supprimée';
    return;
  }
  const payload={user_id:session.user.id,lesson_id:activeLesson.id,note:value,updated_at:new Date().toISOString()};
  const {data,error}=await sb.from('user_notes').upsert(payload,{onConflict:'user_id,lesson_id'}).select().single();
  if(error)return toast(error.message);
  userNotes.set(Number(activeLesson.id),data);
  $('noteStatus').textContent='Enregistré';
  toast('Note enregistrée.');
}

async function createCollection(){
  const input=$('newCollectionName'),name=input.value.trim();
  if(!name)return;
  const {error}=await sb.from('user_collections').insert({user_id:session.user.id,name});
  if(error)return toast(error.code==='23505'?'Cette collection existe déjà.':error.message);
  input.value='';
  await loadArizonaExtras();
  toast('Collection créée.');
}

async function addActiveLessonToCollection(){
  if(!activeLesson)return;
  const collectionId=Number($('lessonCollectionSelect').value);
  if(!collectionId)return;
  const exists=userCollectionItems.some(x=>Number(x.collection_id)===collectionId&&Number(x.lesson_id)===Number(activeLesson.id));
  if(exists)return toast('Cette fiche est déjà dans cette collection.');
  const {error}=await sb.from('user_collection_lessons').insert({collection_id:collectionId,user_id:session.user.id,lesson_id:activeLesson.id});
  if(error)return toast(error.message);
  await loadArizonaExtras();
  renderLessonExtras(activeLesson);
  toast('Ajouté à la collection.');
}

async function removeCollectionItem(collectionId,lessonId){
  const {error}=await sb.from('user_collection_lessons').delete().eq('user_id',session.user.id).eq('collection_id',collectionId).eq('lesson_id',lessonId);
  if(error)return toast(error.message);
  await loadArizonaExtras();
}

async function deleteCollection(id){
  const col=userCollections.find(c=>Number(c.id)===Number(id));
  if(!col||!confirm('Supprimer la collection « '+col.name+' » ?'))return;
  const {error}=await sb.from('user_collections').delete().eq('user_id',session.user.id).eq('id',id);
  if(error)return toast(error.message);
  await loadArizonaExtras();
}

function renderCollections(){
  const box=$('collectionsList');if(!box)return;
  if(!userCollections.length){box.innerHTML='<div class="card cardPad small">Aucune collection.</div>';return}
  box.innerHTML=userCollections.map(c=>{
    const items=userCollectionItems.filter(x=>Number(x.collection_id)===Number(c.id));
    const lessonRows=items.map(it=>{
      const l=lessons.find(x=>Number(x.id)===Number(it.lesson_id));if(!l)return'';
      return '<div class="collectionLesson" data-collection-open="'+l.id+'"><span><b>'+esc(l.name)+'</b> <small>'+esc(compactSymbol(l))+'</small></span><button class="plainIcon collectionRemove" data-col="'+c.id+'" data-lesson="'+l.id+'" title="Retirer">×</button></div>'
    }).join('');
    return '<div class="card collectionCard"><div class="collectionHead"><div><div class="lessonTitle">'+esc(c.name)+'</div><div class="small">'+items.length+' fiche'+(items.length>1?'s':'')+'</div></div><button class="plainIcon deleteCollection" data-collection="'+c.id+'" title="Supprimer la collection">✕</button></div><div class="collectionLessons">'+(lessonRows||'<div class="small">Collection vide.</div>')+'</div></div>'
  }).join('');

  box.querySelectorAll('[data-collection-open]').forEach(row=>row.onclick=e=>{if(e.target.closest('button'))return;openLesson(Number(row.dataset.collectionOpen))});
  box.querySelectorAll('.collectionRemove').forEach(b=>b.onclick=e=>{e.stopPropagation();removeCollectionItem(Number(b.dataset.col),Number(b.dataset.lesson))});
  box.querySelectorAll('.deleteCollection').forEach(b=>b.onclick=()=>deleteCollection(Number(b.dataset.collection)));
}

function renderComparePicker(){
  const box=$('comparePicker');if(!box)return;
  box.innerHTML=lessons.map(l=>'<label class="compareChoice"><input type="checkbox" class="compareCheck" value="'+l.id+'"><span><b>'+esc(l.name)+'</b><small>'+esc(compactSymbol(l))+'</small></span></label>').join('');
  box.querySelectorAll('.compareCheck').forEach(ch=>ch.onchange=()=>{
    const selected=[...box.querySelectorAll('.compareCheck:checked')];
    if(selected.length>4){ch.checked=false;toast('Maximum 4 minéraux à comparer.')}
  });
}

function compareValue(l,sectionName,key){
  return kv(section(l.raw_text,sectionName))[key]||'—';
}
function compareProduction2025(l){
  const s=section(l.raw_text,'PRODUCTION ANNUELLE');
  const m=s.match(/^2025\s*:\s*(.+)$/m);
  return m?m[1].trim():'—';
}
function compactText(v,n=130){v=String(v||'—').replace(/\s+/g,' ').trim();return v.length>n?v.slice(0,n-1)+'…':v}

async function runComparison(){
  const ids=[...document.querySelectorAll('#comparePicker .compareCheck:checked')].map(x=>Number(x.value));
  if(ids.length<2)return toast('Sélectionne au moins 2 minéraux.');
  if(typeof ensureLessonDetails==='function'){
    const load=()=>ensureLessonDetails(ids);
    if(typeof withLoading==='function')await withLoading('Chargement des minéraux…',load,{subtitle:'Préparation des données techniques pour la comparaison.'});
    else await load();
  }
  const ls=ids.map(id=>lessons.find(l=>Number(l.id)===id)).filter(Boolean);
  const rows=[
    ['Symbole',l=>compactSymbol(l)],
    ['Classe',l=>compareValue(l,'CARACTÉRISTIQUES CHIMIQUES','Classe')],
    ['Densité',l=>compareValue(l,'CARACTÉRISTIQUES PHYSIQUES','Densité')],
    ['Dureté (Mohs)',l=>compareValue(l,'CARACTÉRISTIQUES PHYSIQUES','Dureté (Mohs)')],
    ['Système cristallin',l=>compareValue(l,'CARACTÉRISTIQUES CHIMIQUES','Système cristallin')],
    ['Conductivité',l=>compareValue(l,'CARACTÉRISTIQUES PHYSIQUES','Conductivité')],
    ['Point de fusion',l=>compareValue(l,'CARACTÉRISTIQUES PHYSIQUES','Point de fusion')],
    ['Prix',l=>compareValue(l,'MARCHÉ INTERNATIONAL','Prix')],
    ['Unité prix',l=>compareValue(l,'MARCHÉ INTERNATIONAL','Unité')],
    ['Production 2025',l=>compareProduction2025(l)],
    ['Madagascar',l=>compactText(section(l.raw_text,'MADAGASCAR'),180)],
    ['Usage principal',l=>compactText(compareValue(l,'USAGES','Usage principal'),120)]
  ];
  $('compareResult').innerHTML='<div class="tableWrap compareTableWrap"><table class="compareTable"><thead><tr><th>Critère</th>'+ls.map(l=>'<th>'+esc(l.name)+'<small>'+esc(compactSymbol(l))+'</small></th>').join('')+'</tr></thead><tbody>'+rows.map(([name,fn])=>'<tr><th>'+esc(name)+'</th>'+ls.map(l=>'<td>'+esc(fn(l))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}

function masteryFor(l){
  const s=reviewStats.get(Number(l.id));
  return s?Number(s.mastery||0):0;
}
function renderReviewDashboard(){
  const summary=$('reviewSummary'),box=$('reviewMasteryList');if(!summary||!box)return;
  const quizLessons=lessons.filter(l=>typeof lessonHasQuizV217==='function'?lessonHasQuizV217(l):parseQuiz(l.raw_text).length);
  const reviewed=quizLessons.filter(l=>reviewStats.has(Number(l.id))).length;
  const avg=reviewed?Math.round(quizLessons.reduce((a,l)=>a+masteryFor(l),0)/quizLessons.length):0;
  summary.textContent=reviewed+' minéraux révisés sur '+quizLessons.length+' · maîtrise moyenne '+avg+' %.';
  box.innerHTML=quizLessons.map(l=>{
    const m=masteryFor(l);
    return '<div class="card masteryCard"><div class="badge">'+esc(compactSymbol(l))+'</div><div class="lessonMain"><div class="lessonTitle">'+esc(l.name)+'</div><div class="masteryTrack"><span style="width:'+m+'%"></span></div><div class="lessonDesc">Maîtrise</div></div><div class="masteryPercent" aria-label="'+m+' pour cent de maîtrise">'+m+'%</div><button class="plainIcon reviewOne" data-review="'+l.id+'" title="Réviser">▶</button></div>'
  }).join('');
  box.querySelectorAll('.reviewOne').forEach(b=>b.onclick=()=>startReview(Number(b.dataset.review)));
}

function chooseReviewLesson(){
  const quizLessons=lessons.filter(l=>typeof lessonHasQuizV217==='function'?lessonHasQuizV217(l):parseQuiz(l.raw_text).length);
  if(!quizLessons.length)return null;
  const now=Date.now();
  return [...quizLessons].sort((a,b)=>{
    const sa=reviewStats.get(Number(a.id)),sb=reviewStats.get(Number(b.id));
    const da=!sa?.next_review_at||new Date(sa.next_review_at).getTime()<=now?0:1;
    const db=!sb?.next_review_at||new Date(sb.next_review_at).getTime()<=now?0:1;
    if(da!==db)return da-db;
    return masteryFor(a)-masteryFor(b);
  })[0];
}

async function startReview(forcedId=null){
  let l=forcedId?lessons.find(x=>Number(x.id)===Number(forcedId)):chooseReviewLesson();
  if(!l)return toast('Aucun quiz disponible.');
  if(typeof ensureLessonDetail==='function')l=await withLoading('Chargement de la révision…',()=>ensureLessonDetail(l.id),{subtitle:'Préparation du quiz.'});
  const qs=parseQuiz(l.raw_text);if(!qs.length)return toast('Aucun quiz disponible pour cette fiche.');
  const q=qs[Math.floor(Math.random()*qs.length)];
  const box=$('reviewSession');
  box.innerHTML='<div class="card reviewQuestion"><div class="eyebrow">Révision · '+esc(l.name)+'</div><h3>'+esc(q.question)+'</h3><div class="reviewOptions">'+Object.entries(q.options).map(([k,v])=>'<button class="reviewOption" data-answer="'+k+'"><b>'+k+'</b> '+esc(v)+'</button>').join('')+'</div><div id="reviewFeedback" class="summary"></div></div>';
  box.scrollIntoView({behavior:'smooth',block:'center'});
  box.querySelectorAll('.reviewOption').forEach(b=>b.onclick=()=>answerReview(l,q,b.dataset.answer));
}

async function answerReview(l,q,answer){
  const correct=answer===q.answer;
  const old=reviewStats.get(Number(l.id))||{review_count:0,correct_count:0,wrong_count:0,mastery:0};
  const reviews=Number(old.review_count||0)+1;
  const good=Number(old.correct_count||0)+(correct?1:0);
  const wrong=Number(old.wrong_count||0)+(correct?0:1);
  const accuracy=good/reviews;
  const mastery=Math.max(0,Math.min(100,Math.round(accuracy*80+Math.min(reviews,4)*5)));
  const next=new Date(Date.now()+(correct?3:1)*86400000).toISOString();
  const payload={user_id:session.user.id,lesson_id:l.id,review_count:reviews,correct_count:good,wrong_count:wrong,mastery,last_reviewed_at:new Date().toISOString(),next_review_at:next,updated_at:new Date().toISOString()};
  const {data,error}=await sb.from('revision_stats').upsert(payload,{onConflict:'user_id,lesson_id'}).select().single();
  if(error)return toast(error.message);
  reviewStats.set(Number(l.id),data);
  const fb=$('reviewFeedback');
  fb.innerHTML='<b style="color:'+(correct?'var(--green)':'var(--red)')+'">'+(correct?'Correct':'Réponse correcte : '+esc(q.answer))+'</b><br>'+esc(q.explanation||'');
  document.querySelectorAll('#reviewSession .reviewOption').forEach(x=>x.disabled=true);
  const nextBtn=document.createElement('button');nextBtn.className='btn primary';nextBtn.style.marginTop='12px';nextBtn.textContent='Question suivante';nextBtn.onclick=()=>startReview();
  fb.appendChild(document.createElement('br'));fb.appendChild(nextBtn);
  renderReviewDashboard();
}

function n(id){return Number($(id)?.value||0)}
function fmt(x,d=2){return Number.isFinite(x)?new Intl.NumberFormat('fr-FR',{maximumFractionDigits:d}).format(x):'—'}
function calcMetal(){
  const ore=n('calcTonnage'),grade=n('calcGrade')/100,recovery=n('calcRecovery')/100;
  const metal=ore*grade*recovery;
  $('calcMetalResult').textContent=fmt(metal,3)+' t de métal récupéré';
}
function calcValue(){
  const metal=n('calcMetalT'),price=n('calcPrice'),fx=n('calcFx');
  const usd=metal*price,mga=usd*fx;
  $('calcValueResult').innerHTML=fmt(usd,0)+' USD<br>'+fmt(mga,0)+' MGA';
}
function calcDilution(){
  const ore=n('calcOreT'),grade=n('calcOreGrade'),waste=n('calcWasteT');
  const total=ore+waste;
  const diluted=total?ore*grade/total:0;
  const dilution=total?waste/total*100:0;
  $('calcDilutionResult').innerHTML='Teneur diluée : '+fmt(diluted,3)+' %<br>Dilution massique : '+fmt(dilution,2)+' %';
}
function calcConvert(){
  const value=n('calcConvValue'),unit=$('calcConvUnit').value;
  let percent,ppm,gpt;
  if(unit==='percent'){percent=value;ppm=value*10000;gpt=ppm}
  if(unit==='ppm'){ppm=value;gpt=value;percent=value/10000}
  if(unit==='gpt'){gpt=value;ppm=value;percent=value/10000}
  $('calcConvertResult').innerHTML=fmt(percent,6)+' %<br>'+fmt(ppm,3)+' ppm<br>'+fmt(gpt,3)+' g/t';
}

if($('savePersonalNote'))$('savePersonalNote').onclick=saveLessonNote;
if($('addLessonCollection'))$('addLessonCollection').onclick=addActiveLessonToCollection;
if($('createCollectionBtn'))$('createCollectionBtn').onclick=createCollection;
if($('runCompare'))$('runCompare').onclick=runComparison;
if($('startReviewBtn'))$('startReviewBtn').onclick=()=>startReview();
if($('calcMetalBtn'))$('calcMetalBtn').onclick=calcMetal;
if($('calcValueBtn'))$('calcValueBtn').onclick=calcValue;
if($('calcDilutionBtn'))$('calcDilutionBtn').onclick=calcDilution;
if($('calcConvertBtn'))$('calcConvertBtn').onclick=calcConvert;
