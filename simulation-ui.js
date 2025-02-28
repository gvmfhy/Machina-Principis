// Machiavellian AI Civilization Framework - Simulation UI
// This module implements a web-based visualization for the simulation

/**
 * Simulation UI for browser environments
 */
class SimulationUI {
  /**
   * Create a new simulation UI
   * @param {Object} gameCoordinator - Game coordinator instance
   * @param {Object} config - Configuration options
   */
  constructor(gameCoordinator, config = {}) {
    this.gameCoordinator = gameCoordinator;
    this.containerId = config.containerId || 'simulation-container';
    this.darkMode = config.darkMode !== undefined ? config.darkMode : true;
    this.showFPS = config.showFPS || false;
    
    // UI state
    this.container = null;
    this.mapContainer = null;
    this.infoPanel = null;
    this.controlPanel = null;
    this.selectedCiv = null;
    this.selectedTile = null;
    this.observerMode = 'omniscient';
    
    // Animation state
    this.animationFrame = null;
    this.lastFrameTime = 0;
    this.framesCount = 0;
    this.fps = 0;
    this.fpsUpdateInterval = null;
  }
  
  /**
   * Initialize the UI
   * @returns {boolean} Whether initialization was successful
   */
  initialize() {
    try {
      // Get container
      this.container = document.getElementById(this.containerId);
      
      if (!this.container) {
        console.error(`Container element not found: #${this.containerId}`);
        return false;
      }
      
      // Apply initial styles
      this._applyStyles();
      
      // Create UI components
      this._createComponents();
      
      // Register event handlers
      this._registerEventHandlers();
      
      // Start rendering
      this._startRendering();
      
      // Register game event listeners
      this._registerGameEvents();
      
      console.log("Simulation UI initialized");
      return true;
    } catch (error) {
      console.error("Error initializing simulation UI:", error);
      return false;
    }
  }
  
