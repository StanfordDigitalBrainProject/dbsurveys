var captionCheck = (function () {
  function videoURL(path) {
    return new URL(path, captionCheckAssetBase).href;
  }

  function sample(stimuli, count, shuffle) {
    if (stimuli.some(function (s) { return s.pipeline_caption_label === null; })) {
      return { clips: shuffle(stimuli).slice(0, count), mode: 'unlabeled_shuffle' };
    }
    if (count % 2 !== 0) {
      throw new Error('sample_size must be even to balance captioned and uncaptioned videos.');
    }
    var half = count / 2;
    var yes = stimuli.filter(function (s) { return s.pipeline_caption_label === true; });
    var no = stimuli.filter(function (s) { return s.pipeline_caption_label === false; });
    if (yes.length < half || no.length < half) {
      throw new Error('Balanced sampling needs ' + half + ' captioned and ' + half +
        ' uncaptioned stimuli; found ' + yes.length + ' and ' + no.length + '.');
    }
    var chosen = shuffle(yes).slice(0, half).concat(shuffle(no).slice(0, half));
    return { clips: shuffle(chosen), mode: 'balanced' };
  }

  function rectangle(start, end) {
    return {
      x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y)
    };
  }
  return { videoURL: videoURL, sample: sample, rectangle: rectangle };
})();
