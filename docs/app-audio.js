// ARIZONA V21.17 · OpenAI premium voice primary
const AZ_AUDIO_MODES={
  short:{label:'Résumé 2 min',minutes:2,maxWords:300},
  daily:{label:'Quotidien 5 min',minutes:5,maxWords:720},
  deep:{label:'Approfondir 10 min',minutes:10,maxWords:1420}
};
const AZ_AUDIO_PROFILES={
  documentary:{label:'Documentaire',stability:.38,similarity_boost:.84,style:.42},
  calm:{label:'Narrateur posé',stability:.56,similarity_boost:.86,style:.22},
  dynamic:{label:'Documentaire dynamique',stability:.30,similarity_boost:.82,style:.58},
  natural:{label:'Naturel',stability:.46,similarity_boost:.82,style:.30}
};
const AZ_AUDIO_SETTINGS_KEY='az_audio_settings_v6';
const AZ_AUDIO_MALE_HINT=/male|homme|masculin|adam|george|daniel|thomas|henri|paul|nicolas|mathieu|yann|louis|hugo|alain|jean|remy|rémy|gilles|jacques|claude/i;

function azLoadAudioSettings(){
  try{
    const x=JSON.parse(localStorage.getItem(AZ_AUDIO_SETTINGS_KEY)||'{}');
    return {
      profile:x.profile||'documentary',
      source:x.source||'auto',
      premiumVoiceId:x.premiumVoiceId||'',
      localVoiceURI:x.localVoiceURI||'',
      speed:Number(x.speed)||1,
      background:x.background!==false
    };
  }catch{return{profile:'documentary',source:'auto',premiumVoiceId:'',localVoiceURI:'',speed:1,background:true}}
}
const azAudioSettings=azLoadAudioSettings();
const azPremium={checked:false,configured:false,providers:{openai:false,elevenlabs:false},preferred:null,documentary:null,voices:[],loading:false,error:''};
const azAudioState={
  lessonId:null,lesson:null,mode:'daily',script:'',engine:null,
  playing:false,paused:false,
  chunks:[],index:0,utterance:null,
  media:null,url:'',duration:0,currentTime:0,
  segments:[],segmentIndex:0,prefetch:null,premiumProvider:'',premiumModel:'',premiumProviders:[],fallbackCount:0
};
let azPreviewAudio=null;

function azSaveAudioSettings(){try{localStorage.setItem(AZ_AUDIO_SETTINGS_KEY,JSON.stringify(azAudioSettings))}catch{}}
function azLocalISODate(){const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
function azAudioIsToday(l){return !!l&&!isWeeklyReport(l)&&String(l.lesson_date||'')===azLocalISODate()}
function azAudioClean(v){return String(v||'').replace(/\\+/g,' ').replace(/^[-•]\s*/gm,'').replace(/\s+/g,' ').replace(/\s+([,.;:!?])/g,'$1').trim()}
function azAudioWords(v,max){const a=azAudioClean(v).split(/\s+/).filter(Boolean);return a.slice(0,max).join(' ')+(a.length>max?'…':'')}
function azAudioPart(raw,h,max,label=''){const s=azAudioWords(section(raw,h),max);return s?(label?label+' '+s:s):''}

function azAudioBudgets(mode){
  if(mode==='short')return{summary:65,chemphys:35,geo:40,mg:48,ops:45,market:40,risks:30,retain:32};
  if(mode==='deep')return{summary:140,chemphys:125,geo:150,zones:90,mg:175,ops:190,uses:130,market:180,risks:140,retain:90,case:120};
  return{summary:100,chemphys:65,geo:80,zones:45,mg:95,ops:100,uses:65,market:95,risks:80,retain:55,case:55};
}
function buildAudioScript(l,mode='daily'){
  if(!l)return'';
  mode=AZ_AUDIO_MODES[mode]?mode:'daily';
  const cacheKey='az_audio_script_v7_'+l.id+'_'+mode+'_'+String(l.updated_at||l.lesson_date||'');
  try{const x=localStorage.getItem(cacheKey);if(x)return x}catch{}
  const raw=String(l.raw_text||''),b=azAudioBudgets(mode),m=AZ_AUDIO_MODES[mode];
  const chemphys=azAudioWords([section(raw,'CARACTÉRISTIQUES CHIMIQUES'),section(raw,'CARACTÉRISTIQUES PHYSIQUES')].join(' '),b.chemphys);
  const ops=azAudioWords([section(raw,'EXPLOITATION'),section(raw,'TRAITEMENT / MINÉRALURGIE')].join(' '),b.ops);
  const market=azAudioWords([section(raw,'USAGES'),section(raw,'MARCHÉ INTERNATIONAL'),section(raw,'CONVERSION ARIARY'),section(raw,'PRODUCTION ANNUELLE'),section(raw,'ÉCONOMIE')].join(' '),b.market+(b.uses||0));
  const risks=azAudioWords([section(raw,'ENVIRONNEMENT'),section(raw,'GÉOPOLITIQUE')].join(' '),b.risks);
  const applied=azAudioWords([section(raw,'CAS CONCRET'),section(raw,'MINI-CAS PRATIQUE'),section(raw,'ERREUR FRÉQUENTE')].join(' '),b.case||0);
  const parts=[
    `Bienvenue dans ARIZONA. Voici le format ${m.label.toLowerCase()} du ${formatDate(l.lesson_date)}, consacré à ${l.name}. Nous allons relier géologie, exploitation, traitement, économie et contexte malgache, comme dans un court documentaire technique.`,
    azAudioPart(raw,'RÉSUMÉ EXÉCUTIF',b.summary,'Commençons par l’essentiel.'),
    chemphys?'Pour bien situer le matériau. '+chemphys:'',
    azAudioPart(raw,'GÉOLOGIE ET GENÈSE',b.geo,'Du point de vue géologique.'),
    b.zones?azAudioPart(raw,'ZONES MONDIALES',b.zones,'À l’échelle mondiale.'):'',
    azAudioPart(raw,'MADAGASCAR',b.mg,'À Madagascar, le point important est le suivant.'),
    ops?'Du côté de l’exploitation et de la minéralurgie. '+ops:'',
    market?'Pour les usages, le marché et la logique économique. '+market:'',
    risks?'Enfin, sur les enjeux environnementaux et géopolitiques. '+risks:'',
    applied?'Prenons maintenant un angle pratique. '+applied:'',
    azAudioPart(raw,'À RETENIR',b.retain,'Si vous ne deviez retenir que quelques idées.'),
    `C’était la fiche vocale ARIZONA consacrée à ${l.name}.`
  ].filter(Boolean);
  let script=azAudioClean(parts.join(' '));
  const words=script.split(/\s+/).filter(Boolean);
  if(words.length>m.maxWords)script=words.slice(0,m.maxWords).join(' ')+'.';
  try{localStorage.setItem(cacheKey,script)}catch{}
  return script;
}
function azLocalChunks(text){
  const sentences=String(text||'').match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)||[],out=[];
  for(const s0 of sentences){
    const s=azAudioClean(s0);if(!s)continue;
    if(s.length<=210){out.push(s);continue}
    let buf='';
    for(const c of s.split(/(?<=,|;|:)\s+/)){if((buf+' '+c).trim().length>210&&buf){out.push(buf.trim());buf=c}else buf=(buf+' '+c).trim()}
    if(buf)out.push(buf.trim());
  }
  return out;
}

