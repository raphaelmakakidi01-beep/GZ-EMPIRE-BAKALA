/* ============================================================
   GZ-EMPIRE — Administration Dashboard Logic
   Tab management, CRM table populating, Chart.js integrations,
   localStorage synchronization with tracking.html and contact.html
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

  // ─── AUTHENTICATION CHECK ───
  const adminLoginView = document.getElementById('adminLoginView');
  const adminDashboardView = document.getElementById('adminDashboardView');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');

  // Check login state
  try {
    if (localStorage.getItem('gz-empire-admin-logged') === 'true') {
      if (adminLoginView) adminLoginView.style.display = 'none';
      if (adminDashboardView) adminDashboardView.classList.add('show');
      initializeDashboard();
    }
  } catch (err) {
    console.error("Error checking login state on startup:", err);
  }

  // Handle Login
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      localStorage.setItem('gz-empire-admin-logged', 'true');
      if (adminLoginView) adminLoginView.style.display = 'none';
      if (adminDashboardView) adminDashboardView.classList.add('show');
      try {
        initializeDashboard();
      } catch (err) {
        console.error("Error initializing dashboard after login:", err);
      }
    });
  }

  // Handle Logout
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', () => {
      localStorage.removeItem('gz-empire-admin-logged');
      if (adminDashboardView) adminDashboardView.classList.remove('show');
      if (adminLoginView) adminLoginView.style.display = 'flex';
    });
  }

  // ─── TAB MANAGEMENT ───
  const navItems = document.querySelectorAll('.admin-nav-item');
  const tabContents = document.querySelectorAll('.tab-content');
  const titleEl = document.getElementById('adminPanelTitle');
  const subtitleEl = document.getElementById('adminPanelSubtitle');
  const breadcrumbEl = document.getElementById('adminBreadcrumbPage');

  const tabMeta = {
    dashboard: {
      title: "Tableau de bord",
      subtitle: "Aperçu en temps réel des activités et leads qualifiés par notre support."
    },
    prospects: {
      title: "Prospects Qualifiés (CRM)",
      subtitle: "Base de données client qualifiée par notre équipe de support et les formulaires."
    },
    orders: {
      title: "Commandes clients",
      subtitle: "Suivi de production, facturation et préparation logistique."
    },
    shipments: {
      title: "Gestion des expéditions",
      subtitle: "Mise à jour des conteneurs, transit maritime et statuts de livraison."
    },
    chats: {
      title: "Historique des Chats Support",
      subtitle: "Historique et transcriptions des conversations du conseiller de support."
    },
    stats: {
      title: "Statistiques avancées",
      subtitle: "Rapports détaillés de performance commerciale et d'efficacité logistique."
    },
    settings: {
      title: "Configurations de la plateforme",
      subtitle: "Ajustez les webhooks, le conseiller support et les coordonnées."
    }
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabName = item.dataset.tab;
      
      // Update active nav item
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Update active tab content panel
      tabContents.forEach(tab => tab.classList.remove('show'));
      const targetTab = document.getElementById(`tab-${tabName}`);
      if (targetTab) {
        targetTab.classList.add('show');
      }

      // Update titles
      if (tabMeta[tabName]) {
        titleEl.textContent = tabMeta[tabName].title;
        subtitleEl.textContent = tabMeta[tabName].subtitle;
        if (breadcrumbEl) breadcrumbEl.textContent = tabMeta[tabName].title;
      }

      // Re-render charts to fix Chart.js canvas size calculations inside active tabs
      if (tabName === 'stats' || tabName === 'dashboard') {
        setTimeout(renderCharts, 100);
      }

      // Close mobile sidebar if open
      const sidebar = document.querySelector('.admin-sidebar');
      if (sidebar) sidebar.classList.remove('open');
    });
  });

  // Mobile sidebar toggle
  const mobileToggle = document.getElementById('adminSidebarToggle');
  const sidebar = document.querySelector('.admin-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // ─── INITIALIZATION & DATA RENDERING ───
  function initializeDashboard() {
    // Setup Live date in welcoming banner
    const liveDateEl = document.getElementById('liveDate');
    if (liveDateEl) {
      const options = { day: 'numeric', month: 'long', year: 'numeric' };
      liveDateEl.textContent = new Date().toLocaleDateString('fr-FR', options);
    }

    // Dashboard Internal Tabs Switcher
    const btnShowProspects = document.getElementById('btnShowProspects');
    const btnShowShipments = document.getElementById('btnShowShipments');
    const internalTabProspects = document.getElementById('internalTabProspects');
    const internalTabShipments = document.getElementById('internalTabShipments');

    if (btnShowProspects && btnShowShipments && internalTabProspects && internalTabShipments) {
      btnShowProspects.onclick = () => {
        btnShowProspects.classList.add('active');
        btnShowShipments.classList.remove('active');
        internalTabProspects.classList.add('show');
        internalTabShipments.classList.remove('show');
      };

      btnShowShipments.onclick = () => {
        btnShowShipments.classList.add('active');
        btnShowProspects.classList.remove('active');
        internalTabShipments.classList.add('show');
        internalTabProspects.classList.remove('show');
      };
    }

    // Internal Dashboard link redirections
    const linkToProspectsTab = document.getElementById('linkToProspectsTab');
    if (linkToProspectsTab) {
      linkToProspectsTab.onclick = () => {
        const tab = document.querySelector('.admin-nav-item[data-tab="prospects"]');
        if (tab) tab.click();
      };
    }
    const linkToShipmentsTab = document.getElementById('linkToShipmentsTab');
    if (linkToShipmentsTab) {
      linkToShipmentsTab.onclick = () => {
        const tab = document.querySelector('.admin-nav-item[data-tab="shipments"]');
        if (tab) tab.click();
      };
    }

    try { loadProspectsData(); } catch (e) { console.error("Error loading prospects:", e); }
    try { loadShipmentsData(); } catch (e) { console.error("Error loading shipments:", e); }
    try { loadChatsData(); } catch (e) { console.error("Error loading chats:", e); }
    try { renderCharts(); } catch (e) { console.error("Error rendering charts:", e); }
  }

  // ─── CRM PROSPECTS DATA ───
  const defaultProspects = [
    { name: "Jean-Baptiste K.", email: "jb.k@gmail.com", phone: "+242 06 884 9928", country: "Congo-Brazzaville", product: "Électronique (Laptops)", budget: "$15,000", status: "qualifie", date: "10/05/2024" },
    { name: "Amina Keita", email: "a.keita@yahoo.fr", phone: "+225 07 482 9918", country: "Côte d'Ivoire", product: "Textiles & Vêtements", budget: "$8,500", status: "nouveau", date: "11/05/2024" },
    { name: "Pierre Claver", email: "p.claver@soneca.net", phone: "+237 699 47 18 29", country: "Cameroun", product: "Pièces de rechange auto", budget: "$22,000", status: "contacte", date: "12/05/2024" },
    { name: "Sarah Deng", email: "sarah.d@gz-sourcing.cn", phone: "+86 138 2901 8847", country: "Chine (Sourcing)", product: "Accompagnement Foires VIP", budget: "$3,000", status: "converti", date: "13/05/2024" },
    { name: "Koffi Yao", email: "yao.koffi@fret.ci", phone: "+225 01 0293 8849", country: "Sénégal", product: "Matériaux de Construction", budget: "$45,000", status: "perdu", date: "09/05/2024" }
  ];

  function loadProspectsData() {
    try {
      // Check if we already have prospects in localStorage
      let storedProspects = localStorage.getItem('gz-empire-prospects');
      let prospects = [];

      if (!storedProspects) {
        prospects = defaultProspects;
        localStorage.setItem('gz-empire-prospects', JSON.stringify(prospects));
      } else {
        try {
          prospects = JSON.parse(storedProspects);
          if (!Array.isArray(prospects)) prospects = defaultProspects;
        } catch (e) {
          console.error("Error parsing prospects from localStorage:", e);
          prospects = defaultProspects;
        }
      }

      // Filter out invalid items
      prospects = prospects.filter(p => p && typeof p === 'object');

      // Update stats counters
      const prospectsCountEl = document.getElementById('statProspectsCount');
      const badgeCountEl = document.getElementById('prospectBadgeCount');
      if (prospectsCountEl) prospectsCountEl.textContent = prospects.length;
      if (badgeCountEl) badgeCountEl.textContent = prospects.length;

      // Render in dashboard (last 5 items)
      const dashboardBody = document.getElementById('prospectsTableBody');
      if (dashboardBody) {
        dashboardBody.innerHTML = '';
        prospects.slice(0, 5).forEach(p => {
          dashboardBody.appendChild(createProspectRow(p, false));
        });
      }

      // Render in full list
      const fullBody = document.getElementById('fullProspectsTableBody');
      if (fullBody) {
        fullBody.innerHTML = '';
        prospects.forEach(p => {
          fullBody.appendChild(createProspectRow(p, true));
        });
      }

      // Add search listener
      const searchInput = document.getElementById('prospectsSearchInput');
      if (searchInput && fullBody) {
        searchInput.addEventListener('input', () => {
          const query = searchInput.value.toLowerCase();
          const rows = fullBody.querySelectorAll('tr');
          rows.forEach((row, idx) => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
          });
          // Reset filter pills to "Tous" when text searching
          const allPill = document.querySelector('#prospectsFilterPills button[data-filter="all"]');
          if (allPill) {
            document.querySelectorAll('#prospectsFilterPills .admin-filter-pill').forEach(p => p.classList.remove('active'));
            allPill.classList.add('active');
          }
        });
      }

      // Dynamic Filter Pills Logic
      const filterPills = document.querySelectorAll('#prospectsFilterPills .admin-filter-pill');
      if (filterPills.length > 0 && fullBody) {
        filterPills.forEach(pill => {
          pill.onclick = () => {
            document.querySelectorAll('#prospectsFilterPills .admin-filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            if (searchInput) searchInput.value = '';
            
            const filterValue = pill.dataset.filter;
            const rows = fullBody.querySelectorAll('tr');
            rows.forEach(row => {
              const statusBadge = row.querySelector('.status-badge');
              if (!statusBadge) return;
              
              const classes = statusBadge.className;
              const rowStatus = classes.includes('status-badge--nouveau') ? 'nouveau' :
                                classes.includes('status-badge--contacte') ? 'contacte' :
                                classes.includes('status-badge--qualifie') ? 'qualifie' :
                                classes.includes('status-badge--converti') ? 'converti' :
                                classes.includes('status-badge--perdu') ? 'perdu' : '';
              
              if (filterValue === 'all' || rowStatus === filterValue) {
                row.style.display = '';
              } else {
                row.style.display = 'none';
              }
            });
          };
        });
      }
    } catch (err) {
      console.error("Error in loadProspectsData:", err);
    }
  }

  function createProspectRow(p, isFull) {
    const tr = document.createElement('tr');
    
    // Status color mapping
    const statusTextMap = {
      nouveau: "Nouveau",
      contacte: "Contacté",
      qualifie: "Qualifié",
      converti: "Converti",
      perdu: "Perdu"
    };
    
    const formattedStatus = p.status ? p.status.toLowerCase() : 'nouveau';
    const statusText = statusTextMap[formattedStatus] || "Nouveau";

    let html = `
      <td><strong>${escapeHTML(p.name)}</strong></td>
      <td>${escapeHTML(p.email)}</td>
    `;

    if (isFull) {
      html += `<td>${escapeHTML(p.phone || '-')}</td>`;
    }

    html += `
      <td>${escapeHTML(p.country)}</td>
      <td>${escapeHTML(p.product)}</td>
    `;

    if (isFull) {
      html += `<td>${escapeHTML(p.budget || '-')}</td>`;
    }

    html += `
      <td><span class="status-badge status-badge--${formattedStatus}">${statusText}</span></td>
      <td>${escapeHTML(p.date)}</td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="admin-action-btn admin-action-btn--view" title="Voir détails" onclick="alert('Détails Prospect:\\n\\nNom: ${escapeQuotes(p.name)}\\nEmail: ${escapeQuotes(p.email)}\\nPhone: ${escapeQuotes(p.phone || '-')}\\nPays: ${escapeQuotes(p.country)}\\nProduit: ${escapeQuotes(p.product)}\\nBudget: ${escapeQuotes(p.budget || '-')}')" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; padding:0;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="admin-action-btn admin-action-btn--whatsapp" title="WhatsApp" onclick="window.open('https://wa.me/${p.phone ? p.phone.replace(/[^0-9]/g, '') : '8618320050031'}')" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; padding:0;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>
        </div>
      </td>
    `;

    tr.innerHTML = html;
    return tr;
  }

  // Helper to escape HTML characters
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function escapeQuotes(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }

  // ─── LOGISTICS EXPÉDITIONS DATA ───
  const defaultShipments = [
    { container: "GZEMP2024001", origin: "Guangzhou (Port)", destination: "Pointe-Noire (Port)", carrier: "COSCO Shipping", departure: "15/03/2024", eta: "28/04/2024", status: "transit", photo: "img/package_GZEMP2024001.png", update: "Il y a 2h" },
    { container: "GZEMP2024002", origin: "Guangzhou (Port)", destination: "Abidjan (Port)", carrier: "Maersk Line", departure: "20/03/2024", eta: "05/05/2024", status: "production", photo: "img/package_GZEMP2024002.png", update: "Il y a 1 jour" }
  ];

  let shipments = [];

  function loadShipmentsData() {
    try {
      let storedShipments = localStorage.getItem('gz-empire-shipments');

      if (!storedShipments) {
        shipments = defaultShipments;
        localStorage.setItem('gz-empire-shipments', JSON.stringify(shipments));
      } else {
        try {
          shipments = JSON.parse(storedShipments);
          if (!Array.isArray(shipments)) shipments = defaultShipments;
        } catch (e) {
          console.error("Error parsing shipments from localStorage:", e);
          shipments = defaultShipments;
        }
      }

      // Filter out invalid items
      shipments = shipments.filter(s => s && typeof s === 'object');

      // Update active shipments count
      const activeShipmentsBadge = document.getElementById('activeShipmentsBadge');
      const statTransitCount = document.getElementById('statTransitCount');
      if (activeShipmentsBadge) activeShipmentsBadge.textContent = shipments.length;
      if (statTransitCount) statTransitCount.textContent = shipments.filter(s => s && (s.status === 'transit' || s.status === 'qualite' || s.status === 'chargement')).length || shipments.length;

      // Render table
      const shipmentsBody = document.getElementById('adminShipmentsTableBody');
      if (shipmentsBody) {
        shipmentsBody.innerHTML = '';
        shipments.forEach((s, index) => {
          if (!s) return;
          const tr = document.createElement('tr');
          
          // Load custom status override from localStorage if set (shared with tracking.html)
          const localStatusKey = `gz-empire-shipment-status-${s.container}`;
          const currentStatus = localStorage.getItem(localStatusKey) || s.status;

          tr.innerHTML = `
            <td><strong>${escapeHTML(s.container)}</strong></td>
            <td>${escapeHTML(s.origin)}</td>
            <td>${escapeHTML(s.destination)}</td>
            <td>${escapeHTML(s.carrier)}</td>
            <td>${escapeHTML(s.departure)}</td>
            <td>${escapeHTML(s.eta)}</td>
            <td>
              <select class="admin-shipment-status" data-container="${escapeHTML(s.container)}">
                <option value="commande" ${currentStatus === 'commande' ? 'selected' : ''}>Commande confirmée</option>
                <option value="production" ${currentStatus === 'production' ? 'selected' : ''}>Production terminée</option>
                <option value="qualite" ${currentStatus === 'qualite' ? 'selected' : ''}>Qualité validée</option>
                <option value="chargement" ${currentStatus === 'chargement' ? 'selected' : ''}>Chargement</option>
                <option value="transit" ${currentStatus === 'transit' ? 'selected' : ''}>En transit maritime</option>
                <option value="arrivee" ${currentStatus === 'arrivee' ? 'selected' : ''}>Arrivée Port</option>
                <option value="douane" ${currentStatus === 'douane' ? 'selected' : ''}>Dédouanement</option>
                <option value="livre" ${currentStatus === 'livre' ? 'selected' : ''}>Livraison finale</option>
              </select>
            </td>
            <td>${escapeHTML(s.update)}</td>
            <td>
              <div style="display:flex; gap:6px;">
                <button class="admin-action-btn admin-action-btn--edit btn-edit-shipment" data-index="${index}" title="Modifier" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; padding:0;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                <button class="admin-action-btn admin-action-btn--delete btn-delete-shipment" data-index="${index}" title="Supprimer" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; padding:0; background:rgba(239,68,68,0.1); color:#EF4444; border:none; border-radius: var(--radius-md); cursor:pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
              </div>
            </td>
          `;
          
          shipmentsBody.appendChild(tr);
        });

        // Add change listeners
        const statusSelects = shipmentsBody.querySelectorAll('.admin-shipment-status');
        statusSelects.forEach(select => {
          select.addEventListener('change', (e) => {
            const containerId = select.dataset.container;
            const newStatus = select.value;
            
            // Save status override in localStorage to be read by tracking.html
            localStorage.setItem(`gz-empire-shipment-status-${containerId}`, newStatus);
            
            // Also update main array
            const idx = shipments.findIndex(ship => ship && ship.container === containerId);
            if (idx !== -1) {
              shipments[idx].status = newStatus;
              shipments[idx].update = "À l'instant";
              localStorage.setItem('gz-empire-shipments', JSON.stringify(shipments));
            }

            // Sync notification to client portal
            try {
              let notifs = JSON.parse(localStorage.getItem('gz-empire-portal-notifications') || '[]');
              const statusLabels = {
                commande: "Commande confirmée",
                production: "Production terminée",
                qualite: "Qualité validée",
                chargement: "Chargement",
                transit: "En transit maritime",
                arrivee: "Arrivée Port",
                douane: "Dédouanement",
                livre: "Livraison finale"
              };
              const newNotif = {
                id: Date.now(),
                ref: containerId,
                message: `L'expédition ${containerId} a été mise à jour : ${statusLabels[newStatus] || newStatus}.`,
                time: "À l'instant",
                type: newStatus === 'qualite' ? 'quality' : (newStatus === 'douane' ? 'invoice' : 'ship'),
                read: false
              };
              notifs.unshift(newNotif);
              if (notifs.length > 20) notifs = notifs.slice(0, 20);
              localStorage.setItem('gz-empire-portal-notifications', JSON.stringify(notifs));
            } catch (err) {
              console.error("Error syncing status update notification:", err);
            }
            
            alert(`Statut du conteneur ${containerId} mis à jour en : ${newStatus.toUpperCase()}`);
          });
        });

        // Edit Shipment Handlers
        const editBtns = shipmentsBody.querySelectorAll('.btn-edit-shipment');
        editBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = btn.dataset.index;
            const ship = shipments[idx];
            if (!ship) return;
            
            // Populate modal
            document.getElementById('modalShipmentTitle').textContent = "Modifier le conteneur";
            document.getElementById('editContainerIndex').value = idx;
            document.getElementById('shipmentContainer').value = ship.container;
            document.getElementById('shipmentContainer').disabled = true; // container ID is key, cannot be changed
            document.getElementById('shipmentOrigin').value = ship.origin;
            document.getElementById('shipmentDestination').value = ship.destination;
            document.getElementById('shipmentCarrier').value = ship.carrier || 'COSCO Shipping';
            document.getElementById('shipmentStatus').value = ship.status || 'transit';
            document.getElementById('shipmentDeparture').value = ship.departure || '';
            document.getElementById('shipmentETA').value = ship.eta || '';
            
            // Populate photo preview
            const storedPhoto = ship.photo || localStorage.getItem(`gz-empire-shipment-photo-${ship.container}`);
            const shipmentPhotoFile = document.getElementById('shipmentPhotoFile');
            const shipmentPhotoUploadZone = document.getElementById('shipmentPhotoUploadZone');
            const shipmentPhotoPreviewContainer = document.getElementById('shipmentPhotoPreviewContainer');
            const shipmentPhotoPreview = document.getElementById('shipmentPhotoPreview');
            const shipmentPhotoBase64 = document.getElementById('shipmentPhotoBase64');
            
            if (storedPhoto) {
              if (shipmentPhotoBase64) shipmentPhotoBase64.value = storedPhoto;
              if (shipmentPhotoPreview) shipmentPhotoPreview.src = storedPhoto;
              if (shipmentPhotoUploadZone) shipmentPhotoUploadZone.style.display = 'none';
              if (shipmentPhotoPreviewContainer) shipmentPhotoPreviewContainer.style.display = 'block';
            } else {
              if (shipmentPhotoFile) shipmentPhotoFile.value = '';
              if (shipmentPhotoBase64) shipmentPhotoBase64.value = '';
              if (shipmentPhotoPreview) shipmentPhotoPreview.src = '#';
              if (shipmentPhotoUploadZone) shipmentPhotoUploadZone.style.display = 'flex';
              if (shipmentPhotoPreviewContainer) shipmentPhotoPreviewContainer.style.display = 'none';
            }
            
            // Open modal
            document.getElementById('shipmentModal').style.display = 'flex';
          });
        });

        // Delete Shipment Handlers
        const deleteBtns = shipmentsBody.querySelectorAll('.btn-delete-shipment');
        deleteBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = btn.dataset.index;
            const ship = shipments[idx];
            if (!ship) return;
            const containerNum = ship.container;
            if (confirm(`Êtes-vous sûr de vouloir supprimer le conteneur ${containerNum} ?`)) {
              shipments.splice(idx, 1);
              localStorage.setItem('gz-empire-shipments', JSON.stringify(shipments));
              localStorage.removeItem(`gz-empire-shipment-status-${containerNum}`);
              loadShipmentsData();
            }
          });
        });
      }

      // Render in dashboard tab
      const dashboardShipmentsBody = document.getElementById('dashboardShipmentsTableBody');
      if (dashboardShipmentsBody) {
        dashboardShipmentsBody.innerHTML = '';
        shipments.slice(0, 5).forEach((s) => {
          if (!s) return;
          const tr = document.createElement('tr');
          const localStatusKey = `gz-empire-shipment-status-${s.container}`;
          const currentStatus = localStorage.getItem(localStatusKey) || s.status;
          
          const statusTextMap = {
            commande: "Confirmé",
            production: "Production",
            qualite: "Qualité",
            chargement: "Chargé",
            transit: "En mer",
            arrivee: "Arrivé",
            douane: "Douane",
            livre: "Livré"
          };
          const statusClassMap = {
            commande: "nouveau",
            production: "contacte",
            qualite: "qualifie",
            chargement: "qualifie",
            transit: "qualifie",
            arrivee: "converti",
            douane: "converti",
            livre: "converti"
          };
          const text = statusTextMap[currentStatus] || "En transit";
          const cls = statusClassMap[currentStatus] || "qualifie";

          tr.innerHTML = `
            <td><strong>${escapeHTML(s.container)}</strong></td>
            <td>${escapeHTML(s.origin)}</td>
            <td>${escapeHTML(s.destination)}</td>
            <td>${escapeHTML(s.departure)}</td>
            <td>${escapeHTML(s.eta)}</td>
            <td><span class="status-badge status-badge--${cls}">${text}</span></td>
            <td>
              <button class="admin-action-btn admin-action-btn--view btn-view-shipment-detail" data-container="${escapeHTML(s.container)}" title="Voir détails" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; padding:0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </td>
          `;
          dashboardShipmentsBody.appendChild(tr);
        });

        // View detail handler
        dashboardShipmentsBody.querySelectorAll('.btn-view-shipment-detail').forEach(btn => {
          btn.addEventListener('click', () => {
            const containerId = btn.dataset.container;
            const ship = shipments.find(s => s && s.container === containerId);
            if (ship) {
              const localStatusKey = `gz-empire-shipment-status-${ship.container}`;
              const currentStatus = localStorage.getItem(localStatusKey) || ship.status;
              alert(`Détails Expédition:\n\nConteneur: ${ship.container}\nOrigine: ${ship.origin}\nDestination: ${ship.destination}\nTransporteur: ${ship.carrier || 'Non spécifié'}\nDépart: ${ship.departure}\nETA: ${ship.eta}\nStatut: ${currentStatus.toUpperCase()}`);
            }
          });
        });
      }

      // Dynamic Filter Pills Logic for Shipments
      const shipmentsPills = document.querySelectorAll('#shipmentsFilterPills .admin-filter-pill');
      if (shipmentsPills.length > 0 && shipmentsBody) {
        shipmentsPills.forEach(pill => {
          pill.onclick = () => {
            document.querySelectorAll('#shipmentsFilterPills .admin-filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            const filterValue = pill.dataset.filter;
            const rows = shipmentsBody.querySelectorAll('tr');
            rows.forEach(row => {
              const statusSelect = row.querySelector('.admin-shipment-status');
              if (!statusSelect) return;

              const rowStatus = statusSelect.value;
              if (filterValue === 'all' || rowStatus === filterValue) {
                row.style.display = '';
              } else {
                row.style.display = 'none';
              }
            });
          };
        });
      }
    } catch (err) {
      console.error("Error in loadShipmentsData:", err);
    }
  }

  // ─── SHIPLMENT MODAL HANDLERS ───
  const shipmentModal = document.getElementById('shipmentModal');
  const shipmentForm = document.getElementById('shipmentForm');
  const btnAddNewShipment = document.getElementById('btnAddNewShipment');
  const closeShipmentModal = document.getElementById('closeShipmentModal');
  const cancelShipmentModal = document.getElementById('cancelShipmentModal');

  if (btnAddNewShipment) {
    btnAddNewShipment.addEventListener('click', () => {
      // Reset form for add mode
      document.getElementById('modalShipmentTitle').textContent = "Ajouter un conteneur";
      document.getElementById('editContainerIndex').value = "";
      document.getElementById('shipmentContainer').value = "";
      document.getElementById('shipmentContainer').disabled = false;
      document.getElementById('shipmentOrigin').value = "Guangzhou (Port)";
      document.getElementById('shipmentDestination').value = "";
      document.getElementById('shipmentCarrier').value = "COSCO Shipping";
      document.getElementById('shipmentStatus').value = "transit";
      document.getElementById('shipmentDeparture').value = new Date().toLocaleDateString('fr-FR');
      document.getElementById('shipmentETA').value = "Est. 30 jours";
      
      // Reset photo fields
      const shipmentPhotoFile = document.getElementById('shipmentPhotoFile');
      const shipmentPhotoUploadZone = document.getElementById('shipmentPhotoUploadZone');
      const shipmentPhotoPreviewContainer = document.getElementById('shipmentPhotoPreviewContainer');
      const shipmentPhotoPreview = document.getElementById('shipmentPhotoPreview');
      const shipmentPhotoBase64 = document.getElementById('shipmentPhotoBase64');
      
      if (shipmentPhotoFile) shipmentPhotoFile.value = '';
      if (shipmentPhotoBase64) shipmentPhotoBase64.value = '';
      if (shipmentPhotoPreview) shipmentPhotoPreview.src = '#';
      if (shipmentPhotoUploadZone) shipmentPhotoUploadZone.style.display = 'flex';
      if (shipmentPhotoPreviewContainer) shipmentPhotoPreviewContainer.style.display = 'none';
      
      shipmentModal.style.display = 'flex';
    });
  }

  const closeModal = () => {
    if (shipmentModal) shipmentModal.style.display = 'none';
  };

  if (closeShipmentModal) closeShipmentModal.addEventListener('click', closeModal);
  if (cancelShipmentModal) cancelShipmentModal.addEventListener('click', closeModal);

  // Close modal when clicking outside content
  if (shipmentModal) {
    shipmentModal.addEventListener('click', (e) => {
      if (e.target === shipmentModal) closeModal();
    });
  }

  // Photo upload zone and preview actions
  const shipmentPhotoFile = document.getElementById('shipmentPhotoFile');
  const shipmentPhotoUploadZone = document.getElementById('shipmentPhotoUploadZone');
  const shipmentPhotoPreviewContainer = document.getElementById('shipmentPhotoPreviewContainer');
  const shipmentPhotoPreview = document.getElementById('shipmentPhotoPreview');
  const removeShipmentPhotoBtn = document.getElementById('removeShipmentPhotoBtn');
  const shipmentPhotoBase64 = document.getElementById('shipmentPhotoBase64');

  if (shipmentPhotoUploadZone && shipmentPhotoFile) {
    shipmentPhotoUploadZone.addEventListener('click', () => shipmentPhotoFile.click());
    
    shipmentPhotoFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Limit file size to 1.5 MB (1.5 * 1024 * 1024 bytes)
      if (file.size > 1.5 * 1024 * 1024) {
        alert("Erreur : La taille de la photo ne doit pas dépasser 1.5 Mo pour le stockage local.");
        shipmentPhotoFile.value = '';
        return;
      }
      
      const reader = new FileReader();
      reader.onload = function(evt) {
        const base64Data = evt.target.result;
        if (shipmentPhotoBase64) shipmentPhotoBase64.value = base64Data;
        if (shipmentPhotoPreview) shipmentPhotoPreview.src = base64Data;
        if (shipmentPhotoUploadZone) shipmentPhotoUploadZone.style.display = 'none';
        if (shipmentPhotoPreviewContainer) shipmentPhotoPreviewContainer.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
  }

  if (removeShipmentPhotoBtn) {
    removeShipmentPhotoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (shipmentPhotoFile) shipmentPhotoFile.value = '';
      if (shipmentPhotoBase64) shipmentPhotoBase64.value = '';
      if (shipmentPhotoPreview) shipmentPhotoPreview.src = '#';
      if (shipmentPhotoUploadZone) shipmentPhotoUploadZone.style.display = 'flex';
      if (shipmentPhotoPreviewContainer) shipmentPhotoPreviewContainer.style.display = 'none';
    });
  }

  // Save cargo form submit
  if (shipmentForm) {
    shipmentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const idx = document.getElementById('editContainerIndex').value;
      const containerNum = document.getElementById('shipmentContainer').value.trim().toUpperCase();
      const origin = document.getElementById('shipmentOrigin').value.trim();
      const dest = document.getElementById('shipmentDestination').value.trim();
      const carrier = document.getElementById('shipmentCarrier').value.trim();
      const status = document.getElementById('shipmentStatus').value;
      const departure = document.getElementById('shipmentDeparture').value.trim();
      const eta = document.getElementById('shipmentETA').value.trim();
      const photo = document.getElementById('shipmentPhotoBase64') ? document.getElementById('shipmentPhotoBase64').value : '';
      
      const shipData = {
        container: containerNum,
        origin,
        destination: dest,
        carrier,
        departure,
        eta,
        status,
        photo,
        update: "Mis à jour manuellement"
      };
      
      if (idx !== "") {
        // Edit mode
        shipments[idx] = shipData;
        localStorage.setItem(`gz-empire-shipment-status-${containerNum}`, status);
        if (photo) {
          localStorage.setItem(`gz-empire-shipment-photo-${containerNum}`, photo);
        } else {
          localStorage.removeItem(`gz-empire-shipment-photo-${containerNum}`);
        }
      } else {
        // Add mode
        // Check if container already exists
        if (shipments.some(s => s.container === containerNum)) {
          alert("Erreur: Un conteneur portant ce numéro existe déjà.");
          return;
        }
        shipments.push(shipData);
        localStorage.setItem(`gz-empire-shipment-status-${containerNum}`, status);
        if (photo) {
          localStorage.setItem(`gz-empire-shipment-photo-${containerNum}`, photo);
        }
      }

      // Sync notification to client portal
      try {
        let notifs = JSON.parse(localStorage.getItem('gz-empire-portal-notifications') || '[]');
        const statusLabels = {
          commande: "Commande confirmée",
          production: "Production terminée",
          qualite: "Qualité validée",
          chargement: "Chargement",
          transit: "En transit maritime",
          arrivee: "Arrivée Port",
          douane: "Dédouanement",
          livre: "Livraison finale"
        };
        const actionWord = idx !== "" ? "mise à jour" : "créée";
        const newNotif = {
          id: Date.now(),
          ref: containerNum,
          message: `L'expédition ${containerNum} a été ${actionWord} : ${statusLabels[status] || status}.`,
          time: "À l'instant",
          type: status === 'qualite' ? 'quality' : (status === 'douane' ? 'invoice' : 'ship'),
          read: false
        };
        notifs.unshift(newNotif);
        if (notifs.length > 20) notifs = notifs.slice(0, 20);
        localStorage.setItem('gz-empire-portal-notifications', JSON.stringify(notifs));
      } catch (err) {
        console.error("Error syncing modal update notification:", err);
      }
      
      localStorage.setItem('gz-empire-shipments', JSON.stringify(shipments));
      closeModal();
      loadShipmentsData();
    });
  }

  // ─── CSV FILE IMPORT HANDLERS ───
  const csvFileInput = document.getElementById('csvFileInput');
  const btnImportCSV = document.getElementById('btnImportCSV');
  if (btnImportCSV && csvFileInput) {
    btnImportCSV.addEventListener('click', () => csvFileInput.click());
    csvFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = function(evt) {
        const content = evt.target.result;
        const lines = content.split('\n');
        let count = 0;
        let storedShipments = [];
        try {
          storedShipments = JSON.parse(localStorage.getItem('gz-empire-shipments') || '[]');
          if (!Array.isArray(storedShipments)) storedShipments = [];
        } catch (e) {
          storedShipments = [];
        }
        
        lines.forEach((line, index) => {
          // Skip header line or empty lines
          if (index === 0 && line.toLowerCase().includes('conteneur')) return;
          if (!line.trim()) return;
          
          const cols = line.split(',');
          if (cols.length >= 3) {
            const containerNum = cols[0].trim().toUpperCase();
            const origin = cols[1] ? cols[1].trim() : "Guangzhou (Port)";
            const dest = cols[2] ? cols[2].trim() : "Destination";
            const carrier = cols[3] ? cols[3].trim() : "COSCO Shipping";
            const departure = cols[4] ? cols[4].trim() : new Date().toLocaleDateString('fr-FR');
            const eta = cols[5] ? cols[5].trim() : "Est. 30 jours";
            const status = cols[6] ? cols[6].trim().toLowerCase() : "transit";
            
            // Check if already exists, update or add
            const existingIdx = storedShipments.findIndex(s => s.container === containerNum);
            const newShip = {
              container: containerNum,
              origin: origin,
              destination: dest,
              carrier: carrier,
              departure: departure,
              eta: eta,
              status: status,
              update: "Importé via CSV"
            };
            
            if (existingIdx !== -1) {
              storedShipments[existingIdx] = newShip;
            } else {
              storedShipments.push(newShip);
            }

            // Sync notification to client portal
            try {
              let notifs = JSON.parse(localStorage.getItem('gz-empire-portal-notifications') || '[]');
              const statusLabels = {
                commande: "Commande confirmée",
                production: "Production terminée",
                qualite: "Qualité validée",
                chargement: "Chargement",
                transit: "En transit maritime",
                arrivee: "Arrivée Port",
                douane: "Dédouanement",
                livre: "Livraison finale"
              };
              const actionWord = existingIdx !== -1 ? "mise à jour" : "importée";
              const newNotif = {
                id: Date.now() + count,
                ref: containerNum,
                message: `L'expédition ${containerNum} a été ${actionWord} (CSV) : ${statusLabels[status] || status}.`,
                time: "À l'instant",
                type: status === 'qualite' ? 'quality' : (status === 'douane' ? 'invoice' : 'ship'),
                read: false
              };
              notifs.unshift(newNotif);
              if (notifs.length > 20) notifs = notifs.slice(0, 20);
              localStorage.setItem('gz-empire-portal-notifications', JSON.stringify(notifs));
            } catch (err) {
              console.error("Error syncing CSV import notification:", err);
            }
            
            // Sync current status override as well
            localStorage.setItem(`gz-empire-shipment-status-${containerNum}`, status);
            count++;
          }
        });
        
        localStorage.setItem('gz-empire-shipments', JSON.stringify(storedShipments));
        loadShipmentsData();
        alert(`${count} conteneur(s) importé(s) ou mis à jour avec succès depuis le fichier CSV !`);
        csvFileInput.value = ''; // Reset file input
      };
      reader.readAsText(file);
    });
  }

  // ─── CHATBOT HISTORY DATA ───
  const defaultChats = [
    {
      visitor: "Jean-Philippe (Congo)",
      time: "Il y a 10 min",
      messages: [
        { sender: "user", text: "Bonjour, je cherche un fournisseur de pièces détachées auto à Guangzhou. Pouvez-vous m'aider ?" },
        { sender: "bot", text: "Bonjour ! Tout à fait. GZ-EMPIRE dispose de bureaux à Guangzhou. Quel type de pièces auto recherchez-vous et quel est votre budget estimé ?" }
      ]
    },
    {
      visitor: "Fatoumata D. (Mali)",
      time: "Il y a 1h",
      messages: [
        { sender: "user", text: "Quels sont les délais pour un conteneur 40 pieds vers Abidjan ?" },
        { sender: "bot", text: "Pour le fret maritime de Guangzhou à Abidjan, comptez environ 30 à 35 jours de mer. Notre prochain chargement est prévu pour le 15 juin." }
      ]
    },
    {
      visitor: "Claude M. (Bruxelles)",
      time: "Il y a 3h",
      messages: [
        { sender: "user", text: "Comment fonctionne votre service de visa ?" },
        { sender: "bot", text: "Nous fournissons la lettre d'invitation officielle (PU Letter) et gérons le dépôt de votre dossier pour un visa d'affaires (M) de 30 à 90 jours." }
      ]
    }
  ];

  function loadChatsData() {
    try {
      let storedChats = localStorage.getItem('gz-empire-chats');
      let chats = [];

      if (!storedChats) {
        chats = defaultChats;
        localStorage.setItem('gz-empire-chats', JSON.stringify(chats));
      } else {
        try {
          chats = JSON.parse(storedChats);
          if (!Array.isArray(chats)) chats = defaultChats;
        } catch (e) {
          console.error("Error parsing chats from localStorage:", e);
          chats = defaultChats;
        }
      }

      // Filter out invalid items
      chats = chats.filter(chat => chat && typeof chat === 'object' && Array.isArray(chat.messages));

      const chatsContainer = document.getElementById('adminChatsContainer');
      if (chatsContainer) {
        chatsContainer.innerHTML = '';
        chats.slice(0, 3).forEach(chat => {
          chatsContainer.appendChild(createChatWidget(chat));
        });
      }

      const fullChatsContainer = document.getElementById('fullChatsContainer');
      if (fullChatsContainer) {
        fullChatsContainer.innerHTML = '';
        chats.forEach(chat => {
          fullChatsContainer.appendChild(createChatWidget(chat));
        });
      }
    } catch (err) {
      console.error("Error in loadChatsData:", err);
    }
  }

  function createChatWidget(chat) {
    const div = document.createElement('div');
    div.className = 'admin-conversation';
    
    let messagesHTML = '';
    chat.messages.forEach(m => {
      const isUser = m.sender === 'user';
      messagesHTML += `
        <div class="admin-conversation__msg admin-conversation__msg--${isUser ? 'user' : 'bot'}">
          <strong>${isUser ? 'Visiteur' : 'Support'} :</strong> ${escapeHTML(m.text)}
        </div>
      `;
    });

    div.innerHTML = `
      <div class="admin-conversation__visitor">
        <span class="admin-conversation__visitor-dot"></span>
        <span class="admin-conversation__visitor-name">${escapeHTML(chat.visitor)}</span>
        <span class="admin-conversation__visitor-time">${chat.time}</span>
      </div>
      <div class="conversation-messages" style="margin-bottom: var(--space-3)">
        ${messagesHTML}
      </div>
      <a class="admin-conversation__link" onclick="alert('Option de reprise en main humaine non disponible en mode démonstration.')">
        Prendre le contrôle du chat
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 5v14"/></svg>
      </a>
    `;

    return div;
  }

  // ─── CHART.JS RENDERER ───
  let performanceChart = null;
  let destinationChart = null;

  function renderCharts() {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') return;

    try {
      // Destory existing charts to avoid overlapping canvas contexts
      if (performanceChart) {
        performanceChart.destroy();
        performanceChart = null;
      }
      if (destinationChart) {
        destinationChart.destroy();
        destinationChart = null;
      }

      // Chart 1: Performance Line Chart
      const perfCtx = document.getElementById('adminPerformanceChart');
      if (perfCtx) {
        const ctx = perfCtx.getContext('2d');
        
        // Premium linear gradients for Chart datasets
        const goldGradient = ctx.createLinearGradient(0, 0, 0, 240);
        goldGradient.addColorStop(0, 'rgba(212, 175, 55, 0.22)');
        goldGradient.addColorStop(1, 'rgba(212, 175, 55, 0.00)');

        const blueGradient = ctx.createLinearGradient(0, 0, 0, 240);
        blueGradient.addColorStop(0, 'rgba(59, 130, 246, 0.22)');
        blueGradient.addColorStop(1, 'rgba(59, 130, 246, 0.00)');

        performanceChart = new Chart(perfCtx, {
          type: 'line',
          data: {
            labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
            datasets: [
              {
                label: 'Demandes Sourcing',
                data: [15, 22, 28, 35, 41, 47],
                borderColor: '#D4AF37', // Gold
                backgroundColor: goldGradient,
                borderWidth: 2,
                tension: 0.4,
                fill: true
              },
              {
                label: 'Dossiers Logistique',
                data: [8, 12, 14, 18, 20, 23],
                borderColor: '#3B82F6', // Blue
                backgroundColor: blueGradient,
                borderWidth: 2,
                tension: 0.4,
                fill: true
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: { color: 'rgba(255,255,255,0.6)', font: { family: 'Montserrat' } }
              }
            },
            scales: {
              x: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: 'rgba(255,255,255,0.4)', font: { family: 'Montserrat' } }
              },
              y: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: 'rgba(255,255,255,0.4)', font: { family: 'Montserrat' } }
              }
            }
          }
        });
      }

      // Chart 2: Destination Doughnut Chart
      const destCtx = document.getElementById('adminDestinationChart');
      if (destCtx) {
        destinationChart = new Chart(destCtx, {
          type: 'doughnut',
          data: {
            labels: ['Congo (CG/CD)', 'Côte d\'Ivoire', 'Cameroun', 'Sénégal', 'Europe'],
            datasets: [{
              data: [45, 20, 15, 12, 8],
              backgroundColor: [
                '#D4AF37', // Gold
                '#3B82F6', // Blue
                '#10B981', // Green
                '#8B5CF6', // Purple
                '#EF4444'  // Red
              ],
              borderColor: '#0A0F1C',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: { color: 'rgba(255,255,255,0.6)', font: { family: 'Montserrat', size: 11 } }
              }
            }
          }
        });
      }
    } catch (err) {
      console.error("Error rendering Chart.js charts:", err);
    }
  }

  // ─── QUICK ACTIONS HANDLERS ───
  const actionAddOrder = document.getElementById('actionAddOrder');
  if (actionAddOrder) {
    actionAddOrder.addEventListener('click', () => {
      // Direct jump to orders tab
      const orderTab = document.querySelector('.admin-nav-item[data-tab="orders"]');
      if (orderTab) orderTab.click();
    });
  }

  const actionSendNotify = document.getElementById('actionSendNotify');
  if (actionSendNotify) {
    actionSendNotify.addEventListener('click', () => {
      const msg = prompt("Entrez le message d'alerte à envoyer aux clients :");
      if (msg) {
        alert(`Notification simulée envoyée avec succès aux clients par WhatsApp/Email :\n\n"${msg}"`);
      }
    });
  }

  const actionExportData = document.getElementById('actionExportData');
  if (actionExportData) {
    actionExportData.addEventListener('click', () => {
      alert("Fichier 'gz_leads_export.xlsx' généré avec succès ! Le téléchargement va commencer (simulation).");
    });
  }

  const actionConfig = document.getElementById('actionConfig');
  if (actionConfig) {
    actionConfig.addEventListener('click', () => {
      const tab = document.querySelector('.admin-nav-item[data-tab="settings"]');
      if (tab) tab.click();
    });
  }

  const viewAllProspectsLink = document.getElementById('viewAllProspectsLink');
  if (viewAllProspectsLink) {
    viewAllProspectsLink.addEventListener('click', () => {
      const tab = document.querySelector('.admin-nav-item[data-tab="prospects"]');
      if (tab) tab.click();
    });
  }

  const viewAllChatsLink = document.getElementById('viewAllChatsLink');
  if (viewAllChatsLink) {
    viewAllChatsLink.addEventListener('click', () => {
      const tab = document.querySelector('.admin-nav-item[data-tab="chats"]');
      if (tab) tab.click();
    });
  }

  const btnExportFullXls = document.getElementById('btnExportFullXls');
  if (btnExportFullXls) {
    btnExportFullXls.addEventListener('click', () => {
      alert("Base complète de prospects exportée au format Excel !");
    });
  }


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
});

})();
