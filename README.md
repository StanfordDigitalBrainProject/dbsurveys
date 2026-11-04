# dbsurveys

`caption_check` is a jsPsych 7 survey for expfactory-deploy. Participants watch a clip, report the presence of three kinds of on-screen additions, then locate and rate each category they saw:

- **Captions or subtitles:** text representing speech, narration or translation.
- **Other floating text:** added titles, labels and other words.
- **Logos or watermarks:** added branding or channel marks.

Writing and branding physically in the filmed scene are excluded. Presence is separate from distraction: a participant may answer Yes and rate an addition **1 — Not at all** distracting. Each present category requires at least one box and one overall rating, from 1 to **5 — Extremely**. Participants can draw multiple boxes on different frames. Undo removes the last box; Clear removes the current category's boxes. Previously saved categories remain in the trial data.

**Research preview:** replace the IRB consent placeholder before recruitment. The committed pool contains only the existing 20 CC BY excerpts from 17 source videos and two original CC0 practice animations. Classifier labels for the real excerpts remain unknown. This preview cannot establish caption balance; no human inspection has been substituted for classifier predictions. Dataset hosting, classifier execution, Prolific setup and compensation changes are outside this repository's implementation.

## Files and deployment

```
caption_check/
  config.json              # expfactory run assets, estimated time: 10 minutes
  stimuli.js               # manifest/list paths and script-relative asset base
  pool.json                # preview media manifest, predictions and provenance
  lists.json               # eight fixed participant lists
  pool.js                  # shared manifest/list validation and PID assignment
  helpers.js               # box geometry, escaping and desktop eligibility
  plugin-caption-video.js  # playback, three-category presence and annotation
  experiment.js            # loading, instructions, practices and submission
  style.css
  CREDITS.md               # existing CC BY attribution audit
  media/*.mp4              # existing CC BY excerpts and CC0 animations
scripts/build-lists.js      # seeded list generation; no dependencies
tests/caption_check.test.js # Node behavioral tests
tests/browser-flow.js      # browser interaction/data assertions
```

The deploy template loads the jsPsych assets in `config.json`, constructs its instance, calls `caption_check_init()` and runs `caption_check_experiment`. The first trial loads and validates both JSON files, then appends the selected timeline using jsPsych's timeline API. Loading failures offer Retry. Files resolve relative to `stimuli.js`, including on battery pages. Keep the JSON files alongside the experiment assets and ensure the deployment serves them.

Desktop/laptop use is required: the first trial blocks windows narrower than 800 CSS pixels and devices without a fine pointer. Widening the window or switching to an appropriate device allows Retry. Recruit desktop users with a mouse or trackpad; drawing uses pointer events. Videos retain their aspect ratio, including portrait clips, and are capped at 45% of the viewport height.

After each test trial, `window.dataSync()` is called when provided. The normal deploy completion flow submits the final dataset and handles study completion. This experiment does not initialize another jsPsych instance, redirect participants or call Prolific APIs. Test actual upload/completion with the configured battery before recruitment. This change does not deploy the survey.

## Replacing the pool

Change `caption_check/pool.json`, rebuild `lists.json`, and publish those two files together. Alternatively change their paths in `stimuli.js`. A manifest is JSON with this contract:

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

**Do not commit dataset media unless it is CC BY licensed.** Any dataset license may be used for separately hosted research clips, but hosting is a separate decision. This change adds no downloaded media or credentialed URLs. The existing real clips retain source audio and attribution in [CREDITS.md](caption_check/CREDITS.md). The audit recorded CC BY on 2026-10-28 without a version; confirm licensing before recruitment. Credits are shown before final submission and escaped as text.

## Building and assigning lists

From the repository root, with Node installed:

```sh
node scripts/build-lists.js caption_check/pool.json caption_check/lists.json \
  --seed preview-v2
node --test
```

`--main-count` defaults to **16 main clips** per list, the starting count for a 10-minute session; pass a different value once a pilot sets the final count. `--seed` defaults to `caption-v2`, and `--list-count` defaults to eight. Given the same input order, seed and options, output is identical. The builder fails if there are too few distinct sources, rather than silently shrinking the study. Runtime validation also rejects missing clips, duplicate sources, stale pool IDs, incorrect lengths and practice clips in lists. Change `pool_id` when replacing the media/prediction pool and rebuild the lists.

Within each list, each original source appears once. The builder stratifies on the caption prediction first: `captioned` (`captions: true`), `not_captioned` (`captions: false`) and `unknown` (null or omitted). It fills each list evenly from the strata the pool contains, so a clip predicted `captions: false` counts as not captioned even when its other labels are missing. Within each caption stratum, it spreads the `other_text` and `logos` predictions (true, false or unknown), then spreads channels and prefers sources/clips used less often by earlier lists. The bundle's `strata` field lists the caption strata found. Constraints are best efforts when the pool is skewed: inspect generated lists for the actual mix before recruiting. Only the two practice trials receive feedback; practice outcomes are recorded without rejecting or terminating participants.