async function azPremiumStatus(force=false){
  if(azPremium.checked&&!force)return azPremium.configured;
  try{
    const {data,error}=await sb.functions.invoke('arizona-tts',{body:{action:'status'}});
    azPremium.checked=true;
    azPremium.configured=!error&&!!data?.configured;
    azPremium.providers=data?.providers||{openai:false,elevenlabs:false};
    azPremium.preferred=data?.preferred||null;
    azPremium.documentary=data?.documentary_premium||null;
    azPremium.error=error?.message||data?.error||'';
  }catch(e){azPremium.checked=true;azPremium.configured=false;azPremium.error=String(e?.message||e)}
  return azPremium.configured;
}
async function azLoadPremiumVoices(force=false){
  if(!await azPremiumStatus(force))return[];
  if(azPremium.voices.length&&!force)return azPremium.voices;
  if(azPremium.loading)return azPremium.voices;
  azPremium.loading=true;
  try{
    const {data,error}=await sb.functions.invoke('arizona-tts',{body:{action:'voices'}});
    if(error)throw error;
    azPremium.voices=(data?.voices||[]).sort((a,b)=>{
      const sa=(AZ_AUDIO_MALE_HINT.test([a.name,a.labels?.gender,a.description].join(' '))?20:0)+(String(a.labels?.language||'').toLowerCase().includes('fr')?8:0);
      const sbv=(AZ_AUDIO_MALE_HINT.test([b.name,b.labels?.gender,b.description].join(' '))?20:0)+(String(b.labels?.language||'').toLowerCase().includes('fr')?8:0);
      return sbv-sa||String(a.name).localeCompare(String(b.name));
    });
  }catch(e){azPremium.error=String(e?.message||e)}
  azPremium.loading=false;return azPremium.voices;
}
function azPremiumVoice(){
  if(azAudioSettings.premiumVoiceId){
    const v=azPremium.voices.find(x=>x.voice_id===azAudioSettings.premiumVoiceId);if(v)return v;
  }
  return azPremium.voices.find(v=>AZ_AUDIO_MALE_HINT.test([v.name,v.labels?.gender,v.description].join(' ')))||azPremium.voices[0]||null;
}
function azLocalVoices(){
  if(!('speechSynthesis'in window))return[];
  return (speechSynthesis.getVoices()||[]).filter(v=>/^fr([_-]|$)/i.test(v.lang||'')).sort((a,b)=>{
    const sa=(AZ_AUDIO_MALE_HINT.test(a.name||'')?10:0)+(a.localService?1:3);
    const sbv=(AZ_AUDIO_MALE_HINT.test(b.name||'')?10:0)+(b.localService?1:3);
    return sbv-sa||String(a.name).localeCompare(String(b.name));
  });
}
function azLocalVoice(){
  const all=azLocalVoices();
  return all.find(v=>v.voiceURI===azAudioSettings.localVoiceURI)||all[0]||null;
}
function azProfile(){return AZ_AUDIO_PROFILES[azAudioSettings.profile]||AZ_AUDIO_PROFILES.documentary}

