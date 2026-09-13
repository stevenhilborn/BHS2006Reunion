(function () {
  var cardsEl  = document.getElementById('cards');
  var searchEl = document.getElementById('search');
  var emptyEl  = document.getElementById('empty');
  var countEl  = document.getElementById('count');
  if (countEl) countEl.textContent = CLASSMATES.length;

  var BACKEND = (typeof MEMORIES_URL !== 'undefined') && MEMORIES_URL ? MEMORIES_URL : '';
  var visible = CLASSMATES.slice();

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -40px 0px' });

  /* ---------- current photos ----------
     Shared copies come from the backend sheet and are seen by everyone.
     Anything saved before the backend existed stays readable locally. */
  var NOWKEY = 'bhs06-nowpics';
  var SHARED = {};

  function localAll() {
    try { return JSON.parse(localStorage.getItem(NOWKEY)) || {}; } catch (e) { return {}; }
  }
  function localSet(file, dataUrl) {
    var m = localAll(); m[file] = dataUrl;
    try { localStorage.setItem(NOWKEY, JSON.stringify(m)); return true; }
    catch (e) { return false; }
  }
  function nowSrc(file) { return SHARED[file] || localAll()[file] || ''; }

  function markCardHasNow(card) {
    var shot = card.querySelector('.shot');
    if (shot && !shot.querySelector('.now-badge')) {
      var b = document.createElement('span');
      b.className = 'now-badge';
      b.textContent = 'Now';
      shot.appendChild(b);
    }
    var btn = card.querySelector('.upload');
    if (btn) {
      btn.classList.add('done');
      btn.textContent = 'Current photo added \u2713';
    }
  }

  function loadShared() {
    if (!BACKEND) return;
    fetch(BACKEND + (BACKEND.indexOf('?') > -1 ? '&' : '?') + 'type=now')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok || !d.photos) return;
        SHARED = d.photos;
        Array.prototype.forEach.call(cardsEl.children, function (card) {
          if (SHARED[card.dataset.file]) markCardHasNow(card);
        });
      })
      .catch(function () { /* offline or not deployed yet - portraits still work */ });
  }

  /* shrink in the browser so uploads stay small */
  function shrink(file, cb, fail) {
    var reader = new FileReader();
    reader.onerror = function () { if (fail) fail(); };
    reader.onload = function (ev) {
      var im = new Image();
      im.onerror = function () { if (fail) fail(); };
      im.onload = function () {
        var max = 1200, sc = Math.min(1, max / Math.max(im.width, im.height));
        var cv = document.createElement('canvas');
        cv.width = Math.round(im.width * sc);
        cv.height = Math.round(im.height * sc);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        cb(cv.toDataURL('image/jpeg', 0.82));
      };
      im.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function pickPhoto(p, btn) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.addEventListener('change', function () {
      if (!inp.files || !inp.files[0]) return;
      var original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Preparing\u2026';

      shrink(inp.files[0], function (dataUrl) {
        function done(shared) {
          btn.disabled = false;
          btn.textContent = shared ? 'Photo added \u2713' : 'Saved on this device \u2713';
          btn.classList.add('done');
          markCardHasNow(btn.closest('.card'));
        }

        if (!BACKEND) {
          localSet(p.file, dataUrl);
          done(false);
          return;
        }

        btn.textContent = 'Uploading\u2026';
        var body = new URLSearchParams();
        body.append('type', 'now');
        body.append('classmate', p.name);
        body.append('file', p.file);
        body.append('photo', dataUrl);

        fetch(BACKEND, { method: 'POST', body: body })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (!d || !d.ok) throw new Error('rejected');
            SHARED[p.file] = d.url || dataUrl;
            done(true);
          })
          .catch(function () {
            localSet(p.file, dataUrl);
            done(false);
          });
      }, function () {
        btn.disabled = false;
        btn.textContent = original;
        alert('That image could not be read. Try a different file.');
      });
    });
    inp.click();
  }

  /* ---------- lightbox ---------- */
  var box     = document.getElementById('lightbox');
  var lbImg   = document.getElementById('lb-img');
  var lbCap   = document.getElementById('lb-cap');
  var nowEl   = document.getElementById('lb-now');
  var nowWrap = document.getElementById('lb-now-wrap');
  var lbIdx   = 0;
  var lastFocus = null;

  function lbShow(i) {
    if (!visible.length) return;
    lbIdx = (i + visible.length) % visible.length;
    var p = visible[lbIdx];
    lbImg.src = 'photos/' + p.file;
    lbImg.alt = p.name + ', 2006 yearbook portrait';
    lbCap.textContent = p.name;
    var src = nowSrc(p.file);
    if (src) {
      nowEl.src = src;
      nowEl.alt = p.name + ', current photo';
      nowWrap.hidden = false;
    } else {
      nowEl.removeAttribute('src');
      nowWrap.hidden = true;
    }
  }
  function lbOpen(i) {
    lastFocus = document.activeElement;
    lbShow(i);
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('lb-close').focus();
  }
  function lbClose() {
    box.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.getElementById('lb-close').addEventListener('click', lbClose);
  document.getElementById('lb-prev').addEventListener('click', function (e) {
    e.stopPropagation(); lbShow(lbIdx - 1);
  });
  document.getElementById('lb-next').addEventListener('click', function (e) {
    e.stopPropagation(); lbShow(lbIdx + 1);
  });
  box.addEventListener('click', function (e) { if (e.target === box) lbClose(); });
  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') lbClose();
    else if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
    else if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
  });

  /* swipe on touch screens */
  var tx = 0, ty = 0;
  box.addEventListener('touchstart', function (e) {
    tx = e.changedTouches[0].clientX; ty = e.changedTouches[0].clientY;
  }, { passive: true });
  box.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - tx;
    var dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) lbShow(lbIdx + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ---------- cards ---------- */
  function addPill(wrap, href, label) {
    var a = document.createElement('a');
    a.className = 'pill';
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = label;
    wrap.appendChild(a);
  }

  function buildCard(p, i) {
    var el = document.createElement('article');
    el.className = 'card';
    el.dataset.file = p.file;
    el.style.transitionDelay = Math.min(i, 12) * 22 + 'ms';

    var shot = document.createElement('button');
    shot.type = 'button';
    shot.className = 'shot';
    shot.setAttribute('aria-label', 'View ' + p.name + ' larger');
    var img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = 'photos/' + p.file;
    img.alt = p.name + ', 2006 yearbook portrait';
    shot.appendChild(img);
    shot.addEventListener('click', function () { lbOpen(visible.indexOf(p)); });

    var meta = document.createElement('div');
    meta.className = 'meta';
    var h3 = document.createElement('h3');
    if (p.facebook || p.instagram) {
      var a = document.createElement('a');
      a.href = p.facebook || p.instagram;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = p.name;
      h3.appendChild(a);
    } else {
      h3.textContent = p.name;
    }
    var soc = document.createElement('div');
    soc.className = 'socials';
    if (p.facebook)  addPill(soc, p.facebook, 'Facebook');
    if (p.instagram) addPill(soc, p.instagram, 'Instagram');
    if (!p.facebook && !p.instagram) {
      var none = document.createElement('span');
      none.className = 'none';
      none.textContent = 'No link yet';
      soc.appendChild(none);
    }
    meta.appendChild(h3);
    meta.appendChild(soc);

    if (typeof UPLOADS_ENABLED === 'undefined' || UPLOADS_ENABLED) {
      var btn = document.createElement('button');
      btn.className = 'upload';
      btn.type = 'button';
      btn.textContent = 'Add a current photo';
      btn.addEventListener('click', function () { pickPhoto(p, btn); });
      meta.appendChild(btn);
    }

    el.appendChild(shot);
    el.appendChild(meta);
    if (nowSrc(p.file)) markCardHasNow(el);
    return el;
  }

  function render(list) {
    visible = list;
    cardsEl.textContent = '';
    if (emptyEl) emptyEl.hidden = list.length > 0;
    var frag = document.createDocumentFragment();
    var built = [];
    list.forEach(function (p, i) {
      var el = buildCard(p, i);
      frag.appendChild(el);
      built.push(el);
    });
    cardsEl.appendChild(frag);
    built.forEach(function (el) { io.observe(el); });
  }

  render(CLASSMATES);
  loadShared();

  /* ---------- search ---------- */
  function norm(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  var t;
  if (searchEl) searchEl.addEventListener('input', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      var q = norm(searchEl.value.trim());
      if (!q) { render(CLASSMATES); return; }
      var terms = q.split(/\s+/);
      render(CLASSMATES.filter(function (p) {
        var n = norm(p.name);
        return terms.every(function (term) { return n.indexOf(term) !== -1; });
      }));
    }, 90);
  });

  /* ---------- stat counters ---------- */
  var nums = document.querySelectorAll('.stat .num');
  if (nums.length) {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var seen = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        seen.unobserve(e.target);
        var el = e.target, to = +el.dataset.to;
        if (reduce) { el.textContent = to; return; }
        var start = null, dur = 1100;
        function step(ts) {
          if (!start) start = ts;
          var pr = Math.min((ts - start) / dur, 1);
          el.textContent = Math.round(to * (1 - Math.pow(1 - pr, 3)));
          if (pr < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    nums.forEach(function (n) { seen.observe(n); });
  }
})();
