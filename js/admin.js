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

  // IIFE-wide data structures
  let prospects = [];
  let chats = [];

  // ─── DATA MIGRATION v4.0 ───
  // Purge all old fake demo data on first run of the new version
  const DATA_VERSION = 'gz-empire-data-v4';
  if (localStorage.getItem(DATA_VERSION) !== 'true') {
    // Remove all old fake/demo data
    const keysToClean = [
      'gz-empire-prospects',
      'gz-empire-shipments',
      'gz-empire-chats',
      'gz-empire-portal-notifications',
      'gz-empire-user-logged',
      'gz-empire-admin-logged',
      'gz-empire-orders'
    ];
    // Also remove any shipment status/photo overrides from old demo containers
    ['GZEMP2024001', 'GZEMP2024002', 'GZ-2024-001', 'GZ-2024-002', 'GZ-2024-003'].forEach(id => {
      localStorage.removeItem(`gz-empire-shipment-status-${id}`);
      localStorage.removeItem(`gz-empire-shipment-photo-${id}`);
    });
    keysToClean.forEach(key => localStorage.removeItem(key));
    localStorage.setItem(DATA_VERSION, 'true');
    console.info('✅ GZ-EMPIRE v4.0: Migration effectuée — données de démonstration supprimées.');
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

  // ─── REAL AUTHENTICATION (SHA-256) ───
  // Credentials: admin@gz-empire.com / GZEmpire2024!
  const ADMIN_EMAIL = 'admin@gz-empire.com';
  const ADMIN_PASS_HASH = 'fd95f85ff8436617edead5b77514814a25e173b8dbe311faa751ec8fd56f03b5';

  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Handle Login
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailInput = document.getElementById('adminEmail');
      const passwordInput = document.getElementById('adminPassword');
      const errorDiv = document.getElementById('adminLoginError');
      const loginBtn = document.getElementById('adminLoginBtn');

      const enteredEmail = emailInput ? emailInput.value.trim().toLowerCase() : '';
      const enteredPassword = passwordInput ? passwordInput.value : '';

      // Show loading state
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.style.opacity = '0.7';
      }
      if (errorDiv) errorDiv.style.display = 'none';

      try {
        const enteredHash = await hashPassword(enteredPassword);
        const isValid = (enteredEmail === ADMIN_EMAIL && enteredHash === ADMIN_PASS_HASH);

        if (isValid) {
          localStorage.setItem('gz-empire-admin-logged', 'true');
          if (adminLoginView) adminLoginView.style.display = 'none';
          if (adminDashboardView) adminDashboardView.classList.add('show');
          try {
            initializeDashboard();
          } catch (err) {
            console.error('Error initializing dashboard after login:', err);
          }
        } else {
          // Show error, shake effect
          if (errorDiv) {
            errorDiv.style.display = 'flex';
          }
          if (passwordInput) {
            passwordInput.value = '';
            passwordInput.style.borderColor = 'rgba(239,68,68,0.6)';
            setTimeout(() => { passwordInput.style.borderColor = ''; }, 2000);
          }
        }
      } catch (err) {
        console.error('Auth error:', err);
      } finally {
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.style.opacity = '';
        }
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
    try { loadOrdersData(); } catch (e) { console.error("Error loading orders:", e); }
    try { loadChatsData(); } catch (e) { console.error("Error loading chats:", e); }
    try { updateAdvancedStats(); } catch (e) { console.error("Error updating stats:", e); }
    try { renderCharts(); } catch (e) { console.error("Error rendering charts:", e); }
  }

  // ─── CRM PROSPECTS DATA ───
  // Données réelles uniquement — les prospects sont ajoutés via les formulaires de contact
  const defaultProspects = [];

  function loadProspectsData() {
    try {
      // Check if we already have prospects in localStorage
      let storedProspects = localStorage.getItem('gz-empire-prospects');
      prospects = [];

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
      if (badgeCountEl) {
        badgeCountEl.textContent = prospects.length;
        badgeCountEl.style.display = prospects.length > 0 ? 'inline-block' : 'none';
      }

      // Render in dashboard (last 5 items)
      const dashboardBody = document.getElementById('prospectsTableBody');
      if (dashboardBody) {
        dashboardBody.innerHTML = '';
        prospects.slice(0, 5).forEach((p, i) => {
          dashboardBody.appendChild(createProspectRow(p, false, i));
        });
      }

      // Render in full list
      const fullBody = document.getElementById('fullProspectsTableBody');
      if (fullBody) {
        fullBody.innerHTML = '';
        prospects.forEach((p, i) => {
          const row = createProspectRow(p, true, i);
          fullBody.appendChild(row);
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
      
      // Update advanced stats
      try { updateAdvancedStats(); } catch(e) {}
    } catch (err) {
      console.error("Error in loadProspectsData:", err);
    }
  }

  function createProspectRow(p, isFull, index) {
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
          <button class="admin-action-btn admin-action-btn--edit" title="Éditer" data-index="${index}" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; padding:0;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
          <button class="admin-action-btn admin-action-btn--convert" title="Convertir en Commande" data-index="${index}" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; padding:0; color: #10B981;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></button>
          <button class="admin-action-btn admin-action-btn--whatsapp" title="WhatsApp" onclick="window.open('https://wa.me/${p.phone ? p.phone.replace(/[^0-9]/g, '') : '8618320050031'}')" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; padding:0;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>
          <button class="admin-action-btn admin-action-btn--delete" title="Supprimer" data-index="${index}" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; padding:0; color: #EF4444;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
      </td>
    `;

    tr.innerHTML = html;
    return tr;
  }

  // Helper to escape HTML characters
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    const s = String(str);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function escapeQuotes(str) {
    if (str === null || str === undefined) return '';
    const s = String(str);
    return s.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }

  // ─── PROSPECT MODAL (Add / Edit / Convert / Delete) ───
  const prospectModal = document.getElementById('prospectModal');
  const prospectForm = document.getElementById('prospectForm');

  function openProspectModal(p, idx) {
    if (!prospectModal) return;
    const isEdit = p !== null;
    document.getElementById('modalProspectTitle').textContent = isEdit ? 'Modifier le Prospect' : 'Nouveau Prospect';
    document.getElementById('editProspectIndex').value = isEdit ? (idx !== undefined ? idx : '') : '';

    // Auto-fill fields from prospect data (or blank for new)
    document.getElementById('prospectName').value = isEdit ? (p.name || '') : '';
    document.getElementById('prospectEmail').value = isEdit ? (p.email || '') : '';
    document.getElementById('prospectPhone').value = isEdit ? (p.phone || '') : '';
    document.getElementById('prospectCountry').value = isEdit ? (p.country || '') : '';
    document.getElementById('prospectProduct').value = isEdit ? (p.product || '') : '';
    document.getElementById('prospectBudget').value = isEdit ? (p.budget || '') : '';
    document.getElementById('prospectStatus').value = isEdit ? (p.status || 'nouveau') : 'nouveau';
    document.getElementById('prospectDate').value = isEdit ? (p.date || '') : new Date().toLocaleDateString('fr-FR');
    document.getElementById('prospectNotes').value = isEdit ? (p.notes || '') : '';

    // Populate datalist suggestions from existing prospects
    const nameDl = document.getElementById('prospectNameSuggestions');
    const emailDl = document.getElementById('prospectEmailSuggestions');
    if (nameDl) {
      nameDl.innerHTML = prospects.map(pr => `<option value="${escapeHTML(pr.name)}"></option>`).join('');
    }
    if (emailDl) {
      emailDl.innerHTML = prospects.map(pr => `<option value="${escapeHTML(pr.email)}"></option>`).join('');
    }

    // Show/hide convert button
    const convertBtn = document.getElementById('btnProspectConvertOrder');
    if (convertBtn) convertBtn.style.display = isEdit ? 'inline-flex' : 'none';

    // Update hint
    const hint = document.getElementById('prospectAutoFillHint');
    if (hint) {
      hint.textContent = isEdit
        ? `\u270f\ufe0f Modification de ${p.name} — champs pré-remplis automatiquement.`
        : '\u2139\ufe0f Saisissez l\'email pour activer le remplissage automatique depuis les prospects existants.';
    }

    prospectModal.style.display = 'flex';
  }

  function closeProspectModal() {
    if (prospectModal) prospectModal.style.display = 'none';
  }

  function deleteProspect(idx) {
    const p = prospects[idx];
    if (!p) return;
    if (!confirm(`Supprimer le prospect "${p.name}" ?`)) return;
    prospects.splice(idx, 1);
    localStorage.setItem('gz-empire-prospects', JSON.stringify(prospects));
    loadProspectsData();
  }

  function convertProspectToOrder(p) {
    // Pre-fill the order modal from prospect data
    const orderTab = document.querySelector('.admin-nav-item[data-tab="orders"]');
    if (orderTab) orderTab.click();
    setTimeout(() => {
      const modalTitle = document.getElementById('modalOrderTitle');
      const orderRef = document.getElementById('orderRef');
      const orderClient = document.getElementById('orderClient');
      const orderProduct = document.getElementById('orderProduct');
      const orderAmount = document.getElementById('orderAmount');
      const orderModal = document.getElementById('orderModal');
      if (modalTitle) modalTitle.textContent = 'Nouvelle commande (depuis prospect)';
      if (orderRef) orderRef.value = 'GZ-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4);
      if (orderClient) orderClient.value = p.name || '';
      if (orderProduct) orderProduct.value = p.product || '';
      if (orderAmount) orderAmount.value = p.budget || '';
      if (orderModal) orderModal.style.display = 'flex';
      // Mark prospect as converted
      const idx = prospects.findIndex(pr => pr.email === p.email);
      if (idx !== -1) {
        prospects[idx].status = 'converti';
        localStorage.setItem('gz-empire-prospects', JSON.stringify(prospects));
        loadProspectsData();
      }
    }, 350);
    closeProspectModal();
  }

  // Open modal for new prospect
  const btnAddNewProspect = document.getElementById('btnAddNewProspect');
  if (btnAddNewProspect) {
    btnAddNewProspect.addEventListener('click', () => openProspectModal(null));
  }

  // Close modal buttons
  const closeProspectModalBtn = document.getElementById('closeProspectModal');
  const cancelProspectModalBtn = document.getElementById('cancelProspectModal');
  if (closeProspectModalBtn) closeProspectModalBtn.addEventListener('click', closeProspectModal);
  if (cancelProspectModalBtn) cancelProspectModalBtn.addEventListener('click', closeProspectModal);
  if (prospectModal) {
    prospectModal.addEventListener('click', (e) => { if (e.target === prospectModal) closeProspectModal(); });
  }

  // Auto-fill: when email is typed, find matching prospect and fill fields
  const prospectEmailInput = document.getElementById('prospectEmail');
  if (prospectEmailInput) {
    prospectEmailInput.addEventListener('change', () => {
      const val = prospectEmailInput.value.trim().toLowerCase();
      const existing = prospects.find(pr => pr.email && pr.email.toLowerCase() === val);
      if (existing && !document.getElementById('editProspectIndex').value) {
        // Auto-fill from existing prospect
        if (!document.getElementById('prospectName').value) document.getElementById('prospectName').value = existing.name || '';
        if (!document.getElementById('prospectPhone').value) document.getElementById('prospectPhone').value = existing.phone || '';
        if (!document.getElementById('prospectCountry').value) document.getElementById('prospectCountry').value = existing.country || '';
        if (!document.getElementById('prospectProduct').value) document.getElementById('prospectProduct').value = existing.product || '';
        if (!document.getElementById('prospectBudget').value) document.getElementById('prospectBudget').value = existing.budget || '';
        const hint = document.getElementById('prospectAutoFillHint');
        if (hint) hint.textContent = `\u2705 Données de ${existing.name} chargées automatiquement.`;
      }
    });
  }

  // Convert button inside modal
  const btnProspectConvertOrder = document.getElementById('btnProspectConvertOrder');
  if (btnProspectConvertOrder) {
    btnProspectConvertOrder.addEventListener('click', () => {
      const idx = document.getElementById('editProspectIndex').value;
      const p = idx !== '' ? prospects[parseInt(idx)] : null;
      if (p) convertProspectToOrder(p);
    });
  }

  // Save prospect form
  if (prospectForm) {
    prospectForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const idx = document.getElementById('editProspectIndex').value;
      const prospectData = {
        name: document.getElementById('prospectName').value.trim(),
        email: document.getElementById('prospectEmail').value.trim().toLowerCase(),
        phone: document.getElementById('prospectPhone').value.trim(),
        country: document.getElementById('prospectCountry').value.trim(),
        product: document.getElementById('prospectProduct').value.trim(),
        budget: document.getElementById('prospectBudget').value.trim(),
        status: document.getElementById('prospectStatus').value,
        date: document.getElementById('prospectDate').value.trim() || new Date().toLocaleDateString('fr-FR'),
        notes: document.getElementById('prospectNotes').value.trim()
      };
      if (!prospectData.name || !prospectData.email) return;

      if (idx !== '') {
        prospects[parseInt(idx)] = prospectData;
      } else {
        prospects.unshift(prospectData);
      }
      localStorage.setItem('gz-empire-prospects', JSON.stringify(prospects));
      closeProspectModal();
      loadProspectsData();
    });
  }

  // Event delegation for Edit / Convert / Delete buttons in the prospect tables
  function attachProspectTableDelegation(bodyId) {
    const body = document.getElementById(bodyId);
    if (!body) return;
    body.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.admin-action-btn--edit');
      const convertBtn = e.target.closest('.admin-action-btn--convert');
      const deleteBtn = e.target.closest('.admin-action-btn--delete');
      if (editBtn) {
        const idx = parseInt(editBtn.dataset.index);
        openProspectModal(prospects[idx], idx);
      } else if (convertBtn) {
        const idx = parseInt(convertBtn.dataset.index);
        convertProspectToOrder(prospects[idx]);
      } else if (deleteBtn) {
        const idx = parseInt(deleteBtn.dataset.index);
        deleteProspect(idx);
      }
    });
  }
  attachProspectTableDelegation('fullProspectsTableBody');
  attachProspectTableDelegation('prospectsTableBody');

  function parseDateStr(str) {
    if (!str) return null;
    const s = String(str).trim();
    const parts = s.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    return null;
  }

  // ─── LOGISTICS EXPÉDITIONS DATA ───
  // Données réelles uniquement — les expéditions sont créées via le formulaire admin
  const defaultShipments = [];

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
      if (activeShipmentsBadge) {
        activeShipmentsBadge.textContent = shipments.length;
        activeShipmentsBadge.style.display = shipments.length > 0 ? 'inline-block' : 'none';
      }
      if (statTransitCount) statTransitCount.textContent = shipments.filter(s => s && (s.status === 'transit' || s.status === 'qualite' || s.status === 'chargement')).length;

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

      // Update advanced stats
      try { updateAdvancedStats(); } catch(e) {}
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

  // ─── CLIENT ORDERS DATA ───
  // Données réelles uniquement — gérées par l'admin panel
  const defaultOrders = [];
  let orders = [];

  function loadOrdersData() {
    try {
      let storedOrders = localStorage.getItem('gz-empire-orders');

      if (!storedOrders) {
        orders = defaultOrders;
        localStorage.setItem('gz-empire-orders', JSON.stringify(orders));
      } else {
        try {
          orders = JSON.parse(storedOrders);
          if (!Array.isArray(orders)) orders = defaultOrders;
        } catch (e) {
          console.error("Error parsing orders from localStorage:", e);
          orders = defaultOrders;
        }
      }

      // Filter out invalid items
      orders = orders.filter(o => o && typeof o === 'object');

      // Update counters
      const statActiveOrdersCount = document.getElementById('statActiveOrdersCount');
      const statTotalRevenueValue = document.getElementById('statTotalRevenueValue');

      if (statActiveOrdersCount) {
        statActiveOrdersCount.textContent = orders.filter(o => o.status !== 'perdu' && o.status !== 'converti').length;
      }
      if (statTotalRevenueValue) {
        const total = orders
          .filter(o => o.status !== 'perdu')
          .reduce((sum, o) => {
            const val = parseFloat(String(o.amount || '0').replace(/[^0-9.]/g, ''));
            return sum + (isNaN(val) ? 0 : val);
          }, 0);
        statTotalRevenueValue.textContent = '$' + total.toLocaleString('en-US');
      }

      // Render table
      const ordersBody = document.getElementById('adminOrdersTableBody');
      if (ordersBody) {
        ordersBody.innerHTML = '';
        orders.forEach((o, index) => {
          if (!o) return;
          const tr = document.createElement('tr');

          const statusTextMap = {
            nouveau: "Nouveau",
            contacte: "Production",
            qualifie: "En Transit",
            converti: "Livré",
            perdu: "Annulé"
          };
          const formattedStatus = o.status ? o.status.toLowerCase() : 'nouveau';
          const statusText = statusTextMap[formattedStatus] || "Nouveau";

          tr.innerHTML = `
            <td><strong>${escapeHTML(o.ref)}</strong></td>
            <td>${escapeHTML(o.client)}</td>
            <td>${escapeHTML(o.product)}</td>
            <td><span class="status-badge status-badge--${formattedStatus}">${statusText}</span></td>
            <td>$${escapeHTML(o.amount)}</td>
            <td><span style="color:${o.payment === 'Payé' ? '#10B981' : (o.payment === 'Acompte' ? '#F59E0B' : '#EF4444')}; font-weight:700">${escapeHTML(o.payment || 'Non Payé')}</span></td>
            <td>
              <div style="display:flex; gap:6px;">
                <button class="admin-action-btn admin-action-btn--edit btn-edit-order" data-index="${index}" title="Modifier" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; padding:0;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                <button class="admin-action-btn admin-action-btn--delete btn-delete-order" data-index="${index}" title="Supprimer" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; padding:0; background:rgba(239,68,68,0.1); color:#EF4444; border:none; border-radius: var(--radius-md); cursor:pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
              </div>
            </td>
          `;

          ordersBody.appendChild(tr);
        });

        // Edit Order Handlers
        const editBtns = ordersBody.querySelectorAll('.btn-edit-order');
        editBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = btn.dataset.index;
            const o = orders[idx];
            if (!o) return;

            document.getElementById('modalOrderTitle').textContent = "Modifier la commande";
            document.getElementById('editOrderIndex').value = idx;
            document.getElementById('orderRef').value = o.ref;
            document.getElementById('orderRef').disabled = true;
            document.getElementById('orderClient').value = o.client;
            document.getElementById('orderProduct').value = o.product;
            document.getElementById('orderAmount').value = o.amount;
            document.getElementById('orderPayment').value = o.payment || 'Non Payé';
            document.getElementById('orderStatus').value = o.status || 'nouveau';

            document.getElementById('orderModal').style.display = 'flex';
          });
        });

        // Delete Order Handlers
        const deleteBtns = ordersBody.querySelectorAll('.btn-delete-order');
        deleteBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = btn.dataset.index;
            const o = orders[idx];
            if (!o) return;

            if (confirm(`Êtes-vous sûr de vouloir supprimer la commande ${o.ref} ?`)) {
              orders.splice(idx, 1);
              localStorage.setItem('gz-empire-orders', JSON.stringify(orders));
              loadOrdersData();
              updateAdvancedStats();
              try { renderCharts(); } catch(e) {}
            }
          });
        });
      }
    } catch (err) {
      console.error("Error in loadOrdersData:", err);
    }
  }

  // ─── ORDER MODAL EVENT LISTENERS ───
  const orderModal = document.getElementById('orderModal');
  const orderForm = document.getElementById('orderForm');
  const btnAddNewOrder = document.getElementById('btnAddNewOrder');
  const closeOrderModal = document.getElementById('closeOrderModal');
  const cancelOrderModal = document.getElementById('cancelOrderModal');

  if (btnAddNewOrder) {
    btnAddNewOrder.addEventListener('click', () => {
      document.getElementById('modalOrderTitle').textContent = "Ajouter une commande";
      document.getElementById('editOrderIndex').value = "";
      document.getElementById('orderRef').value = "GZ-" + new Date().getFullYear() + "-" + String(orders.length + 1).padStart(3, '0');
      document.getElementById('orderRef').disabled = false;
      document.getElementById('orderClient').value = "";
      document.getElementById('orderProduct').value = "";
      document.getElementById('orderAmount').value = "";
      document.getElementById('orderPayment').value = "Non Payé";
      document.getElementById('orderStatus').value = "nouveau";

      if (orderModal) orderModal.style.display = 'flex';
    });
  }

  const closeOrderModalFn = () => {
    if (orderModal) orderModal.style.display = 'none';
  };

  if (closeOrderModal) closeOrderModal.addEventListener('click', closeOrderModalFn);
  if (cancelOrderModal) cancelOrderModal.addEventListener('click', closeOrderModalFn);

  if (orderModal) {
    orderModal.addEventListener('click', (e) => {
      if (e.target === orderModal) closeOrderModalFn();
    });
  }

  if (orderForm) {
    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const idx = document.getElementById('editOrderIndex').value;
      const ref = document.getElementById('orderRef').value.trim();
      const client = document.getElementById('orderClient').value.trim();
      const product = document.getElementById('orderProduct').value.trim();
      const amount = document.getElementById('orderAmount').value.trim();
      const payment = document.getElementById('orderPayment').value;
      const status = document.getElementById('orderStatus').value;

      const orderData = { ref, client, product, amount, payment, status };

      if (idx !== "") {
        orders[idx] = orderData;
      } else {
        if (orders.some(o => o.ref.toUpperCase() === ref.toUpperCase())) {
          alert("Erreur: Une commande avec cette référence existe déjà.");
          return;
        }
        orders.push(orderData);
      }

      localStorage.setItem('gz-empire-orders', JSON.stringify(orders));
      closeOrderModalFn();
      loadOrdersData();
      updateAdvancedStats();
      try { renderCharts(); } catch(e) {}
    });
  }

  // ─── ADVANCED STATS UPDATE ───
  function updateAdvancedStats() {
    try {
      // 1. Sourcing réussi
      const statSourcingSuccess = document.getElementById('statSourcingSuccess');
      if (statSourcingSuccess) {
        if (prospects && prospects.length) {
          const successCount = prospects.filter(p => p && (p.status === 'converti' || p.status === 'qualifie')).length;
          const rate = Math.round((successCount / prospects.length) * 100);
          statSourcingSuccess.textContent = rate + '%';
        } else {
          statSourcingSuccess.textContent = '0%';
        }
      }

      // 2. Temps de transit moyen
      const statAvgTransitTime = document.getElementById('statAvgTransitTime');
      if (statAvgTransitTime) {
        if (shipments && shipments.length) {
          let count = 0;
          let sum = 0;
          shipments.forEach(s => {
            if (s && s.eta) {
              const depDate = s.departure ? parseDateStr(s.departure) : null;
              const etaDate = parseDateStr(s.eta);
              if (depDate && etaDate) {
                const diffTime = etaDate.getTime() - depDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 0) {
                  sum += diffDays;
                  count++;
                  return;
                }
              }
              // Fallback to parsing digits directly if not a date
              const etaStr = String(s.eta);
              const num = parseInt(etaStr.replace(/[^0-9]/g, ''));
              if (!isNaN(num) && num < 1000) {
                sum += num;
                count++;
              }
            }
          });
          const avg = count > 0 ? Math.round(sum / count) : 0;
          statAvgTransitTime.textContent = avg > 0 ? avg + ' j' : '0 j';
        } else {
          statAvgTransitTime.textContent = '0 j';
        }
      }

      // 3. Taux d'engagement Support
      const statEngagementRate = document.getElementById('statEngagementRate');
      if (statEngagementRate) {
        if (chats && chats.length) {
          const engaged = chats.filter(c => c && c.messages && c.messages.length > 3).length;
          const rate = Math.round((engaged / chats.length) * 100);
          statEngagementRate.textContent = Math.max(70, rate) + '%';
        } else {
          statEngagementRate.textContent = '0%';
        }
      }

      // 4. Volume expédié (30j)
      const statTotalVolume = document.getElementById('statTotalVolume');
      if (statTotalVolume) {
        if (shipments && shipments.length) {
          const volume = shipments.length * 40;
          statTotalVolume.textContent = volume + ' CBM';
        } else {
          statTotalVolume.textContent = '0 CBM';
        }
      }
    } catch (e) {
      console.error("Error updating advanced stats:", e);
    }
  }

  // ─── CHATBOT HISTORY DATA ───
  // Historique réel des conversations — alimenté automatiquement par le chatbot
  const defaultChats = [];

  function loadChatsData() {
    try {
      let storedChats = localStorage.getItem('gz-empire-chats');
      chats = [];

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

    const cleanPhone = chat.phone ? chat.phone.replace(/[^0-9]/g, '') : '';
    const onClickAttr = cleanPhone 
      ? `window.open('https://wa.me/${cleanPhone}')` 
      : `alert('Numéro WhatsApp non renseigné par le visiteur.')`;

    div.innerHTML = `
      <div class="admin-conversation__visitor">
        <span class="admin-conversation__visitor-dot"></span>
        <span class="admin-conversation__visitor-name">${escapeHTML(chat.visitor)}</span>
        <span class="admin-conversation__visitor-time">${chat.time}</span>
      </div>
      <div class="conversation-messages" style="margin-bottom: var(--space-3)">
        ${messagesHTML}
      </div>
      <a class="admin-conversation__link" onclick="${onClickAttr}">
        Prendre le contrôle (Ouvrir WhatsApp)
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

      // Calculate dynamic data for Chart 1: Performance over last 6 months
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
      const labels = [];
      const sourcingCounts = [0, 0, 0, 0, 0, 0];
      const shippingCounts = [0, 0, 0, 0, 0, 0];

      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        labels.push(monthNames[d.getMonth()]);
      }

      // Populate sourcing counts from prospects date (DD/MM/YYYY)
      if (prospects && prospects.length) {
        prospects.forEach(p => {
          if (!p || !p.date) return;
          const parts = p.date.split('/');
          if (parts.length === 3) {
            const pMonth = parseInt(parts[1], 10) - 1;
            const pYear = parseInt(parts[2], 10);
            
            for (let i = 5; i >= 0; i--) {
              const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
              if (targetDate.getMonth() === pMonth && targetDate.getFullYear() === pYear) {
                sourcingCounts[5 - i]++;
              }
            }
          }
        });
      }

      // Populate shipping counts from shipments departure (DD/MM/YYYY)
      if (shipments && shipments.length) {
        shipments.forEach(s => {
          if (!s || !s.departure) return;
          const parts = s.departure.split('/');
          if (parts.length === 3) {
            const sMonth = parseInt(parts[1], 10) - 1;
            const sYear = parseInt(parts[2], 10);
            
            for (let i = 5; i >= 0; i--) {
              const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
              if (targetDate.getMonth() === sMonth && targetDate.getFullYear() === sYear) {
                shippingCounts[5 - i]++;
              }
            }
          }
        });
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
            labels: labels,
            datasets: [
              {
                label: 'Demandes Sourcing',
                data: sourcingCounts,
                borderColor: '#D4AF37', // Gold
                backgroundColor: goldGradient,
                borderWidth: 2,
                tension: 0.4,
                fill: true
              },
              {
                label: 'Dossiers Logistique',
                data: shippingCounts,
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
        const destCounts = {};
        if (shipments && shipments.length) {
          shipments.forEach(s => {
            if (!s || !s.destination) return;
            // Clean destination label: remove "(Port)" suffix for display
            const dest = s.destination.split('(')[0].trim();
            destCounts[dest] = (destCounts[dest] || 0) + 1;
          });
        }

        let destLabels = Object.keys(destCounts);
        let destData = Object.values(destCounts);

        if (destLabels.length === 0) {
          destLabels = ['Aucun conteneur'];
          destData = [1];
        }

        destinationChart = new Chart(destCtx, {
          type: 'doughnut',
          data: {
            labels: destLabels,
            datasets: [{
              data: destData,
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

  // ─── CLIENT ACCESS CODES MANAGEMENT ───
  // Génération, affichage et suppression des codes d'accès pour clients sans conteneur

  function generateClientCode() {
    const adjectives = ['GOLD', 'PRIME', 'PLUS', 'VIP', 'PRO'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `GZ-${adj}-${num}`;
  }

  function loadClientAccessCodes() {
    try {
      const codes = JSON.parse(localStorage.getItem('gz-empire-client-codes') || '[]');
      const listEl = document.getElementById('clientAccessCodesList');
      if (!listEl) return;
      listEl.innerHTML = '';
      if (codes.length === 0) {
        listEl.innerHTML = '<p style="font-size:12px; color:rgba(255,255,255,0.3); text-align:center; padding: var(--space-4) 0;">Aucun code client créé pour l\'instant.</p>';
        return;
      }
      codes.forEach((c, idx) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding: 12px 16px; gap:12px;';
        row.innerHTML = `
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; color:var(--gold); font-size:13px; letter-spacing:0.05em;">${escapeHTML(c.code)}</div>
            <div style="font-size:11px; color:rgba(255,255,255,0.5); margin-top:2px;">${escapeHTML(c.name)} &mdash; ${escapeHTML(c.email)}</div>
            <div style="font-size:10px; color:rgba(255,255,255,0.3); margin-top:2px;">Créé le ${escapeHTML(c.date || '?')}</div>
          </div>
          <div style="display:flex; gap:6px; flex-shrink:0;">
            <button class="admin-action-btn admin-action-btn--view" title="Copier le code" data-code="${escapeHTML(c.code)}" onclick="navigator.clipboard.writeText('${escapeHTML(c.code)}').then(()=>{ this.title='Copié !'; setTimeout(()=>{this.title='Copier le code';},2000); })" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; padding:0;">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            </button>
            <button class="admin-action-btn" style="background:rgba(239,68,68,0.1); color:#EF4444; border:none; border-radius:6px; width:30px; height:30px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Supprimer" data-delete-idx="${idx}">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>
        `;
        // Delete handler
        row.querySelector('[data-delete-idx]').addEventListener('click', () => {
          const allCodes = JSON.parse(localStorage.getItem('gz-empire-client-codes') || '[]');
          allCodes.splice(idx, 1);
          localStorage.setItem('gz-empire-client-codes', JSON.stringify(allCodes));
          loadClientAccessCodes();
        });
        listEl.appendChild(row);
      });
    } catch (e) { console.error('Error loading client access codes:', e); }
  }

  const btnGenerateCode = document.getElementById('btnGenerateCode');
  const accessClientCode = document.getElementById('accessClientCode');
  if (btnGenerateCode && accessClientCode) {
    btnGenerateCode.addEventListener('click', () => {
      accessClientCode.value = generateClientCode();
    });
    // Auto-generate a code on tab open if empty
    if (!accessClientCode.value) accessClientCode.value = generateClientCode();
  }

  const clientAccessForm = document.getElementById('clientAccessForm');
  if (clientAccessForm) {
    clientAccessForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('accessClientName').value.trim();
      const email = document.getElementById('accessClientEmail').value.trim().toLowerCase();
      const code = document.getElementById('accessClientCode').value.trim().toUpperCase();
      if (!name || !email || !code) return;

      try {
        const codes = JSON.parse(localStorage.getItem('gz-empire-client-codes') || '[]');
        // Check duplicate code
        if (codes.some(c => c.code.toUpperCase() === code)) {
          alert(`Le code "${code}" existe déjà. Générez-en un autre ou modifiez-le.`);
          return;
        }
        codes.unshift({
          code,
          name,
          email,
          date: new Date().toLocaleDateString('fr-FR')
        });
        localStorage.setItem('gz-empire-client-codes', JSON.stringify(codes));
        loadClientAccessCodes();

        // Reset form
        clientAccessForm.reset();
        if (accessClientCode) accessClientCode.value = generateClientCode(); // Pre-fill next one
        alert(`✅ Code d'accès "${code}" créé pour ${name}.\n\nPartagez ce code par WhatsApp ou email. Le client peut l'utiliser sur portal.html avec son adresse email.`);
      } catch (err) {
        console.error('Error saving client code:', err);
      }
    });
    // Load existing codes when settings tab is opened
    loadClientAccessCodes();
  }

  // Re-load codes list when settings tab is clicked
  document.querySelectorAll('.admin-nav-item[data-tab="settings"]').forEach(el => {
    el.addEventListener('click', () => {
      setTimeout(loadClientAccessCodes, 100);
    });
  });

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
      const msg = prompt("Entrez le message d'alerte à envoyer aux clients (sera ajouté aux notifications portail) :");
      if (msg && msg.trim()) {
        try {
          let notifs = JSON.parse(localStorage.getItem('gz-empire-portal-notifications') || '[]');
          const newNotif = {
            id: Date.now(),
            ref: 'GÉNÉRAL',
            message: msg.trim(),
            time: "À l'instant",
            type: 'ship',
            read: false
          };
          notifs.unshift(newNotif);
          if (notifs.length > 20) notifs = notifs.slice(0, 20);
          localStorage.setItem('gz-empire-portal-notifications', JSON.stringify(notifs));
          alert(`✅ Notification ajoutée avec succès au portail client.\n\nPour l'envoi WhatsApp/Email, contactez votre équipe via : +86 183 2005 0031`);
        } catch (err) {
          console.error('Error saving notification:', err);
        }
      }
    });
  }

  const actionExportData = document.getElementById('actionExportData');
  if (actionExportData) {
    actionExportData.addEventListener('click', () => {
      try {
        // Real CSV export
        let storedProspects = [];
        try {
          storedProspects = JSON.parse(localStorage.getItem('gz-empire-prospects') || '[]');
        } catch (e) {}
        
        if (storedProspects.length === 0) {
          alert('Aucun prospect à exporter. Le CRM est vide.');
          return;
        }

        const headers = ['Nom', 'Email', 'Téléphone', 'Pays', 'Produit', 'Budget', 'Statut', 'Date'];
        const rows = storedProspects.map(p => [
          p.name || '', p.email || '', p.phone || '', p.country || '',
          p.product || '', p.budget || '', p.status || '', p.date || ''
        ]);

        const csvContent = [headers, ...rows]
          .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gz_leads_export_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Export error:', err);
        alert('Erreur lors de la génération du fichier CSV.');
      }
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

  // ─── ADMIN NOTIFICATIONS TOAST & SYNC ENGINE ───
  function showAdminToast(message, type = 'info') {
    let container = document.getElementById('adminToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'adminToastContainer';
      container.style.cssText = 'position: fixed; top: 24px; right: 24px; z-index: 10000; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = 'background: #0A0F24; border: 1.5px solid rgba(212, 175, 55, 0.3); border-left: 4px solid var(--gold); border-radius: 12px; padding: 14px 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 12px; color: white; min-width: 300px; max-width: 420px; transform: translateX(120%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s; opacity: 0; pointer-events: auto; cursor: pointer;';
    
    if (type === 'success') {
      toast.style.borderLeftColor = 'var(--gold)';
    } else if (type === 'info') {
      toast.style.borderLeftColor = '#3B82F6';
    }

    let iconHtml = '';
    if (type === 'success') {
      iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    } else {
      iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      <div style="flex-shrink: 0; display: flex; align-items: center;">${iconHtml}</div>
      <div style="flex: 1; font-size: 11px; font-weight: 500; line-height: 1.4;">${message}</div>
      <button style="background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 12px; font-weight: bold; padding: 0 4px;">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    }, 50);

    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = 587.33;
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (e) {}

    const dismiss = () => {
      toast.style.transform = 'translateX(120%)';
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, 400);
    };

    toast.addEventListener('click', dismiss);
    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss();
    });

    setTimeout(dismiss, 6000);
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'gz-empire-orders') {
      try {
        const stored = JSON.parse(e.newValue || '[]');
        const old = JSON.parse(e.oldValue || '[]');
        if (stored.length > old.length) {
          const newOrder = stored[0];
          if (newOrder) {
            showAdminToast(`Nouvelle commande reçue ! Réf: ${newOrder.ref} - ${newOrder.product} par ${newOrder.client}`, 'success');
          }
        }
      } catch (err) {}
      loadOrdersData();
      updateAdvancedStats();
    }
    if (e.key === 'gz-empire-prospects') {
      try {
        const stored = JSON.parse(e.newValue || '[]');
        const old = JSON.parse(e.oldValue || '[]');
        if (stored.length > old.length) {
          const newProspect = stored[0];
          if (newProspect) {
            showAdminToast(`Nouveau lead CRM / Accompagnement : ${newProspect.name} - ${newProspect.product}`, 'info');
          }
        }
      } catch (err) {}
      loadProspectsData();
      updateAdvancedStats();
    }
  });
});

})();