async function azResolveEngine(){
  const premium=await azPremiumStatus(true);
  if(azAudioSettings.source==='local')return'local';
  if(azAudioSettings.source==='premium')return premium?'premium':'premium-unavailable';
  return premium?'premium':'local';
}

function azSetMediaSession(){
  if(!('mediaSession'in navigator)||!azAudioState.lesson||!azAudioSettings.background)return;
  const l=azAudioState.lesson;
  try{
    navigator.mediaSession.metadata=new MediaMetadata({
      title:l.name+' — '+AZ_AUDIO_MODES[azAudioState.mode].label,
      artist:'ARIZONA · Fiche vocale',
      album:azAudioState.engine==='premium'?'Documentaire neuronal':'Narration appareil',
      artwork:[{src:'./icon.svg',sizes:'512x512',type:'image/svg+xml'}]
    });
  }catch{}
  const actions={
    play:()=>azAudioResume(),pause:()=>azAudioPause(),stop:()=>stopDailyAudio(),
    seekbackward:()=>azAudioSeekSeconds(-15),seekforward:()=>azAudioSeekSeconds(15),
    previoustrack:()=>azAudioSeekSeconds(-15),nexttrack:()=>azAudioSeekSeconds(15)
  };
  for(const [a,h] of Object.entries(actions))try{navigator.mediaSession.setActionHandler(a,h)}catch{}
}
function azClearMediaSession(){
  if(!('mediaSession'in navigator))return;
  for(const a of ['play','pause','stop','seekbackward','seekforward','previoustrack','nexttrack'])try{navigator.mediaSession.setActionHandler(a,null)}catch{}
  try{navigator.mediaSession.metadata=null;navigator.mediaSession.playbackState='none'}catch{}
}

