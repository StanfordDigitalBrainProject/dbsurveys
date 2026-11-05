'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const os = require('node:os');
const api = require('../video_rating_pilot/pool.js');
const {buildLists} = require('../scripts/build-lists.js');
const dir = path.join(__dirname, '..', 'video_rating_pilot');
const preview = JSON.parse(fs.readFileSync(path.join(dir, 'pool.json')));
const fixed = JSON.parse(fs.readFileSync(path.join(dir, 'lists.json')));
const clone = value => structuredClone(value);
function poolWith(id, count, labels) {
  const pool = clone(preview);
  pool.pool_id = id;
  pool.clips = pool.clips.filter(c => pool.practice_ids.includes(c.clip_id));
  for (let i = 0; i < count; i++) {
    const clip = {clip_id:'clip-'+i,source_id:'source-'+i,channel_id:'channel-'+i%12,video_url:'clip-'+i+'.mp4',duration:12};
    const predicted = labels(i);
    if (predicted !== undefined) clip.predicted_labels = predicted;
    pool.clips.push(clip);
  }
  return pool;
}
const largePool = () => poolWith('balanced-fixture',120,i => ({captions:i%2===0,
  other_text:Math.floor(i/2)%3===0,logos:Math.floor(i/2)%3===1}));
const captionState = c => (c.predicted_labels || {}).captions;

test('seeded lists balance caption predictions, spread other labels, use distinct sources and spread channels', () => {
  const pool = largePool();
  assert.equal(buildLists(pool).main_count,12);
  const bundle = buildLists(pool,{seed:'proof',listCount:4,mainCount:24});
  assert.deepEqual(bundle.strata,['captioned','not_captioned']);
  assert.deepEqual(bundle,buildLists(pool,{seed:'proof',listCount:4,mainCount:24}));
  assert.notDeepEqual(bundle,buildLists(pool,{seed:'other',listCount:4,mainCount:24}));
  const byId = new Map(pool.clips.map(c => [c.clip_id,c]));
  for (const list of bundle.lists) {
    const mains = list.clip_ids.map(id => byId.get(id));
    assert.equal(mains.length,24);
    assert.equal(new Set(mains.map(c => c.source_id)).size,24);
    assert.ok(mains.every(c => !pool.practice_ids.includes(c.clip_id)));
    for (const captions of [true,false]) {
      const stratum = mains.filter(c => c.predicted_labels.captions === captions);
      assert.equal(stratum.length,12);
      assert.equal(stratum.filter(c => c.predicted_labels.other_text).length,4);
      assert.equal(stratum.filter(c => c.predicted_labels.logos).length,4);
      assert.equal(stratum.filter(c => !c.predicted_labels.other_text && !c.predicted_labels.logos).length,4);
    }
    const channels = new Map();
    for (const c of mains) channels.set(c.channel_id,(channels.get(c.channel_id)||0)+1);
    assert.equal(channels.size,12);
    assert.ok(Math.max(...channels.values())<=2);
  }
  const ids = bundle.lists.flatMap(l => l.clip_ids);
  assert.equal(new Set(ids).size,96,'prefer previously unused sources across lists');
});

test('caption-only predictions balance captioned, not captioned and unknown clips', () => {
  const pool = poolWith('caption-only-fixture',90,i => i<15 ? {captions:true} : i<30 ? {captions:false} :
    i%2 ? {captions:null} : undefined);
  const bundle = buildLists(pool);
  assert.equal(bundle.main_count,12);
  assert.deepEqual(bundle.strata,['captioned','not_captioned','unknown']);
  const byId = new Map(pool.clips.map(c => [c.clip_id,c]));
  for (const list of bundle.lists) {
    const mains = list.clip_ids.map(id => byId.get(id));
    for (const state of [true,false,undefined]) {
      const n = mains.filter(c => (captionState(c) ?? undefined) === state).length;
      assert.ok(n === 4,`caption ${state}: ${n} of 12`);
    }
  }
});

