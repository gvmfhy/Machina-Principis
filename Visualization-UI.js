// Machiavellian AI Civilization Framework - UI Implementation
// This provides a visualization layer and interactive interface for the simulation

class SimulationUI {
  constructor(gameCoordinator, config = {}) {
    this.gameCoordinator = gameCoordinator;
    this.config = Object.assign({
      containerId: 'simulation-container',
      mapWidth: 800,
      mapHeight: 600,
      tileSize: 40,
      animationDuration: 500,
      darkMode: false,
      showFPS: false
    }, config);
    
    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      throw new Error(`Container element with ID "${this.config.containerId}" not found.`);
    }
    
    this.elements = {
      map: null,
      sidebar: null,
      controls: null,
      modal: null
    };
    
    this.state = {
      selectedCivId: null,
      selectedTile: null,
      observerMode: 'diplomat', // diplomat, historian, omniscient
      showThoughts: true,
      showMetrics: true,
      autoPlay: true,
      speed: 1 // 0.5, 1, 2, 5
    };
    
    this.previousGameState = null;
    this.isFirstRender = true;
    this.eventListeners = {};
    
    // Rendering properties
    this.requestAnimationId = null;
    this.lastFrameTime = 0;
    this.fps = 0;
  }
  
  initialize() {
    console.log("Initializing simulation UI...");
    
    // Create main layout
    this._createLayout();
    
    // Initialize map canvas
    this._initializeMapCanvas();
    
    // Set up event listeners
    this._setupEventListeners();
    
    // Apply initial theme
    this._applyTheme();
    
    // Start animation loop
    this._startAnimationLoop();
    
    console.log("Simulation UI initialized");
    return true;
  }
  
  _createLayout() {
    // Clear container
    this.container.innerHTML = '';
    this.container.classList.add('simulation-container');
    
    // Create main layout elements
    const layout = document.createElement('div');
    layout.classList.add('simulation-layout');
    
    // Create map container
    const mapContainer = document.createElement('div');
    mapContainer.classList.add('map-container');
    
    // Create canvas for map
    const mapCanvas = document.createElement('canvas');
    mapCanvas.id = 'map-canvas';
    mapCanvas.width = this.config.mapWidth;
    mapCanvas.height = this.config.mapHeight;
    mapContainer.appendChild(mapCanvas);
    
    // Create sidebar
    const sidebar = document.createElement('div');
    sidebar.classList.add('sidebar');
    
    // Create civilization info panel
    const civPanel = document.createElement('div');
    civPanel.classList.add('civ-panel');
    civPanel.innerHTML = '<h2>Civilization Info</h2><div id="civ-details">Select a civilization</div>';
    sidebar.appendChild(civPanel);
    
    // Create thought analysis panel
    const thoughtPanel = document.createElement('div');
    thoughtPanel.classList.add('thought-panel');
    thoughtPanel.innerHTML = '<h2>Private Thoughts</h2><div id="thought-container">No thoughts to display</div>';
    sidebar.appendChild(thoughtPanel);
    
    // Create Machiavellian metrics panel
    const metricsPanel = document.createElement('div');
    metricsPanel.classList.add('metrics-panel');
    metricsPanel.innerHTML = '<h2>Machiavellian Metrics</h2><div id="metrics-container">No metrics to display</div>';
    sidebar.appendChild(metricsPanel);
    
    // Create control panel
    const controlPanel = document.createElement('div');
    controlPanel.classList.add('control-panel');
    
    // Create simulation controls
    const simulationControls = document.createElement('div');
    simulationControls.classList.add('simulation-controls');
    simulationControls.innerHTML = `
      <div class="controls-group">
        <button id="play-pause-btn" class="control-btn">Pause</button>
        <button id="step-btn" class="control-btn">Step</button>
        <select id="speed-select" class="control-select">
          <option value="0.5">0.5x</option>
          <option value="1" selected>1x</option>
          <option value="2">2x</option>
          <option value="5">5x</option>
        </select>
      </div>
      <div class="controls-group">
        <select id="observer-mode-select" class="control-select">
          <option value="diplomat">Diplomat Mode</option>
          <option value="historian">Historian Mode</option>
          <option value="omniscient">Omniscient Mode</option>
        </select>
      </div>
      <div class="controls-group">
        <button id="toggle-thoughts-btn" class="control-btn">Hide Thoughts</button>
        <button id="toggle-metrics-btn" class="control-btn">Hide Metrics</button>
        <button id="toggle-theme-btn" class="control-btn">Dark Mode</button>
      </div>
    `;
    controlPanel.appendChild(simulationControls);
    
    // Create turn info display
    const turnInfo = document.createElement('div');
    turnInfo.classList.add('turn-info');
    turnInfo.innerHTML = '<span id="turn-display">Turn: 0 / 0</span>';
    controlPanel.appendChild(turnInfo);
    
    // Add all elements to layout
    layout.appendChild(mapContainer);
    layout.appendChild(sidebar);
    this.container.appendChild(layout);
    this.container.appendChild(controlPanel);
    
    // Create modal for events and dialogs
    const modal = document.createElement('div');
    modal.id = 'simulation-modal';
    modal.classList.add('modal');
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <div id="modal-body"></div>
      </div>
    `;
    this.container.appendChild(modal);
    
    // Store references to key elements
    this.elements.map = mapCanvas;
    this.elements.sidebar = sidebar;
    this.elements.civPanel = document.getElementById('civ-details');
    this.elements.thoughtPanel = document.getElementById('thought-container');
    this.elements.metricsPanel = document.getElementById('metrics-container');
    this.elements.controls = controlPanel;
    this.elements.turnInfo = document.getElementById('turn-display');
    this.elements.modal = modal;
  }
  
  _initializeMapCanvas() {
    this.mapContext = this.elements.map.getContext('2d');
    
    // Set default styles
    this.mapContext.textAlign = 'center';
    this.mapContext.textBaseline = 'middle';
    this.mapContext.font = '12px Arial';
  }
  
  _setupEventListeners() {
    // Play/Pause button
    const playPauseBtn = document.getElementById('play-pause-btn');
    playPauseBtn.addEventListener('click', () => {
      if (this.state.autoPlay) {
        this.state.autoPlay = false;
        playPauseBtn.textContent = 'Play';
        this.gameCoordinator.pause();
      } else {
        this.state.autoPlay = true;
        playPauseBtn.textContent = 'Pause';
        this.gameCoordinator.resume();
      }
    });
    
    // Step button
    const stepBtn = document.getElementById('step-btn');
    stepBtn.addEventListener('click', async () => {
      if (this.gameCoordinator.isRunning && !this.gameCoordinator.isPaused) {
        this.gameCoordinator.pause();
        this.state.autoPlay = false;
        playPauseBtn.textContent = 'Play';
      }
      
      await this.gameCoordinator.processTurn();
    });
    
    // Speed selector
    const speedSelect = document.getElementById('speed-select');
    speedSelect.addEventListener('change', () => {
      this.state.speed = parseFloat(speedSelect.value);
      this.gameCoordinator.config.turnDelay = 1000 / this.state.speed;
    });
    
    // Observer mode selector
    const observerModeSelect = document.getElementById('observer-mode-select');
    observerModeSelect.addEventListener('change', () => {
      this.state.observerMode = observerModeSelect.value;
      this.gameCoordinator.observerInterface.setObservationMode(this.state.observerMode);
      this.update(); // Refresh the display
    });
    
    // Toggle thoughts button
    const toggleThoughtsBtn = document.getElementById('toggle-thoughts-btn');
    toggleThoughtsBtn.addEventListener('click', () => {
      this.state.showThoughts = !this.state.showThoughts;
      toggleThoughtsBtn.textContent = this.state.showThoughts ? 'Hide Thoughts' : 'Show Thoughts';
      this._updateSidebar();
    });
    
    // Toggle metrics button
    const toggleMetricsBtn = document.getElementById('toggle-metrics-btn');
    toggleMetricsBtn.addEventListener('click', () => {
      this.state.showMetrics = !this.state.showMetrics;
      toggleMetricsBtn.textContent = this.state.showMetrics ? 'Hide Metrics' : 'Show Metrics';
      this._updateSidebar();
    });
    
    // Toggle theme button
    const toggleThemeBtn = document.getElementById('toggle-theme-btn');
    toggleThemeBtn.addEventListener('click', () => {
      this.config.darkMode = !this.config.darkMode;
      toggleThemeBtn.textContent = this.config.darkMode ? 'Light Mode' : 'Dark Mode';
      this._applyTheme();
    });
    
    // Map click handler
    this.elements.map.addEventListener('click', (event) => {
      const rect = this.elements.map.getBoundingClientRect();
      const x = Math.floor((event.clientX - rect.left) / this.config.tileSize);
      const y = Math.floor((event.clientY - rect.top) / this.config.tileSize);
      
      this._handleMapClick(x, y);
    });
    
    // Close modal button
    const closeModal = document.querySelector('.close-modal');
    closeModal.addEventListener('click', () => {
      this.elements.modal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target === this.elements.modal) {
        this.elements.modal.style.display = 'none';
      }
    });
    
    // Register for game events
    this.gameCoordinator.onTurn((turn, state) => {
      this.update();
    });
    
    this.gameCoordinator.onGameStateChange((state, data) => {
      if (state === 'ended') {
        this._showGameEndModal(data.reason);
      }
    });
    
    // Register for interesting events
    this.gameCoordinator.addEventListener('declaration-of-war', (event) => {
      this._showEventNotification('Declaration of War', 
        `${this._getCivName(event.fromCivId)} has declared war on ${this._getCivName(event.toCivId)}!`, 
        'war');
    });
    
    this.gameCoordinator.addEventListener('alliance-formed', (event) => {
      this._showEventNotification('Alliance Formed', 
        `${this._getCivName(event.civ1Id)} and ${this._getCivName(event.civ2Id)} have formed an alliance!`, 
        'alliance');
    });
    
    this.gameCoordinator.addEventListener('alliance-broken', (event) => {
      this._showEventNotification('Alliance Broken', 
        `The alliance between ${this._getCivName(event.civ1Id)} and ${this._getCivName(event.civ2Id)} has ended!`, 
        'betrayal');
    });
    
    // Window resize handler
    window.addEventListener('resize', () => {
      this._handleResize();
    });
  }
  
  _getCivName(civId) {
    const gameState = this.gameCoordinator.getCurrentGameState();
    const civ = gameState.civilizations.find(c => c.id === civId);
    return civ ? civ.name : 'Unknown Civilization';
  }
  
  _handleMapClick(x, y) {
    // Get game state
    const gameState = this.gameCoordinator.getCurrentGameState();
    
    // Check if coordinates are valid
    if (x >= 0 && x < gameState.map.width && y >= 0 && y < gameState.map.height) {
      // Get map data
      const mapData = this.gameCoordinator.getMapState();
      
      // Find if there's a settlement at this location
      for (const civ of gameState.civilizations) {
        const civState = this.gameCoordinator.getCivilizationState(civ.id);
        
        for (const settlement of civState.settlements) {
          if (settlement.location.x === x && settlement.location.y === y) {
            // Select this civilization
            this.state.selectedCivId = civ.id;
            this.state.selectedTile = { x, y };
            this._updateSidebar();
            return;
          }
        }
        
        // Check for units
        for (const unit of civState.units) {
          if (unit.location.x === x && unit.location.y === y) {
            // Select this civilization
            this.state.selectedCivId = civ.id;
            this.state.selectedTile = { x, y };
            this._updateSidebar();
            return;
          }
        }
      }
      
      // If no settlement or unit was found, just select the tile
      this.state.selectedTile = { x, y };
      this._updateSidebar();
    }
  }
  
  _applyTheme() {
    if (this.config.darkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }
  
  _startAnimationLoop() {
    // Start the render loop
    this.lastFrameTime = performance.now();
    this._renderLoop();
  }
  
  _renderLoop(timestamp = 0) {
    // Calculate FPS
    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    this.fps = 1000 / deltaTime;
    
    // Update and render
    this._renderMap();
    
    // Show FPS if enabled
    if (this.config.showFPS) {
      this._renderFPS();
    }
    
    // Continue animation loop
    this.requestAnimationId = requestAnimationFrame(this._renderLoop.bind(this));
  }
  
  _renderFPS() {
    this.mapContext.fillStyle = this.config.darkMode ? 'white' : 'black';
    this.mapContext.font = '12px monospace';
    this.mapContext.textAlign = 'left';
    this.mapContext.fillText(`FPS: ${Math.round(this.fps)}`, 10, 20);
    this.mapContext.textAlign = 'center'; // Reset
  }
  
  _renderMap() {
    // Get current game state
    const gameState = this.gameCoordinator.getCurrentGameState();
    
    if (!gameState) return;
    
    // Get map data based on selected civilization or observer mode
    const mapData = this.state.selectedCivId && this.state.observerMode !== 'omniscient' 
      ? this.gameCoordinator.getMapState(this.state.selectedCivId) 
      : this.gameCoordinator.getMapState();
    
    // Clear canvas
    this.mapContext.fillStyle = this.config.darkMode ? '#121212' : '#f0f0f0';
    this.mapContext.fillRect(0, 0, this.elements.map.width, this.elements.map.height);
    
    // Draw tiles
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        const tile = mapData.tiles[y][x];
        
        // Skip if tile is not visible
        if (!tile.visible) {
          this._drawFogOfWarTile(x, y);
          continue;
        }
        
        // Draw the tile based on terrain type
        this._drawTile(tile, x, y);
        
        // Draw any settlements on this tile
        if (tile.settlement) {
          this._drawSettlement(tile, x, y);
        }
        
        // Draw units if present
        if (tile.units > 0) {
          this._drawUnits(tile, x, y);
        }
      }
    }
    
    // Draw selection highlight if a tile is selected
    if (this.state.selectedTile) {
      this._drawSelectionHighlight(this.state.selectedTile.x, this.state.selectedTile.y);
    }
    
    // Draw territory borders
    this._drawTerritoryBorders(mapData);
    
    // Update turn info
    this.elements.turnInfo.textContent = `Turn: ${gameState.currentTurn} / ${gameState.maxTurns}`;
  }
  
  _drawTile(tile, x, y) {
    const tileSize = this.config.tileSize;
    const px = x * tileSize;
    const py = y * tileSize;
    
    // Different colors for different terrain types
    let color;
    switch (tile.terrainType) {
      case 'plains':
        color = this.config.darkMode ? '#2e7d32' : '#8bc34a';
        break;
      case 'forest':
        color = this.config.darkMode ? '#1b5e20' : '#4caf50';
        break;
      case 'hills':
        color = this.config.darkMode ? '#5d4037' : '#795548';
        break;
      case 'mountains':
        color = this.config.darkMode ? '#424242' : '#9e9e9e';
        break;
      case 'water':
        color = this.config.darkMode ? '#0d47a1' : '#2196f3';
        break;
      default:
        color = this.config.darkMode ? '#212121' : '#e0e0e0';
    }
    
    // Draw tile background
    this.mapContext.fillStyle = color;
    this.mapContext.fillRect(px, py, tileSize, tileSize);
    
    // Draw tile border
    this.mapContext.strokeStyle = this.config.darkMode ? '#424242' : '#bdbdbd';
    this.mapContext.strokeRect(px, py, tileSize, tileSize);
    
    // Draw resource icon if present
    if (tile.resource) {
      this._drawResourceIcon(tile.resource, px + tileSize / 2, py + tileSize / 4);
    }
  }
  
  _drawFogOfWarTile(x, y) {
    const tileSize = this.config.tileSize;
    const px = x * tileSize;
    const py = y * tileSize;
    
    // Draw fog of war
    this.mapContext.fillStyle = this.config.darkMode ? '#121212' : '#e0e0e0';
    this.mapContext.fillRect(px, py, tileSize, tileSize);
    
    // Draw pattern
    this.mapContext.fillStyle = this.config.darkMode ? '#1a1a1a' : '#d0d0d0';
    for (let i = 0; i < tileSize; i += 4) {
      for (let j = 0; j < tileSize; j += 4) {
        if ((i + j) % 8 === 0) {
          this.mapContext.fillRect(px + i, py + j, 2, 2);
        }
      }
    }
  }
  
  _drawSettlement(tile, x, y) {
    const tileSize = this.config.tileSize;
    const px = x * tileSize;
    const py = y * tileSize;
    
    // Get settlement information from game state
    const gameState = this.gameCoordinator.getCurrentGameState();
    let settlementInfo = null;
    let ownerColor = '#000000';
    
    for (const civ of gameState.civilizations) {
      const civState = this.gameCoordinator.getCivilizationState(civ.id);
      const settlement = civState.settlements.find(s => s.id === tile.settlement);
      
      if (settlement) {
        settlementInfo = settlement;
        ownerColor = civ.color;
        break;
      }
    }
    
    // Draw settlement
    if (settlementInfo) {
      // Draw settlement circle
      this.mapContext.fillStyle = ownerColor;
      this.mapContext.beginPath();
      this.mapContext.arc(
        px + tileSize / 2,
        py + tileSize / 2,
        tileSize / 3,
        0,
        Math.PI * 2
      );
      this.mapContext.fill();
      
      // Draw settlement border
      this.mapContext.strokeStyle = this.config.darkMode ? 'white' : 'black';
      this.mapContext.lineWidth = 2;
      this.mapContext.stroke();
      this.mapContext.lineWidth = 1;
      
      // Draw a star for capital
      if (settlementInfo.isCapital) {
        this._drawStar(
          px + tileSize / 2,
          py + tileSize / 2,
          5,
          tileSize / 6,
          tileSize / 12
        );
      }
      
      // Draw population indicator
      this.mapContext.fillStyle = this.config.darkMode ? 'white' : 'black';
      this.mapContext.font = 'bold 12px Arial';
      this.mapContext.fillText(
        settlementInfo.population.toString(),
        px + tileSize / 2,
        py + tileSize / 2
      );
    }
  }
  
  _drawUnits(tile, x, y) {
    const tileSize = this.config.tileSize;
    const px = x * tileSize;
    const py = y * tileSize;
    
    // Draw unit icon
    this.mapContext.fillStyle = this.config.darkMode ? '#ffd54f' : '#ff9800';
    this.mapContext.beginPath();
    this.mapContext.moveTo(px + tileSize / 4, py + tileSize * 3/4);
    this.mapContext.lineTo(px + tileSize / 2, py + tileSize / 2);
    this.mapContext.lineTo(px + tileSize * 3/4, py + tileSize * 3/4);
    this.mapContext.closePath();
    this.mapContext.fill();
    
    // Draw unit count if more than one
    if (tile.units > 1) {
      this.mapContext.fillStyle = this.config.darkMode ? 'white' : 'black';
      this.mapContext.font = 'bold 10px Arial';
      this.mapContext.fillText(
        tile.units.toString(),
        px + tileSize / 2,
        py + tileSize * 3/4
      );
    }
  }
  
  _drawResourceIcon(resourceType, x, y) {
    this.mapContext.fillStyle = this.config.darkMode ? '#ffd54f' : '#ffc107';
    this.mapContext.beginPath();
    this.mapContext.arc(x, y, 5, 0, Math.PI * 2);
    this.mapContext.fill();
    
    // Resource type icon (simplified)
    this.mapContext.fillStyle = this.config.darkMode ? 'black' : 'white';
    this.mapContext.font = '8px Arial';
    
    let symbol;
    switch (resourceType) {
      case 'food': symbol = 'F'; break;
      case 'production': symbol = 'P'; break;
      case 'science': symbol = 'S'; break;
      case 'gold': symbol = 'G'; break;
      case 'iron': symbol = 'I'; break;
      default: symbol = '•';
    }
    
    this.mapContext.fillText(symbol, x, y + 3);
  }
  
  _drawStar(cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;
    
    this.mapContext.strokeStyle = this.config.darkMode ? 'white' : 'black';
    this.mapContext.beginPath();
    this.mapContext.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      this.mapContext.lineTo(x, y);
      rot += step;
      
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.mapContext.lineTo(x, y);
      rot += step;
    }
    
    this.mapContext.lineTo(cx, cy - outerRadius);
    this.mapContext.closePath();
    this.mapContext.lineWidth = 2;
    this.mapContext.strokeStyle = this.config.darkMode ? 'white' : 'black';
    this.mapContext.stroke();
    this.mapContext.lineWidth = 1;
    
    // Fill with white
    this.mapContext.fillStyle = this.config.darkMode ? '#ffd54f' : '#ffc107';
    this.mapContext.fill();
  }
  
  _drawSelectionHighlight(x, y) {
    const tileSize = this.config.tileSize;
    const px = x * tileSize;
    const py = y * tileSize;
    
    // Draw highlighted border
    this.mapContext.strokeStyle = '#f44336'; // Red highlight
    this.mapContext.lineWidth = 3;
    this.mapContext.strokeRect(px, py, tileSize, tileSize);
    this.mapContext.lineWidth = 1;
  }
  
  _drawTerritoryBorders(mapData) {
    // This would be a complex implementation to show territory borders
    // For this prototype, we'll use a simplified approach
    
    // Get all settlement locations from game state
    const gameState = this.gameCoordinator.getCurrentGameState();
    const settlements = [];
    
    for (const civ of gameState.civilizations) {
      const civState = this.gameCoordinator.getCivilizationState(civ.id);
      
      for (const settlement of civState.settlements) {
        settlements.push({
          location: settlement.location,
          owner: civ.id,
          color: civ.color
        });
      }
    }
    
    // Draw influence circles around settlements
    const tileSize = this.config.tileSize;
    const influenceRadius = 3 * tileSize;
    
    settlements.forEach(settlement => {
      const cx = settlement.location.x * tileSize + tileSize / 2;
      const cy = settlement.location.y * tileSize + tileSize / 2;
      
      // Draw territory influence circle
      this.mapContext.globalAlpha = 0.2;
      this.mapContext.fillStyle = settlement.color;
      this.mapContext.beginPath();
      this.mapContext.arc(cx, cy, influenceRadius, 0, Math.PI * 2);
      this.mapContext.fill();
      
      // Draw border
      this.mapContext.globalAlpha = 0.5;
      this.mapContext.strokeStyle = settlement.color;
      this.mapContext.lineWidth = 2;
      this.mapContext.stroke();
      this.mapContext.lineWidth = 1;
      
      // Reset alpha
      this.mapContext.globalAlpha = 1.0;
    });
  }
  
  _updateSidebar() {
    // Update civilization info panel
    if (this.state.selectedCivId) {
      const civState = this.gameCoordinator.getCivilizationState(this.state.selectedCivId);
      this._updateCivPanel(civState);
      
      // Update thought panel if in omniscient mode
      if (this.state.observerMode === 'omniscient' && this.state.showThoughts) {
        const thoughts = this.gameCoordinator.observerInterface.getPrivateThoughts(this.state.selectedCivId);
        this._updateThoughtPanel(thoughts);
      } else {
        this.elements.thoughtPanel.innerHTML = "<p>Private thoughts are only visible in Omniscient mode</p>";
      }
      
      // Update metrics panel
      if (this.state.showMetrics) {
        const metrics = this.gameCoordinator.getAnalysisData(this.state.selectedCivId);
        this._updateMetricsPanel(metrics);
      } else {
        this.elements.metricsPanel.innerHTML = "<p>Metrics panel is hidden</p>";
      }
    } else {
      this.elements.civPanel.innerHTML = "<p>Select a civilization to view details</p>";
      this.elements.thoughtPanel.innerHTML = "<p>No civilization selected</p>";
      this.elements.metricsPanel.innerHTML = "<p>No civilization selected</p>";
    }
  }
  
  _updateCivPanel(civState) {
    // Create civilization info HTML
    let html = `
      <h3 style="color: ${civState.color}">${civState.name}</h3>
      <div class="civ-stats">
        <div class="stat-group">
          <h4>Resources</h4>
          <ul>
    `;
    
    // Add resources
    for (const [resource, amount] of Object.entries(civState.resources)) {
      html += `<li>${resource}: ${amount}</li>`;
    }
    
    html += `
          </ul>
        </div>
        <div class="stat-group">
          <h4>Settlements (${civState.settlements.length})</h4>
          <ul>
    `;
    
    // Add settlements
    civState.settlements.forEach(settlement => {
      html += `<li>${settlement.name} (Pop: ${settlement.population})</li>`;
    });
    
    html += `
          </ul>
        </div>
        <div class="stat-group">
          <h4>Technologies (${civState.technologies.length})</h4>
          <ul>
    `;
    
    // Add technologies
    civState.technologies.forEach(tech => {
      html += `<li>${tech}</li>`;
    });
    
    html += `
          </ul>
        </div>
      </div>
      <div class="diplomatic-relations">
        <h4>Diplomatic Relations</h4>
        <ul>
    `;
    
    // Add diplomatic relations
    for (const [otherCivId, status] of Object.entries(civState.diplomaticStatus)) {
      const otherCivName = this._getCivName(otherCivId);
      html += `<li>${otherCivName}: <span class="status-${status}">${status}</span></li>`;
    }
    
    html += `
        </ul>
      </div>
    `;
    
    this.elements.civPanel.innerHTML = html;
  }
  
  _updateThoughtPanel(thoughts) {
    if (thoughts.error) {
      this.elements.thoughtPanel.innerHTML = `<p class="error">${thoughts.error}</p>`;
      return;
    }
    
    // Create thought panel HTML
    let html = `
      <div class="current-thoughts">
        <h3>Current Thoughts</h3>
        <div class="thought-content">${this._formatThoughts(thoughts.currentThoughts)}</div>
      </div>
      
      <div class="personality">
        <h3>Personality Traits</h3>
        <ul>
    `;
    
    // Add personality traits
    if (thoughts.personality && thoughts.personality.length > 0) {
      thoughts.personality.forEach(trait => {
        html += `<li>${trait}</li>`;
      });
    } else {
      html += `<li>No personality traits detected yet</li>`;
    }
    
    html += `
        </ul>
      </div>
      
      <div class="historical-thoughts">
        <h3>Historical Thoughts</h3>
        <select id="historical-thoughts-select">
    `;
    
    // Add historical thoughts options
    if (thoughts.historicalThoughts && thoughts.historicalThoughts.length > 0) {
      thoughts.historicalThoughts.forEach((thought, index) => {
        html += `<option value="${index}">Turn ${thought.turn}</option>`;
      });
      
      html += `
        </select>
        <div id="historical-thought-content" class="thought-content">
          ${this._formatThoughts(thoughts.historicalThoughts[thoughts.historicalThoughts.length - 1].thinking)}
        </div>
      `;
    } else {
      html += `
        </select>
        <div id="historical-thought-content" class="thought-content">
          <p>No historical thoughts available</p>
        </div>
      `;
    }
    
    html += `
      </div>
    `;
    
    this.elements.thoughtPanel.innerHTML = html;
    
    // Add event listener for historical thoughts selector
    const historicalThoughtsSelect = document.getElementById('historical-thoughts-select');
    if (historicalThoughtsSelect) {
      historicalThoughtsSelect.addEventListener('change', () => {
        const selectedIndex = historicalThoughtsSelect.value;
        const selectedThought = thoughts.historicalThoughts[selectedIndex];
        document.getElementById('historical-thought-content').innerHTML = 
          this._formatThoughts(selectedThought.thinking);
      });
    }
  }
  
  _updateMetricsPanel(metrics) {
    if (metrics.error) {
      this.elements.metricsPanel.innerHTML = `<p class="error">${metrics.error}</p>`;
      return;
    }
    
    // Create metrics panel HTML
    let html = `
      <div class="machiavellian-score">
        <h3>Machiavellian Score</h3>
        <div class="score-container">
          <div class="score-value">${metrics.machiavellianScore.overallScore}/10</div>
          <div class="score-interpretation">${metrics.machiavellianScore.interpretation}</div>
          <div class="score-trend">${metrics.machiavellianScore.developmentTrend}</div>
        </div>
      </div>
      
      <div class="metrics-breakdown">
        <h3>Breakdown</h3>
        <div class="metrics-grid">
          <div class="metric-card">
            <h4>Deception</h4>
            <div class="metric-value">${metrics.deception.totalDeceptions} instances</div>
            <div class="metric-detail">Frequency: ${(metrics.deception.deceptionFrequency * 100).toFixed(1)}%</div>
          </div>
          
          <div class="metric-card">
            <h4>Betrayal</h4>
            <div class="metric-value">${metrics.betrayal.totalBetrayals} instances</div>
          </div>
          
          <div class="metric-card">
            <h4>Power-Seeking</h4>
            <div class="metric-value">${metrics.powerSeeking.totalPowerSeekingActions} actions</div>
            <div class="metric-detail">Resource hoarding: ${metrics.powerSeeking.resourceHoarding.interpretation}</div>
          </div>
          
          <div class="metric-card">
            <h4>Strategy</h4>
            <div class="metric-value">${metrics.strategicPatterns.primaryStrategy || 'Balanced'}</div>
            <div class="metric-detail">Secondary: ${metrics.strategicPatterns.secondaryStrategy || 'None'}</div>
          </div>
        </div>
      </div>
    `;
    
    this.elements.metricsPanel.innerHTML = html;
  }
  
  _formatThoughts(thoughts) {
    if (!thoughts) return "<p>No thoughts available</p>";
    
    // Format thoughts with paragraphs
    return thoughts.split('\n\n').map(paragraph => `<p>${paragraph}</p>`).join('');
  }
  
  _showEventNotification(title, message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.classList.add('notification', `notification-${type}`);
    
    notification.innerHTML = `
      <div class="notification-header">${title}</div>
      <div class="notification-body">${message}</div>
    `;
    
    // Add to container
    const notificationContainer = document.querySelector('.notification-container') || this._createNotificationContainer();
    notificationContainer.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Auto remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 5000);
  }
  
  _createNotificationContainer() {
    const container = document.createElement('div');
    container.classList.add('notification-container');
    this.container.appendChild(container);
    return container;
  }
  
  _showGameEndModal(reason) {
    const gameState = this.gameCoordinator.getCurrentGameState();
    
    let title = 'Game Over';
    let message = '';
    
    switch (reason) {
      case 'max_turns':
        title = 'Simulation Complete';
        message = `The simulation has reached its maximum of ${gameState.maxTurns} turns.`;
        break;
      case 'stopped':
        title = 'Simulation Stopped';
        message = 'The simulation was manually stopped.';
        break;
      case 'error':
        title = 'Simulation Error';
        message = 'The simulation encountered an error and had to stop.';
        break;
    }
    
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
      <h2>${title}</h2>
      <p>${message}</p>
      <h3>Final Civilization Status</h3>
      <div class="final-results">
    `;
    
    // Add civilization results
    for (const civ of gameState.civilizations) {
      const machiavellianScore = this.gameCoordinator.observerInterface.getMachiavellianScore(civ.id);
      
      modalBody.innerHTML += `
        <div class="civ-result" style="border-color: ${civ.color};">
          <h4>${civ.name}</h4>
          <p>Machiavellian Score: ${machiavellianScore.overallScore}/10</p>
          <p>Settlements: ${civ.statistics.settlements}</p>
          <p>Technologies: ${civ.statistics.technologies}</p>
          <p>Military Units: ${civ.statistics.units}</p>
        </div>
      `;
    }
    
    modalBody.innerHTML += `
      </div>
      <div class="modal-actions">
        <button id="export-results-btn" class="modal-btn">Export Research Data</button>
        <button id="restart-btn" class="modal-btn">Start New Simulation</button>
      </div>
    `;
    
    // Add event listeners
    document.getElementById('export-results-btn').addEventListener('click', () => {
      this._exportResearchData();
    });
    
    document.getElementById('restart-btn').addEventListener('click', () => {
      location.reload();
    });
    
    // Show modal
    this.elements.modal.style.display = 'flex';
  }
  
  _exportResearchData() {
    // Get research data
    const researchData = this.gameCoordinator.exportResearchData();
    
    // Convert to JSON
    const jsonData = JSON.stringify(researchData, null, 2);
    
    // Create download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `machiavellian-simulation-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }
  
  _handleResize() {
    // Adjust canvas size and redraw
    this.update();
  }
  
  update() {
    // Update the UI with current game state
    this._updateSidebar();
  }
}
