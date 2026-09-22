
let miningProjectsV215=[],projectLessonsV215=[],fieldCampaignsV215=[],fieldSamplesV215=[],assayResultsV215=[],v215Loaded=false,v215Loading=null;
let activeProjectIdV215=null,activeProjectTabV215='overview';

function v215Text(v){return String(v??'').replace(/\s+/g,' ').trim()}
function v215ProjectType(v){return ({exploration:'Exploration',development:'Développement',exploitation:'Exploitation',study:'Étude',permit:'Permis',other:'Autre'})[v]||v}
function v215ProjectStatus(v){return ({active:'Actif',planned:'Planifié',paused:'En pause',completed:'Terminé',archived:'Archivé'})[v]||v}
function v215CampaignType(v){return ({prospecting:'Prospection',mapping:'Cartographie',geochemistry:'Géochimie',geophysics:'Géophysique',drilling:'Forage',sampling:'Échantillonnage',environmental:'Environnement',other:'Autre'})[v]||v}
function v215SampleType(v){return ({rock:'Roche',soil:'Sol',stream_sediment:'Sédiment de ruisseau',trench:'Tranchée',channel:'Rainure',drill_core:'Carotte de forage',grab:'Prélèvement ponctuel',water:'Eau',other:'Autre'})[v]||v}
function v215ProjectById(id){return miningProjectsV215.find(p=>Number(p.id)===Number(id))}
function v215CampaignById(id){return fieldCampaignsV215.find(c=>Number(c.id)===Number(id))}
function v215SampleById(id){return fieldSamplesV215.find(s=>Number(s.id)===Number(id))}
function v215LessonsForProject(id){
  const ids=projectLessonsV215.filter(x=>Number(x.project_id)===Number(id)).map(x=>Number(x.lesson_id));
  return lessons.filter(l=>ids.includes(Number(l.id)));
}
function v215CampaignsForProject(id){return fieldCampaignsV215.filter(x=>Number(x.project_id)===Number(id))}
function v215SamplesForProject(id){return fieldSamplesV215.filter(x=>Number(x.project_id)===Number(id))}
function v215AssaysForSample(id){return assayResultsV215.filter(x=>Number(x.sample_id)===Number(id))}
function v215AssaysForProject(id){
  const sampleIds=new Set(v215SamplesForProject(id).map(x=>Number(x.id)));
  return assayResultsV215.filter(a=>sampleIds.has(Number(a.sample_id)));
}

async function loadArizonaV215(force=false){
  if(!session)return;
  if(v215Loaded&&!force)return;
  if(v215Loading&&!force)return v215Loading;
  const loadToken=typeof beginLoading==='function'?beginLoading('Chargement des projets…',{delay:80,subtitle:'Campagnes, échantillons et analyses.'}):null;
  v215Loading=(async()=>{
    const [p,l,c,s,a]=await Promise.all([
      sb.from('mining_projects').select('*').order('updated_at',{ascending:false}),
      sb.from('project_lessons').select('*'),
      sb.from('field_campaigns').select('*').order('start_date',{ascending:false,nullsFirst:false}).order('id',{ascending:false}),
      sb.from('field_samples').select('*').order('collected_at',{ascending:false,nullsFirst:false}).order('id',{ascending:false}),
      sb.from('assay_results').select('*').order('analyzed_at',{ascending:false,nullsFirst:false}).order('id',{ascending:false})
    ]);
    if(p.error||l.error||c.error||s.error||a.error){console.warn('ARIZONA V21.5',p.error||l.error||c.error||s.error||a.error);return}
    miningProjectsV215=p.data||[];projectLessonsV215=l.data||[];fieldCampaignsV215=c.data||[];fieldSamplesV215=s.data||[];assayResultsV215=a.data||[];
    if(activeProjectIdV215&&!v215ProjectById(activeProjectIdV215))activeProjectIdV215=null;
    if(!activeProjectIdV215&&miningProjectsV215[0])activeProjectIdV215=Number(miningProjectsV215[0].id);
    v215Loaded=true;
  })();
  try{await v215Loading}finally{v215Loading=null;if(loadToken&&typeof endLoading==='function')endLoading(loadToken)}
}

