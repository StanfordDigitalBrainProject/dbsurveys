var captionCheck = (function () {
  function videoURL(path) {
    var url = new URL(path, captionCheckAssetBase);
    if (/^[a-z][a-z\d+.-]*:|^\/\//i.test(path) && url.protocol !== 'https:') {
      throw new Error('Absolute video URLs must use HTTPS.');
    }
    if (!/^[a-z][a-z\d+.-]*:|^\/\//i.test(path) &&
        !url.href.startsWith(captionCheckAssetBase)) {
      throw new Error('Relative video paths must stay inside caption_check.');
    }
    if (url.username || url.password) throw new Error('Do not use credentialed video URLs.');
    return url.href;
  }

  function sample(stimuli, count, shuffle) {
    var yes = shuffle(stimuli.filter(function (s) { return s.pipeline_caption_label === true; }));
    var no = shuffle(stimuli.filter(function (s) { return s.pipeline_caption_label === false; }));
    var unknown = shuffle(stimuli.filter(function (s) { return s.pipeline_caption_label === null; }));
    var pairs = Math.min(Math.floor(count / 2), yes.length, no.length);
    var chosen = yes.splice(0, pairs).concat(no.splice(0, pairs));
    var needed = Math.max(0, count - chosen.length);
    chosen = chosen.concat(unknown.splice(0, needed));
    needed = Math.max(0, count - chosen.length);
    chosen = chosen.concat(shuffle(yes.concat(no)).slice(0, needed));
    var mode = pairs === Math.floor(count / 2) && count > 1 ? 'balanced' :
      (stimuli.every(function (s) { return s.pipeline_caption_label === null; }) ?
        'unlabeled_shuffle' : 'partial_balance');
    return { clips: shuffle(chosen), mode: mode };
  }

  function rectangle(start, end) {
    return {
      x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y)
    };
  }
  return { videoURL: videoURL, sample: sample, rectangle: rectangle };
})();