async function azGeneratePremium(l,mode,script){
  await azLoadPremiumVoices();
  const p=azProfile(),voice=azPremiumVoice();
  const {data,error}=await sb.functions.invoke('arizona-tts',{body:{
    action:'generate',
    lesson_id:l.id,
    lesson_name:l.name,
    lesson_date:l.lesson_date,
    mode,
    text:script,
    source_text:String(l.raw_text||script),
    profile:'documentary_premium',
    voice_id:voice?.voice_id||undefined,
    stability:p.stability,similarity_boost:p.similarity_boost,style:p.style,speed:1
  }});
  if(error)throw error;
  if(!data?.url&&!data?.segments?.length)throw new Error(data?.error||'Audio premium indisponible');
  return{url:data?.url||'',voice,data,segments:data?.segments||[]};
}
function azPremiumSegmentSeconds(seg){
  const n=Number(seg?.actual_seconds||seg?.estimated_seconds||0);
  return Number.isFinite(n)&&n>0?n:20;
}
function azPremiumTimeline(){
  const segs=azAudioState.segments||[];
  let t=0;
  return segs.map((seg,index)=>{
    const duration=azPremiumSegmentSeconds(seg),start=t,end=t+duration;
    t=end;return{seg,index,start,end,duration};
  });
}
function azPremiumTotalDuration(){
  const timeline=azPremiumTimeline();
  return timeline.length?timeline[timeline.length-1].end:0;
}
function azPrefetchPremiumSegment(index){
  const seg=azAudioState.segments?.[index];
  if(!seg?.url)return;
  try{
    const p=new Audio(seg.url);p.preload='auto';p.load?.();azAudioState.prefetch=p;
  }catch{}
}
function azPlayPremiumSegment(index,autoplay=true,offset=0){
  const segs=azAudioState.segments||[],seg=segs[index];
  if(!seg?.url)return false;
  if(azAudioState.media){try{azAudioState.media.onpause=null;azAudioState.media.pause()}catch{}}
  const timeline=azPremiumTimeline(),slot=timeline[index]||{start:0,duration:azPremiumSegmentSeconds(seg)};
  const a=new Audio(seg.url);a.preload='auto';a.playbackRate=azAudioSettings.speed;a.setAttribute('playsinline','');
  azAudioState.media=a;azAudioState.url=seg.url;azAudioState.segmentIndex=index;
  azAudioState.currentTime=slot.start+Math.max(0,Number(offset)||0);
  const known=azPremiumTotalDuration();
  if(known>0)azAudioState.duration=known;
  a.onloadedmetadata=()=>{
    if(Number.isFinite(a.duration)&&a.duration>0){
      seg.actual_seconds=a.duration;
      azAudioState.duration=azPremiumTotalDuration()||azAudioState.duration;
      if(offset>0)a.currentTime=Math.min(Math.max(0,offset),Math.max(0,a.duration-.05));
    }
    azAudioRefreshUI();
  };
  a.ontimeupdate=()=>{
    const now=azPremiumTimeline()[index];
    azAudioState.currentTime=(now?.start||0)+(a.currentTime||0);
    azAudioRefreshUI(false);
  };
  a.onplay=()=>{azAudioState.playing=true;azAudioState.paused=false;azAudioRefreshUI()};
  a.onpause=()=>{if(!a.ended&&azAudioState.media===a){azAudioState.paused=true;azAudioRefreshUI()}};
  a.onended=()=>{
    if(azAudioState.media!==a)return;
    const next=index+1;
    if(next<segs.length){azPlayPremiumSegment(next,true,0);return}
    azAudioState.playing=false;azAudioState.paused=false;
    azAudioState.currentTime=azAudioState.duration;
    azClearMediaSession();azAudioRefreshUI();
  };
  azPrefetchPremiumSegment(index+1);
  azSetMediaSession();
  if(autoplay)a.play().catch(e=>{
    azAudioState.playing=false;azAudioState.paused=false;
    toast?.('Lecture bloquée par le navigateur. Appuie de nouveau sur ▶.');
    console.warn(e);azAudioRefreshUI();
  });
  return true;
}
function azStartPremiumMedia(l,mode,script,result){
  if(azAudioState.media){try{azAudioState.media.pause()}catch{}}
  const data=result?.data||{},segments=result?.segments||data?.segments||[];
  azAudioState.lessonId=Number(l.id);azAudioState.lesson=l;azAudioState.mode=mode;azAudioState.script=script;azAudioState.engine='premium';
  azAudioState.playing=true;azAudioState.paused=false;azAudioState.currentTime=0;
  azAudioState.premiumProvider=data?.provider||'';azAudioState.premiumModel=data?.model_id||'';
  azAudioState.premiumProviders=Array.isArray(data?.providers_used)?data.providers_used:[];
  azAudioState.fallbackCount=Number(data?.fallback_count)||0;
  azAudioState.segments=segments;azAudioState.segmentIndex=0;azAudioState.prefetch=null;
  if(segments.length){
    azAudioState.duration=Number(data?.duration_estimate)||azPremiumTotalDuration()||AZ_AUDIO_MODES[mode].minutes*60;
    azPlayPremiumSegment(0,true,0);
    return;
  }
  const a=new Audio(result.url);a.preload='auto';a.playbackRate=azAudioSettings.speed;a.setAttribute('playsinline','');
  azAudioState.media=a;azAudioState.url=result.url;azAudioState.duration=AZ_AUDIO_MODES[mode].minutes*60;
  a.onloadedmetadata=()=>{if(Number.isFinite(a.duration))azAudioState.duration=a.duration;azAudioRefreshUI()};
  a.ontimeupdate=()=>{azAudioState.currentTime=a.currentTime||0;azAudioRefreshUI(false)};
  a.onplay=()=>{azAudioState.playing=true;azAudioState.paused=false;azAudioRefreshUI()};
  a.onpause=()=>{if(!a.ended){azAudioState.paused=true;azAudioRefreshUI()}};
  a.onended=()=>{azAudioState.playing=false;azAudioState.paused=false;azAudioState.currentTime=azAudioState.duration;azClearMediaSession();azAudioRefreshUI()};
  azSetMediaSession();
  a.play().catch(e=>{azAudioState.playing=false;azAudioState.paused=false;toast?.('Lecture bloquée par le navigateur. Appuie de nouveau sur ▶.');console.warn(e)});
}
function azSpeakLocalNext(){
  if(!azAudioState.playing||azAudioState.paused)return;
  if(azAudioState.index>=azAudioState.chunks.length){azAudioState.playing=false;azAudioState.paused=false;azClearMediaSession();azAudioRefreshUI();return}
  const u=new SpeechSynthesisUtterance(azAudioState.chunks[azAudioState.index]);
  u.lang='fr-FR';u.rate=.94*azAudioSettings.speed;u.pitch=.90;u.volume=1;
  const v=azLocalVoice();if(v)u.voice=v;
  azAudioState.utterance=u;
  u.onend=()=>{if(!azAudioState.playing)return;azAudioState.index++;azAudioRefreshUI();azSpeakLocalNext()};
  u.onerror=e=>{if(['interrupted','canceled'].includes(e.error))return;azAudioState.playing=false;azAudioRefreshUI();toast?.('Lecture locale interrompue.')};
  speechSynthesis.speak(u);azAudioRefreshUI();
}
function azStartLocal(l,mode,script){
  speechSynthesis.cancel();
  azAudioState.lessonId=Number(l.id);azAudioState.lesson=l;azAudioState.mode=mode;azAudioState.script=script;azAudioState.engine='local';
  azAudioState.chunks=azLocalChunks(script);azAudioState.index=0;azAudioState.playing=true;azAudioState.paused=false;
  azAudioState.duration=AZ_AUDIO_MODES[mode].minutes*60;azAudioState.currentTime=0;azSetMediaSession();azSpeakLocalNext();
}

