/* ==========================================================================
   RubíTur · app.js
   JavaScript vanilla, sin dependencias.
   --------------------------------------------------------------------------
   Módulos
   1. Utilidades y configuración (número de WhatsApp aquí)
   2. Loader (velocímetro de carga)
   3. Header, menú móvil, navegación por puntos, barra de progreso
   4. Revelado al hacer scroll, titulares por palabra, contadores
   5. Hero: palabra rotatoria, partículas, parallax con mouse
   6. Motor de escenas con scroll suavizado (expandir imagen, camioneta que
      maneja, galería horizontal, tarjetas apiladas, línea de pasos)
   7. Mapa de rutas, paneles de ocasiones, FAQ, visor de fotos
   8. Formulario de cotización -> WhatsApp
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- 1. Utilidades ---------- */
  const WA_NUMBER = '522229284581'; // Cambiar aquí si el número del negocio cambia
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const waUrl = (msg) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  if (reduce) root.classList.add('reduce');

  const state = { y: window.scrollY, vh: window.innerHeight, vw: window.innerWidth };

  // Todos los botones con data-wa abren WhatsApp con un mensaje contextual
  $$('[data-wa]').forEach((a) => { a.href = waUrl(a.dataset.wa); });

  /* ---------- 2. Loader ---------- */
  function initLoader() {
    const loader = $('#loader');
    const finishPage = () => { root.classList.remove('is-loading'); root.classList.add('is-ready'); };
    if (!loader) { finishPage(); return Promise.resolve(); }

    const NS = 'http://www.w3.org/2000/svg';
    const ticksG = $('#gaugeTicks');
    const arc = $('#gaugeArc');
    const pct = $('#loaderPct');
    const msg = $('#loaderMsg');
    const TICKS = 60;
    const ticks = [];
    for (let i = 0; i < TICKS; i++) {
      const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
      const r1 = 86;
      const r2 = i % 5 === 0 ? 97 : 93;
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', (100 + Math.cos(a) * r1).toFixed(2));
      line.setAttribute('y1', (100 + Math.sin(a) * r1).toFixed(2));
      line.setAttribute('x2', (100 + Math.cos(a) * r2).toFixed(2));
      line.setAttribute('y2', (100 + Math.sin(a) * r2).toFixed(2));
      line.setAttribute('class', 'tick');
      ticksG.appendChild(line);
      ticks.push(line);
    }

    const steps = [[0, 'Calentando motores'], [0.3, 'Ajustando asientos'], [0.62, 'Trazando tu ruta'], [0.93, 'Listo para salir']];

    // Progreso real: fuentes + imagen principal + evento load
    const heroImg = $('.stage__van img');
    const imgReady = new Promise((res) => {
      if (!heroImg || heroImg.complete) return res();
      heroImg.addEventListener('load', res, { once: true });
      heroImg.addEventListener('error', res, { once: true });
    });
    const fontsReady = (document.fonts && document.fonts.ready) || Promise.resolve();
    const winLoad = new Promise((res) => {
      if (document.readyState === 'complete') res();
      else window.addEventListener('load', res, { once: true });
    });
    let real = 0;
    [imgReady, fontsReady, winLoad].forEach((p) => p.then(() => { real += 1 / 3; }));

    // Visitas repetidas en la misma sesión: loader corto
    let seen = false;
    try { seen = sessionStorage.getItem('rt_seen') === '1'; sessionStorage.setItem('rt_seen', '1'); } catch (_) { /* sin storage */ }
    const MIN = reduce ? 250 : (seen ? 1100 : 2400);
    const MAX = 7000;

    return new Promise((resolve) => {
      const t0 = performance.now();
      let shown = 0;
      let lastOn = -1;
      let lastMsg = '';
      let finished = false;

      const render = (v) => {
        arc.style.strokeDashoffset = (100 - v * 100).toFixed(2);
        pct.textContent = Math.round(v * 100);
        const on = Math.floor(v * TICKS);
        if (on !== lastOn) {
          for (let i = 0; i < TICKS; i++) ticks[i].classList.toggle('on', i < on);
          lastOn = on;
        }
        let m = steps[0][1];
        for (const [t, label] of steps) if (v >= t) m = label;
        if (m !== lastMsg) { msg.textContent = m; lastMsg = m; }
      };

      const finish = () => {
        render(1);
        loader.classList.add('is-done');
        setTimeout(finishPage, reduce ? 0 : 700);
        setTimeout(() => { loader.remove(); resolve(); }, reduce ? 50 : 2000);
      };

      const frame = (now) => {
        const el = now - t0;
        const eased = 1 - Math.pow(1 - clamp(el / MIN), 3);
        const cap = 0.12 + 0.88 * Math.min(1, real);
        shown += (Math.min(eased, cap) - shown) * 0.14;
        render(shown);
        if (!finished && ((shown > 0.994 && real > 0.99 && el >= MIN) || el > MAX)) {
          finished = true;
          finish();
          return;
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  /* ---------- 3. Header, menú, dotnav, progreso ---------- */
  const header = $('#siteHeader');
  const progressBar = $('#progress');
  const menuBtn = $('#menuBtn');
  const menu = $('#menu');
  const dotLinks = $$('#dotnav a');
  const dotTargets = dotLinks.map((a) => $('#' + a.dataset.target)).filter(Boolean);
  let activeDot = -1;

  function setMenu(open) {
    if (!menu || !menuBtn) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  function initMenu() {
    if (!menu || !menuBtn) return;
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  function updateChrome() {
    const y = state.y;
    header.classList.toggle('is-stuck', y > 24);
    const max = document.documentElement.scrollHeight - state.vh;
    progressBar.style.setProperty('--sp', max > 0 ? (y / max).toFixed(4) : 0);

    // sección activa en el dotnav: la última cuyo borde superior ya pasó el 45% del viewport
    let idx = 0;
    dotTargets.forEach((sec, i) => { if (sec.getBoundingClientRect().top <= state.vh * 0.45) idx = i; });
    if (idx !== activeDot) {
      activeDot = idx;
      dotLinks.forEach((a, i) => {
        a.classList.toggle('is-active', i === idx);
        if (i === idx) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
  }

  /* ---------- 4. Revelado, titulares, contadores ---------- */
  function initReveal() {
    $$('[data-split]').forEach((el) => {
      const text = el.textContent.trim();
      const words = text.split(/\s+/);
      el.setAttribute('aria-label', text);
      el.textContent = '';
      words.forEach((w, i) => {
        const wrap = document.createElement('span');
        wrap.className = 'w';
        wrap.setAttribute('aria-hidden', 'true');
        const inner = document.createElement('span');
        inner.style.setProperty('--wi', i);
        inner.textContent = w;
        wrap.appendChild(inner);
        el.appendChild(wrap);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    $$('[data-reveal], [data-split]').forEach((el) => io.observe(el));
  }

  function initCounters() {
    const els = $$('[data-count]').filter((el) => Number(el.dataset.to) >= 2);
    if (!els.length || reduce) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const el = e.target;
        const to = Number(el.dataset.to);
        const t0 = performance.now();
        const dur = 1500;
        const tick = (now) => {
          const t = clamp((now - t0) / dur);
          el.textContent = Math.round(to * (1 - Math.pow(1 - t, 4)));
          if (t < 1) requestAnimationFrame(tick);
        };
        el.textContent = '0';
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- 5. Hero ---------- */
  function initRotor() {
    const words = $$('.rotor__w');
    if (words.length < 2 || reduce) return;
    let i = 0;
    const next = () => {
      if (!document.hidden) {
        const cur = words[i];
        i = (i + 1) % words.length;
        cur.classList.remove('is-on');
        cur.classList.add('is-out');
        words[i].classList.remove('is-out');
        words[i].classList.add('is-on');
        setTimeout(() => cur.classList.remove('is-out'), 900);
      }
      setTimeout(next, 2600);
    };
    setTimeout(next, 3200);
  }

  const hero = $('#inicio');
  const heroFx = { tx: 0, ty: 0, cx: 0, cy: 0, active: true, layers: [], glow: null };

  function initHero() {
    heroFx.layers = $$('[data-depth]', hero).map((el) => ({ el, d: Number(el.dataset.depth) }));
    heroFx.glow = $('#heroGlow');

    // Visibilidad del hero para pausar trabajo
    new IntersectionObserver(([e]) => { heroFx.active = e.isIntersecting; poke(); }, { threshold: 0 }).observe(hero);

    if (fine && !reduce) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        heroFx.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        heroFx.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
        if (heroFx.glow) {
          heroFx.glow.style.setProperty('--gx', (e.clientX - r.left) + 'px');
          heroFx.glow.style.setProperty('--gy', (e.clientY - r.top) + 'px');
          heroFx.glow.classList.add('is-on');
        }
        poke();
      });
      hero.addEventListener('pointerleave', () => {
        heroFx.tx = 0; heroFx.ty = 0;
        if (heroFx.glow) heroFx.glow.classList.remove('is-on');
        poke();
      });
    }
  }

  function heroUpdate() {
    if (reduce) return false;
    heroFx.cx = lerp(heroFx.cx, heroFx.tx, 0.07);
    heroFx.cy = lerp(heroFx.cy, heroFx.ty, 0.07);
    const sy = clamp(state.y, 0, state.vh * 1.2);
    for (const { el, d } of heroFx.layers) {
      el.style.transform = `translate3d(${(-heroFx.cx * d * 34).toFixed(2)}px, ${(-heroFx.cy * d * 24 + sy * d * 0.22).toFixed(2)}px, 0)`;
    }
    return Math.abs(heroFx.cx - heroFx.tx) > 0.002 || Math.abs(heroFx.cy - heroFx.ty) > 0.002;
  }

  function initParticles() {
    const canvas = $('#particles');
    if (!canvas || reduce) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, parts = [], raf = 0, running = false;
    const mouse = { x: -9999, y: -9999 };
    const LINK = 128;

    const mk = () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.8 + 0.9, red: Math.random() < 0.45,
    });
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = hero.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp((w * h) / 17000, 22, 72));
      parts = Array.from({ length: n }, mk);
    };
    const step = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 22500) { const d = Math.sqrt(d2) || 1, f = (150 - d) / 150; p.vx += (dx / d) * f * 0.06; p.vy += (dy / d) * f * 0.06; }
        p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx + 0.04; p.y += p.vy;
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
      }
      for (let i = 0; i < parts.length; i++) {
        const a = parts[i];
        for (let j = i + 1; j < parts.length; j++) {
          const b = parts[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            const al = (1 - Math.sqrt(d2) / LINK) * 0.22;
            ctx.strokeStyle = (a.red || b.red) ? `rgba(172,20,32,${al})` : `rgba(15,15,18,${al * 0.7})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const p of parts) {
        ctx.fillStyle = p.red ? 'rgba(172,20,32,0.6)' : 'rgba(15,15,18,0.24)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(step);
    };
    const start = () => { if (!running) { running = true; raf = requestAnimationFrame(step); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    window.addEventListener('resize', () => { resize(); });
    if (fine) {
      hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
      hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    }
    new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop()), { threshold: 0 }).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  /* ---------- 6. Motor de escenas con scroll suavizado ---------- */
  const scenes = [];
  let rafId = 0;
  function poke() { if (!rafId) rafId = requestAnimationFrame(frame); }

  function frame() {
    rafId = 0;
    state.y = window.scrollY;
    let busy = false;
    for (const sc of scenes) if (sc.active && sc.update() === true) busy = true;
    if (heroFx.active && heroUpdate()) busy = true;
    updateChrome();
    updateFooterMark();
    if (busy) poke();
  }

  function register(el, factory) {
    const sc = factory(el);
    sc.el = el; sc.active = false;
    scenes.push(sc);
    return sc;
  }

  // Progreso 0..1 de una sección alta con contenido sticky
  const pinProgress = (el) => {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - state.vh));
  };

  function sceneExpand(el) {
    let cur = 0;
    return {
      update() {
        const t = pinProgress(el);
        cur = lerp(cur, t, 0.13);
        if (Math.abs(cur - t) < 0.0005) cur = t;
        el.style.setProperty('--p', cur.toFixed(4));
        el.classList.toggle('is-open', cur > 0.8);
        return cur !== t;
      },
    };
  }

  function sceneDrive(el) {
    const van = $('.drive__van', el);
    const fill = $('.drive__fill', el);
    let cur = 0, fillLeft = 0, vanW = 0;
    const measure = () => { fillLeft = fill.getBoundingClientRect().left; vanW = van.offsetWidth; };
    const sc = {
      measure,
      update() {
        if (!vanW) measure();
        const t = pinProgress(el);
        cur = lerp(cur, t, 0.12);
        if (Math.abs(cur - t) < 0.0005) cur = t;
        const vx = -vanW * 1.08 + cur * (state.vw + vanW * 1.16);
        el.style.setProperty('--vx', vx.toFixed(1) + 'px');
        el.style.setProperty('--reveal', Math.max(0, vx + vanW * 0.03 - fillLeft).toFixed(1) + 'px');
        el.style.setProperty('--p', cur.toFixed(4));
        el.classList.toggle('is-open', cur > 0.72);
        return cur !== t;
      },
    };
    return sc;
  }

  function sceneHPin(el) {
    const viewport = $('#galView');
    const track = $('#galTrack');
    let cur = 0, dist = 0, enabled = false;
    const measure = () => {
      enabled = state.vw >= 900 && !reduce;
      el.classList.toggle('is-pinned', enabled);
      if (!enabled) {
        el.style.removeProperty('--gh-total');
        track.style.removeProperty('--tx');
        return;
      }
      dist = Math.max(0, track.scrollWidth - viewport.clientWidth);
      el.style.setProperty('--gh-total', Math.round(dist + state.vh) + 'px');
    };
    return {
      measure,
      update() {
        if (!enabled) return false;
        const t = pinProgress(el);
        cur = lerp(cur, t, 0.1);
        if (Math.abs(cur - t) < 0.0005) cur = t;
        track.style.setProperty('--tx', (-cur * dist).toFixed(1) + 'px');
        el.style.setProperty('--gp', cur.toFixed(4));
        return cur !== t;
      },
    };
  }

  function sceneStack(el) {
    const cards = $$('.scard', el);
    const inners = cards.map((c) => $('.scard__in', c));
    const cur = cards.map(() => 0);
    let tops = [];
    const measure = () => { tops = cards.map((c) => parseFloat(getComputedStyle(c).top) || 0); };
    return {
      measure,
      update() {
        if (!tops.length) measure();
        let busy = false;
        for (let i = 0; i < cards.length - 1; i++) {
          const h = cards[i].offsetHeight;
          const nextTop = cards[i + 1].getBoundingClientRect().top;
          const t = clamp((tops[i] + h - nextTop) / h);
          cur[i] = lerp(cur[i], t, 0.2);
          if (Math.abs(cur[i] - t) < 0.001) cur[i] = t; else busy = true;
          inners[i].style.setProperty('--sc', (1 - 0.07 * cur[i]).toFixed(4));
          inners[i].style.setProperty('--br', (1 - 0.1 * cur[i]).toFixed(4));
        }
        return busy;
      },
    };
  }

  function sceneSteps(el) {
    const box = $('.steps__box', el);
    let cur = 0;
    return {
      update() {
        const r = box.getBoundingClientRect();
        const t = clamp((state.vh * 0.72 - r.top) / (r.height * 0.85));
        cur = lerp(cur, t, 0.12);
        if (Math.abs(cur - t) < 0.001) cur = t;
        box.style.setProperty('--sp', cur.toFixed(4));
        return cur !== t;
      },
    };
  }

  const footerMark = $('.footer__mark');
  const footerEl = $('.footer');
  function updateFooterMark() {
    if (!footerMark || !footerEl || reduce) return;
    const r = footerEl.getBoundingClientRect();
    if (r.top > state.vh || r.bottom < 0) return;
    // 0 cuando el footer termina de entrar (fin de la página): la marca queda asentada
    const fp = clamp((state.vh - r.top) / r.height);
    footerMark.style.setProperty('--fy', ((1 - fp) * 80).toFixed(1) + 'px');
  }

  function initScenes() {
    if (reduce) return;
    const map = { expand: sceneExpand, drive: sceneDrive, hpin: sceneHPin, stack: sceneStack, steps: sceneSteps };
    $$('[data-scene]').forEach((el) => {
      const f = map[el.dataset.scene];
      if (f) register(el, f);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const sc = scenes.find((s) => s.el === e.target);
        if (sc) sc.active = e.isIntersecting;
      });
      poke();
    }, { rootMargin: '15% 0px 15% 0px' });
    scenes.forEach((s) => io.observe(s.el));
    measureScenes();
  }
  function measureScenes() { scenes.forEach((s) => s.measure && s.measure()); }

  /* Efectos de puntero: foco, inclinación y botones magnéticos */
  function initPointerFx() {
    if (!fine || reduce) return;
    $$('[data-spot], [data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty('--mx', x + 'px');
        el.style.setProperty('--my', y + 'px');
        el.style.setProperty('--ry', ((x / r.width - 0.5) * 5).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((y / r.height - 0.5) * -5).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
    $$('[data-magnetic]').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty('--mx', ((e.clientX - (r.left + r.width / 2)) * 0.2).toFixed(1) + 'px');
        btn.style.setProperty('--my', ((e.clientY - (r.top + r.height / 2)) * 0.3).toFixed(1) + 'px');
      });
      btn.addEventListener('pointerleave', () => { btn.style.setProperty('--mx', '0px'); btn.style.setProperty('--my', '0px'); });
    });
  }

  /* ---------- 7. Mapa de rutas ---------- */
  function initMap() {
    const map = $('#map');
    if (!map) return;
    const NS = 'http://www.w3.org/2000/svg';
    const routesG = $('#mapRoutes');
    const marker = $('#mapMarker');
    const markerRot = $('#markerRot');
    const tabs = $$('.dtab');
    const panels = $$('.dest');
    const pins = $$('.pin', map);
    const cta = $('#destCta');
    const ctaTxt = $('#destCtaTxt');

    const P = {
      puebla: [370.8, 134.7], cdmx: [234.8, 82.7], veracruz: [671.8, 114.7],
      acapulco: [125.2, 426.7], huatulco: [673.3, 570.7],
    };
    const bend = { cdmx: 0.2, veracruz: -0.22, acapulco: -0.2, huatulco: 0.18 };
    const paths = {};
    Object.keys(bend).forEach((id) => {
      const [x1, y1] = P.puebla, [x2, y2] = P[id];
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const dx = x2 - x1, dy = y2 - y1;
      const cx = mx - dy * bend[id], cy = my + dx * bend[id];
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', `M${x1},${y1} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2},${y2}`);
      p.setAttribute('class', 'route');
      routesG.appendChild(p);
      paths[id] = p;
    });

    let current = null;
    let travel = null;
    let auto = null;
    let userPicked = false;

    const resetRoutes = () => {
      Object.values(paths).forEach((p) => {
        p.classList.remove('is-on', 'is-all');
        p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; p.style.transition = '';
      });
    };
    const stopTravel = () => { if (travel) cancelAnimationFrame(travel); travel = null; marker.setAttribute('opacity', '0'); };

    const runTravel = (path) => {
      const len = path.getTotalLength();
      const t0 = performance.now();
      marker.setAttribute('opacity', '1');
      const step = (now) => {
        const t = ((now - t0) % 4600) / 4600;
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const L = e * len;
        const a = path.getPointAtLength(L);
        const b = path.getPointAtLength(Math.min(len, L + 1.5));
        const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 45;
        marker.setAttribute('transform', `translate(${a.x.toFixed(1)},${a.y.toFixed(1)})`);
        markerRot.setAttribute('transform', `rotate(${deg.toFixed(1)})`);
        travel = requestAnimationFrame(step);
      };
      travel = requestAnimationFrame(step);
    };

    const select = (id, focusTab) => {
      if (id === current) return;
      current = id;
      tabs.forEach((t) => {
        const on = t.dataset.dest === id;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focusTab) t.focus();
      });
      panels.forEach((p) => {
        const on = p.id === 'dest-' + id;
        p.hidden = !on;
        p.classList.toggle('is-active', on);
      });
      pins.forEach((p) => p.classList.toggle('is-active', p.dataset.pin === id));
      resetRoutes();
      stopTravel();

      const name = $('#dest-' + id).dataset.name;
      ctaTxt.textContent = id === 'otro' ? 'Quiero cotizar mi destino' : `Quiero viajar a ${name}`;
      cta.href = waUrl(id === 'otro'
        ? 'Hola RubíTur, quiero viajar a otro destino. ¿Me ayudan a cotizar?'
        : `Hola RubíTur, quiero viajar de Puebla a ${name}. ¿Me ayudan a cotizar?`);

      if (id === 'otro') {
        Object.values(paths).forEach((p) => p.classList.add('is-all'));
        return;
      }
      const path = paths[id];
      if (reduce) { path.classList.add('is-on'); return; }
      const len = path.getTotalLength();
      path.classList.add('is-on');
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.getBoundingClientRect(); // forzar reflow antes de animar
      path.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(.77,0,.175,1)';
      path.style.strokeDashoffset = 0;
      setTimeout(() => { if (current === id) runTravel(path); }, 1250);
    };

    tabs.forEach((t, i) => {
      t.addEventListener('click', () => { userPicked = true; select(t.dataset.dest); });
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
        const n = tabs[(i + dir + tabs.length) % tabs.length];
        userPicked = true; select(n.dataset.dest, true);
      });
    });
    pins.forEach((p) => p.addEventListener('click', () => {
      if (p.dataset.pin === 'puebla') return;
      userPicked = true; select(p.dataset.pin);
    }));

    // Arranca al entrar al viewport y rota solo hasta que el usuario elige
    const order = ['acapulco', 'cdmx', 'huatulco', 'veracruz', 'otro'];
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!current) select('acapulco');
        if (!auto && !userPicked && !reduce) {
          auto = setInterval(() => {
            if (userPicked || document.hidden) return;
            select(order[(order.indexOf(current) + 1) % order.length]);
          }, 7000);
        }
      } else if (auto) { clearInterval(auto); auto = null; }
    }, { threshold: 0.35 }).observe(map);
  }

  /* Paneles de ocasiones */
  function initOccasions() {
    const wrap = $('#occ');
    if (!wrap) return;
    const panels = $$('.opanel', wrap);
    const mq = matchMedia('(min-width: 900px)');
    const applyInert = () => {
      panels.forEach((p) => {
        const body = $('.opanel__body', p);
        const inactive = mq.matches && !p.classList.contains('is-active');
        if (inactive) body.setAttribute('inert', ''); else body.removeAttribute('inert');
      });
    };
    const set = (target) => {
      panels.forEach((p) => {
        const on = p === target;
        p.classList.toggle('is-active', on);
        $('.opanel__label', p).setAttribute('aria-expanded', String(on));
      });
      applyInert();
    };
    panels.forEach((p) => {
      const label = $('.opanel__label', p);
      label.addEventListener('click', () => set(p));
      label.addEventListener('focus', () => set(p));
      if (fine) p.addEventListener('pointerenter', () => { if (mq.matches) set(p); });
    });
    mq.addEventListener('change', applyInert);
    applyInert();
  }

  /* FAQ */
  function initFaq() {
    $$('.qa').forEach((q) => {
      const btn = $('.qa__btn', q);
      btn.addEventListener('click', () => {
        const open = !q.classList.contains('is-open');
        $$('.qa.is-open').forEach((o) => {
          if (o !== q) { o.classList.remove('is-open'); $('.qa__btn', o).setAttribute('aria-expanded', 'false'); }
        });
        q.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  }

  /* Visor de fotos */
  function initLightbox() {
    const lb = $('#lb');
    const items = $$('[data-lb]');
    if (!lb || !items.length) return;
    const img = $('#lbImg'), cap = $('#lbCap');
    const closeBtn = $('#lbClose'), prev = $('#lbPrev'), next = $('#lbNext');
    const BLANK = img.src; // pixel transparente del HTML
    let idx = 0, lastFocus = null, startX = 0;

    const show = (i) => {
      idx = (i + items.length) % items.length;
      const it = items[idx];
      img.src = it.dataset.lb;
      img.alt = ($('img', it) || {}).alt || '';
      cap.textContent = it.dataset.cap || '';
      [items[(idx + 1) % items.length], items[(idx - 1 + items.length) % items.length]].forEach((n) => { new Image().src = n.dataset.lb; });
    };
    const open = (i) => {
      lastFocus = document.activeElement;
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
      show(i);
      closeBtn.focus();
    };
    const close = () => {
      lb.hidden = true;
      img.src = BLANK;
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    };
    items.forEach((it, i) => it.addEventListener('click', () => open(i)));
    closeBtn.addEventListener('click', close);
    prev.addEventListener('click', () => show(idx - 1));
    next.addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    window.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'Tab') {
        const f = [closeBtn, prev, next];
        const i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
    lb.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    lb.addEventListener('pointerup', (e) => {
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 60) show(idx + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------- 8. Formulario -> WhatsApp ---------- */
  function initForm() {
    const form = $('#quoteForm');
    if (!form) return;
    const nameI = $('#f-name'), dateI = $('#f-date'), paxI = $('#f-pax');
    const otherWrap = $('#otherWrap'), otherI = $('#f-other');
    const btn = $('#formSubmit'), ok = $('#formOk'), okLink = $('#formOkLink');

    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    dateI.min = todayStr;

    const setErr = (input, msg) => {
      const f = input.closest('.field');
      f.classList.add('is-invalid');
      const err = $('.field__err', f);
      if (err) err.textContent = msg;
      input.setAttribute('aria-invalid', 'true');
    };
    const clearErr = (input) => {
      const f = input.closest('.field');
      if (!f) return;
      f.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
    };

    $$('.stepper__btn', form).forEach((b) => b.addEventListener('click', () => {
      const v = parseInt(paxI.value, 10) || 0;
      paxI.value = clamp(v + Number(b.dataset.step), 1, 99);
      clearErr(paxI);
    }));
    $$('input[name="destino"]', form).forEach((r) => r.addEventListener('change', () => {
      const other = r.value === 'Otro destino' && r.checked;
      otherWrap.hidden = !other;
      if (other) otherI.focus();
      clearErr(r);
    }));
    [nameI, dateI, paxI, otherI].forEach((i) => i.addEventListener('input', () => clearErr(i)));

    const validate = () => {
      let firstBad = null;
      const bad = (el, msg) => { setErr(el, msg); if (!firstBad) firstBad = el; };
      if (nameI.value.trim().length < 2) bad(nameI, 'Escribe tu nombre para saber con quién hablamos.');
      const dest = form.querySelector('input[name="destino"]:checked');
      if (!dest) bad(form.querySelector('input[name="destino"]'), 'Elige a dónde quieres viajar.');
      else if (dest.value === 'Otro destino' && otherI.value.trim().length < 2) bad(otherI, 'Cuéntanos a qué destino quieres ir.');
      const pax = parseInt(paxI.value, 10);
      if (!pax || pax < 1 || pax > 99) bad(paxI, 'Indica entre 1 y 99 pasajeros.');
      if (dateI.value && dateI.value < todayStr) bad(dateI, 'La fecha de salida no puede ser anterior a hoy.');
      if (firstBad) firstBad.focus();
      return !firstBad;
    };

    const fmtDate = (v) => { const [y, m, d] = v.split('-'); return `${d}/${m}/${y}`; };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate()) return;
      const dest = form.querySelector('input[name="destino"]:checked').value;
      const tipo = form.querySelector('input[name="tipo"]:checked');
      const msgTxt = $('#f-msg').value.trim();
      const lines = ['Hola RubíTur, quiero cotizar un viaje.', ''];
      lines.push(`• Nombre: ${nameI.value.trim()}`);
      lines.push(`• Destino: ${dest === 'Otro destino' ? otherI.value.trim() : dest}`);
      if (dateI.value) lines.push(`• Fecha de salida: ${fmtDate(dateI.value)}`);
      lines.push(`• Pasajeros: ${parseInt(paxI.value, 10)}`);
      if (tipo) lines.push(`• Tipo de viaje: ${tipo.value}`);
      if (msgTxt) lines.push(`• Comentarios: ${msgTxt}`);
      const url = waUrl(lines.join('\n'));

      btn.classList.add('is-loading');
      btn.disabled = true;
      okLink.href = url;
      window.open(url, '_blank', 'noopener');
      setTimeout(() => {
        btn.classList.remove('is-loading');
        btn.disabled = false;
        ok.hidden = false;
        okLink.focus();
      }, 650);
    });
    // Permite volver a editar el formulario tras el éxito
    ok.addEventListener('click', (e) => { if (e.target === ok) ok.hidden = true; });
  }

  /* ---------- Varios ---------- */
  function initMisc() {
    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();

    // Mapa de Google: se carga solo cuando está cerca
    const frame = $('#mapFrame');
    if (frame) {
      new IntersectionObserver((entries, io) => {
        if (entries[0].isIntersecting) { frame.src = frame.dataset.src; io.disconnect(); }
      }, { rootMargin: '600px 0px' }).observe(frame);
    }

    // Burbuja del botón flotante de WhatsApp
    const tip = $('#waTip');
    if (tip && !reduce) {
      setTimeout(() => {
        tip.classList.add('is-on');
        setTimeout(() => tip.classList.remove('is-on'), 7000);
      }, 9000);
    }
  }

  /* ---------- Arranque ---------- */
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      state.vh = window.innerHeight; state.vw = window.innerWidth;
      measureScenes();
      poke();
    }, 120);
  });
  window.addEventListener('scroll', poke, { passive: true });
  window.addEventListener('load', () => { measureScenes(); poke(); });

  // Cada módulo corre aislado: si uno falla, el resto de la página sigue funcionando
  const safe = (fn) => { try { fn(); } catch (err) { console.error('[RubíTur]', fn.name, err); } };
  [initMenu, initReveal, initCounters, initHero, initParticles, initScenes, initPointerFx,
    initMap, initOccasions, initFaq, initLightbox, initForm, initMisc].forEach(safe);
  poke();

  let loaderRun;
  try { loaderRun = initLoader(); } catch (err) {
    console.error('[RubíTur] initLoader', err);
    root.classList.remove('is-loading'); root.classList.add('is-ready');
    const l = $('#loader'); if (l) l.remove();
    loaderRun = Promise.resolve();
  }
  loaderRun.then(() => safe(initRotor));
})();