test('preview is reproducible, one source per list, and cannot silently shrink a full study', () => {
  assert.deepEqual(api.validatePool(preview,'https://example.org/pool.json'),preview);
  assert.deepEqual(fixed,buildLists(preview,{seed:'pilot-v1'}));
  assert.throws(()=>buildLists(preview,{mainCount:18}),/Not enough distinct sources/);
  for(const list of fixed.lists) {
    const mains = list.clip_ids.map(id=>preview.clips.find(c=>c.clip_id===id));
    assert.equal(mains.length,12);
    assert.ok(mains.every(c=>!preview.practice_ids.includes(c.clip_id)));
    assert.equal(new Set(mains.map(c=>c.source_id)).size,12);
    assert.ok(mains.every(c=>c.license==='CC BY' && c.predicted_labels.captions===null));
  }
  for(const clip of preview.clips) assert.ok(fs.statSync(path.join(dir,clip.video_url)).size>0);
});

test('PID assignment is repeatable and distributes participants; preview uses randomness', () => {
  const first = api.chooseList(fixed,'person-a');
  assert.equal(api.chooseList(fixed,'person-a'),first);
  assert.equal(new Set(Array.from({length:200},(_,i)=>api.chooseList(fixed,'person-'+i).list_id)).size,8);
  assert.equal(api.chooseList(fixed,null,()=>0),fixed.lists[0]);
  assert.equal(api.chooseList(fixed,null,()=>0.99),fixed.lists[7]);
});

test('manifest rejects missing fields, duplicate clips, invalid labels and credentialed URLs', () => {
  for (const mutate of [p=>delete p.clips[0].channel_id,p=>p.clips.push(p.clips[0]),
    p=>p.clips[0].duration=0,p=>p.clips[0].predicted_labels.captions='false',
    p=>p.clips[0].video_url='https://u:p@example.org/v.mp4',
    p=>p.clips[0].video_url='https://example.org/v.mp4?token=secret',
    p=>p.base_url='file:///tmp/',p=>p.practice_ids=['missing','missing'],
    p=>delete p.clips.find(c=>c.clip_id===p.practice_ids[0]).expected_presence.logos]) {
    const pool=clone(preview);mutate(pool);assert.throws(()=>api.validatePool(pool,'https://example.org/pool.json'));
  }
  const pool=clone(preview);delete pool.clips[0].predicted_labels;
  assert.doesNotThrow(()=>api.validatePool(pool,'https://example.org/pool.json'));
  assert.equal(api.mediaURL('v.mp4','https://cdn.example/clips/'),'https://cdn.example/clips/v.mp4');
});

test('runtime rejects stale lists, unknown clips, duplicate sources and practice clips in lists', () => {
  for(const mutate of [b=>b.pool_id='stale',b=>b.lists[0].clip_ids[0]='missing',
    b=>b.lists[0].clip_ids[0]=preview.practice_ids[0],
    b=>b.lists[0].clip_ids[1]=b.lists[0].clip_ids[0],b=>b.lists[0].clip_ids.pop(),
    b=>b.lists[1].list_id=b.lists[0].list_id]) {
    const bundle=clone(fixed);mutate(bundle);assert.throws(()=>api.validateLists(preview,bundle));
  }
});

function runtime(search='') {
  const added={};
  const context=vm.createContext({URL,URLSearchParams,Map,Set,fetch,
    document:{currentScript:{src:'https://example.org/assets/stimuli.js'}},
    window:{location:{search},innerWidth:1280,innerHeight:720,matchMedia:()=>({matches:true})},
    jsPsych:{data:{addProperties:p=>Object.assign(added,p),get:()=>({last:()=>({values:()=>[added.lastTrial]})})}},
    jsPsychInstructions:'instructions',jsPsychHtmlButtonResponse:'buttons',jsPsychCallFunction:'call',jsPsychVideoRating:'video'});
  for(const file of ['stimuli.js','pool.js','helpers.js','experiment.js']) vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),context);
  return {context,added};
}