async function azAudioPrepareAndStart(l,mode='daily'){
  let full=l;
  if(String(full?.raw_text||'').length<500&&typeof ensureLessonDetail==='function'){
    const run=()=>ensureLessonDetail(full.id);
    try{full=typeof withLoading==='function'?await withLoading('Préparation de la fiche vocale…',run,{delay:80,subtitle:'Chargement des données complètes.'}):await run()}
    catch(e){console.error(e);toast?.('Impossible de préparer cette fiche vocale.');return}
  }
  const script=buildAudioScript(full,mode),engine=await azResolveEngine();
  if(engine==='premium-unavailable'){
    toast?.('Premium indisponible : aucun moteur vocal premium n’est connecté. Ouvre Fiches vocales > Réglages pour voir le diagnostic.');
    try{switchView?.('voice')}catch{}
    renderVoiceSettings().catch(console.warn);
    return;
  }
  if(engine==='premium'){
    try{
      const run=()=>azGeneratePremium(full,mode,script);
      const result=typeof withLoading==='function'?await withLoading('Génération documentaire…',run,{delay:120,subtitle:'Création ou récupération du fichier audio premium.'}):await run();
      azStartPremiumMedia(full,mode,script,result);return;
    }catch(e){
      console.warn('Premium TTS error',e);
      if(azAudioSettings.source==='premium'){
        toast?.('Échec du moteur premium. Aucune voix locale ne sera substituée.');
        return;
      }
      toast?.('Premium indisponible : bascule en voix appareil (mode Auto).');
    }
  }
  azStartLocal(full,mode,script);
}
async function toggleDailyAudio(l,mode='daily'){
  const same=Number(azAudioState.lessonId)===Number(l.id)&&azAudioState.mode===mode;
  if(same&&azAudioState.playing){azAudioState.paused?azAudioResume():azAudioPause();return}
  await azAudioPrepareAndStart(l,mode);
}
function azAudioPause(){
  if(!azAudioState.playing||azAudioState.paused)return;
  if(azAudioState.engine==='premium'&&azAudioState.media)azAudioState.media.pause();else try{speechSynthesis.pause()}catch{}
  azAudioState.paused=true;azAudioRefreshUI();
}
function azAudioResume(){
  if(!azAudioState.playing)return;
  if(azAudioState.engine==='premium'&&azAudioState.media)azAudioState.media.play().catch(()=>{});else try{speechSynthesis.resume()}catch{}
  azAudioState.paused=false;azAudioRefreshUI();
}
function stopDailyAudio(){
  if(azAudioState.media){try{azAudioState.media.onpause=null;azAudioState.media.pause();azAudioState.media.currentTime=0}catch{}}
  if('speechSynthesis'in window)try{speechSynthesis.cancel()}catch{}
  azAudioState.playing=false;azAudioState.paused=false;azAudioState.currentTime=0;azAudioState.index=0;
  azAudioState.segments=[];azAudioState.segmentIndex=0;azAudioState.prefetch=null;azAudioState.premiumProviders=[];azAudioState.fallbackCount=0;
  azClearMediaSession();azAudioRefreshUI();renderVoiceLibraryCurrent();
}
function azAudioSeekSeconds(delta){
  if(!azAudioState.playing)return;
  if(azAudioState.engine==='premium'&&azAudioState.media){
    if(azAudioState.segments?.length){
      const target=Math.max(0,Math.min(Math.max(.1,azAudioState.duration-.1),azAudioState.currentTime+delta));
      const timeline=azPremiumTimeline();
      const slot=timeline.find(x=>target>=x.start&&target<x.end)||timeline[timeline.length-1];
      if(slot){
        const offset=Math.max(0,target-slot.start);
        if(slot.index===azAudioState.segmentIndex){
          azAudioState.media.currentTime=Math.min(offset,Math.max(0,(azAudioState.media.duration||slot.duration)-.05));
          azAudioState.currentTime=target;
        }else azPlayPremiumSegment(slot.index,true,offset);
      }
      return;
    }
    azAudioState.media.currentTime=Math.max(0,Math.min((azAudioState.media.duration||azAudioState.duration)-.1,azAudioState.media.currentTime+delta));return;
  }
  const step=Math.max(1,Math.round(Math.abs(delta)/8));azAudioState.index=Math.max(0,Math.min(azAudioState.chunks.length-1,azAudioState.index+(delta<0?-step:step)));
  speechSynthesis.cancel();azAudioState.paused=false;setTimeout(azSpeakLocalNext,30);azAudioRefreshUI();
}
function azSetSpeed(v){
  azAudioSettings.speed=Number(v)||1;azSaveAudioSettings();
  if(azAudioState.engine==='premium'&&azAudioState.media)azAudioState.media.playbackRate=azAudioSettings.speed;
  else if(azAudioState.playing&&azAudioState.engine==='local'){speechSynthesis.cancel();azAudioState.paused=false;setTimeout(azSpeakLocalNext,30)}
  azAudioRefreshUI();renderVoiceSettings();
}
function azAudioProgress(){
  if(azAudioState.engine==='premium')return azAudioState.duration?Math.min(100,Math.round(100*azAudioState.currentTime/azAudioState.duration)):0;
  return azAudioState.chunks.length?Math.min(100,Math.round(100*azAudioState.index/azAudioState.chunks.length)):0;
}

