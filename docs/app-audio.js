// ARIZONA V21.10 · Fiches vocales / narration documentaire
const AZ_AUDIO_WPM=136;
const AZ_AUDIO_MODES={
  short:{label:'Résumé 2 min',minutes:2,maxWords:300},
  daily:{label:'Quotidien 5 min',minutes:5,maxWords:720},
  deep:{label:'Approfondir 10 min',minutes:10,maxWords:1420}
};
const AZ_AUDIO_PROFILES={
  documentary:{label:'Documentaire',rate:.94,pitch:.86},
  calm:{label:'Narrateur posé',rate:.90,pitch:.82},
  dynamic:{label:'Documentaire dynamique',rate:1.02,pitch:.90},
  natural:{label:'Naturel',rate:.98,pitch:.94}
};
const AZ_AUDIO_MALE_HINT=/thomas|henri|paul|daniel|nicolas|mathieu|yann|louis|hugo|alain|jean|remy|rémy|gilles|jacques|claude|male|homme|masculin/i;
const AZ_AUDIO_NATURAL_HINT=/neural|natural|premium|enhanced|google|microsoft|samsung|android|wave|studio/i;
const AZ_AUDIO_SETTINGS_KEY='az_audio_settings_v4';

function azAudioLoadSettings(){
  try{
    const x=JSON.parse(localStorage.getItem(AZ_AUDIO_SETTINGS_KEY)||'{}');
    return {profile:x.profile||'documentary',source:x.source||'auto',voiceURI:x.voiceURI||'',speed:Number(x.speed)||1,background:x.background!==false};
  }catch{return{profile:'documentary',source:'auto',voiceURI:'',speed:1,background:true}}
}
const azAudioSettings=azAudioLoadSettings();
const azAudioState={lessonId:null,lesson:null,mode:'daily',script:'',chunks:[],index:0,playing:false,paused:false,utterance:null};

