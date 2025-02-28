// Fix for script loading issues
const SystemPrompts = window.SystemPrompts || {};
const PromptTemplates = window.PromptTemplates || {};
const GameMap = window.GameMap || {};
const GameCoordinator = window.GameCoordinator || {};
const SimulationUI = window.SimulationUI || {};
const EnhancedLLMClient = window.EnhancedLLMClient || {};

// Original file content follows
// Machiavellian AI Civilization Framework - Main Application
// This is the entry point that sets up and runs the simulation

// Only use require in Node.js environment to prevent browser errors
if (typeof require !== 'undefined') {
  // Node.js environment
  try {
    const gameCoordinator = require('./game-coordinator');
    var GameCoordinator = gameCoordinator.GameCoordinator || gameCoordinator;
    
    const llmIntegration = require('./llm-integration');
    var EnhancedLLMClient = llmIntegration.EnhancedLLMClient || llmIntegration;
    
    // Node-specific imports
    var dotenv = require('dotenv');
    var SimulationUI = require('./simulation-ui');
    
    // Configure environment variables
    if (dotenv) dotenv.config();
  } catch (e) {
    console.error('Error importing Node.js dependencies:', e);
  }
}
// Browser environment - no declarations needed as we'll use window.X directly

// Load environment variables in Node.js only
if (typeof require !== 'undefined' && dotenv) {
  dotenv.config();
}

class MachinaPrincipis {
  constructor(config = {}) {
    this.config = this._mergeDefaults(config);
    this.gameCoordinator = null;
    this.ui = null;
    this.llmClient = null;
  }
  
  _mergeDefaults(config) {
    return {
      // Game settings
      mapSize: config.mapSize || { width: 16, height: 16 },
      numCivilizations: config.numCivilizations || 4,
      maxTurns: config.maxTurns || 100,
      turnDelay: config.turnDelay || 2000,
      autoPlay: config.autoPlay !== undefined ? config.autoPlay : true,
      startingTech: config.startingTech || ["pottery"],
      resourceDistribution: config.resourceDistribution || "balanced",
      revealMap: config.revealMap !== undefined ? config.revealMap : false,
      observationMode: config.observationMode || "omniscient",
      
      // LLM settings
      llmProvider: config.llmProvider || "claude",
      llmModel: config.llmModel || null, // Will use default for provider if null
      llmApiKey: config.llmApiKey || null, // Will use environment variable if null
      llmTemperature: config.llmTemperature || 0.7,
      llmMaxTokens: config.llmMaxTokens || 4000,
      useLlmStub: config.useLlmStub !== undefined ? config.useLlmStub : false,
      
      // UI settings
      containerId: config.containerId || 'simulation-container',
      darkMode: config.darkMode !== undefined ? config.darkMode : false,
      
      // Debug settings
      debug: config.debug !== undefined ? config.debug : false,
      saveResponses: config.saveResponses !== undefined ? config.saveResponses : false,
      randomSeed: config.randomSeed || Date.now()
    };
  }
  
  async initialize() {
    console.log("Initializing Machiavellian AI Civilization Framework...");
    
    try {
      // 1. Initialize LLM client
      console.log(`Setting up LLM client (${this.config.llmProvider})...`);
      this.llmClient = new window.EnhancedLLMClient({
        provider: this.config.llmProvider,
        model: this.config.llmModel,
        apiKey: this.config.llmApiKey,
        temperature: this.config.llmTemperature,
        maxTokens: this.config.llmMaxTokens,
        debugMode: this.config.debug
      });
      
      if (this.config.useLlmStub) {
        console.warn("Using LLM stub mode - AI agents will use predefined responses");
        this.llmClient.provider = 'local';
      }
      
      await this.llmClient.initialize();
      
      // 2. Initialize game coordinator
      console.log("Setting up game coordinator...");
      this.gameCoordinator = new window.GameCoordinator({
        mapSize: this.config.mapSize,
        numCivilizations: this.config.numCivilizations,
        maxTurns: this.config.maxTurns,
        turnDelay: this.config.turnDelay,
        debug: this.config.debug,
        autoPlay: this.config.autoPlay,
        llmClient: this.llmClient,
        randomSeed: this.config.randomSeed,
        resourceDistribution: this.config.resourceDistribution,
        startingTech: this.config.startingTech,
        revealMap: this.config.revealMap,
        observationMode: this.config.observationMode
      });
      
      const gameInitialized = await this.gameCoordinator.initialize();
      if (!gameInitialized) {
        throw new Error("Failed to initialize game coordinator");
      }
      
      // 3. Initialize UI if running in browser
      if (typeof window !== 'undefined') {
        console.log("Setting up user interface...");
        this.ui = new window.SimulationUI(this.gameCoordinator, {
          containerId: this.config.containerId,
          darkMode: this.config.darkMode,
          showFPS: this.config.debug
        });
        
        const uiInitialized = this.ui.initialize();
        if (!uiInitialized) {
          throw new Error("Failed to initialize user interface");
        }
      }
      
      console.log("Machiavellian AI Civilization Framework initialized successfully!");
      return true;
    } catch (error) {
      console.error("Initialization failed:", error);
      return false;
    }
  }
  
