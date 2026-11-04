var caption_check_experiment = [];

function caption_check_init() {
  caption_check_experiment.length = 0;
  var params = new URLSearchParams(window.location.search);
  var n = captionCheckSettings.sample_size;
  if (!Number.isInteger(n) || n < 1) throw new Error('sample_size must be a positive integer.');
  if (!captionCheckStimuli.length) throw new Error('Supply at least one stimulus.');
  var ids = new Set();
  captionCheckStimuli.forEach(function (clip) {
    ['clip_id', 'video_url', 'source_id', 'license', 'attribution'].forEach(function (key) {
      if (typeof clip[key] !== 'string' || !clip[key].trim()) {
        throw new Error('Each stimulus needs a nonempty ' + key + '.');
      }
    });
    if (!clip.clip_id || ids.has(clip.clip_id)) throw new Error('Stimulus clip_id values must be unique.');
    ids.add(clip.clip_id);
    if (![true, false, null].includes(clip.pipeline_caption_label)) {
      throw new Error('pipeline_caption_label must be true, false, or null.');
    }
    captionCheck.videoURL(clip.video_url);
  });
  var sampled = captionCheck.sample(captionCheckStimuli, n, function (items) {
    return jsPsych.randomization.shuffle(items);
  });
  jsPsych.data.addProperties({
    exp_id: 'caption_check',
    PROLIFIC_PID: params.get('PROLIFIC_PID'),
    STUDY_ID: params.get('STUDY_ID'),
    SESSION_ID: params.get('SESSION_ID'),
    stimulus_set: captionCheckSettings.stimulus_set,
    sampling_mode: sampled.mode,
    requested_sample_size: n,
    actual_sample_size: sampled.clips.length
  });

  caption_check_experiment.push({
    type: jsPsychInstructions,
    pages: [
      '<section class="caption-check"><h1>Caption Check</h1>' +
      '<p><strong>Research preview — consent text pending.</strong></p>' +
      '<p>[IRB CONSENT PLACEHOLDER: insert the approved consent information, investigator contact details, risks, compensation, voluntary participation and withdrawal instructions before recruiting participants.]</p>' +
      '<p>This preview uses short original synthetic videos. Continuing starts the preview.</p></section>',
      '<section class="caption-check"><h2>What counts as a caption?</h2>' +
      '<p>Count subtitles or captions added to the video to represent speech or narration, including translations. They are part of the video image.</p>' +
      '<p>Do not count writing physically in the scene, such as a sign, label on an object, or writing on clothing. Logos, watermarks and decorative titles do not count as speech captions.</p>' +
      '<p>Watch the entire video. Press <strong>Space</strong> or click <strong>Caption noticed</strong> as soon as you notice a caption. The video will keep playing. Additional presses are recorded too.</p></section>',
      '<section class="caption-check"><h2>After each video</h2>' +
      '<p>Answer whether it had any captions. If you answer Yes, you will see the frame at your first notice. Drag a rectangle tightly around the caption and save it. You can redraw before saving.</p>' +
      '<p>If you saw a caption but forgot to mark it, answer Yes and choose a frame with the slider. Your first notice time will stay missing.</p>' +
      '<p>Use a computer with a keyboard and mouse or trackpad. We will start with two practice videos.</p></section>'
    ],
    show_clickable_nav: true,
    data: { trial_id: 'instructions' }
  });

  function videoTrial(clip, stage, index) {
    return {
      type: jsPsychCaptionVideo,
      heading: stage === 'practice' ? 'Practice ' + (index + 1) + ' of 2' : 'Video ' + (index + 1) + ' of ' + sampled.clips.length,
      video_url: captionCheck.videoURL(clip.video_url),
      data: {
        trial_id: 'caption_rating', exp_stage: stage,
        clip_id: clip.clip_id,
        pipeline_caption_label: stage === 'practice' ? null : clip.pipeline_caption_label,
        source_id: clip.source_id || 'dbsurveys-original-synthetic',
        license: clip.license || 'CC0-1.0',
        attribution: clip.attribution || 'Original dbsurveys synthetic practice video.'
      }
    };
  }
  captionCheckPractice.forEach(function (clip, index) {
    caption_check_experiment.push(videoTrial(clip, 'practice', index));
    caption_check_experiment.push({
      type: jsPsychHtmlButtonResponse,
      stimulus: function () {
        var last = jsPsych.data.get().last(1).values()[0];
        var correct = last.presence_answer === clip.expected_presence;
        return '<section class="caption-check"><h2>Practice feedback</h2><p>' +
          (clip.expected_presence ? 'This video has a burned-in subtitle near the bottom.' : 'This video has no captions.') +
          '</p><p>' + (correct ? 'Your presence answer was correct.' : 'Review the definition of captions before continuing.') + '</p></section>';
      },
      choices: ['Continue'], data: { trial_id: 'practice_feedback' }
    });
  });
  caption_check_experiment.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: '<section class="caption-check"><h2>Instruction check</h2><p>For this question, please select <strong>Blue</strong>.</p></section>',
    choices: ['Green', 'Blue', 'Red'],
    data: { trial_id: 'attention_check' },
    on_finish: function (data) { data.attention_check_passed = data.response === 1; }
  });
  caption_check_experiment.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: '<section class="caption-check"><h2>Practice complete</h2><p>The next ' + sampled.clips.length +
      ' videos use the same steps, without feedback. Please watch each video through.</p></section>',
    choices: ['Begin videos'], data: { trial_id: 'test_intro' }
  });
  sampled.clips.forEach(function (clip, index) {
    caption_check_experiment.push(videoTrial(clip, 'test', index));
    caption_check_experiment.push({
      type: jsPsychCallFunction,
      func: function () { if (typeof window.dataSync === 'function') window.dataSync(); }
    });
  });
  caption_check_experiment.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: '<section class="caption-check"><h2>Thank you</h2><p>Click Finish to submit your responses. Follow the deployment page’s instructions after the upload completes.</p></section>',
    choices: ['Finish'], data: { trial_id: 'end' }
  });
}
