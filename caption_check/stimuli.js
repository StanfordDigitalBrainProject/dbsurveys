/* Relative URLs resolve against this script, including on deploy battery pages. */
var captionCheckAssetBase = new URL('.', document.currentScript.src).href;
var captionCheckSettings = { sample_size: 20, stimulus_set: 'cc-by-excerpts-v1' };

// Retained until a clearly captioned real practice example is confirmed.
var captionCheckSyntheticSource = {
  source_id: 'dbsurveys-original-synthetic',
  license: 'CC0-1.0',
  attribution: 'Original synthetic animation created for StanfordDigitalBrainProject/dbsurveys; dedicated to CC0.'
};
var captionCheckPractice = [
  Object.assign({ clip_id: 'practice-caption', video_url: 'media/caption.mp4', expected_presence: true },
    captionCheckSyntheticSource),
  Object.assign({ clip_id: 'practice-no-caption', video_url: 'media/no-caption.mp4', expected_presence: false },
    captionCheckSyntheticSource)
];


var captionCheckSources = {
  "165OCgze4x4": {
    "source_id": "165OCgze4x4",
    "source_title": "Barbecue Chicken & Beef | Pov",
    "channel": "Ghanzi",
    "source_url": "https://www.youtube.com/watch?v=165OCgze4x4",
    "license": "CC BY",
    "attribution": "Barbecue Chicken & Beef | Pov — Ghanzi; https://www.youtube.com/watch?v=165OCgze4x4; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  },
  "1KUxzWSX_VM": {
    "source_id": "1KUxzWSX_VM",
    "source_title": "XXL Best Of Fire Kitchen Part 1  🔥🔥🔥",
    "channel": "Fire Kitchen",
    "source_url": "https://www.youtube.com/watch?v=1KUxzWSX_VM",
    "license": "CC BY",
    "attribution": "XXL Best Of Fire Kitchen Part 1  🔥🔥🔥 — Fire Kitchen; https://www.youtube.com/watch?v=1KUxzWSX_VM; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  },
  "5xS2F_UGAuA": {
    "source_id": "5xS2F_UGAuA",
    "source_title": "FIXING A BRICK WALL WITH CRACKED MORTAR. LOSSE BRICKS CHANGED MY PLAN. Satisfying, double speed.",
    "channel": "WorkAroundTheHouse",
    "source_url": "https://www.youtube.com/watch?v=5xS2F_UGAuA",
    "license": "CC BY",
    "attribution": "FIXING A BRICK WALL WITH CRACKED MORTAR. LOSSE BRICKS CHANGED MY PLAN. Satisfying, double speed. — WorkAroundTheHouse; https://www.youtube.com/watch?v=5xS2F_UGAuA; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  },
  "GDYLlBpLaJY": {
    "source_id": "GDYLlBpLaJY",
    "source_title": "The Best Tinolang Manok Recipe!",
    "channel": "Ghanzi",
    "source_url": "https://www.youtube.com/watch?v=GDYLlBpLaJY",
    "license": "CC BY",
    "attribution": "The Best Tinolang Manok Recipe! — Ghanzi; https://www.youtube.com/watch?v=GDYLlBpLaJY; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  },
  "Gs168pJ9vjU": {
    "source_id": "Gs168pJ9vjU",
    "source_title": "Scrambled Eggs | Pov",
    "channel": "Ghanzi",
    "source_url": "https://www.youtube.com/watch?v=Gs168pJ9vjU",
    "license": "CC BY",
    "attribution": "Scrambled Eggs | Pov — Ghanzi; https://www.youtube.com/watch?v=Gs168pJ9vjU; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  },
  "IA9conOsNR8": {
    "source_id": "IA9conOsNR8",
    "source_title": "Burrito Drive tru at Taqueria De Anda",
    "channel": "Ghanzi",
    "source_url": "https://www.youtube.com/watch?v=IA9conOsNR8",
    "license": "CC BY",
    "attribution": "Burrito Drive tru at Taqueria De Anda — Ghanzi; https://www.youtube.com/watch?v=IA9conOsNR8; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  },
  "JOvDTaWZ5c8": {
    "source_id": "JOvDTaWZ5c8",
    "source_title": "Going To Raising Cane's Ordering The Box Combo | Pov",
    "channel": "Ghanzi",
    "source_url": "https://www.youtube.com/watch?v=JOvDTaWZ5c8",
    "license": "CC BY",
    "attribution": "Going To Raising Cane's Ordering The Box Combo | Pov — Ghanzi; https://www.youtube.com/watch?v=JOvDTaWZ5c8; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  },
  "Kvdoe5yFUxI": {
    "source_id": "Kvdoe5yFUxI",
    "source_title": "Carne Asada Burrito Time!",
    "channel": "Ghanzi",
    "source_url": "https://www.youtube.com/watch?v=Kvdoe5yFUxI",
    "license": "CC BY",
    "attribution": "Carne Asada Burrito Time! — Ghanzi; https://www.youtube.com/watch?v=Kvdoe5yFUxI; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  },
  "PC6Y_ZQpxm0": {
    "source_id": "PC6Y_ZQpxm0",
    "source_title": "Phnom Penh City - Celebration of 67th Independence Day",
    "channel": "Street Food TV",
    "source_url": "https://www.youtube.com/watch?v=PC6Y_ZQpxm0",
    "license": "CC BY",
    "attribution": "Phnom Penh City - Celebration of 67th Independence Day — Street Food TV; https://www.youtube.com/watch?v=PC6Y_ZQpxm0; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  },
  "S4iW7PiSKqU": {
    "source_id": "S4iW7PiSKqU",
    "source_title": "Pinoy Pinay Fast Food Restaurant | Pov",
    "channel": "Ghanzi",
    "source_url": "https://www.youtube.com/watch?v=S4iW7PiSKqU",
    "license": "CC BY",
    "attribution": "Pinoy Pinay Fast Food Restaurant | Pov — Ghanzi; https://www.youtube.com/watch?v=S4iW7PiSKqU; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  },
  "WFxDxY-ab5Y": {
    "source_id": "WFxDxY-ab5Y",
    "source_title": "Ordering In N Out Number 3 Hamburger Combo Drive tru | Pov",
    "channel": "Ghanzi",
    "source_url": "https://www.youtube.com/watch?v=WFxDxY-ab5Y",
    "license": "CC BY",
    "attribution": "Ordering In N Out Number 3 Hamburger Combo Drive tru | Pov — Ghanzi; https://www.youtube.com/watch?v=WFxDxY-ab5Y; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  },
  "_3Zz-gPaoMA": {
    "source_id": "_3Zz-gPaoMA",
    "source_title": "Sisig & Munggoo | Filipino Fast Food To Go | Pov",
    "channel": "Ghanzi",
    "source_url": "https://www.youtube.com/watch?v=_3Zz-gPaoMA",
    "license": "CC BY",
    "attribution": "Sisig & Munggoo | Filipino Fast Food To Go | Pov — Ghanzi; https://www.youtube.com/watch?v=_3Zz-gPaoMA; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  },
  "jY4AJZp3qZk": {
    "source_id": "jY4AJZp3qZk",
    "source_title": "Trader Joe's | Cheapest eggs in town | Pov",
    "channel": "Ghanzi",
    "source_url": "https://www.youtube.com/watch?v=jY4AJZp3qZk",
    "license": "CC BY",
    "attribution": "Trader Joe's | Cheapest eggs in town | Pov — Ghanzi; https://www.youtube.com/watch?v=jY4AJZp3qZk; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  },
  "pIgwhuZNUt0": {
    "source_id": "pIgwhuZNUt0",
    "source_title": "The Burrito",
    "channel": "Ghanzi",
    "source_url": "https://www.youtube.com/watch?v=pIgwhuZNUt0",
    "license": "CC BY",
    "attribution": "The Burrito — Ghanzi; https://www.youtube.com/watch?v=pIgwhuZNUt0; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  },
  "ss-bodT36qQ": {
    "source_id": "ss-bodT36qQ",
    "source_title": "Ordering The Plate Combo At Panda Express | Pov",
    "channel": "Ghanzi",
    "source_url": "https://www.youtube.com/watch?v=ss-bodT36qQ",
    "license": "CC BY",
    "attribution": "Ordering The Plate Combo At Panda Express | Pov — Ghanzi; https://www.youtube.com/watch?v=ss-bodT36qQ; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  },
  "w_o2BiYyXvE": {
    "source_id": "w_o2BiYyXvE",
    "source_title": "Raking Autumn Leaves",
    "channel": "ManBehindACameraASMR",
    "source_url": "https://www.youtube.com/watch?v=w_o2BiYyXvE",
    "license": "CC BY",
    "attribution": "Raking Autumn Leaves — ManBehindACameraASMR; https://www.youtube.com/watch?v=w_o2BiYyXvE; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  },
  "wmf91vFReFY": {
    "source_id": "wmf91vFReFY",
    "source_title": "Thrifting Pov",
    "channel": "Ghanzi",
    "source_url": "https://www.youtube.com/watch?v=wmf91vFReFY",
    "license": "CC BY",
    "attribution": "Thrifting Pov — Ghanzi; https://www.youtube.com/watch?v=wmf91vFReFY; CC BY (YouTube Creative Commons); excerpt; playback encoding/metadata may be adapted."
  }
};

// Exact catalog clip IDs; no existing pipeline caption predictions were found.
var captionCheckStimuli = [
  Object.assign({"clip_id": "165OCgze4x4_part_00000000", "video_url": "media/165OCgze4x4_part_00000000.mp4", "pipeline_caption_label": null}, captionCheckSources["165OCgze4x4"]),
  Object.assign({"clip_id": "1KUxzWSX_VM_part_00000000", "video_url": "media/1KUxzWSX_VM_part_00000000.mp4", "pipeline_caption_label": null}, captionCheckSources["1KUxzWSX_VM"]),
  Object.assign({"clip_id": "5xS2F_UGAuA_part_00000000", "video_url": "media/5xS2F_UGAuA_part_00000000.mp4", "pipeline_caption_label": null}, captionCheckSources["5xS2F_UGAuA"]),
  Object.assign({"clip_id": "GDYLlBpLaJY_part_00000009", "video_url": "media/GDYLlBpLaJY_part_00000009.mp4", "pipeline_caption_label": null}, captionCheckSources["GDYLlBpLaJY"]),
  Object.assign({"clip_id": "Gs168pJ9vjU_part_00000000", "video_url": "media/Gs168pJ9vjU_part_00000000.mp4", "pipeline_caption_label": null}, captionCheckSources["Gs168pJ9vjU"]),
  Object.assign({"clip_id": "IA9conOsNR8_part_00000000", "video_url": "media/IA9conOsNR8_part_00000000.mp4", "pipeline_caption_label": null}, captionCheckSources["IA9conOsNR8"]),
  Object.assign({"clip_id": "JOvDTaWZ5c8_part_00000000", "video_url": "media/JOvDTaWZ5c8_part_00000000.mp4", "pipeline_caption_label": null}, captionCheckSources["JOvDTaWZ5c8"]),
  Object.assign({"clip_id": "Kvdoe5yFUxI_part_00000000", "video_url": "media/Kvdoe5yFUxI_part_00000000.mp4", "pipeline_caption_label": null}, captionCheckSources["Kvdoe5yFUxI"]),
  Object.assign({"clip_id": "PC6Y_ZQpxm0_part_00000001", "video_url": "media/PC6Y_ZQpxm0_part_00000001.mp4", "pipeline_caption_label": null}, captionCheckSources["PC6Y_ZQpxm0"]),
  Object.assign({"clip_id": "S4iW7PiSKqU_part_00000000", "video_url": "media/S4iW7PiSKqU_part_00000000.mp4", "pipeline_caption_label": null}, captionCheckSources["S4iW7PiSKqU"]),
  Object.assign({"clip_id": "WFxDxY-ab5Y_part_00000000", "video_url": "media/WFxDxY-ab5Y_part_00000000.mp4", "pipeline_caption_label": null}, captionCheckSources["WFxDxY-ab5Y"]),
  Object.assign({"clip_id": "_3Zz-gPaoMA_part_00000000", "video_url": "media/_3Zz-gPaoMA_part_00000000.mp4", "pipeline_caption_label": null}, captionCheckSources["_3Zz-gPaoMA"]),
  Object.assign({"clip_id": "jY4AJZp3qZk_part_00000000", "video_url": "media/jY4AJZp3qZk_part_00000000.mp4", "pipeline_caption_label": null}, captionCheckSources["jY4AJZp3qZk"]),
  Object.assign({"clip_id": "pIgwhuZNUt0_part_00000000", "video_url": "media/pIgwhuZNUt0_part_00000000.mp4", "pipeline_caption_label": null}, captionCheckSources["pIgwhuZNUt0"]),
  Object.assign({"clip_id": "ss-bodT36qQ_part_00000000", "video_url": "media/ss-bodT36qQ_part_00000000.mp4", "pipeline_caption_label": null}, captionCheckSources["ss-bodT36qQ"]),
  Object.assign({"clip_id": "w_o2BiYyXvE_part_00000000", "video_url": "media/w_o2BiYyXvE_part_00000000.mp4", "pipeline_caption_label": null}, captionCheckSources["w_o2BiYyXvE"]),
  Object.assign({"clip_id": "wmf91vFReFY_part_00000002", "video_url": "media/wmf91vFReFY_part_00000002.mp4", "pipeline_caption_label": null}, captionCheckSources["wmf91vFReFY"]),
  Object.assign({"clip_id": "165OCgze4x4_part_00000001", "video_url": "media/165OCgze4x4_part_00000001.mp4", "pipeline_caption_label": null}, captionCheckSources["165OCgze4x4"]),
  Object.assign({"clip_id": "1KUxzWSX_VM_part_00000002", "video_url": "media/1KUxzWSX_VM_part_00000002.mp4", "pipeline_caption_label": null}, captionCheckSources["1KUxzWSX_VM"]),
  Object.assign({"clip_id": "5xS2F_UGAuA_part_00000002", "video_url": "media/5xS2F_UGAuA_part_00000002.mp4", "pipeline_caption_label": null}, captionCheckSources["5xS2F_UGAuA"]),
];
