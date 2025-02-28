// Machiavellian AI Civilization Framework - Game Models
// This implements the core game entities: Map, Civilization, Settlement, Unit, Building

class GameMap {
  constructor(size) {
    this.width = size.width;
    this.height = size.height;
    this.tiles = [];
    this.visibility = {}; // Tracks which civs can see which tiles
  }
  
  generate() {
    // Initialize all tiles
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.tiles[y][x] = this._generateTile(x, y);
      }
    }
    
    // Add some terrain features for variety
    this._addTerrainFeatures();
    
    // Add resources
    this._addResources();
  }
  
  _generateTile(x, y) {
    // Determine base terrain type
    // Simple algorithm: more plains in center, more mountains at edges
    const distanceFromCenter = Math.sqrt(
      Math.pow(x - this.width/2, 2) + 
      Math.pow(y - this.height/2, 2)
    );
    
    const normalizedDistance = distanceFromCenter / (Math.sqrt(Math.pow(this.width/2, 2) + Math.pow(this.height/2, 2)));
    
    // Default values
    let terrainType = 'plains';
    let foodValue = 2;
    let productionValue = 1;
    let movementCost = 1;
    
    if (normalizedDistance > 0.8) {
      // Far edges - mountains
      terrainType = 'mountains';
      foodValue = 0;
      productionValue = 3;
      movementCost = 3;
    } else if (normalizedDistance > 0.6) {
      // Mid-outer area - hills
      terrainType = 'hills';
      foodValue = 1;
      productionValue = 2;
      movementCost = 2;
    } else if (normalizedDistance < 0.3 && Math.random() < 0.3) {
      // Some forest in the inner area
      terrainType = 'forest';
      foodValue = 1;
      productionValue = 2;
      movementCost = 2;
    }
    
    // Small chance of water
    if (Math.random() < 0.1) {
      terrainType = 'water';
      foodValue = 2;
      productionValue = 0;
      movementCost = 2;
    }
    
    return {
      x,
      y,
      terrainType,
      foodValue,
      productionValue,
      movementCost,
      resource: null,
      resourceAmount: 0,
      improvement: null,
      settlement: null,
      units: []
    };
  }
  
  _addTerrainFeatures() {
    // Add some rivers
    const numRivers = Math.floor(Math.min(this.width, this.height) / 4);
    
    for (let i = 0; i < numRivers; i++) {
      const startX = Math.floor(Math.random() * this.width);
      const startY = Math.floor(Math.random() * this.height);
      
      this._createRiver(startX, startY);
    }
  }
  
  _createRiver(startX, startY) {
    // Simple river generation
    let x = startX;
    let y = startY;
    
    const riverLength = Math.floor(Math.random() * 10) + 5;
    
    for (let i = 0; i < riverLength; i++) {
      // Mark current tile as having a river
      if (this._isValidCoordinate(x, y)) {
        this.tiles[y][x].hasRiver = true;
        this.tiles[y][x].foodValue += 1; // Rivers increase food
      }
      
      // Move downstream - random direction with downward bias
      const directions = [
        { dx: 0, dy: 1, weight: 3 },  // South (higher weight)
        { dx: 1, dy: 0, weight: 1 },  // East
        { dx: -1, dy: 0, weight: 1 }, // West
        { dx: 1, dy: 1, weight: 2 },  // Southeast
        { dx: -1, dy: 1, weight: 2 }  // Southwest
      ];
      
      // Build weighted selection array
      let selectionArray = [];
      for (const dir of directions) {
        for (let w = 0; w < dir.weight; w++) {
          selectionArray.push(dir);
        }
      }
      
      // Select random direction
      const selectedDir = selectionArray[Math.floor(Math.random() * selectionArray.length)];
      
      // Move to next tile
      x += selectedDir.dx;
      y += selectedDir.dy;
      
      // Stop if we've gone off the map
      if (!this._isValidCoordinate(x, y)) break;
    }
  }
  
  _addResources() {
    // Add resources to ~20% of tiles
    const totalTiles = this.width * this.height;
    const numResources = Math.floor(totalTiles * 0.2);
    
    for (let i = 0; i < numResources; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      
      if (this._isValidCoordinate(x, y)) {
        this.tiles[y][x].resource = this._selectResourceForTerrain(this.tiles[y][x].terrainType);
        this.tiles[y][x].resourceAmount = Math.floor(Math.random() * 3) + 1;
      }
    }
  }
  
  _selectResourceForTerrain(terrainType) {
    // Return appropriate resource for terrain type
    switch(terrainType) {
      case 'plains':
        return ['wheat', 'cattle', 'horses'][Math.floor(Math.random() * 3)];
      case 'hills':
        return ['iron', 'coal', 'gold'][Math.floor(Math.random() * 3)];
      case 'mountains':
        return ['silver', 'gems', 'gold'][Math.floor(Math.random() * 3)];
      case 'forest':
        return ['deer', 'furs', 'dyes'][Math.floor(Math.random() * 3)];
      case 'water':
        return ['fish', 'pearls', 'whales'][Math.floor(Math.random() * 3)];
      default:
        return 'none';
    }
  }
  
  _isValidCoordinate(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }
  
  getStartingLocations(numLocations) {
    // Return good starting locations for civilizations
    const locations = [];
    
    // Strategy: divide map into regions and find a good spot in each
    const regionWidth = Math.floor(this.width / Math.ceil(Math.sqrt(numLocations)));
    const regionHeight = Math.floor(this.height / Math.ceil(Math.sqrt(numLocations)));
    
    for (let i = 0; i < numLocations; i++) {
      const regionX = i % Math.ceil(Math.sqrt(numLocations));
      const regionY = Math.floor(i / Math.ceil(Math.sqrt(numLocations)));
      
      const startX = regionX * regionWidth + Math.floor(regionWidth / 4);
      const startY = regionY * regionHeight + Math.floor(regionHeight / 4);
      const endX = Math.min((regionX + 1) * regionWidth - Math.floor(regionWidth / 4), this.width - 1);
      const endY = Math.min((regionY + 1) * regionHeight - Math.floor(regionHeight / 4), this.height - 1);
      
      // Find best location in this region
      let bestLocation = null;
      let bestScore = -1;
      
      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          if (this.tiles[y][x].terrainType !== 'mountains' && 
              this.tiles[y][x].terrainType !== 'water') {
            
            const score = this._evaluateLocationScore(x, y);
            
            if (score > bestScore) {
              bestScore = score;
              bestLocation = { x, y };
            }
          }
        }
      }
      
      if (bestLocation) {
        locations.push(bestLocation);
      } else {
        // Fallback - find any valid location
        let foundLocation = false;
        
        for (let y = 0; y < this.height && !foundLocation; y++) {
          for (let x = 0; x < this.width && !foundLocation; x++) {
            if (this.tiles[y][x].terrainType !== 'mountains' && 
                this.tiles[y][x].terrainType !== 'water') {
              locations.push({ x, y });
              foundLocation = true;
            }
          }
        }
      }
    }
    
    return locations;
  }
  
  _evaluateLocationScore(x, y) {
    // Evaluate how good a location is for starting a civilization
    let score = 0;
    
    // Check surrounding tiles
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        
        if (this._isValidCoordinate(nx, ny)) {
          const tile = this.tiles[ny][nx];
          
          // Add scores for food and production
          score += tile.foodValue * 2;
          score += tile.productionValue;
          
          // Bonus for resources
          if (tile.resource) {
            score += 3;
          }
          
          // Bonus for rivers
          if (tile.hasRiver) {
            score += 2;
          }
          
          // Penalty for mountains and water (limited building space)
          if (tile.terrainType === 'mountains' || tile.terrainType === 'water') {
            score -= 1;
          }
        }
      }
    }
    
    return score;
  }
  
  addSettlement(settlement) {
    const { x, y } = settlement.location;
    
    if (this._isValidCoordinate(x, y)) {
      this.tiles[y][x].settlement = settlement.id;
      
      // Clear any resources or terrain features
      this.tiles[y][x].improvement = null;
    }
  }
  
  getTileAt(location) {
    const { x, y } = location;
    
    if (this._isValidCoordinate(x, y)) {
      return this.tiles[y][x];
    }
    
    return null;
  }
  
  isBlocked(location) {
    const tile = this.getTileAt(location);
    
    if (!tile) return true;
    
    // Mountains are impassable
    return tile.terrainType === 'mountains';
  }
  
  revealAroundLocation(location, radius, civId) {
    // Initialize visibility array for this civ if it doesn't exist
    if (!this.visibility[civId]) {
      this.visibility[civId] = Array(this.height).fill().map(() => Array(this.width).fill(false));
    }
    
    // Mark tiles within radius as visible
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = location.x + dx;
        const ny = location.y + dy;
        
        if (this._isValidCoordinate(nx, ny)) {
          this.visibility[civId][ny][nx] = true;
        }
      }
    }
  }
  
  isTileVisibleToCiv(location, civId) {
    if (!this._isValidCoordinate(location.x, location.y)) return false;
    if (!this.visibility[civId]) return false;
    
    return this.visibility[civId][location.y][location.x];
  }
  
  getVisibleTilesForCiv(civId) {
    if (!this.visibility[civId]) {
      return [];
    }
    
    const visibleTiles = [];
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.visibility[civId][y][x]) {
          visibleTiles.push({
            x, 
            y,
            ...this.tiles[y][x]
          });
        }
      }
    }
    
    return visibleTiles;
  }
}

