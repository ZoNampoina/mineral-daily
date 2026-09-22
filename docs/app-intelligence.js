
let azRecentViewed=[];
const AZ_RECENT_KEY='az_recent_viewed_v18';

function azLoadRecent(){
  try{azRecentViewed=JSON.parse(localStorage.getItem(AZ_RECENT_KEY)||'[]')}catch{azRecentViewed=[]}
  if(!Array.isArray(azRecentViewed))azRecentViewed=[];
}
function azTrackRecentlyViewed(id){
  const n=Number(id); if(!n)return;
  azRecentViewed=[n,...azRecentViewed.filter(x=>Number(x)!==n)].slice(0,12);
  localStorage.setItem(AZ_RECENT_KEY,JSON.stringify(azRecentViewed));
  renderArizonaIntelligence();
}
function azNormalize(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function azSectionText(l,h){ return section(l.raw_text,h)||''; }
function azAllText(l){
  return azNormalize([l.name,l.symbol,l.raw_text].join(' '));
}
function azHasMadagascar(l){
  const s=azSectionText(l,'MADAGASCAR').trim();
  return !!s && !/^(non renseigne|aucune|—|-|n\/a)$/i.test(azNormalize(s));
}
function azLessonSources(l){
  const raw=String(l.raw_text||'');
  const urls=[...raw.matchAll(/https?:\/\/[^\s<>"')\]]+/g)].map(m=>m[0].replace(/[.,;:]$/,''));
  const refs=[];
  raw.split(/\r?\n/).forEach(line=>{
    if(/\b(source|sources|reference|référence|bibliographie|usgs|world bank|banque mondiale|bgs|brgm|iea|united states geological survey|mindat|geological survey)\b/i.test(line)) refs.push(line.trim());
  });
  return [...new Set([...refs,...urls])].slice(0,12);
}
function azCompleteness(l){
  const sections=['RÉSUMÉ EXÉCUTIF','CARACTÉRISTIQUES CHIMIQUES','CARACTÉRISTIQUES PHYSIQUES','GÉOLOGIE ET GENÈSE','ZONES MONDIALES','MADAGASCAR','EXPLOITATION','TRAITEMENT / MINÉRALURGIE','USAGES','MARCHÉ INTERNATIONAL','ÉCONOMIE','ENVIRONNEMENT'];
  const filled=sections.filter(h=>azSectionText(l,h).trim().length>24).length;
  return Math.round(filled/sections.length*100);
}
function azQuality(l){
  const completeness=azCompleteness(l);
  const sources=azLessonSources(l).length;
  const date=new Date(l.updated_at||l.lesson_date||0).getTime();
  const ageDays=date?Math.max(0,(Date.now()-date)/86400000):9999;
  const freshness=ageDays<180?100:ageDays<365?80:ageDays<730?60:40;
  const sourceScore=Math.min(100,sources*22);
  const score=Math.round(completeness*.55+sourceScore*.3+freshness*.15);
  const label=score>=80?'Élevée':score>=60?'Bonne':score>=40?'Moyenne':'À renforcer';
  return {score,label,completeness,sources,freshness};
}
function azBadge(text,cls=''){return '<span class="azChip '+cls+'">'+esc(text)+'</span>'}

function azRenderDashboard(){
  const box=$('smartDashboard'); if(!box)return;
  const recent=azRecentViewed.map(id=>lessons.find(l=>Number(l.id)===Number(id))).filter(Boolean).slice(0,4);
  const due=lessons.filter(l=>{
    const s=reviewStats?.get?.(Number(l.id));
    return parseQuiz(l.raw_text).length && (!s?.next_review_at || new Date(s.next_review_at).getTime()<=Date.now());
  }).sort((a,b)=>masteryFor(a)-masteryFor(b)).slice(0,4);
  const mg=lessons.filter(azHasMadagascar);
  const notesCount=typeof userNotes!=='undefined'?userNotes.size:0;
  const colCount=typeof userCollections!=='undefined'?userCollections.length:0;
  const recentHtml=recent.length?recent.map(l=>'<button class="azMiniLesson" data-az-open="'+l.id+'"><b>'+esc(l.name)+'</b><small>'+esc(compactSymbol(l))+'</small></button>').join(''):'<div class="small">Aucune consultation récente.</div>';
  const dueHtml=due.length?due.map(l=>'<button class="azMiniLesson" data-az-review="'+l.id+'"><b>'+esc(l.name)+'</b><small>'+masteryFor(l)+' %</small></button>').join(''):'<div class="small">Aucune révision urgente.</div>';
  box.innerHTML=
    '<div class="azSmartGrid">'+
      '<div class="card azSmartCard"><div class="eyebrow">Activité</div><div class="azMetricRow"><span><b>'+recent.length+'</b><small>récentes</small></span><span><b>'+notesCount+'</b><small>notes</small></span><span><b>'+colCount+'</b><small>collections</small></span><span><b>'+mg.length+'</b><small>Madagascar</small></span></div></div>'+
      '<div class="card azSmartCard"><div class="azCardHead"><div><div class="eyebrow">Continuer</div><h3>Consultées récemment</h3></div><button class="plainIcon" data-az-go="explorer" title="Explorer">⌕</button></div><div class="azMiniList">'+recentHtml+'</div></div>'+
      '<div class="card azSmartCard"><div class="azCardHead"><div><div class="eyebrow">Apprentissage</div><h3>À réviser</h3></div><button class="plainIcon" data-az-go="review" title="Révision">▶</button></div><div class="azMiniList">'+dueHtml+'</div></div>'+
    '</div>';
  box.querySelectorAll('[data-az-open]').forEach(b=>b.onclick=()=>openLesson(Number(b.dataset.azOpen)));
  box.querySelectorAll('[data-az-review]').forEach(b=>b.onclick=()=>{switchView('review');setTimeout(()=>startReview(Number(b.dataset.azReview)),30)});
  box.querySelectorAll('[data-az-go]').forEach(b=>b.onclick=()=>switchView(b.dataset.azGo));
}

function azSearchResults(){
  const q=azNormalize($('smartSearch')?.value||'');
  const scope=$('smartScope')?.value||'all';
  const mgOnly=$('smartMadagascarOnly')?.checked||false;
  const favOnly=$('smartFavoritesOnly')?.checked||false;
  let arr=[...lessons];
  if(q)arr=arr.filter(l=>{
    if(scope==='name')return azNormalize(l.name+' '+compactSymbol(l)).includes(q);
    if(scope==='geology')return azNormalize(azSectionText(l,'GÉOLOGIE ET GENÈSE')).includes(q);
    if(scope==='market')return azNormalize(azSectionText(l,'MARCHÉ INTERNATIONAL')+' '+azSectionText(l,'ÉCONOMIE')).includes(q);
    if(scope==='processing')return azNormalize(azSectionText(l,'TRAITEMENT / MINÉRALURGIE')+' '+azSectionText(l,'EXPLOITATION')).includes(q);
    if(scope==='madagascar')return azNormalize(azSectionText(l,'MADAGASCAR')).includes(q);
    return azAllText(l).includes(q);
  });
  if(mgOnly)arr=arr.filter(azHasMadagascar);
  if(favOnly)arr=arr.filter(l=>favorites.has(Number(l.id)));
  return arr;
}
function azRenderExplorer(){
  const box=$('smartResults');if(!box)return;
  const arr=azSearchResults();
  $('smartResultCount').textContent=arr.length+' résultat'+(arr.length>1?'s':'');
  box.innerHTML=arr.map(l=>{
    const q=azQuality(l), mg=azHasMadagascar(l);
    const tags=[mg?azBadge('Madagascar','mg'):'',favorites.has(Number(l.id))?azBadge('Favori','fav'):'',azBadge('Qualité '+q.score+'%')].filter(Boolean).join('');
    return '<article class="card azResultCard" data-az-open="'+l.id+'"><div class="azResultSymbol">'+esc(compactSymbol(l))+'</div><div class="lessonMain"><div class="lessonTitle">'+esc(l.name)+'</div><div class="azChips">'+tags+'</div><div class="lessonSummary">'+esc(compactText(section(l.raw_text,'RÉSUMÉ EXÉCUTIF'),190))+'</div></div><button class="plainIcon" title="Ouvrir">›</button></article>';
  }).join('')||'<div class="card cardPad small">Aucune fiche ne correspond aux filtres.</div>';
  box.querySelectorAll('[data-az-open]').forEach(card=>card.onclick=()=>openLesson(Number(card.dataset.azOpen)));
}

function azRenderMadagascar(){
  const box=$('madagascarList');if(!box)return;
  const q=azNormalize($('madagascarSearch')?.value||'');
  let arr=lessons.filter(azHasMadagascar);
  if(q)arr=arr.filter(l=>azNormalize(l.name+' '+azSectionText(l,'MADAGASCAR')).includes(q));
  const text=arr.map(l=>azSectionText(l,'MADAGASCAR')).join(' ');
  const regions=['Analamanga','Atsinanana','Alaotra-Mangoro','Diana','Sava','Boeny','Menabe','Atsimo-Andrefana','Anosy','Vatovavy','Fitovinany','Amoron’i Mania','Vakinankaratra','Betsiboka','Melaky','Itasy','Bongolava','Sofia','Ihorombe','Haute Matsiatra','Androy','Analanjirofo'];
  const mentioned=regions.filter(r=>azNormalize(text).includes(azNormalize(r)));
  if($('madagascarStats'))$('madagascarStats').innerHTML=
    '<span><b>'+arr.length+'</b><small>fiches concernées</small></span><span><b>'+mentioned.length+'</b><small>régions citées</small></span><span><b>'+arr.filter(l=>/or\b|gold/i.test(l.name+' '+azSectionText(l,'MADAGASCAR'))).length+'</b><small>liées à l’or</small></span>';
  box.innerHTML=arr.map(l=>{
    const s=azSectionText(l,'MADAGASCAR');
    return '<article class="card azMadCard" data-az-open="'+l.id+'"><div class="azMadHead"><div><div class="lessonTitle">'+esc(l.name)+'</div><div class="small">'+esc(compactSymbol(l))+'</div></div>'+azBadge('Madagascar','mg')+'</div><div class="azMadBody">'+esc(compactText(s,420))+'</div></article>';
  }).join('')||'<div class="card cardPad small">Aucune information Madagascar trouvée.</div>';
  box.querySelectorAll('[data-az-open]').forEach(card=>card.onclick=()=>openLesson(Number(card.dataset.azOpen)));
}

function azRenderSourcePanel(l){
  const box=$('sourceQualityPanel');if(!box)return;
  const q=azQuality(l),src=azLessonSources(l);
  const updated=l.updated_at||l.lesson_date;
  box.innerHTML=
   '<div class="card azQualityCard"><div class="azQualityScore"><strong>'+q.score+'%</strong><span>'+esc(q.label)+'</span></div>'+
   '<div class="azQualityDetails"><div><span>Complétude</span><b>'+q.completeness+'%</b></div><div><span>Sources détectées</span><b>'+q.sources+'</b></div><div><span>Fraîcheur</span><b>'+q.freshness+'%</b></div><div><span>Mise à jour</span><b>'+esc(updated?new Date(updated).toLocaleDateString('fr-FR'):'—')+'</b></div></div></div>'+
   '<div class="card cardPad"><div class="eyebrow">Traçabilité</div><div class="small" style="margin-bottom:10px">Le score est un indicateur interne basé sur la complétude, la présence de références et la date de mise à jour. Il ne remplace pas une validation scientifique.</div>'+
   (src.length?'<div class="azSourceList">'+src.map(s=>/^https?:/i.test(s)?'<a href="'+esc(s)+'" target="_blank" rel="noopener">'+esc(compactText(s,120))+'</a>':'<div>'+esc(compactText(s,180))+'</div>').join('')+'</div>':'<div class="small">Aucune source explicite détectée dans le texte de cette fiche.</div>')+
   '</div>';
}

function renderArizonaIntelligence(){
  azRenderDashboard();
  azRenderExplorer();
  azRenderMadagascar();
  if(activeLesson)azRenderSourcePanel(activeLesson);
}
function onArizonaIntelligenceViewChange(view){
  if(view==='explorer')azRenderExplorer();
  if(view==='madagascar')azRenderMadagascar();
  if(view==='home')azRenderDashboard();
}
function renderLessonIntelligence(l){ azRenderSourcePanel(l); }

azLoadRecent();
if($('smartSearch'))$('smartSearch').oninput=azRenderExplorer;
if($('smartScope'))$('smartScope').onchange=azRenderExplorer;
if($('smartMadagascarOnly'))$('smartMadagascarOnly').onchange=azRenderExplorer;
if($('smartFavoritesOnly'))$('smartFavoritesOnly').onchange=azRenderExplorer;
if($('madagascarSearch'))$('madagascarSearch').oninput=azRenderMadagascar;