function renderProjectsV215(){
  const list=$('v215ProjectList'),workspace=$('v215ProjectWorkspace');if(!list||!workspace)return;
  const q=v215Text($('v215ProjectSearch')?.value||'').toLowerCase();
  const visible=miningProjectsV215.filter(p=>!q||[p.name,p.project_code,p.region,p.district,p.commune,p.permit_ref,p.operator_name].join(' ').toLowerCase().includes(q));
  list.innerHTML=visible.length?visible.map(p=>{
    const active=Number(p.id)===Number(activeProjectIdV215);
    const sampleCount=v215SamplesForProject(p.id).length,campaignCount=v215CampaignsForProject(p.id).length;
    return '<button class="card v215ProjectCard '+(active?'active':'')+'" data-project="'+p.id+'">'+
      '<div class="v215ProjectCardTop"><div><div class="eyebrow">'+esc(v215ProjectType(p.project_type))+'</div><b>'+esc(p.name)+'</b></div><span class="azChip">'+esc(v215ProjectStatus(p.status))+'</span></div>'+
      '<small>'+esc([p.project_code,p.region].filter(Boolean).join(' · ')||'Sans localisation')+'</small>'+
      '<div class="v215ProjectMiniStats"><span>'+campaignCount+' campagne'+(campaignCount>1?'s':'')+'</span><span>'+sampleCount+' échantillon'+(sampleCount>1?'s':'')+'</span></div>'+
    '</button>';
  }).join(''):'<div class="card cardPad small">Aucun projet.</div>';
  list.querySelectorAll('[data-project]').forEach(b=>b.onclick=()=>{activeProjectIdV215=Number(b.dataset.project);activeProjectTabV215='overview';renderProjectsV215()});
  renderProjectWorkspaceV215();
}
function renderProjectWorkspaceV215(){
  const box=$('v215ProjectWorkspace');if(!box)return;
  const p=v215ProjectById(activeProjectIdV215);
  if(!p){box.innerHTML='<div class="card cardPad v215EmptyProject"><div class="eyebrow">Mode Projet</div><h2>Aucun projet sélectionné</h2><div class="small">Crée un projet pour centraliser tes campagnes terrain, échantillons et résultats analytiques.</div></div>';return}
  const campaigns=v215CampaignsForProject(p.id),samples=v215SamplesForProject(p.id),assays=v215AssaysForProject(p.id),linked=v215LessonsForProject(p.id);
  box.innerHTML=
    '<div class="card v215ProjectHero">'+
      '<div><div class="eyebrow">'+esc(v215ProjectType(p.project_type))+'</div><h2>'+esc(p.name)+'</h2><div class="small">'+esc([p.project_code,p.permit_ref,p.region,p.district].filter(Boolean).join(' · '))+'</div></div>'+
      '<div class="v215HeroActions"><span class="azChip">'+esc(v215ProjectStatus(p.status))+'</span><button class="btn" id="v215EditProject">Modifier</button></div>'+
    '</div>'+
    '<div class="v215ProjectKpis">'+
      '<div class="card"><strong>'+campaigns.length+'</strong><span>campagnes</span></div>'+
      '<div class="card"><strong>'+samples.length+'</strong><span>échantillons</span></div>'+
      '<div class="card"><strong>'+assays.length+'</strong><span>analyses</span></div>'+
      '<div class="card"><strong>'+linked.length+'</strong><span>substances</span></div>'+
    '</div>'+
    '<div class="v215Tabs">'+
      ['overview','campaigns','samples','assays'].map(t=>'<button class="tab '+(activeProjectTabV215===t?'active':'')+'" data-v215-tab="'+t+'">'+({overview:'Aperçu',campaigns:'Campagnes',samples:'Échantillons',assays:'Analyses'})[t]+'</button>').join('')+
    '</div>'+
    '<div id="v215TabContent"></div>';
  $('v215EditProject').onclick=()=>openProjectEditorV215(p);
  box.querySelectorAll('[data-v215-tab]').forEach(b=>b.onclick=()=>{activeProjectTabV215=b.dataset.v215Tab;renderProjectWorkspaceV215()});
  renderProjectTabV215();
}
function renderProjectTabV215(){
  const box=$('v215TabContent'),p=v215ProjectById(activeProjectIdV215);if(!box||!p)return;
  if(activeProjectTabV215==='campaigns')return renderCampaignsTabV215(box,p);
  if(activeProjectTabV215==='samples')return renderSamplesTabV215(box,p);
  if(activeProjectTabV215==='assays')return renderAssaysTabV215(box,p);
  renderOverviewTabV215(box,p);
}
function renderOverviewTabV215(box,p){
  const linked=v215LessonsForProject(p.id);
  const location=[p.fokontany,p.commune,p.district,p.region].filter(Boolean).join(' · ')||'Non renseignée';
  const coord=p.latitude!=null&&p.longitude!=null?p.latitude+', '+p.longitude:'—';
  box.innerHTML=
    '<div class="v215OverviewGrid">'+
      '<div class="card cardPad"><div class="eyebrow">Informations</div><div class="v215InfoGrid">'+
        '<div><span>Localisation</span><b>'+esc(location)+'</b></div><div><span>Coordonnées</span><b>'+esc(coord)+'</b></div>'+
        '<div><span>Opérateur</span><b>'+esc(p.operator_name||'—')+'</b></div><div><span>Permis</span><b>'+esc(p.permit_ref||'—')+'</b></div>'+
      '</div></div>'+
      '<div class="card cardPad"><div class="eyebrow">Substances ciblées</div><div class="azChips v215LessonChips">'+(linked.length?linked.map(l=>'<button class="azChip" data-v215-open-lesson="'+l.id+'">'+esc(l.name)+'</button>').join(''):'<span class="small">Aucune substance liée.</span>')+'</div></div>'+
    '</div>'+
    '<div class="card cardPad v215ProjectNarrative"><div class="eyebrow">Objectif</div><div>'+esc(p.objective||'Non renseigné')+'</div></div>'+
    (p.notes?'<div class="card cardPad v215ProjectNarrative"><div class="eyebrow">Notes</div><div>'+esc(p.notes)+'</div></div>':'');
  box.querySelectorAll('[data-v215-open-lesson]').forEach(b=>b.onclick=()=>openLesson(Number(b.dataset.v215OpenLesson)));
}
function renderCampaignsTabV215(box,p){
  const arr=v215CampaignsForProject(p.id);
  box.innerHTML='<div class="v215TabHead"><div><div class="eyebrow">Terrain</div><h3>Campagnes</h3></div><button id="v215NewCampaign" class="btn primary">+ Campagne</button></div>'+
    '<div class="v215CampaignGrid">'+(arr.length?arr.map(c=>{
      const count=fieldSamplesV215.filter(s=>Number(s.campaign_id)===Number(c.id)).length;
      return '<article class="card v215CampaignCard"><div><div class="eyebrow">'+esc(v215CampaignType(c.campaign_type))+'</div><h4>'+esc(c.name)+'</h4><div class="small">'+esc([c.start_date,c.end_date].filter(Boolean).join(' → ')||'Dates non renseignées')+'</div></div><div class="v215CampaignFooter"><span>'+count+' échantillon'+(count>1?'s':'')+'</span><button class="plainIcon" data-edit-campaign="'+c.id+'" title="Modifier">✎</button></div></article>';
    }).join(''):'<div class="card cardPad small">Aucune campagne terrain.</div>')+'</div>';
  $('v215NewCampaign').onclick=()=>openCampaignEditorV215(null,p.id);
  box.querySelectorAll('[data-edit-campaign]').forEach(b=>b.onclick=()=>openCampaignEditorV215(v215CampaignById(Number(b.dataset.editCampaign)),p.id));
}
function renderSamplesTabV215(box,p){
  const arr=v215SamplesForProject(p.id);
  box.innerHTML='<div class="v215TabHead"><div><div class="eyebrow">Terrain</div><h3>Échantillons</h3></div><button id="v215NewSample" class="btn primary">+ Échantillon</button></div>'+
    '<div class="v215SampleList">'+(arr.length?arr.map(s=>{
      const assays=v215AssaysForSample(s.id),camp=v215CampaignById(s.campaign_id);
      return '<article class="card v215SampleCard"><div class="v215SampleMain"><div class="v215SampleCode">'+esc(s.sample_code)+'</div><div><b>'+esc(v215SampleType(s.sample_type))+'</b><small>'+esc([camp?.name,s.lithology,s.sampling_method].filter(Boolean).join(' · '))+'</small></div></div><div class="v215SampleMeta"><span>'+assays.length+' analyse'+(assays.length>1?'s':'')+'</span><button class="btn v215AddAssay" data-sample="'+s.id+'">+ Analyse</button><button class="plainIcon" data-edit-sample="'+s.id+'" title="Modifier">✎</button></div></article>';
    }).join(''):'<div class="card cardPad small">Aucun échantillon.</div>')+'</div>';
  $('v215NewSample').onclick=()=>openSampleEditorV215(null,p.id);
  box.querySelectorAll('[data-edit-sample]').forEach(b=>b.onclick=()=>openSampleEditorV215(v215SampleById(Number(b.dataset.editSample)),p.id));
  box.querySelectorAll('[data-sample]').forEach(b=>b.onclick=()=>openAssayEditorV215(null,Number(b.dataset.sample)));
}
function renderAssaysTabV215(box,p){
  const assays=v215AssaysForProject(p.id);
  box.innerHTML='<div class="v215TabHead"><div><div class="eyebrow">Laboratoire</div><h3>Résultats analytiques</h3></div></div>'+
    '<div class="tableWrap"><table class="v215AssayTable"><thead><tr><th>Échantillon</th><th>Analyte</th><th>Résultat</th><th>Méthode</th><th>Laboratoire</th><th>Date</th><th></th></tr></thead><tbody>'+
    (assays.length?assays.map(a=>{const s=v215SampleById(a.sample_id);return '<tr><td><b>'+esc(s?.sample_code||'—')+'</b></td><td>'+esc(a.analyte)+'</td><td>'+esc(a.result_value==null?'—':a.result_value+' '+a.unit)+'</td><td>'+esc(a.method||'—')+'</td><td>'+esc(a.lab_name||'—')+'</td><td>'+esc(a.analyzed_at||'—')+'</td><td><button class="plainIcon" data-edit-assay="'+a.id+'" title="Modifier">✎</button></td></tr>'}).join(''):'<tr><td colspan="7" class="small">Aucune analyse.</td></tr>')+
    '</tbody></table></div>';
  box.querySelectorAll('[data-edit-assay]').forEach(b=>{const a=assayResultsV215.find(x=>Number(x.id)===Number(b.dataset.editAssay));b.onclick=()=>openAssayEditorV215(a,a.sample_id)});
}

