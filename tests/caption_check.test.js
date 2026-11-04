const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dir = path.join(__dirname, '..', 'caption_check');
const assetBase = 'https://deploy.example/static/caption_check/';

function load(search) {
  const added = {};
  const context = vm.createContext({
    URL, URLSearchParams, Set,
    document: { currentScript: { src: assetBase + 'stimuli.js' } },
    window: { location: { search: search || '' } },
    jsPsych: {
      randomization: { shuffle: (items) => items.slice().reverse() },
      data: { addProperties: (props) => Object.assign(added, props) }
    },
    jsPsychInstructions: 'instructions',
    jsPsychCaptionVideo: 'caption-video',
    jsPsychHtmlButtonResponse: 'html-button-response',
    jsPsychCallFunction: 'call-function'
  });
  for (const file of ['stimuli.js', 'helpers.js', 'experiment.js']) {
    vm.runInContext(fs.readFileSync(path.join(dir, file), 'utf8'), context, { filename: file });
  }
  context.added = added;
  return context;
}

function clips(label, count, prefix) {
  return Array.from({ length: count }, (_, i) => ({
    clip_id: prefix + i, video_url: 'media/' + prefix + i + '.mp4', pipeline_caption_label: label
  }));
}

const identity = (items) => items.slice();

test('labeled stimuli are sampled N/2 from each pool', () => {
  const { captionCheck } = load();
  const stimuli = clips(true, 6, 'yes-').concat(clips(false, 6, 'no-'));
  const result = captionCheck.sample(stimuli, 8, identity);
  assert.equal(result.mode, 'balanced');
  assert.equal(result.clips.length, 8);
  assert.equal(result.clips.filter((c) => c.pipeline_caption_label === true).length, 4);
  assert.equal(new Set(result.clips.map((c) => c.clip_id)).size, 8);
});

test('labeled sampling fails when either pool is too small', () => {
  const { captionCheck } = load();
  const stimuli = clips(true, 3, 'yes-').concat(clips(false, 10, 'no-'));
  assert.throws(() => captionCheck.sample(stimuli, 8, identity), /needs 4 captioned and 4 uncaptioned stimuli; found 3 and 10/);
});

test('labeled sampling rejects an odd sample size', () => {
  const { captionCheck } = load();
  const stimuli = clips(true, 5, 'yes-').concat(clips(false, 5, 'no-'));
  assert.throws(() => captionCheck.sample(stimuli, 5, identity), /even/);
});

test('any null label shuffles the whole list', () => {
  const { captionCheck } = load();
  const stimuli = clips(true, 5, 'yes-').concat(clips(null, 1, 'unknown-'));
  const shuffled = [];
  const result = captionCheck.sample(stimuli, 4, (items) => { shuffled.push(items.length); return items.slice().reverse(); });
  assert.equal(result.mode, 'unlabeled_shuffle');
  assert.deepEqual(shuffled, [6]);
  assert.deepEqual(result.clips.map((c) => c.clip_id), ['unknown-0', 'yes-4', 'yes-3', 'yes-2']);
});

test('default preview builds 20 test videos and records practice expectations', () => {
  const context = load('?PROLIFIC_ID=p&STUDY_ID=s&SESSION_ID=x');
  context.caption_check_init();
  const videos = Array.from(context.caption_check_experiment).filter((t) => t.type === 'caption-video');
  const practice = videos.filter((t) => t.data.exp_stage === 'practice');
  const testRows = videos.filter((t) => t.data.exp_stage === 'test');
  assert.equal(testRows.length, 20);
  assert.equal(context.added.sampling_mode, 'unlabeled_shuffle');
  assert.equal(context.added.PROLIFIC_PID, 'p');
  assert.equal(context.added.STUDY_ID, 's');
  assert.equal(context.added.SESSION_ID, 'x');
  assert.deepEqual(practice.map((t) => t.data.expected_presence), [true, false]);
  assert.deepEqual(practice.map((t) => t.data.pipeline_caption_label), [null, null]);
  assert.deepEqual(practice.map((t) => t.data.license), ['CC0-1.0', 'CC0-1.0']);
  assert.ok(testRows.every((t) => t.data.expected_presence === null));
  assert.equal(practice[0].video_url, assetBase + 'media/caption.mp4');
});

test('participant id is read from the PROLIFIC_ID parameter', () => {
  const context = load('?PROLIFIC_ID=deploy-person&STUDY_ID=study&SESSION_ID=session');
  context.caption_check_init();
  assert.equal(context.added.PROLIFIC_PID, 'deploy-person');
  assert.equal(context.added.STUDY_ID, 'study');
  assert.equal(context.added.SESSION_ID, 'session');
});

