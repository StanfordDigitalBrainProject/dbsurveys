# dbsurveys

One jsPsych 7 experiment, `caption_check`, for [expfactory-deploy](https://github.com/expfactory/expfactory-deploy), following [expfactory_task_demo](https://github.com/lobennett/expfactory_task_demo).

**Interim synthetic preview only.** The two original four-second animations are reused for 20 preview entries. Every pipeline label is `null`; these are not pipeline predictions or real dataset observations. Replace the IRB consent placeholder and supply approved real stimuli before recruiting participants. The preview currently displays a preview-specific consent page; edit that page for the approved study.

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
  media/caption.mp4
  media/no-caption.mp4
tests/
  caption_check.test.js    # sampling and stimulus checks (run: node --test)
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
  license: 'CC-BY-3.0', // exact license/version must be verified for actual media
  attribution: 'Title — creator; source link; license link; edits made'
}
```

The experiment checks only that each entry has a nonempty `clip_id` and `video_url` and a `pipeline_caption_label` of true, false or null; `source_id`, `license` and `attribution` are recorded as given. Use actual observed clip ids. Relative video paths resolve against the directory containing `stimuli.js`, not the battery page. Serve direct browser-playable video (H.264 MP4 is used here), not a YouTube watch/embed page. Hosting must allow playback and seeking, including byte-range requests. The loader needs no code change when approved external media URLs become available.

When every entry has a true/false label, sampling draws N/2 captioned and N/2 uncaptioned entries without replacement and shuffles their order (`sampling_mode: balanced`). N must then be even, and the experiment stops with an error if either pool has fewer than N/2 entries. When any label is null, the whole list is shuffled and the first N entries are used (`unlabeled_shuffle`); a list shorter than N yields fewer videos, recorded as `actual_sample_size`. The UI never shows pipeline labels. Do not infer caption absence from missing predictions.

## Data

All rows carry `PROLIFIC_PID`, `STUDY_ID`, and `SESSION_ID` from the URL query (null when absent), the stimulus-set identifier, sampling mode, requested N and actual N. Preview without real participant identifiers; do not publish participant data in this repository.

Each `caption_rating` row contains:

- `exp_stage` (`practice` or `test`), `clip_id`, `pipeline_caption_label` (null on practice rows), `expected_presence` (the practice answer used for feedback; null on test rows), `source_id`, `license`, `attribution`.
- `presence_answer`: true/false; null for media failure. No pipeline label is used to score test answers.
- `notice_times`: video timestamps in seconds of every Space press, in order; the first entry is the primary notice time and sets the annotation frame. `notice_rts_ms`: elapsed wall time of each press since initial playback. No press is an empty array, not a negative presence rating.
- `rectangle`: `{x,y,width,height}` as fractions of the displayed video frame, top-left origin, each in [0,1]; null for No or media failure. Rendering preserves the native aspect ratio, so coordinates map to the source frame without letterbox correction. `rectangle_video_time` records the actual paused video time. `annotation_frame_source` distinguishes `first_notice` and `manual_selection`.
- `presence_rt_ms` since the presence question appeared, `rectangle_rt_ms` from opening annotation until saving, total `rt`, and `playback_start_rt_ms` (all milliseconds).
- `video_duration` in seconds, intrinsic `video_width`/`video_height`, `played_through`, and `media_error` (null on successful playback). Playback failures offer Retry or Continue without rating and are never scored as caption absence.

The separate `attention_check` row records `response`, `rt` and `attention_check_passed`. jsPsych also adds its normal trial metadata and the deploy server records interaction data.

## Real CC-BY stimuli: metadata selected for follow-up

The 2026-10-28 license audit found 17 source videos labeled `creativeCommon`, mapped to 317 distinct clips. They suffice for N=20 without standard YouTube-license clips. **Real clip URLs remain unresolved. No real clip ids or media files are included here.** The parent map contains aggregate clip counts and part ranges, not a complete enumeration; do not manufacture ids from those ranges. No validated pipeline caption predictions were established in the inspected local text-VLM artifacts (zero accepted new predictions; accuracy not validated), so labels must remain null unless verified predictions are supplied.

Candidate source metadata from that audit follows. These are source watch links and attribution leads, not playable stimulus URLs. Verify the applicable license version and provide full attribution, exact clip boundaries and edits before use. Audit observations date to 2026-10-28 and their recorded refresh deadline is 2026-11-27.

| Source | Title | Creator | Distinct clips | Direct clip URL |
|---|---|---|---:|---|
| [165OCgze4x4](https://www.youtube.com/watch?v=165OCgze4x4) | Barbecue Chicken & Beef / Pov | Ghanzi | 13 | unresolved |
| [1KUxzWSX_VM](https://www.youtube.com/watch?v=1KUxzWSX_VM) | XXL Best Of Fire Kitchen Part 1  🔥🔥🔥 | Fire Kitchen | 47 | unresolved |
| [5xS2F_UGAuA](https://www.youtube.com/watch?v=5xS2F_UGAuA) | FIXING A BRICK WALL WITH CRACKED MORTAR. LOSSE BRICKS CHANGED MY PLAN. Satisfying, double speed. | WorkAroundTheHouse | 38 | unresolved |
| [GDYLlBpLaJY](https://www.youtube.com/watch?v=GDYLlBpLaJY) | The Best Tinolang Manok Recipe! | Ghanzi | 4 | unresolved |
| [Gs168pJ9vjU](https://www.youtube.com/watch?v=Gs168pJ9vjU) | Scrambled Eggs / Pov | Ghanzi | 17 | unresolved |
| [IA9conOsNR8](https://www.youtube.com/watch?v=IA9conOsNR8) | Burrito Drive tru at Taqueria De Anda | Ghanzi | 11 | unresolved |
| [JOvDTaWZ5c8](https://www.youtube.com/watch?v=JOvDTaWZ5c8) | Going To Raising Cane's Ordering The Box Combo / Pov | Ghanzi | 11 | unresolved |
| [Kvdoe5yFUxI](https://www.youtube.com/watch?v=Kvdoe5yFUxI) | Carne Asada Burrito Time! | Ghanzi | 20 | unresolved |
| [PC6Y_ZQpxm0](https://www.youtube.com/watch?v=PC6Y_ZQpxm0) | Phnom Penh City - Celebration of 67th Independence Day | Street Food TV | 1 | unresolved |
| [S4iW7PiSKqU](https://www.youtube.com/watch?v=S4iW7PiSKqU) | Pinoy Pinay Fast Food Restaurant / Pov | Ghanzi | 11 | unresolved |
| [WFxDxY-ab5Y](https://www.youtube.com/watch?v=WFxDxY-ab5Y) | Ordering In N Out Number 3 Hamburger Combo Drive tru / Pov | Ghanzi | 12 | unresolved |
| [_3Zz-gPaoMA](https://www.youtube.com/watch?v=_3Zz-gPaoMA) | Sisig & Munggoo / Filipino Fast Food To Go / Pov | Ghanzi | 13 | unresolved |
| [jY4AJZp3qZk](https://www.youtube.com/watch?v=jY4AJZp3qZk) | Trader Joe's / Cheapest eggs in town / Pov | Ghanzi | 13 | unresolved |
| [pIgwhuZNUt0](https://www.youtube.com/watch?v=pIgwhuZNUt0) | The Burrito | Ghanzi | 11 | unresolved |
| [ss-bodT36qQ](https://www.youtube.com/watch?v=ss-bodT36qQ) | Ordering The Plate Combo At Panda Express / Pov | Ghanzi | 11 | unresolved |
| [w_o2BiYyXvE](https://www.youtube.com/watch?v=w_o2BiYyXvE) | Raking Autumn Leaves | ManBehindACameraASMR | 74 | unresolved |
| [wmf91vFReFY](https://www.youtube.com/watch?v=wmf91vFReFY) | Thrifting Pov | Ghanzi | 10 | unresolved |

Real-media hosting remains a separate decision: approved public external hosting with stable unsigned HTTPS URLs, or an explicit exception authorizing attributed CC-BY media in the repository. No YouTube-derived media is committed in this interim preview.

## Add to expfactory-deploy and preview

1. Once the branch is reviewed and merged, log in to [deploy.expfactory.org](https://deploy.expfactory.org/) and add `https://github.com/StanfordDigitalBrainProject/dbsurveys` as an experiment repository in the experiments section.
2. Pull/refresh that repository. The server discovers the single `caption_check/config.json` experiment.
3. Open the experiment preview, or add Caption Check to a battery and open its preview link. Confirm that both practice videos play, the notice key works, rectangles can be saved, and final data uploads successfully.
4. For the approved study, configure consent, real media, sample size and study/battery completion settings; test the battery with `?PROLIFIC_PID=preview-person&STUDY_ID=preview-study&SESSION_ID=preview-session` (or append using `&` when the link already has query parameters). Only then configure recruitment. This repository does not call Prolific APIs.

