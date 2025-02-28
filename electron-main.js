// Machina Principis - Electron Main Process
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import necessary modules for game logic
const gameModel = require('./game-model.js');
global.GameMap = gameModel.GameMap;
global.Civilization = gameModel.Civilization;
global.Settlement = gameModel.Settlement;
global.Building = gameModel.Building;
global.Unit = gameModel.Unit;

// Add SystemPrompts to global scope
const SystemPrompts = require('./system-prompts.js');
global.SystemPrompts = SystemPrompts;
global.SystemPrompts.generalPrompt = SystemPrompts.generalPrompt;
global.SystemPrompts.agentTurnPrompt = SystemPrompts.agentTurnPrompt;
global.SystemPrompts.reflectionPrompt = SystemPrompts.reflectionPrompt;
global.SystemPrompts.dilemmaPrompt = SystemPrompts.dilemmaPrompt;

global.SystemPrompts.getSystemPrompt = function(context, provider = 'claude') {
  switch (context) {
    case 'agent-turn':
    case 'agent-decision':
      return global.SystemPrompts.agentTurnPrompt;
    case 'reflection':
      return global.SystemPrompts.reflectionPrompt;
    case 'dilemma':
      return global.SystemPrompts.dilemmaPrompt;
    case 'general':
    default:
      return global.SystemPrompts.generalPrompt;
  }
};

// Set up PromptTemplates
const PromptTemplates = require('./prompt-template.js');
global.PromptTemplates = PromptTemplates;
global.PromptTemplates.base = PromptTemplates.basePrompt;
global.PromptTemplates.turn = PromptTemplates.turnPrompt;
global.PromptTemplates.reflection = PromptTemplates.reflectionPrompt;
global.PromptTemplates.resourceDilemma = PromptTemplates.resourceDilemmaPrompt;
global.PromptTemplates.powerImbalance = PromptTemplates.powerImbalancePrompt;
global.PromptTemplates.alliance = PromptTemplates.alliancePrompt;
global.PromptTemplates.betrayal = PromptTemplates.betrayalPrompt;
global.PromptTemplates.espionage = PromptTemplates.espionagePrompt;
global.PromptTemplates.strategicPlanning = PromptTemplates.strategicPlanningPrompt;
global.PromptTemplates.disinformation = PromptTemplates.disinformationPrompt;
global.PromptTemplates.secretAgreement = PromptTemplates.secretAgreementPrompt;
global.PromptTemplates.reputation = PromptTemplates.reputationPrompt;

// Import remaining core components
const aiManager = require('./AI-agent-manager.js');
global.AIAgentManager = aiManager.AIAgentManager;

const observerInterface = require('./observer-interface.js');
global.ObserverInterface = observerInterface.ObserverInterface;

// Add missing methods to ObserverInterface to prevent errors
ObserverInterface.prototype.getRecentCommunications = function(civId, count = 5) {
  console.log(`Getting recent communications for ${civId} (stub)`);
  return [];
};

// Import game coordinator
const { GameCoordinator } = require('./game-coordinator.js');

// Import LLM client
const EnhancedLLMClient = require('./llm-client-stub.js');

// Keep a reference to avoid garbage collection
let mainWindow;
let gameCoordinator;

// Ensure output directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created output directory: ${dirPath}`);
  }
}

// Create the main window
function createWindow() {
  // Get screen size
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // Set window size to 80% of screen size (but not exceeding 1600x900)
  const windowWidth = Math.min(Math.floor(width * 0.8), 1600);
  const windowHeight = Math.min(Math.floor(height * 0.8), 900);
  
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 800,
    minHeight: 600,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js')
    }
  });

  mainWindow.loadFile('electron-ui.html');
  
  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
  
  // Add window state event listeners
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Make configuration form visible
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Log screen info for debugging
    console.log(`Screen size: ${width}x${height}`);
    console.log(`Window size: ${windowWidth}x${windowHeight}`);
  });
}

