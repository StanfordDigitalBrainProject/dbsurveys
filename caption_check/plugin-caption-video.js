var jsPsychCaptionVideo = (function (jspsych) {
  'use strict';
  var categories = [
    {id:'captions', label:'Captions or subtitles', description:'Text added to represent speech or narration, including translations.'},
    {id:'other_text', label:'Other floating text', description:'Added titles, labels or other text. Exclude writing physically in the scene.'},
    {id:'logos', label:'Logos or watermarks', description:'Added branding, channel marks or watermarks.'}
  ];
  class CaptionVideoPlugin {
    constructor(jsPsych) { this.jsPsych = jsPsych; }
    trial(display, trial) {
      var jsPsych = this.jsPsych, started = performance.now(), phase = 'ready';
      var presence = {}, ratings = {}, boxes = [], current = 0, active = [], anchor = null, draft = null;
      var playedThrough = false, mediaError = null, playbackStarted = null, presenceStarted = null, presenceRT = null;
      var annotationStarted = null, requestedFrame = 0;
      display.innerHTML = '<section class="caption-check"><h2></h2>' +
        '<p>Watch the whole video for captions, other floating text, and logos.</p>' +
        '<div class="frame"><video playsinline preload="auto" disablepictureinpicture></video>' +
        '<div class="drawing" hidden aria-label="Drag boxes around the selected category"></div></div>' +
        '<p class="status" role="status" aria-live="polite" tabindex="-1">Click Play when ready.</p>' +
        '<button class="play">Play video</button>' +
        '<form class="presence" hidden><h3>What appeared anywhere in this video?</h3>' + categories.map(function (c) {
          return '<fieldset><legend>' + c.label + '</legend><p>' + c.description + '</p>' +
            '<label><input type="radio" name="' + c.id + '" value="yes" required> Yes</label> ' +
            '<label><input type="radio" name="' + c.id + '" value="no" required> No</label></fieldset>';
        }).join('') + '<button type="submit">Continue</button></form>' +
        '<form class="annotation" hidden><h3 class="category-title"></h3>' +
        '<p>Choose a frame, then drag a tight box around each example. You can draw more than one box, including on different frames.</p>' +
        '<label>Video frame <output class="frame-time">0.00 s</output><input class="seek" type="range" min="0" value="0" step="0.01"></label>' +
        '<p class="box-count"></p><button class="undo" type="button">Undo last box</button>' +
        '<button class="clear" type="button">Clear boxes for this category</button>' +
        '<fieldset class="distraction"><legend>How distracting was this category overall?</legend>' +
        ['Not at all','Slightly','Moderately','Very','Extremely'].map(function (label, i) {
          return '<label><input type="radio" name="distraction" value="' + (i+1) + '" required> ' + (i+1) + ' — ' + label + '</label>';
        }).join('') + '</fieldset><button class="save" type="submit" disabled>Save category and continue</button></form>' +
        '<div class="error" hidden><p>Playback failed. You may retry or continue; missing ratings stay unknown.</p>' +
        '<button class="retry">Retry video</button><button class="skip">Continue without rating</button></div></section>';
      var q = function (s) {return display.querySelector(s);};
      var video = q('video'), drawing = q('.drawing');
      q('h2').textContent = trial.heading;
      function status(text) {q('.status').textContent = text;}
      function finish() {
        if (phase === 'finished') return;
        phase = 'finished'; video.pause();
        jsPsych.finishTrial({presence:presence, distraction:ratings, boxes:boxes,
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
        ['.play','.presence','.annotation','.drawing'].forEach(function (s) {q(s).hidden=true;});
        q('.error').hidden=false; status('Playback problem. Retry or continue without rating.');
      }
      q('.play').onclick = async function () {
        phase='watch'; q('.play').hidden=true; status('Please watch until the video ends.');
        try {await video.play();} catch (_) {playbackError();}
      };
      video.addEventListener('playing', function () {if(playbackStarted===null) playbackStarted=performance.now();});
      video.addEventListener('error', playbackError);
      video.addEventListener('ended', function () {
        if(phase!=='watch') return;
        playedThrough=true; phase='presence'; presenceStarted=performance.now();
        q('.presence').hidden=false; status('Answer Yes or No for each category.'); q('.status').focus();
      });
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
        drawing.hidden=false; renderBoxes(); status('Drag a box around '+categories[current].label.toLowerCase()+'.');
      }
      video.addEventListener('seeked', frameReady); video.addEventListener('loadeddata', frameReady);
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
        q('.seek').max=Math.max(0,video.duration-0.05); seek(0);
      }
      q('.presence').onsubmit=function (event) {
        event.preventDefault(); if(phase!=='presence' || !q('.presence').reportValidity()) return;
        categories.forEach(function (c) {presence[c.id]=q('input[name="'+c.id+'"]:checked').value==='yes'; ratings[c.id]=null;});
        presenceRT=performance.now()-presenceStarted; q('.presence').hidden=true;
        annotationStarted=categories.some(function(c){return presence[c.id];}) ? performance.now() : null;
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
        draft=captionCheck.rectangle(anchor,point(event)); renderBoxes();
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
        categories.forEach(function(c){presence[c.id]=null; ratings[c.id]=null;}); boxes=[]; finish();
      };
      q('.retry').onclick=function(){
        phase='ready'; mediaError=null; playedThrough=false; playbackStarted=null; presenceStarted=null;
        presenceRT=null; annotationStarted=null; presence={}; ratings={}; boxes=[]; active=[]; current=0; anchor=null; draft=null;
        q('.presence').reset(); q('.annotation').reset(); q('.error').hidden=true; q('.play').hidden=false;
        video.load(); status('Click Play to retry from the beginning.');
      };
      // Attach error handling before assigning src (cached media can fail immediately).
      video.src=trial.video_url;
    }
  }
  CaptionVideoPlugin.info={name:'caption-video',parameters:{
    video_url:{type:jspsych.ParameterType.STRING,default:undefined},
    heading:{type:jspsych.ParameterType.STRING,default:'Video'}
  }};
  return CaptionVideoPlugin;
})(jsPsychModule);