`PROLIFIC_PID` determines the list by a stable FNV-1a hash modulo the number of lists. Deploy's legacy `PROLIFIC_ID` is used when `PROLIFIC_PID` is absent. Without either, previews choose a random list once at loading. The ID, selected list and assignment mode are recorded. Keep the list bundle unchanged during a study so returning participants retain their assignment. The limited preview has only 17 original sources, so overlap between its 16-clip lists is unavoidable. A larger pool enables more variation between participants.

## Timing and verification

Each trial records total browser time, playback start latency, presence-response time and annotation time. Timing depends on the clip and how many categories need boxes. Automated interactions cannot measure human comprehension or drawing speed. **A short human pilot on the actual classifier pool sets the final main-clip count for a 10-minute session.** Use the recorded timing fields to choose `--main-count`, rebuild the lists, and keep `time` in `config.json` and the instructions' “about 10 minutes” consistent with the result. The builder and the committed preview default to 16 main clips, matching the 10 minutes in `config.json`.

Browser pacing measurements on a 15.97-second real clip took **19.15 s, 23.11 s and 31.18 s** for zero, one and three positive categories, respectively (normal-speed playback, a scripted three-second presence response and four seconds per annotation). These measure browser flow with explicit response pacing, not participant speed. Subtracting playback gives about 8.5 seconds mean response overhead across those three cases. At that pace, 16 main trials of 12-second dataset clips take about 330 seconds, leaving roughly 270 seconds of a 10-minute budget for consent, instructions, two practices with feedback, credits and slower human responses. Clips averaging 15 seconds or participants drawing many boxes will require a smaller count.

Node tests exercise the list builder, URL/manifest validation, participant assignment and timeline/data behavior. `tests/browser-flow.js` defines `runCaptionBrowserTests()` for a Chrome page loading the experiment scripts. It uses real media playback and seeking, DOM forms and pointer-event dispatch; it checks required answers, multiple boxes across frames, undo, separate presence/distraction, normalized coordinates, timing and media errors. Synthetic event tests replace pointer capture only during dispatch; native dragging must also be smoke-tested with a mouse or browser driver.

Local verification passed the Node tests and 16 browser assertions. A full jsPsych smoke run of an earlier build, which also mixed two practice clips into the main sequence, completed two practices and 16 main clips with one list assignment; playback was accelerated to 8× only for that full-run smoke test. Repeat the full run with the current lists before recruitment. The timing benchmark used normal playback. A separate native browser drag saved a box, and a 390-pixel window was blocked. Actual deployment upload/completion remains to be checked in study setup.

For local browser verification, serve a scratch bootstrap page with jsPsych 7 and the three plugins listed in `config.json`, load the experiment scripts in config order, then use the same initialization sequence as deploy. Use a range-capable local server for MP4 seeking. Keep the bootstrap, browser evidence and output data outside the repository. A basic static server that ignores Range headers can play videos but fail annotation seeks. Verify final data upload and completion on the actual deployment before recruiting.

## Recorded data

All rows carry `pool_id`, `list_id`, `list_seed`, `assignment_mode`, `main_count`, `actual_sample_size` and the URL identifiers `PROLIFIC_PID`, `STUDY_ID`, `SESSION_ID` (null when absent). Each `caption_rating` trial includes:

- `exp_stage` (`practice` or `test`), `clip_id`, `source_id`, `channel_id`, `manifest_duration`, `predicted_labels`, `license`, `attribution` and `expected_presence` (null for main clips).
- `presence`: category keys `captions`, `other_text`, `logos`, each true/false; all null when media fails and the participant skips.
- `distraction`: the same keys with ratings 1–5 for present categories and null for absent categories or missing media. Each is the category's overall rating, shared by its boxes.
- `boxes`: an array of `{x, y, width, height, video_time, category, rating}`. Coordinates are fractions of the displayed video frame, top-left origin, within [0,1]; `video_time` is the actual paused timestamp in seconds. Multiple boxes per category and frame are allowed. An empty array is expected for all-negative answers or media failure.
- `rt`, `playback_start_rt_ms`, `presence_rt_ms`, `annotation_rt_ms` in milliseconds; `video_duration` in seconds, intrinsic `video_width`, `video_height`, `played_through`, and `media_error` (null on success).

Synthetic practices also record `practice_correct` (true/false, null on media failure). Main predictions never score participant answers. The previous Space-key notice task and single-rectangle fields have been replaced by category-specific annotation; analyses must use the v2 schema. Keep participant records out of this public repository.

## Synthetic media provenance

`media/caption.mp4` and `media/no-caption.mp4` are existing original four-second, silent FFmpeg test-pattern animations (640×360, 24 fps, H.264/YUV420p, fast-start). The captioned example adds “The colors are moving.” after one second. Both contain a technical timecode, counted as other floating text; neither has a logo. They are dedicated to [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). No classifier prediction is invented for them; practice expectations are recorded separately.
