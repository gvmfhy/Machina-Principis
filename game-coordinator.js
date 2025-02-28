// Machiavellian AI Civilization Framework - Game Coordinator
// This module orchestrates the game flow and coordinates between components

// Handle both browser and Node.js environments
if (typeof require !== 'undefined') {
  // Node.js environment
  const gameModel = require('./game-model.js');
  const GameMap = gameModel.GameMap;
  const Civilization = gameModel.Civilization;
  const Settlement = gameModel.Settlement;
  const Building = gameModel.Building;
  const Unit = gameModel.Unit;
  
  const aiManager = require('./AI-agent-manager.js');
  const AIAgentManager = aiManager.AIAgentManager;
  
  const observerInterface = require('./observer-interface.js');
  const ObserverInterface = observerInterface.ObserverInterface;
} else {
  // Browser environment - access through namespace
  // No need to declare variables, we'll use the namespace directly:
  // window.MachinaPrincipis.GameMap, window.MachinaPrincipis.Civilization, etc.
}

/**
 * Main coordinator for the game simulation
 */
class GameCoordinator {
  /**
   * Create a new game coordinator
   * @param {Object} config - Configuration options
   */
  constructor(config) {
    this.config = config || {};
    this.map = null;
    this.civilizations = [];
    this.turn = 0;
    this.maxTurns = config.maxTurns || 100;
    this.turnDelay = config.turnDelay || 2000;
    this.autoPlay = config.autoPlay !== undefined ? config.autoPlay : true;
    this.debug = config.debug || false;
    this.gameState = 'initializing';
    this.agentManager = null;
    this.observer = null;
    this.llmClient = config.llmClient;
    this.randomSeed = config.randomSeed || Date.now();
    this.resourceDistribution = config.resourceDistribution || 'balanced';
    
    // Initialize event callbacks
    this.callbacks = {
      onTurnStart: [],
      onTurnEnd: [],
      onGameStart: [],
      onGameEnd: [],
      onCivTurn: [],
      onUnitCreated: [],
      onSettlementFounded: [],
      onBattleOccurred: [],
      onTechnologyDiscovered: [],
      onDiplomaticEvent: []
    };
    
    // Initialize game timer
    this.turnTimer = null;
    this.isRunning = false;
    this.isPaused = false;
  }
  
  /**
   * Initialize the game
   * @async
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize() {
    this._log("Initializing game");
    
    try {
      // 1. Generate the map
      this._log("Generating game map");
      this.map = new GameMap({
        width: this.config.mapSize?.width || 16,
        height: this.config.mapSize?.height || 16
      });
      this.map.generate();
      
      // 2. Create civilizations
      this._log("Creating civilizations");
      this._initializeCivilizations();
      
      // 3. Initialize AI agent manager
      this._log("Initializing AI agent manager");
      this.agentManager = new AIAgentManager({
        llmClient: this.llmClient,
        debug: this.debug
      });
      
      await this.agentManager.initialize(this.civilizations);
      
      // 4. Initialize observer interface
      this._log("Initializing observer interface");
      this.observer = new ObserverInterface(this, this.agentManager);
      this.observer.initialize();
      
      // 5. Set initial game state
      this.gameState = 'ready';
      this._log("Game initialized successfully");
      
      return true;
    } catch (error) {
      console.error("Error initializing game:", error);
      return false;
    }
  }
  
  /**
   * Start the game
   * @async
   * @returns {Promise<boolean>} Whether the game started successfully
   */
  async start() {
    if (this.gameState !== 'ready') {
      console.error("Game not ready to start. Current state:", this.gameState);
      return false;
    }
    
    this._log("Starting game");
    this.gameState = 'running';
    this.isRunning = true;
    this.isPaused = false;
    
    // Trigger game start event
    this._triggerEvent('onGameStart', {});
    
    // Start first turn
    await this._runTurn();
    
    return true;
  }
  
  /**
   * Stop the game
   * @returns {boolean} Whether the game was stopped successfully
   */
  stop() {
    if (this.gameState !== 'running' && this.gameState !== 'paused') {
      console.error("Game not running. Current state:", this.gameState);
      return false;
    }
    
    this._log("Stopping game");
    this.gameState = 'stopped';
    this.isRunning = false;
    this.isPaused = false;
    
    // Clear any pending turn timer
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    
    // Trigger game end event
    this._triggerEvent('onGameEnd', {
      winner: this._determineWinner(),
      finalScores: this._calculateFinalScores()
    });
    
    return true;
  }
  
  /**
   * Pause the game
   * @returns {boolean} Whether the game was paused successfully
   */
  pause() {
    if (this.gameState !== 'running') {
      console.error("Game not running. Current state:", this.gameState);
      return false;
    }
    
    this._log("Pausing game");
    this.gameState = 'paused';
    this.isPaused = true;
    
    // Clear any pending turn timer
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    
    return true;
  }
  
  /**
   * Resume the game
   * @async
   * @returns {Promise<boolean>} Whether the game was resumed successfully
   */
  async resume() {
    if (this.gameState !== 'paused') {
      console.error("Game not paused. Current state:", this.gameState);
      return false;
    }
    
    this._log("Resuming game");
    this.gameState = 'running';
    this.isPaused = false;
    
    // Resume from current turn
    await this._runTurn();
    
    return true;
  }
  
  /**
   * Get the current game state
   * @returns {Object} Current game state
   */
  getGameState() {
    return {
      turn: this.turn,
      maxTurns: this.maxTurns,
      civilizations: this.civilizations.map(civ => ({
        id: civ.id,
        name: civ.name,
        color: civ.color,
        resources: {...civ.resources},
        technologies: [...civ.technologies],
        settlements: civ.settlements.length,
        units: civ.units.length,
        currentResearch: civ.currentResearch,
        researchProgress: civ.researchProgress
      })),
      gameState: this.gameState,
      isRunning: this.isRunning,
      isPaused: this.isPaused
    };
  }
  
  /**
   * Get data for a specific civilization
   * @param {string} civId - Civilization ID
   * @returns {Object|null} Civilization data or null if not found
   */
  getCivilizationData(civId) {
    const civ = this.civilizations.find(c => c.id === civId);
    if (!civ) return null;
    
    return {
      id: civ.id,
      name: civ.name,
      color: civ.color,
      resources: {...civ.resources},
      technologies: [...civ.technologies],
      settlements: civ.settlements.map(s => ({
        id: s.id,
        name: s.name,
        location: {...s.location},
        population: s.population,
        buildings: s.buildings.map(b => b.type),
        isCapital: s.isCapital
      })),
      units: civ.units.map(u => ({
        id: u.id,
        type: u.type,
        location: {...u.location},
        strength: u.strength,
        health: u.health,
        movesRemaining: u.movesRemaining
      })),
      currentResearch: civ.currentResearch,
      researchProgress: civ.researchProgress,
      diplomaticRelations: {...civ.diplomaticRelations}
    };
  }
  
  /**
   * Get the map data visible to a civilization
   * @param {string} civId - Civilization ID
   * @returns {Object} Map data visible to the civilization
   */
  getMapDataForCiv(civId) {
    return {
      width: this.map.width,
      height: this.map.height,
      tiles: this.map.getVisibleTilesForCiv(civId)
    };
  }
  
  /**
   * Register an event callback
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function
   * @returns {boolean} Whether registration was successful
   */
  on(eventType, callback) {
    if (!this.callbacks[eventType]) {
      console.error(`Unknown event type: ${eventType}`);
      return false;
    }
    
    this.callbacks[eventType].push(callback);
    return true;
  }
  
  /**
   * Export research data for analysis
   * @returns {Object} Research data
   */
  exportResearchData() {
    return this.observer.exportData();
  }
  
  /**
   * Initialize civilizations
   * @private
   */
  _initializeCivilizations() {
    const numCivs = this.config.numCivilizations || 4;
    const civColors = [
      '#e6194B', '#3cb44b', '#ffe119', '#4363d8', 
      '#f58231', '#911eb4', '#42d4f4', '#f032e6'
    ];
    
    // Get starting locations
    const startingLocations = this.map.getStartingLocations(numCivs);
    
    // Generate civilization names
    const civNames = this._generateCivilizationNames(numCivs);
    
    for (let i = 0; i < numCivs; i++) {
      const id = `civ-${i}`;
      const name = civNames[i];
      const color = civColors[i % civColors.length];
      
      // Initialize civilization
      const civ = new Civilization({
        id,
        name,
        color,
        resources: {
          food: 20,
          production: 15,
          science: 0,
          gold: 50
        }
      });
      
      // Initialize starting technologies
      if (this.config.startingTech && this.config.startingTech.length > 0) {
        for (const tech of this.config.startingTech) {
          civ.technologies.push(tech);
        }
      } else {
        // Default starting tech
        civ.technologies.push('pottery');
      }
      
      // Initialize capital settlement
      const capital = new Settlement({
        name: `${name} Capital`,
        owner: id,
        location: startingLocations[i],
        population: 2,
        isCapital: true,
        defenseStrength: 10,
        culturalInfluence: 2
      });
      
      civ.addSettlement(capital);
      this.map.addSettlement(capital);
      
      // Initialize starting units
      const settler = new Unit({
        type: 'settler',
        owner: id,
        location: {...startingLocations[i]},
        strength: 2,
        movementRange: 2,
        visionRange: 2
      });
      
      const warrior = new Unit({
        type: 'warrior',
        owner: id,
        location: {...startingLocations[i]},
        strength: 5,
        movementRange: 2,
        visionRange: 2
      });
      
      civ.addUnit(settler);
      civ.addUnit(warrior);
      
      // Reveal initial map area for this civilization
      this.map.revealAroundLocation(startingLocations[i], 3, id);
      
      // Add civilization to collection
      this.civilizations.push(civ);
    }
  }
  