function openV215Modal(title,html){
  $('v215EditorTitle').textContent=title;$('v215EditorBody').innerHTML=html;$('v215EditorModal').classList.add('open');
}
function closeV215Modal(){$('v215EditorModal')?.classList.remove('open')}
function projectLessonPickerV215(selected=[]){
  const set=new Set(selected.map(Number));
  return '<div class="v215LessonPicker">'+lessons.map(l=>'<label><input type="checkbox" value="'+l.id+'" '+(set.has(Number(l.id))?'checked':'')+'><span>'+esc(l.name)+'</span></label>').join('')+'</div>';
}
function openProjectEditorV215(p=null){
  const linked=p?v215LessonsForProject(p.id).map(l=>Number(l.id)):[];
  openV215Modal(p?'Modifier le projet':'Nouveau projet',
    '<div class="grid2">'+
      '<div><div class="small">Nom *</div><input id="v215FName" class="input" value="'+esc(p?.name||'')+'"></div>'+
      '<div><div class="small">Code projet</div><input id="v215FCode" class="input" value="'+esc(p?.project_code||'')+'"></div>'+
      '<div><div class="small">Type</div><select id="v215FType" class="select">'+['exploration','development','exploitation','study','permit','other'].map(v=>'<option value="'+v+'" '+(p?.project_type===v?'selected':'')+'>'+v215ProjectType(v)+'</option>').join('')+'</select></div>'+
      '<div><div class="small">Statut</div><select id="v215FStatus" class="select">'+['active','planned','paused','completed','archived'].map(v=>'<option value="'+v+'" '+((p?.status||'active')===v?'selected':'')+'>'+v215ProjectStatus(v)+'</option>').join('')+'</select></div>'+
      '<div><div class="small">Région</div><input id="v215FRegion" class="input" value="'+esc(p?.region||'')+'"></div>'+
      '<div><div class="small">District</div><input id="v215FDistrict" class="input" value="'+esc(p?.district||'')+'"></div>'+
      '<div><div class="small">Commune</div><input id="v215FCommune" class="input" value="'+esc(p?.commune||'')+'"></div>'+
      '<div><div class="small">Fokontany</div><input id="v215FFokontany" class="input" value="'+esc(p?.fokontany||'')+'"></div>'+
      '<div><div class="small">Latitude</div><input id="v215FLat" class="input" type="number" step="0.000001" value="'+esc(p?.latitude??'')+'"></div>'+
      '<div><div class="small">Longitude</div><input id="v215FLon" class="input" type="number" step="0.000001" value="'+esc(p?.longitude??'')+'"></div>'+
      '<div><div class="small">Référence permis</div><input id="v215FPermit" class="input" value="'+esc(p?.permit_ref||'')+'"></div>'+
      '<div><div class="small">Opérateur</div><input id="v215FOperator" class="input" value="'+esc(p?.operator_name||'')+'"></div>'+
    '</div>'+
    '<div class="small" style="margin-top:10px">Substances liées</div>'+projectLessonPickerV215(linked)+
    '<div style="margin-top:10px"><div class="small">Objectif</div><textarea id="v215FObjective" class="textarea v20SmallTextarea">'+esc(p?.objective||'')+'</textarea></div>'+
    '<div style="margin-top:8px"><div class="small">Notes</div><textarea id="v215FNotes" class="textarea v20SmallTextarea">'+esc(p?.notes||'')+'</textarea></div>'+
    '<div class="v215ModalActions"><button id="v215SaveProject" class="btn primary">'+(p?'Enregistrer':'Créer')+'</button>'+(p?'<button id="v215DeleteProject" class="btn danger">Supprimer</button>':'')+'</div>');
  $('v215SaveProject').onclick=()=>saveProjectV215(p?.id||null);
  if(p)$('v215DeleteProject').onclick=()=>deleteProjectV215(p.id);
}
async function saveProjectV215(id=null){
  const name=v215Text($('v215FName').value);if(!name)return toast('Le nom du projet est requis.');
  const num=id=>$(id).value===''?null:Number($(id).value);
  const payload={
    name,project_code:v215Text($('v215FCode').value)||null,project_type:$('v215FType').value,status:$('v215FStatus').value,
    region:v215Text($('v215FRegion').value)||null,district:v215Text($('v215FDistrict').value)||null,commune:v215Text($('v215FCommune').value)||null,
    fokontany:v215Text($('v215FFokontany').value)||null,latitude:num('v215FLat'),longitude:num('v215FLon'),
    permit_ref:v215Text($('v215FPermit').value)||null,operator_name:v215Text($('v215FOperator').value)||null,
    objective:v215Text($('v215FObjective').value)||null,notes:v215Text($('v215FNotes').value)||null,updated_at:new Date().toISOString()
  };
  let projectId=id;
  if(id){const {error}=await sb.from('mining_projects').update(payload).eq('id',id);if(error)return toast(error.message)}
  else{const {data,error}=await sb.from('mining_projects').insert({...payload,owner_user_id:session.user.id}).select('id').single();if(error)return toast(error.message);projectId=Number(data.id)}
  const chosen=[...document.querySelectorAll('.v215LessonPicker input:checked')].map(x=>Number(x.value));
  const {error:delErr}=await sb.from('project_lessons').delete().eq('project_id',projectId);if(delErr)return toast(delErr.message);
  if(chosen.length){const {error}=await sb.from('project_lessons').insert(chosen.map((lessonId,i)=>({project_id:projectId,lesson_id:lessonId,relation_type:i===0?'target':'associated'})));if(error)return toast(error.message)}
  activeProjectIdV215=Number(projectId);closeV215Modal();await loadArizonaV215(true);renderProjectsV215();toast(id?'Projet mis à jour.':'Projet créé.');
}
async function deleteProjectV215(id){
  if(!confirm('Supprimer ce projet et toutes ses campagnes, échantillons et analyses ?'))return;
  const {error}=await sb.from('mining_projects').delete().eq('id',id);if(error)return toast(error.message);
  activeProjectIdV215=null;closeV215Modal();await loadArizonaV215(true);renderProjectsV215();toast('Projet supprimé.');
}