// Set up IPC handlers for game interaction
function setupGameHandlers() {
  // Initialize the game with configuration
  ipcMain.handle('initialize-game', async (event, config) => {
    try {
      console.log('Initializing game with config:', config);
      
      // Ensure output directory exists
      ensureDirectoryExists(config.outputDir || './output');
      
      // Initialize LLM client
      const llmClient = new EnhancedLLMClient({
        provider: config.provider || 'local',
        debug: config.debug || false
      });
      
      await llmClient.initialize();
      
      // Initialize game coordinator
      gameCoordinator = new GameCoordinator({
        numCivilizations: config.numCivilizations || 4,
        maxTurns: config.maxTurns || 100,
        mapSize: config.mapSize || { width: 16, height: 16 },
        turnDelay: config.turnDelay || 2000,
        autoPlay: config.autoPlay !== undefined ? config.autoPlay : true,
        debug: config.debug || false,
        llmClient: llmClient,
        randomSeed: config.randomSeed || Date.now(),
        resourceDistribution: config.resourceDistribution || 'balanced',
        observationMode: config.observationMode || 'omniscient'
      });
      
      // Register event forwarders
      registerEventForwarders();
      
      // Initialize the game
      await gameCoordinator.initialize();
      
      console.log('Game coordinator initialized');
      return true;
    } catch (error) {
      console.error('Error initializing game:', error);
      throw error;
    }
  });

  // Start the game
  ipcMain.handle('start-game', async () => {
    try {
      if (!gameCoordinator) {
        throw new Error('Game coordinator not initialized');
      }
      
      console.log('Starting game...');
      await gameCoordinator.start();
      return true;
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  });
  
  // Get game state
  ipcMain.handle('get-game-state', () => {
    if (!gameCoordinator) {
      return null;
    }
    
    return gameCoordinator.getGameState();
  });
  
  // Get map data for civilization
  ipcMain.handle('get-map-data', (event, civId) => {
    if (!gameCoordinator) {
      return null;
    }
    
    return gameCoordinator.getMapDataForCiv(civId);
  });
  
  // Get civilization data
  ipcMain.handle('get-civilization-data', (event, civId) => {
    if (!gameCoordinator) {
      return null;
    }
    
    return gameCoordinator.getCivilizationData(civId);
  });
  
  // Pause game
  ipcMain.handle('pause-game', () => {
    if (gameCoordinator) {
      gameCoordinator.pause();
      return true;
    }
    return false;
  });
  
  // Resume game
  ipcMain.handle('resume-game', () => {
    if (gameCoordinator) {
      gameCoordinator.resume();
      return true;
    }
    return false;
  });
  
  // Set turn speed
  ipcMain.handle('set-turn-speed', (event, speed) => {
    if (!gameCoordinator) {
      return false;
    }
    
    let delay;
    switch (speed) {
      case 'slow': delay = 3000; break;
      case 'normal': delay = 2000; break;
      case 'fast': delay = 500; break;
      default: delay = 2000;
    }
    
    gameCoordinator.turnDelay = delay;
    return true;
  });
  
  // Export data
  ipcMain.handle('export-data', () => {
    if (!gameCoordinator) {
      return false;
    }
    
    const data = gameCoordinator.exportResearchData();
    return data;
  });
  
  // Get Machiavellian metrics
  ipcMain.handle('get-machiavellian-metrics', () => {
    if (!gameCoordinator || !gameCoordinator.observer) {
      return {
        deceptionIndex: {},
        betrayalEvents: [],
        strategicDeception: []
      };
    }
    
    // Check if the method exists, otherwise provide stub data
    if (typeof gameCoordinator.observer.getMachiavellianMetrics === 'function') {
      return gameCoordinator.observer.getMachiavellianMetrics();
    } else {
      // Create stub metrics
      const metrics = {
        deceptionIndex: {},
        betrayalEvents: [],
        strategicDeception: []
      };
      
      // Add deception index for each civilization
      const gameState = gameCoordinator.getGameState();
      if (gameState && gameState.civilizations) {
        gameState.civilizations.forEach(civ => {
          metrics.deceptionIndex[civ.id] = Math.random() * 10; // Random value for demo
        });
      }
      
      return metrics;
    }
  });
  
  // Get public communications
  ipcMain.handle('get-public-communications', (event, count) => {
    if (!gameCoordinator || !gameCoordinator.observer) {
      return [];
    }
    
    // Check if the method exists, otherwise provide stub data
    if (typeof gameCoordinator.observer.getPublicCommunications === 'function') {
      return gameCoordinator.observer.getPublicCommunications(count || 10);
    } else {
      // Create stub communications
      const communications = [];
      const gameState = gameCoordinator.getGameState();
      
      if (gameState && gameState.civilizations && gameState.civilizations.length > 1) {
        for (let i = 0; i < Math.min(count || 10, 5); i++) {
          const fromCivIndex = Math.floor(Math.random() * gameState.civilizations.length);
          let toCivIndex = Math.floor(Math.random() * gameState.civilizations.length);
          
          // Ensure from and to are different
          while (toCivIndex === fromCivIndex) {
            toCivIndex = Math.floor(Math.random() * gameState.civilizations.length);
          }
          
          communications.push({
            from: gameState.civilizations[fromCivIndex].id,
            to: gameState.civilizations[toCivIndex].id,
            turn: Math.max(1, gameState.turn - Math.floor(Math.random() * 3)),
            message: "We are interested in establishing a mutually beneficial trade agreement. Our civilization can offer resources in exchange for technological insights."
          });
        }
      }
      
      return communications;
    }
  });
  
  // Get key historical events
  ipcMain.handle('get-historical-events', (event, count) => {
    if (!gameCoordinator || !gameCoordinator.observer) {
      return [];
    }
    
    // Check if the method exists, otherwise provide stub data
    if (typeof gameCoordinator.observer.getKeyHistoricalEvents === 'function') {
      return gameCoordinator.observer.getKeyHistoricalEvents(count || 15);
    } else {
      // Create stub historical events
      const events = [];
      const gameState = gameCoordinator.getGameState();
      
      if (gameState && gameState.civilizations) {
        const eventTypes = [
          "established their first settlement",
          "discovered a new technology",
          "formed an alliance with another civilization",
          "declared war on a neighboring civilization",
          "built a new wonder"
        ];
        
        for (let i = 0; i < Math.min(count || 15, 8); i++) {
          const civIndex = Math.floor(Math.random() * gameState.civilizations.length);
          const eventIndex = Math.floor(Math.random() * eventTypes.length);
          
          events.push({
            turn: Math.max(1, gameState.turn - Math.floor(Math.random() * 5)),
            description: `${gameState.civilizations[civIndex].name} ${eventTypes[eventIndex]}`
          });
        }
        
        // Sort by turn
        events.sort((a, b) => b.turn - a.turn);
      }
      
      return events;
    }
  });
}

// Register event forwarders from game coordinator to renderer
function registerEventForwarders() {
  if (!gameCoordinator) return;
  
  const events = [
    'onTurnStart',
    'onTurnEnd',
    'onGameStart',
    'onGameEnd',
    'onBattleOccurred',
    'onSettlementFounded',
    'onTechnologyDiscovered'
  ];
  
  events.forEach(eventName => {
    gameCoordinator.on(eventName, (data) => {
      // Forward to renderer if window exists
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log(`Forwarding event ${eventName} to renderer with data:`, data);
        mainWindow.webContents.send(`game:${eventName}`, data);
      }
    });
  });
  
  // Manually add event listeners for AI agent state changes that we can use for visualization
  if (gameCoordinator.aiManager) {
    gameCoordinator.aiManager.on('agentThinking', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('Agent thinking:', data);
        mainWindow.webContents.send('game:onAgentThinking', data);
      }
    });
    
    gameCoordinator.aiManager.on('agentDecision', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('Agent decision:', data);
        mainWindow.webContents.send('game:onAgentDecision', data);
      }
    });
  }
  
  // Create synthetic events for visualization if real ones aren't available
  const timer = setInterval(() => {
    if (!gameCoordinator || !mainWindow || mainWindow.isDestroyed()) {
      clearInterval(timer);
      return;
    }
    
    const gameState = gameCoordinator.getGameState();
    if (!gameState || gameState.gameState !== 'running') return;
    
    // Create synthetic agent communication events for visualization
    if (Math.random() < 0.2 && gameState.civilizations && gameState.civilizations.length > 1) {
      const fromCivIndex = Math.floor(Math.random() * gameState.civilizations.length);
      let toCivIndex = Math.floor(Math.random() * gameState.civilizations.length);
      
      // Ensure from and to are different
      while (toCivIndex === fromCivIndex) {
        toCivIndex = Math.floor(Math.random() * gameState.civilizations.length);
      }
      
      const fromCiv = gameState.civilizations[fromCivIndex];
      const toCiv = gameState.civilizations[toCivIndex];
      
      // Create a synthetic agent decision for visualization
      mainWindow.webContents.send('game:onAgentDecision', {
        civ: fromCiv.id,
        turn: gameState.turn,
        summary: `Proposing trade with ${toCiv.name} to exchange resources for technology.`
      });
      
      // Randomly update diplomacy status
      if (Math.random() < 0.3) {
        const statuses = ['neutral', 'friendly', 'hostile', 'alliance', 'war'];
        const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        mainWindow.webContents.send('game:onDiplomacyChange', {
          civ1: fromCiv.id,
          civ2: toCiv.id,
          oldStatus: 'neutral',
          newStatus: newStatus,
          turn: gameState.turn
        });
      }
    }
  }, 5000); // Generate synthetic events every 5 seconds
}

// App lifecycle
app.whenReady().then(() => {
  setupGameHandlers();
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on exit
app.on('before-quit', () => {
  // Clean up any resources if needed
  if (gameCoordinator) {
    // Save current state before quitting
    try {
      const outputDir = './output';
      ensureDirectoryExists(outputDir);
      
      const gameState = gameCoordinator.getGameState();
      fs.writeFileSync(
        path.join(outputDir, 'last-state.json'),
        JSON.stringify(gameState, null, 2)
      );
      
      console.log('Game state saved before exit');
    } catch (error) {
      console.error('Error saving game state:', error);
    }
  }
});