function azAudioSaveSettings(){try{localStorage.setItem(AZ_AUDIO_SETTINGS_KEY,JSON.stringify(azAudioSettings))}catch{}}
function azLocalISODate(){const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
function azAudioIsToday(l){return !!l&&!isWeeklyReport(l)&&String(l.lesson_date||'')===azLocalISODate()}
function azAudioClean(v){return String(v||'').replace(/\\+/g,' ').replace(/^[-•]\s*/gm,'').replace(/\s+/g,' ').replace(/\s+([,.;:!?])/g,'$1').trim()}
function azAudioWords(v,max){const a=azAudioClean(v).split(/\s+/).filter(Boolean);return a.slice(0,max).join(' ')+(a.length>max?'…':'')}
function azAudioPart(raw,h,max,label=''){const s=azAudioWords(section(raw,h),max);return s?(label?label+' '+s:s):''}

function azAudioModeBudgets(mode){
  if(mode==='short')return{summary:65,chemphys:35,geo:40,mg:48,ops:45,market:40,risks:30,retain:32};
  if(mode==='deep')return{summary:140,chemphys:125,geo:150,zones:90,mg:175,ops:190,uses:130,market:180,risks:140,retain:90,case:120};
  return{summary:100,chemphys:65,geo:80,zones:45,mg:95,ops:100,uses:65,market:95,risks:80,retain:55,case:55};
}
function buildAudioScript(l,mode='daily'){
  if(!l)return'';
  mode=AZ_AUDIO_MODES[mode]?mode:'daily';
  const cacheKey='az_audio_script_v5_'+l.id+'_'+mode+'_'+String(l.updated_at||l.lesson_date||'');
  try{const cached=localStorage.getItem(cacheKey);if(cached)return cached}catch{}
  const raw=String(l.raw_text||''),b=azAudioModeBudgets(mode),modeLabel=AZ_AUDIO_MODES[mode].label;
  const chemphys=azAudioWords([section(raw,'CARACTÉRISTIQUES CHIMIQUES'),section(raw,'CARACTÉRISTIQUES PHYSIQUES')].join(' '),b.chemphys);
  const ops=azAudioWords([section(raw,'EXPLOITATION'),section(raw,'TRAITEMENT / MINÉRALURGIE')].join(' '),b.ops);
  const market=azAudioWords([section(raw,'USAGES'),section(raw,'MARCHÉ INTERNATIONAL'),section(raw,'CONVERSION ARIARY'),section(raw,'PRODUCTION ANNUELLE'),section(raw,'ÉCONOMIE')].join(' '),b.market+(b.uses||0));
  const risks=azAudioWords([section(raw,'ENVIRONNEMENT'),section(raw,'GÉOPOLITIQUE')].join(' '),b.risks);
  const parts=[
    `Bienvenue dans ARIZONA. ${modeLabel} du ${formatDate(l.lesson_date)}, consacré à ${l.name}. L’objectif est de comprendre les points techniques, économiques et malgaches les plus utiles sans simplement relire la fiche.`,
    azAudioPart(raw,'RÉSUMÉ EXÉCUTIF',b.summary,'Commençons par la vue d’ensemble.'),
    chemphys?'Sur l’identité et les propriétés du matériau. '+chemphys:'',
    azAudioPart(raw,'GÉOLOGIE ET GENÈSE',b.geo,'Du point de vue géologique.'),
    b.zones?azAudioPart(raw,'ZONES MONDIALES',b.zones,'À l’échelle mondiale.'):'',
    azAudioPart(raw,'MADAGASCAR',b.mg,'Pour Madagascar.'),
    ops?'Concernant l’exploitation et la minéralurgie. '+ops:'',
    market?'Pour les usages, le marché et l’économie. '+market:'',
    risks?'Sur les enjeux environnementaux et géopolitiques. '+risks:'',
    b.case?azAudioWords([section(raw,'CAS CONCRET'),section(raw,'MINI-CAS PRATIQUE'),section(raw,'ERREUR FRÉQUENTE')].join(' '),b.case)?'Mise en pratique. '+azAudioWords([section(raw,'CAS CONCRET'),section(raw,'MINI-CAS PRATIQUE'),section(raw,'ERREUR FRÉQUENTE')].join(' '),b.case):'':'',
    azAudioPart(raw,'À RETENIR',b.retain,'Pour terminer, voici l’essentiel à retenir.'),
    `Fin de cette fiche vocale ARIZONA sur ${l.name}.`
  ].filter(Boolean);
  let script=azAudioClean(parts.join(' '));
  const max=AZ_AUDIO_MODES[mode].maxWords,words=script.split(/\s+/).filter(Boolean);
  if(words.length>max)script=words.slice(0,max).join(' ')+'.';
  try{localStorage.setItem(cacheKey,script)}catch{}
  return script;
}
function azAudioChunks(text){
  const sentences=String(text||'').match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)||[],out=[];
  for(const s0 of sentences){
    const s=azAudioClean(s0);if(!s)continue;
    if(s.length<=210){out.push(s);continue}
    const clauses=s.split(/(?<=,|;|:)\s+/);let buf='';
    for(const c of clauses){if((buf+' '+c).trim().length>210&&buf){out.push(buf.trim());buf=c}else buf=(buf+' '+c).trim()}
    if(buf)out.push(buf.trim());
  }
  return out;
}

