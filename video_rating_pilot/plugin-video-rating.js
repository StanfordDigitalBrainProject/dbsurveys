var jsPsychVideoRating = (function (jspsych) {
  'use strict';
  var categories = [
    {id:'captions', label:'Captions or subtitles', description:'Text added to represent speech or narration, including translations.'},
    {id:'other_text', label:'Other floating text', description:'Added titles, labels or other text. Exclude writing physically in the scene.'},
    {id:'logos', label:'Logos or watermarks', description:'Added branding, channel marks or watermarks.'}
  ];
  function feelingScale(name, question, low, high) {
    return '<fieldset><legend>' + question + '</legend><div class="scale nine">' +
      Array.from({length:9}, function(_, i) {
        return '<label><input type="radio" name="' + name + '" value="' + (i+1) + '" required><span>' + (i+1) + '</span></label>';
      }).join('') + '</div><div class="scale-ends"><span>' + low + '</span><span>' + high + '</span></div></fieldset>';
  }
  var suitabilityOptions = [
    ['sexual', 'Sexual or pornographic content'], ['violence', 'Violence'],
    ['gore_injury', 'Gore or injury'], ['eating_disorder', 'Eating-disorder-related content'],
    ['other_upsetting', 'Other upsetting or triggering content'], ['none', 'None of these']
  ];
  // Playback keys: presses are timestamped while the clip plays and never pause it.
  var pressKeys = {
    Space:{name:'notice', label:'Space', meaning:'captions or subtitles'},
    KeyD:{name:'distracting', label:'D', meaning:'distracting or inappropriate'}
  };
  class VideoRatingPlugin {
    constructor(jsPsych) { this.jsPsych = jsPsych; }
    trial(display, trial) {
      var jsPsych = this.jsPsych, started = performance.now(), phase = 'ready';
      var presence = {}, ratings = {}, boxes = [], current = 0, active = [], anchor = null, draft = null;
      var playedThrough = false, mediaError = null, playbackStarted = null, presenceStarted = null, presenceRT = null;
      var annotationStarted = null, requestedFrame = 0, frameSource = null;
      var presses = {notice:{times:[], rts:[]}, distracting:{times:[], rts:[]}};
      var feelings = null, suitabilityFlags = null, suitabilityNone = null;
      var feelingsStarted = null, suitabilityStarted = null, feelingsRT = null, suitabilityRT = null;
      display.innerHTML = '<section class="video-rating-pilot"><h2></h2>' +
        '<p class="watch-prompt"></p><div class="trial-grid"><div class="video-panel">' +
        '<div class="frame"><video playsinline preload="auto" disablepictureinpicture></video>' +
        '<div class="drawing" hidden aria-label="Drag boxes around the selected category"></div></div>' +
        '<p class="key-reminder">' + Object.keys(pressKeys).map(function (code) {
          return '<span class="key key-' + pressKeys[code].name + '"><kbd>' + pressKeys[code].label + '</kbd> ' + pressKeys[code].meaning + '</span>';
        }).join('') + '</p>' +
        '<p class="status" role="status" aria-live="polite" tabindex="-1" hidden></p>' +
         '<button class="play">Play video</button></div><div class="question-panel">' +
        '<form class="feelings" hidden><h3>Your own feelings</h3><p>How did watching this clip make <strong>you</strong> feel?</p>' +
        feelingScale('pleasantness', 'How pleasant or unpleasant did you feel?', 'Very unpleasant', 'Very pleasant') +
        feelingScale('arousal', 'How calm or excited did you feel?', 'Very calm', 'Very excited') +
        '<button type="submit">Continue</button></form>' +
        '<form class="suitability" hidden><h3>General-audience suitability</h3><p>Which of these does this clip contain? Select all that apply.</p>' +
        '<p class="hint">These flags help researchers review clips. They do not automatically exclude a clip.</p>' +
        suitabilityOptions.map(function(option) {
          return '<label class="flag"><input type="checkbox" name="suitability" value="' + option[0] + '"> ' + option[1] + '</label>';
        }).join('') +
        '<button class="suitability-next" type="submit" disabled>Continue</button></form>' +
        '<form class="presence" hidden><h3>What appeared anywhere in this video?</h3>' + categories.map(function (c) {
          return '<fieldset><legend>' + c.label + '</legend><p class="hint">' + c.description + '</p>' +
            '<label><input type="radio" name="' + c.id + '" value="yes" required> Yes</label> ' +
            '<label><input type="radio" name="' + c.id + '" value="no" required> No</label></fieldset>';
        }).join('') + '<button type="submit">Continue</button></form>' +
        '<form class="annotation" hidden><h3 class="category-title"></h3>' +
        '<p class="hint">Choose a frame, then drag a tight box around each example. You can draw more than one box, including on different frames.</p>' +
        '<label>Video frame <output class="frame-time">0.00 s</output><input class="seek" type="range" min="0" value="0" step="0.01"></label>' +
        '<p class="box-count"></p><button class="undo" type="button">Undo last box</button>' +
        '<button class="clear" type="button">Clear boxes for this category</button>' +
        '<fieldset class="distraction"><legend>How distracting was this category overall?</legend><div class="scale">' +
        ['Not at all','Slightly','Moderately','Very','Extremely'].map(function (label, i) {
          return '<label><input type="radio" name="distraction" value="' + (i+1) + '" required><span>' + (i+1) + '</span><span class="hint">' + label + '</span></label>';
        }).join('') + '</div></fieldset><button class="save" type="submit" disabled>Save category and continue</button></form>' +
        '<div class="error" hidden><p>Playback failed. You may retry or continue; missing ratings stay unknown.</p>' +
        '<button class="retry">Retry video</button><button class="skip">Continue without rating</button></div></div></div></section>';
      var q = function (s) {return display.querySelector(s);};
      var video = q('video'), drawing = q('.drawing');
      q('h2').textContent = trial.heading;
      q('.watch-prompt').textContent = trial.prompt;
      // The status line stays hidden before playback so the Play screen fits the shortest window.
      function status(text) {q('.status').textContent = text; q('.status').hidden = false;}
      function finish() {
        if (phase === 'finished') return;
        phase = 'finished'; video.pause(); document.removeEventListener('keydown', onKey);
        jsPsych.finishTrial({notice_times:presses.notice.times, notice_rts_ms:presses.notice.rts,
          distracting_times:presses.distracting.times, distracting_rts_ms:presses.distracting.rts,
          annotation_frame_source:frameSource,feelings:feelings, suitability_flags:suitabilityFlags,
          suitability_none:suitabilityNone,
          feelings_rt_ms:feelingsRT, suitability_rt_ms:suitabilityRT,
          presence:presence, distraction:ratings, boxes:boxes,
          presence_rt_ms:presenceRT, annotation_rt_ms:annotationStarted === null ? null : performance.now()-annotationStarted,
          rt:performance.now()-started, playback_start_rt_ms:playbackStarted === null ? null : playbackStarted-started,
          video_duration:Number.isFinite(video.duration) ? video.duration : null,
          video_width:video.videoWidth, video_height:video.videoHeight,
          played_through:playedThrough, media_error:mediaError});
      }
      function playbackError() {
        if (phase === 'finished') return;
        mediaError = mediaError || (video.error ? 'media_error_'+video.error.code : 'playback_failed');
        phase = 'error'; video.pause();
        ['.play','.key-reminder','.feelings','.suitability','.presence','.annotation','.drawing'].forEach(function (s) {q(s).hidden=true;});
        q('.error').hidden=false; status('Playback problem. Retry or continue without rating.');
      }
      function onKey(event) {
        var key=pressKeys[event.code];
        if(!key || phase!=='watch') return;
        event.preventDefault();
        // Held keys auto-repeat; presses before playback starts are ignored.
        if(event.repeat || playbackStarted===null || video.paused || video.ended) return;
        presses[key.name].times.push(video.currentTime);
        presses[key.name].rts.push(performance.now()-playbackStarted);
        var chip=q('.key-'+key.name);
        chip.classList.remove('pressed'); void chip.offsetWidth; chip.classList.add('pressed');
        status(key.label+' recorded. Keep watching until the video ends.');
      }
      document.addEventListener('keydown', onKey);
      q('.play').onclick = async function () {
        phase='watch'; q('.play').hidden=true; status('Please watch until the video ends. Press Space or D at any time.');
        try {await video.play();} catch (_) {playbackError();}
      };
      video.addEventListener('playing', function () {if(playbackStarted===null) playbackStarted=performance.now();});
      video.addEventListener('error', playbackError);
      video.addEventListener('ended', function () {
        if(phase!=='watch') return;
        playedThrough=true; phase='feelings'; feelingsStarted=performance.now(); q('.key-reminder').hidden=true;
        q('.feelings').hidden=false; status('First, rate your own feelings.'); q('.status').focus();
      });
      function sizePicture() {
        if (!video.videoWidth || !video.videoHeight) return;
        var frame=q('.frame').getBoundingClientRect();
        var picture=videoRatingPilot.pictureRect(video.videoWidth, video.videoHeight, frame.width, frame.height);
        drawing.style.left=picture.x+'px'; drawing.style.top=picture.y+'px';
        drawing.style.width=picture.width+'px'; drawing.style.height=picture.height+'px';
      }
      video.addEventListener('loadedmetadata', sizePicture);
      q('.feelings').onsubmit=function(event) {
        event.preventDefault();
        if(phase!=='feelings' || !q('.feelings').reportValidity()) return;
        feelings={pleasantness:Number(q('input[name="pleasantness"]:checked').value),
          arousal:Number(q('input[name="arousal"]:checked').value)};
        feelingsRT=performance.now()-feelingsStarted;
        q('.feelings').hidden=true; phase='suitability'; suitabilityStarted=performance.now();
        q('.suitability').hidden=false; status('Now flag content for researcher review.');
      };
      q('.suitability').onchange=function(event) {
        var checked=event.target;
        if(checked.name==='suitability' && checked.checked) {
          if(checked.value==='none') display.querySelectorAll('input[name="suitability"]').forEach(function(input){if(input!==checked) input.checked=false;});
          else q('input[name="suitability"][value="none"]').checked=false;
        }
        q('.suitability-next').disabled=!q('input[name="suitability"]:checked');
      };
      q('.suitability').onsubmit=function(event) {
        event.preventDefault();
        if(phase!=='suitability' || !q('input[name="suitability"]:checked')) return;
        suitabilityFlags=Array.from(display.querySelectorAll('input[name="suitability"]:checked')).map(function(input){return input.value;}).filter(function(value){return value!=='none';});
        suitabilityNone=q('input[name="suitability"][value="none"]').checked;
        suitabilityRT=performance.now()-suitabilityStarted;
        q('.suitability').hidden=true; phase='presence'; presenceStarted=performance.now();
        q('.presence').hidden=false; status('Finally, answer Yes or No for each overlay category.');
      };
      function renderBoxes() {
        drawing.innerHTML='';
        active.forEach(function (b) {if(Math.abs(b.video_time-video.currentTime)<0.06) paint(b);});
        if(draft) paint(draft);
        q('.box-count').textContent=active.length+' box'+(active.length===1?'':'es')+' saved for this category.';
        q('.save').disabled=active.length===0 || !q('input[name="distraction"]:checked') || !!anchor;
      }
      function paint(b) {
        var box=document.createElement('div'); box.className='box';
        box.style.left=b.x*100+'%'; box.style.top=b.y*100+'%';
        box.style.width=b.width*100+'%'; box.style.height=b.height*100+'%'; drawing.appendChild(box);
      }
      function frameReady() {
        if(phase!=='draw' || video.seeking || video.readyState<2) return;
        if(Math.abs(video.currentTime-requestedFrame)>0.1) {mediaError='annotation_seek_failed'; playbackError(); return;}
        drawing.hidden=false; renderBoxes();
        status((captionsFromNotice() && requestedFrame===firstNoticeFrame() ? 'This is the frame at your first Space press. ' : '')+
          'Drag a box around '+categories[current].label.toLowerCase()+'.');
      }
      video.addEventListener('seeked', frameReady); video.addEventListener('loadeddata', frameReady);
      function captionsFromNotice() {return categories[current].id==='captions' && frameSource==='first_notice';}
      function firstNoticeFrame() {return Math.min(presses.notice.times[0],Math.max(0,video.duration-0.05));}
      function seek(time) {
        anchor=null; draft=null; drawing.hidden=true;
        requestedFrame=Math.min(time,Math.max(0,video.duration-0.05));
        q('.seek').value=requestedFrame; q('.frame-time').textContent=requestedFrame.toFixed(2)+' s';
        video.currentTime=requestedFrame; frameReady();
      }
      function nextCategory() {
        while(current<categories.length && !presence[categories[current].id]) current++;
        if(current===categories.length) {finish(); return;}
        phase='draw'; active=[]; anchor=null; draft=null;
        q('.annotation').reset(); q('.annotation').hidden=false;
        q('.category-title').textContent='Locate: '+categories[current].label;
        q('.seek').max=Math.max(0,video.duration-0.05);
        seek(captionsFromNotice() ? presses.notice.times[0] : 0);
      }
      q('.presence').onsubmit=function (event) {
        event.preventDefault(); if(phase!=='presence' || !q('.presence').reportValidity()) return;
        categories.forEach(function (c) {presence[c.id]=q('input[name="'+c.id+'"]:checked').value==='yes'; ratings[c.id]=null;});
        presenceRT=performance.now()-presenceStarted; q('.presence').hidden=true;
        annotationStarted=categories.some(function(c){return presence[c.id];}) ? performance.now() : null;
        if(presence.captions) frameSource=presses.notice.times.length ? 'first_notice' : 'clip_start';
        nextCategory();
      };
      q('.seek').oninput=function(){seek(Number(q('.seek').value));};
      q('.undo').onclick=function(){active.pop(); renderBoxes();};
      q('.clear').onclick=function(){active=[]; anchor=null; draft=null; renderBoxes();};
      q('.distraction').onchange=renderBoxes;
      function point(event) {
        var bounds=drawing.getBoundingClientRect();
        return {x:Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width)),
          y:Math.max(0,Math.min(1,(event.clientY-bounds.top)/bounds.height))};
      }
      function draw(event) {
        if(!anchor) return;
        draft=videoRatingPilot.rectangle(anchor,point(event)); renderBoxes();
      }
      drawing.onpointerdown=function(event){
        if(event.button!==0 || phase!=='draw' || drawing.hidden || video.seeking) return;
        event.preventDefault(); anchor=point(event); draft=null; drawing.setPointerCapture(event.pointerId); renderBoxes();
      };
      drawing.onpointermove=draw;
      drawing.onpointerup=function(event){
        if(!anchor) return;
        draw(event);
        if(draft.width>=0.005 && draft.height>=0.005) active.push(Object.assign({},draft,{video_time:video.currentTime}));
        anchor=null; draft=null; renderBoxes();
      };
      drawing.onpointercancel=function(){anchor=null; draft=null; renderBoxes();};
      q('.annotation').onsubmit=function(event){
        event.preventDefault();
        if(phase!=='draw' || anchor || !active.length || !q('.annotation').reportValidity()) return;
        var rating=Number(q('input[name="distraction"]:checked').value), category=categories[current].id;
        ratings[category]=rating;
        active.forEach(function(b){boxes.push(Object.assign({},b,{category:category,rating:rating}));});
        current++; nextCategory();
      };
      q('.skip').onclick=function(){
        feelings=null; suitabilityFlags=null; suitabilityNone=null; frameSource=null;
        categories.forEach(function(c){presence[c.id]=null; ratings[c.id]=null;}); boxes=[]; finish();
      };
      q('.retry').onclick=function(){
        phase='ready'; mediaError=null; playedThrough=false; playbackStarted=null; presenceStarted=null;
        presenceRT=null; annotationStarted=null; frameSource=null; presence={};
        presses={notice:{times:[], rts:[]}, distracting:{times:[], rts:[]}}; q('.key-reminder').hidden=false; ratings={}; boxes=[]; active=[]; current=0; anchor=null; draft=null;
        feelings=null; suitabilityFlags=null; suitabilityNone=null;
        feelingsStarted=null; suitabilityStarted=null; feelingsRT=null; suitabilityRT=null;
        q('.feelings').reset(); q('.suitability').reset(); q('.suitability-next').disabled=true;
        q('.presence').reset(); q('.annotation').reset(); q('.error').hidden=true; q('.play').hidden=false;
        video.load(); q('.status').hidden=true;
      };
      // Attach error handling before assigning src (cached media can fail immediately).
      video.src=trial.video_url;
    }
  }
  VideoRatingPlugin.info={name:'video-rating',parameters:{
    video_url:{type:jspsych.ParameterType.STRING,default:undefined},
    heading:{type:jspsych.ParameterType.STRING,default:'Video'},
    prompt:{type:jspsych.ParameterType.STRING,default:'Watch the whole clip. Press Space or D whenever they apply; the video keeps playing.'}
  }};
  return VideoRatingPlugin;
})(jsPsychModule);