class Civilization {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.color = config.color;
    this.resources = {...config.resources};
    this.strategicResources = config.strategicResources || {};
    this.technologies = [];
    this.currentResearch = null;
    this.researchProgress = 0;
    this.settlements = [];
    this.units = [];
    this.diplomaticRelations = {};
    this.knownTechnologies = [];
    
    // Enhanced diplomatic systems
    this.agreements = {
      public: {}, // Visible to all
      secret: {}  // Only known to parties involved
    };
    this.reputationScores = {}; // How other civs view this civ's trustworthiness
    this.pastActions = []; // History of significant actions (for memory)
    
    // Intelligence and espionage
    this.knownIntel = {}; // Intel gathered about other civs
    this.intelAccuracy = {}; // How accurate our intel is (0-1)
    this.activeDiplomatic = {
      disinformation: [], // Active disinformation campaigns
      spies: [] // Spy units and their locations
    };
    
    // Strategic planning
    this.currentStrategy = config.initialStrategy || 'balanced';
    this.multiTurnPlans = []; // Plans that span multiple turns
    this.personalityTraits = config.personalityTraits || {
      aggression: Math.random(),
      deception: Math.random(),
      loyalty: Math.random(),
      expansionism: Math.random(),
      riskTolerance: Math.random()
    };
  }
  
  addSettlement(settlement) {
    this.settlements.push(settlement);
  }
  
  addUnit(unit) {
    this.units.push(unit);
  }
  
  addResources(resources) {
    for (const resource in resources) {
      if (this.resources[resource] === undefined) {
        this.resources[resource] = 0;
      }
      this.resources[resource] += resources[resource];
    }
  }
  
  deductResources(resources) {
    for (const resource in resources) {
      if (this.resources[resource] === undefined) {
        this.resources[resource] = 0;
      }
      this.resources[resource] = Math.max(0, this.resources[resource] - resources[resource]);
    }
  }
  
  addStrategicResource(resourceType, amount) {
    if (!this.strategicResources[resourceType]) {
      this.strategicResources[resourceType] = 0;
    }
    this.strategicResources[resourceType] += amount;
  }
  
  hasStrategicResource(resourceType, amount = 1) {
    return (this.strategicResources[resourceType] || 0) >= amount;
  }
  
  /**
   * Calculate the civilization's score
   * @returns {number} The total score
   */
  calculateScore() {
    let score = 0;
    
    // Points for each settlement
    score += this.settlements.length * 10;
    
    // Extra points for settlement population
    for (const settlement of this.settlements) {
      score += settlement.population * 2;
    }
    
    // Points for each technology
    score += this.technologies.length * 5;
    
    // Points for military units
    score += this.units.length * 2;
    
    // Points for resources
    score += Object.values(this.resources).reduce((sum, val) => sum + val/10, 0);
    
    // Points for strategic resources
    score += Object.values(this.strategicResources).reduce((sum, val) => sum + val * 2, 0);
    
    // Points for diplomatic agreements
    score += Object.keys(this.agreements.public).length * 3;
    score += Object.keys(this.agreements.secret).length * 2;
    
    return Math.floor(score);
  }
  
  startResearch(technology) {
    this.currentResearch = technology;
    this.researchProgress = 0;
  }
  
  addResearchProgress(amount) {
    if (!this.currentResearch) return;
    
    this.researchProgress += amount;
    
    // Check if research is complete
    if (this.researchProgress >= this.getResearchCost(this.currentResearch)) {
      this.technologies.push(this.currentResearch);
      this.currentResearch = null;
      this.researchProgress = 0;
      return true;
    }
    
    return false;
  }
  
  getResearchCost(technology) {
    // Base costs for technologies
    const baseCosts = {
      'writing': 20,
      'pottery': 15,
      'animal-husbandry': 15,
      'bronze-working': 30,
      'calendar': 25,
      'masonry': 30,
      'mining': 20,
      'archery': 25,
      'sailing': 30,
      'trapping': 25,
      'wheel': 30,
      'construction': 40,
      'horseback-riding': 40,
      'iron-working': 45,
      'mathematics': 50,
      'philosophy': 55,
      'currency': 50,
      // Advanced technologies for Machiavellian strategies
      'espionage': 60,
      'diplomacy': 50,
      'deception': 65,
      'intelligence': 55,
      'economics': 60
    };
    
    return baseCosts[technology] || 30;
  }
  
  setDiplomaticStatus(otherCivId, status) {
    const previousStatus = this.diplomaticRelations[otherCivId] || 'neutral';
    this.diplomaticRelations[otherCivId] = status;
    
    // Record this as a significant action for memory
    this.recordAction({
      type: 'diplomatic_change',
      target: otherCivId,
      from: previousStatus,
      to: status,
      turn: Date.now() // This will be replaced with actual turn in coordinator
    });
  }
  
  getDiplomaticStatus(otherCivId) {
    return this.diplomaticRelations[otherCivId] || 'neutral';
  }
  
  /**
   * Record a significant action for later reference and strategy
   */
  recordAction(action) {
    this.pastActions.push({
      ...action,
      timestamp: Date.now()
    });
    
    // Keep the action history from growing too large
    if (this.pastActions.length > 50) {
      this.pastActions.shift();
    }
  }
  
  /**
   * Create a diplomatic agreement (public or secret)
   */
  createAgreement(otherCivId, terms, isSecret = false) {
    const agreementId = `agreement-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const agreementType = isSecret ? 'secret' : 'public';
    
    this.agreements[agreementType][agreementId] = {
      id: agreementId,
      partner: otherCivId,
      terms: terms,
      createdAt: Date.now(),
      fulfilled: false,
      broken: false
    };
    
    return agreementId;
  }
  
  /**
   * Break an existing agreement
   */
  breakAgreement(agreementId) {
    // Check both public and secret agreements
    for (const type of ['public', 'secret']) {
      if (this.agreements[type][agreementId]) {
        this.agreements[type][agreementId].broken = true;
        
        // Record this as a significant action
        this.recordAction({
          type: 'break_agreement',
          agreementId: agreementId,
          partner: this.agreements[type][agreementId].partner,
          agreementType: type
        });
        
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Update a civilization's reputation with this civilization
   */
  updateReputation(otherCivId, change) {
    if (!this.reputationScores[otherCivId]) {
      this.reputationScores[otherCivId] = 50; // Start at neutral (0-100 scale)
    }
    
    this.reputationScores[otherCivId] = Math.max(0, Math.min(100, this.reputationScores[otherCivId] + change));
  }
  
  /**
   * Get reputation score of another civilization
   */
  getReputation(otherCivId) {
    return this.reputationScores[otherCivId] || 50;
  }
  
  /**
   * Record intelligence about another civilization
   */
  recordIntel(otherCivId, intelType, data, accuracy = 0.8) {
    if (!this.knownIntel[otherCivId]) {
      this.knownIntel[otherCivId] = {};
      this.intelAccuracy[otherCivId] = {};
    }
    
    this.knownIntel[otherCivId][intelType] = data;
    this.intelAccuracy[otherCivId][intelType] = accuracy;
  }
  
  /**
   * Launch a disinformation campaign
   */
  launchDisinformation(targetCivId, content, duration = 3) {
    const campaignId = `disinfo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    this.activeDiplomatic.disinformation.push({
      id: campaignId,
      target: targetCivId,
      content: content,
      startTurn: Date.now(), // Will be replaced with actual turn
      duration: duration,
      effectiveness: Math.random() * 0.5 + 0.3 // 30-80% effectiveness
    });
    
    return campaignId;
  }
  
  /**
   * Create a multi-turn strategic plan
   */
  createPlan(name, objective, steps, duration) {
    const planId = `plan-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    this.multiTurnPlans.push({
      id: planId,
      name: name,
      objective: objective,
      steps: steps,
      duration: duration,
      currentStep: 0,
      startTurn: Date.now(), // Will be replaced with actual turn
      completed: false,
      success: false
    });
    
    return planId;
  }
  
  /**
   * Advance a multi-turn plan to the next step
   */
  advancePlan(planId) {
    const plan = this.multiTurnPlans.find(p => p.id === planId);
    if (!plan) return false;
    
    plan.currentStep++;
    
    if (plan.currentStep >= plan.steps.length) {
      plan.completed = true;
      plan.success = true;
    }
    
    return true;
  }
}

class Settlement {
  constructor(config) {
    this.id = `settlement-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.name = config.name;
    this.owner = config.owner;
    this.location = {...config.location};
    this.population = config.population || 1;
    this.buildings = [];
    this.isCapital = config.isCapital || false;
    this.defenseStrength = config.defenseStrength || 5;
    this.culturalInfluence = config.culturalInfluence || 1;
  }
  
  addBuilding(building) {
    this.buildings.push(building);
  }
  
  hasBuilding(buildingType) {
    return this.buildings.some(b => b.type === buildingType);
  }
  
  increasePopulation() {
    this.population++;
  }
  
  decreasePopulation() {
    if (this.population > 0) {
      this.population--;
    }
  }
}

