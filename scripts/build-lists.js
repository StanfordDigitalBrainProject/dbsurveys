#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const poolAPI = require('../caption_check/pool.js');

function buildLists(pool, { seed = 'caption-v2', mainCount = 22, listCount = 8 } = {}) {
  poolAPI.validatePool(pool, 'https://manifest.example/pool.json');
  if (!Number.isInteger(mainCount) || mainCount < 1 || !Number.isInteger(listCount) || listCount < 1) {
    throw new Error('Counts must be positive integers.');
  }
  const mains = pool.clips.filter(c => !c.role || c.role === 'main');
  const checks = pool.clips.filter(c => c.role === 'check');
  if (new Set(mains.map(c => c.source_id)).size < mainCount || new Set(checks.map(c => c.source_id)).size < 2) {
    throw new Error('Not enough distinct sources; reduce --main-count explicitly for a limited preview pool.');
  }
  const rng = poolAPI.random(seed), uses = new Map(), sourceUses = new Map();
  const count = (map, key) => map.get(key) || 0;
  const inc = (map, key) => map.set(key, count(map, key) + 1);
  const bucket = c => {
    const labels = c.predicted_labels || {};
    return poolAPI.categories.find(k => labels[k] === true) ||
      (poolAPI.categories.every(k => labels[k] === false) ? 'none' : 'unknown');
  };
  const strata = ['captions', 'other_text', 'logos', 'none', 'unknown'].filter(b => mains.some(c => bucket(c) === b));
  const lists = [];
  for (let index = 0; index < listCount; index++) {
    const chosen = [], sources = new Set(), channels = new Map(), buckets = new Map();
    for (let slot = 0; slot < mainCount; slot++) {
      const candidates = mains.filter(c => !sources.has(c.source_id)).map(c => ({ c, tie: rng() }));
      // Prefer the least represented available prediction stratum, then spread channels
      // and avoid sources/clips already allocated to other lists. Seed breaks ties.
      const score = c => [count(buckets, bucket(c)), count(channels, c.channel_id),
        count(sourceUses, c.source_id), count(uses, c.clip_id)];
      candidates.sort((a, b) => {
        const sa = score(a.c), sb = score(b.c);
        for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sa[i] - sb[i];
        return a.tie - b.tie;
      });
      const clip = candidates[0].c;
      chosen.push(clip); sources.add(clip.source_id);
      inc(channels, clip.channel_id); inc(buckets, bucket(clip));
      inc(sourceUses, clip.source_id); inc(uses, clip.clip_id);
    }
    const availableChecks = checks.filter(c => !sources.has(c.source_id)).map(c => ({c, tie:rng()}));
    availableChecks.sort((a,b) => count(uses,a.c.clip_id)-count(uses,b.c.clip_id) || a.tie-b.tie);
    for (const {c} of availableChecks) {
      if (chosen.filter(c => c.role === 'check').length === 2) break;
      if (!sources.has(c.source_id)) { chosen.push(c); sources.add(c.source_id); inc(uses,c.clip_id); }
    }
    const shuffled = chosen.map(c => ({c,tie:rng()})).sort((a,b) => a.tie-b.tie).map(({c}) => c.clip_id);
    lists.push({list_id: `${pool.pool_id}-${seed}-${index + 1}`, clip_ids: shuffled});
  }
  return poolAPI.validateLists(pool, {pool_id:pool.pool_id, seed:String(seed), main_count:mainCount, strata, lists});
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    const [input, output] = args;
    if (!input || !output || args.length % 2 !== 0) throw new Error('Usage: node scripts/build-lists.js pool.json lists.json [--seed text] [--main-count 22] [--list-count 8]');
    const options = {};
    for (let i = 2; i < args.length; i += 2) {
      const key = {'--seed':'seed','--main-count':'mainCount','--list-count':'listCount'}[args[i]];
      if (!key) throw new Error('Unknown option: ' + args[i]);
      options[key] = key === 'seed' ? args[i+1] : Number(args[i+1]);
    }
    fs.writeFileSync(output, JSON.stringify(buildLists(JSON.parse(fs.readFileSync(input, 'utf8')), options), null, 2) + '\n');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {buildLists};
