var captionCheck = {
  rectangle: function (start, end) {
    return {x:Math.min(start.x,end.x), y:Math.min(start.y,end.y),
      width:Math.abs(end.x-start.x), height:Math.abs(end.y-start.y)};
  },
  escape: function (value) {
    return String(value || '').replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  },
  desktop: function () {return window.innerWidth >= 800 && window.matchMedia('(any-pointer: fine)').matches;}
};