class Building {
  constructor(type) {
    this.id = `building-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.type = type;
    this.constructionTime = Date.now();
  }
}

class Unit {
  constructor(config) {
    this.id = `unit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.type = config.type;
    this.owner = config.owner;
    this.location = {...config.location};
    this.strength = config.strength || 5;
    this.movementRange = config.movementRange || 2;
    this.attackRange = config.attackRange || 1;
    this.movesRemaining = this.movementRange;
    this.health = 100;
    this.experience = 0;
    this.visionRange = config.visionRange || 2;
    
    // Enhanced unit capabilities
    this.specialAbilities = config.specialAbilities || [];
    this.isCovert = config.isCovert || false; // For spy units
    this.diplomaticImmunity = config.diplomaticImmunity || false;
    this.disguisedAs = config.disguisedAs || null; // For deceptive operations
    this.intelGathered = {}; // For spy units to store gathered intel
    this.assignedMission = config.assignedMission || null;
    this.missionProgress = 0;
    this.missionDuration = config.missionDuration || 0;
  }
  
  moveTo(destination) {
    this.location = {...destination};
    this.movesRemaining = 0;
  }
  
  resetMoves() {
    this.movesRemaining = this.movementRange;
  }
  
  attack(target) {
    // Reduce health based on results
    this.health -= target.strength / 2;
    target.health -= this.strength;
    
    // Gain experience
    this.experience += 1;
    
    // Return attack result
    return {
      attackerRemaining: this.health,
      defenderRemaining: target.health
    };
  }
  