  /**
   * Apply initial styles
   * @private
   */
  _applyStyles() {
    // Set theme
    document.body.classList.toggle('dark-mode', this.darkMode);
    
    // Create CSS if it doesn't exist
    if (!document.getElementById('simulation-ui-styles')) {
      const style = document.createElement('style');
      style.id = 'simulation-ui-styles';
      style.textContent = `
        /* Base styles */
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f0f0f0;
          color: #333;
          transition: background-color 0.3s ease;
        }
        
        body.dark-mode {
          background-color: #1e1e1e;
          color: #e0e0e0;
        }
        
        /* Container layout */
        #${this.containerId} {
          display: grid;
          grid-template-columns: 1fr 300px;
          grid-template-rows: 1fr 100px;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }
        
        /* Map container */
        .map-container {
          grid-column: 1;
          grid-row: 1 / span 2;
          overflow: hidden;
          position: relative;
          background-color: #2c3e50;
        }
        
        /* Info panel */
        .info-panel {
          grid-column: 2;
          grid-row: 1;
          overflow-y: auto;
          padding: 10px;
          background-color: #f5f5f5;
          border-left: 1px solid #ccc;
        }
        
        body.dark-mode .info-panel {
          background-color: #2d2d2d;
          border-left: 1px solid #444;
        }
        
        /* Control panel */
        .control-panel {
          grid-column: 2;
          grid-row: 2;
          padding: 10px;
          background-color: #e0e0e0;
          border-left: 1px solid #ccc;
          border-top: 1px solid #ccc;
          display: flex;
          flex-direction: column;
        }
        
        body.dark-mode .control-panel {
          background-color: #333;
          border-left: 1px solid #444;
          border-top: 1px solid #444;
        }
        
        /* Map styles */
        .map-grid {
          display: grid;
          position: absolute;
        }
        
        .map-tile {
          width: 64px;
          height: 64px;
          position: relative;
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-sizing: border-box;
          transition: transform 0.2s ease;
        }
        
        .map-tile:hover {
          transform: scale(1.05);
          z-index: 10;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }
        
        .map-tile.selected {
          border: 2px solid yellow;
          z-index: 5;
        }
        
        /* Tile types */
        .tile-plains { background-color: #8bc34a; }
        .tile-hills { background-color: #795548; }
        .tile-mountains { background-color: #607d8b; }
        .tile-water { background-color: #2196f3; }
        .tile-forest { background-color: #33691e; }
        
        /* Resource indicators */
        .resource-indicator {
          position: absolute;
          bottom: 5px;
          right: 5px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background-color: yellow;
          border: 1px solid black;
        }
        
        /* Settlement indicator */
        .settlement-indicator {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: white;
          border: 2px solid black;
          z-index: 5;
        }
        
        /* Unit indicator */
        .unit-indicator {
          position: absolute;
          bottom: 5px;
          left: 5px;
          width: 16px;
          height: 16px;
          background-color: white;
          border: 1px solid black;
          z-index: 4;
        }
        
        /* Buttons */
        button {
          padding: 8px 12px;
          margin: 5px;
          border: none;
          border-radius: 4px;
          background-color: #4caf50;
          color: white;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        
        button:hover {
          background-color: #388e3c;
        }
        
        button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        
        body.dark-mode button {
          background-color: #388e3c;
        }
        
        body.dark-mode button:hover {
          background-color: #2e7d32;
        }
        
        /* Info panels */
        .panel-section {
          margin-bottom: 15px;
          padding: 10px;
          background-color: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
        }
        
        body.dark-mode .panel-section {
          background-color: rgba(255, 255, 255, 0.05);
        }
        
        .panel-title {
          font-weight: bold;
          margin-bottom: 5px;
          border-bottom: 1px solid #ccc;
          padding-bottom: 3px;
        }
        
        /* FPS counter */
        .fps-counter {
          position: absolute;
          top: 10px;
          right: 10px;
          background-color: rgba(0, 0, 0, 0.5);
          color: white;
          padding: 5px;
          border-radius: 3px;
          font-family: monospace;
        }
        
        /* Tabs */
        .tab-buttons {
          display: flex;
          border-bottom: 1px solid #ccc;
          margin-bottom: 10px;
        }
        
        .tab-button {
          padding: 8px 15px;
          background-color: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: inherit;
          cursor: pointer;
        }
        
        .tab-button.active {
          border-bottom: 2px solid #4caf50;
          font-weight: bold;
        }
        
        body.dark-mode .tab-button.active {
          border-bottom: 2px solid #388e3c;
        }
        
        .tab-content {
          display: none;
        }
        
        .tab-content.active {
          display: block;
        }
        
        /* Observer modes */
        .observer-controls {
          display: flex;
          margin-bottom: 10px;
        }
        
        .observer-mode-button {
          flex: 1;
          padding: 5px;
          text-align: center;
          border: 1px solid #ccc;
          background-color: #f0f0f0;
          cursor: pointer;
        }
        
        body.dark-mode .observer-mode-button {
          background-color: #333;
          border-color: #444;
        }
        
        .observer-mode-button.active {
          background-color: #4caf50;
          color: white;
          font-weight: bold;
        }
        
        body.dark-mode .observer-mode-button.active {
          background-color: #388e3c;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Ensure the container has the right styles
    this.container.style.display = 'grid';
    this.container.style.gridTemplateColumns = '1fr 300px';
    this.container.style.gridTemplateRows = '1fr 100px';
    this.container.style.height = '100vh';
    this.container.style.width = '100vw';
    this.container.style.overflow = 'hidden';
  }
  
  /**
   * Create UI components
   * @private
   */
  _createComponents() {
    // Create map container
    this.mapContainer = document.createElement('div');
    this.mapContainer.className = 'map-container';
    this.container.appendChild(this.mapContainer);
    
    // Create info panel
    this.infoPanel = document.createElement('div');
    this.infoPanel.className = 'info-panel';
    this.container.appendChild(this.infoPanel);
    
    // Create control panel
    this.controlPanel = document.createElement('div');
    this.controlPanel.className = 'control-panel';
    this.container.appendChild(this.controlPanel);
    
    // Create map grid
    this.mapGrid = document.createElement('div');
    this.mapGrid.className = 'map-grid';
    this.mapContainer.appendChild(this.mapGrid);
    
    // Add initial UI content
    this._setupInfoPanel();
    this._setupControlPanel();
    
    // Add FPS counter if enabled
    if (this.showFPS) {
      this.fpsCounter = document.createElement('div');
      this.fpsCounter.className = 'fps-counter';
      this.fpsCounter.textContent = 'FPS: 0';
      this.mapContainer.appendChild(this.fpsCounter);
    }
  }
  
  /**
   * Set up the info panel
   * @private
   */
  _setupInfoPanel() {
    // Create tabs
    const tabButtons = document.createElement('div');
    tabButtons.className = 'tab-buttons';
    
    const tabs = [
      { id: 'civ-tab', label: 'Civilization' },
      { id: 'tile-tab', label: 'Tile' },
      { id: 'metrics-tab', label: 'Metrics' }
    ];
    
    tabs.forEach((tab, index) => {
      const button = document.createElement('button');
      button.className = `tab-button ${index === 0 ? 'active' : ''}`;
      button.dataset.tabId = tab.id;
      button.textContent = tab.label;
      button.addEventListener('click', () => this._switchTab(tab.id));
      tabButtons.appendChild(button);
    });
    
    this.infoPanel.appendChild(tabButtons);
    
    // Create tab content containers
    tabs.forEach((tab, index) => {
      const content = document.createElement('div');
      content.className = `tab-content ${index === 0 ? 'active' : ''}`;
      content.id = tab.id;
      this.infoPanel.appendChild(content);
    });
    
    // Observer mode controls
    const observerControls = document.createElement('div');
    observerControls.className = 'observer-controls';
    
    const modes = [
      { id: 'omniscient', label: 'Omniscient' },
      { id: 'diplomat', label: 'Diplomat' },
      { id: 'historian', label: 'Historian' }
    ];
    
    modes.forEach(mode => {
      const button = document.createElement('div');
      button.className = `observer-mode-button ${mode.id === this.observerMode ? 'active' : ''}`;
      button.dataset.mode = mode.id;
      button.textContent = mode.label;
      button.addEventListener('click', () => this._setObserverMode(mode.id));
      observerControls.appendChild(button);
    });
    
    this.infoPanel.appendChild(observerControls);
    
    // Set up initial content for tabs
    document.getElementById('civ-tab').innerHTML = `
      <div class="panel-section">
        <div class="panel-title">Civilization Information</div>
        <p>Select a civilization to view details</p>
      </div>
    `;
    
    document.getElementById('tile-tab').innerHTML = `
      <div class="panel-section">
        <div class="panel-title">Tile Information</div>
        <p>Click on a tile to view details</p>
      </div>
    `;
    
    document.getElementById('metrics-tab').innerHTML = `
      <div class="panel-section">
        <div class="panel-title">Machiavellian Metrics</div>
        <p>Game metrics will appear here as the simulation progresses</p>
      </div>
    `;
  }
  
  /**
   * Set up the control panel
   * @private
   */
  _setupControlPanel() {
    // Game controls
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'controls-container';
    
    // Play/pause button
    this.playPauseButton = document.createElement('button');
    this.playPauseButton.textContent = '⏸️ Pause';
    this.playPauseButton.addEventListener('click', () => this._togglePlayPause());
    controlsContainer.appendChild(this.playPauseButton);
    
    // Turn counter
    this.turnCounter = document.createElement('div');
    this.turnCounter.className = 'turn-counter';
    this.turnCounter.textContent = 'Turn: 0 / 0';
    controlsContainer.appendChild(this.turnCounter);
    
    // Turn speed control
    const speedControls = document.createElement('div');
    speedControls.className = 'speed-controls';
    
    const slowButton = document.createElement('button');
    slowButton.textContent = '🐢 Slow';
    slowButton.addEventListener('click', () => this._setTurnSpeed('slow'));
    speedControls.appendChild(slowButton);
    
    const normalButton = document.createElement('button');
    normalButton.textContent = '⏱️ Normal';
    normalButton.addEventListener('click', () => this._setTurnSpeed('normal'));
    speedControls.appendChild(normalButton);
    
    const fastButton = document.createElement('button');
    fastButton.textContent = '🐇 Fast';
    fastButton.addEventListener('click', () => this._setTurnSpeed('fast'));
    speedControls.appendChild(fastButton);
    
    controlsContainer.appendChild(speedControls);
    
    // Export button
    const exportButton = document.createElement('button');
    exportButton.textContent = '💾 Export Data';
    exportButton.addEventListener('click', () => this._exportData());
    controlsContainer.appendChild(exportButton);
    
    this.controlPanel.appendChild(controlsContainer);
  }
  
  /**
   * Register event handlers
   * @private
   */
  _registerEventHandlers() {
    // Map panning
    let isDragging = false;
    let startX, startY, scrollLeft, scrollTop;
    
    this.mapContainer.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.pageX - this.mapContainer.offsetLeft;
      startY = e.pageY - this.mapContainer.offsetTop;
      scrollLeft = this.mapContainer.scrollLeft;
      scrollTop = this.mapContainer.scrollTop;
    });
    
    this.mapContainer.addEventListener('mouseleave', () => {
      isDragging = false;
    });
    
    this.mapContainer.addEventListener('mouseup', () => {
      isDragging = false;
    });
    
    this.mapContainer.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const x = e.pageX - this.mapContainer.offsetLeft;
      const y = e.pageY - this.mapContainer.offsetTop;
      const moveX = (x - startX) * 2;
      const moveY = (y - startY) * 2;
      
      this.mapContainer.scrollLeft = scrollLeft - moveX;
      this.mapContainer.scrollTop = scrollTop - moveY;
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Space: pause/resume
      if (e.code === 'Space') {
        this._togglePlayPause();
      }
      
      // E: export data
      if (e.code === 'KeyE' && e.ctrlKey) {
        e.preventDefault();
        this._exportData();
      }
    });
    
    // Window resize
    window.addEventListener('resize', () => {
      this._updateMapSize();
    });
  }
  
  /**
   * Register game events
   * @private
   */
  _registerGameEvents() {
    // Turn start
    this.gameCoordinator.on('onTurnStart', (data) => {
      this._updateTurnCounter(data.turn);
    });
    
    // Turn end
    this.gameCoordinator.on('onTurnEnd', () => {
      this._updateGameInfo();
    });
    
    // Game start
    this.gameCoordinator.on('onGameStart', () => {
      this._updateGameInfo();
      this._renderMap();
    });
    
    // Game end
    this.gameCoordinator.on('onGameEnd', (data) => {
      this._showGameEnd(data);
    });
    
    // Battle occurred
    this.gameCoordinator.on('onBattleOccurred', () => {
      this._playSound('battle');
    });
    
    // Settlement founded
    this.gameCoordinator.on('onSettlementFounded', () => {
      this._playSound('settlement');
    });
    
    // Technology discovered
    this.gameCoordinator.on('onTechnologyDiscovered', () => {
      this._playSound('discovery');
    });
  }
  
  /**
   * Start rendering
   * @private
   */
  _startRendering() {
    // Initialize last frame time
    this.lastFrameTime = performance.now();
    this.framesCount = 0;
    
    // Set up FPS counter update interval
    if (this.showFPS) {
      this.fpsUpdateInterval = setInterval(() => {
        this.fpsCounter.textContent = `FPS: ${this.fps.toFixed(1)}`;
      }, 1000);
    }
    
    // Start render loop
    this._renderLoop();
  }
  
  /**
   * Main render loop
   * @private
   */
  _renderLoop() {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    // Calculate FPS
    this.framesCount++;
    
    if (delta > 0) {
      this.fps = 0.9 * this.fps + 0.1 * (1000 / delta); // Smooth FPS
    }
    
    // Update UI based on game state
    this._updateUI();
    
    // Request next frame
    this.animationFrame = requestAnimationFrame(() => this._renderLoop());
  }
  
  /**
   * Update the UI
   * @private
   */
  _updateUI() {
    // Update map display if game is running
    const gameState = this.gameCoordinator.getGameState();
    
    if (gameState.gameState === 'running' || gameState.gameState === 'paused') {
      // Update UI elements as needed
      this._updateTurnCounter(gameState.turn);
      this._updatePlayPauseButton(gameState.isPaused);
      
      // Update map (only redraw occasionally for performance)
      if (Math.random() < 0.05) { // ~5% chance per frame
        this._updateMap();
      }
    }
  }
  
  /**
   * Render the map
   * @private
   */
  _renderMap() {
    // Get game state
    const gameState = this.gameCoordinator.getGameState();
    if (!gameState) return;
    
    // Get first civilization for initial map view
    const firstCivId = gameState.civilizations[0]?.id;
    if (!firstCivId) return;
    
    // Get map data
    const mapData = this.gameCoordinator.getMapDataForCiv(firstCivId);
    if (!mapData) return;
    
    // Set up grid
    this.mapGrid.style.gridTemplateColumns = `repeat(${mapData.width}, 64px)`;
    this.mapGrid.style.gridTemplateRows = `repeat(${mapData.height}, 64px)`;
    
    // Clear existing tiles
    this.mapGrid.innerHTML = '';
    
    // Create tiles
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        const tile = document.createElement('div');
        tile.className = 'map-tile';
        tile.dataset.x = x;
        tile.dataset.y = y;
        
        // Set tile appearance based on visible data
        const tileData = mapData.tiles.find(t => t.x === x && t.y === y);
        
        if (tileData) {
          // Set terrain type
          tile.classList.add(`tile-${tileData.terrainType}`);
          
          // Add resource indicator if present
          if (tileData.resource) {
            const resourceIndicator = document.createElement('div');
            resourceIndicator.className = 'resource-indicator';
            resourceIndicator.title = `${tileData.resource} (${tileData.resourceAmount})`;
            tile.appendChild(resourceIndicator);
          }
          
          // Add settlement indicator if present
          if (tileData.settlement) {
            const settlementIndicator = document.createElement('div');
            settlementIndicator.className = 'settlement-indicator';
            
            // Get civilization color
            const civ = gameState.civilizations.find(c => {
              const civData = this.gameCoordinator.getCivilizationData(c.id);
              return civData.settlements.some(s => s.id === tileData.settlement);
            });
            
            if (civ) {
              settlementIndicator.style.backgroundColor = civ.color;
            }
            
            tile.appendChild(settlementIndicator);
          }
          
          // Add unit indicators if present
          if (tileData.units && tileData.units.length > 0) {
            const unitIndicator = document.createElement('div');
            unitIndicator.className = 'unit-indicator';
            unitIndicator.textContent = tileData.units.length.toString();
            
            // Get civilization color for the first unit
            const firstUnitOwner = tileData.units[0].owner;
            const ownerCiv = gameState.civilizations.find(c => c.id === firstUnitOwner);
            
            if (ownerCiv) {
              unitIndicator.style.borderColor = ownerCiv.color;
            }
            
            tile.appendChild(unitIndicator);
          }
        } else {
          // Unexplored tile
          tile.style.backgroundColor = '#000';
        }
        
        // Add click handler
        tile.addEventListener('click', () => {
          this._selectTile(x, y);
        });
        
        this.mapGrid.appendChild(tile);
      }
    }
    
    // Center the map
    this._centerMap();
  }
  
  /**
   * Update the map
   * @private
   */
  _updateMap() {
    // Get game state
    const gameState = this.gameCoordinator.getGameState();
    if (!gameState) return;
    
    // Get map data for the selected civilization or first one
    const civId = this.selectedCiv || gameState.civilizations[0]?.id;
    if (!civId) return;
    
    // Get map data
    const mapData = this.gameCoordinator.getMapDataForCiv(civId);
    if (!mapData) return;
    
    // Update visible tiles
    for (const tileData of mapData.tiles) {
      const tileElement = this.mapGrid.querySelector(`[data-x="${tileData.x}"][data-y="${tileData.y}"]`);
      
      if (tileElement) {
        // Update tile appearance
        tileElement.className = 'map-tile';
        tileElement.classList.add(`tile-${tileData.terrainType}`);
        
        // Clear existing indicators
        tileElement.innerHTML = '';
        
        // Add resource indicator if present
        if (tileData.resource) {
          const resourceIndicator = document.createElement('div');
          resourceIndicator.className = 'resource-indicator';
          resourceIndicator.title = `${tileData.resource} (${tileData.resourceAmount})`;
          tileElement.appendChild(resourceIndicator);
        }
        
        // Add settlement indicator if present
        if (tileData.settlement) {
          const settlementIndicator = document.createElement('div');
          settlementIndicator.className = 'settlement-indicator';
          
          // Get civilization color
          const civ = gameState.civilizations.find(c => {
            const civData = this.gameCoordinator.getCivilizationData(c.id);
            return civData.settlements.some(s => s.id === tileData.settlement);
          });
          
          if (civ) {
            settlementIndicator.style.backgroundColor = civ.color;
          }
          
          tileElement.appendChild(settlementIndicator);
        }
        
        // Add unit indicators if present
        if (tileData.units && tileData.units.length > 0) {
          const unitIndicator = document.createElement('div');
          unitIndicator.className = 'unit-indicator';
          unitIndicator.textContent = tileData.units.length.toString();
          
          // Get civilization color for the first unit
          const firstUnitOwner = tileData.units[0].owner;
          const ownerCiv = gameState.civilizations.find(c => c.id === firstUnitOwner);
          
          if (ownerCiv) {
            unitIndicator.style.borderColor = ownerCiv.color;
          }
          
          tileElement.appendChild(unitIndicator);
        }
      }
    }
  }
  
  /**
   * Select a tile
   * @private
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  _selectTile(x, y) {
    // Clear previous selection
    const previousSelected = this.mapGrid.querySelector('.map-tile.selected');
    if (previousSelected) {
      previousSelected.classList.remove('selected');
    }
    
    // Select new tile
    const tileElement = this.mapGrid.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    if (tileElement) {
      tileElement.classList.add('selected');
      this.selectedTile = { x, y };
      
      // Show tile info
      this._showTileInfo(x, y);
      
      // Switch to tile tab
      this._switchTab('tile-tab');
    }
  }
  
  /**
   * Show tile information
   * @private
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  _showTileInfo(x, y) {
    // Get game state
    const gameState = this.gameCoordinator.getGameState();
    if (!gameState) return;
    
    // Get map data for the selected civilization or first one
    const civId = this.selectedCiv || gameState.civilizations[0]?.id;
    if (!civId) return;
    
    // Get map data
    const mapData = this.gameCoordinator.getMapDataForCiv(civId);
    if (!mapData) return;
    
    // Find tile data
    const tileData = mapData.tiles.find(t => t.x === x && t.y === y);
    
    if (!tileData) {
      // Unexplored tile
      document.getElementById('tile-tab').innerHTML = `
        <div class="panel-section">
          <div class="panel-title">Unexplored Tile (${x}, ${y})</div>
          <p>This tile has not been explored yet</p>
        </div>
      `;
      return;
    }
    
    // Prepare tile info
    let infoHTML = `
      <div class="panel-section">
        <div class="panel-title">Tile (${x}, ${y})</div>
        <p><strong>Terrain:</strong> ${tileData.terrainType.charAt(0).toUpperCase() + tileData.terrainType.slice(1)}</p>
        <p><strong>Food:</strong> ${tileData.foodValue}</p>
        <p><strong>Production:</strong> ${tileData.productionValue}</p>
        <p><strong>Movement cost:</strong> ${tileData.movementCost}</p>
    `;
    
    // Add resource info
    if (tileData.resource) {
      infoHTML += `
        <p><strong>Resource:</strong> ${tileData.resource} (${tileData.resourceAmount})</p>
      `;
    }
    
    // Add improvement info
    if (tileData.improvement) {
      infoHTML += `
        <p><strong>Improvement:</strong> ${tileData.improvement}</p>
      `;
    }
    
    infoHTML += `</div>`;
    
    // Add settlement info
    if (tileData.settlement) {
      // Get civilization data
      let settlementInfo = null;
      
      for (const c of gameState.civilizations) {
        const civData = this.gameCoordinator.getCivilizationData(c.id);
        const settlement = civData.settlements.find(s => s.id === tileData.settlement);
        
        if (settlement) {
          settlementInfo = {
            settlement,
            civ: civData
          };
          break;
        }
      }
      
      if (settlementInfo) {
        infoHTML += `
          <div class="panel-section">
            <div class="panel-title">Settlement</div>
            <p><strong>Name:</strong> ${settlementInfo.settlement.name}</p>
            <p><strong>Owner:</strong> ${settlementInfo.civ.name}</p>
            <p><strong>Population:</strong> ${settlementInfo.settlement.population}</p>
            <p><strong>Capital:</strong> ${settlementInfo.settlement.isCapital ? 'Yes' : 'No'}</p>
            <p><strong>Buildings:</strong> ${settlementInfo.settlement.buildings.length > 0 ? settlementInfo.settlement.buildings.join(', ') : 'None'}</p>
          </div>
        `;
      }
    }
    
    // Add units info
    if (tileData.units && tileData.units.length > 0) {
      infoHTML += `
        <div class="panel-section">
          <div class="panel-title">Units (${tileData.units.length})</div>
          <ul>
      `;
      
      for (const unit of tileData.units) {
        // Find unit owner
        const ownerCiv = gameState.civilizations.find(c => c.id === unit.owner);
        
        infoHTML += `
          <li>
            <strong>${unit.type.charAt(0).toUpperCase() + unit.type.slice(1)}</strong> 
            (Owner: ${ownerCiv ? ownerCiv.name : 'Unknown'})
          </li>
        `;
      }
      
      infoHTML += `
          </ul>
        </div>
      `;
    }
    
    // Update tile tab
    document.getElementById('tile-tab').innerHTML = infoHTML;
  }
  
  /**
   * Toggle play/pause
   * @private
   */
  _togglePlayPause() {
    const gameState = this.gameCoordinator.getGameState();
    
    if (gameState.isPaused || gameState.gameState === 'paused') {
      this.gameCoordinator.resume();
      this.playPauseButton.textContent = '⏸️ Pause';
    } else {
      this.gameCoordinator.pause();
      this.playPauseButton.textContent = '▶️ Resume';
    }
  }
  
  /**
   * Update the turn counter
   * @private
   * @param {number} turn - Current turn
   */
  _updateTurnCounter(turn) {
    const gameState = this.gameCoordinator.getGameState();
    this.turnCounter.textContent = `Turn: ${turn} / ${gameState.maxTurns}`;
  }
  
  /**
   * Update the play/pause button
   * @private
   * @param {boolean} isPaused - Whether the game is paused
   */
  _updatePlayPauseButton(isPaused) {
    this.playPauseButton.textContent = isPaused ? '▶️ Resume' : '⏸️ Pause';
  }
  
  /**
   * Set the turn speed
   * @private
   * @param {string} speed - Turn speed ('slow', 'normal', 'fast')
   */
  _setTurnSpeed(speed) {
    let delay;
    
    switch (speed) {
      case 'slow':
        delay = 3000;
        break;
      case 'normal':
        delay = 2000;
        break;
      case 'fast':
        delay = 500;
        break;
      default:
        delay = 2000;
    }
    
    // Update the game coordinator
    this.gameCoordinator.turnDelay = delay;
  }
  
  /**
   * Export data
   * @private
   */
  _exportData() {
    this.gameCoordinator.exportResearchData();
  }
  
  /**
   * Update the map size
   * @private
   */
  _updateMapSize() {
    // Adjust the grid size based on the container size
    const maxGridWidth = this.mapContainer.clientWidth;
    const maxGridHeight = this.mapContainer.clientHeight;
    
    // Get game state
    const gameState = this.gameCoordinator.getGameState();
    if (!gameState) return;
    
    // Get first civilization for map view
    const firstCivId = gameState.civilizations[0]?.id;
    if (!firstCivId) return;
    
    // Get map data
    const mapData = this.gameCoordinator.getMapDataForCiv(firstCivId);
    if (!mapData) return;
    
    // Calculate tile size
    const tileWidth = Math.min(64, maxGridWidth / mapData.width);
    const tileHeight = Math.min(64, maxGridHeight / mapData.height);
    const tileSize = Math.min(tileWidth, tileHeight);
    
    // Update tile size
    const tiles = this.mapGrid.querySelectorAll('.map-tile');
    tiles.forEach(tile => {
      tile.style.width = `${tileSize}px`;
      tile.style.height = `${tileSize}px`;
    });
    
    // Update grid template
    this.mapGrid.style.gridTemplateColumns = `repeat(${mapData.width}, ${tileSize}px)`;
    this.mapGrid.style.gridTemplateRows = `repeat(${mapData.height}, ${tileSize}px)`;
  }
  
  /**
   * Center the map
   * @private
   */
  _centerMap() {
    // Get map dimensions
    const mapWidth = this.mapGrid.clientWidth;
    const mapHeight = this.mapGrid.clientHeight;
    
    // Calculate center position
    const scrollX = (mapWidth - this.mapContainer.clientWidth) / 2;
    const scrollY = (mapHeight - this.mapContainer.clientHeight) / 2;
    
    // Set scroll position
    this.mapContainer.scrollLeft = scrollX;
    this.mapContainer.scrollTop = scrollY;
  }
  
  /**
   * Switch tabs
   * @private
   * @param {string} tabId - Tab ID
   */
  _switchTab(tabId) {
    // Update tab buttons
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(button => {
      button.classList.toggle('active', button.dataset.tabId === tabId);
    });
    
    // Update tab content
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => {
      content.classList.toggle('active', content.id === tabId);
    });
  }
  
  /**
   * Set observer mode
   * @private
   * @param {string} mode - Observer mode
   */
  _setObserverMode(mode) {
    this.observerMode = mode;
    
    // Update UI
    const modeButtons = document.querySelectorAll('.observer-mode-button');
    modeButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.mode === mode);
    });
    
    // Update the game coordinator if needed
    if (this.gameCoordinator.observer) {
      this.gameCoordinator.observer.observationMode = mode;
    }
    
    // Refresh display
    this._updateGameInfo();
  }
  
  /**
   * Update game information
   * @private
   */
  _updateGameInfo() {
    // Get game state
    const gameState = this.gameCoordinator.getGameState();
    if (!gameState) return;
    
    // Update civilization tab
    let civHTML = '';
    
    for (const civ of gameState.civilizations) {
      const isSelected = civ.id === this.selectedCiv;
      const civData = this.gameCoordinator.getCivilizationData(civ.id);
      
      civHTML += `
        <div class="panel-section civ-item ${isSelected ? 'selected' : ''}" data-civ-id="${civ.id}">
          <div class="panel-title" style="color: ${civ.color}">
            ${civ.name} (Score: ${civData.calculateScore ? civData.calculateScore() : '?'})
          </div>
          <p><strong>Settlements:</strong> ${civData.settlements.length}</p>
          <p><strong>Units:</strong> ${civData.units.length}</p>
          <p><strong>Technologies:</strong> ${civData.technologies.length}</p>
          <p><strong>Resources:</strong> 
            Food: ${civData.resources.food}, 
            Production: ${civData.resources.production}, 
            Science: ${civData.resources.science}, 
            Gold: ${civData.resources.gold}
          </p>
          <button class="view-civ-btn" data-civ-id="${civ.id}">View Details</button>
        </div>
      `;
    }
    
    document.getElementById('civ-tab').innerHTML = civHTML;
    
    // Add event listeners for civilization buttons
    const viewButtons = document.querySelectorAll('.view-civ-btn');
    viewButtons.forEach(button => {
      button.addEventListener('click', () => {
        this._selectCivilization(button.dataset.civId);
      });
    });
    
    // Update metrics tab based on observer mode
    switch (this.observerMode) {
      case 'omniscient':
        this._updateMetricsOmniscient();
        break;
      case 'diplomat':
        this._updateMetricsDiplomat();
        break;
      case 'historian':
        this._updateMetricsHistorian();
        break;
    }
  }
  
  /**
   * Select a civilization
   * @private
   * @param {string} civId - Civilization ID
   */
  _selectCivilization(civId) {
    this.selectedCiv = civId;
    
    // Update UI for selected civilization
    document.querySelectorAll('.civ-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.civId === civId);
    });
    
    // Get civilization data
    const gameState = this.gameCoordinator.getGameState();
    const civ = gameState.civilizations.find(c => c.id === civId);
    
    if (civ) {
      const civData = this.gameCoordinator.getCivilizationData(civId);
      
      // Update civilization detail view
      const detailHTML = `
        <div class="panel-section">
          <div class="panel-title" style="color: ${civ.color}">${civ.name}</div>
          
          <h3>Resources</h3>
          <ul>
            <li>Food: ${civData.resources.food}</li>
            <li>Production: ${civData.resources.production}</li>
            <li>Science: ${civData.resources.science}</li>
            <li>Gold: ${civData.resources.gold}</li>
          </ul>
          
          <h3>Technologies (${civData.technologies.length})</h3>
          <p>${civData.technologies.join(', ') || 'None'}</p>
          
          <h3>Settlements (${civData.settlements.length})</h3>
          <ul>
            ${civData.settlements.map(s => `
              <li>
                ${s.name} 
                (Population: ${s.population})
                ${s.isCapital ? ' (Capital)' : ''}
              </li>
            `).join('')}
          </ul>
          
          <h3>Units (${civData.units.length})</h3>
          <ul>
            ${civData.units.map(u => `
              <li>
                ${u.type} 
                at (${u.location.x}, ${u.location.y})
                (Health: ${u.health})
              </li>
            `).join('')}
          </ul>
          
          <h3>Diplomatic Relations</h3>
          <ul>
            ${Object.entries(civData.diplomaticRelations).map(([otherId, status]) => {
              const otherCiv = gameState.civilizations.find(c => c.id === otherId);
              return `<li>${otherCiv ? otherCiv.name : otherId}: ${status}</li>`;
            }).join('') || '<li>No diplomatic relations</li>'}
          </ul>
          
          ${civData.currentResearch ? `
            <h3>Current Research</h3>
            <p>${civData.currentResearch} (${civData.researchProgress}%)</p>
          ` : ''}
        </div>
      `;
      
      document.getElementById('civ-tab').innerHTML = detailHTML;
      
      // Update map to show this civilization's view
      this._renderMap();
    }
  }
  
  /**
   * Update metrics in omniscient mode
   * @private
   */
  _updateMetricsOmniscient() {
    // Get data from the observer
    if (!this.gameCoordinator.observer) return;
    
    const metrics = this.gameCoordinator.observer.getMachiavellianMetrics();
    
    let metricsHTML = `
      <div class="panel-section">
        <div class="panel-title">Machiavellian Metrics</div>
        
        <h3>Deception Index</h3>
        <ul>
    `;
    
    // Add deception metrics for each civilization
    for (const civId in metrics.deceptionIndex) {
      const gameState = this.gameCoordinator.getGameState();
      const civ = gameState.civilizations.find(c => c.id === civId);
      
      if (civ) {
        metricsHTML += `
          <li>
            <strong style="color: ${civ.color}">${civ.name}:</strong> 
            ${metrics.deceptionIndex[civId].toFixed(2)}
          </li>
        `;
      }
    }
    
    metricsHTML += `
        </ul>
        
        <h3>Betrayal Events</h3>
    `;
    
    if (metrics.betrayalEvents.length > 0) {
      metricsHTML += `<ul>`;
      
      for (const event of metrics.betrayalEvents) {
        const gameState = this.gameCoordinator.getGameState();
        const betrayer = gameState.civilizations.find(c => c.id === event.betrayer);
        const victim = gameState.civilizations.find(c => c.id === event.victim);
        
        if (betrayer && victim) {
          metricsHTML += `
            <li>
              Turn ${event.turn}: 
              <span style="color: ${betrayer.color}">${betrayer.name}</span> 
              betrayed 
              <span style="color: ${victim.color}">${victim.name}</span>
              (Severity: ${event.severity.toFixed(2)})
            </li>
          `;
        }
      }
      
      metricsHTML += `</ul>`;
    } else {
      metricsHTML += `<p>No betrayal events recorded</p>`;
    }
    
    metricsHTML += `
        <h3>Strategic Deception</h3>
    `;
    
    if (metrics.strategicDeception.length > 0) {
      metricsHTML += `<ul>`;
      
      for (const event of metrics.strategicDeception) {
        const gameState = this.gameCoordinator.getGameState();
        const deceiver = gameState.civilizations.find(c => c.id === event.civ);
        
        if (deceiver) {
          metricsHTML += `
            <li>
              Turn ${event.turn}: 
              <span style="color: ${deceiver.color}">${deceiver.name}</span> 
              ${event.description}
            </li>
          `;
        }
      }
      
      metricsHTML += `</ul>`;
    } else {
      metricsHTML += `<p>No strategic deception recorded</p>`;
    }
    
    metricsHTML += `</div>`;
    
    document.getElementById('metrics-tab').innerHTML = metricsHTML;
  }
  
  /**
   * Update metrics in diplomat mode
   * @private
   */
  _updateMetricsDiplomat() {
    // In diplomat mode, only show public information
    
    let metricsHTML = `
      <div class="panel-section">
        <div class="panel-title">Diplomatic Analysis</div>
        
        <h3>Public Communications</h3>
    `;
    
    // Get public communications from the observer
    if (this.gameCoordinator.observer) {
      const communications = this.gameCoordinator.observer.getPublicCommunications(10);
      
      if (communications.length > 0) {
        metricsHTML += `<ul>`;
        
        for (const comm of communications) {
          const gameState = this.gameCoordinator.getGameState();
          const sender = gameState.civilizations.find(c => c.id === comm.from);
          const receiver = gameState.civilizations.find(c => c.id === comm.to);
          
          if (sender && receiver) {
            metricsHTML += `
              <li>
                Turn ${comm.turn}: 
                <span style="color: ${sender.color}">${sender.name}</span> 
                to 
                <span style="color: ${receiver.color}">${receiver.name}</span>:
                "${comm.message.substring(0, 100)}${comm.message.length > 100 ? '...' : ''}"
              </li>
            `;
          }
        }
        
        metricsHTML += `</ul>`;
      } else {
        metricsHTML += `<p>No public communications recorded</p>`;
      }
    }
    
    metricsHTML += `
        <h3>Diplomatic Relations</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr>
              <th style="border: 1px solid #ccc; padding: 5px;"></th>
    `;
    
    // Get civilizations
    const gameState = this.gameCoordinator.getGameState();
    
    // Add column headers for each civilization
    for (const civ of gameState.civilizations) {
      metricsHTML += `<th style="border: 1px solid #ccc; padding: 5px; color: ${civ.color}">${civ.name}</th>`;
    }
    
    metricsHTML += `
            </tr>
          </thead>
          <tbody>
    `;
    
    // Add rows for each civilization
    for (const rowCiv of gameState.civilizations) {
      metricsHTML += `
        <tr>
          <th style="border: 1px solid #ccc; padding: 5px; color: ${rowCiv.color}">
            ${rowCiv.name}
          </th>
      `;
      
      // Add cells for each relation
      for (const colCiv of gameState.civilizations) {
        if (rowCiv.id === colCiv.id) {
          // Self relation
          metricsHTML += `<td style="border: 1px solid #ccc; padding: 5px; text-align: center;">-</td>`;
        } else {
          // Get relation
          const civData = this.gameCoordinator.getCivilizationData(rowCiv.id);
          const relation = civData.diplomaticRelations[colCiv.id] || 'unknown';
          
          // Set background color based on relation
          let bgColor = '';
          switch (relation) {
            case 'friendly':
              bgColor = 'rgba(76, 175, 80, 0.2)';
              break;
            case 'neutral':
              bgColor = 'rgba(255, 255, 255, 0.2)';
              break;
            case 'hostile':
              bgColor = 'rgba(244, 67, 54, 0.2)';
              break;
            case 'war':
              bgColor = 'rgba(244, 67, 54, 0.4)';
              break;
            case 'alliance':
              bgColor = 'rgba(76, 175, 80, 0.4)';
              break;
          }
          
          metricsHTML += `
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; background-color: ${bgColor}">
              ${relation.charAt(0).toUpperCase() + relation.slice(1)}
            </td>
          `;
        }
      }
      
      metricsHTML += `</tr>`;
    }
    
    metricsHTML += `
          </tbody>
        </table>
      </div>
    `;
    
    document.getElementById('metrics-tab').innerHTML = metricsHTML;
  }
  
  /**
   * Update metrics in historian mode
   * @private
   */
  _updateMetricsHistorian() {
    // In historian mode, show analytical data and historical metrics
    
    let metricsHTML = `
      <div class="panel-section">
        <div class="panel-title">Historical Analysis</div>
        
        <h3>Civilization Rankings</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr>
              <th style="border: 1px solid #ccc; padding: 5px;">Rank</th>
              <th style="border: 1px solid #ccc; padding: 5px;">Civilization</th>
              <th style="border: 1px solid #ccc; padding: 5px;">Score</th>
              <th style="border: 1px solid #ccc; padding: 5px;">Settlements</th>
              <th style="border: 1px solid #ccc; padding: 5px;">Technologies</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Get civilizations and sort by score
    const gameState = this.gameCoordinator.getGameState();
    const sortedCivs = [...gameState.civilizations].sort((a, b) => {
      const civDataA = this.gameCoordinator.getCivilizationData(a.id);
      const civDataB = this.gameCoordinator.getCivilizationData(b.id);
      const scoreA = civDataA.calculateScore ? civDataA.calculateScore() : 0;
      const scoreB = civDataB.calculateScore ? civDataB.calculateScore() : 0;
      return scoreB - scoreA;
    });
    
    // Add rows for each civilization
    for (let i = 0; i < sortedCivs.length; i++) {
      const civ = sortedCivs[i];
      const civData = this.gameCoordinator.getCivilizationData(civ.id);
      
      metricsHTML += `
        <tr>
          <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${i + 1}</td>
          <td style="border: 1px solid #ccc; padding: 5px; color: ${civ.color}">${civ.name}</td>
          <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">
            ${civData.calculateScore ? civData.calculateScore() : '?'}
          </td>
          <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">
            ${civData.settlements.length}
          </td>
          <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">
            ${civData.technologies.length}
          </td>
        </tr>
      `;
    }
    
    metricsHTML += `
          </tbody>
        </table>
        
        <h3>Key Historical Events</h3>
    `;
    
    // Get historical events from the observer
    if (this.gameCoordinator.observer) {
      const events = this.gameCoordinator.observer.getKeyHistoricalEvents(15);
      
      if (events.length > 0) {
        metricsHTML += `<ul>`;
        
        for (const event of events) {
          metricsHTML += `
            <li>
              <strong>Turn ${event.turn}:</strong> ${event.description}
            </li>
          `;
        }
        
        metricsHTML += `</ul>`;
      } else {
        metricsHTML += `<p>No key historical events recorded</p>`;
      }
    }
    
    metricsHTML += `
        <h3>Technology Trends</h3>
        <p>Most researched technologies:</p>
        <ul>
    `;
    
    // Count technologies across civilizations
    const techCounts = {};
    
    for (const civ of gameState.civilizations) {
      const civData = this.gameCoordinator.getCivilizationData(civ.id);
      
      for (const tech of civData.technologies) {
        techCounts[tech] = (techCounts[tech] || 0) + 1;
      }
    }
    
    // Sort technologies by count
    const sortedTechs = Object.entries(techCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5
    
    for (const [tech, count] of sortedTechs) {
      metricsHTML += `
        <li>
          <strong>${tech}:</strong> ${count} civilizations
        </li>
      `;
    }
    
    metricsHTML += `
        </ul>
      </div>
    `;
    
    document.getElementById('metrics-tab').innerHTML = metricsHTML;
  }
  
  /**
   * Show game end screen
   * @private
   * @param {Object} data - Game end data
   */
  _showGameEnd(data) {
    // Create game end overlay
    const overlay = document.createElement('div');
    overlay.className = 'game-end-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.color = 'white';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '100';
    overlay.style.padding = '20px';
    
    // Create content
    let content = `
      <h1 style="color: gold; font-size: 32px; margin-bottom: 20px;">Game Ended</h1>
      <h2 style="margin-bottom: 30px;">Winner: ${data.winner.name}</h2>
      
      <h3 style="margin-bottom: 10px;">Final Scores</h3>
      <table style="width: 80%; max-width: 500px; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr>
            <th style="padding: 10px; border-bottom: 1px solid #ccc; text-align: left;">Civilization</th>
            <th style="padding: 10px; border-bottom: 1px solid #ccc; text-align: right;">Score</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    for (const score of data.finalScores) {
      const gameState = this.gameCoordinator.getGameState();
      const civ = gameState.civilizations.find(c => c.id === score.id);
      
      content += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #555; text-align: left; color: ${civ ? civ.color : 'white'};">
            ${score.name}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #555; text-align: right;">
            ${score.score}
          </td>
        </tr>
      `;
    }
    
    content += `
        </tbody>
      </table>
      
      <div style="display: flex; gap: 20px;">
        <button id="export-data-btn" style="padding: 10px 20px; background-color: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Export Research Data
        </button>
        
        <button id="restart-btn" style="padding: 10px 20px; background-color: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Start New Game
        </button>
      </div>
    `;
    
    overlay.innerHTML = content;
    this.container.appendChild(overlay);
    
    // Add event listeners
    document.getElementById('export-data-btn').addEventListener('click', () => {
      this._exportData();
    });
    
    document.getElementById('restart-btn').addEventListener('click', () => {
      // Reload the page to start a new game
      window.location.reload();
    });
  }
  
  /**
   * Play a sound effect
   * @private
   * @param {string} type - Sound type
   */
  _playSound(type) {
    // Simple implementation - can be expanded with actual sound effects
    console.log(`Playing sound: ${type}`);
    
    // Implement actual sound playback if needed
  }
}

// Export the class
if (typeof window !== 'undefined') {
  // Browser environment
  window.MachinaPrincipis.SimulationUI = SimulationUI;
  console.log("SimulationUI exported to window.MachinaPrincipis");
}

if (typeof module !== 'undefined') {
  // Node.js environment
  module.exports = SimulationUI;
}