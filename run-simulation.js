#!/usr/bin/env node

// Machiavellian AI Civilization Framework - Command Line Runner
// This script provides command line interface for running simulations

const fs = require('fs');
const path = require('path');

// First, make the GameMap available globally since it's required by the coordinator
const gameModel = require('./game-model.js');
global.GameMap = gameModel.GameMap;
global.Civilization = gameModel.Civilization;
global.Settlement = gameModel.Settlement;
global.Building = gameModel.Building;
global.Unit = gameModel.Unit;

// Add SystemPrompts to global scope
const SystemPrompts = require('./system-prompts.js');
global.SystemPrompts = SystemPrompts;

// Define the static prompts directly on global.SystemPrompts
global.SystemPrompts.generalPrompt = SystemPrompts.generalPrompt;
global.SystemPrompts.agentTurnPrompt = SystemPrompts.agentTurnPrompt;
global.SystemPrompts.reflectionPrompt = SystemPrompts.reflectionPrompt;
global.SystemPrompts.dilemmaPrompt = SystemPrompts.dilemmaPrompt;

// Replace the getSystemPrompt method with an implementation that uses these properties
global.SystemPrompts.getSystemPrompt = function(context, provider = 'claude') {
  // Select the appropriate prompt based on context
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

// For PromptTemplates, we need to use the direct file that contains the class
const PromptTemplates = require('./prompt-template.js');
global.PromptTemplates = PromptTemplates;

// Add properties to global.PromptTemplates for the template strings
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

// Also make AIAgentManager and ObserverInterface available globally
const aiManager = require('./AI-agent-manager.js');
global.AIAgentManager = aiManager.AIAgentManager;

const observerInterface = require('./observer-interface.js');
global.ObserverInterface = observerInterface.ObserverInterface;

// Add missing methods to ObserverInterface to prevent errors
ObserverInterface.prototype.getRecentCommunications = function(civId, count = 5) {
  // This is a stub implementation for the missing method
  console.log(`Getting recent communications for ${civId} (stub)`);
  return [];
};

// Import game coordinator (will use globals)
const { GameCoordinator } = require('./game-coordinator.js');

// Import LLM client
const EnhancedLLMClient = require('./llm-client-stub.js');

// Parse command line arguments
const args = process.argv.slice(2);
const options = parseArguments(args);

// Welcome message
console.log('');
console.log('=========================================================');
console.log('=== Machina Principis - Machiavellian AI Civilization ===');
console.log('=========================================================');
console.log('');

// Check if help flag is provided
if (options.help) {
  showHelp();
  process.exit(0);
}

// Run the simulation
runSimulation(options)
  .then(() => {
    console.log('Simulation completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running simulation:', error);
    process.exit(1);
  });

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {Object} Parsed options
 */
function parseArguments(args) {
  const options = {
    numCivilizations: 4,
    maxTurns: 100,
    mapWidth: 16,
    mapHeight: 16,
    autoPlay: true,
    turnDelay: 1000,
    debug: false,
    provider: 'claude',
    outputDir: './output',
    randomSeed: Date.now(),
    help: false
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--numCivilizations' || arg === '--civs') {
      options.numCivilizations = parseInt(args[++i], 10);
    } else if (arg === '--maxTurns') {
      options.maxTurns = parseInt(args[++i], 10);
    } else if (arg === '--mapWidth') {
      options.mapWidth = parseInt(args[++i], 10);
    } else if (arg === '--mapHeight') {
      options.mapHeight = parseInt(args[++i], 10);
    } else if (arg === '--turnDelay') {
      options.turnDelay = parseInt(args[++i], 10);
    } else if (arg === '--provider') {
      options.provider = args[++i];
    } else if (arg === '--outputDir') {
      options.outputDir = args[++i];
    } else if (arg === '--seed') {
      options.randomSeed = parseInt(args[++i], 10);
    } else if (arg === '--debug') {
      options.debug = true;
    } else if (arg === '--noAutoPlay') {
      options.autoPlay = false;
    }
  }

  return options;
}

/**
 * Show help information
 */
function showHelp() {
  console.log('Machiavellian AI Civilization Framework - Command Line Runner');
  console.log('');
  console.log('Usage: node run-simulation.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h               Show this help message');
  console.log('  --numCivilizations, --civs <number>  Number of civilizations (default: 4)');
  console.log('  --maxTurns <number>      Maximum number of turns (default: 100)');
  console.log('  --mapWidth <number>      Width of the map (default: 16)');
  console.log('  --mapHeight <number>     Height of the map (default: 16)');
  console.log('  --turnDelay <number>     Delay between turns in milliseconds (default: 1000)');
  console.log('  --provider <string>      LLM provider: claude, openai, local (default: claude)');
  console.log('  --outputDir <path>       Directory to save output files (default: ./output)');
  console.log('  --seed <number>          Random seed for deterministic results');
  console.log('  --debug                  Enable debug logging');
  console.log('  --noAutoPlay             Disable automatic turn progression');
  console.log('');
  console.log('Example:');
  console.log('  node run-simulation.js --civs 6 --maxTurns 200 --provider claude --debug');
}

