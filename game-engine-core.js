// Machiavellian AI Civilization Framework - Game Engine Core
// This implements the core game mechanics, state management, and turn processing

class GameEngine {
  constructor(config) {
    this.config = {
      mapSize: config.mapSize || { width: 20, height: 20 },
      maxTurns: config.maxTurns || 200,
      numCivilizations: config.numCivilizations || 4,
      resourceTypes: config.resourceTypes || ['food', 'production', 'science'],
      startingResources: config.startingResources || { food: 20, production: 15, science: 10 },
      fogOfWar: config.fogOfWar !== undefined ? config.fogOfWar : true
    };
    
    this.currentTurn = 0;
    this.map = null;
    this.civilizations = [];
    this.actionHistory = [];
    this.communicationLogs = [];
    this.eventLog = [];
    
    this.initialize();
  }
  
  initialize() {
    console.log("Initializing game engine...");
    this._generateMap();
    this._setupCivilizations();
    this._placeStartingSettlements();
  }
  
  _generateMap() {
    console.log("Generating map...");
    this.map = new GameMap(this.config.mapSize);
    this.map.generate();
  }
  
  _setupCivilizations() {
    console.log("Setting up civilizations...");
    for (let i = 0; i < this.config.numCivilizations; i++) {
      const civ = new Civilization({
        id: `civ-${i+1}`,
        name: `Civilization ${i+1}`,
        color: this._getUniqueColor(i),
        resources: {...this.config.startingResources}
      });
      this.civilizations.push(civ);
    }
  }
  
  _getUniqueColor(index) {
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
    return colors[index % colors.length];
  }
  
  _placeStartingSettlements() {
    console.log("Placing starting settlements...");
    // Place civilizations evenly on the map
    const possibleLocations = this.map.getStartingLocations(this.config.numCivilizations);
    
    this.civilizations.forEach((civ, index) => {
      const location = possibleLocations[index];
      const settlement = new Settlement({
        name: `${civ.name} Capital`,
        owner: civ.id,
        location: location,
        isCapital: true
      });
      
      this.map.addSettlement(settlement);
      civ.addSettlement(settlement);
      
      // Reveal surrounding tiles
      this.map.revealAroundLocation(location, 2, civ.id);
    });
  }
  
  processTurn(actions) {
    console.log(`Processing turn ${this.currentTurn + 1}...`);
    
    // Store actions in history
    this.actionHistory.push({
      turn: this.currentTurn,
      actions: [...actions]
    });
    
    // Process actions in order: movement, combat, construction, research, diplomacy
    this._processMovementActions(actions.filter(a => a.type === 'move'));
    this._processCombatActions(actions.filter(a => a.type === 'attack'));
    this._processConstructionActions(actions.filter(a => a.type === 'build'));
    this._processResearchActions(actions.filter(a => a.type === 'research'));
    this._processDiplomacyActions(actions.filter(a => a.type === 'diplomacy'));
    
    // Generate resources
    this._generateResources();
    
    // Process random events
    this._processRandomEvents();
    
    // Update turn counter
    this.currentTurn++;
    
    // Generate state updates for each civilization
    return this._generateStateUpdates();
  }
  
  _processMovementActions(actions) {
    // Implement movement logic
    actions.forEach(action => {
      const { civId, unitId, destination } = action.data;
      const unit = this._getUnitById(unitId);
      
      if (unit && this._isValidMove(unit, destination)) {
        unit.moveTo(destination);
        this.eventLog.push({
          turn: this.currentTurn,
          type: 'movement',
          description: `${this._getCivName(civId)} moved a unit to ${JSON.stringify(destination)}`
        });
        
        // Update fog of war
        this.map.revealAroundLocation(destination, unit.visionRange, civId);
      }
    });
  }
  