function azAudioVoices(){
  if(!('speechSynthesis'in window))return[];
  return (speechSynthesis.getVoices()||[]).filter(v=>/^fr([_-]|$)/i.test(v.lang||''));
}
function azAudioSourceLabel(v){return v.localService?'Appareil / hors-ligne':'Réseau / navigateur'}
function azAudioVoiceScore(v){
  let score=0;
  if(AZ_AUDIO_MALE_HINT.test(v.name||''))score+=12;
  if(AZ_AUDIO_NATURAL_HINT.test(v.name||''))score+=6;
  if(!v.localService)score+=azAudioSettings.source==='network'?8:2;
  if(v.localService)score+=azAudioSettings.source==='local'?8:1;
  if(v.default)score+=2;
  return score;
}
function azAudioFilteredVoices(){
  const all=azAudioVoices();
  const filtered=all.filter(v=>azAudioSettings.source==='auto'||(azAudioSettings.source==='local'?v.localService:!v.localService));
  return (filtered.length?filtered:all).sort((a,b)=>azAudioVoiceScore(b)-azAudioVoiceScore(a)||String(a.name).localeCompare(String(b.name)));
}
function azAudioVoice(){
  const all=azAudioVoices();
  if(azAudioSettings.voiceURI){
    const chosen=all.find(v=>v.voiceURI===azAudioSettings.voiceURI);
    if(chosen&&(azAudioSettings.source==='auto'||(azAudioSettings.source==='local'?chosen.localService:!chosen.localService)))return chosen;
  }
  return azAudioFilteredVoices()[0]||all[0]||null;
}
function azAudioProfile(){return AZ_AUDIO_PROFILES[azAudioSettings.profile]||AZ_AUDIO_PROFILES.documentary}
function azAudioEffectiveRate(){return azAudioProfile().rate*(Number(azAudioSettings.speed)||1)}
function azAudioDuration(script,mode='daily'){
  const wc=String(script||'').split(/\s+/).filter(Boolean).length;
  const min=wc?Math.max(.5,wc/(AZ_AUDIO_WPM*azAudioEffectiveRate())):AZ_AUDIO_MODES[mode]?.minutes||5;
  if(min<1)return'~'+Math.max(30,Math.round(min*60))+' s';
  const m=Math.round(min);return'~'+m+' min';
}
function azAudioPercent(){return azAudioState.chunks.length?Math.min(100,Math.round((azAudioState.index/azAudioState.chunks.length)*100)):0}
function azAudioEstimatedSeconds(){return Math.max(30,(AZ_AUDIO_MODES[azAudioState.mode]?.minutes||5)*60)}
function azAudioPositionSeconds(){return azAudioState.chunks.length?Math.min(azAudioEstimatedSeconds()-1,azAudioEstimatedSeconds()*(azAudioState.index/azAudioState.chunks.length)):0}

function azAudioEnsureMiniBar(){
  if($('azAudioMiniBar'))return $('azAudioMiniBar');
  const el=document.createElement('div');el.id='azAudioMiniBar';el.className='azAudioMiniBar hidden';
  el.innerHTML='<div class="azMiniMeta"><b id="azMiniTitle">Fiche vocale</b><small id="azMiniSub"></small></div><div class="azMiniControls"><button class="btn" id="azMiniBack" type="button" title="Reculer">−15</button><button class="btn primary" id="azMiniPlay" type="button" title="Lecture / pause">Ⅱ</button><button class="btn" id="azMiniForward" type="button" title="Avancer">+15</button><button class="btn" id="azMiniStop" type="button" title="Arrêter">■</button></div>';
  document.body.appendChild(el);
  $('azMiniBack').onclick=()=>azAudioSeekChunks(-2);
  $('azMiniForward').onclick=()=>azAudioSeekChunks(2);
  $('azMiniPlay').onclick=()=>azAudioToggleCurrent();
  $('azMiniStop').onclick=stopDailyAudio;
  return el;
}
function azAudioRefreshUI(){
  const p=azAudioPercent(),profile=azAudioProfile(),voice=azAudioVoice();
  document.querySelectorAll('[data-az-audio-player]').forEach(box=>{
    const same=Number(box.dataset.lessonId)===Number(azAudioState.lessonId);
    const play=box.querySelector('[data-audio-play]'),bar=box.querySelector('[data-audio-progress]'),pct=box.querySelector('[data-audio-pct]');
    if(play)play.textContent=same&&azAudioState.playing?(azAudioState.paused?'▶':'Ⅱ'):'▶';
    if(bar)bar.style.width=(same?p:0)+'%';if(pct)pct.textContent=(same?p:0)+'%';
    box.querySelectorAll('[data-audio-mode]').forEach(b=>b.classList.toggle('active',(same?azAudioState.mode:'daily')===b.dataset.audioMode));
    const label=box.querySelector('[data-audio-voice-label]');if(label)label.textContent=(voice?.name||profile.label);
  });
  const mini=azAudioEnsureMiniBar();
  mini.classList.toggle('hidden',!azAudioState.playing);
  if(azAudioState.playing&&azAudioState.lesson){
    $('azMiniTitle').textContent=azAudioState.lesson.name+' · '+AZ_AUDIO_MODES[azAudioState.mode].label;
    $('azMiniSub').textContent=(voice?.name||profile.label)+' · '+p+'%';
    $('azMiniPlay').textContent=azAudioState.paused?'▶':'Ⅱ';
  }
  if('mediaSession'in navigator){
    navigator.mediaSession.playbackState=azAudioState.playing?(azAudioState.paused?'paused':'playing'):'none';
    try{
      if(azAudioState.playing)navigator.mediaSession.setPositionState({duration:azAudioEstimatedSeconds(),playbackRate:Math.max(.5,Math.min(2,azAudioEffectiveRate())),position:azAudioPositionSeconds()});
    }catch{}
  }
}