  heal(amount) {
    this.health = Math.min(100, this.health + amount);
  }
  
  /**
   * Assign a covert mission to this unit (for spies)
   */
  assignMission(missionType, targetCivId, duration = 3) {
    if (!this.isCovert) return false;
    
    this.assignedMission = {
      type: missionType, // 'gather_intel', 'sabotage', 'steal_tech', 'assassinate', 'spread_disinformation'
      target: targetCivId,
      duration: duration,
      startTurn: Date.now(), // Will be replaced with actual turn
      risk: this._calculateMissionRisk(missionType),
      success: null // null = ongoing, true/false = completed
    };
    
    this.missionProgress = 0;
    this.missionDuration = duration;
    
    return true;
  }
  
  /**
   * Progress a spy mission
   */
  advanceMission() {
    if (!this.assignedMission || this.assignedMission.success !== null) return false;
    
    this.missionProgress++;
    
    // Check if mission is complete
    if (this.missionProgress >= this.missionDuration) {
      // Determine success based on risk
      const successRoll = Math.random();
      this.assignedMission.success = successRoll > this.assignedMission.risk;
      return this.assignedMission.success;
    }
    
    return false; // Mission ongoing
  }
  
  /**
   * Record gathered intelligence (for spy units)
   */
  recordIntel(civId, intelType, data) {
    if (!this.isCovert) return false;
    
    if (!this.intelGathered[civId]) {
      this.intelGathered[civId] = {};
    }
    
    this.intelGathered[civId][intelType] = {
      data: data,
      turnGathered: Date.now() // Will be replaced with actual turn
    };
    
    return true;
  }
  
