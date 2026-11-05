/* Run in Chrome on a page loading the experiment scripts, e.g. through
   chrome-devtools-axi eval. Returns observable DOM/data assertions, not snapshots. */
async function runVideoRatingBrowserTests() {
  const assertions=[];
  const assert=(value,message)=>{if(!value)throw new Error(message);assertions.push(message);};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const until=async predicate=>{
    const deadline=performance.now()+20000;
    while(!predicate()){if(performance.now()>deadline)throw new Error('Browser condition timed out');await wait(25);}
  };
  const display=document.createElement('div');document.body.replaceChildren(display);
  let result=null;
  const plugin=new jsPsychVideoRating({finishTrial:data=>{result=data;}});
  const q=s=>display.querySelector(s);
  const start=url=>{result=null;plugin.trial(display,{heading:'Browser verification',video_url:new URL(url,videoRatingPilotAssetBase).href});};
  const key=(code,repeat=false)=>document.dispatchEvent(new KeyboardEvent('keydown',{code,key:code==='Space'?' ':'d',repeat,bubbles:true,cancelable:true}));
  const play=async(presses=[])=>{
    q('.play').click();
    for(const [code,time] of presses){await until(()=>q('video').currentTime>=time);key(code);}
    await until(()=>!q('.feelings').hidden);
  };
  const feelings=()=>{
    q('input[name="pleasantness"][value="9"]').click();
    q('input[name="arousal"][value="1"]').click();q('.feelings button').click();
  };
  const suitability=()=>{q('input[name="suitability"][value="none"]').click();q('.suitability-next').click();};
  const presence=values=>{
    for(const [category,value] of Object.entries(values))q(`input[name="${category}"][value="${value?'yes':'no'}"]`).click();
    q('.presence button').click();
  };
  const seek=async time=>{q('.seek').value=time;q('.seek').dispatchEvent(new Event('input'));await until(()=>!q('.drawing').hidden);};
  const draw=(x=.1,y=.7,w=.6,h=.2)=>{
    const drawing=q('.drawing'), bounds=drawing.getBoundingClientRect();
    // Synthetic pointer dispatch has no active OS pointer; native capture is
    // separately exercised by chrome-devtools-axi drag in the local smoke test.
    const capture=drawing.setPointerCapture;drawing.setPointerCapture=()=>{};
    for(const [type,px,py] of [['pointerdown',x,y],['pointermove',x+w,y+h],['pointerup',x+w,y+h]])
      drawing.dispatchEvent(new PointerEvent(type,{button:0,pointerId:1,clientX:bounds.left+px*bounds.width,clientY:bounds.top+py*bounds.height}));
    drawing.setPointerCapture=capture;
  };
  const save=rating=>{q(`input[name="distraction"][value="${rating}"]`).click();q('.save').click();};
  start('media/caption.mp4');
  assert(q('.presence').hidden,'questions are hidden until full playback');
  assert(!q('.key-reminder').hidden && q('.key-reminder').textContent.includes('Space') && q('.key-reminder').textContent.includes('D'),'a key reminder sits under the video before playback');
  key('Space');key('KeyD');
  q('.play').click();await until(()=>q('video').currentTime>=1.2);
  const pausedBefore=q('video').paused;key('Space');
  assert(!pausedBefore && !q('video').paused,'Space never pauses playback');
  assert(q('.key-notice').classList.contains('pressed'),'Space gives a visible acknowledgement');
  key('Space',true);await until(()=>q('video').currentTime>=2.2);key('KeyD');
  assert(q('.key-distracting').classList.contains('pressed') && !q('video').paused,'D is acknowledged without pausing playback');
  await until(()=>q('video').currentTime>=2.6);key('Space');
  await until(()=>!q('.feelings').hidden);
  assert(q('.key-reminder').hidden,'the key reminder is hidden after playback');
  assert(!q('.feelings').hidden && q('.suitability').hidden && q('.presence').hidden,'feelings are asked before suitability and overlays');
  q('.feelings button').click();assert(!q('.feelings').hidden,'both feelings answers are required');
  feelings();assert(!q('.suitability').hidden && q('.presence').hidden,'suitability comes second');
  assert(q('.suitability-next').disabled,'suitability requires an explicit selection');
  q('input[value="violence"]').click();q('input[value="other_upsetting"]').click();
  q('input[name="suitability"][value="none"]').click();
  assert(!q('input[value="violence"]').checked && !q('input[value="other_upsetting"]').checked,'None clears all flags');
  q('input[value="violence"]').click();q('input[value="other_upsetting"]').click();
  assert(!q('input[value="none"]').checked,'selecting a flag clears None');
  q('.suitability-next').click();assert(!q('.presence').hidden,'overlays come third');
  q('input[name="captions"][value="yes"]').click();q('.presence button').click();
  assert(!q('.presence').hidden,'all three presence answers are required');
  presence({captions:true,other_text:true,logos:false});await until(()=>!q('.drawing').hidden);
  assert(Math.abs(Number(q('.seek').value)-1.2)<.15 && q('.status').textContent.includes('first Space press'),'annotation opens on the frame of the first Space press');
  await seek(2);
  assert(q('.save').disabled,'a positive answer requires boxes and a rating');
  draw();assert(q('.save').disabled,'boxes alone cannot submit a category');
  await seek(3);draw(.2,.1,.3,.15);
  assert(q('.box-count').textContent.startsWith('2 '),'boxes survive frame changes');
  q('.undo').click();assert(q('.box-count').textContent.startsWith('1 '),'undo removes only the last box');
  draw(.2,.1,.3,.15);save(1);await seek(1.5);draw(.1,.1,.4,.1);save(5);
  assert(result.feelings.pleasantness===9 && result.feelings.arousal===1,'9-point feelings answers are saved without defaults');
  assert(result.suitability_flags.join(',')==='violence,other_upsetting' && result.suitability_none===false && !('suitability_other_text' in result),'multiple suitability flags are saved without free text or an overall score');
  assert(result.played_through && result.media_error===null,'successful video records full playback');
  assert(result.presence.captions && result.presence.other_text && !result.presence.logos,'presence remains separate across categories');
  assert(result.distraction.captions===1 && result.distraction.other_text===5 && result.distraction.logos===null,'present and not distracting is allowed; absent ratings remain null');
  assert(result.boxes.length===3,'multiple category boxes are saved');
  assert(result.boxes[0].category==='captions' && result.boxes[0].rating===1 && Math.abs(result.boxes[0].video_time-2)<.1,'each box records category, rating and actual video time');
  assert(Math.abs(result.boxes[0].x-.1)<.001 && Math.abs(result.boxes[0].width-.6)<.001,'box coordinates are normalized to the video frame');
  assert(result.notice_times.length===2 && result.notice_times[0]>=1.2 && result.notice_times[0]<result.notice_times[1],'Space presses record ordered video times, ignoring pre-playback and held-key repeats');
  assert(result.distracting_times.length===1 && Math.abs(result.distracting_times[0]-2.2)<.15,'D presses are recorded separately');
  assert(result.notice_rts_ms.length===2 && result.notice_rts_ms[0]>=1000 && result.distracting_rts_ms[0]>result.notice_rts_ms[0],'each press records elapsed time since playback start');
  assert(result.annotation_frame_source==='first_notice','the annotation frame source is recorded');
  assert(result.rt>=4000 && result.presence_rt_ms>=0 && result.annotation_rt_ms>=0,'trial timing records actual elapsed browser time');
  const annotated=result;
  start('media/no-caption.mp4');await play([['KeyD',0.5]]);feelings();suitability();presence({captions:false,other_text:true,logos:false});
  await until(()=>!q('.drawing').hidden);
  assert(Number(q('.seek').value)===0,'without a Space press, annotation opens at the clip start');
  draw();save(2);
  assert(result.notice_times.length===0 && Array.isArray(result.notice_rts_ms) && result.distracting_times.length===1,'no Space press is an empty list, not an answer');
  assert(result.annotation_frame_source==='clip_start','the clip-start frame source is recorded');
  start('media/no-caption.mp4');await play();feelings();suitability();presence({captions:false,other_text:false,logos:false});
  assert(result.notice_times.length===0 && result.distracting_times.length===0 && result.annotation_frame_source===null,'no presses and no annotation leave empty lists and a null frame source');
  assert(result.suitability_none===true && result.suitability_flags.length===0,'None is recorded as an explicit suitability answer');
  assert(result.boxes.length===0 && Object.values(result.distraction).every(v=>v===null),'all-negative trial ends without drawing or ratings');
  start('media/does-not-exist.mp4');await until(()=>!q('.error').hidden);
  q('.retry').click();assert(!q('.play').hidden,'media errors offer retry');
  await until(()=>!q('.error').hidden);q('.skip').click();
  assert(result.feelings===null && result.suitability_flags===null && result.suitability_none===null,'media failure keeps new answers unknown');
  assert(result.media_error && Object.values(result.presence).every(v=>v===null) && result.boxes.length===0,'failed media never becomes an absence answer');
  return {assertions,annotated};
}
