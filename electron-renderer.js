// Machina Principis - Electron Renderer Script
// Handles the renderer process UI and interactions with the main process

// DOM Elements
let configContainer;
let configForm;
let simulationContainer;
let loadingOverlay;
let loadingMessage;
let apiKeyWarning;
let darkModeCheckbox;
let presetButtons;
let simulationUI;

// Game state
let isGameRunning = false;
let selectedCiv = null;
let selectedTile = null;
let observerMode = 'omniscient';
let eventHistory = [];
let agentVisualizations = {};

// Simulation UI class (compatible with the original SimulationUI)
class ElectronSimulationUI {
  constructor(config = {}) {
    this.containerId = config.containerId || 'simulation-container';
    this.container = document.getElementById(this.containerId);
    this.darkMode = config.darkMode !== undefined ? config.darkMode : true;
    this.showAgentAvatars = config.showAgentAvatars !== undefined ? config.showAgentAvatars : true;
    this.showTimeline = config.showTimeline !== undefined ? config.showTimeline : true;
    
    // UI components
    this.mapContainer = null;
    this.infoPanel = null;
    this.controlPanel = null;
    this.mapGrid = null;
    this.observerMode = config.observationMode || 'omniscient';
    
    // Agent visualization
    this.agentVisualizations = {};
    this.relationshipLines = [];
    
    // Timeline
    this.timelineContainer = null;
    this.timeline = null;
    this.timelineEvents = [];
  }
  
  // Initialize the UI
  initialize() {
    try {
      if (!this.container) {
        console.error(`Container element not found: #${this.containerId}`);
        return false;
      }
      
      console.log("Initializing simulation UI");
      
      // Apply styles
      this._applyStyles();
      
      // Create UI components
      this._createComponents();
      
      // Register event handlers
      this._registerEventHandlers();
      
      // Register game events
      this._registerGameEvents();
      
      // Debug: Test API connection
      this._testAPIConnection();
      
      console.log("Simulation UI initialized");
      return true;
    } catch (error) {
      console.error("Error initializing simulation UI:", error);
      return false;
    }
  }
  