function azEnsureMiniBar(){
  if($('azAudioMiniBar'))return $('azAudioMiniBar');
  const el=document.createElement('div');el.id='azAudioMiniBar';el.className='azAudioMiniBar hidden';
  el.innerHTML='<div class="azMiniMeta"><b id="azMiniTitle">Fiche vocale</b><small id="azMiniSub"></small></div><div class="azMiniControls"><button class="btn" id="azMiniBack">−15</button><button class="btn primary" id="azMiniPlay">Ⅱ</button><button class="btn" id="azMiniForward">+15</button><button class="btn" id="azMiniStop">■</button></div>';
  document.body.appendChild(el);
  $('azMiniBack').onclick=()=>azAudioSeekSeconds(-15);$('azMiniForward').onclick=()=>azAudioSeekSeconds(15);
  $('azMiniPlay').onclick=()=>azAudioState.paused?azAudioResume():azAudioPause();$('azMiniStop').onclick=stopDailyAudio;return el;
}
function azAudioRefreshUI(refreshLibrary=true){
  const p=azAudioProgress(),mini=azEnsureMiniBar();
  document.querySelectorAll('[data-az-audio-player]').forEach(box=>{
    const same=Number(box.dataset.lessonId)===Number(azAudioState.lessonId);
    const play=box.querySelector('[data-audio-play]'),bar=box.querySelector('[data-audio-progress]'),pct=box.querySelector('[data-audio-pct]');
    if(play)play.textContent=same&&azAudioState.playing?(azAudioState.paused?'▶':'Ⅱ'):'▶';
    if(bar)bar.style.width=(same?p:0)+'%';if(pct)pct.textContent=(same?p:0)+'%';
    box.querySelectorAll('[data-audio-mode]').forEach(b=>b.classList.toggle('active',(same?azAudioState.mode:'daily')===b.dataset.audioMode));
    box.querySelectorAll('[data-audio-speed]').forEach(b=>b.classList.toggle('active',Number(b.dataset.audioSpeed)===Number(azAudioSettings.speed)));
    const src=box.querySelector('[data-audio-source-label]');if(src){if(azAudioState.engine==='premium'&&same){src.textContent=azAudioState.premiumProvider==='mixed'?'Documentaire Premium · OpenAI + ElevenLabs'+(azAudioState.fallbackCount?' · '+azAudioState.fallbackCount+' secours':''):azAudioState.premiumProvider==='elevenlabs'?'Documentaire Premium · Eleven v4':azAudioState.premiumProvider==='openai'?'Documentaire Premium · OpenAI':'Documentaire Premium'}else src.textContent=azPremium.configured?'Premium disponible':'Voix appareil'}
  });
  mini.classList.toggle('hidden',!azAudioState.playing);
  if(azAudioState.playing&&azAudioState.lesson){
    $('azMiniTitle').textContent=azAudioState.lesson.name+' · '+AZ_AUDIO_MODES[azAudioState.mode].label;
    $('azMiniSub').textContent=(azAudioState.engine==='premium'?'Premium documentaire':'Voix appareil')+' · '+p+'%';
    $('azMiniPlay').textContent=azAudioState.paused?'▶':'Ⅱ';
  }
  if('mediaSession'in navigator){
    try{
      navigator.mediaSession.playbackState=azAudioState.playing?(azAudioState.paused?'paused':'playing'):'none';
      if(azAudioState.playing&&azAudioState.engine==='premium'&&azAudioState.duration>0)navigator.mediaSession.setPositionState({duration:azAudioState.duration,playbackRate:azAudioSettings.speed,position:Math.min(azAudioState.duration-.01,azAudioState.currentTime)});
    }catch{}
  }
  if(refreshLibrary)renderVoiceLibraryCurrent();
}

