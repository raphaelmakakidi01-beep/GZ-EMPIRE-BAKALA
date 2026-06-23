/* ============================================================
   GZ-EMPIRE — Main JavaScript
   Navigation, animations, counters, hero canvas, testimonials
   ============================================================ */

(function() {
  // Safe localStorage wrapper for file:// protocol compatibility
  let localStorage;
  try {
    localStorage = window.localStorage;
    localStorage.getItem('test-local-storage');
  } catch (e) {
    const store = {};
    localStorage = {
      getItem: (key) => store[key] !== undefined ? store[key] : null,
      setItem: (key, val) => { store[key] = String(val); },
      removeItem: (key) => { delete store[key]; },
      clear: () => { for (let k in store) delete store[k]; }
    };
  }

document.addEventListener('DOMContentLoaded', () => {

  // ─── Navbar Scroll Effect ───
  const navbar = document.getElementById('navbar');
  if (navbar) {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const currentScroll = window.scrollY;
      if (currentScroll > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
      lastScroll = currentScroll;
    }, { passive: true });
  }

  // ─── Mobile Menu Toggle ───
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const navActions = document.getElementById('navActions');

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navLinks?.classList.toggle('mobile-open');
      navActions?.classList.toggle('mobile-open');
    });

    // Close on link click
    navLinks?.querySelectorAll('.navbar__link').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navLinks.classList.remove('mobile-open');
        navActions?.classList.remove('mobile-open');
      });
    });
  }

  // ─── Scroll Reveal (IntersectionObserver) ───
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
  }

  // ─── Animated Counters ───
  const counterElements = document.querySelectorAll('[data-count]');
  if (counterElements.length > 0) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counterElements.forEach(el => counterObserver.observe(el));
  }

  function animateCounter(element) {
    const target = parseInt(element.dataset.count);
    const suffix = element.dataset.suffix || '+';
    const duration = 2000;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.floor(eased * target);

      if (target >= 1000) {
        element.textContent = current.toLocaleString('fr-FR') + suffix;
      } else {
        element.textContent = current + suffix;
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // ─── Testimonial Slider ───
  const track = document.getElementById('testimonialTrack');
  const prevBtn = document.getElementById('prevTestimonial');
  const nextBtn = document.getElementById('nextTestimonial');
  const dotsContainer = document.getElementById('testimonialDots');

  if (track && prevBtn && nextBtn) {
    let currentSlide = 0;
    const cards = track.querySelectorAll('.testimonial-card');
    const totalCards = cards.length;
    let cardsPerView = getCardsPerView();
    let maxSlide = Math.max(0, totalCards - cardsPerView);

    function buildDots() {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';
      const numDots = maxSlide + 1;
      for (let i = 0; i < numDots; i++) {
        const span = document.createElement('span');
        span.className = `testimonials__dot${i === currentSlide ? ' active' : ''}`;
        span.dataset.index = i;
        span.addEventListener('click', () => {
          currentSlide = i;
          updateSlider();
          resetAutoSlide();
        });
        dotsContainer.appendChild(span);
      }
    }

    function getCardsPerView() {
      if (window.innerWidth < 768) return 1;
      if (window.innerWidth < 1024) return 2;
      return 3;
    }

    function updateSlider() {
      const card = cards[0];
      if (!card) return;
      const cardWidth = card.offsetWidth;
      const gap = 24; // var(--space-6) = 1.5rem = 24px
      const offset = currentSlide * (cardWidth + gap);
      track.style.transform = `translateX(-${offset}px)`;
      track.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';

      // Update active dots
      const activeDots = dotsContainer ? dotsContainer.querySelectorAll('.testimonials__dot') : [];
      activeDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
      });
    }

    prevBtn.addEventListener('click', () => {
      currentSlide = Math.max(0, currentSlide - 1);
      updateSlider();
      resetAutoSlide();
    });

    nextBtn.addEventListener('click', () => {
      currentSlide = Math.min(maxSlide, currentSlide + 1);
      updateSlider();
      resetAutoSlide();
    });

    // Auto-slide
    let autoSlide = setInterval(() => {
      currentSlide = currentSlide >= maxSlide ? 0 : currentSlide + 1;
      updateSlider();
    }, 5000);

    function resetAutoSlide() {
      clearInterval(autoSlide);
      autoSlide = setInterval(() => {
        currentSlide = currentSlide >= maxSlide ? 0 : currentSlide + 1;
        updateSlider();
      }, 5000);
    }

    track.addEventListener('mouseenter', () => clearInterval(autoSlide));
    track.addEventListener('mouseleave', resetAutoSlide);

    window.addEventListener('resize', () => {
      const oldMax = maxSlide;
      cardsPerView = getCardsPerView();
      maxSlide = Math.max(0, totalCards - cardsPerView);
      if (currentSlide > maxSlide) {
        currentSlide = maxSlide;
      }
      if (oldMax !== maxSlide) {
        buildDots();
      }
      updateSlider();
    });

    // Initial build
    buildDots();
    updateSlider();

    // Track needs flex for slider
    track.style.display = 'flex';
    track.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
  }

  // ─── Hero Canvas — World Map with Trade Routes ───
  const heroCanvas = document.getElementById('heroCanvas');
  if (heroCanvas) {
    const ctx = heroCanvas.getContext('2d');
    let particles = [];
    let routes = [];
    let worldDots = [];
    let animFrame;

    // Convert lat/lng to canvas position (simple mercator)
    function geoToCanvas(lat, lng) {
      const x = ((lng + 180) / 360) * heroCanvas.width;
      const y = ((90 - lat) / 180) * heroCanvas.height;
      return { x, y };
    }

    // Define trade routes: China → destinations
    const guangzhou = { lat: 23.13, lng: 113.26 };
    const destinations = [
      { lat: -4.27, lng: 15.28, name: 'Brazzaville' },    // Congo
      { lat: -4.78, lng: 11.87, name: 'Pointe-Noire' },   // Congo
      { lat: -4.32, lng: 15.31, name: 'Kinshasa' },       // RDC
      { lat: -11.66, lng: 27.48, name: 'Lubumbashi' },    // RDC
      { lat: -5.82, lng: 13.45, name: 'Matadi' },         // RDC
      { lat: -6.79, lng: 39.27, name: 'Dar es Salaam' },  // Tanzanie
      { lat: 14.69, lng: -17.44, name: 'Dakar' },         // Sénégal
      { lat: 5.36, lng: -4.01, name: 'Abidjan' },         // Côte d'Ivoire
      { lat: 4.05, lng: 9.77, name: 'Douala' },           // Cameroun
      { lat: 48.86, lng: 2.35, name: 'Paris' },           // France
      { lat: 50.85, lng: 4.35, name: 'Bruxelles' },       // Belgique
      { lat: 40.71, lng: -74.01, name: 'New York' },      // USA
    ];

    // Create routes placeholder configuration
    destinations.forEach((dest, i) => {
      routes.push({
        progress: Math.random(),
        speed: 0.001 + Math.random() * 0.002,
        color: `rgba(212, 175, 55, ${0.15 + Math.random() * 0.2})`,
        particleColor: '#D4AF37',
        curveHeight: 50 + Math.random() * 30
      });
    });

    // Populate stable coordinates for map dots and curves
    function initializeCoordinates() {
      // 1. Calculate map dots (once per resize, not per frame)
      worldDots = [];
      const continentAreas = [
        { latMin: -35, latMax: 37, lngMin: -18, lngMax: 52, density: 0.3 }, // Africa
        { latMin: 35, latMax: 72, lngMin: -10, lngMax: 40, density: 0.25 }, // Europe
        { latMin: 5, latMax: 55, lngMin: 60, lngMax: 140, density: 0.2 },   // Asia
        { latMin: -55, latMax: 72, lngMin: -130, lngMax: -35, density: 0.15 } // Americas
      ];

      continentAreas.forEach(area => {
        for (let lat = area.latMin; lat <= area.latMax; lat += 3) {
          for (let lng = area.lngMin; lng <= area.lngMax; lng += 3) {
            if (Math.random() < area.density) {
              const pos = geoToCanvas(lat, lng);
              worldDots.push(pos);
            }
          }
        }
      });

      // 2. Compute route points based on new canvas dimensions
      routes.forEach((route, idx) => {
        route.start = geoToCanvas(guangzhou.lat, guangzhou.lng);
        route.end = geoToCanvas(destinations[idx].lat, destinations[idx].lng);
        const midX = (route.start.x + route.end.x) / 2;
        route.control = {
          x: midX,
          y: Math.min(route.start.y, route.end.y) - route.curveHeight
        };
      });
    }

    function resizeCanvas() {
      heroCanvas.width = window.innerWidth;
      heroCanvas.height = window.innerHeight;
      initializeCoordinates();
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create ambient particles
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * heroCanvas.width,
        y: Math.random() * heroCanvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.4 + 0.1,
      });
    }

    // Draw pre-calculated stable world map outline dots
    function drawWorldDots() {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      worldDots.forEach(pos => {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 1, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Quadratic bezier point
    function getQuadBezierPoint(t, p0, p1, p2) {
      const u = 1 - t;
      return {
        x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
        y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
      };
    }

    function animate() {
      ctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);

      drawWorldDots();

      // Draw routes
      routes.forEach(route => {
        const control = route.control;

        // Draw curve
        ctx.beginPath();
        ctx.moveTo(route.start.x, route.start.y);
        ctx.quadraticCurveTo(control.x, control.y, route.end.x, route.end.y);
        ctx.strokeStyle = route.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animate particle along route
        route.progress += route.speed;
        if (route.progress > 1) route.progress = 0;

        const pos = getQuadBezierPoint(route.progress, route.start, control, route.end);

        // Glow effect
        const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 12);
        glow.addColorStop(0, 'rgba(212, 175, 55, 0.6)');
        glow.addColorStop(1, 'rgba(212, 175, 55, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
        ctx.fill();

        // Particle dot
        ctx.fillStyle = route.particleColor;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Start point
        ctx.fillStyle = 'rgba(212, 175, 55, 0.8)';
        ctx.beginPath();
        ctx.arc(route.start.x, route.start.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // End point
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(route.end.x, route.end.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw ambient particles
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = heroCanvas.width;
        if (p.x > heroCanvas.width) p.x = 0;
        if (p.y < 0) p.y = heroCanvas.height;
        if (p.y > heroCanvas.height) p.y = 0;

        ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Guangzhou label
      const gzPos = geoToCanvas(guangzhou.lat, guangzhou.lng);
      ctx.fillStyle = 'rgba(212, 175, 55, 0.9)';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GUANGZHOU', gzPos.x, gzPos.y - 12);

      // Pulsing ring on Guangzhou
      const pulseSize = 8 + Math.sin(Date.now() * 0.003) * 4;
      ctx.strokeStyle = `rgba(212, 175, 55, ${0.3 + Math.sin(Date.now() * 0.003) * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(gzPos.x, gzPos.y, pulseSize, 0, Math.PI * 2);
      ctx.stroke();

      animFrame = requestAnimationFrame(animate);
    }

    animate();

    // Cleanup on page leave
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(animFrame);
      } else {
        animate();
      }
    });
  }

  // ─── Smooth Scroll for anchor links ───
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const navHeight = navbar ? navbar.offsetHeight : 0;
        const targetPos = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      }
    });
  });

  // ─── Contact Form Handler ───
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const btn = contactForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;

      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: rotate 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        Envoi en cours...
      `;
      btn.disabled = true;

      setTimeout(() => {
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          Message envoyé !
        `;
        btn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
        btn.style.color = 'white';

        contactForm.reset();

        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background = '';
          btn.style.color = '';
          btn.disabled = false;
        }, 3000);
      }, 1500);
    });
  }

  // ─── Language Selector & Dynamic i18n Loader ───
  const langButtons = document.querySelectorAll('.navbar__lang-btn');
  
  // Dynamically load the i18n script to enable full page translations
  const i18nScript = document.createElement('script');
  i18nScript.src = 'js/i18n.js';
  document.head.appendChild(i18nScript);

  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      langButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const lang = btn.dataset.lang;
      document.documentElement.lang = lang;
      localStorage.setItem('gz-empire-lang', lang);
      
      // If the dynamic i18n library is loaded, trigger translation
      if (typeof window.translatePage === 'function') {
        window.translatePage(lang);
      }
    });
  });

  // Restore saved language
  const savedLang = localStorage.getItem('gz-empire-lang');
  if (savedLang) {
    langButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === savedLang);
    });
    document.documentElement.lang = savedLang;
  }

  // ─── Responsive contact grid ───
  const contactGrid = document.querySelector('#contact-quick .container > div[style]');
  if (contactGrid && window.innerWidth < 768) {
    contactGrid.style.gridTemplateColumns = '1fr';
  }
  window.addEventListener('resize', () => {
    if (contactGrid) {
      contactGrid.style.gridTemplateColumns = window.innerWidth < 768 ? '1fr' : '1fr 1fr';
    }
  });


  // ─── PAGE TRANSITION ENGINE ───
  const overlay = document.getElementById('pageTransitionOverlay');
  if (overlay) {
    const fadeOut = () => {
      overlay.classList.add('fade-out');
    };
    window.addEventListener('load', fadeOut);
    // Fallback timeout in case page assets load slowly
    setTimeout(fadeOut, 600);
  }

  // Intercept click on links for transition exit
  document.body.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    
    const href = link.getAttribute('href');
    if (!href) return;
    
    // Skip anchor, JavaScript, target blank, and external links
    const isAnchor = href.startsWith('#');
    const isJs = href.startsWith('javascript:');
    const isTargetBlank = link.getAttribute('target') === '_blank';
    const isExternal = href.startsWith('http') && !href.includes(window.location.hostname);
    
    if (isAnchor || isJs || isTargetBlank || isExternal) return;
    
    if (href.endsWith('.html') || href === '/' || href.includes('.html')) {
      e.preventDefault();
      const overlay = document.getElementById('pageTransitionOverlay');
      if (overlay) {
        overlay.classList.remove('fade-out');
        setTimeout(() => {
          window.location.href = href;
        }, 300); // Wait for transition fade-in
      } else {
        window.location.href = href;
      }
    }
  });

  // ─── VIDEO PRESENTATION PLAYER ───
  const presentationVideo = document.getElementById('presentationVideo');
  const videoWrapper = document.getElementById('videoWrapper');
  const videoPlayBtn = document.getElementById('videoPlayBtn');

  if (presentationVideo && videoWrapper && videoPlayBtn) {
    const toggleVideo = () => {
      if (presentationVideo.paused) {
        presentationVideo.muted = false;
        presentationVideo.play();
        videoWrapper.classList.add('playing');
      } else {
        presentationVideo.pause();
        videoWrapper.classList.remove('playing');
      }
    };

    videoPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleVideo();
    });

    videoWrapper.addEventListener('click', toggleVideo);

    // When video ends (if not looping), reset state
    presentationVideo.addEventListener('ended', () => {
      videoWrapper.classList.remove('playing');
    });
  }

  // ─── Human Touch Gallery - Double Marquee Lightbox ───
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');

  if (lightbox && lightboxImg && lightboxClose) {
    const galleryCards = Array.from(document.querySelectorAll('.gallery__card'));
    
    // Dynamically retrieve the unique list of image sources based on data-index
    const uniqueSrcs = [];
    const uniqueAlts = [];
    
    galleryCards.forEach(card => {
      const img = card.querySelector('.gallery__img');
      const idx = parseInt(card.dataset.index);
      if (img && uniqueSrcs[idx] === undefined) {
        uniqueSrcs[idx] = img.getAttribute('src');
        uniqueAlts[idx] = img.getAttribute('alt') || 'GZ-Empire';
      }
    });

    let currentImgIndex = 0;

    function openLightbox(index) {
      currentImgIndex = index;
      lightboxImg.src = uniqueSrcs[currentImgIndex];
      lightboxImg.alt = uniqueAlts[currentImgIndex];
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }

    function showNextImg() {
      currentImgIndex = (currentImgIndex + 1) % uniqueSrcs.length;
      openLightbox(currentImgIndex);
    }

    function showPrevImg() {
      currentImgIndex = (currentImgIndex - 1 + uniqueSrcs.length) % uniqueSrcs.length;
      openLightbox(currentImgIndex);
    }

    galleryCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(card.dataset.index);
        openLightbox(index);
      });
    });

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });

    if (lightboxPrev && lightboxNext) {
      lightboxPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        showPrevImg();
      });
      lightboxNext.addEventListener('click', (e) => {
        e.stopPropagation();
        showNextImg();
      });
    }

    // Keyboard listener
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') showNextImg();
      if (e.key === 'ArrowLeft') showPrevImg();
    });
  }

  // ─── Services Click Pre-fill ───
  const serviceCards = document.querySelectorAll('#service-sourcing, #service-maritime, #service-air, #service-visa, #service-customs, #service-vip');
  const contactMessage = document.getElementById('contactMessage');
  const contactQuickSection = document.getElementById('contact-quick');

  if (serviceCards.length > 0 && contactMessage && contactQuickSection) {
    serviceCards.forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        const serviceId = card.id;
        const key = `${serviceId.replace('service-', 'services.')}.template`;
        
        const lang = localStorage.getItem('gz-empire-lang') || 'fr';
        if (window.translations && window.translations[lang] && window.translations[lang][key]) {
          contactMessage.value = window.translations[lang][key];
        }
        
        // Scroll smoothly to contact section
        contactQuickSection.scrollIntoView({ behavior: 'smooth' });
        
        // Focus and trigger highlight animation
        contactMessage.focus();
        contactMessage.classList.remove('highlight-flash');
        void contactMessage.offsetWidth; // Trigger reflow to restart animation
        contactMessage.classList.add('highlight-flash');
      });
    });
  }

  // ─── About Section Click Actions (Pillars & CTA) ───
  const aboutCta = document.getElementById('aboutCta');
  const pillarCards = document.querySelectorAll('.pillar--clickable');

  const triggerContactHighlight = () => {
    contactMessage.focus();
    contactMessage.classList.remove('highlight-flash');
    void contactMessage.offsetWidth; // Trigger reflow to restart animation
    contactMessage.classList.add('highlight-flash');
  };

  if (aboutCta && contactMessage && contactQuickSection) {
    aboutCta.addEventListener('click', () => {
      const lang = localStorage.getItem('gz-empire-lang') || 'fr';
      let ctaMessage = "Bonjour GZ-Empire, je souhaite échanger avec vos experts pour discuter de mes besoins d'importation et de sourcing depuis la Chine.";
      if (lang === 'en') {
        ctaMessage = "Hello GZ-Empire, I would like to talk with your experts to discuss my import and sourcing needs from China.";
      } else if (lang === 'zh') {
        ctaMessage = "您好帝王世家，我想与你们的专家沟通，讨论我从中国的进口与采购需求。";
      }
      contactMessage.value = ctaMessage;
      contactQuickSection.scrollIntoView({ behavior: 'smooth' });
      triggerContactHighlight();
    });
  }

  if (pillarCards.length > 0 && contactMessage && contactQuickSection) {
    pillarCards.forEach(pillar => {
      pillar.addEventListener('click', () => {
        const pillarType = pillar.dataset.pillarType;
        const key = `about.pillar.${pillarType}.template`;
        const lang = localStorage.getItem('gz-empire-lang') || 'fr';
        
        if (window.translations && window.translations[lang] && window.translations[lang][key]) {
          contactMessage.value = window.translations[lang][key];
        }
        
        contactQuickSection.scrollIntoView({ behavior: 'smooth' });
        triggerContactHighlight();
      });
      
      // Keyboard accessibility
      pillar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pillar.click();
        }
      });
    });
  }
});

})();
