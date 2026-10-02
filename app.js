// app.js - shared site behaviour for the Hardik Darji portfolio
(function () {
  'use strict';

  // ---------- Content loader ----------
  async function loadContent() {
    try {
      const res = await fetch('content.json', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && (data.projects || data.blogs)) return data;
      }
    } catch (e) { /* fall through */ }
    if (typeof window.allBlogPosts !== 'undefined') {
      return { projects: [], blogs: window.allBlogPosts };
    }
    return { projects: [], blogs: [] };
  }
  function escapeHtml(v) {
    if (v == null) return '';
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function formatDate(v) {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return escapeHtml(v);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  function projectCard(p) {
    const slug = escapeHtml(p.slug), title = escapeHtml(p.title);
    const summary = escapeHtml(p.short_summary || '');
    const image = p.main_image ? escapeHtml(p.main_image) : 'images/placeholder-project.svg';
    return `<a href="project-template.html?slug=${slug}" class="group block bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-700 glow-amber-hover hover:border-amber-400">
      <div class="overflow-hidden rounded-lg mb-4 h-40 w-full bg-gray-600">
        <img src="${image}" alt="${title}" loading="lazy" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110">
      </div>
      <h4 class="text-xl font-bold text-amber-400 mb-2">${title}</h4>
      <p class="text-gray-300 text-sm">${summary}</p>
    </a>`;
  }
  function blogCard(b) {
    const slug = escapeHtml(b.slug), title = escapeHtml(b.title);
    const desc = escapeHtml(b.short_description || b.short_summary || '');
    const date = formatDate(b.date);
    return `<a href="blog-template.html?slug=${slug}" class="group block bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-700 glow-amber-hover hover:border-amber-400">
      <p class="text-sm text-gray-400 mb-2">${date}</p>
      <h4 class="text-xl font-bold text-amber-400 mb-2">${title}</h4>
      <p class="text-gray-300 text-sm">${desc}</p>
    </a>`;
  }
  function blogListItem(b) {
    const slug = escapeHtml(b.slug), title = escapeHtml(b.title), date = formatDate(b.date);
    return `<li class="mb-2"><a href="blog-template.html?slug=${slug}" class="hover:text-amber-400">${title}</a><p class="text-sm text-gray-400">${date}</p></li>`;
  }

  // ---------- Mobile menu ----------
  function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('close-mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');
    const open = () => {
      menu.classList.remove('-translate-x-full'); menu.classList.add('translate-x-0');
      btn.setAttribute('aria-expanded', 'true');
      if (menuIcon) menuIcon.classList.add('hidden');
      if (closeIcon) closeIcon.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    };
    const close = () => {
      menu.classList.add('-translate-x-full'); menu.classList.remove('translate-x-0');
      btn.setAttribute('aria-expanded', 'false');
      if (menuIcon) menuIcon.classList.remove('hidden');
      if (closeIcon) closeIcon.classList.add('hidden');
      document.body.style.overflow = '';
    };
    btn.setAttribute('aria-label', 'Toggle navigation menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'mobile-menu');
    btn.addEventListener('click', () => menu.classList.contains('-translate-x-full') ? open() : close());
    if (closeBtn) closeBtn.addEventListener('click', close);
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    window.closeMenu = close;
  }

  // ---------- Constellation background ----------
  function initConstellation() {
    const canvas = document.getElementById('constellation-canvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // context creation can fail (privacy mode, exhausted contexts)
    let w = 0, h = 0, dots = [], raf = null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const max = 140, count = window.innerWidth < 640 ? 40 : 80;
    function colors() {
      const t = document.documentElement.getAttribute('data-theme') || 'amber';
      if (t === 'light') return { dot: 'rgba(180, 83, 9, 0.35)', line: (a) => `rgba(180, 83, 9, ${a * 0.15})` };
      if (t === 'dark') return { dot: 'rgba(96, 165, 250, 0.6)', line: (a) => `rgba(96, 165, 250, ${a * 0.25})` };
      return { dot: 'rgba(251, 191, 36, 0.6)', line: (a) => `rgba(251, 191, 36, ${a * 0.25})` };
    }
    function resize() {
      w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight;
      dots = Array.from({ length: count }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4 }));
    }
    function step() {
      ctx.clearRect(0, 0, w, h);
      const c = colors();
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        ctx.fillStyle = c.dot;
        ctx.beginPath(); ctx.arc(d.x, d.y, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < max) {
            ctx.strokeStyle = c.line(1 - dist / max);
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y); ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(step);
    }
    resize(); if (!reduce) step();
    window.addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); if (!reduce) step(); });
  }

  // ---------- Tilt on hover ----------
  function initTilt() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('[data-tilt]').forEach(el => {
      const max = parseFloat(el.dataset.tilt) || 8;
      el.style.transformStyle = 'preserve-3d';
      el.style.transition = 'transform 0.2s ease-out';
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(1000px) rotateY(${x * max * 2}deg) rotateX(${-y * max * 2}deg) translateZ(8px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  // ---------- Animated counters ----------
  function initCounters() {
    const els = document.querySelectorAll('[data-counter]');
    if (!els.length) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const run = (el) => {
      const target = parseFloat(el.dataset.counter);
      const suffix = el.dataset.suffix || '';
      const dur = parseInt(el.dataset.duration || '1800', 10);
      if (reduce) { el.textContent = target + suffix; return; }
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.floor(eased * target) + suffix;
        if (t < 1) requestAnimationFrame(step); else el.textContent = target + suffix;
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: 0.4 });
    els.forEach(el => io.observe(el));
  }

  // ---------- Scroll reveal ----------
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  }

  // ---------- Scroll-spy ----------
  function initScrollSpy() {
    const links = Array.from(document.querySelectorAll('a.nav-link'));
    if (!links.length) return;
    const sections = links.map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);
    if (!sections.length) return;
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) {
        const id = '#' + e.target.id;
        links.forEach(l => {
          const active = l.getAttribute('href') === id;
          l.classList.toggle('text-amber-400', active);
          if (active) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current');
        });
      }
    }), { rootMargin: '-40% 0px -50% 0px' });
    sections.forEach(s => io.observe(s));
  }

  // ---------- Formspree forms ----------
  function initFormspreeForms() {
    document.querySelectorAll('[data-formspree-form]').forEach(form => {
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const formType = form.id === 'newsletter-form' ? 'newsletter' : 'contact';
        const status = document.getElementById(formType === 'newsletter' ? 'newsletter-status' : 'contact-status');
        const button = form.querySelector('button[type="submit"]');
        const originalLabel = button ? button.textContent : '';
        if (button) { button.disabled = true; button.textContent = 'Sending...'; }
        if (status) { status.textContent = ''; status.className = 'hidden text-sm'; }
        try {
          const response = await fetch(form.action, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: new FormData(form)
          });
          if (!response.ok) throw new Error('Form submission failed');
          form.reset();
          if (status) {
            status.textContent = formType === 'newsletter'
              ? 'You are subscribed successfully.'
              : 'Thanks! Your message was sent successfully.';
            status.className = 'text-sm text-green-400';
          }
        } catch (error) {
          if (status) {
            status.textContent = 'Unable to send right now. Please try again or email hmdarji921@gmail.com directly.';
            status.className = 'text-sm text-red-400';
          }
        } finally {
          if (button) { button.disabled = false; button.textContent = originalLabel; }
        }
      });
    });
  }

  // ---------- Home sections ----------
  async function initHomeSections() {
    const projectGrid = document.getElementById('featured-projects-grid');
    const blogsContainer = document.getElementById('blogs-container');
    const footerList = document.getElementById('recent-blogs-footer');
    const latestBlogCard = document.getElementById('latest-blog-card');
    const latestProjectCard = document.getElementById('latest-project-card');
    if (!projectGrid && !blogsContainer && !footerList && !latestBlogCard && !latestProjectCard) return;
    const data = await loadContent();
    const projects = (data.projects || []).slice(0, 3);
    const blogs = (data.blogs || []).slice(0, 3);
    if (projectGrid) {
      if (!projects.length) projectGrid.innerHTML = '<p class="text-gray-400 text-center">No projects yet. Add some from the CMS.</p>';
      else { projectGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8'; projectGrid.innerHTML = projects.map(projectCard).join(''); }
    }
    if (blogsContainer) {
      if (!blogs.length) blogsContainer.innerHTML = '<p class="text-gray-400 text-center">No blog posts yet.</p>';
      else { blogsContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8 p-4'; blogsContainer.innerHTML = blogs.map(blogCard).join(''); }
    }
    if (footerList) {
      footerList.innerHTML = blogs.length ? blogs.map(blogListItem).join('') : '<li>No recent posts available.</li>';
    }
    // Latest highlights on home
    if (latestBlogCard) {
      const latestBlog = (data.blogs || [])[0];
      if (latestBlog) {
        latestBlogCard.innerHTML = `
          <div class="flex items-center gap-2 text-amber-400 text-xs uppercase tracking-wider font-semibold mb-3">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Latest post &middot; ${escapeHtml(formatDate(latestBlog.date))}
          </div>
          <h3 class="text-xl font-bold text-white group-hover:text-amber-300 transition mb-2">${escapeHtml(latestBlog.title)}</h3>
          <p class="text-gray-400 text-sm">${escapeHtml(latestBlog.short_description || latestBlog.short_summary || '')}</p>
          <p class="mt-4 text-amber-400 text-sm font-semibold inline-flex items-center gap-1">Read post
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </p>`;
        latestBlogCard.href = `blog-template.html?slug=${encodeURIComponent(latestBlog.slug)}`;
      } else {
        // No posts published yet. Hide the card rather than leave placeholder
        // copy ("Read the blog") pointing at an empty listing page.
        latestBlogCard.classList.add('hidden');
        const grid = latestBlogCard.parentElement;
        if (grid) grid.classList.remove('md:grid-cols-2');
      }
    }
    if (latestProjectCard) {
      const latestProject = (data.projects || [])[0];
      if (latestProject) {
        latestProjectCard.innerHTML = `
          <div class="flex items-center gap-2 text-amber-400 text-xs uppercase tracking-wider font-semibold mb-3">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Latest project
          </div>
          <h3 class="text-xl font-bold text-white group-hover:text-amber-300 transition mb-2">${escapeHtml(latestProject.title)}</h3>
          <p class="text-gray-400 text-sm">${escapeHtml(latestProject.short_summary || '')}</p>
          <p class="mt-4 text-amber-400 text-sm font-semibold inline-flex items-center gap-1">View project
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </p>`;
        latestProjectCard.href = `project-template.html?slug=${encodeURIComponent(latestProject.slug)}`;
      }
    }
  }

  // ---------- Theme toggle ----------
  function initTheme() {
    let stored = null;
    try { stored = localStorage.getItem('theme'); } catch (e) { /* private mode */ }
    const valid = ['amber', 'dark', 'light'];
    const initial = valid.includes(stored) ? stored : 'amber';
    document.documentElement.setAttribute('data-theme', initial);
    updateThemeIcon(initial);
  }
  function setTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    try { localStorage.setItem('theme', name); } catch (e) {}
    updateThemeIcon(name);
  }
  function updateThemeIcon(name) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const sun = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const moon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    const palette = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`;
    btn.innerHTML = name === 'light' ? moon : name === 'dark' ? sun : palette;
    btn.setAttribute('aria-label', `Theme: ${name}. Click to change.`);
    btn.setAttribute('title', `Theme: ${name}`);
  }
  function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const order = ['amber', 'dark', 'light'];
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'amber';
      const next = order[(order.indexOf(current) + 1) % order.length];
      setTheme(next);
    });
  }

  // ---------- Back to top ----------
  function initBackToTop() {
    const btn = document.getElementById('back-to-top');
    const bar = document.getElementById('scroll-progress');
    const onScroll = () => {
      const scrolled = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (scrolled / max) * 100 : 0;
      if (bar) bar.style.width = pct + '%';
      if (btn) {
        if (scrolled > window.innerHeight * 0.6) btn.classList.add('is-visible');
        else btn.classList.remove('is-visible');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (btn) btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---------- Section share / hash sync ----------
  function initHashSync() {
    // Inject a share anchor into every top-level section
    const sections = document.querySelectorAll('main > section[id]');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
    sections.forEach(sec => {
      if (sec.querySelector('.share-link')) return;
      sec.classList.add('section-anchor');
      const id = sec.id;
      const a = document.createElement('a');
      a.href = '#' + id;
      a.className = 'share-link';
      a.setAttribute('aria-label', `Copy link to ${id} section`);
      a.setAttribute('title', 'Copy link');
      a.innerHTML = svg;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const url = new URL(window.location.href);
        url.hash = '#' + id;
        const link = url.toString();
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(link).then(() => flashCopied(a));
        } else {
          // Fallback
          const ta = document.createElement('textarea');
          ta.value = link; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); flashCopied(a); } catch (e2) {}
          document.body.removeChild(ta);
        }
        // Also push to address bar without jumping
        history.replaceState(null, '', '#' + id);
      });
      sec.prepend(a);
    });

    // Update URL hash as you scroll (debounced)
    const links = Array.from(document.querySelectorAll('a.nav-link'));
    if (!links.length) return;
    const map = new Map();
    links.forEach(l => { const sec = document.querySelector(l.getAttribute('href')); if (sec) map.set(sec, l); });
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        let best = null, bestRatio = 0;
        map.forEach((_, sec) => {
          const r = sec.getBoundingClientRect();
          const visible = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
          if (visible > bestRatio) { bestRatio = visible; best = sec; }
        });
        if (best && bestRatio > 80) {
          const newHash = '#' + best.id;
          if (window.location.hash !== newHash) history.replaceState(null, '', newHash);
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  function flashCopied(el) {
    el.classList.add('copied');
    setTimeout(() => el.classList.remove('copied'), 1200);
  }

  // ---------- Hero interactive particle cursor ----------
  function initHeroParticles() {
    const canvas = document.getElementById('hero-particles');
    if (!canvas || !canvas.getContext) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      canvas.classList.add('is-disabled');
      return;
    }
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let w = 0, h = 0, particles = [], raf = null, mouseX = -9999, mouseY = -9999;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(60, Math.floor((w * h) / 18000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
      }));
    }

    function step() {
      ctx.clearRect(0, 0, w, h);
      const theme = document.documentElement.getAttribute('data-theme') || 'amber';
      const dotColor = theme === 'light' ? 'rgba(180, 83, 9, 0.55)' : theme === 'dark' ? 'rgba(96, 165, 250, 0.7)' : 'rgba(251, 191, 36, 0.7)';
      const lineColor = (a) => theme === 'light' ? `rgba(180, 83, 9, ${a * 0.3})` : theme === 'dark' ? `rgba(96, 165, 250, ${a * 0.35})` : `rgba(251, 191, 36, ${a * 0.35})`;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        // Mouse attraction
        const dx = mouseX - p.x, dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160) {
          p.x += dx / dist * 0.4;
          p.y += dy / dist * 0.4;
        }
        ctx.fillStyle = dotColor;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      // Connect lines
      for (let i = 0; i < particles.length; i++) {
        // to mouse
        const dxm = mouseX - particles[i].x, dym = mouseY - particles[i].y;
        const dm = Math.sqrt(dxm * dxm + dym * dym);
        if (dm < 140) {
          ctx.strokeStyle = lineColor(1 - dm / 140);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouseX, mouseY);
          ctx.stroke();
        }
        // to other particles
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.strokeStyle = lineColor((1 - d / 100) * 0.5);
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(step);
    }
    resize();
    step();

    canvas.parentElement.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouseX = e.clientX - r.left;
      mouseY = e.clientY - r.top;
    });
    canvas.parentElement.addEventListener('mouseleave', () => { mouseX = -9999; mouseY = -9999; });

    let resizeRaf = null;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => { resize(); });
    });
  }

  // ---------- Now / status block ----------
  function initNowBlock() {
    const timeEl = document.getElementById('local-time');
    const updatedEl = document.getElementById('last-updated');
    if (timeEl) {
      const updateTime = () => {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString('en-IN', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata'
        });
      };
      updateTime();
      setInterval(updateTime, 30 * 1000);
    }
    if (updatedEl) {
      const d = new Date(document.lastModified || Date.now());
      updatedEl.textContent = d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    }
  }

  // ---------- 3D Hero (Three.js microchip + PCB) ----------
  // Lazy-loads Three.js, then builds a small WebGL scene of a microchip
  // sitting on a PCB. Drag to rotate. Falls back gracefully if WebGL is off.
  function initHero3D() {
    const wrap = document.getElementById('hero-3d-wrap');
    const canvas = document.getElementById('hero-3d-canvas');
    if (!wrap || !canvas) return;

    // Check WebGL
    const probe = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!probe) return; // leave the static fallback if you have one

    // Respect user data-saver preference: skip the 3D scene if the user has
    // enabled "Save Data" in their browser. Fall back to the static SVG.
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && conn.saveData) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function start() {
      if (typeof THREE === 'undefined') return;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      // Static isometric camera - looking down at ~55deg from a slight angle
      camera.position.set(2.4, 4.6, 3.2);
      camera.lookAt(0, 0, 0);

      // lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.75));
      const key = new THREE.DirectionalLight(0xfbbf24, 1.5);
      key.position.set(4, 8, 4);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x60a5fa, 0.5);
      fill.position.set(-5, 4, 2);
      scene.add(fill);
      const rim = new THREE.PointLight(0xfbbf24, 0.9, 14);
      rim.position.set(0, 3, -3);
      scene.add(rim);

      // ---- PCB (the base, stationary) ----
      const pcbGeom = new THREE.BoxGeometry(3.2, 0.18, 2.4);
      const pcbMat = new THREE.MeshStandardMaterial({ color: 0x0a2a1f, metalness: 0.15, roughness: 0.6 });
      const pcb = new THREE.Mesh(pcbGeom, pcbMat);
      scene.add(pcb);

      // PCB top inset (slightly darker) for depth
      const pcbTop = new THREE.Mesh(
        new THREE.BoxGeometry(3.0, 0.02, 2.25),
        new THREE.MeshStandardMaterial({ color: 0x0d3326, metalness: 0.1, roughness: 0.8 })
      );
      pcbTop.position.y = 0.10;
      scene.add(pcbTop);

      // ---- Golden traces on the PCB top ----
      const traceMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 });
      function addTrace(points) {
        const pts = points.map(p => new THREE.Vector3(p[0], 0.115, p[1]));
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        scene.add(new THREE.Line(geom, traceMat));
      }
      // Two zig-zag traces from edge to chip
      [[-1.3, 0.7], [-0.55, 0.7], [-0.55, 0.25], [-0.55, -0.25], [0.55, -0.25], [0.55, -0.7], [1.3, -0.7]]
        .reduce((acc, pt) => { if (acc) addTrace([acc, pt]); return pt; }, null);
      [[-1.3, -0.7], [-0.55, -0.7], [-0.55, -0.25], [0.55, -0.25], [0.55, 0.7], [1.3, 0.7]]
        .reduce((acc, pt) => { if (acc) addTrace([acc, pt]); return pt; }, null);
      // Some short stub traces
      addTrace([[-1.3, 0.0], [-0.95, 0.0]]);
      addTrace([[0.95, 0.0], [1.3, 0.0]]);
      addTrace([[-1.3, -0.3], [-0.95, -0.3]]);
      addTrace([[0.95, 0.3], [1.3, 0.3]]);

      // ---- Solder pads around the chip (8 per side, 4 sides) ----
      const padMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 });
      const padGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.05, 14);
      for (let i = 0; i < 6; i++) {
        const t = (i / 5) - 0.5;  // -0.5..0.5
        let p = new THREE.Mesh(padGeom, padMat); p.position.set(t * 0.9, 0.13, -0.55); scene.add(p);
        p = new THREE.Mesh(padGeom, padMat); p.position.set(t * 0.9, 0.13, 0.55); scene.add(p);
        p = new THREE.Mesh(padGeom, padMat); p.position.set(-0.6, 0.13, t * 0.7); scene.add(p);
        p = new THREE.Mesh(padGeom, padMat); p.position.set(0.6, 0.13, t * 0.7); scene.add(p);
      }

      // ---- Microchip (centered, sitting on the PCB) ----
      // PCB top is at y=0.10; chip top face should be at y=0.10 + chipHeight
      const chipGroup = new THREE.Group();
      const chipH = 0.2;
      const chipGeom = new THREE.BoxGeometry(1.1, chipH, 0.9);
      const chipMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.3 });
      const chip = new THREE.Mesh(chipGeom, chipMat);
      // chip bottom at y=0.10 (PCB top), so chip center y = 0.10 + chipH/2 = 0.20
      chip.position.y = 0.20;
      chipGroup.add(chip);

      // Chip label on top face
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 512; labelCanvas.height = 512;
      const ctx = labelCanvas.getContext('2d');
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 8; ctx.strokeRect(20, 20, 472, 472);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)'; ctx.lineWidth = 2; ctx.strokeRect(45, 45, 422, 422);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 50px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EMBEDDED', 256, 220);
      ctx.fillText('SYSTEMS', 256, 285);
      ctx.font = 'bold 22px JetBrains Mono, monospace';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('CAN / J1939', 256, 340);
      // pin-1 indicator
      ctx.beginPath(); ctx.arc(60, 60, 12, 0, Math.PI * 2); ctx.fillStyle = '#fbbf24'; ctx.fill();
      ctx.beginPath(); ctx.arc(60, 60, 18, 0, Math.PI * 2); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke();
      const labelTex = new THREE.CanvasTexture(labelCanvas);
      labelTex.anisotropy = 8;
      const labelMat = new THREE.MeshBasicMaterial({ map: labelTex });
      const labelPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.8), labelMat);
      labelPlane.position.y = 0.31; // 0.20 (chip center) + 0.10 (half chip height) + 0.01 = exactly on top
      labelPlane.rotation.x = -Math.PI / 2;
      chipGroup.add(labelPlane);
      scene.add(chipGroup);

      // ---- 4 electrolytic capacitors (round cans at the corners) ----
      const capMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.5, roughness: 0.5 });
      const capGeom = new THREE.CylinderGeometry(0.13, 0.13, 0.28, 18);
      const capTopMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.7, roughness: 0.4 });
      const capTopGeom = new THREE.CylinderGeometry(0.13, 0.13, 0.01, 18);
      [[-1.1, 0.4], [1.1, 0.4], [-1.1, -0.4], [1.1, -0.4]].forEach(([x, z]) => {
        const cap = new THREE.Mesh(capGeom, capMat);
        cap.position.set(x, 0.24, z);
        scene.add(cap);
        const top = new THREE.Mesh(capTopGeom, capTopMat);
        top.position.set(x, 0.385, z);
        scene.add(top);
      });

      // ---- 4 small SMD chips at the corners ----
      const smdMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.3, roughness: 0.6 });
      const smdGeom = new THREE.BoxGeometry(0.25, 0.08, 0.15);
      [[-1.1, 0.85], [1.1, 0.85], [-1.1, -0.85], [1.1, -0.85]].forEach(([x, z]) => {
        const s = new THREE.Mesh(smdGeom, smdMat);
        s.position.set(x, 0.14, z);
        scene.add(s);
      });

      // ---- 4 red resistors (small blocks between chip and capacitors) ----
      const rMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.2, roughness: 0.6 });
      const rGeom = new THREE.BoxGeometry(0.13, 0.06, 0.05);
      [[-0.75, 0.85], [0.75, 0.85], [-0.75, -0.85], [0.75, -0.85]].forEach(([x, z]) => {
        const r = new THREE.Mesh(rGeom, rMat);
        r.position.set(x, 0.13, z);
        scene.add(r);
      });

      // ---- Crystal oscillator (silver can below the chip) ----
      const xtalMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.85, roughness: 0.25 });
      const xtal = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.09, 0.13), xtalMat);
      xtal.position.set(0, 0.145, 0.92);
      scene.add(xtal);

      // ---- Mouse parallax (no drag) ----
      let mouseX = 0, mouseY = 0;
      let cameraTheta = Math.atan2(camera.position.x, camera.position.z);
      const radius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
      const baseY = camera.position.y;

      function onMove(e) {
        const r = wrap.getBoundingClientRect();
        const nx = ((e.clientX - r.left) / r.width) - 0.5;   // -0.5..0.5
        const ny = ((e.clientY - r.top) / r.height) - 0.5;
        mouseX = nx;
        mouseY = ny;
      }
      wrap.addEventListener('mousemove', onMove);
      wrap.addEventListener('mouseleave', () => { mouseX = 0; mouseY = 0; });

      // ---- Resize ----
      function resize() {
        const rect = wrap.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height) || 440;
        renderer.setSize(size, size, false);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
      }
      resize();
      window.addEventListener('resize', resize);

      // ---- Animate ----
      let raf = null;
      let t0 = performance.now();
      function tick() {
        const elapsed = (performance.now() - t0) / 1000;
        // Gentle automatic orbit (very slow)
        const autoTheta = cameraTheta + elapsed * 0.12;
        // Mouse parallax
        const px = mouseX * 0.6;
        const py = mouseY * 0.4;
        const theta = autoTheta + px;
        const y = baseY - py;
        camera.position.x = Math.sin(theta) * radius;
        camera.position.z = Math.cos(theta) * radius;
        camera.position.y = y;
        camera.lookAt(0, 0.15, 0);
        // Gentle PCB trace pulse
        traceMat.opacity = 0.65 + Math.sin(performance.now() / 800) * 0.2;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      }
      tick();

      // Pause animation when off-screen
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(entries => {
          for (const e of entries) {
            if (e.isIntersecting) {
              if (!raf) tick();
            } else if (raf) {
              cancelAnimationFrame(raf); raf = null;
            }
          }
        });
        io.observe(wrap);
      }
    }

    // Lazy load Three.js once
    if (typeof THREE !== 'undefined') {
      start();
    } else {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
      s.async = true;
      s.onload = () => start();
      s.onerror = () => { /* leave the static noscript fallback visible */ };
      document.head.appendChild(s);
    }
  }

  window.app = { loadContent, escapeHtml, formatDate, projectCard, blogCard, blogListItem, setTheme };

  document.addEventListener('DOMContentLoaded', () => {
    // Each feature initialises independently. A failure in one (for example a
    // canvas context that cannot be created) must not stop the rest from
    // running, otherwise a single decorative animation takes the whole page
    // down with it.
    const inits = [
      ['theme', initTheme],
      ['themeToggle', initThemeToggle],
      ['mobileMenu', initMobileMenu],
      ['constellation', initConstellation],
      ['scrollSpy', initScrollSpy],
      ['forms', initFormspreeForms],
      ['homeSections', initHomeSections],
      ['tilt', initTilt],
      ['counters', initCounters],
      ['reveal', initReveal],
      ['backToTop', initBackToTop],
      ['hashSync', initHashSync],
      ['heroParticles', initHeroParticles],
      ['nowBlock', initNowBlock],
      ['hero3d', initHero3D]
    ];
    inits.forEach(([name, fn]) => {
      try {
        fn();
      } catch (error) {
        console.warn(`[app] ${name} failed to initialise:`, error);
      }
    });
  });
})();
