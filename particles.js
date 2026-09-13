(function(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var c = document.getElementById('fx');
  if (!c) return;
  var ctx = c.getContext('2d'), dots = [], w, h, dpr;
  var mouse = { x: -9999, y: -9999 };

  function size(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var target = Math.min(110, Math.round(w * h / 15000));
    dots = [];
    for (var i = 0; i < target; i++){
      dots.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .26, vy: (Math.random() - .5) * .26,
        r: Math.random() * 1.7 + .7
      });
    }
  }

  function frame(){
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < dots.length; i++){
      var p = dots[i];
      var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx*dx + dy*dy;
      if (d2 < 19000 && d2 > 0.01){
        var f = (1 - d2 / 19000) * 0.9, d = Math.sqrt(d2);
        p.vx += (dx/d) * f * 0.4; p.vy += (dy/d) * f * 0.4;
      }
      p.vx *= 0.985; p.vy *= 0.985;
      if (Math.abs(p.vx) < .05) p.vx += (Math.random() - .5) * .02;
      if (Math.abs(p.vy) < .05) p.vy += (Math.random() - .5) * .02;
      p.x += p.vx; p.y += p.vy;
      if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;

      for (var j = i + 1; j < dots.length; j++){
        var q = dots[j], ax = p.x - q.x, ay = p.y - q.y, a2 = ax*ax + ay*ay;
        if (a2 < 15000){
          ctx.strokeStyle = 'rgba(245,183,0,' + (0.14 * (1 - a2/15000)).toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(255,214,102,.62)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', size);
  window.addEventListener('mousemove', function(e){ mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseleave', function(){ mouse.x = mouse.y = -9999; });

  size(); frame();
})();
