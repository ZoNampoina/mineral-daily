
let madagascarEntitiesV21=[],madagascarEntityLessonsV21=[],knowledgeRelationsV21=[],v21Loaded=false,v21Loading=null;

function v21Text(v){return String(v??'').replace(/\s+/g,' ').trim()}
function v21Norm(v){return v21Text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function v21TypeLabel(v){return ({project:'Projet',mine:'Mine',deposit:'Gisement',occurrence:'Occurrence',prospect:'Prospect',processing_site:'Site de traitement'})[v]||v}
function v21StatusLabel(v){return ({unknown:'Non renseigné',exploration:'Exploration',development:'Développement',operation:'Exploitation',suspended:'Suspendu',closed:'Fermé'})[v]||v}
function v21RelationLabel(v){return ({associated_with:'Associé à',coproduct:'Coproduit',substitute:'Substitut',occurs_in:'Présent dans',deposit_type:'Type de gisement',processed_by:'Traité par',used_in:'Utilisé dans',project_link:'Projet lié',related_to:'Lié à'})[v]||v}

async function loadArizonaV21(force=false){
  if(!session)return;
  if(v21Loaded&&!force)return;
  if(v21Loading&&!force)return v21Loading;
  const loadToken=typeof beginLoading==='function'?beginLoading(currentViewV217?.()==='knowledge'?'Chargement du Knowledge Graph…':'Chargement de Madagascar…',{delay:80,subtitle:'Synchronisation des données structurées.'}):null;
  v21Loading=(async()=>{
    const [e,l,r]=await Promise.all([
      sb.from('madagascar_entities').select('*').order('name',{ascending:true}),
      sb.from('madagascar_entity_lessons').select('*'),
      sb.from('knowledge_relations').select('*').order('created_at',{ascending:true})
    ]);
    if(e.error||l.error||r.error){console.warn('ARIZONA V21',e.error||l.error||r.error);return}
    madagascarEntitiesV21=e.data||[];
    madagascarEntityLessonsV21=l.data||[];
    knowledgeRelationsV21=r.data||[];
    v21Loaded=true;
  })();
  try{await v21Loading}finally{v21Loading=null;if(loadToken&&typeof endLoading==='function')endLoading(loadToken)}
}
function v21LessonsForEntity(entityId){
  const ids=madagascarEntityLessonsV21.filter(x=>Number(x.entity_id)===Number(entityId)).map(x=>Number(x.lesson_id));
  return lessons.filter(l=>ids.includes(Number(l.id)));
}
function v21VisibleEntities(){
  return madagascarEntitiesV21.filter(e=>String(e.owner_user_id||'')===String(session?.user?.id||''));
}
function v21EntitiesForLesson(lessonId){
  const ids=madagascarEntityLessonsV21.filter(x=>Number(x.lesson_id)===Number(lessonId)).map(x=>Number(x.entity_id));
  return v21VisibleEntities().filter(e=>ids.includes(Number(e.id)));
}
function v21Location(e){
  return [e.fokontany,e.commune,e.district,e.region].filter(Boolean).join(' · ')||'Localisation non renseignée';
}
function v21Regions(){
  return [...new Set(v21VisibleEntities().map(e=>v21Text(e.region)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
}

function renderMadagascarFiltersV21(){
  const region=$('v21MgRegionFilter');if(!region)return;
  const current=region.value;
  region.innerHTML='<option value="">Toutes les régions</option>'+v21Regions().map(r=>'<option value="'+esc(r)+'">'+esc(r)+'</option>').join('');
  if([...region.options].some(o=>o.value===current))region.value=current;
}
function filteredMadagascarV21(){
  const q=v21Norm($('madagascarSearch')?.value||'');
  const type=$('v21MgTypeFilter')?.value||'';
  const region=$('v21MgRegionFilter')?.value||'';
  return madagascarEntitiesV21.filter(e=>{
    if(type&&e.entity_type!==type)return false;
    if(region&&e.region!==region)return false;
    if(!q)return true;
    const ls=v21LessonsForEntity(e.id).map(l=>l.name).join(' ');
    return v21Norm([e.name,e.region,e.district,e.commune,e.fokontany,e.operator_name,e.permit_ref,e.development_stage,e.description,ls].join(' ')).includes(q);
  });
}
function renderMadagascarV21(){
  const list=$('madagascarStructuredList'),stats=$('madagascarStats');if(!list)return;
  renderMadagascarFiltersV21();
  const arr=filteredMadagascarV21();
  const regions=new Set(v21VisibleEntities().map(e=>v21Text(e.region)).filter(Boolean));
  const linkedLessons=new Set(madagascarEntityLessonsV21.map(x=>Number(x.lesson_id)));
  const legacy=lessons.filter(l=>typeof azHasMadagascar==='function'&&azHasMadagascar(l));
  if(stats)stats.innerHTML=
    '<span><b>'+v21VisibleEntities().length+'</b><small>mes entités structurées</small></span>'+
    '<span><b>'+regions.size+'</b><small>régions</small></span>'+
    '<span><b>'+linkedLessons.size+'</b><small>substances liées</small></span>'+
    '<span><b>'+legacy.length+'</b><small>fiches historiques</small></span>';
  list.innerHTML=arr.length?arr.map(e=>{
    const linked=v21LessonsForEntity(e.id);
    const coord=(e.latitude!=null&&e.longitude!=null)?Number(e.latitude).toFixed(4)+', '+Number(e.longitude).toFixed(4):'';
    return '<article class="card v21MgEntityCard" data-v21-entity="'+e.id+'">'+
      '<div class="v21EntityHead"><div><div class="eyebrow">'+esc(v21TypeLabel(e.entity_type))+'</div><h3>'+esc(e.name)+'</h3></div><div class="v21EntityActions"><span class="azChip">'+esc(v21StatusLabel(e.status))+'</span><button class="plainIcon v21DeleteEntityCard" data-v21-delete="'+e.id+'" title="Supprimer">×</button></div></div>'+
      '<div class="v21EntityLocation">'+esc(v21Location(e))+'</div>'+
      (e.operator_name?'<div class="small">Opérateur : '+esc(e.operator_name)+'</div>':'')+
      (coord?'<div class="small">Coordonnées : '+esc(coord)+'</div>':'')+
      '<div class="azChips">'+linked.map(l=>'<button class="azChip v21LessonChip" data-v21-lesson="'+l.id+'">'+esc(l.name)+'</button>').join('')+'</div>'+
      '<div class="lessonSummary">'+esc(compactText(e.description||e.development_stage||'',210))+'</div>'+
    '</article>';
  }).join(''):'<div class="card cardPad small">Aucune entité structurée ne correspond aux filtres. Les informations historiques restent disponibles plus bas.</div>';
  list.querySelectorAll('[data-v21-entity]').forEach(card=>card.onclick=e=>{if(e.target.closest('[data-v21-lesson],[data-v21-delete]'))return;openMadagascarEntityV21(Number(card.dataset.v21Entity))});
  list.querySelectorAll('[data-v21-lesson]').forEach(b=>b.onclick=e=>{e.stopPropagation();openLesson(Number(b.dataset.v21Lesson))});
  list.querySelectorAll('[data-v21-delete]').forEach(b=>b.onclick=e=>{e.stopPropagation();deleteMadagascarEntityV21(Number(b.dataset.v21Delete))});
  renderLegacyMadagascarV21();
  if(isAdmin())renderMadagascarAdminListV21();
}
function renderLegacyMadagascarV21(){
  const box=$('madagascarLegacyList');if(!box)return;
  const q=v21Norm($('madagascarSearch')?.value||'');
  let arr=lessons.filter(l=>typeof azHasMadagascar==='function'&&azHasMadagascar(l));
  if(q)arr=arr.filter(l=>v21Norm(l.name+' '+section(l.raw_text,'MADAGASCAR')).includes(q));
  box.innerHTML=arr.map(l=>'<article class="card azMadCard" data-v21-legacy="'+l.id+'"><div class="azMadHead"><div><div class="lessonTitle">'+esc(l.name)+'</div><div class="small">'+esc(compactSymbol(l))+'</div></div><span class="azChip v20DerivedChip">Historique</span></div><div class="azMadBody">'+esc(compactText(section(l.raw_text,'MADAGASCAR'),360))+'</div></article>').join('')||'<div class="small">Aucune donnée historique Madagascar.</div>';
  box.querySelectorAll('[data-v21-legacy]').forEach(c=>c.onclick=()=>openLesson(Number(c.dataset.v21Legacy)));
}
function openMadagascarEntityV21(id){
  const e=madagascarEntitiesV21.find(x=>Number(x.id)===Number(id));if(!e)return;
  const linked=v21LessonsForEntity(id);
  const modal=$('v21MgEntityModal');if(!modal)return;
  $('v21MgModalTitle').textContent=e.name;
  $('v21MgModalBody').innerHTML=
    '<div class="v21EntityDetailGrid">'+
      '<div><span>Type</span><b>'+esc(v21TypeLabel(e.entity_type))+'</b></div>'+
      '<div><span>Statut</span><b>'+esc(v21StatusLabel(e.status))+'</b></div>'+
      '<div><span>Région</span><b>'+esc(e.region||'—')+'</b></div>'+
      '<div><span>District</span><b>'+esc(e.district||'—')+'</b></div>'+
      '<div><span>Commune</span><b>'+esc(e.commune||'—')+'</b></div>'+
      '<div><span>Fokontany</span><b>'+esc(e.fokontany||'—')+'</b></div>'+
      '<div><span>Opérateur</span><b>'+esc(e.operator_name||'—')+'</b></div>'+
      '<div><span>Permis</span><b>'+esc(e.permit_ref||'—')+'</b></div>'+
      '<div><span>Stade</span><b>'+esc(e.development_stage||'—')+'</b></div>'+
      '<div><span>Coordonnées</span><b>'+esc(e.latitude!=null&&e.longitude!=null?e.latitude+', '+e.longitude:'—')+'</b></div>'+
    '</div>'+
    (e.description?'<div class="card cardPad v21EntityDescription">'+esc(e.description)+'</div>':'')+
    '<div class="sectionTitle">Substances liées</div><div class="azChips">'+(linked.length?linked.map(l=>'<button class="azChip v21ModalLesson" data-id="'+l.id+'">'+esc(l.name)+'</button>').join(''):'<span class="small">Aucune fiche liée.</span>')+'</div>'+
    '<div class="v21ModalAdminActions"><button id="v21EditEntityBtn" class="btn">Modifier</button><button id="v21DeleteEntityBtn" class="btn danger">Supprimer</button></div>';
  modal.classList.add('open');
  modal.querySelectorAll('.v21ModalLesson').forEach(b=>b.onclick=()=>{modal.classList.remove('open');openLesson(Number(b.dataset.id))});
  $('v21EditEntityBtn').onclick=()=>{modal.classList.remove('open');populateMadagascarFormV21(e);$('v21MgAdmin')?.scrollIntoView({behavior:'smooth',block:'start'})};
  $('v21DeleteEntityBtn').onclick=()=>deleteMadagascarEntityV21(e.id);
}

function renderMadagascarAdminListV21(){
  const box=$('v21MgLinkedLessons');if(!box)return;
  const selected=new Set((box.dataset.selected||'').split(',').filter(Boolean).map(Number));
  box.innerHTML=lessons.map(l=>'<label class="v21LessonPick"><input type="checkbox" value="'+l.id+'" '+(selected.has(Number(l.id))?'checked':'')+'><span>'+esc(l.name)+'</span></label>').join('');
}
function populateMadagascarFormV21(e=null){
  const set=(id,v)=>{if($(id))$(id).value=v??''};
  set('v21MgId',e?.id||'');set('v21MgName',e?.name||'');set('v21MgType',e?.entity_type||'project');
  set('v21MgRegion',e?.region||'');set('v21MgDistrict',e?.district||'');set('v21MgCommune',e?.commune||'');set('v21MgFokontany',e?.fokontany||'');
  set('v21MgLat',e?.latitude??'');set('v21MgLon',e?.longitude??'');set('v21MgOperator',e?.operator_name||'');set('v21MgStatus',e?.status||'unknown');
  set('v21MgPermit',e?.permit_ref||'');set('v21MgStage',e?.development_stage||'');set('v21MgDescription',e?.description||'');
  const linked=e?v21LessonsForEntity(e.id).map(l=>Number(l.id)):[];
  if($('v21MgLinkedLessons'))$('v21MgLinkedLessons').dataset.selected=linked.join(',');
  renderMadagascarAdminListV21();
  if($('v21MgSaveBtn'))$('v21MgSaveBtn').textContent=e?'Mettre à jour':'Créer l’entité';
}
async function saveMadagascarEntityV21(){
  if(!session)return;
  const id=Number($('v21MgId')?.value||0),name=v21Text($('v21MgName')?.value||'');
  if(!name)return toast('Le nom est requis.');
  const lat=$('v21MgLat')?.value===''?null:Number($('v21MgLat').value),lon=$('v21MgLon')?.value===''?null:Number($('v21MgLon').value);
  if(lat!=null&&(lat<-90||lat>90))return toast('Latitude invalide.');
  if(lon!=null&&(lon<-180||lon>180))return toast('Longitude invalide.');
  const payload={
    name,entity_type:$('v21MgType').value,region:v21Text($('v21MgRegion').value)||null,district:v21Text($('v21MgDistrict').value)||null,
    commune:v21Text($('v21MgCommune').value)||null,fokontany:v21Text($('v21MgFokontany').value)||null,latitude:lat,longitude:lon,
    operator_name:v21Text($('v21MgOperator').value)||null,status:$('v21MgStatus').value,permit_ref:v21Text($('v21MgPermit').value)||null,
    development_stage:v21Text($('v21MgStage').value)||null,description:v21Text($('v21MgDescription').value)||null,
    updated_by:session.user.id,updated_at:new Date().toISOString()
  };
  let entityId=id;
  if(id){
    const {error}=await sb.from('madagascar_entities').update(payload).eq('id',id);if(error)return toast(error.message);
  }else{
    const {data,error}=await sb.from('madagascar_entities').insert({...payload,owner_user_id:session.user.id,created_by:session.user.id}).select('id').single();
    if(error)return toast(error.message);entityId=Number(data.id);
  }
  const chosen=[...document.querySelectorAll('#v21MgLinkedLessons input:checked')].map(x=>Number(x.value));
  const {error:delErr}=await sb.from('madagascar_entity_lessons').delete().eq('entity_id',entityId);if(delErr)return toast(delErr.message);
  if(chosen.length){
    const rows=chosen.map((lessonId,i)=>({entity_id:entityId,lesson_id:lessonId,relation_type:i===0?'primary_substance':'substance',created_by:session.user.id}));
    const {error}=await sb.from('madagascar_entity_lessons').insert(rows);if(error)return toast(error.message);
  }
  await loadArizonaV21(true);populateMadagascarFormV21();renderMadagascarV21();renderKnowledgeGraphV21();
  toast(id?'Entité Madagascar mise à jour.':'Entité Madagascar créée.');
}
async function deleteMadagascarEntityV21(id){
  if(!session)return;
  const e=madagascarEntitiesV21.find(x=>Number(x.id)===Number(id));
  if(!confirm('Supprimer '+(e?.name||'cette entité')+' ?'))return;
  const {error}=await sb.from('madagascar_entities').delete().eq('id',id);if(error)return toast(error.message);
  $('v21MgEntityModal')?.classList.remove('open');await loadArizonaV21(true);populateMadagascarFormV21();renderMadagascarV21();renderKnowledgeGraphV21();toast('Entité supprimée.');
}

/* Knowledge Graph */
function v21SplitTerms(value,max=8){
  return [...new Set(v21Text(value).split(/[;,|•\n]+/).map(v21Text).filter(x=>x.length>1&&x.length<90))].slice(0,max);
}
function derivedGraphRelationsV21(l){
  if(!l)return[];
  const d=typeof structuredDataV20==='function'?structuredDataV20(l):{},geo=d.geology||{},processing=d.processing||{},uses=d.uses||{};
  const rel=[];
  v21SplitTerms(geo.deposit_types,6).forEach(label=>rel.push({relation_type:'deposit_type',target_kind:'deposit_type',target_label:label,derived:true}));
  v21SplitTerms(geo.associated_minerals,8).forEach(label=>rel.push({relation_type:'associated_with',target_kind:'concept',target_label:label,derived:true}));
  const proc=v21Text(processing.summary||section(l.raw_text,'TRAITEMENT / MINÉRALURGIE'));if(proc)rel.push({relation_type:'processed_by',target_kind:'process',target_label:compactText(proc,64),derived:true});
  const use=v21Text(uses.summary||section(l.raw_text,'USAGES'));if(use)rel.push({relation_type:'used_in',target_kind:'use',target_label:compactText(use,64),derived:true});
  v21EntitiesForLesson(l.id).forEach(e=>rel.push({relation_type:'project_link',target_kind:'madagascar_entity',target_entity_id:e.id,target_label:e.name,derived:true}));
  return rel;
}
function graphRelationsForLessonV21(l){
  const stored=knowledgeRelationsV21.filter(r=>Number(r.source_lesson_id)===Number(l.id));
  const derived=derivedGraphRelationsV21(l);
  const key=r=>[r.relation_type,r.target_kind,r.target_lesson_id||'',r.target_entity_id||'',(r.target_lesson_id||r.target_entity_id)?'':v21Norm(r.target_label||'')].join('|');
  const seen=new Set(stored.map(key));
  return [...stored,...derived.filter(r=>!seen.has(key(r)))];
}
function v21GraphTarget(r){
  if(r.target_kind==='lesson'){
    const l=lessons.find(x=>Number(x.id)===Number(r.target_lesson_id));
    return {label:l?.name||'Fiche',kind:'lesson',id:l?.id};
  }
  if(r.target_kind==='madagascar_entity'){
    const e=madagascarEntitiesV21.find(x=>Number(x.id)===Number(r.target_entity_id));
    return {label:e?.name||r.target_label||'Entité Madagascar',kind:'entity',id:e?.id};
  }
  return {label:r.target_label||'Relation',kind:r.target_kind,id:null};
}
function renderKnowledgePickerV21(){
  const sel=$('knowledgeLessonSelect');if(!sel)return;
  const cur=sel.value;
  sel.innerHTML=lessons.map(l=>'<option value="'+l.id+'">'+esc(l.name)+' · '+esc(compactSymbol(l))+'</option>').join('');
  if(cur&&lessons.some(l=>String(l.id)===String(cur)))sel.value=cur;
  else if(activeLesson)sel.value=String(activeLesson.id);
  renderKnowledgeGraphV21();
}
function renderKnowledgeGraphV21(){
  const sel=$('knowledgeLessonSelect'),svg=$('knowledgeGraphSvg'),list=$('knowledgeRelationList');if(!sel||!svg||!list)return;
  const l=lessons.find(x=>String(x.id)===String(sel.value));if(!l){svg.innerHTML='';list.innerHTML='<div class="small">Aucune fiche.</div>';return}
  const relations=graphRelationsForLessonV21(l).slice(0,18);
  const w=900,h=540,cx=450,cy=270,radius=205;
  const nodes=relations.map((rel,i)=>{
    const target=v21GraphTarget(rel),a=(Math.PI*2*i/Math.max(relations.length,1))-Math.PI/2;
    return {rel,target,a,x:cx+Math.cos(a)*radius,y:cy+Math.sin(a)*radius};
  });
  const edges=nodes.map((n,i)=>{
    const dx=n.x-cx,dy=n.y-cy;
    const x1=cx+dx*.36,y1=cy+dy*.36,x2=cx+dx*.75,y2=cy+dy*.75;
    const mx=cx+dx*.555,my=cy+dy*.555;
    const relation=v21RelationLabel(n.rel.relation_type);
    const width=Math.min(145,Math.max(66,relation.length*6.3+20));
    return '<g class="v21GraphEdgeGroup '+(n.rel.derived?'derived':'curated')+'">'+
      '<path d="M '+x1.toFixed(1)+' '+y1.toFixed(1)+' L '+x2.toFixed(1)+' '+y2.toFixed(1)+'" class="v21GraphEdge" marker-end="url(#v21Arrow)"/>'+
      '<g class="v21GraphEdgeLabel" transform="translate('+mx.toFixed(1)+' '+my.toFixed(1)+')">'+
        '<rect x="'+(-width/2).toFixed(1)+'" y="-12" width="'+width.toFixed(1)+'" height="24" rx="12"/>'+
        '<text text-anchor="middle" y="4">'+esc(compactText(relation,22))+'</text>'+
      '</g>'+
    '</g>';
  }).join('');
  const nodeHtml=nodes.map((n,i)=>{
    const label=esc(compactText(n.target.label,28));
    const kind=({lesson:'Fiche',entity:'Madagascar',process:'Procédé',use:'Usage',deposit_type:'Gisement',concept:'Concept'})[n.target.kind]||n.target.kind;
    return '<g class="v21GraphNode" data-index="'+i+'" transform="translate('+n.x.toFixed(1)+' '+n.y.toFixed(1)+')"><circle r="49"/><text text-anchor="middle" y="-3">'+label+'</text><text class="v21GraphNodeType" text-anchor="middle" y="18">'+esc(kind)+'</text></g>';
  }).join('');
  svg.setAttribute('viewBox','0 0 '+w+' '+h);
  svg.innerHTML=
    '<defs><marker id="v21Arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L7,3.5 L0,7 z" class="v21GraphArrow"/></marker></defs>'+
    edges+
    '<g class="v21GraphCenter" transform="translate('+cx+' '+cy+')"><circle r="72"/><text text-anchor="middle" y="-3">'+esc(compactText(l.name,24))+'</text><text class="v21GraphNodeType" text-anchor="middle" y="20">'+esc(compactSymbol(l))+'</text></g>'+
    nodeHtml;
  svg.querySelectorAll('.v21GraphNode').forEach(g=>g.onclick=()=>{
    const n=nodes[Number(g.dataset.index)];if(!n)return;
    if(n.target.kind==='lesson'&&n.target.id)openLesson(Number(n.target.id));
    else if(n.target.kind==='entity'&&n.target.id)openMadagascarEntityV21(Number(n.target.id));
  });
  list.innerHTML=relations.length?relations.map(r=>{
    const t=v21GraphTarget(r);
    return '<div class="v21RelationRow '+(r.derived?'derived':'curated')+'"><div class="v21RelationFlow"><span class="v21RelationSource">'+esc(compactText(l.name,22))+'</span><span class="v21RelationArrow">→</span><span class="v21RelationTarget">'+esc(t.label)+'</span></div><div class="v21RelationMeta"><b>'+esc(v21RelationLabel(r.relation_type))+'</b><small>'+esc(r.derived?'Relation dérivée automatiquement':r.note||'Relation validée')+'</small></div>'+(isAdmin()&&!r.derived?'<button class="plainIcon v21DeleteRelation" data-id="'+r.id+'" title="Supprimer">×</button>':'')+'</div>';
  }).join(''):'<div class="small">Aucune relation disponible pour cette fiche.</div>';
  list.querySelectorAll('.v21DeleteRelation').forEach(b=>b.onclick=()=>deleteKnowledgeRelationV21(Number(b.dataset.id)));
  renderKnowledgeAdminV21(l);
}
function renderKnowledgeAdminV21(l){
  if(!isAdmin())return;
  if($('v21RelationSource'))$('v21RelationSource').textContent=l?.name||'—';
  const lessonSel=$('v21TargetLesson');if(lessonSel)lessonSel.innerHTML='<option value="">Choisir une fiche…</option>'+lessons.filter(x=>!l||Number(x.id)!==Number(l.id)).map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join('');
  const entitySel=$('v21TargetEntity');if(entitySel)entitySel.innerHTML='<option value="">Choisir une entité…</option>'+madagascarEntitiesV21.map(e=>'<option value="'+e.id+'">'+esc(e.name)+'</option>').join('');
  updateRelationTargetControlsV21();
}
function updateRelationTargetControlsV21(){
  const kind=$('v21RelationTargetKind')?.value||'concept';
  $('v21TargetLessonWrap')?.classList.toggle('hidden',kind!=='lesson');
  $('v21TargetEntityWrap')?.classList.toggle('hidden',kind!=='madagascar_entity');
  $('v21TargetLabelWrap')?.classList.toggle('hidden',['lesson','madagascar_entity'].includes(kind));
}
async function addKnowledgeRelationV21(){
  if(!isAdmin())return;
  const source=Number($('knowledgeLessonSelect')?.value||0),kind=$('v21RelationTargetKind').value,type=$('v21RelationType').value;
  if(!source)return;
  const payload={source_lesson_id:source,relation_type:type,target_kind:kind,note:v21Text($('v21RelationNote').value)||null,created_by:session.user.id,updated_at:new Date().toISOString()};
  if(kind==='lesson'){payload.target_lesson_id=Number($('v21TargetLesson').value||0)||null;if(!payload.target_lesson_id)return toast('Choisis une fiche cible.')}
  else if(kind==='madagascar_entity'){payload.target_entity_id=Number($('v21TargetEntity').value||0)||null;if(!payload.target_entity_id)return toast('Choisis une entité Madagascar.')}
  else{payload.target_label=v21Text($('v21TargetLabel').value||'');if(!payload.target_label)return toast('Saisis la cible de la relation.')}
  const {error}=await sb.from('knowledge_relations').insert(payload);if(error)return toast(error.message);
  $('v21RelationNote').value='';$('v21TargetLabel').value='';await loadArizonaV21();renderKnowledgeGraphV21();toast('Relation ajoutée au graphe.');
}
async function deleteKnowledgeRelationV21(id){
  if(!isAdmin())return;
  const {error}=await sb.from('knowledge_relations').delete().eq('id',id);if(error)return toast(error.message);
  await loadArizonaV21();renderKnowledgeGraphV21();toast('Relation supprimée.');
}
async function onArizonaV21ViewChange(view){
  if(view!=='madagascar'&&view!=='knowledge')return;
  await loadArizonaV21();
  if(view==='madagascar')renderMadagascarV21();
  if(view==='knowledge')renderKnowledgePickerV21();
}
function renderArizonaV21(){
  if(!$('view-madagascar')?.classList.contains('hidden'))renderMadagascarV21();
  if(!$('view-knowledge')?.classList.contains('hidden'))renderKnowledgePickerV21();
}
if($('madagascarSearch'))$('madagascarSearch').addEventListener('input',renderMadagascarV21);
if($('v21MgTypeFilter'))$('v21MgTypeFilter').onchange=renderMadagascarV21;
if($('v21MgRegionFilter'))$('v21MgRegionFilter').onchange=renderMadagascarV21;
if($('v21MgSaveBtn'))$('v21MgSaveBtn').onclick=saveMadagascarEntityV21;
if($('v21MgResetBtn'))$('v21MgResetBtn').onclick=()=>populateMadagascarFormV21();
if($('knowledgeLessonSelect'))$('knowledgeLessonSelect').onchange=renderKnowledgeGraphV21;
if($('v21RelationTargetKind'))$('v21RelationTargetKind').onchange=updateRelationTargetControlsV21;
if($('v21AddRelationBtn'))$('v21AddRelationBtn').onclick=addKnowledgeRelationV21;
if($('v21CloseEntityModal'))$('v21CloseEntityModal').onclick=()=>$('v21MgEntityModal').classList.remove('open');
if($('v21MgEntityModal'))$('v21MgEntityModal').addEventListener('click',e=>{if(e.target===$('v21MgEntityModal'))$('v21MgEntityModal').classList.remove('open')});
