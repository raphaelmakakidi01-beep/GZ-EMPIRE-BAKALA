/* ============================================================
   GZ-EMPIRE — Intelligent AI Sourcing Assistant Widget
   Injected automatically on all pages, qualifications flow,
   lead capturing synchronized with the Admin CRM prospects list
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

  // ─── DYNAMIC STYLE INJECTION ───
  const styles = `
    .gz-assistant-widget {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      font-family: 'Inter', sans-serif;
    }
    .gz-assistant-toggle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #D4AF37, #B8960E);
      border: 3px solid #071A52;
      box-shadow: 0 8px 30px rgba(212,175,55,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #071A52;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .gz-assistant-toggle:hover {
      transform: scale(1.1) rotate(5deg);
      box-shadow: 0 12px 35px rgba(212,175,55,0.6);
    }
    .gz-assistant-toggle__dot {
      width: 12px;
      height: 12px;
      background: #10B981;
      border: 2.5px solid #071A52;
      border-radius: 50%;
      position: absolute;
      top: 0;
      right: 0;
      animation: pulse-dot 2s ease-in-out infinite;
    }
    .gz-assistant-window {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 360px;
      height: 480px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(212,175,55,0.2);
      border-radius: 20px;
      box-shadow: 0 12px 40px rgba(7,26,82,0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: translateY(30px) scale(0.9);
      opacity: 0;
      pointer-events: none;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .gz-assistant-window.open {
      transform: translateY(0) scale(1);
      opacity: 1;
      pointer-events: auto;
    }
    .gz-assistant-header {
      background: linear-gradient(135deg, #071A52, #0A2472);
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: white;
      border-bottom: 2px solid rgba(212,175,55,0.2);
    }
    .gz-assistant-header__info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .gz-assistant-header__avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #D4AF37, #B8960E);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    .gz-assistant-header__name {
      font-weight: 700;
      font-size: 14px;
      font-family: 'Outfit', sans-serif;
    }
    .gz-assistant-header__status {
      font-size: 10px;
      color: #10B981;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .gz-assistant-header__close {
      cursor: pointer;
      color: rgba(255,255,255,0.6);
      transition: color 0.2s;
      background: none;
      border: none;
      padding: 4px;
    }
    .gz-assistant-header__close:hover {
      color: white;
    }
    .gz-assistant-body {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .gz-msg {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 13px;
      line-height: 1.5;
      animation: msgAppear 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .gz-msg--bot {
      background: #F0F2F5;
      color: #071A52;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    .gz-msg--user {
      background: linear-gradient(135deg, #071A52, #0A2472);
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .gz-assistant-footer {
      padding: 12px 16px;
      border-top: 1px solid #CED4DA;
      display: flex;
      gap: 8px;
      background: white;
    }
    .gz-assistant-input {
      flex: 1;
      border: 1.5px solid #CED4DA;
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .gz-assistant-input:focus {
      border-color: #D4AF37;
    }
    .gz-assistant-send {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #D4AF37, #B8960E);
      border: none;
      color: #071A52;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    .gz-assistant-send:hover {
      transform: scale(1.05);
    }
    @keyframes msgAppear {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 480px) {
      .gz-assistant-window {
        width: calc(100vw - 32px);
        height: 75vh;
        right: -8px;
        bottom: 72px;
      }
    }
  `;

  // Inject CSS
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // ─── ASSISTANT WIDGET INJECTION ───
  const widgetContainer = document.createElement('div');
  widgetContainer.className = 'gz-assistant-widget';
  widgetContainer.innerHTML = `
    <!-- Toggle Button -->
    <div class="gz-assistant-toggle" id="gzAssistantToggle" title="Parler à un conseiller" style="display: flex; align-items: center; justify-content: center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-gold);"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
      <span class="gz-assistant-toggle__dot"></span>
    </div>

    <!-- Chat Window -->
    <div class="gz-assistant-window" id="gzAssistantWindow">
      <!-- Header -->
      <div class="gz-assistant-header">
        <div class="gz-assistant-header__info">
          <div class="gz-assistant-header__avatar" style="display: flex; align-items: center; justify-content: center; color: var(--color-gold);">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
          </div>
          <div>
            <div class="gz-assistant-header__name">GZ-Support</div>
            <div class="gz-assistant-header__status">
              <span style="display:inline-block; width:6px; height:6px; background:#10B981; border-radius:50%"></span>
              En ligne (Guangzhou)
            </div>
          </div>
        </div>
        <button class="gz-assistant-header__close" id="gzAssistantClose" aria-label="Fermer le chat">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <!-- Chat Messages Body -->
      <div class="gz-assistant-body" id="gzAssistantBody">
        <!-- Message bubbles will be appended here -->
      </div>

      <!-- Input Footer -->
      <div class="gz-assistant-footer">
        <input type="text" class="gz-assistant-input" id="gzAssistantInput" placeholder="Posez une question ou répondez..." autocomplete="off">
        <button class="gz-assistant-send" id="gzAssistantSend" aria-label="Envoyer">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(widgetContainer);

  // ─── CONVERSATION LOGIC ───
  const toggleBtn = document.getElementById('gzAssistantToggle');
  const closeBtn = document.getElementById('gzAssistantClose');
  const windowEl = document.getElementById('gzAssistantWindow');
  const bodyEl = document.getElementById('gzAssistantBody');
  const inputEl = document.getElementById('gzAssistantInput');
  const sendBtn = document.getElementById('gzAssistantSend');

  // Toggle state
  toggleBtn.addEventListener('click', () => {
    windowEl.classList.toggle('open');
    if (windowEl.classList.contains('open')) {
      inputEl.focus();
      // Render welcome if body empty
      if (bodyEl.children.length === 0) {
        startConversation();
      }
    }
  });

  closeBtn.addEventListener('click', () => {
    windowEl.classList.remove('open');
  });

  // Handle enter key press
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleUserSend();
    }
  });

  sendBtn.addEventListener('click', handleUserSend);

  // Lead qualification status variables
  let currentStep = 'name';
  let leadData = {
    name: '',
    product: '',
    country: '',
    budget: '',
    email: '',
    phone: '',
    status: 'qualifie',
    date: ''
  };

  const dialogFlow = {
    welcome: "Bonjour ! Bienvenue chez GZ-EMPIRE. Je suis ravi de vous assister dans vos projets d'importation de la Chine vers le monde. Pour cibler au mieux vos besoins en moins d'une minute, comment puis-je vous appeler ?",
    product: "Enchanté {name} ! Quel type de marchandise ou de produit souhaitez-vous sourcer ou importer ?",
    country: "Parfait. Dans quel pays ou ville de destination devons-nous acheminer vos marchandises ?",
    budget: "C'est noté. Pour mieux estimer les solutions logistiques, quelle est la quantité approximative ou le budget prévu pour cette commande ?",
    email: "Merci pour ces précisions. Quelle est votre adresse email pour recevoir nos offres de fournisseurs et vos estimations de coûts ?",
    phone: "Et enfin, quel est votre numéro de téléphone (WhatsApp de préférence) pour un échange plus direct avec nos équipes ?",
    success: "Parfait, c'est tout bon ! Merci infiniment {name}. Vos critères de sourcing ont été transmis à notre équipe logistique à Guangzhou. Nous étudions votre projet et revenons vers vous sous 24 heures ouvrées."
  };

  function startConversation() {
    // Restore session storage history if it exists
    const storedHistory = sessionStorage.getItem('gz-empire-assistant-history');
    const storedStep = sessionStorage.getItem('gz-empire-assistant-step');
    const storedLead = sessionStorage.getItem('gz-empire-assistant-lead');

    if (storedHistory && storedStep && storedLead) {
      try {
        bodyEl.innerHTML = storedHistory;
        currentStep = storedStep;
        leadData = JSON.parse(storedLead);
        scrollChatBottom();
        return;
      } catch (err) {
        console.error("Error restoring assistant session:", err);
      }
    }
    
    appendBotMessage(dialogFlow.welcome);
  }

  function handleUserSend() {
    const text = inputEl.value.trim();
    if (!text) return;

    appendUserMessage(text);
    inputEl.value = '';

    // Process user input
    setTimeout(() => {
      processStepInput(text);
    }, 800);
  }

  function appendBotMessage(text) {
    const bubble = document.createElement('div');
    bubble.className = 'gz-msg gz-msg--bot';
    bubble.innerHTML = text;
    bodyEl.appendChild(bubble);
    scrollChatBottom();
    saveHistory();
  }

  function appendUserMessage(text) {
    const bubble = document.createElement('div');
    bubble.className = 'gz-msg gz-msg--user';
    bubble.textContent = text;
    bodyEl.appendChild(bubble);
    scrollChatBottom();
    saveHistory();
  }

  function scrollChatBottom() {
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function saveHistory() {
    sessionStorage.setItem('gz-empire-assistant-history', bodyEl.innerHTML);
    sessionStorage.setItem('gz-empire-assistant-step', currentStep);
    sessionStorage.setItem('gz-empire-assistant-lead', JSON.stringify(leadData));
  }

  // Lead qualification state machine
  function processStepInput(text) {
    // Check if user asks general question first (interrupting the flow)
    const lower = text.toLowerCase();
    if (lower.includes('prix') || lower.includes('devis') || lower.includes('tarif') || lower.includes('combien')) {
      appendBotMessage("Pour obtenir un prix ou un devis précis, je vous recommande de terminer ces questions rapides de qualification, ou d'utiliser notre page <a href='quote.html'>Demande de Devis</a>.");
      // Reprompt the current step question
      setTimeout(() => {
        repromptCurrentStep();
      }, 1000);
      return;
    }
    
    if (lower.includes('contact') || lower.includes('adresse') || lower.includes('telephone') || lower.includes('bureau')) {
      appendBotMessage("Nos bureaux sont à Guangzhou, en Chine. Nos contacts directs sont +86 183 2005 0031 (Chine) ou +243 818 247 812 (Congo).");
      setTimeout(() => {
        repromptCurrentStep();
      }, 1000);
      return;
    }

    if (lower.includes('delai') || lower.includes('temps') || lower.includes('jour')) {
      appendBotMessage("Les délais de livraison maritime sont de 25 à 45 jours. En fret aérien express, les délais sont de 5 à 10 jours ouvrés.");
      setTimeout(() => {
        repromptCurrentStep();
      }, 1000);
      return;
    }

    // Process steps
    switch (currentStep) {
      case 'name':
        leadData.name = text;
        currentStep = 'product';
        appendBotMessage(dialogFlow.product.replace('{name}', leadData.name));
        break;

      case 'product':
        leadData.product = text;
        currentStep = 'country';
        appendBotMessage(dialogFlow.country);
        break;

      case 'country':
        leadData.country = text;
        currentStep = 'budget';
        appendBotMessage(dialogFlow.budget);
        break;

      case 'budget':
        leadData.budget = text;
        currentStep = 'email';
        appendBotMessage(dialogFlow.email);
        break;

      case 'email':
        leadData.email = text;
        currentStep = 'phone';
        appendBotMessage(dialogFlow.phone);
        break;

      case 'phone':
        leadData.phone = text;
        leadData.date = new Date().toLocaleDateString('fr-FR');
        currentStep = 'success';
        
        // Qualification success! Save to prospects database
        saveLeadToCRM();
        
        appendBotMessage(dialogFlow.success.replace('{name}', leadData.name));
        break;

      case 'success':
        appendBotMessage("Votre demande est déjà en cours de traitement ! Vous pouvez fermer ce chat ou poser une autre question spécifique sur nos services.");
        break;
    }
  }

  function repromptCurrentStep() {
    switch (currentStep) {
      case 'name':
        appendBotMessage("Commençons par faire connaissance : comment puis-je vous appeler ?");
        break;
      case 'product':
        appendBotMessage(dialogFlow.product.replace('{name}', leadData.name || 'cher visiteur'));
        break;
      case 'country':
        appendBotMessage(dialogFlow.country);
        break;
      case 'budget':
        appendBotMessage(dialogFlow.budget);
        break;
      case 'email':
        appendBotMessage(dialogFlow.email);
        break;
      case 'phone':
        appendBotMessage(dialogFlow.phone);
        break;
    }
  }

  function saveLeadToCRM() {
    try {
      let prospects = [];
      const stored = localStorage.getItem('gz-empire-prospects');
      if (stored) {
        try {
          prospects = JSON.parse(stored);
          if (!Array.isArray(prospects)) prospects = [];
        } catch (e) {
          console.error("Error parsing prospects in assistant:", e);
          prospects = [];
        }
      }
      
      // Add new lead at the beginning of the list
      prospects.unshift(leadData);
      localStorage.setItem('gz-empire-prospects', JSON.stringify(prospects));
    } catch (err) {
      console.error("Error saving lead to CRM prospects:", err);
    }

    try {
      // Store chat logs for admin dashboard
      let chats = [];
      const storedChats = localStorage.getItem('gz-empire-chats');
      if (storedChats) {
        try {
          chats = JSON.parse(storedChats);
          if (!Array.isArray(chats)) chats = [];
        } catch (e) {
          console.error("Error parsing chats in assistant:", e);
          chats = [];
        }
      }

      const chatMessages = [];
      const msgElements = bodyEl.querySelectorAll('.gz-msg');
      msgElements.forEach(el => {
        const isUser = el.classList.contains('gz-msg--user');
        chatMessages.push({
          sender: isUser ? 'user' : 'bot',
          text: el.textContent.replace('Visiteur :', '').replace('Support :', '').trim()
        });
      });

      const newChat = {
        visitor: `${leadData.name || 'Visiteur'} (${leadData.country || 'Inconnu'})`,
        time: "À l'instant",
        messages: chatMessages
      };

      chats.unshift(newChat);
      localStorage.setItem('gz-empire-chats', JSON.stringify(chats));
    } catch (err) {
      console.error("Error saving chat logs to CRM:", err);
    }
  }

});

})();