function azAudioMediaSetup(){
  if(!('mediaSession'in navigator)||!azAudioState.lesson||!azAudioSettings.background)return;
  const l=azAudioState.lesson;
  try{navigator.mediaSession.metadata=new MediaMetadata({title:l.name+' — '+AZ_AUDIO_MODES[azAudioState.mode].label,artist:'ARIZONA · Fiche vocale',album:'Ingénierie minière',artwork:[{src:'./icon.svg',sizes:'512x512',type:'image/svg+xml'}]})}catch{}
  const actions={
    play:()=>azAudioResume(),
    pause:()=>azAudioPause(),
    stop:()=>stopDailyAudio(),
    seekbackward:()=>azAudioSeekChunks(-2),
    seekforward:()=>azAudioSeekChunks(2),
    previoustrack:()=>azAudioSeekChunks(-1),
    nexttrack:()=>azAudioSeekChunks(1)
  };
  for(const [action,handler] of Object.entries(actions)){try{navigator.mediaSession.setActionHandler(action,handler)}catch{}}
}
function azAudioMediaClear(){
  if(!('mediaSession'in navigator))return;
  for(const a of ['play','pause','stop','seekbackward','seekforward','previoustrack','nexttrack'])try{navigator.mediaSession.setActionHandler(a,null)}catch{}
  try{navigator.mediaSession.metadata=null;navigator.mediaSession.playbackState='none'}catch{}
}