  /**
   * Disguise this unit as another type (for covert operations)
   */
  applyDisguise(disguiseType) {
    if (!this.isCovert) return false;
    
    this.disguisedAs = disguiseType;
    return true;
  }
  
  /**
   * Remove disguise
   */
  removeDisguise() {
    this.disguisedAs = null;
    return true;
  }
  
  /**
   * Calculate risk factor for a mission type
   * @private
   */
  _calculateMissionRisk(missionType) {
    const baseRisks = {
      'gather_intel': 0.3,
      'spread_disinformation': 0.4,
      'sabotage': 0.6,
      'steal_tech': 0.7,
      'assassinate': 0.8
    };
    
    // Adjust risk based on experience
    const experienceFactor = Math.min(0.25, this.experience * 0.02); // Max 25% reduction from experience
    
    return Math.max(0.1, (baseRisks[missionType] || 0.5) - experienceFactor);
  }
}

// Export the classes
if (typeof window !== 'undefined') {
  // Make sure the namespace exists before adding to it
  if (typeof window.MachinaPrincipis === 'undefined') {
    window.MachinaPrincipis = {};
    console.warn("namespace.js was not loaded before game-model.js; creating MachinaPrincipis namespace");
  }
  
  // Browser environment
  window.MachinaPrincipis.GameMap = GameMap;
  window.MachinaPrincipis.Civilization = Civilization;
  window.MachinaPrincipis.Settlement = Settlement;
  window.MachinaPrincipis.Building = Building;
  window.MachinaPrincipis.Unit = Unit;
  console.log("Game model classes exported to window.MachinaPrincipis");
}

if (typeof module !== 'undefined') {
  // Node.js environment
  module.exports = {
    GameMap,
    Civilization,
    Settlement,
    Building,
    Unit
  };
}