  async start() {
    if (!this.gameCoordinator) {
      throw new Error("Framework not initialized. Call initialize() first.");
    }
    
    console.log("Starting simulation...");
    
    try {
      // Start the game
      const started = await this.gameCoordinator.start();
      
      if (!started) {
        throw new Error("Failed to start game coordinator");
      }
      
      console.log("Simulation started successfully!");
      return true;
    } catch (error) {
      console.error("Failed to start simulation:", error);
      return false;
    }
  }
  
  stop() {
    if (!this.gameCoordinator) {
      throw new Error("Framework not initialized. Call initialize() first.");
    }
    
    console.log("Stopping simulation...");
    return this.gameCoordinator.stop();
  }
  
  pause() {
    if (!this.gameCoordinator) {
      throw new Error("Framework not initialized. Call initialize() first.");
    }
    
    console.log("Pausing simulation...");
    return this.gameCoordinator.pause();
  }
  
  resume() {
    if (!this.gameCoordinator) {
      throw new Error("Framework not initialized. Call initialize() first.");
    }
    
    console.log("Resuming simulation...");
    return this.gameCoordinator.resume();
  }
  
  exportResults(filename) {
    if (!this.gameCoordinator) {
      throw new Error("Framework not initialized. Call initialize() first.");
    }
    
    console.log("Exporting simulation results...");
    const researchData = this.gameCoordinator.exportResearchData();
    
    // In browser
    if (typeof window !== 'undefined') {
      const jsonData = JSON.stringify(researchData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `machiavellian-simulation-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      return true;
    } 
    // In Node.js
    else if (typeof require !== 'undefined') {
      const fs = require('fs');
      const path = require('path');
      
      const finalFilename = filename || `machiavellian-simulation-${Date.now()}.json`;
      fs.writeFileSync(
        path.resolve(process.cwd(), finalFilename),
        JSON.stringify(researchData, null, 2)
      );
      
      console.log(`Results exported to ${finalFilename}`);
      return true;
    }
    
    return false;
  }
}

// Always export to window in browser environment
if (typeof window !== 'undefined') {
  window.MachinaPrincipis = MachinaPrincipis;
  console.log("MachinaPrincipis class exported to window object");
}

// Node.js export
if (typeof module !== 'undefined') {
  module.exports = MachinaPrincipis;
}

// Auto-run if this is the main script (for CLI usage)
if (typeof require !== 'undefined' && require.main === module) {
  (async () => {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg.startsWith('--')) {
        const [key, value] = arg.slice(2).split('=');
        
        // Parse value appropriately
        if (value === 'true') options[key] = true;
        else if (value === 'false') options[key] = false;
        else if (!isNaN(Number(value))) options[key] = Number(value);
        else options[key] = value;
      }
    }
    
    // Create and run framework
    const framework = new MachinaPrincipis(options);
    const initialized = await framework.initialize();
    
    if (initialized) {
      await framework.start();
      
      // In CLI mode, listen for exit signal
      process.on('SIGINT', () => {
        console.log("
Received exit signal. Stopping simulation...");
        framework.stop();
        framework.exportResults();
        process.exit(0);
      });
    } else {
      console.error("Failed to initialize framework");
      process.exit(1);
    }
  })();
}
