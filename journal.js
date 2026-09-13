(function () {
  var KEY = 'bhs06-memories';
  var form = document.getElementById('entry-form');
  var list = document.getElementById('entries');
  var statusEl = document.getElementById('post-status');
  var noteEl = document.getElementById('storage-note');
  var fileEl = document.getElementById('photo');
  var attachBtn = document.getElementById('attach-btn');
  var attachName = document.getElementById('attach-name');
  var attachClear = document.getElementById('attach-clear');
  var preview = document.getElementById('attach-preview');
  var URL_SET = (typeof MEMORIES_URL !== 'undefined') && MEMORIES_URL;
  var pendingPhoto = '';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function localLoad() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function localSave(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
  }

  /* shrink an image in the browser so uploads stay small */
  function shrink(file, max, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('read failed')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('decode failed')); };
        img.onload = function () {
          var w = img.width, h = img.height;
          var scale = Math.min(1, max / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width = Math.round(w * scale);
          c.height = Math.round(h * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function clearPhoto() {
    pendingPhoto = '';
    if (fileEl) fileEl.value = '';
    if (attachName) attachName.textContent = '';
    if (attachClear) attachClear.hidden = true;
    if (preview) { preview.hidden = true; preview.removeAttribute('src'); }
  }

  if (attachBtn && fileEl) {
    attachBtn.addEventListener('click', function () { fileEl.click(); });
    fileEl.addEventListener('change', function () {
      var f = fileEl.files && fileEl.files[0];
      if (!f) { clearPhoto(); return; }
      attachName.textContent = 'Preparing photo...';
      shrink(f, 1400, 0.82).then(function (dataUrl) {
        pendingPhoto = dataUrl;
        attachName.textContent = f.name.length > 28 ? f.name.slice(0, 25) + '...' : f.name;
        attachClear.hidden = false;
        preview.src = dataUrl;
        preview.hidden = false;
      }).catch(function () {
        attachName.textContent = 'That file could not be read.';
        pendingPhoto = '';
      });
    });
  }
  if (attachClear) attachClear.addEventListener('click', clearPhoto);

  function paint(items) {
    if (!items.length) {
      list.innerHTML = '<p class="note" style="text-align:center">No memories posted yet. Be the first.</p>';
      return;
    }
    list.innerHTML = items.map(function (e, i) {
      var pic = e.photo
        ? '<img class="entry-pic" src="' + esc(e.photo) + '" alt="" loading="lazy">'
        : '';
      return '<article class="entry" style="animation-delay:' + (i * 40) + 'ms">' +
        '<div class="who">' + esc(e.author) + '<span class="when">' + esc(e.when) + '</span></div>' +
        '<p>' + esc(e.body) + '</p>' + pic + '</article>';
    }).join('');
  }

  function load() {
    if (!URL_SET) { paint(localLoad()); return; }
    list.innerHTML = '<p class="note" style="text-align:center">Loading memories...</p>';
    fetch(MEMORIES_URL, { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok) paint(d.entries || []);
        else throw new Error('bad response');
      })
      .catch(function () {
        list.innerHTML = '<p class="note" style="text-align:center">' +
          'Could not load memories right now. Please refresh in a moment.</p>';
      });
  }

  if (noteEl) {
    noteEl.textContent = URL_SET
      ? 'Your memory and photo will be posted for the whole class to see.'
      : 'Not connected yet - entries are only saved in your own browser for now.';
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var bodyEl = document.getElementById('body');
    var author = document.getElementById('author').value.trim();
    var body = bodyEl.value.trim();
    if (!author || !body) return;

    var btn = form.querySelector('button[type="submit"]');

    if (!URL_SET) {
      var items = localLoad();
      items.unshift({
        author: author, body: body, photo: pendingPhoto,
        when: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      });
      localSave(items);
      bodyEl.value = '';
      clearPhoto();
      paint(items);
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Posting...';
    if (statusEl) statusEl.textContent = pendingPhoto ? 'Uploading photo...' : '';

    var data = new URLSearchParams();
    data.append('author', author);
    data.append('body', body);
    if (pendingPhoto) data.append('photo', pendingPhoto);

    fetch(MEMORIES_URL, { method: 'POST', body: data })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) throw new Error('rejected');
        bodyEl.value = '';
        clearPhoto();
        if (statusEl) statusEl.textContent = 'Posted. Thanks for sharing!';
        load();
      })
      .catch(function () {
        if (statusEl) statusEl.textContent = 'Something went wrong - please try again.';
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = 'Post memory';
      });
  });

  load();
})();
