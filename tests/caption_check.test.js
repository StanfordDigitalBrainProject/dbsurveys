'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const os = require('node:os');
const api = require('../caption_check/pool.js');
const {buildLists} = require('../scripts/build-lists.js');
const dir = path.join(__dirname, '..', 'caption_check');
const preview = JSON.parse(fs.readFileSync(path.join(dir, 'pool.json')));
const fixed = JSON.parse(fs.readFileSync(path.join(dir, 'lists.json')));
const clone = value => structuredClone(value);
function largePool() {
  const pool = clone(preview);
  pool.pool_id = 'balanced-fixture';
  pool.clips = pool.clips.filter(c => c.role === 'check');
  for (let i = 0; i < 120; i++) pool.clips.push({clip_id:'clip-'+i,source_id:'source-'+i,
    channel_id:'channel-'+i%12,video_url:'clip-'+i+'.mp4',duration:12,
    predicted_labels:{captions:i%4===0,other_text:i%4===1,logos:i%4===2}});
  return pool;
}

test('seeded lists mix four prediction strata, use distinct sources and spread channels', () => {
  const pool = largePool();
  assert.equal(buildLists(pool).main_count,22);
  const bundle = buildLists(pool,{seed:'proof',listCount:4,mainCount:24});
  assert.deepEqual(bundle,buildLists(pool,{seed:'proof',listCount:4,mainCount:24}));
  assert.notDeepEqual(bundle,buildLists(pool,{seed:'other',listCount:4,mainCount:24}));
  const byId = new Map(pool.clips.map(c => [c.clip_id,c]));
  for (const list of bundle.lists) {
    const selected = list.clip_ids.map(id => byId.get(id));
    assert.equal(selected.length,26);
    assert.equal(new Set(selected.map(c => c.source_id)).size,26);
    assert.equal(selected.filter(c => c.role === 'check').length,2);
    const mains = selected.filter(c => c.role !== 'check');
    for (const category of api.categories) assert.equal(mains.filter(c => c.predicted_labels[category]).length,6);
    assert.equal(mains.filter(c => api.categories.every(k => !c.predicted_labels[k])).length,6);
    const channels = new Map();
    for (const c of mains) channels.set(c.channel_id,(channels.get(c.channel_id)||0)+1);
    assert.equal(channels.size,12);
    assert.ok(Math.max(...channels.values())<=2);
  }
  const ids = bundle.lists.flatMap(l => l.clip_ids).filter(id => id.startsWith('clip-'));
  assert.equal(new Set(ids).size,96,'prefer previously unused sources across lists');
});

test('preview is reproducible, one source per list, and cannot silently shrink a full study', () => {
  assert.deepEqual(api.validatePool(preview,'https://example.org/pool.json'),preview);
  assert.deepEqual(fixed,buildLists(preview,{seed:'preview-v2',mainCount:16,listCount:8}));
  assert.throws(()=>buildLists(preview),/Not enough distinct sources/);
  for(const list of fixed.lists) {
    const mains = list.clip_ids.map(id=>preview.clips.find(c=>c.clip_id===id)).filter(c=>c.role==='main');
    assert.equal(mains.length,16);
    assert.equal(new Set(mains.map(c=>c.source_id)).size,16);
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
    p=>p.base_url='file:///tmp/',p=>p.practice_ids=['missing','missing']]) {
    const pool=clone(preview);mutate(pool);assert.throws(()=>api.validatePool(pool,'https://example.org/pool.json'));
  }
  const pool=clone(preview);delete pool.clips[0].predicted_labels;
  assert.doesNotThrow(()=>api.validatePool(pool,'https://example.org/pool.json'));
  assert.equal(api.mediaURL('v.mp4','https://cdn.example/clips/'),'https://cdn.example/clips/v.mp4');
});

test('runtime rejects stale lists, unknown clips, duplicate sources and missing checks', () => {
  for(const mutate of [b=>b.pool_id='stale',b=>b.lists[0].clip_ids[0]='missing',
    b=>b.lists[0].clip_ids[1]=b.lists[0].clip_ids[0],b=>b.lists[0].clip_ids.pop(),
    b=>b.lists[1].list_id=b.lists[0].list_id]) {
    const bundle=clone(fixed);mutate(bundle);assert.throws(()=>api.validateLists(preview,bundle));
  }
});