function renderDailyAudio(l,targetId){
  const box=$(targetId);if(!box)return;if(!azAudioIsToday(l)){box.innerHTML='';return}
  box.innerHTML=`<div class="azAudioPlayer" data-az-audio-player data-lesson-id="${Number(l.id)}">
    <div class="azAudioHead"><div><div class="eyebrow">Fiche vocale</div><b>${esc(l.name)} · <span data-audio-source-label>Détection audio…</span></b></div><button class="btn azAudioSettingsBtn" data-audio-settings>⚙</button></div>
    <div class="azAudioModes">${Object.entries(AZ_AUDIO_MODES).map(([k,m])=>`<button class="btn azAudioMode ${k==='daily'?'active':''}" data-audio-mode="${k}">${esc(m.label)}</button>`).join('')}</div>
    <div class="azAudioControls"><button class="btn primary azAudioPlay" data-audio-play>▶</button><button class="btn" data-audio-back>−15</button><button class="btn" data-audio-forward>+15</button><button class="btn azAudioStop" data-audio-stop>■</button><div class="azAudioRates">${[.75,1,1.25,1.5].map(r=>`<button class="btn azAudioRate ${azAudioSettings.speed===r?'active':''}" data-audio-speed="${r}">${String(r).replace('.',',')}×</button>`).join('')}</div></div>
    <div class="azAudioProgressRow"><div class="azAudioTrack"><i data-audio-progress></i></div><span data-audio-pct>0%</span></div>
    <div class="small azAudioNote">ARIZONA utilise en priorité un MP3 neuronal documentaire quand le moteur premium est configuré. Voix générée par IA.</div>
  </div>`;
  let mode='daily';
  box.querySelectorAll('[data-audio-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.audioMode;box.querySelectorAll('[data-audio-mode]').forEach(x=>x.classList.toggle('active',x===b))});
  box.querySelector('[data-audio-play]').onclick=()=>toggleDailyAudio(l,mode).catch(console.error);
  box.querySelector('[data-audio-stop]').onclick=stopDailyAudio;box.querySelector('[data-audio-back]').onclick=()=>azAudioSeekSeconds(-15);box.querySelector('[data-audio-forward]').onclick=()=>azAudioSeekSeconds(15);
  box.querySelectorAll('[data-audio-speed]').forEach(b=>b.onclick=()=>azSetSpeed(b.dataset.audioSpeed));
  box.querySelector('[data-audio-settings]').onclick=()=>switchView?.('voice');
  azPremiumStatus().then(()=>azAudioRefreshUI(false));
}

async function renderVoiceSettings(){
  const box=$('azVoiceSettings');if(!box)return;
  await azPremiumStatus(true);if(azPremium.configured)await azLoadPremiumVoices(true);
  const premiumVoice=azPremiumVoice(),localVoice=azLocalVoice(),premiumLabel=azPremium.configured?'Disponible':'Bloqué';
  const providerText='ElevenLabs : '+(azPremium.providers?.elevenlabs?'connecté':'non connecté')+' · OpenAI : '+(azPremium.providers?.openai?'connecté':'non connecté');
  const chain=Array.isArray(azPremium.documentary?.fallback_chain)?azPremium.documentary.fallback_chain:[];
  const chainText=chain.length?' · Chaîne : '+chain.map(x=>x==='elevenlabs'?'ElevenLabs':'OpenAI').join(' → ')+(azPremium.documentary?.segment_resume?' · reprise automatique par segment':''):'';
  box.innerHTML=`<div class="azVoiceStatus ${azPremium.configured?'ok':'warn'}"><b>Audio premium documentaire</b><span>${premiumLabel}</span><small>${azPremium.configured?'Moteur premium actif · '+providerText+chainText:providerText+' · Aucun moteur premium ne peut générer la nouvelle voix. La voix système n’est utilisée qu’en mode Auto.'}</small><div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button id="azPremiumRetry" class="btn" type="button">Retester Premium</button><span class="small">Configuration serveur : Supabase → Edge Functions → Secrets → ELEVENLABS_API_KEY ou OPENAI_API_KEY.</span></div></div>
  <div class="azVoiceSettingsGrid">
    <label><span>Style</span><select id="azVoiceProfile" class="select">${Object.entries(AZ_AUDIO_PROFILES).map(([k,p])=>`<option value="${k}" ${azAudioSettings.profile===k?'selected':''}>${esc(p.label)}</option>`).join('')}</select></label>
    <label><span>Source</span><select id="azVoiceSource" class="select"><option value="auto" ${azAudioSettings.source==='auto'?'selected':''}>Auto · Premium prioritaire</option><option value="premium" ${azAudioSettings.source==='premium'?'selected':''}>Premium neuronal</option><option value="local" ${azAudioSettings.source==='local'?'selected':''}>Voix système / appareil</option></select></label>
    <label class="azVoiceChoice"><span>Voix premium</span><div class="azVoiceSelectRow"><select id="azPremiumVoiceSelect" class="select" ${!azPremium.configured?'disabled':''}><option value="">Automatique · ${esc(premiumVoice?.name||'meilleure voix masculine')}</option>${azPremium.voices.map(v=>`<option value="${esc(v.voice_id)}" ${azAudioSettings.premiumVoiceId===v.voice_id?'selected':''}>${esc(v.name)} · ${esc(v.labels?.gender||v.labels?.accent||v.category||'voix')}</option>`).join('')}</select><button id="azPremiumPreview" class="btn" type="button" ${premiumVoice?.preview_url?'':'disabled'}>Aperçu</button></div></label>
    <label class="azVoiceChoice"><span>Voix de secours locale</span><select id="azLocalVoiceSelect" class="select"><option value="">Automatique · ${esc(localVoice?.name||'voix française')}</option>${azLocalVoices().map(v=>`<option value="${esc(v.voiceURI)}" ${azAudioSettings.localVoiceURI===v.voiceURI?'selected':''}>${esc(v.name)}</option>`).join('')}</select></label>
    <label><span>Vitesse</span><select id="azVoiceSpeed" class="select">${[.75,1,1.25,1.5].map(v=>`<option value="${v}" ${azAudioSettings.speed===v?'selected':''}>${String(v).replace('.',',')}×</option>`).join('')}</select></label>
    <label class="azBgToggle"><input id="azBackgroundAudio" type="checkbox" ${azAudioSettings.background?'checked':''}><span><b>Lecture arrière-plan</b><small>Notification Android et contrôles écran verrouillé pour les MP3 premium, lorsque le navigateur le permet.</small></span></label>
  </div>`;
  if($('azPremiumRetry'))$('azPremiumRetry').onclick=async()=>{azPremium.checked=false;azPremium.voices=[];await renderVoiceSettings();toast?.(azPremium.configured?'Premium connecté.':'Toujours aucun moteur premium connecté.');azAudioRefreshUI(false)};
  $('azVoiceProfile').onchange=e=>{azAudioSettings.profile=e.target.value;azSaveAudioSettings()};
  $('azVoiceSource').onchange=e=>{azAudioSettings.source=e.target.value;azSaveAudioSettings();renderVoiceSettings()};
  $('azPremiumVoiceSelect').onchange=e=>{azAudioSettings.premiumVoiceId=e.target.value;azSaveAudioSettings();renderVoiceSettings()};
  $('azLocalVoiceSelect').onchange=e=>{azAudioSettings.localVoiceURI=e.target.value;azSaveAudioSettings()};
  $('azVoiceSpeed').onchange=e=>azSetSpeed(e.target.value);
  $('azBackgroundAudio').onchange=e=>{azAudioSettings.background=e.target.checked;azSaveAudioSettings();if(azAudioSettings.background)azSetMediaSession();else azClearMediaSession()};
  if($('azPremiumPreview'))$('azPremiumPreview').onclick=()=>{
    const v=azPremiumVoice();if(!v?.preview_url)return;if(azPreviewAudio){try{azPreviewAudio.pause()}catch{}}
    azPreviewAudio=new Audio(v.preview_url);azPreviewAudio.play().catch(()=>toast?.('Aperçu indisponible.'));
  };
}
function renderVoiceLibraryCurrent(){
  const box=$('azVoiceNowPlaying');if(!box)return;
  if(!azAudioState.lesson){box.innerHTML='<div class="small">Aucune fiche vocale en lecture.</div>';return}
  box.innerHTML=`<div class="azVoiceNowCard"><div><div class="eyebrow">Lecture actuelle</div><h3>${esc(azAudioState.lesson.name)}</h3><div class="small">${esc(AZ_AUDIO_MODES[azAudioState.mode].label)} · ${azAudioState.engine==='premium'?'Premium documentaire':'Voix appareil'} · ${azAudioProgress()}%</div></div><div class="azVoiceNowActions"><button class="btn" id="azVoiceNowBack">−15</button><button class="btn primary" id="azVoiceNowPlay">${azAudioState.paused?'▶':'Ⅱ'}</button><button class="btn" id="azVoiceNowForward">+15</button><button class="btn" id="azVoiceNowStop">■</button></div></div>`;
  $('azVoiceNowBack').onclick=()=>azAudioSeekSeconds(-15);$('azVoiceNowPlay').onclick=()=>azAudioState.paused?azAudioResume():azAudioPause();$('azVoiceNowForward').onclick=()=>azAudioSeekSeconds(15);$('azVoiceNowStop').onclick=stopDailyAudio;
}
function renderVoiceLibrary(){
  renderVoiceSettings().catch(console.warn);renderVoiceLibraryCurrent();
  const list=$('azVoiceLibrary');if(!list)return;
  const q=String($('azVoiceSearch')?.value||'').trim().toLowerCase();
  const arr=(lessons||[]).filter(l=>!isWeeklyReport(l)).filter(l=>!q||[l.name,l.symbol,formatDate(l.lesson_date)].join(' ').toLowerCase().includes(q));
  list.innerHTML=arr.map(l=>`<article class="card azVoiceCard"><div class="azVoiceCardMain"><div class="azVoiceGlyph">◖</div><div><b>${esc(l.name)}</b><small>${esc(formatDate(l.lesson_date))} · ${esc(compactSymbol(l))}</small></div></div><div class="azVoiceCardActions">${Object.entries(AZ_AUDIO_MODES).map(([k,m])=>`<button class="btn ${k==='daily'?'primary':''}" data-voice-play="${l.id}" data-voice-mode="${k}">${m.minutes} min</button>`).join('')}</div></article>`).join('')||'<div class="card cardPad small">Aucune fiche vocale correspondante.</div>';
  list.querySelectorAll('[data-voice-play]').forEach(b=>b.onclick=()=>azAudioPrepareAndStart(lessons.find(l=>Number(l.id)===Number(b.dataset.voicePlay)),b.dataset.voiceMode).catch(console.error));
}
function onArizonaAudioViewChange(v){
  if(v==='voice'){renderVoiceLibrary();const q=$('azVoiceSearch');if(q&&!q.dataset.azBound){q.dataset.azBound='1';q.addEventListener('input',renderVoiceLibrary)}}
}

if('speechSynthesis'in window)speechSynthesis.addEventListener?.('voiceschanged',()=>{if($('view-voice')&&!$('view-voice').classList.contains('hidden'))renderVoiceSettings()});
azPremiumStatus().then(()=>azAudioRefreshUI(false));
