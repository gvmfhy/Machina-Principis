#!/usr/bin/env node

// A simplified version of the simulation runner with minimal dependencies
console.log('Starting simplified Machina Principis simulation...');

// Explicitly load all required modules in the correct order
const gameModel = require('./game-model.js');
const aiManager = require('./AI-agent-manager.js');
const observerInterface = require('./observer-interface.js');
const EnhancedLLMClient = require('./llm-client-stub.js');
const { GameCoordinator } = require('./game-coordinator.js');

// Configure the simulation
const config = {
  numCivilizations: 3,
  maxTurns: 20,
  mapSize: { width: 12, height: 12 },
  turnDelay: 500,
  autoPlay: true,
  llmProvider: 'local',
  debug: true,
  outputDir: './output'
};

// Make sure output directory exists
const fs = require('fs');
const path = require('path');
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// Print configuration
console.log('Configuration:');
console.log(`- Civilizations: ${config.numCivilizations}`);
console.log(`- Max turns: ${config.maxTurns}`);
console.log(`- Map size: ${config.mapSize.width}x${config.mapSize.height}`);
console.log(`- LLM provider: ${config.llmProvider}`);
console.log('');

// Run the simulation
async function runSimulation() {
  try {
    // Initialize LLM client
    console.log('Initializing LLM client...');
    const llmClient = new EnhancedLLMClient({
      provider: config.llmProvider,
      debug: config.debug
    });
    
    await llmClient.initialize();
    console.log('LLM client initialized');

    // Initialize game coordinator
    console.log('Initializing game coordinator...');
    const coordinator = new GameCoordinator({
      numCivilizations: config.numCivilizations,
      maxTurns: config.maxTurns,
      mapSize: config.mapSize,
      turnDelay: config.turnDelay,
      autoPlay: config.autoPlay,
      debug: config.debug,
      llmClient: llmClient,
    });

    // Register event handlers
    coordinator.on('onTurnStart', data => {
      console.log(`Turn ${data.turn} started`);
    });

    coordinator.on('onTurnEnd', data => {
      console.log(`Turn ${data.turn} completed`);
      
      // Save state every 5 turns
      if (data.turn % 5 === 0 || data.turn === config.maxTurns) {
        const state = coordinator.getGameState();
        fs.writeFileSync(
          path.join(config.outputDir, `state-turn-${data.turn}.json`),
          JSON.stringify(state, null, 2)
        );
        console.log(`Saved game state for turn ${data.turn}`);
      }
    });

    coordinator.on('onGameEnd', data => {
      console.log('Game ended!');
      if (data.winner) {
        console.log(`Winner: ${data.winner.name} (${data.winner.id})`);
      }
      
      // Save research data
      const researchData = coordinator.exportResearchData();
      fs.writeFileSync(
        path.join(config.outputDir, 'research-data.json'),
        JSON.stringify(researchData, null, 2)
      );
      console.log('Research data saved');
      
      process.exit(0);
    });

    // Initialize and start the game
    console.log('Initializing game...');
    await coordinator.initialize();
    console.log('Game initialized');
    
    console.log('Starting game...');
    await coordinator.start();
    console.log('Game started');
  } catch (error) {
    console.error('Error running simulation:', error);
    process.exit(1);
  }
}

// Run the simulation
runSimulation().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});