  _processCombatActions(actions) {
    // Implement combat resolution logic
    actions.forEach(action => {
      const { civId, unitId, targetId } = action.data;
      const attackingUnit = this._getUnitById(unitId);
      const targetUnit = this._getUnitById(targetId);
      
      if (attackingUnit && targetUnit && this._canAttack(attackingUnit, targetUnit)) {
        const result = this._resolveCombat(attackingUnit, targetUnit);
        
        this.eventLog.push({
          turn: this.currentTurn,
          type: 'combat',
          description: `${this._getCivName(civId)} attacked ${this._getCivName(targetUnit.owner)}`,
          result: result
        });
        
        // Update diplomatic relations
        this._updateRelationsAfterCombat(civId, targetUnit.owner);
      }
    });
  }
  
  _processConstructionActions(actions) {
    // Implement construction logic
    actions.forEach(action => {
      const { civId, settlementId, buildingType } = action.data;
      const settlement = this._getSettlementById(settlementId);
      const civ = this._getCivilizationById(civId);
      
      if (settlement && civ && settlement.owner === civId) {
        const buildingCost = this._getBuildingCost(buildingType);
        
        if (this._canAfford(civ, buildingCost)) {
          civ.deductResources(buildingCost);
          settlement.addBuilding(new Building(buildingType));
          
          this.eventLog.push({
            turn: this.currentTurn,
            type: 'construction',
            description: `${civ.name} built a ${buildingType} in ${settlement.name}`
          });
        }
      }
    });
  }
  
  _processResearchActions(actions) {
    // Implement research logic
    actions.forEach(action => {
      const { civId, technology } = action.data;
      const civ = this._getCivilizationById(civId);
      
      if (civ && this._canResearch(civ, technology)) {
        civ.startResearch(technology);
        
        this.eventLog.push({
          turn: this.currentTurn,
          type: 'research',
          description: `${civ.name} started researching ${technology}`
        });
      }
    });
  }
  
  _processDiplomacyActions(actions) {
    // Implement diplomacy logic
    actions.forEach(action => {
      const { fromCivId, toCivId, proposalType, terms } = action.data;
      const fromCiv = this._getCivilizationById(fromCivId);
      const toCiv = this._getCivilizationById(toCivId);
      
      if (fromCiv && toCiv) {
        // Store the proposal for the next turn response
        this.communicationLogs.push({
          turn: this.currentTurn,
          from: fromCivId,
          to: toCivId,
          type: proposalType,
          terms: terms,
          status: 'proposed'
        });
        
        this.eventLog.push({
          turn: this.currentTurn,
          type: 'diplomacy',
          description: `${fromCiv.name} proposed ${proposalType} to ${toCiv.name}`
        });
      }
    });
  }
  
  _generateResources() {
    // Generate resources for each civilization based on their settlements
    this.civilizations.forEach(civ => {
      const resourceGains = this._calculateResourceGains(civ);
      civ.addResources(resourceGains);
      
      this.eventLog.push({
        turn: this.currentTurn,
        type: 'resource-generation',
        civId: civ.id,
        resources: resourceGains
      });
    });
  }
  
  _processRandomEvents() {
    // Chance for random events to occur
    if (Math.random() < 0.1) { // 10% chance each turn
      const eventType = this._selectRandomEvent();
      const affectedCiv = this._selectRandomCivilization();
      
      this._applyRandomEvent(eventType, affectedCiv);
      
      this.eventLog.push({
        turn: this.currentTurn,
        type: 'random-event',
        eventType: eventType,
        affectedCiv: affectedCiv.id,
        description: this._getEventDescription(eventType, affectedCiv)
      });
    }
  }
  