For local development, install `expfactory_deploy_local` from the expfactory-deploy repository following its README, then run `expfactory_deploy_local -e /absolute/path/to/dbsurveys/caption_check -raw /absolute/path/to/scratch-output` from a scratch directory. It serves the config assets and deploy boot sequence and saves POST data locally. Its web.py static file server ignores HTTP Range requests (it returns 200, not 206), so the browser cannot seek the clips there: answering Yes after a Space press, or moving the frame slider, snaps the video to 0 and shows "Playback problem". Production nginx supports ranges. Verify the annotation step on deploy.expfactory.org, or put a range-capable static server in front of the local server. Keep proof and participant output outside this public repository.

Local verification used the actual server-supplied jsPsych assets and a headless Chrome page mimicking the deploy boot sequence and data POSTs. A complete default run saved 20 unique test entries, two practice ratings, an attention check and all three URL identifiers. Native rectangle drags saved normalized coordinates on the notice frame. Separate cases verified manual frame selection with no notice keypress and missing-media results remaining unknown. Real deployment uploads, Prolific completion and real-media hosting still require verification in the approved study setup.

## Synthetic media provenance

Both silent MP4 files are original FFmpeg test-pattern animations: 640×360, 24 fps, four seconds, H.264/YUV420p with fast-start metadata. `caption.mp4` adds the subtitle “The colors are moving.” after one second; `no-caption.mp4` has no speech captions. The test pattern's technical timecode does not count as a speech caption. The subtitle is deliberately burned into the pixels. These original synthetic assets are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). No downloaded footage was used. The preview entries intentionally reuse them and cannot validate real pipeline or manual classifications.
