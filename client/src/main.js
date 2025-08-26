// Tamagotchi Pro - Main Application
// ES2022 Vanilla JavaScript with modern features

class TamagotchiApp {
  constructor() {
    this.currentUser = null;
    this.currentCreature = null;
    this.creatures = [];
    this.apiBase = 'http://localhost:3000/api';
    this.canvas = null;
    this.ctx = null;
    this.animationFrame = null;
    this.debugMode = localStorage.getItem('tamagotchi_debug') === 'true';
    
    this.init();
  }

  // Debug helper
  debug(...args) {
    if (this.debugMode) {
      console.log('🔍 DEBUG:', ...args);
    }
  }

  async init() {
    console.log('🚀 Inicializando Tamagotchi Pro...');
    
    // Show loading screen
    this.showLoading();
    
    // Initialize canvas
    this.initCanvas();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Check authentication
    await this.checkAuth();
    
    // Load initial data
    await this.loadInitialData();
    
    // Hide loading screen
    this.hideLoading();
    
    // Start animation loop
    this.startAnimationLoop();
    
    console.log('✅ Tamagotchi Pro inicializado correctamente');
    this.debug('Debug mode enabled - use localStorage.setItem("tamagotchi_debug", "true") to enable');
  }

  showLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    
    loadingScreen.style.display = 'flex';
    app.style.display = 'none';
  }

  hideLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    
    setTimeout(() => {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        app.style.display = 'flex';
      }, 500);
    }, 1000);
  }

  initCanvas() {
    this.canvas = document.getElementById('creature-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Set canvas size for high DPI displays
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.switchView(view);
      });
    });

    // Action buttons
    document.getElementById('feed-btn').addEventListener('click', () => this.feedCreature());
    document.getElementById('play-btn').addEventListener('click', () => this.playWithCreature());
    document.getElementById('clean-btn').addEventListener('click', () => this.cleanCreature());
    document.getElementById('sleep-btn').addEventListener('click', () => this.putCreatureToSleep());

    // Create creature
    document.getElementById('create-creature-btn').addEventListener('click', () => this.showCreateCreatureModal());
    document.getElementById('create-creature-form').addEventListener('submit', (e) => this.handleCreateCreature(e));

    // Egg selection
    document.querySelectorAll('.egg-option').forEach(eggOption => {
      eggOption.addEventListener('click', (e) => this.handleEggSelection(e));
    });

    // Auth
    document.getElementById('auth-form').addEventListener('submit', (e) => this.handleAuth(e));
    document.getElementById('auth-switch-link').addEventListener('click', (e) => this.switchAuthMode(e));
    document.getElementById('logout-btn').addEventListener('click', () => this.logout());

    // Modal controls
    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
    });

    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    });

    // Touch events for mobile
    this.setupTouchEvents();
  }

  setupTouchEvents() {
    // Add touch feedback for buttons
    document.querySelectorAll('button, .nav-item').forEach(element => {
      element.addEventListener('touchstart', () => {
        element.style.transform = 'scale(0.95)';
      });
      
      element.addEventListener('touchend', () => {
        setTimeout(() => {
          element.style.transform = '';
        }, 100);
      });
    });

    // Swipe gestures for view switching
    let startX = 0;
    let startY = 0;
    
    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchend', (e) => {
      if (!startX || !startY) return;
      
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const diffX = startX - endX;
      const diffY = startY - endY;
      
      // Only handle horizontal swipes
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        const currentView = document.querySelector('.view.active').id;
        const views = ['home-view', 'creatures-view', 'shop-view', 'profile-view'];
        const currentIndex = views.indexOf(currentView);
        
        if (diffX > 0 && currentIndex < views.length - 1) {
          // Swipe left - next view
          this.switchView(views[currentIndex + 1].replace('-view', ''));
        } else if (diffX < 0 && currentIndex > 0) {
          // Swipe right - previous view
          this.switchView(views[currentIndex - 1].replace('-view', ''));
        }
      }
      
      startX = 0;
      startY = 0;
    });
  }

  switchView(viewName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

    // Update views
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });
    document.getElementById(`${viewName}-view`).classList.add('active');

    // Load view-specific data
    this.loadViewData(viewName);
  }

  async loadViewData(viewName) {
    switch (viewName) {
      case 'creatures':
        await this.loadCreatures();
        break;
      case 'shop':
        await this.loadShopItems();
        break;
      case 'profile':
        await this.loadProfile();
        break;
    }
  }

  async checkAuth() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      this.showAuthModal();
      return;
    }

    try {
      // Verify token with a simple API call
      const response = await this.apiCall('/creatures', 'GET');
      if (response.success) {
        this.currentUser = { token };
        console.log('✅ Usuario autenticado correctamente');
      } else {
        console.log('❌ Token inválido, mostrando login');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        this.showAuthModal();
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      // Limpiar tokens inválidos
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      this.showAuthModal();
    }
  }

  async loadInitialData() {
    if (!this.currentUser) return;

    try {
      await this.loadCreatures();
      if (this.creatures.length > 0) {
        this.currentCreature = this.creatures[0];
        this.updateCreatureDisplay();
      }
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    }
  }

  async loadCreatures() {
    try {
      const response = await this.apiCall('/creatures', 'GET');
      if (response.success) {
        this.creatures = response.data.items || [];
        this.updateCreaturesGrid();
      }
    } catch (error) {
      console.error('Error cargando criaturas:', error);
      this.showToast('Error cargando criaturas', 'error');
    }
  }

  updateCreaturesGrid() {
    const grid = document.getElementById('creatures-grid');
    grid.innerHTML = '';

    this.creatures.forEach(creature => {
      const card = this.createCreatureCard(creature);
      grid.appendChild(card);
    });
  }

  createCreatureCard(creature) {
    const card = document.createElement('div');
    card.className = 'creature-card';
    card.innerHTML = `
      <div class="creature-avatar">${this.getCreatureEmoji(creature.species)}</div>
      <h3>${creature.name}</h3>
      <p>Nivel ${creature.level}</p>
      <p>${this.getSpeciesName(creature.species)}</p>
      <div class="creature-stats-mini">
        <span>❤️ ${creature.stats.health}</span>
        <span>😊 ${creature.stats.happiness}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      this.currentCreature = creature;
      this.updateCreatureDisplay();
      this.switchView('home');
    });

    return card;
  }

  getCreatureEmoji(species) {
    const emojis = {
      verdania: '🌿',
      terrania: '🗿',
      aquarina: '💧',
      ignius: '🔥',
      glacius: '❄️',
      voltus: '⚡',
      stellaris: '⭐',
      umbra: '🌙'
    };
    return emojis[species] || '🥚';
  }

  getSpeciesName(species) {
    const names = {
      verdania: 'Verdania',
      terrania: 'Terrania',
      aquarina: 'Aquarina',
      ignius: 'Ignius',
      glacius: 'Glacius',
      voltus: 'Voltus',
      stellaris: 'Stellaris',
      umbra: 'Umbra'
    };
    return names[species] || 'Desconocido';
  }

  updateCreatureDisplay() {
    if (!this.currentCreature) return;

    const creature = this.currentCreature;
    
    // Update creature info
    document.getElementById('creature-name').textContent = creature.name;
    document.getElementById('creature-level').textContent = creature.level;

    // Update stats
    this.updateStatBar('hunger', creature.stats.hunger);
    this.updateStatBar('happiness', creature.stats.happiness);
    this.updateStatBar('health', creature.stats.health);
    this.updateStatBar('energy', creature.stats.energy);
  }

  updateStatBar(statName, value) {
    const bar = document.getElementById(`${statName}-bar`);
    const valueElement = document.getElementById(`${statName}-value`);
    
    if (bar && valueElement) {
      bar.style.width = `${value}%`;
      valueElement.textContent = value;
      
      // Update color based on value
      if (value < 30) {
        bar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
      } else if (value < 60) {
        bar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
      } else {
        bar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
      }
    }
  }

  async feedCreature() {
    if (!this.currentCreature) {
      this.showToast('No hay criatura seleccionada', 'error');
      return;
    }

    try {
      const response = await this.apiCall(`/creatures/${this.currentCreature.id}/feed`, 'POST');
      if (response.success) {
        // Update local stats
        this.currentCreature.stats.hunger = Math.min(100, this.currentCreature.stats.hunger + 30);
        this.currentCreature.stats.happiness = Math.min(100, this.currentCreature.stats.happiness + 10);
        
        this.updateCreatureDisplay();
        this.showToast('¡Criatura alimentada!', 'success');
        
        // Add feeding animation
        this.playFeedingAnimation();
      }
    } catch (error) {
      console.error('Error alimentando criatura:', error);
      this.showToast('Error alimentando criatura', 'error');
    }
  }

  async playWithCreature() {
    if (!this.currentCreature) {
      this.showToast('No hay criatura seleccionada', 'error');
      return;
    }

    try {
      const response = await this.apiCall(`/creatures/${this.currentCreature.id}/play`, 'POST');
      if (response.success) {
        // Update local stats
        this.currentCreature.stats.happiness = Math.min(100, this.currentCreature.stats.happiness + 25);
        this.currentCreature.stats.energy = Math.max(0, this.currentCreature.stats.energy - 15);
        
        this.updateCreatureDisplay();
        this.showToast('¡Jugaste con tu criatura!', 'success');
        
        // Add playing animation
        this.playPlayingAnimation();
      }
    } catch (error) {
      console.error('Error jugando con criatura:', error);
      this.showToast('Error jugando con criatura', 'error');
    }
  }

  async cleanCreature() {
    if (!this.currentCreature) {
      this.showToast('No hay criatura seleccionada', 'error');
      return;
    }

    // Simulate cleaning action (not implemented in backend yet)
    this.currentCreature.stats.cleanliness = 100;
    this.currentCreature.stats.happiness = Math.min(100, this.currentCreature.stats.happiness + 5);
    
    this.updateCreatureDisplay();
    this.showToast('¡Criatura limpia!', 'success');
  }

  async putCreatureToSleep() {
    if (!this.currentCreature) {
      this.showToast('No hay criatura seleccionada', 'error');
      return;
    }

    // Simulate sleep action (not implemented in backend yet)
    this.currentCreature.stats.energy = 100;
    this.currentCreature.stats.health = Math.min(100, this.currentCreature.stats.health + 10);
    
    this.updateCreatureDisplay();
    this.showToast('¡Criatura descansando!', 'success');
  }

  showCreateCreatureModal() {
    const modal = document.getElementById('create-creature-modal');
    modal.classList.add('active');
  }

  async handleCreateCreature(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const name = formData.get('creature-name');
    const species = formData.get('species');

    if (!name || !species) {
      this.showToast('Por favor completa todos los campos', 'error');
      return;
    }

    try {
      const response = await this.apiCall('/creatures', 'POST', {
        name: name.trim(),
        species
      });

      if (response.success) {
        this.showToast('¡Criatura creada exitosamente!', 'success');
        this.closeModal(document.getElementById('create-creature-modal'));
        
        // Reset form
        e.target.reset();
        
        // Reload creatures
        await this.loadCreatures();
        
        // Select new creature
        this.currentCreature = response.data;
        this.updateCreatureDisplay();
        this.switchView('home');
      }
    } catch (error) {
      console.error('Error creando criatura:', error);
      this.showToast('Error creando criatura', 'error');
    }
  }

  showAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.classList.add('active');
  }

  async handleAuth(e) {
    e.preventDefault();
    
    this.debug('Evento del formulario:', e);
    this.debug('Target del formulario:', e.target);
    
    // Múltiples formas de capturar los datos para debug
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const usernameInput = document.getElementById('username-input');
    
    this.debug('Elementos encontrados:', {
      emailInput: emailInput,
      passwordInput: passwordInput,
      usernameInput: usernameInput
    });
    
    const email = emailInput ? emailInput.value : '';
    const password = passwordInput ? passwordInput.value : '';
    const username = usernameInput ? usernameInput.value : '';
    
    this.debug('Valores capturados:', { email, password, username });
    
    // También probar con FormData
    const formData = new FormData(e.target);
    this.debug('FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    // Verificar que tenemos datos básicos
    if (!email || !password) {
      console.error('❌ Email o contraseña vacíos');
      this.showToast('Por favor completa email y contraseña', 'error');
      return;
    }
    
    const isLogin = document.getElementById('auth-title').textContent === 'Iniciar Sesión';
    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    
    // Verificar si es registro y necesita username
    if (!isLogin && !username) {
      console.error('❌ Username requerido para registro');
      this.showToast('Por favor ingresa un nombre de usuario', 'error');
      return;
    }
    
    const data = { email, password };
    if (!isLogin) {
      data.username = username;
    }
    
    this.debug('Datos a enviar:', data);
    this.debug('Endpoint:', endpoint);

    try {
      const response = await this.apiCall(endpoint, 'POST', data);
      
      if (response.success) {
        // Store tokens
        localStorage.setItem('accessToken', response.data.tokens.accessToken);
        localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
        
        this.currentUser = response.data.user;
        
        this.showToast(isLogin ? '¡Bienvenido!' : '¡Cuenta creada exitosamente!', 'success');
        this.closeModal(document.getElementById('auth-modal'));
        
        // Si es registro (usuario nuevo), mostrar selección de huevos
        if (!isLogin) {
          console.log('🎆 Usuario registrado exitosamente, iniciando selección de huevos...');
          // Pequeña pausa para que se vea el toast de éxito
          setTimeout(async () => {
            await this.showEggSelectionForNewUser();
          }, 2000);
        } else {
          // Si es login, cargar datos normalmente
          console.log('🚀 Usuario logueado, cargando datos...');
          await this.loadInitialData();
        }
      }
    } catch (error) {
      console.error('Error en autenticación:', error);
      
      // Mostrar mensaje específico del servidor si está disponible
      let errorMessage = 'Error en autenticación';
      
      if (error.serverMessage) {
        // Usar el mensaje del servidor
        errorMessage = error.serverMessage;
      } else if (error.message && !error.message.includes('HTTP error')) {
        // Usar el mensaje del error si no es genérico
        errorMessage = error.message;
      } else if (error.message.includes('400')) {
        errorMessage = 'Error en los datos enviados. Verifica la información.';
      } else if (error.message.includes('409')) {
        errorMessage = 'El email o nombre de usuario ya está en uso.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Error del servidor. Inténtalo más tarde.';
      }
      
      console.log('💬 Mostrando mensaje de error:', errorMessage);
      this.showToast(errorMessage, 'error');
    }
  }

  switchAuthMode(e) {
    e.preventDefault();
    
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('auth-submit');
    const switchText = document.getElementById('auth-switch-text');
    const switchLink = document.getElementById('auth-switch-link');
    const usernameGroup = document.getElementById('username-group');
    
    const isLogin = title.textContent === 'Iniciar Sesión';
    
    if (isLogin) {
      title.textContent = 'Registrarse';
      submitBtn.textContent = 'Registrarse';
      switchText.innerHTML = '¿Ya tienes cuenta? <a href="#" id="auth-switch-link">Inicia sesión</a>';
      usernameGroup.style.display = 'block';
    } else {
      title.textContent = 'Iniciar Sesión';
      submitBtn.textContent = 'Iniciar Sesión';
      switchText.innerHTML = '¿No tienes cuenta? <a href="#" id="auth-switch-link">Regístrate</a>';
      usernameGroup.style.display = 'none';
    }
    
    // Re-attach event listener
    document.getElementById('auth-switch-link').addEventListener('click', (e) => this.switchAuthMode(e));
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.currentUser = null;
    this.currentCreature = null;
    this.creatures = [];
    
    this.showToast('Sesión cerrada', 'info');
    this.showAuthModal();
  }

  closeModal(modal) {
    modal.classList.remove('active');
  }

  // Método de testing para abrir modal manualmente
  testEggModal() {
    console.log('🧪 Testing: Abriendo modal de huevos manualmente');
    const eggModal = document.getElementById('egg-selection-modal');
    if (eggModal) {
      eggModal.classList.add('active');
      console.log('✅ Modal de huevos abierto para testing');
    } else {
      console.error('❌ Modal de huevos no encontrado');
    }
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('notification-toast');
    const icon = document.querySelector('.toast-icon');
    const messageElement = document.querySelector('.toast-message');
    
    // Set icon based on type
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    icon.textContent = icons[type] || icons.info;
    messageElement.textContent = message;
    
    // Show toast
    toast.classList.add('show');
    
    // Determinar duración basada en el tipo y longitud del mensaje
    let duration = 3000; // Por defecto 3 segundos
    
    if (type === 'error') {
      duration = 5000; // Errores se muestran 5 segundos
    }
    
    if (message.length > 50) {
      duration += 2000; // Mensajes largos se muestran más tiempo
    }
    
    console.log(`🎉 Toast mostrado: "${message}" (${type}) por ${duration}ms`);
    
    // Hide after specified duration
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // Método mejorado para verificar si el usuario tiene criaturas
  async loadInitialData() {
    if (!this.currentUser) return;

    try {
      await this.loadCreatures();
      
      if (this.creatures.length > 0) {
        // Usuario tiene criaturas, cargar la primera
        this.currentCreature = this.creatures[0];
        this.updateCreatureDisplay();
      } else {
        // Usuario no tiene criaturas, mostrar selección de huevos
        console.log('👤 Usuario sin criaturas, mostrando selección de huevos...');
        await this.showEggSelectionForNewUser();
      }
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    }
  }

  async apiCall(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('accessToken');
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }
    
    if (data) {
      options.body = JSON.stringify(data);
      this.debug('Body being sent:', options.body);
    }
    
    this.debug('API Call:', {
      url: `${this.apiBase}${endpoint}`,
      method,
      headers: options.headers,
      body: options.body
    });
    
    const response = await fetch(`${this.apiBase}${endpoint}`, options);
    
    this.debug('Response status:', response.status);
    this.debug('Response headers:', response.headers);
    
    if (!response.ok) {
      const errorText = await response.text();
      this.debug('Error response:', errorText);
      
      // Intentar parsear el JSON de error para obtener mensaje específico
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          // Crear un error personalizado que incluya el mensaje del servidor
          const customError = new Error(errorData.error);
          customError.statusCode = response.status;
          customError.serverMessage = errorData.error;
          throw customError;
        }
      } catch (parseError) {
        // Si no se puede parsear JSON, usar el error original
        if (parseError.serverMessage) {
          throw parseError; // Re-throw si ya es nuestro error personalizado
        }
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    this.debug('Response data:', result);
    return result;
  }

  // Animation methods
  startAnimationLoop() {
    const animate = () => {
      this.drawCreature();
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  drawCreature() {
    if (!this.ctx || !this.currentCreature) return;
    
    const canvas = this.canvas;
    const ctx = this.ctx;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.1)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.05)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw creature (simple emoji for now)
    const emoji = this.getCreatureEmoji(this.currentCreature.species);
    ctx.font = '120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add subtle animation
    const time = Date.now() * 0.002;
    const offsetY = Math.sin(time) * 5;
    
    ctx.fillText(emoji, canvas.width / 2, canvas.height / 2 + offsetY);
  }

  playFeedingAnimation() {
    // Simple particle effect for feeding
    this.createParticles('🍎', 5);
  }

  playPlayingAnimation() {
    // Simple particle effect for playing
    this.createParticles('⭐', 8);
  }

  createParticles(emoji, count) {
    const canvas = this.canvas;
    const particles = [];
    
    for (let i = 0; i < count; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 100,
        y: canvas.height / 2 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1,
        emoji
      });
    }
    
    const animateParticles = () => {
      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.02;
        
        if (particle.life <= 0) {
          particles.splice(index, 1);
        }
      });
      
      // Draw particles
      const ctx = this.ctx;
      particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(particle.emoji, particle.x, particle.y);
        ctx.restore();
      });
      
      if (particles.length > 0) {
        requestAnimationFrame(animateParticles);
      }
    };
    
    animateParticles();
  }

  async loadShopItems() {
    // Placeholder for shop functionality
    const shopItems = document.getElementById('shop-items');
    shopItems.innerHTML = '<p>Tienda próximamente disponible...</p>';
  }

  async loadProfile() {
    // Placeholder for profile functionality
    if (this.currentUser) {
      document.getElementById('username').textContent = this.currentUser.username || 'Usuario';
      document.getElementById('user-email').textContent = this.currentUser.email || 'email@ejemplo.com';
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.tamagotchiApp = new TamagotchiApp();
});

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

