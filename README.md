# dbsurveys

`video_rating_pilot` is a jsPsych 7 survey for expfactory-deploy. Each trial runs in this order after the entire clip plays:

1. **Your own feelings:** pleasantness from 1 (very unpleasant) to 9 (very pleasant), and arousal from 1 (very calm) to 9 (very excited). The questions ask how watching made the viewer feel, rather than which emotions appear in the clip. Both answers are required and have no defaults.
2. **General-audience suitability:** select all applicable flags for sexual or pornographic content, violence, gore or injury, eating-disorder-related content, and other upsetting or triggering content. “None of these” is exclusive: it clears the other flags; choosing any flag clears None. These are researcher-review flags, with no overall score or automatic clip exclusion.
3. **On-screen additions:** report presence, draw boxes and rate distraction separately for each category:

- **Captions or subtitles:** text representing speech, narration or translation.
- **Other floating text:** added titles, labels and other words.
- **Logos or watermarks:** added branding or channel marks.

Writing and branding physically in the filmed scene are excluded. Presence is separate from distraction: a participant may answer Yes and rate an addition **1 — Not at all** distracting. Each present category requires at least one box and one overall rating, from 1 to **5 — Extremely**. Participants can draw multiple boxes on different frames. Undo removes the last box; Clear removes the current category's boxes. Previously saved categories remain in the trial data.

**Research preview:** replace the IRB consent placeholder before recruitment. The committed pool contains only the existing 20 CC BY excerpts from 17 source videos and two original CC0 practice animations. Classifier labels for the real excerpts remain unknown. This preview cannot establish caption balance; no human inspection has been substituted for classifier predictions. Dataset hosting, classifier execution, Prolific setup and compensation changes are outside this repository's implementation.

## Files and deployment

```
video_rating_pilot/
  config.json              # expfactory run assets, estimated time: 10 minutes
  stimuli.js               # manifest/list paths and script-relative asset base
  pool.json                # preview media manifest, predictions and provenance
  lists.json               # eight fixed participant lists
  pool.js                  # shared manifest/list validation and PID assignment
  helpers.js               # box geometry, frame sizing, escaping and desktop eligibility
  plugin-video-rating.js   # playback, feelings, review flags and overlay annotation
  experiment.js            # loading, instructions, practices and submission
  style.css
  CREDITS.md               # existing CC BY attribution audit
  media/*.mp4              # existing CC BY excerpts and CC0 animations
scripts/build-lists.js      # seeded list generation; no dependencies
tests/video_rating_pilot.test.js # Node behavioral tests
tests/browser-flow.js      # browser interaction/data assertions
```

The deploy template loads the jsPsych assets in `config.json`, constructs its instance, calls `video_rating_pilot_init()` and runs `video_rating_pilot_experiment`. The first trial loads and validates both JSON files, then appends the selected timeline using jsPsych's timeline API. Loading failures offer Retry. Files resolve relative to `stimuli.js`, including on battery pages. Keep the JSON files alongside the experiment assets and ensure the deployment serves them.

Desktop/laptop use is required: the first trial blocks windows smaller than **1000 × 520 CSS pixels** and devices without a fine pointer. That minimum is the measured height of the tallest screen (annotation, 514 px) at the smallest video frame. The message reports the current window size and asks participants to maximize the window or zoom out with Ctrl or Cmd and minus, then click Retry. Recruit desktop users with a mouse or trackpad; drawing uses pointer events.

The first trial chooses one **16:9 video frame** from the browser viewport and uses it for every clip in the session; resizing the window later does not change it. `videoRatingPilot.frameWidth()` takes the largest multiple of 16 pixels that leaves 520 px of width for margins and questions and 220 px of height for the heading, status and buttons, between **480 × 270** and **656 × 369**. Common laptop viewports of 1366 × 640, 1280 × 690 and 1280 × 590, and a 1920 × 970 desktop viewport, all get 656 × 369; 1000 × 520 gets 480 × 270. The chosen size is recorded as `video_frame_width` and `video_frame_height`. Other aspect ratios are letterboxed with `object-fit: contain`; the drawing surface covers only the actual video picture. Normalized coordinates exclude the bars. The video sits beside the current question screen. Feelings, suitability, overlay presence and each present category's annotation use successive screens so the video and active questions fit without scrolling. Presence answers sit beside each category description, and distraction is a horizontal 1–5 scale, to keep those screens short. Credits are paginated in groups of three. No response screen requires an internal scroll area.

**Deployment migration:** the experiment was renamed from `caption_check` to `video_rating_pilot` (display name **Video Rating Pilot**). A deployment registered under the old ID must be re-added under the new ID; update any battery experiment selection as well. The folder, config `exp_id`, and deploy globals must agree. This repository does not perform that migration or deploy the change.

After each test trial, `window.dataSync()` is called when provided. The normal deploy completion flow submits the final dataset and handles study completion. This experiment does not initialize another jsPsych instance, redirect participants or call Prolific APIs. Test actual upload/completion with the configured battery before recruitment. This change does not deploy the survey.

