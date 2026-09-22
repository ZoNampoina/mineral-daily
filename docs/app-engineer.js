
function engineerSectionCard(title,body,open=false){
  const txt=String(body||'').trim();
  return '<details class="detailCard engineerCard" '+(open?'open':'')+'><summary>'+esc(title)+'</summary><div class="detailBody">'+esc(txt||'Information non encore renseignée dans cette fiche.')+'</div></details>';
}
let engineerHydrationSeqV218=0;
async function hydrateEngineerSelectionV218(){
  const sel=$('engineerLessonSelect'),box=$('engineerWorkspace');if(!sel||!box)return;
  const id=Number(sel.value||0);if(!id)return;
  const seq=++engineerHydrationSeqV218;
  box.innerHTML='<div class="card cardPad small">Chargement des données techniques…</div>';
  try{
    if(typeof requestLessonDataV218==='function'){
      await requestLessonDataV218(id,{title:'Chargement du minerai…',subtitle:'Préparation du dossier Mode Ingénieur.'});
    }else if(typeof ensureLessonDetail==='function')await ensureLessonDetail(id);
    if(seq!==engineerHydrationSeqV218||Number(sel.value)!==id)return;
    renderEngineerWorkspace();
  }catch(e){
    console.error(e);
    if(seq===engineerHydrationSeqV218)box.innerHTML='<div class="card cardPad small">Chargement impossible : '+esc(e.message||'Erreur')+'</div>';
  }
}
async function renderEngineerPicker(){
  const sel=$('engineerLessonSelect');if(!sel)return;
  const previous=sel.value;
  sel.innerHTML=lessons.map(l=>'<option value="'+l.id+'">'+esc(l.name)+' · '+esc(compactSymbol(l))+'</option>').join('');
  if(previous&&lessons.some(l=>String(l.id)===String(previous)))sel.value=previous;
  else if(activeLesson)sel.value=String(activeLesson.id);
  else if(lessons[0])sel.value=String(lessons[0].id);
  await hydrateEngineerSelectionV218();
}
function renderEngineerWorkspace(){
  const sel=$('engineerLessonSelect'),box=$('engineerWorkspace');if(!sel||!box)return;
  const l=lessons.find(x=>String(x.id)===String(sel.value));if(!l){box.innerHTML='<div class="card cardPad small">Aucune fiche disponible.</div>';return}
  const chemistry=section(l.raw_text,'CARACTÉRISTIQUES CHIMIQUES');
  const physical=section(l.raw_text,'CARACTÉRISTIQUES PHYSIQUES');
  const geology=section(l.raw_text,'GÉOLOGIE ET GENÈSE');
  const world=section(l.raw_text,'ZONES MONDIALES');
  const mining=section(l.raw_text,'EXPLOITATION');
  const processing=section(l.raw_text,'TRAITEMENT / MINÉRALURGIE');
  const market=section(l.raw_text,'MARCHÉ INTERNATIONAL');
  const production=section(l.raw_text,'PRODUCTION ANNUELLE');
  const economy=section(l.raw_text,'ÉCONOMIE');
  const environment=section(l.raw_text,'ENVIRONNEMENT');
  const madagascar=section(l.raw_text,'MADAGASCAR');
  const use=section(l.raw_text,'USAGES');
  const quality=typeof azQuality==='function'?azQuality(l):null;
  box.innerHTML=
    '<div class="card engineerHeroCard"><div><div class="eyebrow">Dossier ingénieur</div><h2>'+esc(l.name)+' <span class="roleBadge">'+esc(compactSymbol(l))+'</span></h2><div class="small">Lecture métier structurée à partir des données déjà présentes dans la fiche.</div></div>'+
    '<div class="engineerHeroActions"><button class="btn" data-engineer-open="'+l.id+'">Ouvrir la fiche complète</button>'+(quality?'<span class="azChip">Qualité '+quality.score+'%</span>':'')+'</div></div>'+
    '<div class="engineerNavGrid">'+
      '<button class="card engineerJump" data-engineer-target="eng-geology"><b>01</b><span>Géologie</span></button>'+
      '<button class="card engineerJump" data-engineer-target="eng-exploration"><b>02</b><span>Exploration</span></button>'+
      '<button class="card engineerJump" data-engineer-target="eng-mining"><b>03</b><span>Exploitation</span></button>'+
      '<button class="card engineerJump" data-engineer-target="eng-processing"><b>04</b><span>Traitement</span></button>'+
      '<button class="card engineerJump" data-engineer-target="eng-economy"><b>05</b><span>Économie</span></button>'+
      '<button class="card engineerJump" data-engineer-target="eng-madagascar"><b>06</b><span>Madagascar</span></button>'+
    '</div>'+
    '<div id="eng-geology" class="engineerSection"><div class="sectionTitle">01 · Géologie & propriétés</div><div class="detailGrid">'+
      engineerSectionCard('Géologie et genèse',geology,true)+engineerSectionCard('Caractéristiques chimiques',chemistry)+engineerSectionCard('Caractéristiques physiques',physical)+engineerSectionCard('Zones mondiales',world)+
    '</div></div>'+
    '<div id="eng-exploration" class="engineerSection"><div class="sectionTitle">02 · Exploration</div><div class="card cardPad engineerDerived"><div class="small">Cette section regroupe les éléments de la fiche utiles à la reconnaissance du contexte géologique et des cibles. Aucune méthode non documentée n’est ajoutée automatiquement.</div></div><div class="detailGrid">'+
      engineerSectionCard('Contexte géologique à reconnaître',geology,true)+engineerSectionCard('Indices physiques / minéralogiques',physical)+engineerSectionCard('Distribution et contextes connus',world)+
    '</div></div>'+
    '<div id="eng-mining" class="engineerSection"><div class="sectionTitle">03 · Exploitation</div><div class="detailGrid">'+
      engineerSectionCard('Méthodes et contraintes d’exploitation',mining,true)+engineerSectionCard('Environnement et contraintes',environment)+
    '</div></div>'+
    '<div id="eng-processing" class="engineerSection"><div class="sectionTitle">04 · Traitement / Minéralurgie</div><div class="detailGrid">'+
      engineerSectionCard('Chaîne de traitement',processing,true)+engineerSectionCard('Propriétés influençant le traitement',physical)+
    '</div></div>'+
    '<div id="eng-economy" class="engineerSection"><div class="sectionTitle">05 · Économie & marché</div><div class="detailGrid">'+
      engineerSectionCard('Marché international',market,true)+engineerSectionCard('Économie',economy)+engineerSectionCard('Production annuelle',production)+engineerSectionCard('Usages et débouchés',use)+
    '</div></div>'+
    '<div id="eng-madagascar" class="engineerSection"><div class="sectionTitle">06 · Madagascar</div>'+
      (String(madagascar||'').trim()?'<div class="card cardPad engineerMadagascar">'+esc(madagascar)+'</div>':'<div class="card cardPad small">Aucune donnée Madagascar renseignée pour cette fiche.</div>')+
    '</div>';
  box.querySelectorAll('[data-engineer-open]').forEach(b=>b.onclick=()=>openLesson(Number(b.dataset.engineerOpen)));
  box.querySelectorAll('[data-engineer-target]').forEach(b=>b.onclick=()=>$(b.dataset.engineerTarget)?.scrollIntoView({behavior:'smooth',block:'start'}));
}
async function onEngineerViewChange(view){
  if(view==='engineer')await renderEngineerPicker();
}
function setEngineerDetailsV216(open){
  document.querySelectorAll('#engineerWorkspace details.engineerCard').forEach(d=>d.open=open);
}
if($('engineerLessonSelect'))$('engineerLessonSelect').onchange=hydrateEngineerSelectionV218;
if($('engineerExpandAll'))$('engineerExpandAll').onclick=()=>setEngineerDetailsV216(true);
if($('engineerCollapseAll'))$('engineerCollapseAll').onclick=()=>setEngineerDetailsV216(false);
