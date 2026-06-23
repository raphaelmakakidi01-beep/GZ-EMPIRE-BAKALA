/* ============================================================
   GZ-EMPIRE — Quote Page Logic
   Multi-step wizard, calculations, validation
   ============================================================ */

(function () {
  'use strict';

  // ─── State ───
  const state = {
    currentStep: 1,
    totalSteps: 4,
    data: {
      productType: '',
      productDescription: '',
      categoryTags: [],
      quantity: '',
      unit: 'pièces',
      weight: '',
      volume: '',
      packaging: 'Standard',
      country: '',
      city: '',
      address: '',
      incoterm: 'FOB',
      transport: '',
      insurance: false,
      customs: false,
      instructions: ''
    }
  };

  // ─── Cost Data ───
  const baseCosts = {
    'Électronique': 3.5,
    'Textile': 1.8,
    'Machinerie': 5.2,
    'Matériaux de construction': 2.5,
    'Produits alimentaires': 2.2,
    'Cosmétiques': 3.0,
    'Pièces auto': 2.8,
    'Mobilier': 3.2,
    'Autre': 2.5
  };

  const distanceFactors = {
    'Congo-Brazzaville': 1.4,
    'RDC': 1.5,
    'Cameroun': 1.3,
    'Côte d\'Ivoire': 1.35,
    'Sénégal': 1.45,
    'France': 1.1,
    'Belgique': 1.1,
    'Canada': 1.6,
    'USA': 1.5,
    'Autre': 1.3
  };

  const transportMultipliers = {
    'maritime': { multiplier: 1.0, delayMin: 25, delayMax: 45, label: 'Fret Maritime' },
    'aerien':   { multiplier: 3.5, delayMin: 5, delayMax: 10, label: 'Fret Aérien' },
    'mixte':    { multiplier: 2.0, delayMin: 15, delayMax: 25, label: 'Mixte' }
  };

  const packagingCosts = {
    'Standard': 0,
    'Renforcé': 0.15,
    'Fragile': 0.25,
    'Dangereux': 0.40
  };

  const incotermAdjustments = {
    'FOB': 1.0,
    'CIF': 1.12,
    'DDP': 1.35,
    'EXW': 0.92
  };

  const containerRecommendations = {
    small:  { name: 'Groupage (LCL)', desc: 'Conteneur partagé — idéal pour moins de 15 CBM' },
    medium: { name: '20\' Standard', desc: 'Conteneur 20 pieds — jusqu\'à 33 CBM / 28 tonnes' },
    large:  { name: '40\' Standard', desc: 'Conteneur 40 pieds — jusqu\'à 67 CBM / 26 tonnes' },
    xlarge: { name: '40\' High Cube', desc: 'Conteneur 40 pieds HC — jusqu\'à 76 CBM / 26 tonnes' }
  };

  const tips = {
    'Électronique': [
      'Exigez un emballage anti-statique et des protections en mousse pour vos composants électroniques.',
      'Demandez un certificat de conformité CE/FCC pour faciliter le dédouanement.',
      'Prévoyez une assurance cargo complète — les produits électroniques sont sensibles aux chocs.',
      'Vérifiez que les adaptateurs secteur sont compatibles avec les normes du pays de destination.'
    ],
    'Textile': [
      'Demandez des échantillons avant de valider une commande en gros pour vérifier la qualité du tissu.',
      'Prévoyez des sachets plastique individuels pour protéger contre l\'humidité pendant le transport.',
      'Vérifiez les réglementations d\'importation textile du pays de destination (quotas, certifications).',
      'Négociez les MOQ (quantité minimum) — souvent flexibles dans le textile.'
    ],
    'Machinerie': [
      'Demandez une inspection pré-expédition par un tiers pour vérifier les spécifications.',
      'Prévoyez le transport de pièces de rechange et les manuels d\'utilisation.',
      'Vérifiez les tensions électriques et normes de sécurité du pays destinataire.',
      'Le fret maritime est recommandé pour les équipements lourds — plus économique.'
    ],
    'Matériaux de construction': [
      'Vérifiez les normes de construction locales avant d\'importer des matériaux.',
      'Le transport maritime en conteneur est optimal pour les charges lourdes.',
      'Prévoyez un emballage renforcé pour les matériaux fragiles comme les carrelages.',
      'Planifiez la logistique de déchargement — certains matériaux nécessitent des grues.'
    ],
    'Produits alimentaires': [
      'Exigez les certifications sanitaires et phytosanitaires requises.',
      'Vérifiez la chaîne du froid si vos produits sont périssables.',
      'Les délais de transit sont critiques — privilégiez le fret aérien si nécessaire.',
      'Anticipez les contrôles douaniers renforcés sur les produits alimentaires.'
    ],
    'Cosmétiques': [
      'Assurez-vous que vos produits respectent les réglementations cosmétiques du pays d\'importation.',
      'Demandez les fiches de sécurité (MSDS) pour tous les produits chimiques.',
      'L\'emballage doit être étanche pour éviter les fuites pendant le transport.',
      'Les cosmétiques contenant certains ingrédients peuvent être soumis à des restrictions.'
    ],
    'Pièces auto': [
      'Vérifiez la compatibilité des pièces avec les modèles de véhicules du marché local.',
      'Demandez les certificats d\'origine et de conformité pour chaque lot.',
      'L\'emballage individuel avec références claires facilite le stockage et la revente.',
      'Négociez une garantie fabricant d\'au moins 6 mois sur les pièces auto.'
    ],
    'Mobilier': [
      'Le conditionnement en kit (CKD) réduit considérablement les coûts de transport.',
      'Prévoyez des protections d\'angle et du film étirable pour éviter les rayures.',
      'Vérifiez les certifications bois (PEFC, FSC) exigées à l\'importation.',
      'Anticipez les frais de montage si les meubles arrivent en kit.'
    ],
    'Autre': [
      'Contactez-nous pour une analyse personnalisée de votre type de produit.',
      'Nous vous accompagnons dans le sourcing, la qualité et la logistique.',
      'Des tarifs préférentiels sont disponibles pour les envois réguliers.',
      'Notre équipe peut organiser une inspection usine avant expédition.'
    ]
  };

  // ─── DOM Elements ───
  const progressSteps = document.querySelectorAll('.wizard-progress__step');
  const progressLines = document.querySelectorAll('.wizard-progress__line');
  const panels = document.querySelectorAll('.wizard-panel');
  const stepCounter = document.getElementById('stepCounter');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const wizardForm = document.getElementById('quoteWizard');
  const resultsPanel = document.getElementById('quoteResults');

  // ─── Init ───
  function init() {
    updateUI();
    bindEvents();
    initScrollReveal();
  }

  // ─── Bind Events ───
  function bindEvents() {
    // Navigation
    if (prevBtn) prevBtn.addEventListener('click', prevStep);
    if (nextBtn) nextBtn.addEventListener('click', nextStep);

    // Category tags
    document.querySelectorAll('.category-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        tag.classList.toggle('selected');
        updateCategoryTags();
      });
    });

    // Unit selector
    document.querySelectorAll('.unit-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.unit-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        state.data.unit = option.dataset.value;
      });
    });

    // Packaging options
    document.querySelectorAll('.packaging-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.packaging-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        state.data.packaging = option.dataset.value;
      });
    });

    // Country options
    document.querySelectorAll('.country-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.country-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        state.data.country = option.dataset.value;
      });
    });

    // Incoterm options
    document.querySelectorAll('.incoterm-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.incoterm-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        state.data.incoterm = option.dataset.value;
      });
    });

    // Transport cards
    document.querySelectorAll('.transport-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.transport-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        state.data.transport = card.dataset.value;
      });
    });

    // Toggle switches
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        const field = toggle.dataset.field;
        if (field) state.data[field] = toggle.classList.contains('active');
      });
    });

    // Form inputs
    const productType = document.getElementById('productType');
    if (productType) productType.addEventListener('change', (e) => state.data.productType = e.target.value);

    const productDesc = document.getElementById('productDescription');
    if (productDesc) productDesc.addEventListener('input', (e) => state.data.productDescription = e.target.value);

    const quantity = document.getElementById('quantity');
    if (quantity) quantity.addEventListener('input', (e) => state.data.quantity = e.target.value);

    const weight = document.getElementById('weight');
    if (weight) weight.addEventListener('input', (e) => state.data.weight = e.target.value);

    const volume = document.getElementById('volume');
    if (volume) volume.addEventListener('input', (e) => state.data.volume = e.target.value);

    const city = document.getElementById('city');
    if (city) city.addEventListener('input', (e) => state.data.city = e.target.value);

    const address = document.getElementById('address');
    if (address) address.addEventListener('input', (e) => state.data.address = e.target.value);

    const instructions = document.getElementById('instructions');
    if (instructions) instructions.addEventListener('input', (e) => state.data.instructions = e.target.value);

    // FAQ accordion
    document.querySelectorAll('.faq-item__question').forEach(question => {
      question.addEventListener('click', () => {
        const item = question.closest('.faq-item');
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });

    // Results CTA buttons
    const confirmBtn = document.getElementById('confirmBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', submitQuote);

    const modifyBtn = document.getElementById('modifyBtn');
    if (modifyBtn) modifyBtn.addEventListener('click', modifyQuote);

    const whatsappBtn = document.getElementById('whatsappBtn');
    if (whatsappBtn) whatsappBtn.addEventListener('click', shareWhatsApp);
  }

  // ─── Step Navigation ───
  function nextStep() {
    if (!validateStep(state.currentStep)) return;
    collectStepData(state.currentStep);

    if (state.currentStep < state.totalSteps) {
      state.currentStep++;
      updateUI();
      scrollToWizard();
    } else {
      showResults();
    }
  }

  function prevStep() {
    if (state.currentStep > 1) {
      state.currentStep--;
      updateUI();
      scrollToWizard();
    }
  }

  function scrollToWizard() {
    const wizard = document.querySelector('.quote-wizard');
    if (wizard) {
      wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ─── UI Update ───
  function updateUI() {
    // Update progress
    progressSteps.forEach((step, i) => {
      const num = i + 1;
      step.classList.remove('active', 'completed');
      if (num === state.currentStep) step.classList.add('active');
      if (num < state.currentStep) step.classList.add('completed');
    });

    progressLines.forEach((line, i) => {
      line.classList.toggle('completed', i < state.currentStep - 1);
    });

    // Update completed step dots to show checkmark
    progressSteps.forEach((step, i) => {
      const circle = step.querySelector('.wizard-progress__circle');
      if (i + 1 < state.currentStep) {
        circle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
      } else {
        circle.textContent = i + 1;
      }
    });

    // Update panels
    panels.forEach((panel, i) => {
      panel.classList.toggle('active', i + 1 === state.currentStep);
    });

    // Update step counter
    if (stepCounter) {
      stepCounter.innerHTML = 'Étape <strong>' + state.currentStep + '</strong> / ' + state.totalSteps;
    }

    // Update buttons
    if (prevBtn) {
      prevBtn.style.visibility = state.currentStep === 1 ? 'hidden' : 'visible';
    }

    if (nextBtn) {
      if (state.currentStep === state.totalSteps) {
        nextBtn.innerHTML = '<span data-i18n="quote.submit">Obtenir mon devis</span> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
      } else {
        nextBtn.innerHTML = '<span data-i18n="quote.next">Suivant</span> <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
      }
    }
  }

  // ─── Validation ───
  function validateStep(step) {
    clearErrors();
    let isValid = true;

    switch (step) {
      case 1: {
        const productType = document.getElementById('productType');
        if (!productType.value) {
          showError(productType, 'Veuillez sélectionner un type de produit');
          isValid = false;
        }
        break;
      }
      case 2: {
        const quantity = document.getElementById('quantity');
        const weight = document.getElementById('weight');
        if (!quantity.value || parseFloat(quantity.value) <= 0) {
          showError(quantity, 'Veuillez indiquer une quantité valide');
          isValid = false;
        }
        if (!weight.value || parseFloat(weight.value) <= 0) {
          showError(weight, 'Veuillez indiquer un poids estimé');
          isValid = false;
        }
        break;
      }
      case 3: {
        if (!state.data.country) {
          const grid = document.querySelector('.country-grid');
          if (grid) {
            grid.style.border = '2px solid var(--error)';
            grid.style.borderRadius = 'var(--radius-lg)';
            grid.style.padding = 'var(--space-2)';
            setTimeout(() => {
              grid.style.border = '';
              grid.style.borderRadius = '';
              grid.style.padding = '';
            }, 3000);
          }
          isValid = false;
        }
        break;
      }
      case 4: {
        if (!state.data.transport) {
          const cards = document.querySelector('.transport-cards');
          if (cards) {
            cards.style.border = '2px solid var(--error)';
            cards.style.borderRadius = 'var(--radius-xl)';
            cards.style.padding = 'var(--space-2)';
            setTimeout(() => {
              cards.style.border = '';
              cards.style.borderRadius = '';
              cards.style.padding = '';
            }, 3000);
          }
          isValid = false;
        }
        break;
      }
    }

    return isValid;
  }

  function showError(input, message) {
    input.style.borderColor = 'var(--error)';
    const errorEl = document.createElement('div');
    errorEl.className = 'form-error';
    errorEl.style.color = 'var(--error)';
    errorEl.style.fontSize = 'var(--text-xs)';
    errorEl.style.marginTop = 'var(--space-1)';
    errorEl.textContent = message;
    input.parentNode.appendChild(errorEl);

    input.addEventListener('input', () => {
      input.style.borderColor = '';
      const err = input.parentNode.querySelector('.form-error');
      if (err) err.remove();
    }, { once: true });
  }

  function clearErrors() {
    document.querySelectorAll('.form-error').forEach(e => e.remove());
    document.querySelectorAll('[style*="border-color"]').forEach(e => {
      e.style.borderColor = '';
    });
  }

  // ─── Collect Step Data ───
  function collectStepData(step) {
    switch (step) {
      case 1:
        state.data.productType = document.getElementById('productType').value;
        state.data.productDescription = document.getElementById('productDescription').value;
        break;
      case 2:
        state.data.quantity = document.getElementById('quantity').value;
        state.data.weight = document.getElementById('weight').value;
        state.data.volume = document.getElementById('volume').value;
        break;
      case 3:
        state.data.city = document.getElementById('city').value;
        state.data.address = document.getElementById('address').value;
        break;
      case 4:
        state.data.instructions = document.getElementById('instructions').value;
        break;
    }
  }

  function updateCategoryTags() {
    state.data.categoryTags = [];
    document.querySelectorAll('.category-tag.selected').forEach(tag => {
      state.data.categoryTags.push(tag.textContent.trim());
    });
  }

  // ─── Calculate Quote ───
  function calculateQuote() {
    const product = state.data.productType || 'Autre';
    const weight = parseFloat(state.data.weight) || 100;
    const volume = parseFloat(state.data.volume) || 1;
    const country = state.data.country || 'Autre';
    const transport = state.data.transport || 'maritime';
    const packaging = state.data.packaging || 'Standard';
    const incoterm = state.data.incoterm || 'FOB';

    // Base calculation
    const baseCost = baseCosts[product] || 2.5;
    const distFactor = distanceFactors[country] || 1.3;
    const transMult = transportMultipliers[transport] || transportMultipliers['maritime'];
    const packCost = packagingCosts[packaging] || 0;
    const incoAdj = incotermAdjustments[incoterm] || 1.0;

    // Formula: (base × weight × distanceFactor × transportMultiplier × incotermAdj) + packaging premium
    let totalCost = (baseCost * weight * distFactor * transMult.multiplier * incoAdj);
    totalCost += totalCost * packCost;

    // Insurance adds 2%
    if (state.data.insurance) {
      totalCost += totalCost * 0.02;
    }

    // Customs assistance adds flat fee
    if (state.data.customs) {
      totalCost += 250;
    }

    // Min cost
    totalCost = Math.max(totalCost, 150);

    // Container recommendation
    let container;
    if (volume < 15) container = containerRecommendations.small;
    else if (volume < 33) container = containerRecommendations.medium;
    else if (volume < 67) container = containerRecommendations.large;
    else container = containerRecommendations.xlarge;

    // Product-specific tips
    const productTips = tips[product] || tips['Autre'];

    return {
      cost: Math.round(totalCost),
      costMin: Math.round(totalCost * 0.85),
      costMax: Math.round(totalCost * 1.15),
      delayMin: transMult.delayMin,
      delayMax: transMult.delayMax,
      transportLabel: transMult.label,
      container: container,
      tips: productTips
    };
  }

  // ─── Show Results ───
  function showResults() {
    collectStepData(state.currentStep);
    const result = calculateQuote();

    // Hide wizard, show results
    if (wizardForm) wizardForm.style.display = 'none';
    if (resultsPanel) {
      resultsPanel.classList.add('visible');
      resultsPanel.style.display = 'block';
    }

    // Populate result values
    const costEl = document.getElementById('resultCost');
    if (costEl) costEl.textContent = result.costMin.toLocaleString('fr-FR') + ' - ' + result.costMax.toLocaleString('fr-FR') + ' $';

    const delayEl = document.getElementById('resultDelay');
    if (delayEl) delayEl.textContent = result.delayMin + ' - ' + result.delayMax + ' jours';

    const containerName = document.getElementById('containerName');
    const containerDesc = document.getElementById('containerDesc');
    if (containerName) containerName.textContent = result.container.name;
    if (containerDesc) containerDesc.textContent = result.container.desc;

    // Tips
    const tipsList = document.getElementById('resultTips');
    if (tipsList) {
      tipsList.innerHTML = '';
      result.tips.forEach(tip => {
        const li = document.createElement('li');
        li.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> ' + tip;
        tipsList.appendChild(li);
      });
    }

    // Animate numbers
    animateValue(costEl, 0, result.costMin, 1200);

    // Scroll to results
    if (resultsPanel) {
      setTimeout(() => {
        resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }

  function animateValue(el, start, end, duration) {
    if (!el) return;
    const range = end - start;
    const startTime = performance.now();
    const result = calculateQuote();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + range * eased);
      el.textContent = current.toLocaleString('fr-FR') + ' - ' + result.costMax.toLocaleString('fr-FR') + ' $';

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // ─── Modify / Back to wizard ───
  function modifyQuote() {
    if (resultsPanel) {
      resultsPanel.classList.remove('visible');
      resultsPanel.style.display = 'none';
    }
    if (wizardForm) wizardForm.style.display = 'block';
    state.currentStep = 1;
    updateUI();
    scrollToWizard();
  }

  // ─── Submit Quote ───
  function submitQuote() {
    const overlay = document.getElementById('successOverlay');
    if (overlay) {
      overlay.classList.add('visible');
    }
  }

  // ─── Close Success Modal ───
  window.closeSuccessModal = function () {
    const overlay = document.getElementById('successOverlay');
    if (overlay) overlay.classList.remove('visible');
  };

  // ─── WhatsApp Share ───
  function shareWhatsApp() {
    const result = calculateQuote();
    const msg = encodeURIComponent(
      '*Demande de Devis — GZ-EMPIRE BAKALA*\n\n' +
      '• Produit: ' + (state.data.productType || 'Non spécifié') + '\n' +
      '• Description: ' + (state.data.productDescription || '-') + '\n' +
      '• Quantité: ' + (state.data.quantity || '-') + ' ' + state.data.unit + '\n' +
      '• Poids: ' + (state.data.weight || '-') + ' kg\n' +
      '• Destination: ' + (state.data.country || '-') + (state.data.city ? ', ' + state.data.city : '') + '\n' +
      '• Transport: ' + (result.transportLabel || '-') + '\n' +
      '• Estimation: ' + result.costMin.toLocaleString('fr-FR') + ' - ' + result.costMax.toLocaleString('fr-FR') + ' $\n' +
      '• Délai: ' + result.delayMin + '-' + result.delayMax + ' jours\n\n' +
      'Merci de me recontacter pour confirmer cette estimation.'
    );
    window.open('https://wa.me/8618320050031?text=' + msg, '_blank');
  }

  // ─── Scroll Reveal ───
  function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    if (!reveals.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(el => observer.observe(el));
  }

  // ─── Start ───
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