  // Test API connection to diagnose issues
  _testAPIConnection() {
    console.log("Testing API connection to main process...");
    
    // Test game state
    window.MachinaPrincipis.getGameState()
      .then(state => console.log("Game state:", state))
      .catch(err => console.error("Error getting game state:", err));
      
    // Add visual debugging element
    const debugElement = document.createElement('div');
    debugElement.style.position = 'absolute';
    debugElement.style.top = '10px';
    debugElement.style.left = '10px';
    debugElement.style.padding = '10px';
    debugElement.style.background = 'rgba(0,0,0,0.7)';
    debugElement.style.color = 'white';
    debugElement.style.fontSize = '12px';
    debugElement.style.fontFamily = 'monospace';
    debugElement.style.zIndex = '1000';
    debugElement.style.borderRadius = '4px';
    debugElement.style.maxWidth = '300px';
    debugElement.style.maxHeight = '200px';
    debugElement.style.overflow = 'auto';
    debugElement.textContent = 'Connecting to game engine...';
    this.mapContainer.appendChild(debugElement);
    
    // Update debug element with API status
    window.MachinaPrincipis.getGameState().then(state => {
      if (state) {
        debugElement.textContent = `Connected: Turn ${state.turn}/${state.maxTurns}\nCivilizations: ${state.civilizations?.length || 0}`;
        debugElement.style.background = 'rgba(0,128,0,0.7)';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
          debugElement.style.opacity = '0';
          debugElement.style.transition = 'opacity 1s ease';
          setTimeout(() => debugElement.remove(), 1000);
        }, 10000);
      } else {
        debugElement.textContent = 'Error: No game state received';
        debugElement.style.background = 'rgba(255,0,0,0.7)';
      }
    }).catch(err => {
      debugElement.textContent = `Error: ${err.message}`;
      debugElement.style.background = 'rgba(255,0,0,0.7)';
    });
  }
  
  // Create UI components
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
    
    // Create agent visualization layer if enabled
    if (this.showAgentAvatars) {
      this.agentVisualizationLayer = document.createElement('div');
      this.agentVisualizationLayer.className = 'agent-visualization';
      this.mapContainer.appendChild(this.agentVisualizationLayer);
    }
    
    // Create timeline if enabled
    if (this.showTimeline) {
      this.timelineContainer = document.createElement('div');
      this.timelineContainer.className = 'timeline-container';
      this.mapContainer.appendChild(this.timelineContainer);
      
      this.timeline = document.createElement('div');
      this.timeline.className = 'timeline';
      this.timelineContainer.appendChild(this.timeline);
    }
    
    // Set up info panel
    this._setupInfoPanel();
    
    // Set up control panel
    this._setupControlPanel();
  }
  
  // Set up the info panel
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
  
  // Set up the control panel
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
  
  // Register event handlers
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
      this._updateLayoutForScreenSize();
    });
  }
  
  // Register game events
  _registerGameEvents() {
    // Use the Electron IPC events via the API exposed in preload
    window.MachinaPrincipis.on('game:onTurnStart', (data) => {
      this._updateTurnCounter(data.turn);
    });
    
    window.MachinaPrincipis.on('game:onTurnEnd', (data) => {
      this._updateGameInfo();
      
      // Add turn to the timeline
      if (this.showTimeline) {
        this._addTimelineEvent('turn', data.turn);
      }
    });
    
    window.MachinaPrincipis.on('game:onGameStart', () => {
      this._updateGameInfo();
      this._renderMap();
    });
    
    window.MachinaPrincipis.on('game:onGameEnd', (data) => {
      this._showGameEnd(data);
    });
    
    window.MachinaPrincipis.on('game:onBattleOccurred', (data) => {
      // Add battle event to timeline
      if (this.showTimeline) {
        this._addTimelineEvent('battle', data.turn, {
          location: data.location,
          description: `Battle between ${data.attacker} and ${data.defender}`
        });
      }
      
      // Update agent visualizations to show conflict
      if (this.showAgentAvatars) {
        this._updateAgentRelationship(data.attacker, data.defender, 'hostile');
      }
    });
    
    window.MachinaPrincipis.on('game:onSettlementFounded', (data) => {
      // Add settlement event to timeline
      if (this.showTimeline) {
        this._addTimelineEvent('settlement', data.turn, {
          civ: data.civ,
          name: data.name,
          location: data.location
        });
      }
    });
    
    window.MachinaPrincipis.on('game:onTechnologyDiscovered', (data) => {
      // Add technology event to timeline
      if (this.showTimeline) {
        this._addTimelineEvent('tech', data.turn, {
          civ: data.civ,
          technology: data.technology
        });
      }
    });
    
    window.MachinaPrincipis.on('game:onDiplomacyChanged', (data) => {
      // Add diplomacy event to timeline
      if (this.showTimeline) {
        this._addTimelineEvent('diplomacy', data.turn, {
          civ1: data.civ1,
          civ2: data.civ2,
          oldStatus: data.oldStatus,
          newStatus: data.newStatus
        });
      }
      
      // Update agent visualizations to show relationship
      if (this.showAgentAvatars) {
        this._updateAgentRelationship(data.civ1, data.civ2, data.newStatus);
      }
    });
    
    window.MachinaPrincipis.on('game:onAgentDecision', (data) => {
      // Update agent visualization to show thinking/decision
      if (this.showAgentAvatars) {
        this._updateAgentThinking(data.civ, false);
        this._showAgentSpeechBubble(data.civ, data.summary);
      }
    });
  }
  
  // Apply initial styles
  _applyStyles() {
    // Apply dark mode if enabled
    document.body.classList.toggle('dark-mode', this.darkMode);
    
    // Apply responsive layout adjustments
    this._updateLayoutForScreenSize();
  }
  
  // Update layout based on screen size
  _updateLayoutForScreenSize() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Log screen dimensions for debugging
    console.log(`Window dimensions: ${windowWidth}x${windowHeight}`);
    
    // Adjust font size based on screen width
    if (windowWidth < 800) {
      document.body.style.fontSize = '14px';
    } else {
      document.body.style.fontSize = '16px';
    }
    
    // Adjust map tile size based on screen width
    if (this.mapGrid) {
      const tileSize = windowWidth < 1000 ? 48 : 64;
      const tiles = this.mapGrid.querySelectorAll('.map-tile');
      
      tiles.forEach(tile => {
        tile.style.width = `${tileSize}px`;
        tile.style.height = `${tileSize}px`;
      });
    }
  }
  
  // Render the map
  _renderMap() {
    // Get game state from the main process
    window.MachinaPrincipis.getGameState().then(gameState => {
      if (!gameState) return;
      
      console.log("Rendering map with game state:", gameState);
      
      // Get first civilization for initial map view
      const firstCivId = gameState.civilizations?.[0]?.id;
      if (!firstCivId) {
        console.error("No civilizations found in game state");
        this._renderFallbackMap(gameState); // Render a fallback map
        return;
      }
      
      // Get map data
      window.MachinaPrincipis.getMapData(firstCivId).then(mapData => {
        if (!mapData) {
          console.error("No map data returned for civ:", firstCivId);
          this._renderFallbackMap(gameState); // Render a fallback map
          return;
        }
        
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
                  const findSettlement = window.MachinaPrincipis.getCivilizationData(c.id)
                    .then(civData => civData.settlements.some(s => s.id === tileData.settlement));
                  return findSettlement;
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
        
        // Set up agent visualizations if enabled
        if (this.showAgentAvatars) {
          this._setupAgentVisualizations(gameState.civilizations);
        }
      });
    });
  }
  
  // Update the map
  _updateMap() {
    // Get game state from the main process
    window.MachinaPrincipis.getGameState().then(gameState => {
      if (!gameState) return;
      
      // Get map data for the selected civilization or first one
      const civId = this.selectedCiv || gameState.civilizations[0]?.id;
      if (!civId) return;
      
      // Get map data
      window.MachinaPrincipis.getMapData(civId).then(mapData => {
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
              let settlementOwnerColor = 'white';
              for (const civ of gameState.civilizations) {
                window.MachinaPrincipis.getCivilizationData(civ.id).then(civData => {
                  if (civData.settlements.some(s => s.id === tileData.settlement)) {
                    settlementIndicator.style.backgroundColor = civ.color;
                  }
                });
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
      });
    });
  }
  
  // Toggle play/pause
  _togglePlayPause() {
    window.MachinaPrincipis.getGameState().then(gameState => {
      if (gameState.isPaused || gameState.gameState === 'paused') {
        window.MachinaPrincipis.resumeGame();
        this.playPauseButton.textContent = '⏸️ Pause';
      } else {
        window.MachinaPrincipis.pauseGame();
        this.playPauseButton.textContent = '▶️ Resume';
      }
    });
  }
  
  // Set turn speed
  _setTurnSpeed(speed) {
    window.MachinaPrincipis.setTurnSpeed(speed);
  }
  
  // Export data
  _exportData() {
    window.MachinaPrincipis.exportData();
  }
  
  // Update the turn counter
  _updateTurnCounter(turn) {
    window.MachinaPrincipis.getGameState().then(gameState => {
      this.turnCounter.textContent = `Turn: ${turn} / ${gameState.maxTurns}`;
    });
  }
  
  // Set observer mode
  _setObserverMode(mode) {
    this.observerMode = mode;
    
    // Update UI
    const modeButtons = document.querySelectorAll('.observer-mode-button');
    modeButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.mode === mode);
    });
    
    // Update visualizations based on mode
    if (this.showAgentAvatars) {
      this._updateAgentVisualizationsForMode(mode);
    }
    
    // Refresh display
    this._updateGameInfo();
  }
  
  // Switch tabs
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
  
  // Update game information
  _updateGameInfo() {
    // Get game state from the main process
    window.MachinaPrincipis.getGameState().then(gameState => {
      if (!gameState) return;
      
      // Update civilization tab
      let civHTML = '';
      
      for (const civ of gameState.civilizations) {
        const isSelected = civ.id === this.selectedCiv;
        
        window.MachinaPrincipis.getCivilizationData(civ.id).then(civData => {
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
        });
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
    });
  }
  
  // Agent visualization methods
  _setupAgentVisualizations(civilizations) {
    if (!this.agentVisualizationLayer) return;
    
    // Clear existing visualizations
    this.agentVisualizationLayer.innerHTML = '';
    this.agentVisualizations = {};
    
    // Create agent avatars
    civilizations.forEach(civ => {
      // Create avatar element
      const avatar = document.createElement('div');
      avatar.className = 'agent-avatar';
      avatar.dataset.civId = civ.id;
      avatar.style.backgroundColor = civ.color;
      
      // Randomize initial position
      const mapWidth = parseInt(this.mapGrid.style.gridTemplateColumns.match(/repeat\((\d+)/)[1]);
      const mapHeight = parseInt(this.mapGrid.style.gridTemplateRows.match(/repeat\((\d+)/)[1]);
      
      const x = 40 + Math.floor(Math.random() * (mapWidth * 64 - 80));
      const y = 40 + Math.floor(Math.random() * (mapHeight * 64 - 80));
      
      avatar.style.left = `${x}px`;
      avatar.style.top = `${y}px`;
      
      // Add thinking indicator (initially hidden)
      const thinking = document.createElement('div');
      thinking.className = 'agent-thinking';
      thinking.style.display = 'none';
      
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'thinking-dot';
        thinking.appendChild(dot);
      }
      
      avatar.appendChild(thinking);
      
      // Store reference
      this.agentVisualizations[civ.id] = {
        avatar,
        thinking: false,
        speechBubble: null,
        position: { x, y }
      };
      
      // Add to layer
      this.agentVisualizationLayer.appendChild(avatar);
      
      // Add click handler
      avatar.addEventListener('click', () => {
        this._selectCivilization(civ.id);
      });
    });
  }
  
  // Update agent thinking state
  _updateAgentThinking(civId, isThinking) {
    const agent = this.agentVisualizations[civId];
    if (!agent) return;
    
    agent.thinking = isThinking;
    const thinkingElement = agent.avatar.querySelector('.agent-thinking');
    
    if (thinkingElement) {
      thinkingElement.style.display = isThinking ? 'flex' : 'none';
    }
  }
  
  // Show agent speech bubble
  _showAgentSpeechBubble(civId, text) {
    const agent = this.agentVisualizations[civId];
    if (!agent) return;
    
    // Remove existing speech bubble
    if (agent.speechBubble) {
      agent.speechBubble.remove();
      agent.speechBubble = null;
    }
    
    // Create new speech bubble
    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.textContent = text;
    
    // Position bubble above avatar
    const avatarRect = agent.avatar.getBoundingClientRect();
    bubble.style.left = `${agent.position.x}px`;
    bubble.style.top = `${agent.position.y - 80}px`;
    
    // Add to layer
    this.agentVisualizationLayer.appendChild(bubble);
    agent.speechBubble = bubble;
    
    // Auto-hide after a few seconds
    setTimeout(() => {
      if (agent.speechBubble === bubble) {
        bubble.style.opacity = '0';
        setTimeout(() => {
          if (agent.speechBubble === bubble) {
            bubble.remove();
            agent.speechBubble = null;
          }
        }, 300);
      }
    }, 5000);
  }
  
  // Update agent relationship visualization
  _updateAgentRelationship(civId1, civId2, status) {
    const agent1 = this.agentVisualizations[civId1];
    const agent2 = this.agentVisualizations[civId2];
    
    if (!agent1 || !agent2) return;
    
    // Find existing relationship line
    let line = this.relationshipLines.find(
      l => (l.civ1 === civId1 && l.civ2 === civId2) || 
           (l.civ1 === civId2 && l.civ2 === civId1)
    );
    
    // Determine line color based on relationship
    let color;
    switch (status) {
      case 'friendly':
        color = 'rgba(76, 175, 80, 0.6)';
        break;
      case 'neutral':
        color = 'rgba(255, 255, 255, 0.4)';
        break;
      case 'hostile':
        color = 'rgba(244, 67, 54, 0.6)';
        break;
      case 'war':
        color = 'rgba(244, 67, 54, 0.8)';
        break;
      case 'alliance':
        color = 'rgba(76, 175, 80, 0.8)';
        break;
      default:
        color = 'rgba(255, 255, 255, 0.4)';
    }
    
    if (line) {
      // Update existing line
      line.element.style.backgroundColor = color;
    } else {
      // Create new line
      const lineElement = document.createElement('div');
      lineElement.className = 'relationship-line';
      
      // Create line data
      line = {
        civ1: civId1,
        civ2: civId2,
        status,
        element: lineElement
      };
      
      this.relationshipLines.push(line);
      this.agentVisualizationLayer.appendChild(lineElement);
    }
    
    // Update line position
    this._updateRelationshipLinePosition(line);
  }
  
  // Update relationship line position
  _updateRelationshipLinePosition(line) {
    const agent1 = this.agentVisualizations[line.civ1];
    const agent2 = this.agentVisualizations[line.civ2];
    
    if (!agent1 || !agent2) return;
    
    // Calculate line position and angle
    const x1 = agent1.position.x + 20; // avatar center
    const y1 = agent1.position.y + 20;
    const x2 = agent2.position.x + 20;
    const y2 = agent2.position.y + 20;
    
    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    
    // Set line position and transform
    line.element.style.width = `${length}px`;
    line.element.style.left = `${x1}px`;
    line.element.style.top = `${y1}px`;
    line.element.style.transform = `rotate(${angle}deg)`;
  }
  
  // Update all agent visualizations for the current mode
  _updateAgentVisualizationsForMode(mode) {
    // Show/hide private thoughts and relationships based on mode
    for (const civId in this.agentVisualizations) {
      const agent = this.agentVisualizations[civId];
      
      // In diplomat mode, only show public information
      if (mode === 'diplomat') {
        // Remove private thought bubbles
        if (agent.speechBubble && agent.speechBubble.dataset.private === 'true') {
          agent.speechBubble.remove();
          agent.speechBubble = null;
        }
      }
    }
    
    // Update relationship lines
    this.relationshipLines.forEach(line => {
      // In diplomat mode, only show declared relationships
      if (mode === 'diplomat') {
        const isPublic = line.status === 'alliance' || line.status === 'war';
        line.element.style.opacity = isPublic ? '1' : '0';
      } else {
        line.element.style.opacity = '1';
      }
    });
  }
  
  // Timeline methods
  _addTimelineEvent(type, turn, data = {}) {
    if (!this.timeline) return;
    
    // Calculate position on timeline (percentage of max turns)
    window.MachinaPrincipis.getGameState().then(gameState => {
      const percentage = (turn / gameState.maxTurns) * 100;
      
      // Create event marker
      const event = document.createElement('div');
      event.className = `timeline-event ${type}`;
      event.style.left = `${percentage}%`;
      event.dataset.turn = turn;
      event.dataset.type = type;
      
      // Set tooltip based on event type
      let tooltip = `Turn ${turn}: `;
      
      switch (type) {
        case 'battle':
          tooltip += `Battle at (${data.location.x}, ${data.location.y})`;
          break;
        case 'settlement':
          tooltip += `${data.civ} founded ${data.name}`;
          break;
        case 'tech':
          tooltip += `${data.civ} discovered ${data.technology}`;
          break;
        case 'diplomacy':
          tooltip += `${data.civ1} and ${data.civ2} changed relations to ${data.newStatus}`;
          break;
        case 'turn':
          tooltip = `Turn ${turn}`;
          break;
      }
      
      event.title = tooltip;
      
      // Store event data
      event.dataset.eventData = JSON.stringify(data);
      
      // Add to timeline
      this.timeline.appendChild(event);
      this.timelineEvents.push({
        element: event,
        turn,
        type,
        data
      });
      
      // Add click handler
      event.addEventListener('click', () => {
        this._showEventDetails(turn, type, data);
      });
    });
  }
  
  // Show event details
  _showEventDetails(turn, type, data) {
    // Show details in metrics tab
    let detailsHTML = `
      <div class="panel-section">
        <div class="panel-title">Event Details - Turn ${turn}</div>
    `;
    
    switch (type) {
      case 'battle':
        detailsHTML += `
          <p><strong>Type:</strong> Battle</p>
          <p><strong>Location:</strong> (${data.location.x}, ${data.location.y})</p>
          <p><strong>Attacker:</strong> ${data.attacker}</p>
          <p><strong>Defender:</strong> ${data.defender}</p>
        `;
        break;
      case 'settlement':
        detailsHTML += `
          <p><strong>Type:</strong> Settlement Founded</p>
          <p><strong>Civilization:</strong> ${data.civ}</p>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Location:</strong> (${data.location.x}, ${data.location.y})</p>
        `;
        break;
      case 'tech':
        detailsHTML += `
          <p><strong>Type:</strong> Technology Discovered</p>
          <p><strong>Civilization:</strong> ${data.civ}</p>
          <p><strong>Technology:</strong> ${data.technology}</p>
        `;
        break;
      case 'diplomacy':
        detailsHTML += `
          <p><strong>Type:</strong> Diplomatic Change</p>
          <p><strong>Parties:</strong> ${data.civ1} and ${data.civ2}</p>
          <p><strong>Previous Status:</strong> ${data.oldStatus}</p>
          <p><strong>New Status:</strong> ${data.newStatus}</p>
        `;
        break;
    }
    
    detailsHTML += `</div>`;
    
    // Add to metrics tab
    const metricsTab = document.getElementById('metrics-tab');
    if (metricsTab) {
      metricsTab.innerHTML = detailsHTML;
      this._switchTab('metrics-tab');
    }
  }
  
  // Center the map
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
  
  // Render a fallback map if real map data is unavailable
  _renderFallbackMap(gameState) {
    console.log("Rendering fallback map");
    
    // Default map size
    const width = 16;
    const height = 16;
    
    // Set up grid
    this.mapGrid.style.gridTemplateColumns = `repeat(${width}, 64px)`;
    this.mapGrid.style.gridTemplateRows = `repeat(${height}, 64px)`;
    
    // Clear existing tiles
    this.mapGrid.innerHTML = '';
    
    // Define terrain types
    const terrainTypes = ['plains', 'hills', 'mountains', 'water', 'forest'];
    
    // Create tiles
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = document.createElement('div');
        tile.className = 'map-tile';
        tile.dataset.x = x;
        tile.dataset.y = y;
        
        // Assign random terrain type
        const terrainIndex = Math.floor(Math.random() * terrainTypes.length);
        tile.classList.add(`tile-${terrainTypes[terrainIndex]}`);
        
        // Add resource indicator randomly
        if (Math.random() < 0.2) {
          const resourceIndicator = document.createElement('div');
          resourceIndicator.className = 'resource-indicator';
          resourceIndicator.title = 'Unknown Resource';
          tile.appendChild(resourceIndicator);
        }
        
        // Add settlement indicator for civilizations (place them evenly)
        if (gameState && gameState.civilizations && gameState.civilizations.length > 0) {
          // Create a simple placement algorithm - each civ gets one guaranteed settlement
          const totalCivs = gameState.civilizations.length;
          const civIndex = (y * width + x) % totalCivs;
          
          // Place capitals in different quadrants
          if (
            (civIndex === 0 && x < width/2 && y < height/2) || // Top left
            (civIndex === 1 && x >= width/2 && y < height/2) || // Top right
            (civIndex === 2 && x < width/2 && y >= height/2) || // Bottom left
            (civIndex === 3 && x >= width/2 && y >= height/2)   // Bottom right
          ) {
            const settlementIndicator = document.createElement('div');
            settlementIndicator.className = 'settlement-indicator';
            settlementIndicator.style.backgroundColor = gameState.civilizations[civIndex].color || 'white';
            tile.appendChild(settlementIndicator);
          }
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
    
    // Set up agent visualizations if enabled
    if (this.showAgentAvatars && gameState && gameState.civilizations) {
      this._setupAgentVisualizations(gameState.civilizations);
    }
  }
  
  // Get game metrics from the main process
  _updateMetricsOmniscient() {
    window.MachinaPrincipis.getMachiavellianMetrics().then(metrics => {
      if (!metrics) return;
      
      let metricsHTML = `
        <div class="panel-section">
          <div class="panel-title">Machiavellian Metrics</div>
          
          <h3>Deception Index</h3>
          <ul>
      `;
      
      // Add deception metrics for each civilization
      window.MachinaPrincipis.getGameState().then(gameState => {
        for (const civId in metrics.deceptionIndex) {
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
      });
    });
  }
  
  // Update metrics in diplomat mode
  _updateMetricsDiplomat() {
    // In diplomat mode, only show public information
    window.MachinaPrincipis.getPublicCommunications(10).then(communications => {
      let metricsHTML = `
        <div class="panel-section">
          <div class="panel-title">Diplomatic Analysis</div>
          
          <h3>Public Communications</h3>
      `;
      
      if (communications.length > 0) {
        metricsHTML += `<ul>`;
        
        window.MachinaPrincipis.getGameState().then(gameState => {
          for (const comm of communications) {
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
          
          // Add diplomatic relations table
          metricsHTML += `
            <h3>Diplomatic Relations</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr>
                  <th style="border: 1px solid #ccc; padding: 5px;"></th>
          `;
          
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
                window.MachinaPrincipis.getCivilizationData(rowCiv.id).then(civData => {
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
                });
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
        });
      } else {
        metricsHTML += `<p>No public communications recorded</p>`;
        metricsHTML += `</div>`;
        document.getElementById('metrics-tab').innerHTML = metricsHTML;
      }
    });
  }
  
  // Update metrics in historian mode
  _updateMetricsHistorian() {
    window.MachinaPrincipis.getHistoricalEvents(15).then(events => {
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
      window.MachinaPrincipis.getGameState().then(gameState => {
        // For each civilization, get its data
        const civPromises = gameState.civilizations.map(civ => {
          return window.MachinaPrincipis.getCivilizationData(civ.id).then(civData => {
            return {
              civ,
              data: civData,
              score: civData.calculateScore ? civData.calculateScore() : 0
            };
          });
        });
        
        // Wait for all civilization data to be fetched
        Promise.all(civPromises).then(civs => {
          // Sort by score
          civs.sort((a, b) => b.score - a.score);
          
          // Add rows for each civilization
          civs.forEach((civInfo, index) => {
            const civ = civInfo.civ;
            const civData = civInfo.data;
            
            metricsHTML += `
              <tr>
                <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid #ccc; padding: 5px; color: ${civ.color}">${civ.name}</td>
                <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">
                  ${civInfo.score}
                </td>
                <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">
                  ${civData.settlements.length}
                </td>
                <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">
                  ${civData.technologies.length}
                </td>
              </tr>
            `;
          });
          
          metricsHTML += `
              </tbody>
            </table>
            
            <h3>Key Historical Events</h3>
          `;
          
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
          
          // Count technologies across civilizations
          const techCounts = {};
          
          civs.forEach(civInfo => {
            const civData = civInfo.data;
            
            for (const tech of civData.technologies) {
              techCounts[tech] = (techCounts[tech] || 0) + 1;
            }
          });
          
          // Sort technologies by count
          const sortedTechs = Object.entries(techCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Top 5
          
          metricsHTML += `
            <h3>Technology Trends</h3>
            <p>Most researched technologies:</p>
            <ul>
          `;
          
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
        });
      });
    });
  }
  
  // Show game end screen
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
    
    // Get game state for civilization data
    window.MachinaPrincipis.getGameState().then(gameState => {
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
        window.MachinaPrincipis.exportData();
      });
      
      document.getElementById('restart-btn').addEventListener('click', () => {
        // Show config form again
        this.container.style.display = 'none';
        configContainer.style.display = 'block';
        
        // Remove overlay
        overlay.remove();
      });
    });
  }
}

// Wait for DOM content to load
document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  configContainer = document.getElementById('config-container');
  configForm = document.getElementById('config-form');
  simulationContainer = document.getElementById('simulation-container');
  loadingOverlay = document.getElementById('loading-overlay');
  loadingMessage = document.getElementById('loading-message');
  apiKeyWarning = document.getElementById('api-key-warning');
  darkModeCheckbox = document.getElementById('darkMode');
  presetButtons = document.querySelectorAll('.preset-btn');
  
  // Presets
  const presets = {
    default: {
      mapWidth: 16,
      mapHeight: 16,
      numCivilizations: 4,
      maxTurns: 100,
      turnDelay: 2000,
      resourceDistribution: 'balanced',
      autoPlay: true,
      revealMap: false,
      llmProvider: 'local',
      llmTemperature: 0.7,
      observationMode: 'omniscient'
    },
    small: {
      mapWidth: 12,
      mapHeight: 12,
      numCivilizations: 3,
      maxTurns: 50,
      turnDelay: 1500,
      resourceDistribution: 'balanced',
      autoPlay: true,
      revealMap: false
    },
    complex: {
      mapWidth: 24,
      mapHeight: 24,
      numCivilizations: 6,
      maxTurns: 200,
      turnDelay: 2500,
      resourceDistribution: 'clustered',
      autoPlay: true,
      revealMap: false
    },
    'resource-scarce': {
      mapWidth: 16,
      mapHeight: 16,
      numCivilizations: 4,
      maxTurns: 100,
      turnDelay: 2000,
      resourceDistribution: 'scarce',
      autoPlay: true,
      revealMap: false
    }
  };
  
  // Apply preset
  function applyPreset(presetName) {
    const preset = presets[presetName];
    if (!preset) return;
    
    // Update form values
    for (const [key, value] of Object.entries(preset)) {
      const element = document.getElementById(key);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = value;
        } else {
          element.value = value;
        }
      }
    }
  }
  
  // Preset button click handlers
  presetButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Update active class
      presetButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Apply preset
      applyPreset(this.dataset.preset);
    });
  });
  
  // Dark mode toggle
  darkModeCheckbox.addEventListener('change', function() {
    if (this.checked) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    
    // Save to settings
    window.ElectronUtils.settings.set('darkMode', this.checked);
  });
  
  // API key validation
  const llmProviderSelect = document.getElementById('llmProvider');
  const useLlmStubCheckbox = document.getElementById('useLlmStub');
  const llmApiKeyInput = document.getElementById('llmApiKey');
  
  function checkApiKeyWarning() {
    const provider = llmProviderSelect.value;
    const useStub = useLlmStubCheckbox.checked;
    
    if (!useStub && provider !== 'local' && !llmApiKeyInput.value) {
      apiKeyWarning.style.display = 'block';
    } else {
      apiKeyWarning.style.display = 'none';
    }
  }
  
  llmProviderSelect.addEventListener('change', checkApiKeyWarning);
  useLlmStubCheckbox.addEventListener('change', checkApiKeyWarning);
  llmApiKeyInput.addEventListener('input', checkApiKeyWarning);
  
  // When stub mode is checked, disable API key field
  useLlmStubCheckbox.addEventListener('change', function() {
    llmApiKeyInput.disabled = this.checked;
  });
  
  // Reset form
  const resetButton = document.getElementById('reset-btn');
  resetButton.addEventListener('click', function() {
    configForm.reset();
    applyPreset('default');
    checkApiKeyWarning();
  });
  
  // Start simulation
  configForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    // Check API key
    checkApiKeyWarning();
    if (apiKeyWarning.style.display === 'block') {
      llmApiKeyInput.focus();
      return;
    }
    
    // Get form data
    const formData = new FormData(configForm);
    const config = {};
    
    // Convert form data to config object
    for (const [key, value] of formData.entries()) {
      if (key === 'autoPlay' || key === 'revealMap' || key === 'useLlmStub' || key === 'debug' || key === 'darkMode' || key === 'showAgentAvatars' || key === 'showTimeline') {
        config[key] = true; // Checkbox is checked if it's in formData
      } else if (key === 'mapWidth' || key === 'mapHeight' || key === 'numCivilizations' || key === 'maxTurns' || key === 'turnDelay') {
        config[key] = parseInt(value);
      } else if (key === 'llmTemperature') {
        config[key] = parseFloat(value);
      } else {
        config[key] = value;
      }
    }
    
    // Convert mapWidth/mapHeight to mapSize object
    config.mapSize = { width: config.mapWidth, height: config.mapHeight };
    delete config.mapWidth;
    delete config.mapHeight;
    
    // Set output directory
    config.outputDir = './output';
    
    // Set random seed if not provided
    if (!config.randomSeed) {
      config.randomSeed = Date.now();
    }
    
    // Add default dark mode from settings if not set
    if (config.darkMode === undefined) {
      config.darkMode = window.ElectronUtils.settings.get('darkMode') || false;
    }
    
    // Show loading screen
    loadingOverlay.style.display = 'flex';
    loadingMessage.textContent = 'Initializing simulation...';
    
    try {
      // Wait a moment to allow the UI to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Initialize the game in the main process
      const initialized = await window.MachinaPrincipis.initialize(config);
      
      if (!initialized) {
        throw new Error('Failed to initialize simulation');
      }
      
      loadingMessage.textContent = 'Setting up UI...';
      
      // Initialize UI
      simulationUI = new ElectronSimulationUI({
        containerId: 'simulation-container',
        darkMode: config.darkMode,
        showAgentAvatars: config.showAgentAvatars,
        showTimeline: config.showTimeline,
        observationMode: config.observationMode
      });
      
      simulationUI.initialize();
      
      loadingMessage.textContent = 'Starting simulation...';
      
      // Start the game
      const started = await window.MachinaPrincipis.start();
      
      if (!started) {
        throw new Error('Failed to start simulation');
      }
      
      // Hide config, show simulation
      configContainer.style.display = 'none';
      simulationContainer.style.display = 'block';
      loadingOverlay.style.display = 'none';
      
      // Set game running state
      isGameRunning = true;
    } catch (error) {
      console.error('Simulation error:', error);
      loadingMessage.textContent = `Error: ${error.message}`;
      
      // Add a retry button
      const retryButton = document.createElement('button');
      retryButton.textContent = 'Retry';
      retryButton.className = 'config-btn primary-btn';
      retryButton.style.marginTop = '20px';
      retryButton.addEventListener('click', function() {
        loadingOverlay.style.display = 'none';
        
        // Remove the retry button
        this.remove();
      });
      
      loadingOverlay.appendChild(retryButton);
    }
  });
  
  // Load saved settings
  const savedDarkMode = window.ElectronUtils.settings.get('darkMode');
  if (savedDarkMode) {
    darkModeCheckbox.checked = true;
    document.body.classList.add('dark-mode');
  }
  
  // Log initialization
  console.log('Electron renderer script initialized');
});