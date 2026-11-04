# dbsurveys

One jsPsych 7 experiment, `caption_check`, for [expfactory-deploy](https://github.com/expfactory/expfactory-deploy), following [expfactory_task_demo](https://github.com/lobennett/expfactory_task_demo).

**Research preview.** Main trials use 20 real CC-BY video excerpts across 17 sources, with two original four-second synthetic practice animations. Every pipeline caption label is `null` because no existing prediction was found for the selected clips. Replace the IRB consent placeholder before recruiting participants. The preview currently displays a preview-specific consent page; edit that page for the approved study.

Participants learn that captions are burned-in speech subtitles, not writing physically in the scene, logos or decorative titles. After two practice clips with feedback, they complete one explicit instruction check and rate the sampled videos. During playback, each Space press records the video's `currentTime` in seconds without interrupting viewing; the first press is the primary notice time. After playback they answer Yes/No. Yes returns to the first marked frame for a rectangle; without a notice event, a slider lets them choose a frame while leaving notice time missing. Drawing uses mouse, trackpad or pointer input; recruit desktop/laptop users with a keyboard and mouse/trackpad. The instruction check asks participants to select Blue, records pass/fail and response time, and does not reject, terminate, or set `include_subject=reject`. Set any recruitment/quality policy separately under approved study procedures.

## Structure and deploy contract

```
README.md
caption_check/
  config.json              # single experiment: exp_id matches folder
  experiment.js            # caption_check_experiment + caption_check_init()
  stimuli.js               # settings, practice and stimulus lists
  helpers.js               # URL resolution, sampling, rectangle coordinates
  plugin-caption-video.js  # jsPsych 7 custom playback/annotation trial
  style.css
  CREDITS.md               # per-clip attribution and editing notes
  media/*.mp4              # 20 CC-BY excerpts plus two synthetic practices
tests/
  caption_check.test.js    # sampling, stimulus and notice-key checks (run: node --test)
```

The config `run` list loads the server's jsPsych 7 core, html-button-response, instructions, call-function and CSS assets, then the relative experiment files in order. Those plugin files are present under `expfactory_deploy_local/src/expfactory_deploy_local/static/jspsych7/` in expfactory-deploy. Scripts do not access the jsPsych instance during parsing. The deploy template constructs the instance, calls `caption_check_init()`, and runs `caption_check_experiment`.

After each test rating, `window.dataSync()` syncs collected data when available. Finishing the timeline lets the deploy template POST the final dataset. The experiment neither initializes a second jsPsych instance nor redirects participants itself. In deploy's Prolific integration, server-side completion resolves the study's configured completion code or the battery's SimpleCC URL; this repository contains no completion code. Keep participants in the server completion flow after uploading.

## Stimulus list and sampling

Edit `caption_check/stimuli.js`. `captionCheckSettings.sample_size` defaults to 20 and must be a positive integer. `stimulus_set` identifies the version of the list. Each entry in `captionCheckStimuli` has this format (values below are illustrative, not an actual dataset clip):

```js
{
  clip_id: 'unique-clip-id',
  video_url: 'media/clip.mp4', // or an unsigned public https:// URL
  pipeline_caption_label: null, // true, false, or null (unknown)
  source_id: 'source-video-id',
  source_title: 'Source video title',
  channel: 'Creator channel',
  source_url: 'https://www.youtube.com/watch?v=source-video-id',
  license: 'CC-BY-3.0', // exact license/version must be verified for actual media
  attribution: 'Title — creator; source link; license link; edits made'
}
```

The experiment checks only that each entry has a nonempty `clip_id` and `video_url` and a `pipeline_caption_label` of true, false or null; `source_id`, `license` and `attribution` are recorded as given, and `attribution` is listed on the closing credits screen. `source_title`, `channel` and `source_url` are not recorded; the tests check them against [CREDITS.md](caption_check/CREDITS.md). Use actual observed clip ids. Relative video paths resolve against the directory containing `stimuli.js`, not the battery page. Serve direct browser-playable video (H.264 MP4 is used here), not a YouTube watch/embed page. Hosting must allow playback and seeking, including byte-range requests. The loader needs no code change when approved external media URLs become available.

When every entry has a true/false label, sampling draws N/2 captioned and N/2 uncaptioned entries without replacement and shuffles their order (`sampling_mode: balanced`). N must then be even, and the experiment stops with an error if either pool has fewer than N/2 entries. When any label is null, the whole list is shuffled and the first N entries are used (`unlabeled_shuffle`); a list shorter than N yields fewer videos, recorded as `actual_sample_size`. The UI never shows pipeline labels. Do not infer caption absence from missing predictions.

## Data

All rows carry `PROLIFIC_PID`, `STUDY_ID`, and `SESSION_ID` from the URL query (null when absent), plus the stimulus-set identifier, sampling mode, requested N and actual N. The participant ID is read from the deploy server’s `PROLIFIC_ID` parameter. Preview without real participant identifiers; do not publish participant data in this repository.

Each `caption_rating` row contains:

- `exp_stage` (`practice` or `test`), `clip_id`, `pipeline_caption_label` (null on practice rows), `expected_presence` (the practice answer used for feedback; null on test rows), `source_id`, `license`, `attribution`.
- `presence_answer`: true/false; null for media failure. No pipeline label is used to score test answers.
- `notice_times`: video timestamps in seconds of every Space press, in order; the first entry is the primary notice time and sets the annotation frame. `notice_rts_ms`: elapsed wall time of each press since the first `playing` event. Presses before playback starts are ignored. No press is an empty array, not a negative presence rating.
- `rectangle`: `{x,y,width,height}` as fractions of the displayed video frame, top-left origin, each in [0,1]; null for No or media failure. Rendering preserves the native aspect ratio, so coordinates map to the source frame without letterbox correction. `rectangle_video_time` records the actual paused video time. `annotation_frame_source` distinguishes `first_notice` and `manual_selection`.
- `presence_rt_ms` since the presence question appeared, `rectangle_rt_ms` from opening annotation until saving, total `rt`, and `playback_start_rt_ms` (all milliseconds).
- `video_duration` in seconds, intrinsic `video_width`/`video_height`, `played_through`, and `media_error` (null on successful playback). Playback failures offer Retry or Continue without rating and are never scored as caption absence.

The separate `attention_check` row records `response`, `rt` and `attention_check_passed`. jsPsych also adds its normal trial metadata and the deploy server records interaction data.

## Real CC-BY stimuli

The default set contains 20 distinct excerpts spanning all 17 source videos labeled `creativeCommon` in the 2026-10-28 license audit. The files are hosted in `caption_check/media/`; exact catalog clip IDs, source titles, channels, source URLs and CC BY attribution are in `stimuli.js` and [CREDITS.md](caption_check/CREDITS.md). The experiment also presents per-clip credits after the main trials and before final submission.

All main-trial pipeline caption labels remain null: no existing caption predictions for these exact clip IDs were found in the inspected local prediction artifacts. Generic on-screen-text or overlay metrics are not speech-caption predictions. Frame inspection is used for choosing practice examples, never to manufacture pipeline labels.

The two synthetic practice videos are retained because inspection of the real candidates did not establish a clearly captioned example. The real footage covers cooking, shops, driving, brickwork, fireworks and raking leaves; this source-diverse set is not guaranteed to contain a balanced mix of speech captions. Sampling and response collection are unchanged. The default therefore uses `unlabeled_shuffle`.

The main excerpts retain source audio. Video is H.264 at no more than 720p (portrait orientation supported), audio is AAC, and MP4 metadata precedes the media for streaming. Files are each below 10 MB and the total is below 150 MB. Only landscape video above 720p was re-encoded; other streams were copied. Source license observations date to 2026-10-28, with a recorded refresh deadline of 2026-11-27; the audit identifies CC BY without confirming a version number.

## Add to expfactory-deploy and preview

1. Once the branch is reviewed and merged, log in to [deploy.expfactory.org](https://deploy.expfactory.org/) and add `https://github.com/StanfordDigitalBrainProject/dbsurveys` as an experiment repository in the experiments section.
2. Pull/refresh that repository. The server discovers the single `caption_check/config.json` experiment.
3. Open the experiment preview, or add Caption Check to a battery and open its preview link. Confirm that both practice videos play, the notice key works, rectangles can be saved, and final data uploads successfully.
4. For the approved study, configure consent, sample size and study/battery completion settings; test the battery with `?PROLIFIC_ID=preview-person&STUDY_ID=preview-study&SESSION_ID=preview-session` (or append using `&` when the link already has query parameters). Only then configure recruitment. This repository does not call Prolific APIs.

For local development, install `expfactory_deploy_local` from the expfactory-deploy repository following its README, then run `expfactory_deploy_local -e /absolute/path/to/dbsurveys/caption_check -raw /absolute/path/to/scratch-output` from a scratch directory. It serves the config assets and deploy boot sequence and saves POST data locally. Its web.py static file server ignores HTTP Range requests (it returns 200, not 206), so the browser cannot seek the clips there: answering Yes after a Space press, or moving the frame slider, snaps the video to 0 and shows "Playback problem". Production nginx supports ranges. Verify the annotation step on deploy.expfactory.org, or put a range-capable static server in front of the local server. Keep proof and participant output outside this public repository.

Local verification used the actual server-supplied jsPsych assets and a headless Chrome page mimicking the deploy boot sequence and data POSTs. A complete default run saved 20 unique test entries, two practice ratings, an attention check and all three URL identifiers. Native rectangle drags saved normalized coordinates on the notice frame. Separate cases verified manual frame selection with no notice keypress and missing-media results remaining unknown. Real deployment uploads and Prolific completion still require verification in the approved study setup.

## Synthetic media provenance

Both silent MP4 files are original FFmpeg test-pattern animations: 640×360, 24 fps, four seconds, H.264/YUV420p with fast-start metadata. `caption.mp4` adds the subtitle “The colors are moving.” after one second; `no-caption.mp4` has no speech captions. The test pattern's technical timecode does not count as a speech caption. The subtitle is deliberately burned into the pixels. These original synthetic assets are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). These two practice files contain no downloaded footage. Main trials use the attributed real excerpts described above.