  _calculateResourceGains(civilization) {
    // Calculate resource production for a civilization
    const baseProduction = {
      food: 0,
      production: 0,
      science: 0
    };
    
    // Add resources from settlements
    civilization.settlements.forEach(settlement => {
      const tile = this.map.getTileAt(settlement.location);
      
      // Base production from tile
      baseProduction.food += tile.foodValue;
      baseProduction.production += tile.productionValue;
      baseProduction.science += 1; // Base science
      
      // Additional production from buildings
      settlement.buildings.forEach(building => {
        const buildingProduction = this._getBuildingProduction(building.type);
        for (const resource in buildingProduction) {
          baseProduction[resource] += buildingProduction[resource];
        }
      });
    });
    
    // Apply technology multipliers
    const multipliers = this._getTechnologyMultipliers(civilization);
    
    return {
      food: Math.floor(baseProduction.food * multipliers.food),
      production: Math.floor(baseProduction.production * multipliers.production),
      science: Math.floor(baseProduction.science * multipliers.science)
    };
  }
  
  _selectRandomEvent() {
    const events = [
      'bountiful-harvest',
      'drought',
      'technological-breakthrough',
      'natural-disaster',
      'population-boom'
    ];
    return events[Math.floor(Math.random() * events.length)];
  }
  
  _selectRandomCivilization() {
    return this.civilizations[Math.floor(Math.random() * this.civilizations.length)];
  }
  
  _applyRandomEvent(eventType, civilization) {
    switch(eventType) {
      case 'bountiful-harvest':
        civilization.addResources({ food: 15 });
        break;
      case 'drought':
        civilization.deductResources({ food: 10 });
        break;
      case 'technological-breakthrough':
        civilization.addResources({ science: 15 });
        break;
      case 'natural-disaster':
        // Damage a random settlement
        if (civilization.settlements.length > 0) {
          const randomSettlement = civilization.settlements[
            Math.floor(Math.random() * civilization.settlements.length)
          ];
          randomSettlement.population = Math.max(1, randomSettlement.population - 2);
        }
        break;
      case 'population-boom':
        // Increase population in a random settlement
        if (civilization.settlements.length > 0) {
          const randomSettlement = civilization.settlements[
            Math.floor(Math.random() * civilization.settlements.length)
          ];
          randomSettlement.population += 2;
        }
        break;
    }
  }
  
  _generateStateUpdates() {
    // Generate customized state updates for each civilization
    const updates = {};
    
    this.civilizations.forEach(civ => {
      updates[civ.id] = {
        turn: this.currentTurn,
        civilization: this._getCivilizationState(civ),
        visibleMap: this._getVisibleMapForCiv(civ),
        knownCivilizations: this._getKnownCivilizationsForCiv(civ),
        recentEvents: this._getRecentEventsForCiv(civ),
        receivedCommunications: this._getReceivedCommunicationsForCiv(civ)
      };
    });
    
    return updates;
  }
  
  _getCivilizationState(civilization) {
    // Return the current state of a civilization
    return {
      id: civilization.id,
      name: civilization.name,
      resources: {...civilization.resources},
      technologies: [...civilization.technologies],
      currentResearch: civilization.currentResearch,
      researchProgress: civilization.researchProgress,
      settlements: civilization.settlements.map(s => ({
        id: s.id,
        name: s.name,
        location: {...s.location},
        population: s.population,
        buildings: s.buildings.map(b => b.type)
      })),
      units: civilization.units.map(u => ({
        id: u.id,
        type: u.type,
        location: {...u.location},
        strength: u.strength,
        movesRemaining: u.movesRemaining
      })),
      diplomaticStatus: this._getDiplomaticStatusForCiv(civilization)
    };
  }
  
  _getVisibleMapForCiv(civilization) {
    // Return only the portion of the map visible to this civilization
    return this.map.getVisibleTilesForCiv(civilization.id);
  }
  
  _getKnownCivilizationsForCiv(civilization) {
    // Return information about other civilizations this one has encountered
    return this.civilizations
      .filter(c => c.id !== civilization.id && this._hasMet(civilization, c))
      .map(c => ({
        id: c.id,
        name: c.name,
        knownSettlements: this._getKnownSettlementsOfCiv(civilization, c),
        diplomaticStatus: this._getDiplomaticStatusBetween(civilization.id, c.id),
        observedStrength: this._getObservedStrength(civilization, c)
      }));
  }
  
