var jsPsychCaptionVideo = (function (jspsych) {
  class CaptionVideoPlugin {
    constructor(jsPsych) { this.jsPsych = jsPsych; }

    trial(display, trial) {
      var started = performance.now();
      var phase = 'ready';
      var noticeTimes = [], noticeRTs = [];
      var playbackStarted = null, presenceStarted = null, drawingStarted = null;
      var presence = null, presenceRT = null, rect = null, anchor = null;
      var playedThrough = false, mediaError = null, annotationTime = null;
      var requestedFrame = null;
      var jsPsych = this.jsPsych;
      display.innerHTML = '<section class="caption-check">' +
        '<h2></h2><p class="prompt">Watch the entire video. Press Space the moment you notice a caption.</p>' +
        '<div class="frame"><video playsinline preload="auto" disablepictureinpicture></video>' +
        '<div class="drawing" hidden aria-label="Drag a rectangle around the caption"><div class="box" hidden></div></div></div>' +
        '<p class="status" role="status" aria-live="polite">Click Play when you are ready.</p>' +
        '<button class="play">Play video</button>' +
        '<div class="presence" hidden><p>Did this video have any burned-in captions or subtitles?</p>' +
        '<button class="yes">Yes</button><button class="no">No</button></div>' +
        '<div class="annotation" hidden><p class="draw-prompt"></p>' +
        '<label class="seek-label" hidden>Choose a frame showing the caption' +
        '<input class="seek" type="range" min="0" value="0" step="0.01"></label>' +
        '<button class="clear">Redraw rectangle</button><button class="save" disabled>Save rectangle and continue</button></div>' +
        '<div class="error" hidden><p>The video could not play. This will be recorded as a playback problem, not a caption answer.</p>' +
        '<button class="retry">Retry video</button><button class="skip">Continue without rating</button></div></section>';
      var q = function (selector) { return display.querySelector(selector); };
      var video = q('video'), drawing = q('.drawing'), box = q('.box');
      q('h2').textContent = trial.heading;
      video.src = trial.video_url;

      function status(text) { q('.status').textContent = text; }
      function finish() {
        phase = 'finished';
        document.removeEventListener('keydown', onKey);
        video.pause();
        jsPsych.finishTrial({
          presence_answer: presence,
          notice_times: noticeTimes,
          notice_rts_ms: noticeRTs,
          rectangle: rect,
          rectangle_video_time: annotationTime,
          annotation_frame_source: presence ? (noticeTimes.length ? 'first_notice' : 'manual_selection') : null,
          presence_rt_ms: presenceRT,
          rectangle_rt_ms: drawingStarted === null ? null : performance.now() - drawingStarted,
          rt: performance.now() - started,
          playback_start_rt_ms: playbackStarted === null ? null : playbackStarted - started,
          video_duration: Number.isFinite(video.duration) ? video.duration : null,
          video_width: video.videoWidth,
          video_height: video.videoHeight,
          played_through: playedThrough,
          media_error: mediaError
        });
      }
      function notice() {
        if (phase !== 'watch' || video.paused || video.ended) return;
        noticeTimes.push(video.currentTime);
        noticeRTs.push(performance.now() - playbackStarted);
        status('Caption notice recorded. Please keep watching until the video ends.');
      }
      function onKey(event) {
        if (event.code === 'Space' && phase === 'watch') {
          event.preventDefault();
          if (!event.repeat) notice();
        }
      }
      document.addEventListener('keydown', onKey);
      function playbackError() {
        if (phase === 'finished') return;
        mediaError = mediaError || (video.error ? 'media_error_' + video.error.code : 'playback_failed');
        phase = 'error';
        q('.error').hidden = false;
        q('.play').hidden = true;
        q('.presence').hidden = true;
        q('.annotation').hidden = true;
        drawing.hidden = true;
        status('Playback problem. Please retry or continue without a rating.');
      }
      async function play() {
        phase = 'watch';
        q('.play').hidden = true;
        status('Press Space the moment you notice a caption.');
        try { await video.play(); } catch (_) { playbackError(); }
      }
      q('.play').onclick = play;
      video.addEventListener('playing', function () {
        if (playbackStarted === null) playbackStarted = performance.now();
      });
      video.addEventListener('error', playbackError);
      q('.retry').onclick = function () {
        q('.error').hidden = true;
        phase = 'ready'; mediaError = null; playbackStarted = null;
        noticeTimes = []; noticeRTs = []; playedThrough = false;
        presence = null; presenceRT = null; rect = null; annotationTime = null;
        drawingStarted = null;
        video.load();
        q('.play').hidden = false;
        status('Click Play to retry from the beginning.');
      };
      q('.skip').onclick = function () {
        presence = null; rect = null; annotationTime = null;
        finish();
      };
      video.addEventListener('ended', function () {
        if (phase !== 'watch') return;
        playedThrough = true;
        phase = 'presence';
        presenceStarted = performance.now();
        q('.presence').hidden = false;
        status('Now answer whether the video had captions.');
        q('.yes').focus();
      });
      function clearRectangle() {
        rect = null; anchor = null; annotationTime = null;
        box.hidden = true; q('.save').disabled = true;
      }
      function frameReady() {
        if (phase !== 'draw' || video.seeking || video.readyState < 2) return;
        if (Math.abs(video.currentTime - requestedFrame) > 0.1) {
          mediaError = 'annotation_seek_failed';
          playbackError();
          return;
        }
        drawing.hidden = false;
        status('Drag a rectangle around the caption, then save it.');
      }
      video.addEventListener('seeked', frameReady);
      video.addEventListener('loadeddata', frameReady);
      function seek(time) {
        clearRectangle(); drawing.hidden = true;
        requestedFrame = Math.min(time, Math.max(0, video.duration - 0.05));
        video.currentTime = requestedFrame;
        frameReady();
      }
      function answer(value) {
        presence = value;
        presenceRT = performance.now() - presenceStarted;
        q('.presence').hidden = true;
        if (!value) { finish(); return; }
        phase = 'draw';
        video.pause();
        drawingStarted = performance.now();
        q('.annotation').hidden = false;
        q('.draw-prompt').textContent = noticeTimes.length ?
          'This is the frame at your first caption notice. Drag a rectangle around the caption.' :
          'No notice keypress was recorded. Use the slider to find a caption, then drag a rectangle around it.';
        q('.seek-label').hidden = noticeTimes.length > 0;
        q('.seek').max = Math.max(0, video.duration - 0.05);
        seek(noticeTimes.length ? noticeTimes[0] : 0);
      }
      q('.yes').onclick = function () { answer(true); };
      q('.no').onclick = function () { answer(false); };
      q('.seek').oninput = function () { seek(Number(q('.seek').value)); };
      q('.clear').onclick = clearRectangle;
      function point(event) {
        var bounds = drawing.getBoundingClientRect();
        return {
          x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
          y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
        };
      }
      function draw(event) {
        if (!anchor) return;
        rect = captionCheck.rectangle(anchor, point(event));
        box.hidden = false;
        box.style.left = rect.x * 100 + '%'; box.style.top = rect.y * 100 + '%';
        box.style.width = rect.width * 100 + '%'; box.style.height = rect.height * 100 + '%';
      }
      drawing.onpointerdown = function (event) {
        if (event.button !== 0 || phase !== 'draw' || video.seeking) return;
        event.preventDefault();
        clearRectangle(); anchor = point(event);
        drawing.setPointerCapture(event.pointerId);
      };
      drawing.onpointermove = draw;
      drawing.onpointerup = function (event) {
        if (!anchor) return;
        draw(event); anchor = null;
        annotationTime = video.currentTime;
        q('.save').disabled = !rect || rect.width < 0.005 || rect.height < 0.005;
      };
      drawing.onpointercancel = clearRectangle;
      q('.save').onclick = finish;
    }
  }
  CaptionVideoPlugin.info = {
    name: 'caption-video',
    parameters: {
      video_url: { type: jspsych.ParameterType.STRING, default: undefined },
      heading: { type: jspsych.ParameterType.STRING, default: 'Video' }
    }
  };
  return CaptionVideoPlugin;
})(jsPsychModule);