## Replacing the pool

Change `video_rating_pilot/pool.json`, rebuild `lists.json`, and publish those two files together. Alternatively change their paths in `stimuli.js`. A manifest is JSON with this contract:

```json
{
  "pool_id": "classifier-batch-v2",
  "base_url": "https://public-media.example/clips/",
  "practice_ids": ["practice-caption", "practice-no-caption"],
  "clips": [
    {
      "clip_id": "catalog-clip-id",
      "source_id": "source-video-id",
      "channel_id": "channel-id",
      "duration": 12.5,
      "video_url": "catalog-clip-id.mp4",
      "predicted_labels": {
        "captions": true,
        "other_text": false,
        "logos": null
      },
      "license": "optional provenance",
      "attribution": "optional credit"
    }
  ]
}
```

The abbreviated example omits the two required practice records. Retain the preview's two practice records and `practice_ids` when importing a dataset pool. Each practice record must specify all three boolean `expected_presence` values. Every clip not listed in `practice_ids` is a main clip. When using an external base URL, set the two practice records' `video_url` values to public absolute URLs for the synthetic media, or host copies with the external pool. `duration` is in seconds; `source_id` identifies the original full video, not the excerpt. `channel_id` must be stable across its videos. Clip IDs must be unique.

`predicted_labels` is optional. Each category accepts true, false, null or omission. Unknown never means absent. Preserve the classifier's exact clip IDs and predictions so responses can be joined to its batch later. A classifier CSV must be converted into this JSON structure, using its channel/source IDs and durations and mapping predictions explicitly to the three category names; this survey does not run the classifier. The incoming dataset pool can be prepared independently of this survey.

`base_url` resolves relative to the manifest URL; each clip's `video_url` resolves against that base. Relative paths and public HTTP(S) absolute URLs are accepted. Credentials, query strings (including signed URLs), fragments and non-HTTP schemes are rejected for both the base and media URLs. Serve direct browser-playable H.264/AAC MP4 files with byte-range support for frame seeking. Cross-origin manifests require CORS; external media must permit browser playback. A media failure offers Retry or Continue without rating and remains unknown in the data.

**Do not commit dataset media unless it is CC BY licensed.** Any dataset license may be used for separately hosted research clips, with hosting planned as a storage bucket using unlisted, public playback links. The labeled dataset pool is not ready and is not included here. This change adds no downloaded media or credentialed URLs. The existing real clips retain source audio and attribution in [CREDITS.md](video_rating_pilot/CREDITS.md). The audit recorded CC BY on 2026-10-28 without a version; confirm licensing before recruitment. Credits are shown before final submission and escaped as text.

## Building and assigning lists

From the repository root, with Node installed:

```sh
node scripts/build-lists.js video_rating_pilot/pool.json video_rating_pilot/lists.json \
  --seed pilot-v1
node --test
```

`--main-count` defaults to **12 main clips** per list, the starting count for a 10-minute session; pass a different value once a pilot sets the final count. `--seed` defaults to `pilot-v1`, and `--list-count` defaults to eight. Given the same input order, seed and options, output is identical. The builder fails if there are too few distinct sources, rather than silently shrinking the study. Runtime validation also rejects missing clips, duplicate sources, stale pool IDs, incorrect lengths and practice clips in lists. Change `pool_id` when replacing the media/prediction pool and rebuild the lists.

Within each list, each original source appears once. The builder stratifies on the caption prediction first: `captioned` (`captions: true`), `not_captioned` (`captions: false`) and `unknown` (null or omitted). It fills each list evenly from the strata the pool contains, so a clip predicted `captions: false` counts as not captioned even when its other labels are missing. Within each caption stratum, it spreads the `other_text` and `logos` predictions (true, false or unknown), then spreads channels and prefers sources/clips used less often by earlier lists. The bundle's `strata` field lists the caption strata found. Constraints are best efforts when the pool is skewed: inspect generated lists for the actual mix before recruiting. Only the two practice trials receive feedback; practice outcomes are recorded without rejecting or terminating participants.

`PROLIFIC_PID` determines the list by a stable FNV-1a hash modulo the number of lists. Deploy's legacy `PROLIFIC_ID` is used when `PROLIFIC_PID` is absent. Without either, previews choose a random list once at loading. The ID, selected list and assignment mode are recorded. Keep the list bundle unchanged during a study so returning participants retain their assignment. The limited preview has only 17 original sources, so overlap between its 12-clip lists is unavoidable. A larger pool enables more variation between participants.

## Timing and verification

Each trial records total browser time, playback start latency and separate response times for feelings, suitability, overlay presence and annotation. **A short human pilot on the actual classifier pool sets the final count for a 10-minute session.** The builder and committed preview start at **12 main clips**, plus two practice clips with feedback. `config.json` advertises 10 minutes. Use the timing fields to revise `--main-count`, rebuild lists, and update the advertised duration if a pilot shows a different session length.