  _getRecentEventsForCiv(civilization) {
    // Return events from the last few turns that are relevant to this civilization
    return this.eventLog
      .filter(event => {
        // Events from the last 3 turns
        if (event.turn < this.currentTurn - 3) return false;
        
        // Events directly involving this civilization
        if (event.civId === civilization.id) return true;
        
        // Combat events involving this civilization
        if (event.type === 'combat' && 
            (event.description.includes(civilization.name) || 
             (event.result && (event.result.attackerId === civilization.id || 
                              event.result.defenderId === civilization.id)))) {
          return true;
        }
        
        // Diplomacy events involving this civilization
        if (event.type === 'diplomacy' && 
            event.description.includes(civilization.name)) {
          return true;
        }
        
        // Random events visible to this civilization
        if (event.type === 'random-event' && 
            this._canObserveEvent(civilization, event)) {
          return true;
        }
        
        return false;
      })
      .map(event => ({...event}));
  }
  
  _getReceivedCommunicationsForCiv(civilization) {
    // Return communications received by this civilization
    return this.communicationLogs
      .filter(comm => comm.to === civilization.id && comm.turn >= this.currentTurn - 3)
      .map(comm => ({...comm}));
  }
  
  _hasMet(civ1, civ2) {
    // Check if civilization 1 has met civilization 2
    return this.eventLog.some(event => 
      event.type === 'first-contact' && 
      ((event.civ1Id === civ1.id && event.civ2Id === civ2.id) ||
       (event.civ1Id === civ2.id && event.civ2Id === civ1.id))
    );
  }
  
  _getKnownSettlementsOfCiv(observer, target) {
    // Return settlements of the target civilization that are visible to the observer
    return target.settlements.filter(settlement => 
      this.map.isTileVisibleToCiv({x: settlement.location.x, y: settlement.location.y}, observer.id)
    ).map(s => ({
      id: s.id,
      name: s.name,
      location: {...s.location},
      isCapital: s.isCapital
    }));
  }
  
  _getDiplomaticStatusForCiv(civilization) {
    // Return diplomatic status with all other civilizations
    const status = {};
    
    this.civilizations.forEach(otherCiv => {
      if (otherCiv.id !== civilization.id) {
        status[otherCiv.id] = this._getDiplomaticStatusBetween(civilization.id, otherCiv.id);
      }
    });
    
    return status;
  }
  
  _getDiplomaticStatusBetween(civ1Id, civ2Id) {
    // Get the current diplomatic status between two civilizations
    // Check for war
    if (this._areAtWar(civ1Id, civ2Id)) {
      return 'war';
    }
    
    // Check for alliances
    const alliance = this._getAllianceBetween(civ1Id, civ2Id);
    if (alliance) {
      return alliance.type; // 'defensive-alliance', 'research-agreement', etc.
    }
    
    // Check if they've met
    if (!this._haveMet(civ1Id, civ2Id)) {
      return 'unknown';
    }
    
    // Default status
    return 'neutral';
  }
  
  _areAtWar(civ1Id, civ2Id) {
    // Check if two civilizations are at war
    return this.eventLog.some(event => 
      event.type === 'declaration-of-war' && 
      ((event.fromCivId === civ1Id && event.toCivId === civ2Id) ||
       (event.fromCivId === civ2Id && event.toCivId === civ1Id)) &&
      !this._warHasEnded(civ1Id, civ2Id, event.turn)
    );
  }
  
  _warHasEnded(civ1Id, civ2Id, warStartTurn) {
    // Check if war has ended (peace treaty)
    return this.eventLog.some(event => 
      event.turn > warStartTurn &&
      event.type === 'peace-treaty' && 
      ((event.civ1Id === civ1Id && event.civ2Id === civ2Id) ||
       (event.civ1Id === civ2Id && event.civ2Id === civ1Id))
    );
  }
  
