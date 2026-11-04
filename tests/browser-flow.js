/* Run in Chrome on a page loading the experiment scripts, e.g. through
   chrome-devtools-axi eval. Returns observable DOM/data assertions, not snapshots. */
async function runCaptionBrowserTests() {
  const assertions=[];
  const assert=(value,message)=>{if(!value)throw new Error(message);assertions.push(message);};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const until=async predicate=>{
    const deadline=performance.now()+20000;
    while(!predicate()){if(performance.now()>deadline)throw new Error('Browser condition timed out');await wait(25);}
  };
  const display=document.createElement('div');document.body.replaceChildren(display);
  let result=null;
  const plugin=new jsPsychCaptionVideo({finishTrial:data=>{result=data;}});
  const q=s=>display.querySelector(s);
  const start=url=>{result=null;plugin.trial(display,{heading:'Browser verification',video_url:new URL(url,captionCheckAssetBase).href});};
  const play=async()=>{q('.play').click();await until(()=>!q('.presence').hidden);};
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
  await play();
  q('input[name="captions"][value="yes"]').click();q('.presence button').click();
  assert(!q('.presence').hidden,'all three presence answers are required');
  presence({captions:true,other_text:true,logos:false});await seek(2);
  assert(q('.save').disabled,'a positive answer requires boxes and a rating');
  draw();assert(q('.save').disabled,'boxes alone cannot submit a category');
  await seek(3);draw(.2,.1,.3,.15);
  assert(q('.box-count').textContent.startsWith('2 '),'boxes survive frame changes');
  q('.undo').click();assert(q('.box-count').textContent.startsWith('1 '),'undo removes only the last box');
  draw(.2,.1,.3,.15);save(1);await seek(1.5);draw(.1,.1,.4,.1);save(5);
  assert(result.played_through && result.media_error===null,'successful video records full playback');
  assert(result.presence.captions && result.presence.other_text && !result.presence.logos,'presence remains separate across categories');
  assert(result.distraction.captions===1 && result.distraction.other_text===5 && result.distraction.logos===null,'present and not distracting is allowed; absent ratings remain null');
  assert(result.boxes.length===3,'multiple category boxes are saved');
  assert(result.boxes[0].category==='captions' && result.boxes[0].rating===1 && Math.abs(result.boxes[0].video_time-2)<.1,'each box records category, rating and actual video time');
  assert(Math.abs(result.boxes[0].x-.1)<.001 && Math.abs(result.boxes[0].width-.6)<.001,'box coordinates are normalized to the video frame');
  assert(result.rt>=4000 && result.presence_rt_ms>=0 && result.annotation_rt_ms>=0,'trial timing records actual elapsed browser time');
  const annotated=result;
  start('media/no-caption.mp4');await play();presence({captions:false,other_text:false,logos:false});
  assert(result.boxes.length===0 && Object.values(result.distraction).every(v=>v===null),'all-negative trial ends without drawing or ratings');
  start('media/does-not-exist.mp4');await until(()=>!q('.error').hidden);
  q('.retry').click();assert(!q('.play').hidden,'media errors offer retry');
  await until(()=>!q('.error').hidden);q('.skip').click();
  assert(result.media_error && Object.values(result.presence).every(v=>v===null) && result.boxes.length===0,'failed media never becomes an absence answer');
  return {assertions,annotated};
}
