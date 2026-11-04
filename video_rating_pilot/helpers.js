var videoRatingPilot = {
  minimumWindow: {width:1000, height:520},
  frameWidth: function (viewportWidth, viewportHeight) {
    var width=Math.min(660, viewportWidth-520, (viewportHeight-220)*16/9);
    return Math.max(480, Math.floor(width/16)*16);
  },
  rectangle: function (start, end) {
    return {x:Math.min(start.x,end.x), y:Math.min(start.y,end.y),
      width:Math.abs(end.x-start.x), height:Math.abs(end.y-start.y)};
  },
  escape: function (value) {
    return String(value || '').replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  },
  pictureRect: function (width, height, frameWidth, frameHeight) {
    var scale=Math.min(frameWidth/width, frameHeight/height);
    var pictureWidth=width*scale, pictureHeight=height*scale;
    return {x:(frameWidth-pictureWidth)/2,y:(frameHeight-pictureHeight)/2,width:pictureWidth,height:pictureHeight};
  },
  desktop: function () {
    var minimum=videoRatingPilot.minimumWindow;
    return window.innerWidth >= minimum.width && window.innerHeight >= minimum.height && window.matchMedia('(any-pointer: fine)').matches;
  }
};