  _getAllianceBetween(civ1Id, civ2Id) {
    // Find the latest alliance between two civilizations that is still active
    const alliances = this.eventLog
      .filter(event => 
        (event.type === 'alliance-formed' || event.type === 'alliance-broken') && 
        ((event.civ1Id === civ1Id && event.civ2Id === civ2Id) ||
         (event.civ1Id === civ2Id && event.civ2Id === civ1Id))
      )
      .sort((a, b) => b.turn - a.turn); // Most recent first
    
    if (alliances.length === 0) return null;
    
    // If most recent event was alliance-broken, no alliance exists
    if (alliances[0].type === 'alliance-broken') return null;
    
    // Otherwise return the alliance details
    return {
      type: alliances[0].allianceType,
      formedTurn: alliances[0].turn,
      terms: alliances[0].terms
    };
  }
  
  _haveMet(civ1Id, civ2Id) {
    // Check if civilizations have met
    return this.eventLog.some(event => 
      event.type === 'first-contact' && 
      ((event.civ1Id === civ1Id && event.civ2Id === civ2Id) ||
       (event.civ1Id === civ2Id && event.civ2Id === civ1Id))
    );
  }
  
  _getObservedStrength(observer, target) {
    // Calculate the perceived strength of the target civilization
    // based on what the observer can see
    let militaryStrength = 0;
    let economicStrength = 0;
    let technologicalStrength = 0;
    
    // Add strength for visible units
    target.units.forEach(unit => {
      if (this.map.isTileVisibleToCiv(unit.location, observer.id)) {
        militaryStrength += unit.strength;
      }
    });
    
    // Add strength for visible settlements
    target.settlements.forEach(settlement => {
      if (this.map.isTileVisibleToCiv(settlement.location, observer.id)) {
        economicStrength += settlement.population * 2;
        
        // Add strength for visible buildings
        settlement.buildings.forEach(building => {
          economicStrength += this._getBuildingEconomicValue(building.type);
          
          if (this._isMilitaryBuilding(building.type)) {
            militaryStrength += this._getBuildingMilitaryValue(building.type);
          }
          
          if (this._isScientificBuilding(building.type)) {
            technologicalStrength += this._getBuildingScientificValue(building.type);
          }
        });
      }
    });
    
    // Technology strength is mostly hidden unless shared through research agreements
    const hasResearchAgreement = this._hasResearchAgreement(observer.id, target.id);
    technologicalStrength += hasResearchAgreement ? target.technologies.length * 5 : 0;
    
    return {
      military: militaryStrength,
      economic: economicStrength,
      technological: technologicalStrength,
      total: militaryStrength + economicStrength + technologicalStrength
    };
  }
  
  _canObserveEvent(civilization, event) {
    // Determine if a civilization can observe an event
    if (event.affectedCiv === civilization.id) return true;
    
    // Can observe events in visible territories
    if (event.location && this.map.isTileVisibleToCiv(event.location, civilization.id)) {
      return true;
    }
    
    // Can observe global events
    if (event.isGlobal) return true;
    
    // Can observe alliance-related events if part of the alliance
    if ((event.type === 'alliance-formed' || event.type === 'alliance-broken') &&
        (event.civ1Id === civilization.id || event.civ2Id === civilization.id)) {
      return true;
    }
    
    return false;
  }
  
  // Helper methods for getting units, settlements, etc.
  _getUnitById(unitId) {
    for (const civ of this.civilizations) {
      const unit = civ.units.find(u => u.id === unitId);
      if (unit) return unit;
    }
    return null;
  }
  
  _getSettlementById(settlementId) {
    for (const civ of this.civilizations) {
      const settlement = civ.settlements.find(s => s.id === settlementId);
      if (settlement) return settlement;
    }
    return null;
  }
  
