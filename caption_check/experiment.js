var caption_check_experiment = [];

function captionCheckTimeline(pool, bundle, params) {
  var pid=params.get('PROLIFIC_PID') || params.get('PROLIFIC_ID');
  var list=captionPool.chooseList(bundle,pid);
  var byId=new Map(pool.clips.map(function(c){return [c.clip_id,c];}));
  var selected=list.clip_ids.map(function(id){return byId.get(id);});
  var practice=pool.practice_ids.map(function(id){return byId.get(id);});
  var base=captionPool.mediaURL(pool.base_url,new URL(captionCheckSettings.manifest,captionCheckAssetBase));
  var timeline=[];
  jsPsych.data.addProperties({exp_id:'caption_check', PROLIFIC_PID:pid,
    STUDY_ID:params.get('STUDY_ID'), SESSION_ID:params.get('SESSION_ID'),
    pool_id:pool.pool_id, list_id:list.list_id, list_seed:bundle.seed,
    assignment_mode:pid?'participant_hash':'preview_random', main_count:bundle.main_count,
    check_count:2, actual_sample_size:selected.length});
  timeline.push({type:jsPsychInstructions, show_clickable_nav:true, data:{trial_id:'instructions'}, pages:[
    '<section class="caption-check"><h1>Caption Check</h1><p><strong>Research preview — consent text pending.</strong></p>'+
    '<p>[IRB CONSENT PLACEHOLDER: insert approved consent information, contact details, risks, compensation, voluntary participation and withdrawal instructions before recruitment.]</p>'+
    '<p>You will watch '+selected.length+' short videos after two practice examples. Allow about 10 minutes. Continuing starts the preview.</p></section>',
    '<section class="caption-check"><h2>Look for three kinds of additions</h2><p><strong>Captions or subtitles:</strong> text representing speech, narration or translation.</p>'+
    '<p><strong>Other floating text:</strong> added titles, labels or other words.</p><p><strong>Logos or watermarks:</strong> added branding or channel marks.</p>'+
    '<p>Do not count writing or logos physically in the filmed scene (for example, signs or clothing).</p></section>',
    '<section class="caption-check"><h2>After each video</h2><p>Watch all the way through, then answer Yes or No separately for each category.</p>'+
    '<p>For each Yes, use the frame slider to find an example and drag a tight box around it. Draw more boxes for additional examples; you can use different frames.</p>'+
    '<p>Rate how distracting that category was overall, from 1 (not at all) to 5 (extremely). Something can be present and not distracting.</p>'+
    '<p>Use a computer with a mouse or trackpad and a window at least 800 pixels wide.</p></section>'
  ]});
  function trial(clip,stage,index){return {
    type:jsPsychCaptionVideo, heading:stage==='practice'?'Practice '+(index+1)+' of 2':'Video '+(index+1)+' of '+selected.length,
    video_url:captionPool.mediaURL(clip.video_url,base),
    data:{trial_id:'caption_rating',exp_stage:stage,clip_id:clip.clip_id,source_id:clip.source_id,
      channel_id:clip.channel_id,manifest_duration:clip.duration,predicted_labels:clip.predicted_labels || null,
      is_check:stage==='test' && clip.role==='check',expected_presence:clip.role==='check'?clip.expected_presence:null,
      license:clip.license || null,attribution:clip.attribution || null},
    on_finish:function(data){
      if(clip.role==='check') data.check_passed=data.media_error ? null : captionPool.categories.every(function(c){return data.presence[c]===clip.expected_presence[c];});
    }
  };}
  practice.forEach(function(clip,index){
    timeline.push(trial(clip,'practice',index));
    timeline.push({type:jsPsychHtmlButtonResponse, choices:['Continue'],data:{trial_id:'practice_feedback'},stimulus:function(){
      var last=jsPsych.data.get().last(1).values()[0];
      return '<section class="caption-check"><h2>Practice feedback</h2><p>'+ (last.media_error?'Playback failed; this practice was not scored.':last.check_passed?'Your presence answers were correct.':'Review the categories before continuing.') +
        '</p><p>'+ (clip.expected_presence.captions?'This example has a subtitle near the bottom.':'This example has no speech captions.')+
        ' The technical timecode is other floating text. There is no logo or watermark.</p></section>';
    }});
  });
  timeline.push({type:jsPsychHtmlButtonResponse,choices:['Begin videos'],data:{trial_id:'test_intro'},
    stimulus:'<section class="caption-check"><h2>Practice complete</h2><p>The next '+selected.length+' videos use the same steps, without feedback. Please watch each one through.</p></section>'});
  selected.forEach(function(clip,index){
    timeline.push(trial(clip,'test',index));
    timeline.push({type:jsPsychCallFunction,func:function(){if(typeof window.dataSync==='function')window.dataSync();}});
  });
  timeline.push({type:jsPsychHtmlButtonResponse,choices:['Continue'],data:{trial_id:'credits'},
    stimulus:'<section class="caption-check"><h2>Video credits</h2><div class="video-credits"><ul>'+selected.concat(practice).map(function(c){
      return '<li><strong>'+captionCheck.escape(c.clip_id)+'</strong>: '+captionCheck.escape(c.attribution || 'Externally hosted research clip')+'</li>';
    }).join('')+'</ul></div></section>'});
  timeline.push({type:jsPsychHtmlButtonResponse,choices:['Finish'],data:{trial_id:'end'},
    stimulus:'<section class="caption-check"><h2>Thank you</h2><p>Click Finish to submit your responses, then follow the deployment page’s instructions.</p></section>'});
  return timeline;
}

// Loading is a real trial: deploy calls init synchronously before jsPsych.run.
var jsPsychCaptionLoad=(function(){
  class Load {
    constructor(instance){this.jsPsych=instance;}
    trial(display){
      var instance=this.jsPsych;
      display.innerHTML='<section class="caption-check"><p role="status">Loading video lists…</p><button hidden>Retry</button></section>';
      async function load(){
        var message=display.querySelector('p'), retry=display.querySelector('button'); retry.hidden=true;
        if(!captionCheck.desktop()){
          message.textContent='Please use a desktop or laptop with a mouse or trackpad and widen the window to at least 800 pixels.';
          retry.hidden=false; return;
        }
        message.textContent='Loading video lists…';
        try {
          var urls=[captionCheckSettings.manifest,captionCheckSettings.lists].map(function(p){return new URL(p,captionCheckAssetBase).href;});
          var files=await Promise.all(urls.map(async function(url){var response=await fetch(url,{cache:'no-cache'}); if(!response.ok)throw new Error('Could not load '+url); return response.json();}));
          var pool=captionPool.validatePool(files[0],urls[0]);
          var lists=captionPool.validateLists(pool,files[1]);
          instance.addNodeToEndOfTimeline({timeline:captionCheckTimeline(pool,lists,new URLSearchParams(window.location.search))});
          instance.finishTrial({trial_id:'pool_loaded'});
        } catch(error){message.textContent='The video lists could not load. Please retry. '+error.message; retry.hidden=false;}
      }
      display.querySelector('button').onclick=load; load();
    }
  }
  Load.info={name:'caption-load',parameters:{}}; return Load;
})();
function caption_check_init(){caption_check_experiment.length=0;caption_check_experiment.push({type:jsPsychCaptionLoad});}