function azAudioSpeakNext(){
  if(!azAudioState.playing||azAudioState.paused)return;
  if(azAudioState.index>=azAudioState.chunks.length){azAudioState.playing=false;azAudioState.paused=false;azAudioState.index=azAudioState.chunks.length;azAudioMediaClear();azAudioRefreshUI();return}
  const u=new SpeechSynthesisUtterance(azAudioState.chunks[azAudioState.index]),profile=azAudioProfile();
  u.lang='fr-FR';u.rate=azAudioEffectiveRate();u.pitch=profile.pitch;u.volume=1;
  const voice=azAudioVoice();if(voice)u.voice=voice;
  azAudioState.utterance=u;
  u.onend=()=>{if(!azAudioState.playing)return;azAudioState.index++;azAudioRefreshUI();azAudioSpeakNext()};
  u.onerror=e=>{if(['interrupted','canceled'].includes(e.error))return;azAudioState.playing=false;azAudioState.paused=false;azAudioRefreshUI();toast?.('Lecture audio interrompue par le moteur vocal de l’appareil.')};
  speechSynthesis.speak(u);azAudioRefreshUI();
}
function startDailyAudio(l,mode='daily'){
  if(!('speechSynthesis'in window)||typeof SpeechSynthesisUtterance==='undefined'){toast?.('La synthèse vocale n’est pas disponible sur cet appareil.');return}
  mode=AZ_AUDIO_MODES[mode]?mode:'daily';
  const script=buildAudioScript(l,mode);if(!script)return;
  speechSynthesis.cancel();
  azAudioState.lessonId=Number(l.id);azAudioState.lesson=l;azAudioState.mode=mode;azAudioState.script=script;azAudioState.chunks=azAudioChunks(script);azAudioState.index=0;azAudioState.playing=true;azAudioState.paused=false;
  azAudioMediaSetup();azAudioSpeakNext();renderVoiceLibraryCurrent();
}
async function azAudioPrepareAndStart(l,mode='daily'){
  let full=l;
  if(String(full?.raw_text||'').length<500&&typeof ensureLessonDetail==='function'){
    const run=()=>ensureLessonDetail(full.id);
    try{full=typeof withLoading==='function'?await withLoading('Préparation de la fiche vocale…',run,{delay:80,subtitle:'Chargement des données complètes.'}):await run()}
    catch(e){console.error(e);toast?.('Impossible de préparer cette fiche vocale.');return}
  }
  startDailyAudio(full,mode);
}
function azAudioPause(){if(!azAudioState.playing||azAudioState.paused)return;try{speechSynthesis.pause()}catch{}azAudioState.paused=true;azAudioRefreshUI()}
function azAudioResume(){if(!azAudioState.playing)return;try{speechSynthesis.resume()}catch{}azAudioState.paused=false;azAudioRefreshUI()}
function azAudioToggleCurrent(){if(!azAudioState.playing)return;if(azAudioState.paused)azAudioResume();else azAudioPause()}
function stopDailyAudio(){if('speechSynthesis'in window)speechSynthesis.cancel();azAudioState.playing=false;azAudioState.paused=false;azAudioState.index=0;azAudioMediaClear();azAudioRefreshUI();renderVoiceLibraryCurrent()}
function azAudioSeekChunks(delta){
  if(!azAudioState.playing||!azAudioState.chunks.length)return;
  azAudioState.index=Math.max(0,Math.min(azAudioState.chunks.length-1,azAudioState.index+delta));
  speechSynthesis.cancel();azAudioState.paused=false;setTimeout(azAudioSpeakNext,30);azAudioRefreshUI();
}
function setDailyAudioSpeed(speed){
  azAudioSettings.speed=Number(speed)||1;azAudioSaveSettings();
  if(azAudioState.playing){speechSynthesis.cancel();azAudioState.paused=false;setTimeout(azAudioSpeakNext,30)}
  azAudioRefreshUI();renderVoiceSettings();
}
async function toggleDailyAudio(l,mode='daily'){
  const same=Number(azAudioState.lessonId)===Number(l.id)&&azAudioState.mode===mode;
  if(same&&azAudioState.playing){azAudioToggleCurrent();return}
  await azAudioPrepareAndStart(l,mode);
}