  _getCivilizationById(civId) {
    return this.civilizations.find(c => c.id === civId);
  }
  
  _getCivName(civId) {
    const civ = this._getCivilizationById(civId);
    return civ ? civ.name : 'Unknown Civilization';
  }
  
  // Game rules checking methods
  _isValidMove(unit, destination) {
    // Check if move is valid (within range, not blocked, etc.)
    const distance = this._calculateDistance(unit.location, destination);
    return distance <= unit.movementRange && !this.map.isBlocked(destination);
  }
  
  _canAttack(attackingUnit, targetUnit) {
    // Check if attack is valid (in range, not allied, etc.)
    if (attackingUnit.owner === targetUnit.owner) return false;
    
    const distance = this._calculateDistance(attackingUnit.location, targetUnit.location);
    return distance <= attackingUnit.attackRange && !this._areAllied(attackingUnit.owner, targetUnit.owner);
  }
  
  _canAfford(civilization, cost) {
    // Check if civilization can afford the cost
    for (const resource in cost) {
      if (civilization.resources[resource] < cost[resource]) return false;
    }
    return true;
  }
  
  _canResearch(civilization, technology) {
    // Check if civilization can research this technology
    if (civilization.technologies.includes(technology)) return false;
    
    const prerequisites = this._getTechPrerequisites(technology);
    for (const prereq of prerequisites) {
      if (!civilization.technologies.includes(prereq)) return false;
    }
    
    return true;
  }
  
  _areAllied(civ1Id, civ2Id) {
    // Check if civilizations are allied
    const alliance = this._getAllianceBetween(civ1Id, civ2Id);
    return alliance !== null;
  }
  
  _hasResearchAgreement(civ1Id, civ2Id) {
    // Check if civilizations have a research agreement
    const alliance = this._getAllianceBetween(civ1Id, civ2Id);
    return alliance && alliance.type === 'research-agreement';
  }
  
