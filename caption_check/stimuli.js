/* Relative URLs resolve against this script, including on deploy battery pages. */
var captionCheckAssetBase = new URL('.', document.currentScript.src).href;
var captionCheckSettings = { sample_size: 20, stimulus_set: 'synthetic-preview-v1' };
var captionCheckPractice = [
  { clip_id: 'practice-caption', video_url: 'media/caption.mp4', expected_presence: true },
  { clip_id: 'practice-no-caption', video_url: 'media/no-caption.mp4', expected_presence: false }
];

// Twenty preview entries reuse two original synthetic files. These are NOT
// pipeline predictions or dataset clips; their pipeline labels remain unknown.
var captionCheckStimuli = Array.from({ length: 20 }, function (_, index) {
  return {
    clip_id: 'synthetic-preview-' + String(index + 1).padStart(2, '0'),
    video_url: index % 2 === 0 ? 'media/caption.mp4' : 'media/no-caption.mp4',
    pipeline_caption_label: null,
    source_id: 'dbsurveys-original-synthetic',
    license: 'CC0-1.0',
    attribution: 'Original synthetic animation created for StanfordDigitalBrainProject/dbsurveys; dedicated to CC0.'
  };
});