test('timeline records identifiers, assignments, labels and practice outcomes without scoring main clips', () => {
  const {context,added}=runtime('?PROLIFIC_PID=preferred&PROLIFIC_ID=legacy&STUDY_ID=s&SESSION_ID=x');
  const timeline=context.videoRatingPilotTimeline(preview,fixed,new URLSearchParams(context.window.location.search));
  assert.equal(added.PROLIFIC_PID,'preferred');assert.equal(added.STUDY_ID,'s');assert.equal(added.SESSION_ID,'x');
  assert.equal(added.list_id,api.chooseList(fixed,'preferred').list_id);
  const videos=Array.from(timeline).filter(t=>t.type==='video');
  const practices=videos.filter(t=>t.data.exp_stage==='practice');
  assert.deepEqual(practices.map(t=>t.data.clip_id),preview.practice_ids);
  const mains=videos.filter(t=>t.data.exp_stage==='test');
  assert.deepEqual(mains.map(t=>t.data.clip_id),api.chooseList(fixed,'preferred').clip_ids);
  const practice=practices[0], data={presence:practice.data.expected_presence,media_error:null};
  practice.on_finish(data);assert.equal(data.practice_correct,true);
  const wrong={presence:{...practice.data.expected_presence,captions:!practice.data.expected_presence.captions},media_error:null};
  practice.on_finish(wrong);assert.equal(wrong.practice_correct,false);
  const failed={presence:{},media_error:'error'};practice.on_finish(failed);assert.equal(failed.practice_correct,null);
  const main=mains[0], result={presence:{}};main.on_finish(result);
  assert.equal(result.practice_correct,undefined);assert.equal(main.data.expected_presence,null);
  assert.equal(main.video_url,'https://example.org/assets/'+preview.clips.find(c=>c.clip_id===main.data.clip_id).video_url);
  context.video_rating_pilot_init();assert.equal(context.video_rating_pilot_experiment.length,1);
});

test('practices and instructions teach captions-only Space and D, and feedback reports recorded presses', () => {
  const {context,added}=runtime();
  const timeline=Array.from(context.videoRatingPilotTimeline(preview,fixed,new URLSearchParams()));
  const pages=timeline.find(t=>t.type==='instructions').pages.join(' ');
  assert.match(pages,/Press <strong>Space<\/strong> as soon as you notice captions or subtitles[^<]*Do not press Space for other added text or logos/);
  assert.match(pages,/Press <strong>D<\/strong> whenever something is distracting or inappropriate/);
  const videos=timeline.filter(t=>t.type==='video');
  const [first,second]=videos.filter(t=>t.data.exp_stage==='practice');
  assert.match(first.prompt,/press Space as soon as a caption appears, but not for the timecode/);
  assert.match(second.prompt,/press Space only for a caption/);assert.match(second.prompt,/press D once/);
  assert.ok(videos.filter(t=>t.data.exp_stage==='test').every(t=>!('prompt' in t)),'main clips use the plugin default prompt');
  const feedback=timeline.filter(t=>t.data && t.data.trial_id==='practice_feedback');
  added.lastTrial={media_error:null,practice_correct:true,notice_times:[1.23,2.5],distracting_times:[]};
  const one=feedback[0].stimulus();
  assert.match(one,/Space was recorded 2 times, first at 1\.2 s\. In the videos, press Space as soon as you notice captions or subtitles/);
  assert.doesNotMatch(one,/D press|D was/);
  const two=feedback[1].stimulus();
  assert.match(two,/Space was recorded 2 times.*This example has no captions, so Space was not needed.*No D press was recorded/);
  added.lastTrial={media_error:null,practice_correct:true,notice_times:[],distracting_times:[0.5]};
  assert.match(feedback[1].stimulus(),/No Space press was recorded\. This example has no captions.*D was recorded 1 time, first at 0\.5 s/);
});

