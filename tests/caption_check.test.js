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
  const context = load('?PROLIFIC_PID=p&STUDY_ID=s&SESSION_ID=x');
  context.caption_check_init();
  const videos = Array.from(context.caption_check_experiment).filter((t) => t.type === 'caption-video');
  const practice = videos.filter((t) => t.data.exp_stage === 'practice');
  const testRows = videos.filter((t) => t.data.exp_stage === 'test');
  assert.equal(testRows.length, 20);
  assert.equal(context.added.sampling_mode, 'unlabeled_shuffle');
  assert.equal(context.added.PROLIFIC_PID, 'p');
  assert.deepEqual(practice.map((t) => t.data.expected_presence), [true, false]);
  assert.deepEqual(practice.map((t) => t.data.pipeline_caption_label), [null, null]);
  assert.deepEqual(practice.map((t) => t.data.license), ['CC0-1.0', 'CC0-1.0']);
  assert.ok(testRows.every((t) => t.data.expected_presence === null));
  assert.equal(practice[0].video_url, assetBase + 'media/caption.mp4');
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
