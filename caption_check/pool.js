/* Shared manifest/list contract for the browser and the seeded list builder. */
(function (root) {
  'use strict';
  var categories = ['captions', 'other_text', 'logos'];
  function hash(value) {
    var h = 2166136261;
    for (var i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function random(seed) {
    var state = hash(String(seed));
    return function () {
      state += 0x6D2B79F5;
      var t = Math.imul(state ^ state >>> 15, 1 | state);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function mediaURL(path, base) {
    var url = new URL(path, base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error('Use public HTTP(S) media URLs without credentials, query strings or fragments.');
    }
    return url.href;
  }
  function validatePool(pool, manifestURL) {
    if (!pool || !pool.pool_id || !pool.base_url || !Array.isArray(pool.clips)) throw new Error('Invalid pool manifest.');
    var base = mediaURL(pool.base_url, manifestURL);
    var ids = new Set();
    pool.clips.forEach(function (clip) {
      ['clip_id', 'source_id', 'channel_id', 'video_url'].forEach(function (key) {
        if (typeof clip[key] !== 'string' || !clip[key].trim()) throw new Error('Missing ' + key);
      });
      if (ids.has(clip.clip_id)) throw new Error('Duplicate clip id: ' + clip.clip_id);
      ids.add(clip.clip_id);
      if (!Number.isFinite(clip.duration) || clip.duration <= 0) throw new Error('Invalid duration: ' + clip.clip_id);
      mediaURL(clip.video_url, base);
      categories.forEach(function (category) {
        var label = (clip.predicted_labels || {})[category];
        if (![true, false, null, undefined].includes(label)) throw new Error('Invalid predicted label: ' + category);
      });
    });
    if (!Array.isArray(pool.practice_ids) || pool.practice_ids.length !== 2 ||
        pool.practice_ids.some(function (id) {
          var clip = pool.clips.find(function (c) { return c.clip_id === id; });
          return !clip || !categories.every(function (k) { return typeof (clip.expected_presence || {})[k] === 'boolean'; });
        })) {
      throw new Error('Provide two practice_ids referencing clips with expected_presence for every category.');
    }
    return pool;
  }
  function mainClips(pool) {
    return pool.clips.filter(function (c) { return pool.practice_ids.indexOf(c.clip_id) < 0; });
  }
  function validateLists(pool, bundle) {
    if (bundle.pool_id !== pool.pool_id || !Array.isArray(bundle.lists) || !bundle.lists.length) throw new Error('Lists do not match pool.');
    var byId = new Map(mainClips(pool).map(function (c) { return [c.clip_id, c]; }));
    var listIds = new Set();
    bundle.lists.forEach(function (list) {
      if (!list.list_id || listIds.has(list.list_id)) throw new Error('Duplicate or missing list id.');
      listIds.add(list.list_id);
      if (!Array.isArray(list.clip_ids) || list.clip_ids.length !== bundle.main_count) throw new Error('Incorrect list size.');
      var sources = new Set();
      list.clip_ids.forEach(function (id) {
        var clip = byId.get(id);
        if (!clip || sources.has(clip.source_id)) throw new Error('Unknown main clip or repeated source: ' + id);
        sources.add(clip.source_id);
      });
    });
    return bundle;
  }
  function chooseList(bundle, pid, rng) {
    return bundle.lists[pid ? hash(pid) % bundle.lists.length : Math.floor((rng || Math.random)() * bundle.lists.length)];
  }
  var api = { categories: categories, hash: hash, random: random, mediaURL: mediaURL,
    validatePool: validatePool, mainClips: mainClips, validateLists: validateLists, chooseList: chooseList };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.captionPool = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