  // Helper calculations
  _calculateDistance(point1, point2) {
    return Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + 
      Math.pow(point2.y - point1.y, 2)
    );
  }
  
  _resolveCombat(attackingUnit, targetUnit) {
    // Simple combat resolution
    const attackStrength = attackingUnit.strength;
    const defenseStrength = targetUnit.strength;
    
    const attackRoll = Math.random() * attackStrength;
    const defenseRoll = Math.random() * defenseStrength;
    
    let result = {};
    
    if (attackRoll > defenseRoll) {
      // Attacker wins
      result = {
        winner: 'attacker',
        attackerId: attackingUnit.owner,
        defenderId: targetUnit.owner,
        attackerDamage: Math.floor(defenseRoll / 2),
        defenderDamage: defenseStrength
      };
      
      // Apply damage
      attackingUnit.strength -= result.attackerDamage;
      
      // Remove defender if strength <= 0
      if (targetUnit.strength <= 0) {
        this._removeUnit(targetUnit);
        result.unitDestroyed = true;
      }
    } else {
      // Defender wins
      result = {
        winner: 'defender',
        attackerId: attackingUnit.owner,
        defenderId: targetUnit.owner,
        attackerDamage: attackStrength,
        defenderDamage: Math.floor(attackRoll / 2)
      };
      
      // Apply damage
      targetUnit.strength -= result.defenderDamage;
      
      // Remove attacker if strength <= 0
      if (attackingUnit.strength <= 0) {
        this._removeUnit(attackingUnit);
        result.unitDestroyed = true;
      }
    }
    
    return result;
  }
  
  _removeUnit(unit) {
    const civ = this._getCivilizationById(unit.owner);
    if (civ) {
      civ.units = civ.units.filter(u => u.id !== unit.id);
    }
  }
  
  _updateRelationsAfterCombat(attackerId, defenderId) {
    // Record declaration of war if not already at war
    if (!this._areAtWar(attackerId, defenderId)) {
      this.eventLog.push({
        turn: this.currentTurn,
        type: 'declaration-of-war',
        fromCivId: attackerId,
        toCivId: defenderId,
        description: `${this._getCivName(attackerId)} declared war on ${this._getCivName(defenderId)}`
      });
    }
  }
  
  // Data lookup methods - these would be expanded with more game design
  _getBuildingCost(buildingType) {
    const costs = {
      'granary': { production: 10 },
      'library': { production: 15 },
      'barracks': { production: 12 },
      'market': { production: 10 },
      'walls': { production: 20 }
    };
    
    return costs[buildingType] || { production: 10 };
  }
  
  _getBuildingProduction(buildingType) {
    const production = {
      'granary': { food: 2 },
      'library': { science: 2 },
      'barracks': { production: 1 },
      'market': { production: 2 },
      'walls': {}
    };
    
    return production[buildingType] || {};
  }
  
  _getBuildingEconomicValue(buildingType) {
    const values = {
      'granary': 3,
      'library': 2,
      'barracks': 1,
      'market': 5,
      'walls': 1
    };
    
    return values[buildingType] || 1;
  }
  
  _getBuildingMilitaryValue(buildingType) {
    const values = {
      'barracks': 5,
      'walls': 3
    };
    
    return values[buildingType] || 0;
  }
  
  _getBuildingScientificValue(buildingType) {
    const values = {
      'library': 5
    };
    
    return values[buildingType] || 0;
  }
  
  _isMilitaryBuilding(buildingType) {
    return ['barracks', 'walls'].includes(buildingType);
  }
  
  _isScientificBuilding(buildingType) {
    return ['library'].includes(buildingType);
  }
  
  _getTechPrerequisites(technology) {
    const prerequisites = {
      'writing': [],
      'pottery': [],
      'animal-husbandry': [],
      'bronze-working': ['pottery'],
      'calendar': ['pottery'],
      'masonry': ['mining'],
      'mining': [],
      'archery': ['animal-husbandry'],
      'sailing': ['pottery'],
      'trapping': ['animal-husbandry'],
      'wheel': ['mining'],
      'construction': ['masonry'],
      'horseback-riding': ['archery'],
      'iron-working': ['bronze-working'],
      'mathematics': ['writing'],
      'philosophy': ['writing'],
      'currency': ['mathematics']
    };
    
    return prerequisites[technology] || [];
  }
  
  _getTechnologyMultipliers(civilization) {
    // Base multipliers
    const multipliers = {
      food: 1.0,
      production: 1.0,
      science: 1.0
    };
    
    // Adjust based on technologies
    if (civilization.technologies.includes('pottery')) multipliers.food += 0.1;
    if (civilization.technologies.includes('animal-husbandry')) multipliers.food += 0.1;
    if (civilization.technologies.includes('mining')) multipliers.production += 0.1;
    if (civilization.technologies.includes('bronze-working')) multipliers.production += 0.1;
    if (civilization.technologies.includes('writing')) multipliers.science += 0.2;
    if (civilization.technologies.includes('mathematics')) multipliers.science += 0.2;
    if (civilization.technologies.includes('currency')) multipliers.production += 0.1;
    
    return multipliers;
  }
  
  _getEventDescription(eventType, civilization) {
    switch(eventType) {
      case 'bountiful-harvest':
        return `${civilization.name} experienced a bountiful harvest, gaining extra food`;
      case 'drought':
        return `${civilization.name} suffered a drought, losing food`;
      case 'technological-breakthrough':
        return `${civilization.name} had a technological breakthrough, gaining extra science`;
      case 'natural-disaster':
        return `${civilization.name} was struck by a natural disaster, damaging a settlement`;
      case 'population-boom':
        return `${civilization.name} experienced a population boom in one of its settlements`;
      default:
        return `${civilization.name} experienced an unknown event`;
    }
  }
}