function videoTrial() {
  let now = 10000;
  let result;
  const document = new EventTarget();
  const elements = new Map();
  const element = (selector) => {
    if (!elements.has(selector)) {
      const target = new EventTarget();
      target.focus = () => { document.activeElement = target; };
      elements.set(selector, target);
    }
    return elements.get(selector);
  };
  const video = element('video');
  Object.assign(video, {
    paused: true, ended: false, currentTime: 0, duration: 4,
    videoWidth: 640, videoHeight: 360,
    // A real video can be unpaused while buffering, before 'playing'.
    play: async () => { video.paused = false; },
    pause: () => { video.paused = true; }
  });
  const context = vm.createContext({
    document, performance: { now: () => now },
    jsPsychModule: { ParameterType: { STRING: 'string' } }
  });
  vm.runInContext(fs.readFileSync(path.join(dir, 'plugin-caption-video.js'), 'utf8'), context);
  const plugin = new context.jsPsychCaptionVideo({ finishTrial: (data) => { result = data; } });
  plugin.trial({ querySelector: element }, { video_url: 'preview.mp4', heading: 'Video' });
  return {
    element, video, document,
    clock: (value) => { now = value; },
    space: () => {
      const event = new Event('keydown', { cancelable: true });
      Object.assign(event, { code: 'Space', repeat: false });
      document.dispatchEvent(event);
    },
    finish: () => {
      video.ended = true;
      video.dispatchEvent(new Event('ended'));
      element('.no').onclick();
      return result;
    }
  };
}

test('ending playback does not focus an answer button', async () => {
  const trial = videoTrial();
  await trial.element('.play').onclick();
  trial.video.dispatchEvent(new Event('playing'));
  trial.video.dispatchEvent(new Event('ended'));
  assert.ok(![trial.element('.yes'), trial.element('.no')].includes(trial.document.activeElement));
  trial.element('.no').onclick();
});

test('notice ignores pre-playback presses and measures RT from the playing event', async () => {
  const trial = videoTrial();
  trial.space();
  await trial.element('.play').onclick();
  trial.clock(10600);
  trial.space();
  trial.clock(11000);
  trial.video.dispatchEvent(new Event('playing'));
  trial.clock(11300);
  trial.video.currentTime = 0.3;
  trial.space();
  const result = trial.finish();
  assert.deepEqual(Array.from(result.notice_times), [0.3]);
  assert.deepEqual(Array.from(result.notice_rts_ms), [300]);
  assert.equal(result.playback_start_rt_ms, 1000);
});

test('stimulus checks require clip id, url and label but not license metadata', () => {
  const context = load();
  context.captionCheckSettings.sample_size = 2;
  context.captionCheckStimuli = [
    { clip_id: 'a', video_url: 'http://media.example/a.mp4', pipeline_caption_label: true },
    { clip_id: 'b', video_url: '../b.mp4', pipeline_caption_label: false }
  ];
  context.caption_check_init();
  const testRows = Array.from(context.caption_check_experiment).filter((t) => t.data && t.data.exp_stage === 'test');
  assert.equal(context.added.sampling_mode, 'balanced');
  assert.deepEqual(testRows.map((t) => t.data.license), [undefined, undefined]);

  for (const bad of [
    { video_url: 'a.mp4', pipeline_caption_label: true },
    { clip_id: 'a', pipeline_caption_label: true },
    { clip_id: 'a', video_url: 'a.mp4' }
  ]) {
    context.captionCheckStimuli = [bad];
    assert.throws(() => context.caption_check_init(), /clip_id|video_url|pipeline_caption_label/);
  }
});


test('real stimulus set has 20 distinct local CC-BY clips from all 17 audited sources', () => {
  const context = load();
  const stimuli = Array.from(context.captionCheckStimuli);
  assert.equal(stimuli.length, 20);
  assert.equal(new Set(stimuli.map((c) => c.clip_id)).size, 20);
  assert.equal(new Set(stimuli.map((c) => c.source_id)).size, 17);
  const credits = fs.readFileSync(path.join(dir, 'CREDITS.md'), 'utf8');
  let bytes = 0;
  for (const clip of stimuli) {
    assert.equal(clip.license, 'CC BY');
    assert.equal(clip.pipeline_caption_label, null);
    assert.match(clip.clip_id, /^[A-Za-z0-9_-]{11}_part_[0-9]{8}$/);
    assert.equal(clip.video_url, 'media/' + clip.clip_id + '.mp4');
    assert.equal(clip.source_url, 'https://www.youtube.com/watch?v=' + clip.source_id);
    assert.ok(clip.source_title && clip.channel);
    const size = fs.statSync(path.join(dir, clip.video_url)).size;
    assert.ok(size < 10_000_000);
    bytes += size;
    for (const text of [clip.clip_id, clip.source_title, clip.channel, clip.source_url]) {
      assert.ok(credits.includes(text));
    }
  }
  assert.ok(bytes < 150_000_000);
  context.caption_check_init();
  const timeline = Array.from(context.caption_check_experiment);
  const creditIndex = timeline.findIndex((t) => t.data && t.data.trial_id === 'credits');
  assert.ok(creditIndex > timeline.findLastIndex((t) => t.data && t.data.exp_stage === 'test'));
  assert.ok(creditIndex < timeline.findIndex((t) => t.data && t.data.trial_id === 'end'));
  for (const clip of stimuli) assert.ok(timeline[creditIndex].stimulus.includes(clip.clip_id));
});