function runtime(search='') {
  const added={};
  const context=vm.createContext({URL,URLSearchParams,Map,Set,fetch,
    document:{currentScript:{src:'https://example.org/assets/stimuli.js'}},
    window:{location:{search},innerWidth:1200,matchMedia:()=>({matches:true})},
    jsPsych:{data:{addProperties:p=>Object.assign(added,p)}},
    jsPsychInstructions:'instructions',jsPsychHtmlButtonResponse:'buttons',jsPsychCallFunction:'call',jsPsychCaptionVideo:'video'});
  for(const file of ['stimuli.js','pool.js','helpers.js','experiment.js']) vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),context);
  return {context,added};
}

test('timeline records identifiers, assignments, labels and check outcomes without scoring main clips', () => {
  const {context,added}=runtime('?PROLIFIC_PID=preferred&PROLIFIC_ID=legacy&STUDY_ID=s&SESSION_ID=x');
  const timeline=context.captionCheckTimeline(preview,fixed,new URLSearchParams(context.window.location.search));
  assert.equal(added.PROLIFIC_PID,'preferred');assert.equal(added.STUDY_ID,'s');assert.equal(added.SESSION_ID,'x');
  assert.equal(added.list_id,api.chooseList(fixed,'preferred').list_id);
  const videos=Array.from(timeline).filter(t=>t.type==='video');
  assert.equal(videos.filter(t=>t.data.exp_stage==='practice').length,2);
  const mains=videos.filter(t=>t.data.exp_stage==='test');assert.equal(mains.length,18);
  assert.equal(mains.filter(t=>t.data.is_check).length,2);
  const check=mains.find(t=>t.data.is_check), data={presence:check.data.expected_presence,media_error:null};
  check.on_finish(data);assert.equal(data.check_passed,true);
  const failed={presence:{},media_error:'error'};check.on_finish(failed);assert.equal(failed.check_passed,null);
  const main=mains.find(t=>!t.data.is_check), result={presence:{}};main.on_finish(result);
  assert.equal(result.check_passed,undefined);
  assert.equal(main.video_url,'https://example.org/assets/'+preview.clips.find(c=>c.clip_id===main.data.clip_id).video_url);
  context.caption_check_init();assert.equal(context.caption_check_experiment.length,1);
});

test('legacy deploy identifier remains supported and small/coarse devices are blocked', () => {
  const {context,added}=runtime('?PROLIFIC_ID=legacy');
  context.captionCheckTimeline(preview,fixed,new URLSearchParams('?PROLIFIC_ID=legacy'));
  assert.equal(added.PROLIFIC_PID,'legacy');assert.equal(context.captionCheck.desktop(),true);
  context.window.innerWidth=390;assert.equal(context.captionCheck.desktop(),false);
  context.window.innerWidth=1200;context.window.matchMedia=()=>({matches:false});assert.equal(context.captionCheck.desktop(),false);
  assert.deepEqual(JSON.parse(JSON.stringify(context.captionCheck.rectangle({x:.8,y:.9},{x:.2,y:.3}))),
    {x:.2,y:.3,width:.6000000000000001,height:.6000000000000001});
});

test('CLI writes a consumer-valid bundle and fails explicitly for insufficient sources', () => {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'caption-list-test-'));
  try {
    const out=path.join(tmp,'lists.json');const script=path.join(dir,'../scripts/build-lists.js');
    const run=spawnSync(process.execPath,[script,path.join(dir,'pool.json'),out,'--main-count','16','--seed','cli']);
    assert.equal(run.status,0,run.stderr.toString());
    assert.equal(api.validateLists(preview,JSON.parse(fs.readFileSync(out))).main_count,16);
    const fail=spawnSync(process.execPath,[script,path.join(dir,'pool.json'),out]);
    assert.equal(fail.status,1);assert.match(fail.stderr.toString(),/distinct sources/);
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});
