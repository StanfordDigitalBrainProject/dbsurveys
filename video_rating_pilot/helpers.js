var videoRatingPilot = {
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
  desktop: function () {return window.innerWidth >= 1280 && window.innerHeight >= 720 && window.matchMedia('(any-pointer: fine)').matches;}
};