/**
 * Run the simulation with provided options
 * @async
 * @param {Object} options - Simulation options
 * @returns {Promise<void>}
 */
async function runSimulation(options) {
  console.log('Initializing simulation with the following configuration:');
  console.log(`- Civilizations: ${options.numCivilizations}`);
  console.log(`- Max turns: ${options.maxTurns}`);
  console.log(`- Map size: ${options.mapWidth}x${options.mapHeight}`);
  console.log(`- LLM provider: ${options.provider}`);
  console.log(`- Random seed: ${options.randomSeed}`);
  console.log('');

  // Ensure output directory exists
  ensureDirectoryExists(options.outputDir);
  
  // Initialize LLM client
  console.log('Initializing LLM client...');
  const llmClient = new EnhancedLLMClient({
    provider: options.provider,
    debug: options.debug
  });
  
  await llmClient.initialize();
  console.log('LLM client initialized');

  // Initialize game coordinator
  console.log('Initializing game coordinator...');
  const gameCoordinator = new GameCoordinator({
    numCivilizations: options.numCivilizations,
    maxTurns: options.maxTurns,
    mapSize: {
      width: options.mapWidth,
      height: options.mapHeight
    },
    turnDelay: options.turnDelay,
    autoPlay: options.autoPlay,
    debug: options.debug,
    llmClient: llmClient,
    randomSeed: options.randomSeed,
    resourceDistribution: 'balanced',
    observationMode: 'omniscient'
  });

  // Register event handlers
  registerEventHandlers(gameCoordinator, options);

  // Initialize the game
  await gameCoordinator.initialize();
  console.log('Game coordinator initialized');

  // Start the game
  console.log('Starting simulation...');
  await gameCoordinator.start();

  // If not auto-playing, we need to wait for manual completion
  if (!options.autoPlay) {
    console.log('Simulation started in manual mode');
    console.log('Press Ctrl+C to exit');
    
    // Set up handlers for manual control
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', key => {
      // Ctrl+C
      if (key.toString() === '\u0003') {
        process.exit(0);
      }
      
      // Space to advance turn
      if (key.toString() === ' ') {
        if (gameCoordinator.gameState === 'paused') {
          gameCoordinator.resume();
        } else {
          gameCoordinator._runTurn();
        }
      }
      
      // 'p' to toggle pause
      if (key.toString() === 'p') {
        if (gameCoordinator.gameState === 'paused') {
          gameCoordinator.resume();
        } else {
          gameCoordinator.pause();
        }
      }
    });
  }
}

/**
 * Register event handlers for the game coordinator
 * @param {GameCoordinator} gameCoordinator - Game coordinator instance
 * @param {Object} options - Simulation options
 */
function registerEventHandlers(gameCoordinator, options) {
  // Turn start
  gameCoordinator.on('onTurnStart', data => {
    console.log(`Turn ${data.turn} started`);
  });

  // Turn end
  gameCoordinator.on('onTurnEnd', data => {
    console.log(`Turn ${data.turn} completed`);
    
    // Save periodic state dumps
    if (data.turn % 10 === 0) {
      saveGameState(gameCoordinator, options, data.turn);
    }
  });

  // Game end
  gameCoordinator.on('onGameEnd', data => {
    console.log('Game ended');
    console.log(`Winner: ${data.winner.name} (${data.winner.id})`);
    
    // Save final state
    saveGameState(gameCoordinator, options, 'final');
    
    // Save research data
    saveResearchData(gameCoordinator, options);
  });

  // Other events if needed
  gameCoordinator.on('onTechnologyDiscovered', data => {
    console.log(`${data.civ} discovered ${data.technology}`);
  });
  
  gameCoordinator.on('onBattleOccurred', data => {
    console.log(`Battle occurred at (${data.location.x}, ${data.location.y})`);
  });
}

/**
 * Save game state to a file
 * @param {GameCoordinator} gameCoordinator - Game coordinator instance
 * @param {Object} options - Simulation options
 * @param {number|string} turn - Turn number or 'final'
 */
function saveGameState(gameCoordinator, options, turn) {
  const filename = `state-turn-${turn}.json`;
  const filepath = path.join(options.outputDir, filename);
  
  const state = gameCoordinator.getGameState();
  
  fs.writeFileSync(filepath, JSON.stringify(state, null, 2));
  console.log(`Game state saved to ${filepath}`);
}

/**
 * Save research data to a file
 * @param {GameCoordinator} gameCoordinator - Game coordinator instance
 * @param {Object} options - Simulation options
 */
function saveResearchData(gameCoordinator, options) {
  const filename = 'research-data.json';
  const filepath = path.join(options.outputDir, filename);
  
  const data = gameCoordinator.exportResearchData();
  
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`Research data saved to ${filepath}`);
}

/**
 * Ensure that a directory exists, create it if it doesn't
 * @param {string} dirPath - Directory path
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created output directory: ${dirPath}`);
  }
}