function renderDailyAudio(l,targetId){
  const box=$(targetId);if(!box)return;
  if(!azAudioIsToday(l)){box.innerHTML='';return}
  const voice=azAudioVoice(),supported='speechSynthesis'in window;
  box.innerHTML=`<div class="azAudioPlayer" data-az-audio-player data-lesson-id="${Number(l.id)}">
    <div class="azAudioHead"><div><div class="eyebrow">Fiche vocale</div><b>${esc(l.name)} · <span data-audio-voice-label>${esc(voice?.name||azAudioProfile().label)}</span></b></div><button class="btn azAudioSettingsBtn" type="button" data-audio-settings title="Fiches vocales et voix">⚙</button></div>
    <div class="azAudioModes">${Object.entries(AZ_AUDIO_MODES).map(([k,m])=>`<button class="btn azAudioMode ${k==='daily'?'active':''}" data-audio-mode="${k}">${esc(m.label)}</button>`).join('')}</div>
    <div class="azAudioControls"><button class="btn primary azAudioPlay" type="button" data-audio-play>▶</button><button class="btn" type="button" data-audio-back>−15</button><button class="btn" type="button" data-audio-forward>+15</button><button class="btn azAudioStop" type="button" data-audio-stop>■</button><div class="azAudioRates">${[.75,1,1.25,1.5].map(r=>`<button type="button" class="btn azAudioRate ${azAudioSettings.speed===r?'active':''}" data-audio-speed="${r}">${String(r).replace('.',',')}×</button>`).join('')}</div></div>
    <div class="azAudioProgressRow"><div class="azAudioTrack"><i data-audio-progress></i></div><span data-audio-pct>0%</span></div>
    <div class="small azAudioNote">Voix documentaire · contrôles Android/notification si pris en charge.</div>
  </div>`;
  let mode='daily';
  box.querySelectorAll('[data-audio-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.audioMode;box.querySelectorAll('[data-audio-mode]').forEach(x=>x.classList.toggle('active',x===b))});
  box.querySelector('[data-audio-play]').onclick=()=>toggleDailyAudio(l,mode).catch(console.error);
  box.querySelector('[data-audio-stop]').onclick=stopDailyAudio;
  box.querySelector('[data-audio-back]').onclick=()=>azAudioSeekChunks(-2);
  box.querySelector('[data-audio-forward]').onclick=()=>azAudioSeekChunks(2);
  box.querySelectorAll('[data-audio-speed]').forEach(b=>b.onclick=()=>setDailyAudioSpeed(b.dataset.audioSpeed));
  box.querySelector('[data-audio-settings]').onclick=()=>typeof switchView==='function'&&switchView('voice');
  azAudioRefreshUI();
}

function renderVoiceSettings(){
  const box=$('azVoiceSettings');if(!box)return;
  const voices=azAudioFilteredVoices(),selected=azAudioVoice();
  box.innerHTML=`<div class="azVoiceSettingsGrid">
    <label><span>Style</span><select id="azVoiceProfile" class="select">${Object.entries(AZ_AUDIO_PROFILES).map(([k,p])=>`<option value="${k}" ${azAudioSettings.profile===k?'selected':''}>${esc(p.label)}</option>`).join('')}</select></label>
    <label><span>Source</span><select id="azVoiceSource" class="select"><option value="auto" ${azAudioSettings.source==='auto'?'selected':''}>Auto · meilleure voix</option><option value="network" ${azAudioSettings.source==='network'?'selected':''}>Réseau / navigateur</option><option value="local" ${azAudioSettings.source==='local'?'selected':''}>Appareil / hors-ligne</option></select></label>
    <label class="azVoiceChoice"><span>Voix masculine / française</span><select id="azVoiceSelect" class="select"><option value="">Automatique · ${esc(selected?.name||'voix disponible')}</option>${voices.map(v=>`<option value="${esc(v.voiceURI)}" ${azAudioSettings.voiceURI===v.voiceURI?'selected':''}>${esc(v.name)} · ${esc(azAudioSourceLabel(v))}</option>`).join('')}</select></label>
    <label><span>Vitesse</span><select id="azVoiceSpeed" class="select">${[.75,1,1.25,1.5].map(v=>`<option value="${v}" ${azAudioSettings.speed===v?'selected':''}>${String(v).replace('.',',')}×</option>`).join('')}</select></label>
    <label class="azBgToggle"><input id="azBackgroundAudio" type="checkbox" ${azAudioSettings.background?'checked':''}><span><b>Lecture arrière-plan</b><small>Active la session média Android et les contrôles de notification quand disponibles.</small></span></label>
  </div><div class="small azVoiceSupport">Voix sélectionnée : <b>${esc(selected?.name||'aucune voix française détectée')}</b> · ${esc(selected?azAudioSourceLabel(selected):'—')}</div>`;
  $('azVoiceProfile').onchange=e=>{azAudioSettings.profile=e.target.value;azAudioSaveSettings();renderVoiceSettings();azAudioRestartCurrentVoice()};
  $('azVoiceSource').onchange=e=>{azAudioSettings.source=e.target.value;azAudioSettings.voiceURI='';azAudioSaveSettings();renderVoiceSettings();azAudioRestartCurrentVoice()};
  $('azVoiceSelect').onchange=e=>{azAudioSettings.voiceURI=e.target.value;azAudioSaveSettings();renderVoiceSettings();azAudioRestartCurrentVoice()};
  $('azVoiceSpeed').onchange=e=>setDailyAudioSpeed(e.target.value);
  $('azBackgroundAudio').onchange=e=>{azAudioSettings.background=e.target.checked;azAudioSaveSettings();if(azAudioSettings.background)azAudioMediaSetup();else azAudioMediaClear();azAudioRefreshUI()};
}
function azAudioRestartCurrentVoice(){
  if(!azAudioState.playing)return;
  speechSynthesis.cancel();azAudioState.paused=false;azAudioMediaSetup();setTimeout(azAudioSpeakNext,30);
}

function renderVoiceLibraryCurrent(){
  const box=$('azVoiceNowPlaying');if(!box)return;
  if(!azAudioState.lesson){box.innerHTML='<div class="small">Aucune fiche vocale en lecture.</div>';return}
  const l=azAudioState.lesson,p=azAudioPercent(),voice=azAudioVoice();
  box.innerHTML=`<div class="azVoiceNowCard"><div><div class="eyebrow">Lecture actuelle</div><h3>${esc(l.name)}</h3><div class="small">${esc(AZ_AUDIO_MODES[azAudioState.mode].label)} · ${esc(voice?.name||azAudioProfile().label)} · ${p}%</div></div><div class="azVoiceNowActions"><button class="btn" id="azVoiceNowBack">−15</button><button class="btn primary" id="azVoiceNowPlay">${azAudioState.paused?'▶':'Ⅱ'}</button><button class="btn" id="azVoiceNowForward">+15</button><button class="btn" id="azVoiceNowStop">■</button></div></div>`;
  $('azVoiceNowBack').onclick=()=>azAudioSeekChunks(-2);$('azVoiceNowPlay').onclick=azAudioToggleCurrent;$('azVoiceNowForward').onclick=()=>azAudioSeekChunks(2);$('azVoiceNowStop').onclick=stopDailyAudio;
}
function renderVoiceLibrary(){
  renderVoiceSettings();renderVoiceLibraryCurrent();
  const list=$('azVoiceLibrary');if(!list)return;
  const q=String($('azVoiceSearch')?.value||'').trim().toLowerCase();
  const arr=(lessons||[]).filter(l=>!isWeeklyReport(l)).filter(l=>!q||[l.name,l.symbol,formatDate(l.lesson_date)].join(' ').toLowerCase().includes(q));
  list.innerHTML=arr.map(l=>`<article class="card azVoiceCard"><div class="azVoiceCardMain"><div class="azVoiceGlyph">◖</div><div><b>${esc(l.name)}</b><small>${esc(formatDate(l.lesson_date))} · ${esc(compactSymbol(l))}</small></div></div><div class="azVoiceCardActions">${Object.entries(AZ_AUDIO_MODES).map(([k,m])=>`<button class="btn ${k==='daily'?'primary':''}" data-voice-play="${l.id}" data-voice-mode="${k}">${m.minutes} min</button>`).join('')}</div></article>`).join('')||'<div class="card cardPad small">Aucune fiche vocale correspondante.</div>';
  list.querySelectorAll('[data-voice-play]').forEach(b=>b.onclick=()=>azAudioPrepareAndStart(lessons.find(l=>Number(l.id)===Number(b.dataset.voicePlay)),b.dataset.voiceMode).catch(console.error));
}
function onArizonaAudioViewChange(v){if(v==='voice')renderVoiceLibrary()}

if('speechSynthesis'in window){
  const refresh=()=>{renderVoiceSettings();azAudioRefreshUI()};
  speechSynthesis.addEventListener?.('voiceschanged',refresh);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&azAudioState.playing&&!azAudioState.paused){try{speechSynthesis.resume()}catch{}}});
