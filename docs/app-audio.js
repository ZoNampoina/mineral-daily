// ARIZONA V21.9 · Résumé audio quotidien (~5 min)
const AZ_AUDIO_TARGET_WPM=138;
const azAudioState={lessonId:null,script:'',chunks:[],index:0,rate:1,playing:false,paused:false,utterance:null};

function azLocalISODate(){
  const d=new Date(),p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
}
function azAudioIsToday(l){return !!l&&!isWeeklyReport(l)&&String(l.lesson_date||'')===azLocalISODate()}
function azAudioClean(v){
  return String(v||'')
    .replace(/\\+/g,' ')
    .replace(/^[-•]\s*/gm,'')
    .replace(/\s+/g,' ')
    .replace(/\s+([,.;:!?])/g,'$1')
    .trim();
}
function azAudioWords(v,max){
  const a=azAudioClean(v).split(/\s+/).filter(Boolean);
  return a.slice(0,max).join(' ')+(a.length>max?'…':'');
}
function azAudioPart(raw,h,max,label){
  const s=azAudioWords(section(raw,h),max);
  return s?(label?label+' '+s:s):'';
}
function buildDailyAudioScript(l){
  if(!l)return'';
  const cacheKey='az_audio_script_v3_'+l.id+'_'+String(l.updated_at||l.lesson_date||'');
  try{const cached=localStorage.getItem(cacheKey);if(cached)return cached}catch{}
  const raw=String(l.raw_text||'');
  const parts=[
    `Bienvenue dans le briefing ARIZONA du ${formatDate(l.lesson_date)}. Aujourd’hui, la fiche est consacrée à ${l.name}. Ce résumé dure environ cinq minutes et va à l’essentiel pour une lecture d’ingénieur minier.`,
    azAudioPart(raw,'RÉSUMÉ EXÉCUTIF',95,'Pour commencer.'),
    [azAudioPart(raw,'CARACTÉRISTIQUES CHIMIQUES',30,''),azAudioPart(raw,'CARACTÉRISTIQUES PHYSIQUES',30,'')].filter(Boolean).length?
      'Sur les propriétés principales. '+azAudioWords([section(raw,'CARACTÉRISTIQUES CHIMIQUES'),section(raw,'CARACTÉRISTIQUES PHYSIQUES')].join(' '),60):'',
    azAudioPart(raw,'GÉOLOGIE ET GENÈSE',75,'Du point de vue géologique.'),
    azAudioPart(raw,'MADAGASCAR',90,'À Madagascar.'),
    azAudioWords([azAudioPart(raw,'EXPLOITATION',45,''),azAudioPart(raw,'TRAITEMENT / MINÉRALURGIE',45,'')].filter(Boolean).join(' '),90)?
      'Pour l’exploitation et le traitement. '+azAudioWords([section(raw,'EXPLOITATION'),section(raw,'TRAITEMENT / MINÉRALURGIE')].join(' '),90):'',
    azAudioWords([section(raw,'USAGES'),section(raw,'MARCHÉ INTERNATIONAL'),section(raw,'ÉCONOMIE')].join(' '),105)?
      'Concernant les usages et l’économie. '+azAudioWords([section(raw,'USAGES'),section(raw,'MARCHÉ INTERNATIONAL'),section(raw,'ÉCONOMIE')].join(' '),105):'',
    azAudioWords([section(raw,'ENVIRONNEMENT'),section(raw,'GÉOPOLITIQUE')].join(' '),75)?
      'Pour les enjeux environnementaux et géopolitiques. '+azAudioWords([section(raw,'ENVIRONNEMENT'),section(raw,'GÉOPOLITIQUE')].join(' '),75):'',
    azAudioPart(raw,'À RETENIR',65,'Les points à retenir sont les suivants.'),
    `Fin du briefing ARIZONA sur ${l.name}. Tu peux maintenant ouvrir les détails techniques, le cas pratique ou le quiz pour approfondir.`
  ].filter(Boolean);
  let script=azAudioClean(parts.join(' '));
  const words=script.split(/\s+/).filter(Boolean);
  if(words.length>760)script=words.slice(0,760).join(' ')+'.';
  try{localStorage.setItem(cacheKey,script)}catch{}
  return script;
}
function azAudioChunks(text){
  const sentences=String(text||'').match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)||[];
  const out=[];
  for(const s0 of sentences){
    const s=azAudioClean(s0);if(!s)continue;
    if(s.length<=190){out.push(s);continue}
    const clauses=s.split(/(?<=,|;|:)\s+/);let buf='';
    for(const c of clauses){
      if((buf+' '+c).trim().length>190&&buf){out.push(buf.trim());buf=c}else buf=(buf+' '+c).trim();
    }
    if(buf)out.push(buf.trim());
  }
  return out;
}
function azAudioVoice(){
  if(!('speechSynthesis'in window))return null;
  const voices=speechSynthesis.getVoices()||[];
  const fr=voices.filter(v=>/^fr([_-]|$)/i.test(v.lang||''));
  const maleHint=/thomas|henri|paul|daniel|nicolas|mathieu|yann|louis|hugo|alain|jean|male|homme/i;
  return fr.find(v=>v.localService&&maleHint.test(v.name||''))||fr.find(v=>v.localService)||fr.find(v=>maleHint.test(v.name||''))||fr[0]||voices.find(v=>v.default)||null;
}
function azAudioDuration(script,rate=1){
  const wc=String(script||'').split(/\s+/).filter(Boolean).length;
  const min=Math.max(1,wc/(AZ_AUDIO_TARGET_WPM*Math.max(.5,rate)));
  const m=Math.floor(min),s=Math.round((min-m)*60);
  return s>=55?`~${m+1} min`:(s<5?`~${m} min`:`~${m} min ${s} s`);
}
function azAudioPercent(){
  if(!azAudioState.chunks.length)return 0;
  return Math.min(100,Math.round((azAudioState.index/azAudioState.chunks.length)*100));
}
function azAudioRefreshUI(){
  document.querySelectorAll('[data-az-audio-player]').forEach(box=>{
    const same=Number(box.dataset.lessonId)===Number(azAudioState.lessonId);
    const play=box.querySelector('[data-audio-play]');
    const bar=box.querySelector('[data-audio-progress]');
    const pct=box.querySelector('[data-audio-pct]');
    if(play)play.textContent=same&&azAudioState.playing?(azAudioState.paused?'▶':'Ⅱ'):'▶';
    const p=same?azAudioPercent():0;if(bar)bar.style.width=p+'%';if(pct)pct.textContent=p+'%';
    box.querySelectorAll('[data-audio-rate]').forEach(b=>b.classList.toggle('active',Number(b.dataset.audioRate)===(same?azAudioState.rate:1)));
  });
}
function azAudioSpeakNext(){
  if(!azAudioState.playing||azAudioState.paused)return;
  if(azAudioState.index>=azAudioState.chunks.length){
    azAudioState.playing=false;azAudioState.paused=false;azAudioState.index=azAudioState.chunks.length;azAudioRefreshUI();return;
  }
  const u=new SpeechSynthesisUtterance(azAudioState.chunks[azAudioState.index]);
  u.lang='fr-FR';u.rate=azAudioState.rate;u.pitch=1;u.volume=1;
  const voice=azAudioVoice();if(voice)u.voice=voice;
  azAudioState.utterance=u;
  u.onend=()=>{if(!azAudioState.playing)return;azAudioState.index++;azAudioRefreshUI();azAudioSpeakNext()};
  u.onerror=e=>{
    if(e.error==='interrupted'||e.error==='canceled')return;
    azAudioState.playing=false;azAudioState.paused=false;azAudioRefreshUI();
    if(typeof toast==='function')toast('Lecture audio interrompue par le moteur vocal de l’appareil.');
  };
  speechSynthesis.speak(u);
  azAudioRefreshUI();
}
function startDailyAudio(l){
  if(!('speechSynthesis'in window)||typeof SpeechSynthesisUtterance==='undefined'){
    if(typeof toast==='function')toast('La synthèse vocale n’est pas disponible sur cet appareil.');return;
  }
  const script=buildDailyAudioScript(l);if(!script)return;
  speechSynthesis.cancel();
  azAudioState.lessonId=Number(l.id);azAudioState.script=script;azAudioState.chunks=azAudioChunks(script);azAudioState.index=0;azAudioState.playing=true;azAudioState.paused=false;
  azAudioSpeakNext();
}
async function toggleDailyAudio(l){
  const same=Number(azAudioState.lessonId)===Number(l.id);
  if(same&&azAudioState.playing){
    if(azAudioState.paused){speechSynthesis.resume();azAudioState.paused=false}else{speechSynthesis.pause();azAudioState.paused=true}
    azAudioRefreshUI();return;
  }
  let full=l;
  if(String(full?.raw_text||'').length<500&&typeof ensureLessonDetail==='function'){
    const run=()=>ensureLessonDetail(full.id);
    try{
      full=typeof withLoading==='function'
        ?await withLoading('Préparation du résumé audio…',run,{delay:80,subtitle:'Chargement de la fiche complète.'})
        :await run();
    }catch(e){
      console.error(e);
      if(typeof toast==='function')toast('Impossible de préparer le résumé audio.');
      return;
    }
  }
  startDailyAudio(full);
}
function stopDailyAudio(){
  if('speechSynthesis'in window)speechSynthesis.cancel();
  azAudioState.playing=false;azAudioState.paused=false;azAudioState.index=0;azAudioRefreshUI();
}
function setDailyAudioRate(l,rate){
  rate=Number(rate)||1;azAudioState.rate=rate;
  const same=Number(azAudioState.lessonId)===Number(l.id);
  if(same&&azAudioState.playing){
    speechSynthesis.cancel();azAudioState.paused=false;setTimeout(azAudioSpeakNext,40);
  }
  azAudioRefreshUI();
}
function renderDailyAudio(l,targetId){
  const box=$(targetId);if(!box)return;
  if(!azAudioIsToday(l)){box.innerHTML='';return}
  const hasDetail=String(l?.raw_text||'').length>=500;
  const script=hasDetail?buildDailyAudioScript(l):'';
  const duration=hasDetail?azAudioDuration(script,1):'~5 min',supported='speechSynthesis'in window;
  box.innerHTML=`<div class="azAudioPlayer" data-az-audio-player data-lesson-id="${Number(l.id)}">
    <div class="azAudioHead"><div><div class="eyebrow">Résumé audio</div><b>${esc(l.name)} · ${duration}</b></div><span class="azAudioVoice">${supported?'Voix française appareil':'Audio indisponible'}</span></div>
    <div class="azAudioControls">
      <button class="btn primary azAudioPlay" type="button" data-audio-play aria-label="Lire ou mettre en pause">▶</button>
      <button class="btn azAudioStop" type="button" data-audio-stop aria-label="Arrêter">■</button>
      <div class="azAudioRates" aria-label="Vitesse de lecture">${[.75,1,1.25,1.5].map(r=>`<button type="button" class="btn azAudioRate ${r===1?'active':''}" data-audio-rate="${r}">${String(r).replace('.',',')}×</button>`).join('')}</div>
    </div>
    <div class="azAudioProgressRow"><div class="azAudioTrack"><i data-audio-progress></i></div><span data-audio-pct>0%</span></div>
    <div class="small azAudioNote">Briefing automatique d’environ 5 min · script conservé sur l’appareil.</div>
  </div>`;
  box.querySelector('[data-audio-play]')?.addEventListener('click',()=>{toggleDailyAudio(l).catch?.(console.error)});
  box.querySelector('[data-audio-stop]')?.addEventListener('click',stopDailyAudio);
  box.querySelectorAll('[data-audio-rate]').forEach(b=>b.addEventListener('click',()=>setDailyAudioRate(l,b.dataset.audioRate)));
  azAudioRefreshUI();
}

if('speechSynthesis'in window&&'onvoiceschanged'in speechSynthesis){
  speechSynthesis.addEventListener?.('voiceschanged',azAudioRefreshUI);
}