function openCampaignEditorV215(c=null,projectId=activeProjectIdV215){
  openV215Modal(c?'Modifier la campagne':'Nouvelle campagne',
    '<div class="grid2">'+
      '<div><div class="small">Nom *</div><input id="v215CName" class="input" value="'+esc(c?.name||'')+'"></div>'+
      '<div><div class="small">Type</div><select id="v215CType" class="select">'+['prospecting','mapping','geochemistry','geophysics','drilling','sampling','environmental','other'].map(v=>'<option value="'+v+'" '+((c?.campaign_type||'prospecting')===v?'selected':'')+'>'+v215CampaignType(v)+'</option>').join('')+'</select></div>'+
      '<div><div class="small">Début</div><input id="v215CStart" class="input" type="date" value="'+esc(c?.start_date||'')+'"></div>'+
      '<div><div class="small">Fin</div><input id="v215CEnd" class="input" type="date" value="'+esc(c?.end_date||'')+'"></div>'+
      '<div><div class="small">Équipe</div><input id="v215CTeam" class="input" value="'+esc(c?.team||'')+'"></div>'+
    '</div>'+
    '<div style="margin-top:8px"><div class="small">Objectif</div><textarea id="v215CObjective" class="textarea v20SmallTextarea">'+esc(c?.objective||'')+'</textarea></div>'+
    '<div style="margin-top:8px"><div class="small">Notes</div><textarea id="v215CNotes" class="textarea v20SmallTextarea">'+esc(c?.notes||'')+'</textarea></div>'+
    '<div class="v215ModalActions"><button id="v215SaveCampaign" class="btn primary">Enregistrer</button>'+(c?'<button id="v215DeleteCampaign" class="btn danger">Supprimer</button>':'')+'</div>');
  $('v215SaveCampaign').onclick=()=>saveCampaignV215(c?.id||null,projectId);
  if(c)$('v215DeleteCampaign').onclick=()=>deleteCampaignV215(c.id);
}
async function saveCampaignV215(id,projectId){
  const name=v215Text($('v215CName').value);if(!name)return toast('Le nom de la campagne est requis.');
  const payload={project_id:Number(projectId),name,campaign_type:$('v215CType').value,start_date:$('v215CStart').value||null,end_date:$('v215CEnd').value||null,team:v215Text($('v215CTeam').value)||null,objective:v215Text($('v215CObjective').value)||null,notes:v215Text($('v215CNotes').value)||null,updated_at:new Date().toISOString()};
  const q=id?sb.from('field_campaigns').update(payload).eq('id',id):sb.from('field_campaigns').insert(payload);
  const {error}=await q;if(error)return toast(error.message);closeV215Modal();await loadArizonaV215(true);activeProjectTabV215='campaigns';renderProjectsV215();toast('Campagne enregistrée.');
}
async function deleteCampaignV215(id){
  if(!confirm('Supprimer cette campagne ? Les échantillons seront conservés mais détachés de la campagne.'))return;
  const {error}=await sb.from('field_campaigns').delete().eq('id',id);if(error)return toast(error.message);
  closeV215Modal();await loadArizonaV215(true);renderProjectsV215();toast('Campagne supprimée.');
}

