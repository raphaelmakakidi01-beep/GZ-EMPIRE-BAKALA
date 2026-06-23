/* ============================================================
   GZ-EMPIRE — Client Portal Javascript
   Mock login, responsive sidebar, date display, and Leaflet
   map tracking inside client dashboard
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

  // ─── LOGIN STATE & SWITCH VIEW ───
  const loginView = document.getElementById('loginView');
  const dashboardView = document.getElementById('dashboardView');
  const loginForm = document.getElementById('loginForm');
  const logoutBtn = document.getElementById('logoutBtn');

  // Check persistent login state
  if (localStorage.getItem('gz-empire-user-logged') === 'true') {
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    initializeDashboard();
  }

  // Handle Login Form Submission
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('loginBtn');
      if (submitBtn) {
        submitBtn.classList.add('loading');
      }

      setTimeout(() => {
        if (submitBtn) {
          submitBtn.classList.remove('loading');
        }
        localStorage.setItem('gz-empire-user-logged', 'true');
        loginView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        initializeDashboard();
      }, 1200);
    });
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('gz-empire-user-logged');
      dashboardView.classList.add('hidden');
      loginView.classList.remove('hidden');
    });
  }

  // Social Login mock clicks
  const googleLogin = document.getElementById('googleLogin');
  const phoneLogin = document.getElementById('phoneLogin');
  if (googleLogin) {
    googleLogin.addEventListener('click', () => {
      localStorage.setItem('gz-empire-user-logged', 'true');
      loginView.classList.add('hidden');
      dashboardView.classList.remove('hidden');
      initializeDashboard();
    });
  }
  if (phoneLogin) {
    phoneLogin.addEventListener('click', () => {
      const phone = prompt("Entrez votre numéro de téléphone :");
      if (phone) {
        const code = prompt("Entrez le code OTP reçu par SMS (4 chiffres) :");
        if (code) {
          localStorage.setItem('gz-empire-user-logged', 'true');
          loginView.classList.add('hidden');
          dashboardView.classList.remove('hidden');
          initializeDashboard();
        }
      }
    });
  }

  // Password Visibility Toggle
  const passwordToggle = document.getElementById('passwordToggle');
  const loginPassword = document.getElementById('loginPassword');
  if (passwordToggle && loginPassword) {
    passwordToggle.addEventListener('click', () => {
      const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
      loginPassword.setAttribute('type', type);
      
      const eyeOpen = passwordToggle.querySelector('.eye-open');
      const eyeClosed = passwordToggle.querySelector('.eye-closed');
      
      if (eyeOpen && eyeClosed) {
        eyeOpen.classList.toggle('hidden');
        eyeClosed.classList.toggle('hidden');
      }
    });
  }

  // ─── DASHBOARD SIDEBAR TOGGLE ───
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  if (sidebarToggle && sidebar && sidebarOverlay) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.add('open');
      sidebarOverlay.classList.add('active');
    });
  }

  if (sidebarClose && sidebar && sidebarOverlay) {
    sidebarClose.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('active');
    });
  }

  if (sidebarOverlay && sidebar) {
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('active');
    });
  }

  // ─── TAB SWITCHING LOGIC ───
  function switchTab(sectionId) {
    try {
      // Hide all tab contents
      const tabs = document.querySelectorAll('.tab-content');
      tabs.forEach(tab => tab.classList.remove('show'));

      // Show the active tab content
      const activeTab = document.getElementById(`tab-${sectionId}`);
      if (activeTab) {
        activeTab.classList.add('show');
      }

      // Toggle active class on sidebar items
      const navItems = document.querySelectorAll('.dashboard__nav-item');
      navItems.forEach(nav => {
        if (nav.dataset.section) {
          nav.classList.toggle('active', nav.dataset.section === sectionId);
        }
      });

      // Toggle active class on mobile bottom nav items
      const bottomNavItems = document.querySelectorAll('.mobile-bottom-nav__item');
      bottomNavItems.forEach(nav => {
        if (nav.dataset.section) {
          nav.classList.toggle('active', nav.dataset.section === sectionId);
        }
      });
    } catch (err) {
      console.error("Error in switchTab:", err);
    }
  }

  // Make switchTab available globally
  window.switchTab = switchTab;

  // Sidebar sections clicks
  const navItems = document.querySelectorAll('.dashboard__nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      if (item.classList.contains('dashboard__nav-logout') || item.classList.contains('dashboard__nav-backsite')) return;
      e.preventDefault();
      
      const section = item.dataset.section;
      if (section) {
        switchTab(section);
      }

      // Close mobile sidebar
      if (sidebar) {
        sidebar.classList.remove('open');
      }
      if (sidebarOverlay) {
        sidebarOverlay.classList.remove('active');
      }
    });
  });

  // Mobile bottom nav clicks
  const bottomNavItems = document.querySelectorAll('.mobile-bottom-nav__item');
  bottomNavItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      if (section) {
        switchTab(section);
      }
    });
  });

  // ─── DASHBOARD INITIALIZATION ───
  function initializeDashboard() {
    try {
      // Current date render
      const currentDateEl = document.getElementById('currentDate');
      if (currentDateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateEl.textContent = new Date().toLocaleDateString('fr-FR', options);
      }

      // Default to shipments tab since it's the core visual tracking tab
      switchTab('shipments');
      renderShipmentsQuickList();
      searchShipment();
    } catch (err) {
      console.error("Error in initializeDashboard:", err);
    }
  }

  // ─── LOGISTICS EXPÉDITIONS DATA ───
  const defaultShipments = [
    { container: "GZEMP2024001", origin: "Guangzhou, Chine", destination: "Pointe-Noire, Congo", carrier: "COSCO Shipping", departure: "10 Juin 2026", eta: "28 Juin 2026", status: "transit", photo: "img/package_GZEMP2024001.png", update: "Il y a 2h" },
    { container: "GZEMP2024002", origin: "Foshan, Chine", destination: "Abidjan, Côte d'Ivoire", carrier: "Maersk Line", departure: "12 Juin 2026", eta: "19 Juin 2026", status: "production", photo: "img/package_GZEMP2024002.png", update: "Il y a 1 jour" }
  ];

  function renderShipmentsQuickList() {
    try {
      const quickListContainer = document.getElementById('shipmentsQuickList');
      if (!quickListContainer) return;

      let storedShipments = [];
      try {
        const stored = localStorage.getItem('gz-empire-shipments');
        if (!stored) {
          storedShipments = defaultShipments;
          localStorage.setItem('gz-empire-shipments', JSON.stringify(defaultShipments));
        } else {
          storedShipments = JSON.parse(stored);
          if (!Array.isArray(storedShipments)) storedShipments = defaultShipments;
        }
      } catch (e) {
        storedShipments = defaultShipments;
      }

      // Filter unique valid shipments
      const shipments = storedShipments.filter(s => s && s.container);

      // Current active search value
      const searchInput = document.getElementById('shipmentSearchInput');
      const activeRef = searchInput ? searchInput.value.trim().toUpperCase() : 'GZEMP2024001';

      quickListContainer.innerHTML = '';
      shipments.forEach(s => {
        const isActive = s.container.toUpperCase() === activeRef;
        const pill = document.createElement('div');
        pill.className = `shipment-pill ${isActive ? 'active' : ''}`;
        pill.textContent = s.container;
        pill.addEventListener('click', () => {
          if (searchInput) {
            searchInput.value = s.container;
            searchShipment();
          }
        });
        quickListContainer.appendChild(pill);
      });
    } catch (err) {
      console.error("Error in renderShipmentsQuickList:", err);
    }
  }

  // ─── SHIPMENT SEARCH & DATA MOCK ───
  const shipmentData = {
    'GZEMP2024001': {
      type: "Conteneur maritime (40' HC)",
      ref: "GZEMP2024001",
      statusText: "En Transit Maritime",
      progress: 60, // percentage for fill
      step: 3, // active step (1-5)
      origin: "Guangzhou, Chine",
      dest: "Pointe-Noire, Congo",
      dateOut: "10 Juin 2026",
      dateEta: "28 Juin 2026",
      invoice: "Facture Commerciale INV-2024-001",
      invoiceMeta: "Taille : 240 KB · Générée le 10/06/2026",
      packingList: "Packing List PL-2024-001",
      packingListMeta: "Taille : 185 KB · Générée le 09/06/2026",
      imgSrc: "img/package_GZEMP2024001.png",
      imgName: "Lot Électronique GZEMP2024001",
      imgLabel: "Inspection Validée - Guangzhou",
      notifications: [
        { message: "Le conteneur GZEMP2024001 a passé le détroit de Malacca. En route vers Pointe-Noire.", time: "Aujourd'hui, 14:30", type: "ship" },
        { message: "Transit maritime initié. Le navire a quitté le port de Guangzhou.", time: "10 Juin 2026, 09:00", type: "ship" },
        { message: "Chargement du conteneur validé. Scellé de sécurité apposé.", time: "08 Juin 2026, 16:15", type: "ship" },
        { message: "Facture commerciale INV-2024-001 émise et disponible.", time: "05 Juin 2026, 11:00", type: "invoice" }
      ]
    },
    'GZEMP2024002': {
      type: "Colis / Fret Aérien",
      ref: "GZEMP2024002",
      statusText: "Reçu en Entrepôt",
      progress: 20,
      step: 1,
      origin: "Foshan, Chine",
      dest: "Abidjan, Côte d'Ivoire",
      dateOut: "12 Juin 2026",
      dateEta: "19 Juin 2026",
      invoice: "Facture Commerciale INV-2024-002",
      invoiceMeta: "Taille : 310 KB · Générée le 12/06/2026",
      packingList: "Packing List PL-2024-002",
      packingListMeta: "Taille : 140 KB · Générée le 12/06/2026",
      imgSrc: "img/package_GZEMP2024002.png",
      imgName: "Lot Mobilier & Textiles GZEMP2024002",
      imgLabel: "Contrôle Qualité Effectué - Guangzhou",
      notifications: [
        { message: "Votre colis est prêt pour le chargement. Départ prévu le 15/06.", time: "Aujourd'hui, 18:00", type: "ship" },
        { message: "Rapport de contrôle qualité validé. Photos disponibles.", time: "Aujourd'hui, 15:30", type: "quality" },
        { message: "Colis reçu à notre entrepôt de Guangzhou en provenance de Foshan.", time: "Aujourd'hui, 11:20", type: "ship" },
        { message: "Facture INV-2024-002 émise.", time: "Aujourd'hui, 09:00", type: "invoice" }
      ]
    }
  };

  function searchShipment() {
    try {
      const input = document.getElementById('shipmentSearchInput');
      if (!input) return;
      const ref = input.value.trim().toUpperCase();
      const errorEl = document.getElementById('shipmentSearchError');
      const resultContainer = document.getElementById('shipmentResultContainer');

      // Check if the container exists in localStorage shipments
      let storedShipments = [];
      try {
        const stored = localStorage.getItem('gz-empire-shipments');
        if (!stored) {
          storedShipments = defaultShipments;
          localStorage.setItem('gz-empire-shipments', JSON.stringify(defaultShipments));
        } else {
          storedShipments = JSON.parse(stored);
          if (!Array.isArray(storedShipments)) storedShipments = defaultShipments;
        }
      } catch (e) {
        storedShipments = defaultShipments;
      }
      
      const localShip = storedShipments.find(s => s && s.container === ref);
      let data = null;

      const statusMap = {
        commande: { step: 1, text: "Commande confirmée", progress: 10 },
        production: { step: 1, text: "Production terminée", progress: 25 },
        qualite: { step: 2, text: "Qualité validée", progress: 40 },
        chargement: { step: 2, text: "Chargement", progress: 50 },
        transit: { step: 3, text: "En transit maritime", progress: 65 },
        arrivee: { step: 4, text: "Arrivée Port", progress: 80 },
        douane: { step: 4, text: "Dédouanement", progress: 90 },
        livre: { step: 5, text: "Livraison finale", progress: 100 }
      };

      if (localShip) {
        const currentStatus = localStorage.getItem(`gz-empire-shipment-status-${ref}`) || localShip.status || 'transit';
        const statusMeta = statusMap[currentStatus] || { step: 3, text: "En transit maritime", progress: 65 };
        const storedPhoto = localStorage.getItem(`gz-empire-shipment-photo-${ref}`) || localShip.photo || 'img/package_generic.png';

        data = {
          type: ref.startsWith("GZEMP") ? "Conteneur maritime (40' HC)" : "Colis / Fret Aérien",
          ref: localShip.container,
          statusText: statusMeta.text,
          progress: statusMeta.progress,
          step: statusMeta.step,
          origin: localShip.origin,
          dest: localShip.destination,
          dateOut: localShip.departure || "Non spécifiée",
          dateEta: localShip.eta || "Non spécifiée",
          invoice: `Facture Commerciale INV-2024-${localShip.container}`,
          invoiceMeta: `Taille : 240 KB · Générée le ${localShip.departure || '10/06/2026'}`,
          packingList: `Packing List PL-2024-${localShip.container}`,
          packingListMeta: `Taille : 185 KB · Générée le ${localShip.departure || '09/06/2026'}`,
          imgSrc: storedPhoto,
          imgName: `Lot Cargaison ${localShip.container}`,
          imgLabel: "Inspection Entrepôt - Guangzhou",
          notifications: [
            { message: `Statut actuel : ${statusMeta.text}.`, time: "À l'instant", type: "ship" },
            { message: `Expédition depuis ${localShip.origin} vers ${localShip.destination} en cours.`, time: "Date départ : " + (localShip.departure || 'Non spécifiée'), type: "ship" }
          ]
        };
      } else if (shipmentData[ref]) {
        data = shipmentData[ref];
        
        // If default shipment, read overridden status and photo if present
        const currentStatus = localStorage.getItem(`gz-empire-shipment-status-${ref}`);
        if (currentStatus && statusMap[currentStatus]) {
          data.statusText = statusMap[currentStatus].text;
          data.progress = statusMap[currentStatus].progress;
          data.step = statusMap[currentStatus].step;
        }
        
        const storedPhoto = localStorage.getItem(`gz-empire-shipment-photo-${ref}`);
        if (storedPhoto) {
          data.imgSrc = storedPhoto;
        }
      }

      if (!data) {
        if (errorEl) errorEl.classList.remove('hidden');
        if (resultContainer) resultContainer.classList.add('hidden');
        return;
      }

      if (errorEl) errorEl.classList.add('hidden');
      if (resultContainer) resultContainer.classList.remove('hidden');

      const dataObj = data; // Keep compatibility below

      // Update texts defensively
      const badgeType = document.getElementById('shipmentBadgeType');
      if (badgeType) badgeType.textContent = data.type;
      
      const titleRef = document.getElementById('shipmentTitleRef');
      if (titleRef) titleRef.textContent = `Suivi Expédition: ${data.ref}`;
      
      const statusText = document.getElementById('shipmentStatusText');
      if (statusText) statusText.textContent = data.statusText;
      
      const origin = document.getElementById('shipmentOrigin');
      if (origin) origin.textContent = data.origin;
      
      const dest = document.getElementById('shipmentDest');
      if (dest) dest.textContent = data.dest;
      
      const dateOut = document.getElementById('shipmentDateOut');
      if (dateOut) dateOut.textContent = data.dateOut;
      
      const dateEta = document.getElementById('shipmentDateEta');
      if (dateEta) dateEta.textContent = data.dateEta;

      // Update invoice docs defensively
      const invoiceName = document.getElementById('invoiceName');
      if (invoiceName) invoiceName.textContent = data.invoice;
      
      const invoiceMeta = document.getElementById('invoiceMeta');
      if (invoiceMeta) invoiceMeta.textContent = data.invoiceMeta;
      
      const packingListName = document.getElementById('packingListName');
      if (packingListName) packingListName.textContent = data.packingList;
      
      const packingListMeta = document.getElementById('packingListMeta');
      if (packingListMeta) packingListMeta.textContent = data.packingListMeta;

      // Update package photo defensively
      const packageImg = document.getElementById('shipmentPackageImg');
      if (packageImg) {
        packageImg.src = data.imgSrc;
      }
      
      const packageName = document.getElementById('shipmentPackageName');
      if (packageName) packageName.textContent = data.imgName;
      
      const packageLabel = document.getElementById('shipmentPackageLabel');
      if (packageLabel) packageLabel.textContent = data.imgLabel;

      // Update Stepper
      for (let i = 1; i <= 5; i++) {
        const stepNode = document.getElementById(`step-${i}`);
        if (!stepNode) continue;
        
        stepNode.classList.remove('completed', 'active');
        const stepIcon = stepNode.querySelector('.tracker-step__icon');
        
        if (i < data.step) {
          stepNode.classList.add('completed');
          if (stepIcon) stepIcon.innerHTML = '✓';
        } else if (i === data.step) {
          stepNode.classList.add('active');
          if (stepIcon) {
            stepIcon.innerHTML = '<span class="pulse-dot"></span>';
          }
        } else {
          if (stepIcon) stepIcon.innerHTML = i;
        }
      }

      // Update progress fill bar width
      const fillBar = document.getElementById('trackerProgressFill');
      if (fillBar) {
        fillBar.style.width = `${data.progress}%`;
      }

      // Update Notifications
      const feed = document.getElementById('shipmentNotificationsFeed');
      if (feed) {
        feed.innerHTML = '';
        data.notifications.forEach(notif => {
          let iconHtml = '';
          if (notif.type === 'ship') {
            iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M20 18v-2a4 4 0 0 0-4-4H9V9a1 1 0 0 1 1-1h2a2 2 0 0 0 2-2V4a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v2a2 2 0 0 0 2 2h1a1 1 0 0 1 1 1v3H6a4 4 0 0 0-4 4v2"/></svg>`;
          } else if (notif.type === 'invoice') {
            iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`;
          } else {
            iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`;
          }

          const iconClass = notif.type === 'ship' ? 'notification-item__icon--ship' : (notif.type === 'invoice' ? 'notification-item__icon--invoice' : 'notification-item__icon--quality');

          feed.innerHTML += `
            <div class="notification-item">
              <div class="notification-item__icon ${iconClass}">
                ${iconHtml}
              </div>
              <div class="notification-item__content">
                <p class="notification-item__message">${notif.message}</p>
                <span class="notification-item__time">${notif.time}</span>
              </div>
            </div>
          `;
        });
      }
      renderShipmentsQuickList();
    } catch (err) {
      console.error("Error in searchShipment:", err);
    }
  }

  // Bind Search triggers
  const searchBtn = document.getElementById('shipmentSearchBtn');
  const searchInput = document.getElementById('shipmentSearchInput');

  if (searchBtn) {
    searchBtn.addEventListener('click', searchShipment);
  }
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchShipment();
      }
    });
  }

  // Global functions for photo uploads and forms
  window.previewProductPhoto = function(event) {
    const input = event.target;
    const previewContainer = document.getElementById('productPhotoPreviewContainer');
    const previewImg = document.getElementById('productPhotoPreview');
    
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) {
        previewImg.src = e.target.result;
        previewContainer.classList.remove('hidden');
      }
      reader.readAsDataURL(input.files[0]);
    }
  };

  window.removeProductPhoto = function() {
    const input = document.getElementById('productPhotoFile');
    const previewContainer = document.getElementById('productPhotoPreviewContainer');
    const previewImg = document.getElementById('productPhotoPreview');
    
    input.value = '';
    previewImg.src = '#';
    previewContainer.classList.add('hidden');
  };

  window.submitBookingForm = function() {
    const reason = document.getElementById('bookingReason').value;
    const cities = document.getElementById('bookingCities').value;
    const startDate = document.getElementById('bookingStartDate').value;
    const endDate = document.getElementById('bookingEndDate').value;

    const bookingHistoryList = document.getElementById('bookingHistoryList');
    if (bookingHistoryList) {
      const formattedStart = new Date(startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
      const formattedEnd = new Date(endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

      // Gather checklist
      let needs = [];
      if (document.getElementById('needInterpreter').checked) needs.push("Interprète");
      if (document.getElementById('needCar').checked) needs.push("Chauffeur");
      if (document.getElementById('needHotel').checked) needs.push("Hôtel");
      if (document.getElementById('needVisa').checked) needs.push("Invitation Visa");
      const needsStr = needs.length > 0 ? needs.join(', ') : "Aucune assistance spécifique";

      const newItem = `
        <div class="action-item" style="padding-bottom: var(--space-4); animation: fadeIn 0.4s ease-out;">
          <div class="action-item__dot warning" style="margin-top: 8px;"></div>
          <div class="action-item__content">
            <p class="action-item__text" style="font-weight: 600;">${reason}</p>
            <p style="font-size: var(--text-xs); color: var(--gray-500); margin-top: 2px;">Villes : ${cities} · Dates : ${formattedStart} - ${formattedEnd} · Besoins : ${needsStr}</p>
            <span class="badge badge--warning" style="width: fit-content; margin-top: var(--space-2); font-size: 10px;">En attente de traitement</span>
          </div>
        </div>
      `;
      bookingHistoryList.insertAdjacentHTML('afterbegin', newItem);
    }

    // Reset Form
    document.getElementById('bookingForm').reset();
    alert("Votre demande de réservation d'accompagnement a été soumise avec succès. Notre équipe vous contactera dans les plus brefs délais.");
  };

  window.submitPurchasingForm = function() {
    const desc = document.getElementById('productDesc').value;
    const qty = document.getElementById('productQty').value;
    const budget = document.getElementById('productBudget').value;

    const purchasingHistoryTable = document.getElementById('purchasingHistoryTable');
    if (purchasingHistoryTable) {
      const newRow = `
        <tr style="animation: fadeIn 0.4s ease-out;">
          <td>
            <div class="order-product">
              <div class="order-product__icon" style="background:rgba(245,158,11,0.1);color:var(--warning);">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
              </div>
              <span style="font-weight: 600;">${desc.substring(0, 30)}${desc.length > 30 ? '...' : ''}</span>
            </div>
          </td>
          <td>${qty}</td>
          <td>$${parseFloat(budget).toLocaleString()}</td>
          <td><span class="badge badge--warning">En attente</span></td>
        </tr>
      `;
      purchasingHistoryTable.insertAdjacentHTML('afterbegin', newRow);
    }

    // Reset Form
    document.getElementById('purchasingForm').reset();
    window.removeProductPhoto();
    alert("Votre demande d'achat direct a été transmise. Nos acheteurs négocient le meilleur prix auprès des fournisseurs chinois.");
  };

  window.downloadInvoiceMock = function() {
    const input = document.getElementById('shipmentSearchInput');
    const ref = input ? input.value.trim().toUpperCase() : 'GZEMP2024001';
    alert(`Téléchargement de la facture INV-2024-${ref === 'GZEMP2024002' ? '002' : '001'} au format PDF...`);
  };

  // ─── NOTIFICATIONS DROPDOWN ENGINE ───
  const notifBtn = document.getElementById('notifBtn');
  const notifBadge = document.getElementById('notifBadge');
  const notificationsDropdown = document.getElementById('notificationsDropdown');
  const notificationsDropdownList = document.getElementById('notificationsDropdownList');
  const markAllRead = document.getElementById('markAllRead');

  const defaultNotifications = [
    { id: 1, ref: 'GZEMP2024001', message: 'Le conteneur GZEMP2024001 est en transit maritime.', time: 'Il y a 10 min', type: 'ship', read: false },
    { id: 2, ref: 'GZEMP2024002', message: 'Photos de contrôle qualité prêtes pour le colis GZEMP2024002.', time: 'Il y a 2 heures', type: 'quality', read: false },
    { id: 3, ref: 'GZEMP2024001', message: 'Facture INV-2024-001 émise pour votre expédition.', time: 'Hier', type: 'invoice', read: false }
  ];

  function renderDropdownNotifications() {
    if (!notificationsDropdownList) return;
    
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem('gz-empire-portal-notifications') || '[]');
    } catch (e) {}

    if (list.length === 0) {
      list = [...defaultNotifications];
      localStorage.setItem('gz-empire-portal-notifications', JSON.stringify(list));
    }

    const unreadCount = list.filter(n => !n.read).length;
    if (notifBadge) {
      if (unreadCount > 0) {
        notifBadge.textContent = unreadCount;
        notifBadge.style.display = 'flex';
      } else {
        notifBadge.style.display = 'none';
      }
    }

    notificationsDropdownList.innerHTML = '';
    list.forEach(notif => {
      let iconSvg = '';
      let iconColor = 'rgba(212, 175, 55, 0.1)';

      if (notif.type === 'ship') {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M20 18v-2a4 4 0 0 0-4-4H9V9a1 1 0 0 1 1-1h2a2 2 0 0 0 2-2V4a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v2a2 2 0 0 0 2 2h1a1 1 0 0 1 1 1v3H6a4 4 0 0 0-4 4v2"/></svg>`;
        iconColor = 'rgba(59, 130, 246, 0.1)';
      } else if (notif.type === 'invoice') {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`;
        iconColor = 'rgba(245, 158, 11, 0.1)';
      } else {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`;
        iconColor = 'rgba(16, 185, 129, 0.1)';
      }

      const readDot = notif.read ? '' : `<span style="width: 6px; height: 6px; background: var(--gold); border-radius: 50%; display: inline-block;"></span>`;

      notificationsDropdownList.innerHTML += `
        <div class="header-notif-item" data-ref="${notif.ref}" data-id="${notif.id}" style="display: flex; gap: 12px; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid rgba(255,255,255,0.03); align-items: flex-start;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: ${iconColor}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${iconSvg}
          </div>
          <div style="flex: 1;">
            <p style="margin: 0; font-size: 11px; color: ${notif.read ? '#9CA3AF' : '#FFF'}; font-weight: ${notif.read ? '500' : '600'}; line-height: 1.4;">${notif.message}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
              <span style="font-size: 9px; color: #6B7280;">${notif.time}</span>
              ${readDot}
            </div>
          </div>
        </div>
      `;
    });

    const items = notificationsDropdownList.querySelectorAll('.header-notif-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const ref = item.dataset.ref;
        const id = parseInt(item.dataset.id);
        
        try {
          const list = JSON.parse(localStorage.getItem('gz-empire-portal-notifications') || '[]');
          const updated = list.map(n => n.id === id ? { ...n, read: true } : n);
          localStorage.setItem('gz-empire-portal-notifications', JSON.stringify(updated));
        } catch (e) {}

        renderDropdownNotifications();
        switchTab('shipments');
        const searchInput = document.getElementById('shipmentSearchInput');
        if (searchInput) {
          searchInput.value = ref;
          searchShipment();
        }

        if (notificationsDropdown) {
          notificationsDropdown.style.display = 'none';
        }
      });
    });
  }

  if (notifBtn && notificationsDropdown) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = notificationsDropdown.style.display === 'block';
      notificationsDropdown.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        renderDropdownNotifications();
      }
    });

    document.addEventListener('click', (e) => {
      if (!notificationsDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
        notificationsDropdown.style.display = 'none';
      }
    });
  }

  if (markAllRead) {
    markAllRead.addEventListener('click', (e) => {
      e.stopPropagation();
      try {
        let list = JSON.parse(localStorage.getItem('gz-empire-portal-notifications') || '[]');
        const updated = list.map(n => ({ ...n, read: true }));
        localStorage.setItem('gz-empire-portal-notifications', JSON.stringify(updated));
      } catch (err) {}
      renderDropdownNotifications();
    });
  }

  renderDropdownNotifications();

  // ─── LIGHTBOX MODAL ENGINE ───
  const photoLightbox = document.getElementById('photoLightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const closeLightboxBtn = document.getElementById('closeLightboxBtn');

  function openLightbox(src) {
    if (!photoLightbox || !lightboxImg || !src || src === '#') return;
    lightboxImg.src = src;
    photoLightbox.style.display = 'flex';
  }

  function closeLightbox() {
    if (!photoLightbox) return;
    photoLightbox.style.display = 'none';
  }

  document.body.addEventListener('click', (e) => {
    // Check for package visualizer card click (or child of it)
    const visualizerCard = e.target.closest('.package-visualizer-card');
    if (visualizerCard) {
      const img = visualizerCard.querySelector('img');
      if (img && img.src && img.getAttribute('src') !== '#') {
        openLightbox(img.src);
        return;
      }
    }

    // Check for product photo preview container click
    const productPreview = e.target.closest('#productPhotoPreviewContainer');
    if (productPreview) {
      // Avoid triggering when clicking the remove button (✕)
      if (e.target.tagName === 'BUTTON' || e.target.textContent === '✕') {
        return;
      }
      const img = productPreview.querySelector('img');
      if (img && img.src && img.getAttribute('src') !== '#') {
        openLightbox(img.src);
        return;
      }
    }

    // Fallback direct targets
    const target = e.target;
    if (target.id === 'shipmentPackageImg' || target.id === 'productPhotoPreview') {
      if (target.src && target.getAttribute('src') !== '#') {
        openLightbox(target.src);
      }
    }
  });

  if (closeLightboxBtn) {
    closeLightboxBtn.addEventListener('click', closeLightbox);
  }

  if (photoLightbox) {
    photoLightbox.addEventListener('click', (e) => {
      if (e.target === photoLightbox) {
        closeLightbox();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
      if (notificationsDropdown) {
        notificationsDropdown.style.display = 'none';
      }
    }
  });

  // Sync changes from other tabs (e.g. admin panel adding packages)
  window.addEventListener('storage', (e) => {
    if (e.key === 'gz-empire-shipments') {
      renderShipmentsQuickList();
      searchShipment();
    }
  });
});

})();
