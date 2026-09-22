
let lessonSourcesV20=[];

function v20Trim(v){return String(v??'').replace(/\s+/g,' ').trim()}
function v20Obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function v20Val(raw,heading,label){
  try{
    const obj=kv(section(raw,heading));
    const wanted=Object.keys(obj).find(k=>k.toLowerCase()===String(label).toLowerCase());
    return wanted?v20Trim(obj[wanted]):'';
  }catch{return ''}
}
function deriveStructuredDataV20(l){
  const raw=String(l?.raw_text||'');
  return {
    schema_version:1,
    identity:{
      formula:v20Val(raw,'CARACTÉRISTIQUES CHIMIQUES','Formule'),
      class:v20Val(raw,'CARACTÉRISTIQUES CHIMIQUES','Classe'),
      crystal_system:v20Val(raw,'CARACTÉRISTIQUES CHIMIQUES','Système cristallin')
    },
    physical:{
      hardness_mohs:v20Val(raw,'CARACTÉRISTIQUES PHYSIQUES','Dureté (Mohs)'),
      density:v20Val(raw,'CARACTÉRISTIQUES PHYSIQUES','Densité'),
      magnetism:v20Val(raw,'CARACTÉRISTIQUES PHYSIQUES','Magnétisme'),
      conductivity:v20Val(raw,'CARACTÉRISTIQUES PHYSIQUES','Conductivité')
    },
    geology:{
      summary:v20Trim(section(raw,'GÉOLOGIE ET GENÈSE')),
      deposit_types:v20Val(raw,'GÉOLOGIE ET GENÈSE','Type de gisement')||v20Val(raw,'GÉOLOGIE ET GENÈSE','Types de gisements'),
      associated_minerals:v20Val(raw,'GÉOLOGIE ET GENÈSE','Minéraux associés')
    },
    mining:{summary:v20Trim(section(raw,'EXPLOITATION'))},
    processing:{summary:v20Trim(section(raw,'TRAITEMENT / MINÉRALURGIE'))},
    economy:{
      market_summary:v20Trim(section(raw,'MARCHÉ INTERNATIONAL')),
      price:v20Val(raw,'MARCHÉ INTERNATIONAL','Prix'),
      price_unit:v20Val(raw,'MARCHÉ INTERNATIONAL','Unité'),
      production:v20Trim(section(raw,'PRODUCTION ANNUELLE'))
    },
    uses:{summary:v20Trim(section(raw,'USAGES'))},
    madagascar:{summary:v20Trim(section(raw,'MADAGASCAR'))}
  };
}
function v20HasStructured(l){
  const d=v20Obj(l?.structured_data);
  return Object.keys(d).length>0;
}
function structuredDataV20(l){
  return v20HasStructured(l)?v20Obj(l.structured_data):deriveStructuredDataV20(l);
}
function v20NonEmptyCount(obj){
  let n=0;
  const walk=v=>{
    if(v&&typeof v==='object'){Object.values(v).forEach(walk)}
    else if(v20Trim(v))n++;
  };
  walk(obj);return n;
}
function v20StatusLabel(status){
  return ({legacy:'Héritée',draft:'Brouillon',verified:'Vérifiée',needs_review:'À revoir'})[status]||'Héritée';
}
async function loadArizonaV20(){
  if(!session)return;
  const {data,error}=await sb.from('lesson_sources').select('*').order('created_at',{ascending:true});
  if(error){console.warn('V20 sources',error);lessonSourcesV20=[]}
  else lessonSourcesV20=data||[];
}
function explicitSourcesV20(lessonId){
  return lessonSourcesV20.filter(s=>Number(s.lesson_id)===Number(lessonId));
}
function renderLessonV20(l){
  renderStructuredPanelV20(l);
}
function v20FieldCard(label,value){
  const v=v20Trim(value);
  if(!v)return '';
  return '<div class="v20DataItem"><span>'+esc(label)+'</span><b>'+esc(v)+'</b></div>';
}
function renderStructuredPanelV20(l){
  const box=$('structuredDataPanel');if(!box)return;
  const d=structuredDataV20(l),identity=v20Obj(d.identity),physical=v20Obj(d.physical),geo=v20Obj(d.geology),eco=v20Obj(d.economy);
  const count=v20NonEmptyCount(d),persisted=v20HasStructured(l);
  const blocks=[
    ['Identité',[
      v20FieldCard('Formule',identity.formula),
      v20FieldCard('Classe',identity.class),
      v20FieldCard('Système cristallin',identity.crystal_system)
    ]],
    ['Propriétés',[
      v20FieldCard('Dureté (Mohs)',physical.hardness_mohs),
      v20FieldCard('Densité',physical.density),
      v20FieldCard('Magnétisme',physical.magnetism),
      v20FieldCard('Conductivité',physical.conductivity)
    ]],
    ['Géologie',[
      v20FieldCard('Types de gisement',geo.deposit_types),
      v20FieldCard('Minéraux associés',geo.associated_minerals)
    ]],
    ['Économie',[
      v20FieldCard('Prix',eco.price),
      v20FieldCard('Unité',eco.price_unit)
    ]]
  ];
  const html=blocks.map(([title,items])=>{
    const valid=items.filter(Boolean);if(!valid.length)return '';
    return '<div class="card cardPad v20DataBlock"><div class="eyebrow">'+esc(title)+'</div><div class="v20DataGrid">'+valid.join('')+'</div></div>';
  }).filter(Boolean).join('');
  box.innerHTML=
    '<div class="v20DataMeta">'+
      '<span class="azChip">'+esc(v20StatusLabel(l.data_status||'legacy'))+'</span>'+
      '<span class="azChip">'+count+' donnée'+(count>1?'s':'')+' structurée'+(count>1?'s':'')+'</span>'+
      (!persisted?'<span class="azChip v20DerivedChip">Dérivé du texte</span>':'')+
      (l.last_verified_at?'<span class="small">Vérifiée le '+esc(new Date(l.last_verified_at).toLocaleDateString('fr-FR'))+'</span>':'')+
    '</div>'+
    (html||'<div class="card cardPad small">Aucune donnée structurée disponible pour cette fiche.</div>');
}
function populateV20Editor(l){
  const d=structuredDataV20(l),identity=v20Obj(d.identity),physical=v20Obj(d.physical),geo=v20Obj(d.geology),mining=v20Obj(d.mining),processing=v20Obj(d.processing),eco=v20Obj(d.economy),mg=v20Obj(d.madagascar);
  const set=(id,v)=>{if($(id))$(id).value=v20Trim(v)};
  set('v20Formula',identity.formula);set('v20Class',identity.class);set('v20Crystal',identity.crystal_system);
  set('v20Hardness',physical.hardness_mohs);set('v20Density',physical.density);
  set('v20DepositTypes',geo.deposit_types);set('v20Associated',geo.associated_minerals);
  set('v20Mining',mining.summary);set('v20Processing',processing.summary);
  set('v20Price',eco.price);set('v20PriceUnit',eco.price_unit);set('v20Madagascar',mg.summary);
  if($('v20DataStatus'))$('v20DataStatus').value=l.data_status||'legacy';
  renderSourceEditorV20(l.id);
  loadVersionsV20(l.id);
}
function collectStructuredDataV20(){
  const val=id=>v20Trim($(id)?.value||'');
  return {
    schema_version:1,
    identity:{formula:val('v20Formula'),class:val('v20Class'),crystal_system:val('v20Crystal')},
    physical:{hardness_mohs:val('v20Hardness'),density:val('v20Density')},
    geology:{deposit_types:val('v20DepositTypes'),associated_minerals:val('v20Associated')},
    mining:{summary:val('v20Mining')},
    processing:{summary:val('v20Processing')},
    economy:{price:val('v20Price'),price_unit:val('v20PriceUnit')},
    madagascar:{summary:val('v20Madagascar')}
  };
}
function extractEditorFromRawV20(){
  const fake={raw_text:$('editRaw')?.value||'',structured_data:{}};
  const d=deriveStructuredDataV20(fake);
  populateV20Editor({...fake,id:Number($('editId')?.value||0),structured_data:d,data_status:'draft'});
  toast('Données structurées extraites du texte.');
}
function sourceTypeLabelV20(t){
  return ({institutional:'Institutionnelle',scientific:'Scientifique',technical:'Technique',regulatory:'Réglementaire',company:'Entreprise',web:'Web',other:'Autre'})[t]||t;
}
function sourceCardsV20(lessonId){
  return explicitSourcesV20(lessonId).map(s=>{
    const meta=[s.organization,sourceTypeLabelV20(s.source_type),s.publication_year].filter(Boolean).join(' · ');
    return '<div class="v20SourceCard"><div><b>'+esc(s.title)+'</b>'+(meta?'<small>'+esc(meta)+'</small>':'')+
      (s.url?'<a href="'+esc(s.url)+'" target="_blank" rel="noopener">Ouvrir la source</a>':'')+
      (s.data_scope?.length?'<small>Données : '+esc(s.data_scope.join(', '))+'</small>':'')+
      '</div>'+(isAdmin()?'<button class="plainIcon v20DeleteSource" data-source="'+s.id+'" title="Supprimer">×</button>':'')+'</div>';
  }).join('');
}
function renderSourceEditorV20(lessonId){
  const box=$('v20SourceList');if(!box)return;
  box.innerHTML=sourceCardsV20(lessonId)||'<div class="small">Aucune source explicite enregistrée.</div>';
  box.querySelectorAll('.v20DeleteSource').forEach(b=>b.onclick=()=>deleteSourceV20(Number(b.dataset.source),lessonId));
}
async function addSourceV20(){
  if(!isAdmin())return;
  const lessonId=Number($('editId')?.value||0);if(!lessonId)return toast('Enregistre d’abord la fiche.');
  const title=v20Trim($('v20SourceTitle')?.value||'');if(!title)return toast('Le titre de la source est requis.');
  const scopes=v20Trim($('v20SourceScope')?.value||'').split(',').map(v20Trim).filter(Boolean);
  const payload={
    lesson_id:lessonId,title,
    organization:v20Trim($('v20SourceOrg')?.value||'')||null,
    url:v20Trim($('v20SourceUrl')?.value||'')||null,
    source_type:$('v20SourceType')?.value||'web',
    publication_year:Number($('v20SourceYear')?.value||0)||null,
    accessed_at:new Date().toISOString().slice(0,10),
    data_scope:scopes,
    note:v20Trim($('v20SourceNote')?.value||'')||null,
    created_by:session.user.id,
    updated_at:new Date().toISOString()
  };
  const {error}=await sb.from('lesson_sources').insert(payload);
  if(error)return toast(error.message);
  ['v20SourceTitle','v20SourceOrg','v20SourceUrl','v20SourceYear','v20SourceScope','v20SourceNote'].forEach(id=>{if($(id))$(id).value=''});
  await loadArizonaV20();renderSourceEditorV20(lessonId);
  if(activeLesson?.id===lessonId&&typeof azRenderSourcePanel==='function')azRenderSourcePanel(activeLesson);
  toast('Source ajoutée.');
}
async function deleteSourceV20(sourceId,lessonId){
  if(!isAdmin())return;
  const {error}=await sb.from('lesson_sources').delete().eq('id',sourceId);
  if(error)return toast(error.message);
  await loadArizonaV20();renderSourceEditorV20(lessonId);
  if(activeLesson?.id===lessonId&&typeof azRenderSourcePanel==='function')azRenderSourcePanel(activeLesson);
  toast('Source supprimée.');
}
async function loadVersionsV20(lessonId){
  const box=$('v20VersionList');if(!box||!isAdmin())return;
  box.innerHTML='<div class="small">Chargement de l’historique…</div>';
  const {data,error}=await sb.from('lesson_versions').select('*').eq('lesson_id',lessonId).order('version_no',{ascending:false}).limit(20);
  if(error){box.innerHTML='<div class="small">'+esc(error.message)+'</div>';return}
  box.innerHTML=(data||[]).length?(data||[]).map(v=>{
    const s=v20Obj(v.snapshot);
    return '<div class="v20VersionRow"><div><b>Version '+v.version_no+'</b><small>'+esc(new Date(v.created_at).toLocaleString('fr-FR'))+' · '+esc(s.name||'Fiche')+'</small></div><button class="btn v20RestoreVersion" data-version="'+v.id+'">Restaurer</button></div>';
  }).join(''):'<div class="small">Aucune version antérieure. Le premier snapshot sera créé lors de la prochaine modification.</div>';
  box.querySelectorAll('.v20RestoreVersion').forEach(b=>b.onclick=()=>restoreVersionV20(Number(b.dataset.version),lessonId));
}
async function restoreVersionV20(versionId,lessonId){
  if(!isAdmin()||!confirm('Restaurer cette version ? La version actuelle sera elle-même archivée.'))return;
  const {data:v,error:e}=await sb.from('lesson_versions').select('*').eq('id',versionId).single();
  if(e||!v)return toast(e?.message||'Version introuvable.');
  const s=v20Obj(v.snapshot);
  const payload={
    lesson_date:s.lesson_date,name:s.name,symbol:s.symbol,raw_text:s.raw_text,
    image_urls:Array.isArray(s.image_urls)?s.image_urls:[],
    structured_data:v20Obj(s.structured_data),
    data_status:s.data_status||'legacy',
    last_verified_at:s.last_verified_at||null,
    updated_by:session.user.id,updated_at:new Date().toISOString()
  };
  const {error}=await sb.from('arizona_lessons').update(payload).eq('id',lessonId);
  if(error)return toast(error.message);
  await loadLessons();await loadArizonaV20();renderAll();
  const l=lessons.find(x=>Number(x.id)===Number(lessonId));if(l){activeLesson=l;populateV20Editor(l)}
  toast('Version restaurée.');
}
if($('v20ExtractBtn'))$('v20ExtractBtn').onclick=extractEditorFromRawV20;
if($('v20AddSourceBtn'))$('v20AddSourceBtn').onclick=addSourceV20;