Normal-speed browser measurements on a 15.97-second real clip took **32.14 s, 40.12 s and 56.15 s** for zero, one and three annotated categories. Pacing allowed six seconds for feelings, six for suitability, four for presence and eight per annotation. These are measured browser-flow times under explicit scripted pacing, not human timing or evidence of participant comprehension. The mean is **42.81 seconds per trial** on that clip, or about **39.7 seconds** after replacing playback with the preview pool's 12.89-second mean. Twelve main trials therefore budget about 477 seconds, leaving about two minutes for instructions, two short practices, feedback and credits. Clips with many additions or participants needing more time can exceed this budget; reduce the count after the human pilot if needed.

`node --test` exercises list building, manifest validation, participant assignment, deploy initialization and letterbox geometry. `tests/browser-flow.js` defines `runVideoRatingBrowserTests()` for Chrome on a page loading the experiment scripts. It uses real playback/seeking, forms and pointer-event dispatch to verify the response order, required 9-point answers, multi-select flags, exclusive None, saved per-trial answers, multiple boxes, undo, normalized coordinates, and media-error handling. Synthetic pointer dispatch temporarily replaces pointer capture; native dragging is checked separately.

Local verification passed 11 Node tests and 27 browser assertions. Complete jsPsych runs at viewports of 1000 × 520, 1366 × 640, 1280 × 690, 1280 × 590, 1920 × 970, 1300 × 560 and 1100 × 520 checked for document or wrapper scrolling throughout. Screenshots covered the instruction pages, playback, feelings, suitability, overlay presence, practice and main annotation, feedback, credits and the end page. No screen scrolled, and each session kept one frame size. Boxes dragged at known fractions of the picture were saved with those normalized coordinates on landscape practices and on 360 × 640 portrait clips, where the drawing surface matched the letterboxed picture and excluded the side bars. Windows of 999 × 700 and 1280 × 519 were blocked, and Retry after enlarging the window continued. Each run finished two practices and 12 main clips and called `dataSync` 12 times. These runs accelerated main-clip playback to 8×; the timing benchmark used normal speed. Proof and screenshots remain outside this repository. The actual deployment upload/completion still needs testing in the approved study setup.

For local browser verification, serve a scratch bootstrap page with jsPsych 7 and the three plugins listed in `config.json`, load the experiment scripts in config order, then use the same initialization sequence as deploy. Use a range-capable local server for MP4 seeking. Keep the bootstrap, browser evidence and output data outside the repository. A basic static server that ignores Range headers can play videos but fail annotation seeks. Verify final data upload and completion on the actual deployment before recruiting.

## Recorded data

All rows carry `pool_id`, `list_id`, `list_seed`, `assignment_mode`, `main_count`, `actual_sample_size`, `video_frame_width`, `video_frame_height` (the session's frame in CSS pixels) and the URL identifiers `PROLIFIC_PID`, `STUDY_ID`, `SESSION_ID` (null when absent). Each `video_rating` trial includes:

- `exp_stage` (`practice` or `test`), `clip_id`, `source_id`, `channel_id`, `manifest_duration`, `predicted_labels`, `license`, `attribution` and `expected_presence` (null for main clips).
- `feelings`: `{pleasantness, arousal}`, each an integer from 1 to 9, or null when media failure prevents a usable trial.
- `suitability_flags`: an array drawn from `sexual`, `violence`, `gore_injury`, `eating_disorder`, `other_upsetting`. `suitability_none` records an explicit None selection. An empty flag array with `suitability_none: true` differs from media failure, which leaves the new answers null. No composite score is calculated.
- `presence`: category keys `captions`, `other_text`, `logos`, each true/false; all null when media fails and the participant skips.
- `distraction`: the same keys with ratings 1–5 for present categories and null for absent categories or missing media. Each is the category's overall rating, shared by its boxes.
- `boxes`: an array of `{x, y, width, height, video_time, category, rating}`. Coordinates are fractions of the video picture (excluding letterbox bars), top-left origin, within [0,1]; `video_time` is the actual paused timestamp in seconds. Multiple boxes per category and frame are allowed. An empty array is expected for all-negative answers or media failure.
- `rt`, `playback_start_rt_ms`, `feelings_rt_ms`, `suitability_rt_ms`, `presence_rt_ms`, `annotation_rt_ms` in milliseconds; `video_duration` in seconds, intrinsic `video_width`, `video_height`, `played_through`, and `media_error` (null on success).

Synthetic practices also record `practice_correct` (true/false, null on media failure). Main predictions never score participant answers. The previous Space-key notice task and single-rectangle fields have been replaced by category-specific annotation; analyses must use the Video Rating Pilot schema. Keep participant records out of this public repository.

## Synthetic media provenance

`media/caption.mp4` and `media/no-caption.mp4` are existing original four-second, silent FFmpeg test-pattern animations (640×360, 24 fps, H.264/YUV420p, fast-start). The captioned example adds “The colors are moving.” after one second. Both contain a technical timecode, counted as other floating text; neither has a logo. They are dedicated to [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). No classifier prediction is invented for them; practice expectations are recorded separately.
