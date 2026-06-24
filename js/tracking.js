/* ============================================================
   GZ-EMPIRE — Tracking Page JavaScript
   Integrates dynamic localStorage tracking database, Leaflet maps
   with route calculations, dynamic timeline statuses, and i18n
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

  // Ensure default shipments are loaded in localStorage if empty
  if (!localStorage.getItem('gz-empire-shipments')) {
    const defaultShipments = [];
    localStorage.setItem('gz-empire-shipments', JSON.stringify(defaultShipments));
  }

  /* ─── Navbar Scroll Effect ─── */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    const handleScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  /* ─── Mobile Nav Toggle ─── */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const navActions = document.getElementById('navActions');
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('mobile-open');
      navActions.classList.toggle('mobile-open');
    });
  }

  /* ─── Scroll Reveal ─── */
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  revealElements.forEach(el => revealObserver.observe(el));

  /* ─── Global Search Variables & States ─── */
  const trackingForm = document.getElementById('trackingForm');
  const trackingInput = document.getElementById('trackingInput');
  const resultsSection = document.getElementById('resultsSection');
  const trackingError = document.getElementById('trackingError');
  const errorContainerId = document.getElementById('errorContainerId');
  const demoBtn = document.getElementById('demoBtn');
  const demoBtn2 = document.getElementById('demoBtn2');

  let activeShipment = null;

  /* ─── Deterministic Hash Generator for Mock Details ─── */
  function getHashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }

  /* ─── Date Parsing and Formatting Helpers ─── */
  function parseDateString(dateStr) {
    if (!dateStr) return new Date();
    
    // Try parsing dd/mm/yyyy
    const dmy = dateStr.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})$/);
    if (dmy) {
      return new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]));
    }
    
    // Try parsing yyyy-mm-dd
    const ymd = dateStr.match(/^(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})$/);
    if (ymd) {
      return new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]));
    }
    
    // Fallback to JS standard Date parsing
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      return new Date(parsed);
    }
    
    // Default to today
    return new Date();
  }

  function getETADate(departureDate, etaStr) {
    // If etaStr looks like "Est. X jours" or "X days"
    const matchDays = etaStr.match(/(\d+)\s*(jours|days|天|jour|day)/i);
    if (matchDays) {
      const days = parseInt(matchDays[1]);
      const etaDate = new Date(departureDate);
      etaDate.setDate(etaDate.getDate() + days);
      return etaDate;
    }
    
    // Otherwise try to parse it as a date
    const parsed = parseDateString(etaStr);
    // If parsed date is not today (or if it parsed successfully and differs from today)
    if (parsed.toDateString() !== new Date().toDateString() || etaStr.includes(new Date().getFullYear().toString())) {
      return parsed;
    }
    
    // Default fallback: 30 days after departure
    const fallback = new Date(departureDate);
    fallback.setDate(fallback.getDate() + 30);
    return fallback;
  }

  function formatDate(date, lang) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    try {
      return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : (lang === 'en' ? 'en-US' : 'fr-FR'), options);
    } catch (e) {
      return date.toLocaleDateString('fr-FR', options);
    }
  }

  /* ─── Search Functionality ─── */
  function performSearch(ref) {
    const storedShipments = JSON.parse(localStorage.getItem('gz-empire-shipments') || '[]');
    
    // Search in container number or dynamic bill of lading
    const found = storedShipments.find(s => {
      const searchRef = ref.trim().toUpperCase();
      const contMatch = s.container.trim().toUpperCase() === searchRef;
      
      // Compute bill of lading matching
      const generatedBL = `${s.carrier.split(' ')[0].toUpperCase()}-GZ-2026-${(getHashCode(s.container) % 9000) + 1000}`.toUpperCase();
      const demoBL = `COSCO-GZ-2024-0312`.toUpperCase();
      const blMatch = (generatedBL === searchRef || (s.container === "GZEMP2024001" && demoBL === searchRef));
      
      return contMatch || blMatch;
    });

    if (found) {
      activeShipment = found;
      
      // Hide error
      if (trackingError) trackingError.classList.add('hidden');
      
      // Show results
      showResults();
    } else {
      activeShipment = null;
      
      // Hide results
      if (resultsSection) resultsSection.classList.add('hidden');
      
      // Show error
      if (trackingError) {
        trackingError.classList.remove('hidden');
        if (errorContainerId) errorContainerId.textContent = ref;
        
        // Smooth scroll to error
        setTimeout(() => {
          trackingError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }

  function showResults() {
    if (!activeShipment || !resultsSection) return;

    resultsSection.classList.remove('hidden');

    // Smooth scroll to results
    setTimeout(() => {
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // Trigger reveal animations inside results
    const revealInResults = resultsSection.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    revealInResults.forEach(el => {
      revealObserver.observe(el);
      el.classList.add('visible');
    });

    // Translate all dynamic content based on current active language
    const currentLang = localStorage.getItem('gz-empire-lang') || 'fr';
    updateDynamicLabels(currentLang);
  }

  /* ─── Dynamic UI & Translation Renderer ─── */
  function updateDynamicLabels(lang) {
    if (!activeShipment) return;

    // Check if status is overridden in local storage (Admin Dashboard edits)
    const localStatusKey = `gz-empire-shipment-status-${activeShipment.container}`;
    const status = localStorage.getItem(localStatusKey) || activeShipment.status;

    // 1. Text elements
    const resContainerId = document.getElementById('resContainerId');
    const resOrigin = document.getElementById('resOrigin');
    const resDestination = document.getElementById('resDestination');
    const resDeparture = document.getElementById('resDeparture');
    const resETA = document.getElementById('resETA');
    const resCarrier = document.getElementById('resCarrier');

    if (resContainerId) resContainerId.textContent = activeShipment.container;
    
    // Format origin and destination flags
    const originText = activeShipment.origin;
    let destText = activeShipment.destination;

    if (resOrigin) resOrigin.textContent = originText;
    if (resDestination) resDestination.textContent = destText;
    
    // Parse and localize dates
    const depDate = parseDateString(activeShipment.departure);
    const etaDate = getETADate(depDate, activeShipment.eta);

    if (resDeparture) resDeparture.textContent = formatDate(depDate, lang);
    if (resETA) resETA.textContent = formatDate(etaDate, lang);
    if (resCarrier) resCarrier.textContent = activeShipment.carrier || "COSCO Shipping";

    // 2. Mock Shipment Details (consistent based on container ID hashes)
    const hashVal = getHashCode(activeShipment.container);
    
    const weightVal = (hashVal % 14000) + 8500; // between 8,500 and 22,500
    const volumeVal = (hashVal % 38) + 26; // between 26 and 64
    const cTypeVal = (hashVal % 3) === 0 ? "20' GP" : ((hashVal % 3) === 1 ? "40' GP" : "40' HC");
    const sealVal = `GZ${2026 - (hashVal % 3)}-${(hashVal % 8999) + 1000}`;
    const blVal = (activeShipment.container === "GZEMP2024001") ? "COSCO-GZ-2024-0312" : 
      `${(activeShipment.carrier || "COSCO").split(' ')[0].toUpperCase()}-GZ-2026-${(hashVal % 8999) + 1000}`;

    const resWeight = document.getElementById('resWeight');
    const resVolume = document.getElementById('resVolume');
    const resContainerType = document.getElementById('resContainerType');
    const resSealNumber = document.getElementById('resSealNumber');
    const resBillOfLading = document.getElementById('resBillOfLading');

    if (resWeight) resWeight.textContent = weightVal.toLocaleString(lang === 'zh' ? 'zh-CN' : 'fr-FR') + ' kg';
    if (resVolume) resVolume.textContent = volumeVal + ' CBM';
    if (resContainerType) resContainerType.textContent = cTypeVal;
    if (resSealNumber) resSealNumber.textContent = sealVal;
    if (resBillOfLading) resBillOfLading.textContent = blVal;

    // 3. Status Badge and Progress Bar
    const resStatusBadge = document.getElementById('resStatusBadge');
    const resStatusText = document.getElementById('resStatusText');
    const resProgressFill = document.getElementById('resProgressFill');
    const resProgressLabel = document.getElementById('resProgressLabel');

    // Remove old status classes
    if (resStatusBadge) {
      resStatusBadge.className = 'tracking-info__status-badge';
      resStatusBadge.classList.add(`tracking-info__status-badge--${status}`);
    }

    // Progress percentage
    const progressPctMap = {
      commande: 10,
      production: 20,
      qualite: 30,
      chargement: 40,
      transit: 65,
      arrivee: 85,
      douane: 90,
      livre: 100
    };
    const progressPct = progressPctMap[status] || 65;

    if (resProgressFill) {
      resProgressFill.style.width = '0%';
      setTimeout(() => {
        resProgressFill.style.width = `${progressPct}%`;
      }, 150);
    }
    if (resProgressLabel) resProgressLabel.textContent = `${progressPct}%`;

    // Localize Status Badge Text
    if (resStatusText) {
      resStatusText.setAttribute('data-i18n', `tracking.status.${status}`);
      // If translatePage function exists, it will catch it, else direct translation
      if (typeof window.translatePage === 'function') {
        const transDict = window.translations ? window.translations[lang] : null;
        if (transDict && transDict[`tracking.status.${status}`]) {
          resStatusText.innerHTML = transDict[`tracking.status.${status}`];
        }
      }
    }

    // 4. Update Destination in Timeline
    updateTimelineDestinationTitle(activeShipment.destination, lang);

    // 5. Update Timeline States and Dates
    updateTimelineDatesAndStates(activeShipment.departure, activeShipment.eta, status, lang);

    // 6. Map rendering
    const destCoords = getDestinationCoordinates(activeShipment.destination);
    setTimeout(() => {
      initMapDynamic(activeShipment.destination, status, destCoords);
    }, 200);
  }

  function updateTimelineDestinationTitle(destination, lang) {
    const step7TitleEl = document.querySelector('[data-i18n="tracking.step7_title"]');
    if (!step7TitleEl) return;
    
    const cleanDest = destination.replace(/\s*\(Port\)/i, '').trim();
    
    if (lang === 'zh') {
      step7TitleEl.textContent = `抵达 ${cleanDest} 港`;
    } else if (lang === 'en') {
      step7TitleEl.textContent = `Arrival at ${cleanDest} Port`;
    } else {
      step7TitleEl.textContent = `Arrivée port de ${cleanDest}`;
    }
  }

  function updateTimelineItem(itemEl, state) {
    const dotEl = itemEl.querySelector('.timeline__dot');
    if (!dotEl) return;
    
    itemEl.classList.remove('completed', 'active', 'pending');
    itemEl.classList.add(state);
    
    if (state === 'completed') {
      dotEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
    } else if (state === 'active') {
      dotEl.innerHTML = `<div class="timeline__dot-pulse"></div>`;
    } else {
      dotEl.innerHTML = ``;
    }

    const dateEl = itemEl.querySelector('.timeline__date');
    if (dateEl) {
      if (state === 'active') {
        dateEl.classList.add('timeline__date--active');
      } else {
        dateEl.classList.remove('timeline__date--active');
      }
    }
  }

  function updateTimelineDatesAndStates(departureDateStr, etaStr, status, lang) {
    const depDate = parseDateString(departureDateStr);
    const etaDate = getETADate(depDate, etaStr);
    
    const timeDiff = etaDate.getTime() - depDate.getTime();
    
    // Steps mapping
    const steps = [
      { offsetDays: -14, name: 'commande' },
      { offsetDays: -5, name: 'production' },
      { offsetDays: -2, name: 'qualite' },
      { offsetDays: -1, name: 'chargement' },
      { offsetDays: 0, name: 'depart' },
      { offsetPct: 0.5, name: 'transit' },
      { offsetDays: -3, name: 'arrivee' },
      { offsetDays: -1, name: 'douane' },
      { offsetDays: 0, name: 'livre' }
    ];
    
    const stepDates = [];
    steps.forEach((step, idx) => {
      let d;
      if (idx === 5) {
        d = new Date(depDate.getTime() + timeDiff * 0.5);
      } else if (idx < 5) {
        d = new Date(depDate);
        d.setDate(d.getDate() + step.offsetDays);
      } else {
        d = new Date(etaDate);
        d.setDate(d.getDate() + step.offsetDays);
      }
      stepDates.push(d);
    });
    
    const statusActiveMap = {
      'commande': 0,
      'production': 1,
      'qualite': 2,
      'chargement': 3,
      'depart': 4,
      'transit': 5,
      'arrivee': 6,
      'douane': 7,
      'livre': 8
    };
    
    const activeIdx = statusActiveMap[status] !== undefined ? statusActiveMap[status] : 5;
    
    const items = document.querySelectorAll('.timeline__item');
    items.forEach((itemEl, idx) => {
      let state = 'pending';
      if (idx < activeIdx) {
        state = 'completed';
      } else if (idx === activeIdx) {
        state = status === 'livre' ? 'completed' : 'active';
      }
      
      updateTimelineItem(itemEl, state);
      
      const dateEl = itemEl.querySelector('.timeline__date');
      if (dateEl) {
        if (idx === 5 && state === 'active') {
          dateEl.textContent = {
            fr: "En cours — Dernière mise à jour il y a 2h",
            en: "In progress — Last updated 2 hours ago",
            zh: "运输中 — 2小时前已更新"
          }[lang] || "En cours";
        } else {
          const formatted = formatDate(stepDates[idx], lang);
          if (state === 'pending') {
            dateEl.textContent = (lang === 'zh' ? '预计 ' : (lang === 'en' ? 'Est. ' : 'Est. ')) + formatted;
          } else {
            dateEl.textContent = formatted;
          }
        }
      }
    });
  }

  /* ─── Leaflet Map Logic ─── */
  const portCoordinates = {
    "abidjan": [5.3167, -4.0333],
    "pointe-noire": [-4.7692, 11.8664],
    "douala": [4.05, 9.7],
    "dakar": [14.7167, -17.4667],
    "lome": [6.1375, 1.2125],
    "cotonou": [6.3667, 2.4333],
    "libreville": [0.4167, 9.45],
    "luanda": [-8.8333, 13.2333],
    "marseille": [43.2964, 5.3698],
    "paris": [48.8566, 2.3522],
    "antwerpen": [51.2194, 4.4025],
    "rotterdam": [51.9244, 4.4777],
    "le havre": [49.4944, 0.1008]
  };

  function getDestinationCoordinates(destinationName) {
    const name = destinationName.toLowerCase();
    for (const [key, coords] of Object.entries(portCoordinates)) {
      if (name.includes(key)) {
        return coords;
      }
    }
    return portCoordinates["pointe-noire"];
  }

  function generateRoute(destCoords, destinationName) {
    const guangzhou = [23.1291, 113.2644];
    const isEurope = /europe|france|paris|marseille|antwerpen|rotterdam|havre|belgique|belgium|pays-bas|netherlands/i.test(destinationName);
    
    if (isEurope) {
      // Suez Canal route waypoints
      return [
        guangzhou,
        [16.0, 110.0],
        [6.0, 107.0],
        [1.3, 103.8],   // Singapore
        [6.0, 79.0],    // Sri Lanka
        [12.0, 52.0],   // Gulf of Aden
        [20.0, 39.0],   // Red Sea
        [30.0, 32.5],   // Suez Canal
        [34.0, 20.0],   // Mediterranean
        destCoords
      ];
    } else {
      // South Africa routing
      const route = [
        guangzhou,
        [16.0, 110.0],
        [6.0, 107.0],
        [1.3, 103.8],   // Singapore
        [-2.0, 97.0],   // Western Sumatra
        [-10.0, 75.0],  // Mid Indian Ocean
        [-20.0, 57.0],  // Mauritius
        [-28.0, 45.0],  // South of Madagascar
        [-34.8, 20.0],  // Cape Agulhas (South Africa)
        [-28.0, 12.0],  // Off Namibia
        [-15.0, 8.0]    // Off Angola
      ];
      
      const destLat = destCoords[0];
      const destLng = destCoords[1];
      
      if (destLat > -15.0) {
        if (destLat > -8.0) {
          route.push([-5.0, 8.0]); // Off Congo
        }
        if (destLat > 0.0) {
          route.push([1.0, 4.0]); // Gulf of Guinea
        }
        if (destLng < 0.0) {
          route.push([4.5, -7.0]); // Off Liberia
        }
        if (destLat > 10.0 || destLng < -10.0) {
          route.push([10.0, -16.0]); // Off Guinea
        }
      }
      
      route.push(destCoords);
      return route;
    }
  }

  function initMapDynamic(destinationName, status, destCoords) {
    const mapEl = document.getElementById('trackingMap');
    if (!mapEl || typeof L === 'undefined') return;

    // Destroy old map instance safely to prevent Leaflet container reinitialization errors
    if (window.leafletMap) {
      window.leafletMap.remove();
      window.leafletMap = null;
    }

    const guangzhou = [23.1291, 113.2644];
    const routePoints = generateRoute(destCoords, destinationName);

    // Compute progress position index
    let progressIndex = 0;
    if (status === 'commande' || status === 'production' || status === 'qualite' || status === 'chargement') {
      progressIndex = 0;
    } else if (status === 'transit') {
      progressIndex = Math.floor(routePoints.length * 0.6); // Middle of transit (60%)
    } else {
      progressIndex = routePoints.length - 1; // Arrived at destination
    }

    const currentPosition = routePoints[progressIndex];

    // Initialize Leaflet
    const map = L.map('trackingMap', {
      center: [5, 50],
      zoom: 3,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true
    });
    window.leafletMap = map;

    // Slick monochrome/clean tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);

    const traveledPoints = routePoints.slice(0, progressIndex + 1);
    const remainingPoints = routePoints.slice(progressIndex);

    // Draw traveled (solid gold path)
    if (traveledPoints.length > 1) {
      L.polyline(traveledPoints, {
        color: '#D4AF37',
        weight: 3,
        opacity: 0.9,
        smoothFactor: 1.5,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
    }

    // Draw remaining (dashed path)
    if (remainingPoints.length > 1) {
      L.polyline(remainingPoints, {
        color: '#9CA3AF',
        weight: 2,
        opacity: 0.5,
        dashArray: '8, 12',
        smoothFactor: 1.5,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
    }

    // Path animated micro-dots
    animateRouteDots(map, traveledPoints);

    // Custom divIcon markers
    const originIcon = L.divIcon({
      className: 'tracking-marker',
      html: '<div class="tracking-marker--origin"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    const originPopupText = {
      fr: '<strong>Guangzhou, Chine</strong><br>Port de départ — Nansha Terminal',
      en: '<strong>Guangzhou, China</strong><br>Departure Port — Nansha Terminal',
      zh: '<strong>中国广州港</strong><br>启运港 — 南沙集装箱码头'
    };
    const lang = localStorage.getItem('gz-empire-lang') || 'fr';

    L.marker(guangzhou, { icon: originIcon })
      .addTo(map)
      .bindPopup(originPopupText[lang] || originPopupText['fr']);

    const destIcon = L.divIcon({
      className: 'tracking-marker',
      html: '<div class="tracking-marker--dest"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    const cleanDestName = destinationName.replace(/\s*\(Port\)/i, '').trim();
    const destPopupText = {
      fr: `<strong>${cleanDestName}</strong><br>Port de destination`,
      en: `<strong>${cleanDestName}</strong><br>Destination Port`,
      zh: `<strong>${cleanDestName}港</strong><br>目的港`
    };

    L.marker(destCoords, { icon: destIcon })
      .addTo(map)
      .bindPopup(destPopupText[lang] || destPopupText['fr']);

    if (progressIndex > 0) {
      const isArrived = (progressIndex === routePoints.length - 1);
      const currentIcon = L.divIcon({
        className: 'tracking-marker',
        html: isArrived ? '<div class="tracking-marker--dest" style="background:#10B981;"></div>' : '<div class="tracking-marker--pulse"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const currentPopupHTML = isArrived ? {
        fr: `<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='display:inline-block; vertical-align:middle; margin-right:4px;'><circle cx='12' cy='5' r='3'/><line x1='12' y1='22' x2='12' y2='8'/><path d='M5 12H2a10 10 0 0 0 20 0h-3'/><path d='M19 12a7 7 0 0 1-14 0'/></svg><strong>Arrivé</strong><br>${cleanDestName} — Déchargement en cours`,
        en: `<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='display:inline-block; vertical-align:middle; margin-right:4px;'><circle cx='12' cy='5' r='3'/><line x1='12' y1='22' x2='12' y2='8'/><path d='M5 12H2a10 10 0 0 0 20 0h-3'/><path d='M19 12a7 7 0 0 1-14 0'/></svg><strong>Arrived</strong><br>${cleanDestName} — Unloading cargo`,
        zh: `<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='display:inline-block; vertical-align:middle; margin-right:4px;'><circle cx='12' cy='5' r='3'/><line x1='12' y1='22' x2='12' y2='8'/><path d='M5 12H2a10 10 0 0 0 20 0h-3'/><path d='M19 12a7 7 0 0 1-14 0'/></svg><strong>已抵达</strong><br>${cleanDestName}港 — 货物正在卸船`
      }[lang] : {
        fr: `<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='display:inline-block; vertical-align:middle; margin-right:4px;'><circle cx='12' cy='5' r='3'/><line x1='12' y1='22' x2='12' y2='8'/><path d='M5 12H2a10 10 0 0 0 20 0h-3'/><path d='M19 12a7 7 0 0 1-14 0'/></svg><strong>En Transit</strong><br>Position estimée sur la route maritime<br>Vitesse: 14.5 nœuds`,
        en: `<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='display:inline-block; vertical-align:middle; margin-right:4px;'><circle cx='12' cy='5' r='3'/><line x1='12' y1='22' x2='12' y2='8'/><path d='M5 12H2a10 10 0 0 0 20 0h-3'/><path d='M19 12a7 7 0 0 1-14 0'/></svg><strong>In Transit</strong><br>Estimated position along the route<br>Speed: 14.5 knots`,
        zh: `<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='display:inline-block; vertical-align:middle; margin-right:4px;'><circle cx='12' cy='5' r='3'/><line x1='12' y1='22' x2='12' y2='8'/><path d='M5 12H2a10 10 0 0 0 20 0h-3'/><path d='M19 12a7 7 0 0 1-14 0'/></svg><strong>海运中</strong><br>海上航线估算位置<br>船速: 14.5 节`
      }[lang];

      L.marker(currentPosition, { icon: currentIcon })
        .addTo(map)
        .bindPopup(currentPopupHTML)
        .openPopup();
    }

    // Fit views
    const bounds = L.latLngBounds([guangzhou, destCoords]);
    if (progressIndex > 0 && progressIndex < routePoints.length - 1) {
      bounds.extend(currentPosition);
    }
    map.fitBounds(bounds, { padding: [50, 50] });

    setTimeout(() => {
      map.invalidateSize();
    }, 250);
  }

  function animateRouteDots(map, points) {
    if (!points || points.length < 2) return;
    const totalPoints = points.length;
    const dotsCount = Math.min(15, totalPoints * 2);

    for (let i = 0; i < dotsCount; i++) {
      const progress = i / dotsCount;
      const segmentFloat = progress * (totalPoints - 1);
      const segIndex = Math.floor(segmentFloat);
      const segProgress = segmentFloat - segIndex;

      if (segIndex >= totalPoints - 1) continue;

      const lat = points[segIndex][0] + (points[segIndex + 1][0] - points[segIndex][0]) * segProgress;
      const lng = points[segIndex][1] + (points[segIndex + 1][1] - points[segIndex][1]) * segProgress;

      L.circleMarker([lat, lng], {
        radius: 2,
        fillColor: '#D4AF37',
        fillOpacity: 0.5,
        stroke: false
      }).addTo(map);
    }
  }

  /* ─── Form Submission Handlers ─── */
  if (trackingForm) {
    trackingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const ref = trackingInput.value.trim();
      if (ref) {
        performSearch(ref);
      }
    });
  }

  // Demo buttons triggers
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      trackingInput.value = 'GZEMP2024001';
      performSearch('GZEMP2024001');
    });
  }

  if (demoBtn2) {
    demoBtn2.addEventListener('click', () => {
      trackingInput.value = 'COSCO-GZ-2024-0312';
      performSearch('COSCO-GZ-2024-0312');
    });
  }

  /* ─── Alert Subscriptions & WhatsApp Toggle ─── */
  const alertForm = document.getElementById('alertForm');
  const alertSuccess = document.getElementById('alertSuccess');
  const whatsappToggle = document.getElementById('whatsappToggle');
  const whatsappNumberGroup = document.getElementById('whatsappNumberGroup');
  const alertWhatsapp = document.getElementById('alertWhatsapp');

  if (whatsappToggle && whatsappNumberGroup && alertWhatsapp) {
    whatsappToggle.addEventListener('change', () => {
      if (whatsappToggle.checked) {
        whatsappNumberGroup.classList.remove('hidden');
        alertWhatsapp.setAttribute('required', 'required');
        alertWhatsapp.focus();
      } else {
        whatsappNumberGroup.classList.add('hidden');
        alertWhatsapp.removeAttribute('required');
        alertWhatsapp.value = '';
      }
    });
  }

  function playNotificationSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      // First beep (880Hz, 120ms)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.13);
      
      // Second beep (980Hz, 160ms, after 110ms)
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(980, ctx.currentTime);
        gain2.gain.setValueAtTime(0, ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.015);
        gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.18);
      }, 110);
    } catch (err) {
      console.warn("AudioContext blocked or failed: ", err);
    }
  }

  function getToastContainer() {
    let container = document.getElementById('whatsappToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'whatsappToastContainer';
      container.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 380px;
        width: calc(100% - 48px);
        pointer-events: none;
      `;
      document.body.appendChild(container);
      
      const style = document.createElement('style');
      style.textContent = `
        @keyframes whatsappSlideIn {
          from {
            transform: translateY(-30px) scale(0.92);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes whatsappSlideOut {
          from {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          to {
            transform: translateY(-20px) scale(0.96);
            opacity: 0;
          }
        }
        .whatsapp-toast {
          background: #0b141a;
          color: #e9edef;
          border-left: 4px solid #25D366;
          border-radius: 8px;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
          padding: 14px 16px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          animation: whatsappSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          pointer-events: auto;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .whatsapp-toast:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
        }
        .whatsapp-toast__avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #25D366;
          color: #0b141a;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .whatsapp-toast__avatar svg {
          stroke: #0b141a !important;
          fill: none !important;
          color: #0b141a !important;
        }
        .whatsapp-toast__body {
          flex: 1;
          min-width: 0;
        }
        .whatsapp-toast__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3px;
        }
        .whatsapp-toast__sender {
          font-weight: 700;
          color: #25D366;
          font-size: 13px;
          letter-spacing: 0.2px;
        }
        .whatsapp-toast__time {
          font-size: 11px;
          color: #8696a0;
          font-weight: 500;
        }
        .whatsapp-toast__message {
          color: #d1d7db;
          line-height: 1.45;
          font-size: 13px;
          word-wrap: break-word;
        }
        .whatsapp-toast__message strong {
          color: #ffffff;
          font-weight: 600;
        }
      `;
      document.head.appendChild(style);
    }
    return container;
  }

  function showWhatsappToast(sender, message) {
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = 'whatsapp-toast';
    
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    
    toast.innerHTML = `
      <div class="whatsapp-toast__avatar">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      </div>
      <div class="whatsapp-toast__body">
        <div class="whatsapp-toast__header">
          <span class="whatsapp-toast__sender">${sender}</span>
          <span class="whatsapp-toast__time">${timeStr}</span>
        </div>
        <div class="whatsapp-toast__message">${message}</div>
      </div>
    `;
    
    // Close on click
    toast.addEventListener('click', () => {
      toast.style.animation = 'whatsappSlideOut 0.25s ease-in forwards';
      setTimeout(() => {
        toast.remove();
      }, 250);
    });
    
    container.appendChild(toast);
    playNotificationSound();
    
    // Auto dismiss after 7 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'whatsappSlideOut 0.25s ease-in forwards';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.remove();
          }
        }, 250);
      }
    }, 7000);
  }

  if (alertForm) {
    alertForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const whatsappChecked = whatsappToggle?.checked || false;
      const phoneVal = alertWhatsapp?.value || '';
      const emailVal = document.getElementById('alertEmail')?.value || '';
      const containerRef = trackingInput?.value.trim().toUpperCase() || 'COSCO-GZ-2024-0312';
      
      alertForm.style.display = 'none';
      if (alertSuccess) {
        alertSuccess.classList.remove('hidden');
        alertSuccess.style.animation = 'fadeInUp 0.5s ease-out';
      }
      
      if (whatsappChecked && phoneVal) {
        // Immediate confirmation toast (bilingual)
        setTimeout(() => {
          showWhatsappToast(
            "GZ EMPIRE BAKALA",
            `Abonnement activé ! / Subscription activated!<br>Vous recevrez les alertes pour / Alerts active for: <strong>${containerRef}</strong>.`
          );
        }, 800);
        
        // Delayed simulated status update (10 seconds)
        setTimeout(() => {
          const alertMsg = `🔔 <strong>GZ EMPIRE BAKALA</strong><br><br><strong>Mise à jour / Cargo Status Update</strong><br>Conteneur / Container : <strong>${containerRef}</strong><br>Statut / Status : <strong style="color: #d4af37;">En transit maritime / In Ocean Transit</strong><br><br>Le navire progresse normalement. Prochaine synchronisation dans 2h.<br>Vessel is cruising normally. Next sync in 2h.`;
          showWhatsappToast("GZ EMPIRE BAKALA Tracking", alertMsg);
        }, 10000);
      }

      // Add test buttons in alertSuccess container for live testing
      if (alertSuccess) {
        const existingActions = document.getElementById('alertTestActions');
        if (existingActions) existingActions.remove();
        
        const testActions = document.createElement('div');
        testActions.id = 'alertTestActions';
        testActions.style.cssText = `
          margin-top: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        `;
        
        const cleanPhone = phoneVal.replace(/[\s\-\+\(\)]/g, '');
        const whatsappMsg = encodeURIComponent(`🔔 *GZ EMPIRE BAKALA*\n\n*Mise à jour de cargaison / Cargo Status Update*\n\nConteneur / Container : *${containerRef}*\nStatut / Status : *En transit maritime / In Ocean Transit*\n\nLe navire progresse normalement. / Vessel is cruising normally.\n\nSuivez votre expédition / Track your shipment : https://gz-empire-bakala.com`);
        const emailSubject = encodeURIComponent(`GZ EMPIRE BAKALA - Suivi de Cargaison / Cargo Tracking - ${containerRef}`);
        const emailBody = encodeURIComponent(`Bonjour / Hello,\n\nNous vous informons de la progression de votre expédition chez GZ EMPIRE BAKALA.\nWe inform you about the progress of your shipment at GZ EMPIRE BAKALA.\n\nRéférence de l'envoi / Shipment Reference : ${containerRef}\nStatut actuel / Current Status : En transit maritime (Navire en mer) / In Ocean Transit (Vessel at sea)\n\nVous pouvez consulter les détails complets sur notre site internet en accédant à votre Espace Client.\nYou can view full details in your Client Portal on our website.\n\nCordialement / Regards,\nL'équipe logistique / Logistics Team\nGZ EMPIRE BAKALA\nGuangzhou, Chine`);
        
        let htmlContent = "";
        
        if (whatsappChecked && phoneVal) {
          htmlContent += `
            <a href="https://wa.me/${cleanPhone}?text=${whatsappMsg}" target="_blank" class="btn btn--sm" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 12px; background: #25D366; color: #0b141a; border: none; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.25); text-decoration: none; padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); font-weight: 600;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Tester l'envoi sur WhatsApp
            </a>
          `;
        }
        
        if (emailVal) {
          htmlContent += `
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=${emailVal}&su=${emailSubject}&body=${emailBody}" target="_blank" class="btn btn--sm btn--dark" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 12px; text-decoration: none; padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); font-weight: 600; margin-top: 0; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.15); color: #ffffff;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              Tester l'envoi par Gmail
            </a>
          `;
        }
        
        testActions.innerHTML = htmlContent;
        alertSuccess.appendChild(testActions);
      }
    });
  }

  /* ─── Intercept dynamic translations ─── */
  let currentTranslatePage = window.translatePage || null;
  Object.defineProperty(window, 'translatePage', {
    get() {
      return function(lang) {
        if (currentTranslatePage) {
          currentTranslatePage(lang);
        }
        updateDynamicLabels(lang);
      };
    },
    set(fn) {
      currentTranslatePage = fn;
    },
    configurable: true
  });

  /* ─── Particles & Focus Glow Effects ─── */
  function createHeaderParticles() {
    const container = document.getElementById('headerParticles');
    if (!container) return;

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute;
        width: ${Math.random() * 4 + 1}px;
        height: ${Math.random() * 4 + 1}px;
        background: rgba(212, 175, 55, ${Math.random() * 0.3 + 0.05});
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: float ${Math.random() * 6 + 4}s ease-in-out infinite;
        animation-delay: ${Math.random() * 4}s;
        pointer-events: none;
      `;
      container.appendChild(particle);
    }
  }

  createHeaderParticles();

  if (trackingInput) {
    trackingInput.addEventListener('focus', () => {
      const card = trackingInput.closest('.tracking-search-card');
      if (card) {
        card.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 2px rgba(212, 175, 55, 0.15)';
      }
    });

    trackingInput.addEventListener('blur', () => {
      const card = trackingInput.closest('.tracking-search-card');
      if (card) {
        card.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)';
      }
    });

    trackingInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        trackingForm.dispatchEvent(new Event('submit'));
      }
    });
  }

  // Read and trigger tracking from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const urlNum = urlParams.get('num');
  if (urlNum && trackingInput) {
    trackingInput.value = urlNum.trim();
    performSearch(urlNum.trim());
  }

});

})();
