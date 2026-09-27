/* ---------------------------------------------------------------
   GALLERY PAGE  -  the downward spiral of yearbook photos.

   To add photos: put the image in the gallery/ folder and add a
   line to one of the lists below. Superlative-style photos get a
   title and names; candids need only src, w and h (pixel size).
--------------------------------------------------------------- */
(() => {
const alive = true;
const on = (t, ev, fn, opt) => t.addEventListener(ev, fn, opt);
// how far down the page the spiral's scroll area starts
const scrollStart = () => document.getElementById("scroller").offsetTop;

const SETS = {
  "senior-favorites": {
    name: "Senior Favorites",
    photos: [
      {title:"Most Athletic", names:["Rudy Soriano","Madeline Martinez"], src:"gallery/senior-favorites/most-athletic.jpg", w:1100, h:1009},
      {title:"Most Unique", names:["Phillip Padilla","Rebecca Burkett"], src:"gallery/senior-favorites/most-unique.jpg", w:1100, h:993},
      {title:"Most Spirited", names:["Anthony Castro","Maria Juana Camacho"], src:"gallery/senior-favorites/most-spirited.jpg", w:1100, h:1013},
      {title:"Most Likely To Succeed", names:["Deidre Whitmore","Tony Yang"], src:"gallery/senior-favorites/most-likely-to-succeed.jpg", w:1100, h:994},
      {title:"Most Outspoken", names:["Brittany Lindo","Alex Cassadas"], src:"gallery/senior-favorites/most-outspoken.jpg", w:1100, h:993},
      {title:"Best Dressed", names:["Melissa Miranda","Rocky Phommasene"], src:"gallery/senior-favorites/best-dressed.jpg", w:1100, h:1012},
      {title:"Best Friends", names:["Margarete Krick","Tara Burgin"], src:"gallery/senior-favorites/best-friends.jpg", w:1100, h:993},
      {title:"Most Changed", names:["D.J. Malone","Courtney Taylor"], src:"gallery/senior-favorites/most-changed.jpg", w:1100, h:1010},
      {title:"Most Intriguing Features", names:["Jesse Diaz","Patricia Reyes"], src:"gallery/senior-favorites/most-intriguing-features.jpg", w:1100, h:1009},
      {title:"Most Likely To Become Famous", names:["Ebony Brown","Jamahl Williams"], src:"gallery/senior-favorites/most-likely-to-become-famous.jpg", w:1100, h:994},
      {title:"Class Clown", names:["Steven Horsman"], src:"gallery/senior-favorites/class-clown.jpg", w:1100, h:1004},
      {title:"Best All Around", names:["Ashley Hernandez","Richard Soriano"], src:"gallery/senior-favorites/best-all-around.jpg", w:1100, h:993}
    ]
  },
  "everyday-life": {
    name: "Everyday Life at BHS 2006",
    photos: [
      {src:"gallery/everyday-life/everyday-01.jpg", w:1083, h:1082},
      {src:"gallery/everyday-life/everyday-02.jpg", w:1100, h:498},
      {src:"gallery/everyday-life/everyday-03.jpg", w:961, h:1084},
      {src:"gallery/everyday-life/everyday-04.jpg", w:822, h:1100},
      {src:"gallery/everyday-life/everyday-05.jpg", w:1100, h:859},
      {src:"gallery/everyday-life/everyday-06.jpg", w:898, h:1100},
      {src:"gallery/everyday-life/everyday-07.jpg", w:1086, h:1041},
      {src:"gallery/everyday-life/everyday-08.jpg", w:1100, h:962},
      {src:"gallery/everyday-life/everyday-09.jpg", w:1087, h:1080},
      {src:"gallery/everyday-life/everyday-10.jpg", w:1100, h:501},
      {src:"gallery/everyday-life/everyday-11.jpg", w:1080, h:1082},
      {src:"gallery/everyday-life/everyday-12.jpg", w:1100, h:810},
      {src:"gallery/everyday-life/everyday-13.jpg", w:828, h:1100},
      {src:"gallery/everyday-life/everyday-14.jpg", w:974, h:1100},
      {src:"gallery/everyday-life/everyday-15.jpg", w:1085, h:1028},
      {src:"gallery/everyday-life/everyday-16.jpg", w:1100, h:962}
    ]
  }
};

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let target = 0, pos = 0, active = -1;
let photos = [], N = 0, cards = [], railBtns = [];
const helix = document.getElementById("helix");
const scroller = document.getElementById("scroller");
const rail = document.getElementById("rail");
const joinNames = n => n.length > 1 ? n.slice(0,-1).join(", ") + " and " + n[n.length-1] : n[0];

// geometry
const STEP_ANGLE = 38;         // degrees between photos around the spiral
const DIR = -1;                // photos rise from bottom right to top left
let R, DROP, CW;
function measure() {
  const w = innerWidth, h = innerHeight;
  CW = Math.round(Math.min(w * 0.62, h * 0.46, 440));
  R = Math.round(Math.min(w * 0.52, 620));
  DROP = Math.round(CW * 0.62);   // vertical fall per photo
  helix.style.setProperty("--cw", CW + "px");
  // one screen of scroll per photo, plus the stage itself
  scroller.style.height = (innerHeight * (N * 0.75) + innerHeight) + "px";
  sizeCards();
}
// each photo keeps its own shape at roughly the same visual size
function sizeCards() {
  const area = CW * CW * 0.92;
  cards.forEach(el => {
    const r = el._ratio;
    let w = Math.min(CW * 1.45, Math.sqrt(area * r)), h = w / r;
    if (h > CW * 1.15) { h = CW * 1.15; w = h * r; }
    el.style.width = Math.round(w) + "px";
    el.style.marginLeft = Math.round(-w / 2) + "px";
    el.style.marginTop = Math.round(-h / 2) + "px";
  });
}

const photoLabel = p => p.title ? `${p.title}: ${joinNames(p.names)}` : "Candid photo from the 2006 yearbook";

// build cards + rail for one set
function build() {
  photos = Object.values(SETS).flatMap(set => set.photos); N = photos.length;
  helix.textContent = ""; rail.textContent = "";
  cards = photos.map((p, i) => {
    const el = document.createElement("div");
    el.className = "g-card";
    el._ratio = p.w / p.h;
    el.innerHTML = `<div class="frame"><div class="pic" style="aspect-ratio:${p.w} / ${p.h}">` +
      `<img class="sharp" src="${p.src}" alt="${photoLabel(p)}" decoding="async">` +
      `<img class="soft" src="${p.src}" alt="" aria-hidden="true" decoding="async">` +
      `<span class="shade"></span></div></div>`;
    el._soft = el.querySelector(".soft"); el._shade = el.querySelector(".shade");
    el.addEventListener("click", () => { if (Math.abs(i - pos) < 0.5) openLightbox(i); else goTo(i); });
    helix.appendChild(el);
    const b = document.createElement("button");
    b.type = "button"; b.id = `rail-${i}`;
    b.setAttribute("aria-label", p.title ? `${p.title}, ${joinNames(p.names)}` : "Candid photo");
    b.innerHTML = "<i></i>";
    b.addEventListener("click", () => goTo(i));
    rail.appendChild(b);
    return el;
  });
  railBtns = [...rail.children];
  active = -1;
  measure();
  scrollTo({ top: 0, behavior: "auto" });
  target = 0; pos = 0;
}

// scroll -> position along the spiral (0..N-1), smoothed

function scrollToPos() {
  const max = scroller.offsetHeight - innerHeight;
  const t = max > 0 ? Math.min(1, Math.max(0, (scrollY - scrollStart()) / max)) : 0;
  target = t * (N - 1);
}
function goTo(i) {
  const max = scroller.offsetHeight - innerHeight;
  scrollTo({ top: scrollStart() + (i / (N - 1)) * max, behavior: reduce ? "auto" : "smooth" });
}

const cap = document.getElementById("caption");
function setCaption(i) {
  const p = photos[i];
  cap.classList.add("fading");
  setTimeout(() => {
    const title = document.getElementById("cap-title");
    title.textContent = p.title || "";
    title.hidden = !p.title;
    const names = document.getElementById("cap-names");
    names.textContent = p.names && p.names.length ? joinNames(p.names) : "";
    names.hidden = !names.textContent;
    cap.classList.remove("fading");
  }, reduce ? 0 : 180);
}

// smooth 0 -> 1 between a and b
const ramp = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
let lastT = performance.now();
function render(ts) {
  ts = ts || performance.now();
  const dt = Math.min(0.05, (ts - lastT) / 1000); lastT = ts;
  // frame-rate independent easing: same glide at 60Hz or 120Hz
  pos += (target - pos) * (reduce ? 1 : 1 - Math.exp(-dt * 7));
  if (Math.abs(target - pos) < 0.0002) pos = target;
  // rotate + lift the whole helix so the current photo sits front and center
  helix.style.transform =
    `translate3d(0, ${(-pos * DROP).toFixed(2)}px, ${-R}px) rotateY(${(DIR * pos * STEP_ANGLE).toFixed(3)}deg)`;
  cards.forEach((el, i) => {
    const d = i - pos;                 // distance from focus, in photos
    const ad = Math.abs(d);
    // 0 while clear, rising to 1 as it leaves focus. Clear zone = within 0.45 of center,
    // fully soft by 1.25 away, so each photo stays sharp through more of its entry and exit.
    const out = ramp(ad, 0.45, 1.25);
    const focus = 1 - out;
    const angle = -DIR * i * STEP_ANGLE;
    const y = i * DROP;
    const scale = 0.8 + 0.2 * (1 - ramp(ad, 0.3, 1.4));
    el.style.transform =
      `rotateY(${angle}deg) translate3d(0, ${y}px, ${R}px) scale(${scale.toFixed(4)})`;
    // opacity strengthens as you approach, fades as you pass
    const op = ad > 3.2 ? 0 : Math.max(0.06, 1 - 0.94 * ramp(ad, 0.6, 3.2));
    el.style.opacity = op.toFixed(3);
    el.style.visibility = ad > 3.3 ? "hidden" : "visible";
    if (!el._soft) { el._soft = el.querySelector(".soft"); el._shade = el.querySelector(".shade"); }
    // out of focus -> in focus by cross-fading the pre-blurred copy
    el._soft.style.opacity = reduce ? "0" : out.toFixed(3);
    el._shade.style.opacity = (0.45 * out).toFixed(3);
    el.style.pointerEvents = ad < 1.6 ? "auto" : "none";
    el.style.zIndex = String(100 - Math.round(ad * 10));
  });
  const now = Math.round(pos);
  if (now !== active) {
    if (active >= 0) { cards[active].classList.remove("is-active"); railBtns[active].removeAttribute("aria-current"); }
    active = now;
    cards[active].classList.add("is-active");
    railBtns[active].setAttribute("aria-current", "true");
    setCaption(active);
  }
  focusStrength = 1 - ramp(Math.abs(pos - now), 0.3, 0.5);
  if (alive) requestAnimationFrame(render);
}

// ---------- particles ----------
const cvs = document.getElementById("motes");
const ctx = cvs.getContext("2d");
let W, H, DPR, motes = [], mouse = { x: -9999, y: -9999 }, focusStrength = 1, lastPos = 0;
function sizeCanvas() {
  DPR = Math.min(1.5, devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  cvs.width = W * DPR; cvs.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const count = Math.round(Math.min(170, (W * H) / 8000));
  motes = Array.from({ length: count }, () => spawn(true));
}
function spawn(anywhere) {
  return {
    x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10,
    vx: (Math.random() - 0.5) * 0.15, vy: -(0.08 + Math.random() * 0.25),
    r: 0.6 + Math.random() * 1.8, tw: Math.random() * Math.PI * 2,
    green: Math.random() < 0.18
  };
}
on(window, "pointermove", e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
on(window, "pointerleave", () => { mouse.x = mouse.y = -9999; });

function drawMotes() {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.44;
  const halo = CW * 0.75;
  const scrollVel = (pos - lastPos); lastPos = pos;
  for (const m of motes) {
    // drift upward like dust in a studio light; scrolling pushes them
    m.x += m.vx; m.y += m.vy - Math.max(-6, Math.min(6, scrollVel * 30));
    m.tw += 0.03;
    // mouse repel
    const dx = m.x - mouse.x, dy = m.y - mouse.y, dm = Math.hypot(dx, dy);
    if (dm < 120 && dm > 0.1) { const f = (120 - dm) / 120 * 1.6; m.x += dx / dm * f; m.y += dy / dm * f; }
    if (m.y < -10) Object.assign(m, spawn(false));
    if (m.y > H + 20) { m.y = -5; }
    if (m.x < -10) m.x = W + 10; if (m.x > W + 10) m.x = -10;
    // brighter near the focused photo, and stronger when a photo is fully in focus
    const dc = Math.hypot(m.x - cx, m.y - cy);
    const near = Math.max(0, 1 - dc / (halo * 1.4));
    const a = (0.12 + 0.18 * (0.5 + 0.5 * Math.sin(m.tw))) + near * 0.75 * focusStrength;
    const r = m.r * (1 + near * 0.9 * focusStrength);
    ctx.beginPath();
    ctx.fillStyle = m.green ? `rgba(90,170,120,${a * 0.8})` : `rgba(255,214,102,${a})`;
    ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // soft glow ring behind the focused photo
  const g = ctx.createRadialGradient(cx, cy, halo * 0.2, cx, cy, halo * 1.3);
  g.addColorStop(0, `rgba(245,183,0,${0.09 * focusStrength})`);
  g.addColorStop(1, "rgba(245,183,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (!reduce && alive) requestAnimationFrame(drawMotes);
}

// ---------- lightbox ----------
const lb = document.getElementById("lightbox");
function openLightbox(i) {
  const p = photos[i];
  document.getElementById("lb-img").src = p.src;
  document.getElementById("lb-img").alt = photoLabel(p);
  const lbTitle = document.getElementById("lb-title"), lbNames = document.getElementById("lb-names");
  lbTitle.textContent = p.title || ""; lbTitle.hidden = !p.title;
  lbNames.textContent = p.title ? joinNames(p.names) : ""; lbNames.hidden = !p.title;
  lastFocus = document.activeElement;
  lb.hidden = false; document.body.style.overflow = "hidden";
  document.getElementById("lb-close").focus();
}
let lastFocus = null;
function closeLightbox() {
  lb.hidden = true; document.body.style.overflow = "";
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
document.getElementById("lb-close").addEventListener("click", closeLightbox);
lb.addEventListener("click", e => { if (e.target === lb) closeLightbox(); });

on(window, "keydown", e => {
  if (!lb.hidden) { if (e.key === "Escape") closeLightbox(); return; }
  if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); goTo(Math.min(N - 1, active + 1)); }
  if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); goTo(Math.max(0, active - 1)); }
  if (e.key === "Enter" && document.activeElement === document.body) openLightbox(active);
});

const hint = document.getElementById("hint");
on(window, "scroll", () => { scrollToPos(); if (scrollY > 40) hint.classList.add("gone"); }, { passive: true });
on(window, "resize", () => { measure(); sizeCanvas(); scrollToPos(); if (reduce) drawMotes(); });

build();
sizeCanvas(); scrollToPos(); pos = target;
render(); drawMotes();

})();