function campaignOptionsV215(projectId,selected){
  return '<option value="">Sans campagne</option>'+v215CampaignsForProject(projectId).map(c=>'<option value="'+c.id+'" '+(Number(selected)===Number(c.id)?'selected':'')+'>'+esc(c.name)+'</option>').join('');
}
function openSampleEditorV215(s=null,projectId=activeProjectIdV215){
  openV215Modal(s?'Modifier l’échantillon':'Nouvel échantillon',
    '<div class="grid2">'+
      '<div><div class="small">Code échantillon *</div><input id="v215SCode" class="input" value="'+esc(s?.sample_code||'')+'"></div>'+
      '<div><div class="small">Type</div><select id="v215SType" class="select">'+['rock','soil','stream_sediment','trench','channel','drill_core','grab','water','other'].map(v=>'<option value="'+v+'" '+((s?.sample_type||'rock')===v?'selected':'')+'>'+v215SampleType(v)+'</option>').join('')+'</select></div>'+
      '<div><div class="small">Campagne</div><select id="v215SCampaign" class="select">'+campaignOptionsV215(projectId,s?.campaign_id)+'</select></div>'+
      '<div><div class="small">Méthode d’échantillonnage</div><input id="v215SMethod" class="input" value="'+esc(s?.sampling_method||'')+'"></div>'+
      '<div><div class="small">Latitude</div><input id="v215SLat" class="input" type="number" step="0.000001" value="'+esc(s?.latitude??'')+'"></div>'+
      '<div><div class="small">Longitude</div><input id="v215SLon" class="input" type="number" step="0.000001" value="'+esc(s?.longitude??'')+'"></div>'+
      '<div><div class="small">Élévation (m)</div><input id="v215SElev" class="input" type="number" step="any" value="'+esc(s?.elevation_m??'')+'"></div>'+
      '<div><div class="small">Poids (kg)</div><input id="v215SWeight" class="input" type="number" step="any" value="'+esc(s?.weight_kg??'')+'"></div>'+
      '<div><div class="small">Profondeur début (m)</div><input id="v215SFrom" class="input" type="number" step="any" value="'+esc(s?.depth_from_m??'')+'"></div>'+
      '<div><div class="small">Profondeur fin (m)</div><input id="v215STo" class="input" type="number" step="any" value="'+esc(s?.depth_to_m??'')+'"></div>'+
      '<div><div class="small">Lithologie</div><input id="v215SLith" class="input" value="'+esc(s?.lithology||'')+'"></div>'+
      '<div><div class="small">Altération</div><input id="v215SAlter" class="input" value="'+esc(s?.alteration||'')+'"></div>'+
      '<div><div class="small">Minéralisation</div><input id="v215SMineral" class="input" value="'+esc(s?.mineralization||'')+'"></div>'+
      '<div><div class="small">Date / heure prélèvement</div><input id="v215SCollected" class="input" type="datetime-local" value="'+esc(s?.collected_at?String(s.collected_at).slice(0,16):'')+'"></div>'+
    '</div>'+
    '<div style="margin-top:8px"><div class="small">Description</div><textarea id="v215SDesc" class="textarea v20SmallTextarea">'+esc(s?.description||'')+'</textarea></div>'+
    '<div class="v215ModalActions"><button id="v215SaveSample" class="btn primary">Enregistrer</button>'+(s?'<button id="v215DeleteSample" class="btn danger">Supprimer</button>':'')+'</div>');
  $('v215SaveSample').onclick=()=>saveSampleV215(s?.id||null,projectId);
  if(s)$('v215DeleteSample').onclick=()=>deleteSampleV215(s.id);
}
async function saveSampleV215(id,projectId){
  const code=v215Text($('v215SCode').value);if(!code)return toast('Le code échantillon est requis.');
  const n=id=>$(id).value===''?null:Number($(id).value);
  const payload={project_id:Number(projectId),campaign_id:n('v215SCampaign'),sample_code:code,sample_type:$('v215SType').value,sampling_method:v215Text($('v215SMethod').value)||null,latitude:n('v215SLat'),longitude:n('v215SLon'),elevation_m:n('v215SElev'),depth_from_m:n('v215SFrom'),depth_to_m:n('v215STo'),weight_kg:n('v215SWeight'),lithology:v215Text($('v215SLith').value)||null,alteration:v215Text($('v215SAlter').value)||null,mineralization:v215Text($('v215SMineral').value)||null,description:v215Text($('v215SDesc').value)||null,collected_at:$('v215SCollected').value?new Date($('v215SCollected').value).toISOString():null,updated_at:new Date().toISOString()};
  const q=id?sb.from('field_samples').update(payload).eq('id',id):sb.from('field_samples').insert(payload);
  const {error}=await q;if(error)return toast(error.message);closeV215Modal();await loadArizonaV215(true);activeProjectTabV215='samples';renderProjectsV215();toast('Échantillon enregistré.');
}
async function deleteSampleV215(id){
  if(!confirm('Supprimer cet échantillon et toutes ses analyses ?'))return;
  const {error}=await sb.from('field_samples').delete().eq('id',id);if(error)return toast(error.message);
  closeV215Modal();await loadArizonaV215(true);renderProjectsV215();toast('Échantillon supprimé.');
}

