(() => {
  'use strict';

  /* ---------- Navbar: scrolled state + active link ---------- */
  const nav = document.getElementById('nav');
  const navLinks = document.querySelectorAll('.nav__link');
  const onScroll = () => {
    if (window.scrollY > 30) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile burger ---------- */
  const burger = document.getElementById('navBurger');
  const menu   = document.getElementById('navMenu');
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
  });
  navLinks.forEach(a => a.addEventListener('click', () => {
    if (menu.classList.contains('is-open')) {
      menu.classList.remove('is-open');
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  }));

  /* ---------- Active section highlight ---------- */
  const sections = ['hero','hakkimda','ozgecmis','hizmetler','mevzuat','yayinlar','iletisim']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  const setActive = (id) => {
    navLinks.forEach(a => {
      const target = a.getAttribute('href').slice(1);
      a.classList.toggle('is-active', target === id);
    });
  };

  if ('IntersectionObserver' in window) {
    const sectObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) setActive(e.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(s => sectObs.observe(s));
  }

  /* ---------- Reveal on scroll (fade-up) ---------- */
  const reveals = document.querySelectorAll('.reveal');
  reveals.forEach((el, i) => {
    // tiny stagger inside same section based on DOM order
    el.style.setProperty('--reveal-delay', `${(i % 4) * 90}ms`);
  });

  if ('IntersectionObserver' in window) {
    const revObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          revObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(el => revObs.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- Animated stat counters ---------- */
  const counters = document.querySelectorAll('.stat__num');
  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic

    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const value = Math.round(target * ease(p));
      el.textContent = value.toLocaleString('tr-TR') + (p === 1 ? suffix : '');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if ('IntersectionObserver' in window) {
    const cntObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCount(e.target);
          cntObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => cntObs.observe(c));
  } else {
    counters.forEach(c => { c.textContent = c.dataset.count + (c.dataset.suffix || ''); });
  }

  /* ---------- Hero parallax (mousemove) ---------- */
  const glowA = document.querySelector('.hero__glow--a');
  const glowB = document.querySelector('.hero__glow--b');
  const grid  = document.querySelector('.hero__grid');
  const hero  = document.querySelector('.hero');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (hero && !reduceMotion) {
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      if (glowA) glowA.style.transform = `translate(${x * 30}px, ${y * 30}px)`;
      if (glowB) glowB.style.transform = `translate(${x * -40}px, ${y * -40}px)`;
      if (grid)  grid.style.transform  = `translate(${x * -10}px, ${y * -10}px)`;
    });
  }

  /* ---------- Mevzuat: search + category filter ---------- */
  const searchInput = document.getElementById('lawSearch');
  const chipsBox    = document.getElementById('lawChips');
  const lawList     = document.getElementById('lawList');
  const lawEmpty    = document.getElementById('lawEmpty');
  const laws        = lawList ? Array.from(lawList.querySelectorAll('.law')) : [];

  const norm = (s) => (s || '').toString()
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıİ]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o');

  let currentCat = 'all';
  let currentQ   = '';

  const applyFilter = () => {
    const q = norm(currentQ.trim());
    let visible = 0;
    laws.forEach((card) => {
      const cat = card.dataset.cat;
      const text = norm(card.textContent);
      const catOk = currentCat === 'all' || cat === currentCat;
      const qOk = !q || text.indexOf(q) !== -1;
      const show = catOk && qOk;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (lawEmpty) lawEmpty.hidden = visible !== 0;
  };

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentQ = e.target.value;
      applyFilter();
    });
  }
  if (chipsBox) {
    chipsBox.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      chipsBox.querySelectorAll('.chip').forEach(c => {
        c.classList.remove('is-active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('is-active');
      chip.setAttribute('aria-selected', 'true');
      currentCat = chip.dataset.cat;
      applyFilter();
    });
  }

  /* ---------- Year stamp (in case footer text is updated later) ---------- */
  // no-op for now — placeholder for future dynamic year

})();
