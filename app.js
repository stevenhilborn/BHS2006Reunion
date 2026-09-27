(function () {
  var cardsEl  = document.getElementById('cards');
  var searchEl = document.getElementById('search');
  var emptyEl  = document.getElementById('empty');
  var countEl  = document.getElementById('count');
  var npCardsEl = document.getElementById('np-cards');
  var npWrap    = document.getElementById('not-pictured');
  var NP = (typeof NOT_PICTURED !== 'undefined') ? NOT_PICTURED : [];
  NP.forEach(function (p) { p.nophoto = true; });
  var TOTAL = CLASSMATES.length + NP.length;
  if (countEl) countEl.textContent = TOTAL;
  var statEl = document.getElementById('stat-classmates');
  if (statEl) statEl.dataset.to = TOTAL;

  var BACKEND = (typeof MEMORIES_URL !== 'undefined') && MEMORIES_URL ? MEMORIES_URL : '';
  var visible = CLASSMATES.slice();
  var npVisible = NP.slice();

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      el.classList.add('in');
      io.unobserve(el);
      /* the stagger delay is only for the fade-in; clear it so hover reacts instantly */
      setTimeout(function () { el.style.transitionDelay = ''; }, 800);
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
    if (card.classList.contains('np') && shot) {
      var src = nowSrc(card.dataset.file);
      if (src) {
        var im = shot.querySelector('img');
        if (!im) { im = document.createElement('img'); im.decoding = 'async'; shot.appendChild(im); }
        im.src = src;
        im.alt = card.dataset.name + ', current photo';
        Array.prototype.forEach.call(shot.querySelectorAll('.initials, .soon'), function (x) { x.remove(); });
        shot.classList.remove('empty-shot');
        shot.disabled = false;
        shot.setAttribute('aria-label', 'View ' + card.dataset.name + ' larger');
      }
    }
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
        [cardsEl, npCardsEl].forEach(function (holder) {
          if (!holder) return;
          Array.prototype.forEach.call(holder.children, function (card) {
            if (SHARED[card.dataset.file]) markCardHasNow(card);
          });
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
        var cx = cv.getContext('2d');
        cx.fillStyle = '#fff';
        cx.fillRect(0, 0, cv.width, cv.height);
        cx.drawImage(im, 0, 0, cv.width, cv.height);
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
        function failed() {
          btn.disabled = false;
          btn.textContent = 'Could not save \u2013 try again';
        }

        if (!BACKEND) {
          if (localSet(p.file, dataUrl)) done(false); else failed();
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
            if (localSet(p.file, dataUrl)) done(false); else failed();
          });
      }, function () {
        btn.disabled = false;
        btn.textContent = 'That file could not be read';
        setTimeout(function () { btn.textContent = original; }, 3500);
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
  var lbList  = visible;
  var lbTag   = lbImg.parentNode.querySelector('.lb-tag');
  var lastFocus = null;

  function lbShow(i) {
    if (!lbList.length) return;
    lbIdx = (i + lbList.length) % lbList.length;
    var p = lbList[lbIdx];
    lbCap.textContent = p.name;
    var src = nowSrc(p.file);
    if (p.nophoto) {
      /* no yearbook portrait - show just the current photo */
      lbImg.src = src;
      lbImg.alt = p.name + ', current photo';
      if (lbTag) lbTag.textContent = 'Now';
      nowEl.removeAttribute('src');
      nowWrap.hidden = true;
      return;
    }
    if (lbTag) lbTag.textContent = '2006';
    lbImg.src = 'photos/' + p.file;
    lbImg.alt = p.name + ', 2006 yearbook portrait';
    if (src) {
      nowEl.src = src;
      nowEl.alt = p.name + ', current photo';
      nowWrap.hidden = false;
    } else {
      nowEl.removeAttribute('src');
      nowWrap.hidden = true;
    }
  }
  function lbOpen(list, p) {
    lbList = list;
    var i = list.indexOf(p);
    if (i < 0) return;
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

  /* first and last initial, skipping a nickname in quotes and middle initials */
  function initials(name) {
    var w = name.replace(/[\u201C"][^\u201D"]*[\u201D"]/g, '').split(/\s+/).filter(function (x) {
      return /^[A-Za-z]/.test(x) && !/^[A-Z]\.$/.test(x);
    });
    if (!w.length) return '';
    return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
  }

  function buildCard(p, i) {
    var el = document.createElement('article');
    el.className = p.nophoto ? 'card np' : 'card';
    el.dataset.file = p.file;
    el.dataset.name = p.name;
    el.style.transitionDelay = Math.min(i, 12) * 22 + 'ms';

    var shot = document.createElement('button');
    shot.type = 'button';
    shot.className = 'shot';
    shot.setAttribute('aria-label', 'View ' + p.name + ' larger');
    if (p.nophoto) {
      /* no yearbook portrait: initials until someone adds a current photo */
      shot.classList.add('empty-shot');
      shot.disabled = true;
      shot.setAttribute('aria-label', p.name + ', no photo yet');
      var ini = document.createElement('span');
      ini.className = 'initials';
      ini.setAttribute('aria-hidden', 'true');
      ini.textContent = initials(p.name);
      var soon = document.createElement('span');
      soon.className = 'soon';
      soon.textContent = 'Not pictured';
      shot.appendChild(ini);
      shot.appendChild(soon);
      shot.addEventListener('click', function () {
        lbOpen(npVisible.filter(function (q) { return nowSrc(q.file); }), p);
      });
    } else {
      var img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = 'photos/' + p.file;
      img.alt = p.name + ', 2006 yearbook portrait';
      shot.appendChild(img);
      shot.addEventListener('click', function () { lbOpen(visible, p); });
    }

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

  function fill(holder, list) {
    holder.textContent = '';
    var frag = document.createDocumentFragment();
    var built = [];
    list.forEach(function (p, i) {
      var el = buildCard(p, i);
      frag.appendChild(el);
      built.push(el);
    });
    holder.appendChild(frag);
    built.forEach(function (el) { io.observe(el); });
  }

  function render(list, npList) {
    visible = list;
    npVisible = npList;
    fill(cardsEl, list);
    if (npCardsEl) fill(npCardsEl, npList);
    if (npWrap) npWrap.hidden = npList.length === 0;
    if (emptyEl) emptyEl.hidden = list.length + npList.length > 0;
  }

  render(CLASSMATES, NP);
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
      if (!q) { render(CLASSMATES, NP); return; }
      var terms = q.split(/\s+/);
      function hit(p) {
        var n = norm(p.name).replace(/[\u201C\u201D"]/g, '');
        return terms.every(function (term) { return n.indexOf(term) !== -1; });
      }
      render(CLASSMATES.filter(hit), NP.filter(hit));
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