function openAssayEditorV215(a=null,sampleId){
  const sample=v215SampleById(sampleId);
  openV215Modal(a?'Modifier l’analyse':'Nouvelle analyse',
    '<div class="card cardPad v215AssaySample"><div class="eyebrow">Échantillon</div><b>'+esc(sample?.sample_code||'—')+'</b></div>'+
    '<div class="grid2">'+
      '<div><div class="small">Analyte *</div><input id="v215AAnalyte" class="input" placeholder="Ex. Au, Pt, Cu, Ni" value="'+esc(a?.analyte||'')+'"></div>'+
      '<div><div class="small">Résultat</div><input id="v215AValue" class="input" type="number" step="any" value="'+esc(a?.result_value??'')+'"></div>'+
      '<div><div class="small">Unité</div><select id="v215AUnit" class="select">'+['ppm','ppb','percent','g/t','mg/kg','other'].map(v=>'<option value="'+v+'" '+((a?.unit||'ppm')===v?'selected':'')+'>'+v+'</option>').join('')+'</select></div>'+
      '<div><div class="small">Limite de détection</div><input id="v215ALimit" class="input" type="number" step="any" value="'+esc(a?.detection_limit??'')+'"></div>'+
      '<div><div class="small">Laboratoire</div><input id="v215ALab" class="input" value="'+esc(a?.lab_name||'')+'"></div>'+
      '<div><div class="small">Méthode</div><input id="v215AMethod" class="input" value="'+esc(a?.method||'')+'"></div>'+
      '<div><div class="small">Référence certificat</div><input id="v215ACert" class="input" value="'+esc(a?.certificate_ref||'')+'"></div>'+
      '<div><div class="small">Date analyse</div><input id="v215ADate" class="input" type="date" value="'+esc(a?.analyzed_at||'')+'"></div>'+
    '</div>'+
    '<div style="margin-top:8px"><div class="small">Notes</div><textarea id="v215ANotes" class="textarea v20SmallTextarea">'+esc(a?.notes||'')+'</textarea></div>'+
    '<div class="v215ModalActions"><button id="v215SaveAssay" class="btn primary">Enregistrer</button>'+(a?'<button id="v215DeleteAssay" class="btn danger">Supprimer</button>':'')+'</div>');
  $('v215SaveAssay').onclick=()=>saveAssayV215(a?.id||null,sampleId);
  if(a)$('v215DeleteAssay').onclick=()=>deleteAssayV215(a.id);
}
async function saveAssayV215(id,sampleId){
  const analyte=v215Text($('v215AAnalyte').value);if(!analyte)return toast('L’analyte est requis.');
  const n=id=>$(id).value===''?null:Number($(id).value);
  const payload={sample_id:Number(sampleId),analyte,result_value:n('v215AValue'),unit:$('v215AUnit').value,detection_limit:n('v215ALimit'),lab_name:v215Text($('v215ALab').value)||null,method:v215Text($('v215AMethod').value)||null,certificate_ref:v215Text($('v215ACert').value)||null,notes:v215Text($('v215ANotes').value)||null,analyzed_at:$('v215ADate').value||null,updated_at:new Date().toISOString()};
  const q=id?sb.from('assay_results').update(payload).eq('id',id):sb.from('assay_results').insert(payload);
  const {error}=await q;if(error)return toast(error.message);closeV215Modal();await loadArizonaV215(true);activeProjectTabV215='assays';renderProjectsV215();toast('Analyse enregistrée.');
}
async function deleteAssayV215(id){
  const {error}=await sb.from('assay_results').delete().eq('id',id);if(error)return toast(error.message);
  closeV215Modal();await loadArizonaV215(true);renderProjectsV215();toast('Analyse supprimée.');
}
async function onArizonaV215ViewChange(view){if(view!=='projects')return;await loadArizonaV215();renderProjectsV215()}
function renderArizonaV215(){if(!$('view-projects')?.classList.contains('hidden'))renderProjectsV215()}

if($('v215NewProjectBtn'))$('v215NewProjectBtn').onclick=()=>openProjectEditorV215();
if($('v215ProjectSearch'))$('v215ProjectSearch').oninput=renderProjectsV215;
if($('v215CloseEditor'))$('v215CloseEditor').onclick=closeV215Modal;
if($('v215EditorModal'))$('v215EditorModal').addEventListener('click',e=>{if(e.target===$('v215EditorModal'))closeV215Modal()});