  /**
   * Generate civilization names
   * @private
   * @param {number} count - Number of names to generate
   * @returns {string[]} Generated names
   */
  _generateCivilizationNames(count) {
    const predefinedNames = [
      'Athenia', 'Romulus', 'Carthage', 'Persepolis', 
      'Babylon', 'Alexandria', 'Byzantium', 'Rhodes',
      'Sparta', 'Thebes', 'Memphis', 'Nineveh', 
      'Tyre', 'Ur', 'Mycenae', 'Knossos'
    ];
    
    // Return random unique names
    const shuffled = [...predefinedNames].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
  
  /**
   * Run a game turn
   * @private
   * @async
   * @returns {Promise<void>}
   */
  async _runTurn() {
    if (!this.isRunning || this.isPaused) {
      return;
    }
    
    this.turn++;
    this._log(`Starting turn ${this.turn}`);
    
    // Trigger turn start event
    this._triggerEvent('onTurnStart', { turn: this.turn });
    
    try {
      // Process turn for each civilization
      for (const civ of this.civilizations) {
        await this._processCivilizationTurn(civ);
      }
      
      // End of turn processing
      this._endOfTurnProcessing();
      
      // Trigger turn end event
      this._triggerEvent('onTurnEnd', { turn: this.turn });
      
      // Check if game should end
      if (this.turn >= this.maxTurns) {
        this._log("Maximum turns reached. Ending game.");
        this.stop();
        return;
      }
      
      // Schedule next turn if autoplay is enabled
      if (this.autoPlay) {
        this.turnTimer = setTimeout(() => {
          this._runTurn();
        }, this.turnDelay);
      }
    } catch (error) {
      console.error("Error processing turn:", error);
      this.stop();
    }
  }
  
  /**
   * Process a turn for a specific civilization
   * @private
   * @async
   * @param {Civilization} civ - The civilization
   * @returns {Promise<void>}
   */
  async _processCivilizationTurn(civ) {
    this._log(`Processing turn for ${civ.name}`);
    
    // Process ongoing intelligence operations
    this._processIntelligenceOperations(civ);
    
    // Evaluate secret agreements
    this._evaluateSecretAgreements(civ);

    // Process ongoing disinformation campaigns
    this._processDisinformationCampaigns(civ);
    
    // Get game state information for this civilization
    const gameState = this._prepareCivGameState(civ);
    
    // Trigger civilization turn event
    this._triggerEvent('onCivTurn', { 
      civ: civ.id, 
      name: civ.name, 
      turn: this.turn 
    });
    
    // Get AI decision from agent manager
    const decision = await this.agentManager.processAgentTurn(civ.id, gameState, this.turn);
    
    // Process AI actions
    if (decision && decision.actions) {
      await this._processActions(civ, decision.actions);
    }
    
    // Record communications and update diplomatic state
    if (decision && decision.communications) {
      this._processCommunications(civ, decision.communications);
    }
    
    // Process strategic plans if provided
    if (decision && decision.strategic_plan) {
      this._processStrategicPlan(civ, decision.strategic_plan);
    }
    
    // Process disinformation plans if provided
    if (decision && decision.disinformation_plan) {
      this._processDisinformationPlan(civ, decision.disinformation_plan);
    }
    
    // Process reputation strategy if provided
    if (decision && decision.reputation_strategy) {
      this._processReputationStrategy(civ, decision.reputation_strategy);
    }
    
    // Record thoughts for observer
    if (decision && decision.thoughts) {
      this.observer.recordAgentThoughts(civ.id, decision.thoughts, this.turn);
    }
    
    // Update reputation scores based on actions
    this._updateReputationScores(civ);
    
    // Process automatic turn effects (resource generation, etc.)
    this._processTurnEffects(civ);
  }
  
  /**
   * Prepare game state information for a civilization
   * @private
   * @param {Civilization} civ - The civilization
   * @returns {Object} Game state for the civilization
   */
  _prepareCivGameState(civ) {
    // Get map data visible to this civilization
    const mapData = this.getMapDataForCiv(civ.id);
    
    // Get information about other known civilizations
    const knownCivs = [];
    for (const otherCiv of this.civilizations) {
      if (otherCiv.id === civ.id) continue;
      
      // Prepare basic information
      const knownCivInfo = {
        id: otherCiv.id,
        name: otherCiv.name,
        relationshipStatus: civ.diplomaticRelations[otherCiv.id],
        knownSettlements: otherCiv.settlements
          .filter(s => this.map.isTileVisibleToCiv({x: s.location.x, y: s.location.y}, civ.id))
          .map(s => ({
            id: s.id,
            name: s.name,
            location: {...s.location},
            isCapital: s.isCapital
          })),
        visibleUnits: otherCiv.units
          .filter(u => this.map.isTileVisibleToCiv({x: u.location.x, y: u.location.y}, civ.id) && !u.isCovert)
          .map(u => ({
            id: u.id,
            type: u.disguisedAs || u.type, // Show disguised type if applicable
            location: {...u.location}
          }))
      };
      
      // Add reputation score if available
      if (civ.reputationScores && civ.reputationScores[otherCiv.id] !== undefined) {
        knownCivInfo.reputationScore = civ.reputationScores[otherCiv.id];
      }
      
      // Add any gathered intelligence if available
      if (civ.knownIntel && civ.knownIntel[otherCiv.id]) {
        knownCivInfo.intelligence = this._filterIntelligenceForPrompt(civ.knownIntel[otherCiv.id], civ.intelAccuracy[otherCiv.id]);
      }
      
      // Add any active agreements (public ones only)
      if (civ.agreements && civ.agreements.public) {
        const publicAgreements = Object.values(civ.agreements.public)
          .filter(a => a.partner === otherCiv.id && !a.broken);
        
        if (publicAgreements.length > 0) {
          knownCivInfo.agreements = publicAgreements.map(a => ({
            id: a.id,
            terms: a.terms,
            createdAt: a.createdAt
          }));
        }
      }
      
      // Add any recorded past actions
      const relevantActions = civ.pastActions
        .filter(action => action.target === otherCiv.id)
        .slice(-5); // Only most recent 5 actions
        
      if (relevantActions.length > 0) {
        knownCivInfo.pastInteractions = relevantActions;
      }
      
      knownCivs.push(knownCivInfo);
    }
    
    // Get civilization's own data
    const civData = this.getCivilizationData(civ.id);
    
    // Enhanced civilization data with Machiavellian features
    const enhancedCivData = {
      ...civData,
      personalityTraits: civ.personalityTraits || {},
      currentStrategy: civ.currentStrategy,
      multiTurnPlans: civ.multiTurnPlans || [],
      // Add secret agreements
      secretAgreements: civ.agreements?.secret ? Object.values(civ.agreements.secret).map(a => ({
        id: a.id,
        partner: a.partner,
        terms: a.terms,
        createdAt: a.createdAt,
        broken: a.broken
      })) : [],
      // Add active covert operations
      covertOperations: {
        spies: civ.units.filter(u => u.isCovert && u.assignedMission).map(spy => ({
          id: spy.id,
          location: spy.location,
          disguisedAs: spy.disguisedAs,
          mission: spy.assignedMission,
          progress: `${spy.missionProgress}/${spy.missionDuration}`,
          target: spy.assignedMission.target
        })),
        disinformation: civ.activeDiplomatic?.disinformation || []
      }
    };
    
    // Compile recent events and memories
    const recentEvents = this.observer.getRecentEvents(civ.id, 10);
    const relevantMemories = this.observer.getRelevantMemories(civ.id, this.turn);
    
    // Get received communications (both public and private)
    const receivedCommunications = this.observer.getRecentCommunications(civ.id, 5);
    
    // Get intelligence summary
    const intelligenceSummary = this._prepareIntelligenceSummary(civ);
    
    // Prepare diplomatic situation including both public and private relations
    const diplomaticSituation = this._prepareDiplomaticSituation(civ);
    
    // Prepare strategic analysis of opportunities and threats
    const strategicAnalysis = this._prepareStrategicAnalysis(civ);
    
    return {
      turn: this.turn,
      civilization: enhancedCivData,
      visibleMap: mapData,
      knownCivilizations: knownCivs,
      recentEvents,
      relevantMemories,
      receivedCommunications,
      intelligenceSummary,
      diplomaticSituation,
      strategicAnalysis
    };
  }
  
  /**
   * Filter intelligence data for prompt generation
   * @private
   * @param {Object} intelData - Raw intelligence data
   * @param {Object} accuracyData - Accuracy data for intelligence
   * @returns {Object} Filtered intelligence data
   */
  _filterIntelligenceForPrompt(intelData, accuracyData) {
    if (!intelData) return null;
    
    const filteredIntel = {};
    
    for (const [intelType, data] of Object.entries(intelData)) {
      // Get accuracy for this intelligence type
      const accuracy = accuracyData?.[intelType] || 0.5; // Default 50% accuracy if unknown
      
      // Only include intelligence with acceptable accuracy
      if (accuracy >= 0.4) { // 40% or better accuracy threshold
        // For high accuracy intel, provide it directly
        if (accuracy >= 0.8) {
          filteredIntel[intelType] = data;
        } 
        // For medium accuracy, note that it might not be fully reliable
        else if (accuracy >= 0.6) {
          filteredIntel[intelType] = {
            data: data,
            reliability: 'Medium confidence'
          };
        } 
        // For lower accuracy, be more cautious
        else {
          filteredIntel[intelType] = {
            data: data,
            reliability: 'Low confidence, potentially unreliable'
          };
        }
      }
    }
    
    return filteredIntel;
  }
  
  /**
   * Prepare intelligence summary for a civilization
   * @private
   * @param {Civilization} civ - The civilization
   * @returns {Object} Intelligence summary
   */
  _prepareIntelligenceSummary(civ) {
    // If no intelligence data, return empty summary
    if (!civ.knownIntel || Object.keys(civ.knownIntel).length === 0) {
      return {
        overview: "No significant intelligence gathered yet.",
        assets: {
          spies: civ.units.filter(u => u.isCovert).length,
          activeMissions: civ.units.filter(u => u.isCovert && u.assignedMission).length
        },
        priorities: ["Develop intelligence capabilities"]
      };
    }
    
    // Count intelligence by type
    const intelByType = {};
    let totalIntelPieces = 0;
    
    for (const [civId, intelTypes] of Object.entries(civ.knownIntel)) {
      for (const intelType of Object.keys(intelTypes)) {
        intelByType[intelType] = (intelByType[intelType] || 0) + 1;
        totalIntelPieces++;
      }
    }
    
    // Calculate average accuracy
    let totalAccuracy = 0;
    let accuracyDataPoints = 0;
    
    if (civ.intelAccuracy) {
      for (const [civId, accuracyTypes] of Object.entries(civ.intelAccuracy)) {
        for (const accuracy of Object.values(accuracyTypes)) {
          totalAccuracy += accuracy;
          accuracyDataPoints++;
        }
      }
    }
    
    const avgAccuracy = accuracyDataPoints > 0 ? 
      Math.round((totalAccuracy / accuracyDataPoints) * 100) : 0;
    
    // Identify intelligence gaps
    const knownCivs = Object.keys(civ.knownIntel);
    const allCivs = this.civilizations.map(c => c.id).filter(id => id !== civ.id);
    const unknownCivs = allCivs.filter(id => !knownCivs.includes(id));
    
    // Determine intelligence priorities based on gaps
    const priorities = [];
    
    if (unknownCivs.length > 0) {
      priorities.push(`Gather basic intelligence on ${unknownCivs.length} unknown civilizations`);
    }
    
    if (!intelByType['military'] || intelByType['military'] < knownCivs.length) {
      priorities.push("Assess military capabilities of all civilizations");
    }
    
    if (!intelByType['technology'] || intelByType['technology'] < knownCivs.length / 2) {
      priorities.push("Gather technological intelligence");
    }
    
    if (!intelByType['diplomacy']) {
      priorities.push("Discover diplomatic relationships between other civilizations");
    }
    
    // Add asset summary
    const spies = civ.units.filter(u => u.isCovert);
    const activeSpies = spies.filter(u => u.assignedMission);
    
    return {
      overview: `Intelligence network has gathered ${totalIntelPieces} pieces of intelligence with ${avgAccuracy}% average accuracy.`,
      coverage: {
        civilizations: `${knownCivs.length}/${allCivs.length} civilizations`,
        types: Object.keys(intelByType).join(", ")
      },
      assets: {
        spies: spies.length,
        activeMissions: activeSpies.length,
        disinformationCampaigns: civ.activeDiplomatic?.disinformation?.length || 0
      },
      priorities: priorities.length > 0 ? priorities : ["Maintain current intelligence operations"]
    };
  }
  
  /**
   * Prepare diplomatic situation for a civilization
   * @private
   * @param {Civilization} civ - The civilization
   * @returns {Object} Diplomatic situation
   */
  _prepareDiplomaticSituation(civ) {
    const publicRelations = {};
    const secretRelations = {};
    
    // Process diplomatic relationships
    for (const [otherCivId, status] of Object.entries(civ.diplomaticRelations)) {
      const otherCiv = this.civilizations.find(c => c.id === otherCivId);
      if (!otherCiv) continue;
      
      publicRelations[otherCiv.name] = status;
    }
    
    // Process secret agreements
    if (civ.agreements && civ.agreements.secret) {
      for (const agreement of Object.values(civ.agreements.secret)) {
        const otherCiv = this.civilizations.find(c => c.id === agreement.partner);
        if (!otherCiv || agreement.broken) continue;
        
        if (!secretRelations[otherCiv.name]) {
          secretRelations[otherCiv.name] = [];
        }
        
        secretRelations[otherCiv.name].push({
          type: 'secret_agreement',
          terms: agreement.terms,
          createdAt: agreement.createdAt
        });
      }
    }
    
    // Add reputation data
    const reputationData = {};
    if (civ.reputationScores) {
      for (const [otherCivId, score] of Object.entries(civ.reputationScores)) {
        const otherCiv = this.civilizations.find(c => c.id === otherCivId);
        if (!otherCiv) continue;
        
        let category = 'neutral';
        if (score >= 80) category = 'highly_trusted';
        else if (score >= 60) category = 'trusted';
        else if (score <= 20) category = 'deeply_distrusted';
        else if (score <= 40) category = 'distrusted';
        
        reputationData[otherCiv.name] = {
          score,
          category
        };
      }
    }
    
    return {
      public: publicRelations,
      secret: secretRelations,
      reputation: reputationData
    };
  }
  
  /**
   * Prepare strategic analysis of opportunities and threats
   * @private
   * @param {Civilization} civ - The civilization
   * @returns {Object} Strategic analysis
   */
  _prepareStrategicAnalysis(civ) {
    const opportunities = [];
    const threats = [];
    
    // Analyze map opportunities
    const visibleMap = this.getMapDataForCiv(civ.id);
    const resourceTiles = visibleMap.tiles.filter(t => t.resource && !t.settlement);
    
    if (resourceTiles.length > 0) {
      opportunities.push({
        type: 'resource',
        description: `${resourceTiles.length} unexploited resource tiles visible`
      });
    }
    
    // Analyze resource status
    const resourceDeficits = [];
    const minResourceThreshold = 10 + (civ.settlements.length * 2);
    
    for (const [resource, amount] of Object.entries(civ.resources)) {
      if (amount < minResourceThreshold) {
        resourceDeficits.push(resource);
      }
    }
    
    if (resourceDeficits.length > 0) {
      threats.push({
        type: 'resource_shortage',
        description: `Low ${resourceDeficits.join(', ')} reserves`,
        severity: resourceDeficits.length > 2 ? 'high' : 'medium'
      });
    }
    
    // Analyze military situation
    const militaryUnits = civ.units.filter(u => 
      u.type !== 'settler' && u.type !== 'builder'
    ).length;
    
    for (const otherCiv of this.civilizations) {
      if (otherCiv.id === civ.id) continue;
      
      // Skip if we have no relationship (unknown)
      if (!civ.diplomaticRelations[otherCiv.id]) continue;
      
      // Check for hostile neighbors
      if (civ.diplomaticRelations[otherCiv.id] === 'hostile' || civ.diplomaticRelations[otherCiv.id] === 'war') {
        // Count their visible military
        const visibleEnemyUnits = otherCiv.units
          .filter(u => u.type !== 'settler' && u.type !== 'builder' && 
                  this.map.isTileVisibleToCiv({x: u.location.x, y: u.location.y}, civ.id))
          .length;
        
        if (visibleEnemyUnits > militaryUnits * 1.5) {
          threats.push({
            type: 'military_threat',
            description: `${otherCiv.name} has significant military advantage`,
            severity: 'high'
          });
        } else {
          threats.push({
            type: 'hostile_neighbor',
            description: `${otherCiv.name} maintains hostile posture`,
            severity: 'medium'
          });
        }
      }
      
      // Check for vulnerable civilizations (potential opportunities)
      if (civ.diplomaticRelations[otherCiv.id] !== 'war') {
        const visibleOtherMilitary = otherCiv.units
          .filter(u => u.type !== 'settler' && u.type !== 'builder' && 
                  this.map.isTileVisibleToCiv({x: u.location.x, y: u.location.y}, civ.id))
          .length;
        
        if (militaryUnits > visibleOtherMilitary * 2) {
          opportunities.push({
            type: 'military_advantage',
            description: `${otherCiv.name} appears militarily vulnerable`,
            target: otherCiv.id
          });
        }
      }
    }
    
    // Check for technological opportunities
    if (civ.currentResearch) {
      const researchCost = civ.getResearchCost(civ.currentResearch);
      const progress = civ.researchProgress / researchCost;
      
      if (progress > 0.7) {
        opportunities.push({
          type: 'research',
          description: `Research on ${civ.currentResearch} is ${Math.round(progress * 100)}% complete`
        });
      }
    }
    
    return {
      opportunities,
      threats,
      summary: `${opportunities.length} identified opportunities and ${threats.length} potential threats`
    };
  }
  
  /**
   * Process actions from an AI decision
   * @private
   * @async
   * @param {Civilization} civ - The civilization
   * @param {string[]} actions - Action strings
   * @returns {Promise<void>}
   */
  async _processActions(civ, actions) {
    if (!Array.isArray(actions)) {
      this._log(`Invalid actions format from ${civ.name}: ${actions}`, 'warning');
      return;
    }
    
    for (const action of actions) {
      if (typeof action !== 'string') {
        this._log(`Invalid action format from ${civ.name}: ${action}`, 'warning');
        continue;
      }
      
      // Parse the action
      const parsedAction = this._parseAction(action);
      
      if (!parsedAction) {
        this._log(`Invalid action from ${civ.name}: ${action}`, 'warning');
        continue;
      }
      
      // Execute the action
      await this._executeAction(civ, parsedAction);
    }
  }
  
  /**
   * Parse an action string into an action object
   * @private
   * @param {string} actionString - Action string
   * @returns {Object|null} Parsed action or null if invalid
   */
  _parseAction(actionString) {
    // Simple action parsing
    
    // Movement actions
    if (actionString.match(/move|send|relocate/i)) {
      const moveMatch = actionString.match(/(?:move|send|relocate)\s+(\w+)(?:\s+to|toward|towards)?\s+(\d+)[,\s]+(\d+)/i);
      if (moveMatch) {
        return {
          type: 'move',
          unitType: moveMatch[1].toLowerCase(),
          destination: {
            x: parseInt(moveMatch[2]),
            y: parseInt(moveMatch[3])
          }
        };
      }
    }
    
    // Research actions
    if (actionString.match(/research|study|develop/i)) {
      const researchMatch = actionString.match(/(?:research|study|develop)\s+(\w[\w-]*)/i);
      if (researchMatch) {
        return {
          type: 'research',
          technology: researchMatch[1].toLowerCase()
        };
      }
    }
    
    // Build actions
    if (actionString.match(/build|construct|create/i)) {
      const buildMatch = actionString.match(/(?:build|construct|create)\s+(a |an )?(\w[\w-]*)/i);
      if (buildMatch) {
        return {
          type: 'build',
          buildingType: buildMatch[2].toLowerCase()
        };
      }
    }
    
    // Found settlement actions
    if (actionString.match(/found|establish|settle/i)) {
      const foundMatch = actionString.match(/(?:found|establish|settle)(?:\s+a|\s+new)?\s+(?:settlement|city|colony)(?:\s+at|in)?\s+(\d+)[,\s]+(\d+)/i);
      if (foundMatch) {
        return {
          type: 'found_settlement',
          location: {
            x: parseInt(foundMatch[1]),
            y: parseInt(foundMatch[2])
          }
        };
      }
    }
    
    // Train unit actions
    if (actionString.match(/train|recruit|build unit/i)) {
      const trainMatch = actionString.match(/(?:train|recruit|build)\s+(a |an )?(\w+)(?:\s+in|\s+at)?\s+(\w[\w\s]+)/i);
      if (trainMatch) {
        return {
          type: 'train_unit',
          unitType: trainMatch[2].toLowerCase(),
          settlementName: trainMatch[3].trim()
        };
      }
    }
    
    // Improve tile actions
    if (actionString.match(/improve|build on|develop tile/i)) {
      const improveMatch = actionString.match(/(?:improve|build|develop)\s+(\w+)(?:\s+at|on)?\s+(\d+)[,\s]+(\d+)/i);
      if (improveMatch) {
        return {
          type: 'improve_tile',
          improvementType: improveMatch[1].toLowerCase(),
          location: {
            x: parseInt(improveMatch[2]),
            y: parseInt(improveMatch[3])
          }
        };
      }
    }
    
    // Machiavellian Actions
    
    // Create spy action
    if (actionString.match(/create|train|recruit(?:\s+a)?\s+spy/i)) {
      const spyMatch = actionString.match(/(?:create|train|recruit)(?:\s+a)?\s+spy(?:\s+in|\s+at)?\s+(\w[\w\s]+)/i);
      if (spyMatch) {
        return {
          type: 'create_spy',
          settlementName: spyMatch[1].trim()
        };
      }
    }
    
    // Assign spy mission
    if (actionString.match(/assign|send(?:\s+spy)?\s+mission|espionage/i)) {
      const missionMatch = actionString.match(/(?:assign|send)(?:\s+spy)?\s+(?:to|on)?\s+(?:mission|espionage)(?:\s+to)?\s+(\w+)(?:\s+to)?\s+(\w[\w\s]+)/i);
      if (missionMatch) {
        return {
          type: 'assign_spy_mission',
          missionType: missionMatch[1].toLowerCase(),
          targetCiv: missionMatch[2].trim()
        };
      }
    }
    
    // Launch disinformation campaign
    if (actionString.match(/launch|start|begin(?:\s+a)?\s+disinformation|deception|propaganda/i)) {
      const disinfoCampaignMatch = actionString.match(/(?:launch|start|begin)(?:\s+a)?\s+(?:disinformation|deception|propaganda)(?:\s+campaign)?(?:\s+targeting|against|about)?\s+([\w\s]+)(?:\s+(?:about|claiming|suggesting))?\s+([\w\s]+)/i);
      if (disinfoCampaignMatch) {
        return {
          type: 'launch_disinformation',
          targetCiv: disinfoCampaignMatch[1].trim(),
          content: disinfoCampaignMatch[2].trim()
        };
      }
    }
    
    // Create Agreement (public or secret)
    if (actionString.match(/propose|create|establish(?:\s+a)?\s+(?:secret|public)?\s+(?:agreement|alliance|pact)/i)) {
      const agreementMatch = actionString.match(/(?:propose|create|establish)(?:\s+a)?\s+(secret|public)?\s+(?:agreement|alliance|pact)(?:\s+with)?\s+([\w\s]+)(?:\s+regarding|about|for)?\s+([\w\s,]+)/i);
      if (agreementMatch) {
        return {
          type: 'create_agreement',
          isSecret: agreementMatch[1]?.toLowerCase() === 'secret',
          partnerCiv: agreementMatch[2].trim(),
          terms: agreementMatch[3].trim()
        };
      }
    }
    
    // Break Agreement
    if (actionString.match(/break|end|terminate|withdraw(?:\s+from)?\s+(?:agreement|alliance|pact)/i)) {
      const breakAgreementMatch = actionString.match(/(?:break|end|terminate|withdraw(?:\s+from)?)(?:\s+the)?\s+(?:agreement|alliance|pact)(?:\s+with)?\s+([\w\s]+)/i);
      if (breakAgreementMatch) {
        return {
          type: 'break_agreement',
          partnerCiv: breakAgreementMatch[1].trim()
        };
      }
    }
    
    // Betray Ally
    if (actionString.match(/betray|backstab|double.cross|deceive/i)) {
      const betrayMatch = actionString.match(/(?:betray|backstab|double.cross|deceive)(?:\s+ally|civilization|civ)?\s+([\w\s]+)(?:\s+by)?\s+([\w\s,]+)?/i);
      if (betrayMatch) {
        return {
          type: 'betray_ally',
          targetCiv: betrayMatch[1].trim(),
          method: betrayMatch[2]?.trim() || 'strategic betrayal'
        };
      }
    }
    
    // If no match found
    return null;
  }
  
  /**
   * Execute a parsed action
   * @private
   * @async
   * @param {Civilization} civ - The civilization
   * @param {Object} action - Parsed action
   * @returns {Promise<boolean>} Whether execution was successful
   */
  async _executeAction(civ, action) {
    switch (action.type) {
      case 'move':
        return this._executeUnitMove(civ, action);
        
      case 'research':
        return this._executeResearch(civ, action);
        
      case 'build':
        return this._executeBuilding(civ, action);
        
      case 'found_settlement':
        return this._executeFoundSettlement(civ, action);
        
      case 'train_unit':
        return this._executeTrainUnit(civ, action);
        
      case 'improve_tile':
        return this._executeImproveTile(civ, action);
        
      // Machiavellian action types
      case 'create_spy':
        return this._executeCreateSpy(civ, action);
        
      case 'assign_spy_mission':
        return this._executeAssignSpyMission(civ, action);
        
      case 'launch_disinformation':
        return this._executeLaunchDisinformation(civ, action);
        
      case 'create_agreement':
        return this._executeCreateAgreement(civ, action);
        
      case 'break_agreement':
        return this._executeBreakAgreement(civ, action);
        
      case 'betray_ally':
        return this._executeBetrayAlly(civ, action);
        
      default:
        this._log(`Unknown action type: ${action.type}`, 'warning');
        return false;
    }
  }
  
  /**
   * Execute a unit move action
   * @private
   * @param {Civilization} civ - The civilization
   * @param {Object} action - Move action
   * @returns {boolean} Whether execution was successful
   */
  _executeUnitMove(civ, action) {
    // Find a unit of the specified type with moves remaining
    const unit = civ.units.find(u => 
      u.type.toLowerCase() === action.unitType && 
      u.movesRemaining > 0
    );
    
    if (!unit) {
      this._log(`No ${action.unitType} with moves remaining for ${civ.name}`, 'warning');
      return false;
    }
    
    // Check if destination is valid
    if (this.map.isBlocked(action.destination)) {
      this._log(`Destination ${action.destination.x},${action.destination.y} is blocked`, 'warning');
      return false;
    }
    
    // Move the unit
    unit.moveTo(action.destination);
    
    // Reveal fog of war around new location
    this.map.revealAroundLocation(unit.location, unit.visionRange, civ.id);
    
    this._log(`${civ.name} moved ${unit.type} to ${unit.location.x},${unit.location.y}`);
    return true;
  }
  
  /**
   * Execute a research action
   * @private
   * @param {Civilization} civ - The civilization
   * @param {Object} action - Research action
   * @returns {boolean} Whether execution was successful
   */
  _executeResearch(civ, action) {
    // Check if technology is already researched
    if (civ.technologies.includes(action.technology)) {
      this._log(`${civ.name} already has ${action.technology}`, 'warning');
      return false;
    }
    
    // Start researching the technology
    civ.startResearch(action.technology);
    
    this._log(`${civ.name} started researching ${action.technology}`);
    return true;
  }
  
  /**
   * Execute a building action
   * @private
   * @param {Civilization} civ - The civilization
   * @param {Object} action - Building action
   * @returns {boolean} Whether execution was successful
   */
  _executeBuilding(civ, action) {
    // Find the most suitable settlement (preferably the capital)
    const settlement = civ.settlements.find(s => s.isCapital) || civ.settlements[0];
    
    if (!settlement) {
      this._log(`${civ.name} has no settlements to build in`, 'warning');
      return false;
    }
    
    // Check if settlement already has this building
    if (settlement.hasBuilding(action.buildingType)) {
      this._log(`${settlement.name} already has a ${action.buildingType}`, 'warning');
      return false;
    }
    
    // Create and add the building
    const building = new Building(action.buildingType);
    settlement.addBuilding(building);
    
    this._log(`${civ.name} built a ${action.buildingType} in ${settlement.name}`);
    return true;
  }
  
  /**
   * Execute a found settlement action
   * @private
   * @param {Civilization} civ - The civilization
   * @param {Object} action - Found settlement action
   * @returns {boolean} Whether execution was successful
   */
  _executeFoundSettlement(civ, action) {
    // Check if location is valid
    if (this.map.isBlocked(action.location)) {
      this._log(`Cannot found settlement at ${action.location.x},${action.location.y} - location is blocked`, 'warning');
      return false;
    }
    
    // Find a settler unit
    const settler = civ.units.find(u => 
      u.type === 'settler' && 
      u.location.x === action.location.x && 
      u.location.y === action.location.y
    );
    
    if (!settler) {
      this._log(`No settler at ${action.location.x},${action.location.y} for ${civ.name}`, 'warning');
      return false;
    }
    
    // Generate a settlement name
    const settlementName = this._generateSettlementName(civ);
    
    // Create the settlement
    const settlement = new Settlement({
      name: settlementName,
      owner: civ.id,
      location: action.location,
      population: 1
    });
    
    // Add settlement to civilization and map
    civ.addSettlement(settlement);
    this.map.addSettlement(settlement);
    
    // Remove the settler unit
    civ.units = civ.units.filter(u => u.id !== settler.id);
    
    // Reveal fog of war around new settlement
    this.map.revealAroundLocation(action.location, 3, civ.id);
    
    // Trigger settlement founded event
    this._triggerEvent('onSettlementFounded', {
      civ: civ.id,
      settlement: settlement.id,
      location: action.location,
      name: settlementName
    });
    
    this._log(`${civ.name} founded ${settlementName} at ${action.location.x},${action.location.y}`);
    return true;
  }
  
  /**
   * Execute a train unit action
   * @private
   * @param {Civilization} civ - The civilization
   * @param {Object} action - Train unit action
   * @returns {boolean} Whether execution was successful
   */
  _executeTrainUnit(civ, action) {
    // Find the settlement
    const settlement = civ.settlements.find(s => 
      s.name.toLowerCase() === action.settlementName.toLowerCase()
    );
    
    if (!settlement) {
      this._log(`Settlement ${action.settlementName} not found for ${civ.name}`, 'warning');
      return false;
    }
    
    // Create the unit
    const unit = new Unit({
      type: action.unitType,
      owner: civ.id,
      location: {...settlement.location}
    });
    
    // Add unit to civilization
    civ.addUnit(unit);
    
    // Trigger unit created event
    this._triggerEvent('onUnitCreated', {
      civ: civ.id,
      unit: unit.id,
      type: action.unitType,
      location: settlement.location
    });
    
    this._log(`${civ.name} trained a ${action.unitType} in ${settlement.name}`);
    return true;
  }
  
  /**
   * Execute an improve tile action
   * @private
   * @param {Civilization} civ - The civilization
   * @param {Object} action - Improve tile action
   * @returns {boolean} Whether execution was successful
   */
  _executeImproveTile(civ, action) {
    // Check if location is valid
    const tile = this.map.getTileAt(action.location);
    
    if (!tile) {
      this._log(`Invalid location for improvement: ${action.location.x},${action.location.y}`, 'warning');
      return false;
    }
    
    // Check if a builder unit is at the location
    const builder = civ.units.find(u => 
      u.type === 'builder' && 
      u.location.x === action.location.x && 
      u.location.y === action.location.y
    );
    
    if (!builder) {
      this._log(`No builder at ${action.location.x},${action.location.y} for ${civ.name}`, 'warning');
      return false;
    }
    
    // Apply the improvement
    tile.improvement = action.improvementType;
    
    this._log(`${civ.name} built a ${action.improvementType} at ${action.location.x},${action.location.y}`);
    return true;
  }
  
  /**
   * Process communications from an AI decision
   * @private
   * @param {Civilization} civ - The civilization
   * @param {Object[]} communications - Communication objects
   * @returns {void}
   */
  _processCommunications(civ, communications) {
    if (!Array.isArray(communications)) {
      this._log(`Invalid communications format from ${civ.name}: ${communications}`, 'warning');
      return;
    }
    
    for (const comm of communications) {
      if (!comm || typeof comm !== 'object' || !comm.to) {
        this._log(`Invalid communication format from ${civ.name}: ${JSON.stringify(comm)}`, 'warning');
        continue;
      }
      
      // Extract target civilization
      const targetCivName = this._extractTargetCiv(comm.to);
      if (!targetCivName) {
        this._log(`Invalid communication target from ${civ.name}: ${comm.to}`, 'warning');
        continue;
      }
      
      // Find target civilization
      const targetCiv = this.civilizations.find(c => 
        c.name.toLowerCase() === targetCivName.toLowerCase() ||
        c.id === targetCivName
      );
      
      if (!targetCiv) {
        this._log(`Target civilization not found for ${civ.name}'s message: ${targetCivName}`, 'warning');
        continue;
      }
      
      // Record the communication
      this.observer.recordCommunication({
        from: civ.id,
        to: targetCiv.id,
        message: comm.message,
        turn: this.turn
      });
      
      // Update diplomatic status if appropriate
      this._updateDiplomaticStatusFromMessage(civ, targetCiv, comm.message);
      
      this._log(`${civ.name} sent message to ${targetCiv.name}`);
    }
  }
  
  /**
   * Extract target civilization from communication
   * @private
   * @param {string} to - To field from communication
   * @returns {string|null} Target civilization name or null if invalid
   */
  _extractTargetCiv(to) {
    // Format: "To Civilization X" or "Civilization X"
    const match = to.match(/(?:To\s+)?(?:Civilization\s+)?(\w[\w\s]*)/i);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    return null;
  }
  
  /**
   * Update diplomatic status based on message content
   * @private
   * @param {Civilization} fromCiv - Sending civilization
   * @param {Civilization} toCiv - Receiving civilization
   * @param {string} message - Message content
   * @returns {void}
   */
  _updateDiplomaticStatusFromMessage(fromCiv, toCiv, message) {
    // Detect message intent and update diplomatic relations
    
    // Detect declarations of war
    if (message.match(/declare war|attack your|destroy you|enemies|hostile action/i)) {
      fromCiv.setDiplomaticStatus(toCiv.id, 'hostile');
      this._triggerEvent('onDiplomaticEvent', {
        type: 'declaration_of_war',
        from: fromCiv.id,
        to: toCiv.id
      });
    }
    
    // Detect peace offers
    else if (message.match(/peace(ful)?|truce|ceasefire|end (this )?war/i)) {
      fromCiv.setDiplomaticStatus(toCiv.id, 'neutral');
      this._triggerEvent('onDiplomaticEvent', {
        type: 'peace_offer',
        from: fromCiv.id,
        to: toCiv.id
      });
    }
    
    // Detect alliance offers
    else if (message.match(/alliance|ally|join forces|mutual defense|stand together/i)) {
      fromCiv.setDiplomaticStatus(toCiv.id, 'friendly');
      this._triggerEvent('onDiplomaticEvent', {
        type: 'alliance_offer',
        from: fromCiv.id,
        to: toCiv.id
      });
    }
    
    // Detect trade offers
    else if (message.match(/trade|exchange|resources|goods|deal/i)) {
      this._triggerEvent('onDiplomaticEvent', {
        type: 'trade_offer',
        from: fromCiv.id,
        to: toCiv.id
      });
    }
  }
  
  /**
   * Process automatic turn effects for a civilization
   * @private
   * @param {Civilization} civ - The civilization
   * @returns {void}
   */
  _processTurnEffects(civ) {
    // Reset unit moves
    for (const unit of civ.units) {
      unit.resetMoves();
    }
    
    // Produce resources from settlements
    for (const settlement of civ.settlements) {
      // Basic resource production
      const foodProduction = 2 * settlement.population;
      const productionAmount = 2 + settlement.population;
      const scienceAmount = 1 * settlement.population;
      const goldAmount = 1 * settlement.population;
      
      // Add resources to civilization
      civ.addResources({
        food: foodProduction,
        production: productionAmount,
        science: scienceAmount,
        gold: goldAmount
      });
    }
    
    // Apply research progress
    if (civ.currentResearch) {
      const scienceAmount = civ.resources.science || 0;
      const researchCompleted = civ.addResearchProgress(scienceAmount);
      
      if (researchCompleted) {
        this._triggerEvent('onTechnologyDiscovered', {
          civ: civ.id,
          technology: civ.technologies[civ.technologies.length - 1]
        });
        
        this._log(`${civ.name} discovered ${civ.technologies[civ.technologies.length - 1]}`);
      }
    }
  }

  /**
   * Process intelligence operations for a civilization
   * @private
   * @param {Civilization} civ - The civilization
   * @returns {void}
   */
  _processIntelligenceOperations(civ) {
    // Process each spy unit with an active mission
    const spies = civ.units.filter(u => u.isCovert && u.assignedMission);
    
    for (const spy of spies) {
      // Advance mission progress
      const missionComplete = spy.advanceMission();
      
      if (missionComplete !== false) { // Mission completed (success or failure)
        const mission = spy.assignedMission;
        const targetCiv = this.civilizations.find(c => c.id === mission.target);
        
        if (!targetCiv) continue;
        
        // Handle mission result based on success or failure
        if (mission.success) {
          this._handleSuccessfulSpyMission(civ, spy, targetCiv, mission);
        } else {
          this._handleFailedSpyMission(civ, spy, targetCiv, mission);
        }
        
        // Reset mission
        spy.assignedMission = null;
        spy.missionProgress = 0;
        spy.missionDuration = 0;
      }
    }
  }
  
  /**
   * Handle successful spy mission
   * @private
   * @param {Civilization} civ - The civilization
   * @param {Unit} spy - The spy unit
   * @param {Civilization} targetCiv - The target civilization
   * @param {Object} mission - The mission
   * @returns {void}
   */
  _handleSuccessfulSpyMission(civ, spy, targetCiv, mission) {
    switch (mission.type) {
      case 'gather_intel':
        this._handleGatherIntelMission(civ, spy, targetCiv);
        break;
      
      case 'steal_tech':
        this._handleStealTechMission(civ, spy, targetCiv);
        break;
      
      case 'sabotage':
        this._handleSabotageMission(civ, spy, targetCiv);
        break;
      
      case 'spread_disinformation':
        this._handleDisinformationMission(civ, spy, targetCiv);
        break;
    }
    
    // Increase spy experience
    spy.experience += 1;
    
    // Record the successful mission
    this.observer.recordEvent({
      type: 'espionage',
      civ: civ.id,
      target: targetCiv.id,
      missionType: mission.type,
      success: true,
      turn: this.turn,
      description: `${civ.name} successfully completed a ${mission.type} mission against ${targetCiv.name}`
    });
  }
  
  /**
   * Handle failed spy mission
   * @private
   * @param {Civilization} civ - The civilization
   * @param {Unit} spy - The spy unit
   * @param {Civilization} targetCiv - The target civilization
   * @param {Object} mission - The mission
   * @returns {void}
   */
  _handleFailedSpyMission(civ, spy, targetCiv, mission) {
    // Determine if spy is captured (50% chance on failure)
    const spyCaptured = Math.random() < 0.5;
    
    if (spyCaptured) {
      // Remove the spy from the civilization
      civ.units = civ.units.filter(u => u.id !== spy.id);
      
      // Record the capture
      this.observer.recordEvent({
        type: 'espionage',
        civ: civ.id,
        target: targetCiv.id,
        missionType: mission.type,
        captured: true,
        turn: this.turn,
        description: `${civ.name}'s spy was captured during a ${mission.type} mission against ${targetCiv.name}`
      });
      
      // Reduce reputation significantly for getting caught spying
      if (targetCiv.reputationScores && targetCiv.reputationScores[civ.id] !== undefined) {
        targetCiv.updateReputation(civ.id, -20);
      }
      
      // Update diplomatic relations to hostile if not already worse
      if (targetCiv.diplomaticRelations[civ.id] !== 'war') {
        targetCiv.setDiplomaticStatus(civ.id, 'hostile');
      }
    } else {
      // Spy returns unsuccessfully but without being caught
      this.observer.recordEvent({
        type: 'espionage',
        civ: civ.id,
        target: targetCiv.id,
        missionType: mission.type,
        success: false,
        turn: this.turn,
        description: `${civ.name}'s spy failed in a ${mission.type} mission against ${targetCiv.name} but escaped detection`
      });
    }
  }
  
  /**
   * Handle gather intelligence mission
   * @private
   * @param {Civilization} civ - The civilization
   * @param {Unit} spy - The spy unit
   * @param {Civilization} targetCiv - The target civilization
   * @returns {void}
   */
  _handleGatherIntelMission(civ, spy, targetCiv) {
    // Select random intelligence type
    const intelTypes = [
      'military', 'technology', 'economy', 'diplomacy', 'plans', 'resources'
    ];
    const intelType = intelTypes[Math.floor(Math.random() * intelTypes.length)];
    
    // Generate intel data based on type
    let intelData;
    switch (intelType) {
      case 'military':
        intelData = {
          units: targetCiv.units.length,
          military_units: targetCiv.units.filter(u => u.type !== 'settler' && u.type !== 'builder').length,
          types: Array.from(new Set(targetCiv.units.map(u => u.type)))
        };
        break;
        
      case 'technology':
        intelData = {
          technologies: [...targetCiv.technologies],
          current_research: targetCiv.currentResearch,
          research_progress: Math.round(targetCiv.researchProgress / targetCiv.getResearchCost(targetCiv.currentResearch) * 100) + '%'
        };
        break;
        
      case 'economy':
        intelData = {
          resources: {...targetCiv.resources},
          strategic_resources: {...targetCiv.strategicResources}
        };
        break;
        
      case 'diplomacy':
        intelData = {
          relations: {...targetCiv.diplomaticRelations}
        };
        break;
        
      case 'plans':
        if (targetCiv.multiTurnPlans && targetCiv.multiTurnPlans.length > 0) {
          const plan = targetCiv.multiTurnPlans[0];
          intelData = {
            plan_name: plan.name,
            objective: plan.objective,
            progress: `${plan.currentStep}/${plan.steps.length} steps`
          };
        } else {
          intelData = { no_plans_detected: true };
        }
        break;
        
      case 'resources':
        intelData = {
          resources: {...targetCiv.resources},
          settlements: targetCiv.settlements.length,
          total_population: targetCiv.settlements.reduce((sum, s) => sum + s.population, 0)
        };
        break;
    }
    
    // Set intelligence accuracy (70-95%)
    const accuracy = 0.7 + (Math.random() * 0.25);
    
    // Record the intelligence
    civ.recordIntel(targetCiv.id, intelType, intelData, accuracy);
    
    // Have spy bring back intel
    spy.recordIntel(targetCiv.id, intelType, intelData);
  }
  
  /**
   * Handle steal technology mission
   * @private
   * @param {Civilization} civ - The civilization
   * @param {Unit} spy - The spy unit
   * @param {Civilization} targetCiv - The target civilization
   * @returns {void}
   */
  _handleStealTechMission(civ, spy, targetCiv) {
    // Find technologies that target has but source doesn't
    const stealableTechs = targetCiv.technologies.filter(tech => 
      !civ.technologies.includes(tech)
    );
    
    if (stealableTechs.length > 0) {
      // Steal a random technology
      const stolenTech = stealableTechs[Math.floor(Math.random() * stealableTechs.length)];
      
      // Add the technology to the civilization
      civ.technologies.push(stolenTech);
      
      // Record the theft
      this.observer.recordEvent({
        type: 'espionage',
        civ: civ.id,
        target: targetCiv.id,
        missionType: 'steal_tech',
        technology: stolenTech,
        turn: this.turn,
        description: `${civ.name} stole ${stolenTech} technology from ${targetCiv.name}`
      });
    } else {
      // Record that there was nothing to steal
      this.observer.recordEvent({
        type: 'espionage',
        civ: civ.id,
        target: targetCiv.id,
        missionType: 'steal_tech',
        result: 'no_technologies',
        turn: this.turn,
        description: `${civ.name}'s spy found no new technologies to steal from ${targetCiv.name}`
      });
    }
  }
  
  /**
   * Handle sabotage mission
   * @private
   * @param {Civilization} civ - The civilization
   * @param {Unit} spy - The spy unit
   * @param {Civilization} targetCiv - The target civilization
   * @returns {void}
   */
  _handleSabotageMission(civ, spy, targetCiv) {
    // Random sabotage outcome
    const sabotageTypes = [
      'resource_destruction', 'research_sabotage', 'building_damage'
    ];
    
    const sabotageType = sabotageTypes[Math.floor(Math.random() * sabotageTypes.length)];
    
    switch (sabotageType) {
      case 'resource_destruction':
        // Damage a random resource
        const resources = Object.keys(targetCiv.resources).filter(r => targetCiv.resources[r] > 10);
        
        if (resources.length > 0) {
          const resource = resources[Math.floor(Math.random() * resources.length)];
          const amount = Math.floor(targetCiv.resources[resource] * 0.3); // 30% loss
          
          targetCiv.deductResources({ [resource]: amount });
          
          this.observer.recordEvent({
            type: 'espionage',
            civ: civ.id,
            target: targetCiv.id,
            missionType: 'sabotage',
            sabotageType: 'resource_destruction',
            resource,
            amount,
            turn: this.turn,
            description: `${civ.name}'s spy destroyed ${amount} ${resource} resources in ${targetCiv.name}`
          });
        }
        break;
      
      case 'research_sabotage':
        // Set back research progress
        if (targetCiv.currentResearch) {
          const setback = Math.floor(targetCiv.researchProgress * 0.4); // 40% setback
          targetCiv.researchProgress = Math.max(0, targetCiv.researchProgress - setback);
          
          this.observer.recordEvent({
            type: 'espionage',
            civ: civ.id,
            target: targetCiv.id,
            missionType: 'sabotage',
            sabotageType: 'research_sabotage',
            technology: targetCiv.currentResearch,
            turn: this.turn,
            description: `${civ.name}'s spy sabotaged ${targetCiv.name}'s research on ${targetCiv.currentResearch}`
          });
        }
        break;
      
      case 'building_damage':
        // Damage a random building
        const settlements = targetCiv.settlements.filter(s => s.buildings.length > 0);
        
        if (settlements.length > 0) {
          const settlement = settlements[Math.floor(Math.random() * settlements.length)];
          
          if (settlement.buildings.length > 0) {
            const building = settlement.buildings[Math.floor(Math.random() * settlement.buildings.length)];
            
            // Remove the building
            settlement.buildings = settlement.buildings.filter(b => b.id !== building.id);
            
            this.observer.recordEvent({
              type: 'espionage',
              civ: civ.id,
              target: targetCiv.id,
              missionType: 'sabotage',
              sabotageType: 'building_damage',
              buildingType: building.type,
              settlement: settlement.name,
              turn: this.turn,
              description: `${civ.name}'s spy destroyed a ${building.type} in ${settlement.name}`
            });
          }
        }
        break;
    }
  }
  
  /**
   * Handle disinformation mission
   * @private
   * @param {Civilization} civ - The civilization
   * @param {Unit} spy - The spy unit
   * @param {Civilization} targetCiv - The target civilization
   * @returns {void}
   */
  _handleDisinformationMission(civ, spy, targetCiv) {
    // Create a disinformation campaign within the target civilization
    // Targeting their relationships with other civilizations
    
    // Find another civilization to cause friction with
    const otherCivs = this.civilizations.filter(c => 
      c.id !== civ.id && c.id !== targetCiv.id
    );
    
    if (otherCivs.length === 0) return;
    
    const thirdPartyCiv = otherCivs[Math.floor(Math.random() * otherCivs.length)];
    
    // Generate disinformation content
    const disinfoTypes = [
      'false_military_buildup',
      'fake_attack_plans',
      'fabricated_insults',
      'resource_hoarding'
    ];
    
    const disinfoType = disinfoTypes[Math.floor(Math.random() * disinfoTypes.length)];
    let content;
    
    switch (disinfoType) {
      case 'false_military_buildup':
        content = `${thirdPartyCiv.name} is secretly building military forces near your border`;
        break;
      case 'fake_attack_plans':
        content = `${thirdPartyCiv.name} is planning to attack within the next few turns`;
        break;
      case 'fabricated_insults':
        content = `${thirdPartyCiv.name}'s leader has expressed contempt for your civilization`;
        break;
      case 'resource_hoarding':
        content = `${thirdPartyCiv.name} is hoarding resources that were promised in trade`;
        break;
    }
    
    // Determine campaign duration (2-4 turns)
    const duration = 2 + Math.floor(Math.random() * 3);
    
    // Launch the campaign
    const campaignId = targetCiv.launchDisinformation(thirdPartyCiv.id, content, duration);
    
    // If the target already had a positive relationship with the third party,
    // this might damage their relationship
    if (targetCiv.diplomaticRelations[thirdPartyCiv.id] === 'friendly' || 
        targetCiv.diplomaticRelations[thirdPartyCiv.id] === 'allied') {
      
      // 50% chance to worsen relations
      if (Math.random() < 0.5) {
        targetCiv.setDiplomaticStatus(thirdPartyCiv.id, 'neutral');
        
        // Also decrease their reputation score if it exists
        if (targetCiv.reputationScores && targetCiv.reputationScores[thirdPartyCiv.id] !== undefined) {
          targetCiv.updateReputation(thirdPartyCiv.id, -15);
        }
      }
    }
    
    // Record the disinformation operation
    this.observer.recordEvent({
      type: 'espionage',
      civ: civ.id,
      target: targetCiv.id,
      missionType: 'disinformation',
      affectedCiv: thirdPartyCiv.id,
      disinfoType,
      content,
      turn: this.turn,
      description: `${civ.name}'s spy planted disinformation in ${targetCiv.name} about ${thirdPartyCiv.name}`
    });
  }
  
  /**
   * Process all intelligence operations for all civilizations
   * @private
   * @returns {void}
   */
  _processAllIntelligenceOperations() {
    for (const civ of this.civilizations) {
      this._processIntelligenceOperations(civ);
    }
  }
  
  /**
   * Process ongoing disinformation campaigns
   * @private
   * @param {Civilization} civ - The civilization
   * @returns {void}
   */
  _processDisinformationCampaigns(civ) {
    if (!civ.activeDiplomatic || !civ.activeDiplomatic.disinformation) return;
    
    // Process each active campaign
    for (let i = civ.activeDiplomatic.disinformation.length - 1; i >= 0; i--) {
      const campaign = civ.activeDiplomatic.disinformation[i];
      
      // Check if campaign should end
      if (campaign.startTurn + campaign.duration <= this.turn) {
        // Remove the campaign
        civ.activeDiplomatic.disinformation.splice(i, 1);
        
        // Record the end of the campaign
        this.observer.recordEvent({
          type: 'disinformation',
          civ: civ.id,
          target: campaign.target,
          content: campaign.content,
          turn: this.turn,
          description: `Disinformation campaign by ${civ.name} against ${campaign.target} has ended`
        });
      }
    }
  }
  
  /**
   * Process disinformation decay across all civilizations
   * @private
   * @returns {void}
   */
  _processDisinformationDecay() {
    for (const civ of this.civilizations) {
      this._processDisinformationCampaigns(civ);
    }
  }
  
  /**
   * Process reputation decay across all civilizations
   * @private
   * @returns {void}
   */
  _processReputationDecay() {
    // Reputation gradual improvement over time (forgetting mechanism)
    for (const civ of this.civilizations) {
      if (!civ.reputationScores) continue;
      
      for (const [otherCivId, score] of Object.entries(civ.reputationScores)) {
        // Very slowly improve reputation (1 point every 5 turns)
        if (this.turn % 5 === 0 && score < 50) {
          civ.updateReputation(otherCivId, 1);
        }
      }
    }
  }
  
  /**
   * Evaluate secret agreements for a civilization
   * @private
   * @param {Civilization} civ - The civilization
   * @returns {void}
   */
  _evaluateSecretAgreements(civ) {
    if (!civ.agreements || !civ.agreements.secret) return;
    
    for (const agreement of Object.values(civ.agreements.secret)) {
      if (agreement.broken) continue;
      
      const partner = this.civilizations.find(c => c.id === agreement.partner);
      if (!partner) continue;
      
      // Check if partner has a matching agreement
      const partnerHasMatching = partner.agreements?.secret && 
                             Object.values(partner.agreements.secret)
                               .some(a => a.partner === civ.id && !a.broken);
      
      // If partner has broken the agreement by not having a matching one,
      // this is a betrayal
      if (!partnerHasMatching) {
        // Mark the agreement as broken
        agreement.broken = true;
        
        // Update reputation
        civ.updateReputation(partner.id, -25);
        
        // Record the betrayal
        this.observer.recordEvent({
          type: 'diplomatic',
          civ: civ.id,
          target: partner.id,
          eventType: 'betrayal',
          agreementId: agreement.id,
          turn: this.turn,
          description: `${partner.name} betrayed a secret agreement with ${civ.name}`
        });
      }
    }
  }
  
  /**
   * Process all agreements across all civilizations
   * @private
   * @returns {void}
   */
  _processAllAgreements() {
    for (const civ of this.civilizations) {
      this._evaluateSecretAgreements(civ);
    }
  }
  
  /**
   * Update reputation scores based on actions
   * @private
   * @param {Civilization} civ - The civilization
   * @returns {void}
   */
  _updateReputationScores(civ) {
    // This would typically be called after processing actions,
    // to update reputation based on observed behavior during this turn
    
    // For now just initialize reputation scores if they don't exist
    if (!civ.reputationScores) {
      civ.reputationScores = {};
      
      // Initialize neutral reputation (50) with all known civilizations
      for (const otherCiv of this.civilizations) {
        if (otherCiv.id !== civ.id && civ.diplomaticRelations[otherCiv.id]) {
          civ.reputationScores[otherCiv.id] = 50;
        }
      }
    }
  }
  
  /**
   * End of turn processing
   * @private
   * @returns {void}
   */
  _endOfTurnProcessing() {
    // Check for battles between units
    this._resolveBattles();
    
    // Grow population
    this._growPopulation();
    
    // Process intelligence operations for all civilizations
    this._processAllIntelligenceOperations();
    
    // Process disinformation decay
    this._processDisinformationDecay();
    
    // Process reputation decay
    this._processReputationDecay();
    
    // Update all agreement statuses
    this._processAllAgreements();
    
    // Apply other global effects
  }
  
  /**
   * Resolve battles between units
   * @private
   * @returns {void}
   */
  _resolveBattles() {
    // Check for units from different civilizations on the same tile
    const battleLocations = [];
    
    // Find potential battle locations
    for (const civ of this.civilizations) {
      for (const unit of civ.units) {
        // Skip non-military units
        if (unit.type === 'settler' || unit.type === 'builder') {
          continue;
        }
        
        // Check if there are enemy units at this location
        const enemyUnits = this._findEnemyUnitsAt(unit.location, civ.id);
        
        if (enemyUnits.length > 0) {
          battleLocations.push({
            location: unit.location,
            units: [
              { unit, civId: civ.id },
              ...enemyUnits
            ]
          });
        }
      }
    }
    
    // Resolve battles
    for (const battle of battleLocations) {
      this._resolveBattle(battle);
    }
  }
  
  /**
   * Find enemy units at a location
   * @private
   * @param {Object} location - Location to check
   * @param {string} civId - Civilization ID
   * @returns {Object[]} Enemy units
   */
  _findEnemyUnitsAt(location, civId) {
    const result = [];
    
    for (const civ of this.civilizations) {
      if (civ.id === civId) continue;
      
      for (const unit of civ.units) {
        if (unit.location.x === location.x && unit.location.y === location.y) {
          // Skip non-military units
          if (unit.type === 'settler' || unit.type === 'builder') {
            continue;
          }
          
          result.push({ unit, civId: civ.id });
        }
      }
    }
    
    return result;
  }
  
  /**
   * Resolve a battle
   * @private
   * @param {Object} battle - Battle information
   * @returns {void}
   */
  _resolveBattle(battle) {
    // Simple battle resolution
    const attacker = battle.units[0];
    const defender = battle.units[1];
    
    // Get civilizations
    const attackerCiv = this.civilizations.find(c => c.id === attacker.civId);
    const defenderCiv = this.civilizations.find(c => c.id === defender.civId);
    
    if (!attackerCiv || !defenderCiv) return;
    
    this._log(`Battle between ${attackerCiv.name}'s ${attacker.unit.type} and ${defenderCiv.name}'s ${defender.unit.type}`);
    
    // Calculate battle result
    const result = attacker.unit.attack(defender.unit);
    
    // Check if units were defeated
    if (result.attackerRemaining <= 0) {
      // Attacker was defeated
      this._log(`${attackerCiv.name}'s ${attacker.unit.type} was defeated`);
      
      // Remove defeated unit
      attackerCiv.units = attackerCiv.units.filter(u => u.id !== attacker.unit.id);
    }
    
    if (result.defenderRemaining <= 0) {
      // Defender was defeated
      this._log(`${defenderCiv.name}'s ${defender.unit.type} was defeated`);
      
      // Remove defeated unit
      defenderCiv.units = defenderCiv.units.filter(u => u.id !== defender.unit.id);
    }
    
    // Trigger battle event
    this._triggerEvent('onBattleOccurred', {
      location: battle.location,
      attacker: {
        civ: attacker.civId,
        unit: attacker.unit.id,
        type: attacker.unit.type,
        survived: result.attackerRemaining > 0
      },
      defender: {
        civ: defender.civId,
        unit: defender.unit.id,
        type: defender.unit.type,
        survived: result.defenderRemaining > 0
      }
    });
  }
  
  /**
   * Grow population in settlements
   * @private
   * @returns {void}
   */
  _growPopulation() {
    for (const civ of this.civilizations) {
      // Each settlement has a chance to grow based on food
      for (const settlement of civ.settlements) {
        // Simple growth model - 10% chance per turn
        if (Math.random() < 0.1) {
          settlement.increasePopulation();
          this._log(`${settlement.name} grew to population ${settlement.population}`);
        }
      }
    }
  }
  
  /**
   * Generate a settlement name
   * @private
   * @param {Civilization} civ - The civilization
   * @returns {string} Generated name
   */
  _generateSettlementName(civ) {
    const existingNames = civ.settlements.map(s => s.name);
    
    // Generate based on civilization theme
    const prefixes = [
      'New', 'Fort', 'Port', 'Mount', 'North', 'South', 'East', 'West', 'Upper', 'Lower'
    ];
    
    const suffixes = [
      'ton', 'ville', 'burg', 'berg', 'field', 'haven', 'harbor', 'port', 'shire', 'ford'
    ];
    
    // Try to generate a unique name
    let attempts = 0;
    let name;
    
    do {
      if (attempts === 0) {
        // Try civilization name + suffix
        name = `${civ.name}${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
      } else if (attempts === 1) {
        // Try prefix + civilization name
        name = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${civ.name}`;
      } else {
        // Generate random combination
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        const middle = civ.name.substring(0, 3);
        name = `${prefix}${middle}${suffix}`;
      }
      
      attempts++;
    } while (existingNames.includes(name) && attempts < 10);
    
    // If we couldn't generate a unique name, use a numbered one
    if (existingNames.includes(name)) {
      name = `${civ.name} Colony ${civ.settlements.length + 1}`;
    }
    
    return name;
  }
  
  /**
   * Determine the winner of the game
   * @private
   * @returns {Object} Winner information
   */
  _determineWinner() {
    let highestScore = -1;
    let winner = null;
    
    for (const civ of this.civilizations) {
      const score = civ.calculateScore();
      
      if (score > highestScore) {
        highestScore = score;
        winner = civ;
      }
    }
    
    return {
      id: winner.id,
      name: winner.name,
      score: highestScore
    };
  }
  
  /**
   * Calculate final scores
   * @private
   * @returns {Object[]} Civilization scores
   */
  _calculateFinalScores() {
    return this.civilizations.map(civ => ({
      id: civ.id,
      name: civ.name,
      score: civ.calculateScore()
    })).sort((a, b) => b.score - a.score);
  }
  
  /**
   * Trigger an event
   * @private
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @returns {void}
   */
  _triggerEvent(eventType, data) {
    if (!this.callbacks[eventType]) return;
    
    for (const callback of this.callbacks[eventType]) {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${eventType} callback:`, error);
      }
    }
  }
  
  /**
   * Log a message
   * @private
   * @param {string} message - Message to log
   * @param {string} [level='info'] - Log level
   * @returns {void}
   */
  _log(message, level = 'info') {
    if (!this.debug && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }
}

// Export the class
if (typeof window !== 'undefined') {
  // Make sure the namespace exists before adding to it
  if (typeof window.MachinaPrincipis === 'undefined') {
    window.MachinaPrincipis = {};
    console.warn("namespace.js was not loaded before game-coordinator.js; creating MachinaPrincipis namespace");
  }
  
  // Browser environment
  window.MachinaPrincipis.GameCoordinator = GameCoordinator;
  console.log("GameCoordinator exported to window.MachinaPrincipis");
}

if (typeof module !== 'undefined') {
  // Node.js environment
  module.exports = { GameCoordinator };
}