test('legacy deploy identifier remains supported and small/coarse devices are blocked', () => {
  const {context,added}=runtime('?PROLIFIC_ID=legacy');
  context.videoRatingPilotTimeline(preview,fixed,new URLSearchParams('?PROLIFIC_ID=legacy'));
  assert.equal(added.PROLIFIC_PID,'legacy');assert.equal(context.videoRatingPilot.desktop(),true);
  context.window.innerWidth=390;assert.equal(context.videoRatingPilot.desktop(),false);
  context.window.innerWidth=1280;context.window.matchMedia=()=>({matches:false});assert.equal(context.videoRatingPilot.desktop(),false);
  context.window.matchMedia=()=>({matches:true});
  for(const [w,h,ok] of [[1366,640,true],[1280,590,true],[1000,520,true],[999,700,false],[1280,519,false]]) {
    Object.assign(context.window,{innerWidth:w,innerHeight:h});assert.equal(context.videoRatingPilot.desktop(),ok,`${w}x${h}`);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(context.videoRatingPilot.rectangle({x:.8,y:.9},{x:.2,y:.3}))),
    {x:.2,y:.3,width:.6000000000000001,height:.6000000000000001});
});

test('CLI writes a consumer-valid bundle and fails explicitly for insufficient sources', () => {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'video-rating-list-test-'));
  try {
    const out=path.join(tmp,'lists.json');const script=path.join(dir,'../scripts/build-lists.js');
    const run=spawnSync(process.execPath,[script,path.join(dir,'pool.json'),out,'--seed','cli']);
    assert.equal(run.status,0,run.stderr.toString());
    assert.equal(api.validateLists(preview,JSON.parse(fs.readFileSync(out))).main_count,12);
    const smaller=spawnSync(process.execPath,[script,path.join(dir,'pool.json'),out,'--main-count','10']);
    assert.equal(smaller.status,0,smaller.stderr.toString());
    assert.equal(api.validateLists(preview,JSON.parse(fs.readFileSync(out))).main_count,10);
    const fail=spawnSync(process.execPath,[script,path.join(dir,'pool.json'),out,'--main-count','18']);
    assert.equal(fail.status,1);assert.match(fail.stderr.toString(),/distinct sources/);
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});


test('letterbox geometry normalizes to the video picture, excluding bars', () => {
  const {context}=runtime();
  const rect=(w,h)=>JSON.parse(JSON.stringify(context.videoRatingPilot.pictureRect(w,h,480,270)));
  assert.deepEqual(rect(1920,1080),{x:0,y:0,width:480,height:270});
  assert.deepEqual(rect(1080,1920),{x:164.0625,y:0,width:151.875,height:270});
  assert.deepEqual(rect(1000,1000),{x:105,y:0,width:270,height:270});
  assert.deepEqual(rect(2400,1000),{x:0,y:35,width:480,height:200});
});

test('session frame is one 16:9 size chosen from the viewport, never below the minimum', () => {
  const {context}=runtime();
  const frame=(w,h)=>context.videoRatingPilot.frameWidth(w,h);
  assert.equal(frame(1000,520),480);
  for(const [w,h] of [[1366,640],[1280,690],[1280,590],[1920,970]]) assert.equal(frame(w,h),656,`${w}x${h}`);
  assert.equal(frame(1300,560),592);assert.equal(frame(1100,520),528);
  for(let w=1000;w<=2560;w+=37) for(let h=520;h<=1440;h+=29) {
    const width=frame(w,h);
    assert.ok(width>=480 && width<=656 && width%16===0,`${w}x${h}: ${width}`);
    assert.ok(width===480 || (width<=w-520 && width*9/16<=h-220),`${w}x${h}: ${width} exceeds the window`);
  }
});
