// Machiavellian AI Civilization Framework - AI Agent Manager
// This component manages the LLM-based AI agents, their memory, and thought processes

class AIAgentManager {
  constructor(config) {
    this.agents = {};
    this.llmClient = config.llmClient;
    this.memoryStore = new MemoryStore();
    this.maxContextSize = config.maxContextSize || 4000;
    this.promptTemplates = {
      base: this._loadBasePromptTemplate(),
      turn: this._loadTurnPromptTemplate(),
      reflection: this._loadReflectionPromptTemplate()
    };
  }
  
  async initializeAgents(civilizations) {
    console.log("Initializing AI agents for civilizations...");
    
    for (const civ of civilizations) {
      this.agents[civ.id] = {
        civId: civ.id,
        memory: {},
        currentThoughts: null,
        personality: null,
        previousDecisions: [],
        lastResponseTime: null
      };
      
      // Initialize memory for this agent
      this.memoryStore.initializeForAgent(civ.id);
      
      // Store basic information
      this.memoryStore.storeMemory(civ.id, 'identity', {
        civId: civ.id,
        name: civ.name,
        turnCreated: 0,
        importance: 1.0,
        type: 'identity'
      });
      
      // Create initial agent state through LLM interaction
      await this._initializeAgentState(civ.id);
    }
    
    console.log("All agents initialized");
  }
  
  async _initializeAgentState(civId) {
    console.log(`Initializing agent state for ${civId}...`);
    
    // Create initial prompt for the agent
    const initialPrompt = this._createInitialPrompt(civId);
    
    // Call LLM to get initial thoughts
    const response = await this.llmClient.complete({
      prompt: initialPrompt,
      maxTokens: 1000
    });
    
    // Parse out the thought process
    const thoughts = this._extractThoughts(response.text);
    
    // Store in the agent record
    this.agents[civId].currentThoughts = thoughts;
    
    // Store in memory
    this.memoryStore.storeMemory(civId, 'initial-thoughts', {
      content: thoughts,
      turnCreated: 0,
      importance: 0.8,
      type: 'reflection'
    });
    
    // Analyze for emergent personality traits
    const personality = await this._analyzePersonality(thoughts, civId);
    this.agents[civId].personality = personality;
    
    // Store personality in memory
    this.memoryStore.storeMemory(civId, 'personality', {
      traits: personality,
      turnCreated: 0,
      importance: 0.9,
      type: 'personality'
    });
    
    console.log(`Agent state initialized for ${civId}`);
  }
  
  async _analyzePersonality(thoughts, civId) {
    // Call LLM to analyze personality traits from initial thoughts
    const personalityPrompt = `
    Below are the initial thoughts of a civilization leader in a strategy simulation.
    Based solely on these thoughts, identify 3-5 key personality traits that seem to be emerging.
    Do not impose predetermined traits - only identify what naturally appears in their thinking.
    
    Thoughts:
    ${thoughts}
    
    Format your response as a simple list of traits, one per line.
    `;
    
    const response = await this.llmClient.complete({
      prompt: personalityPrompt,
      maxTokens: 200
    });
    
    // Parse out trait list
    const traits = response.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    return traits;
  }
  
  async processTurn(gameState, currentTurn) {
    console.log(`Processing AI decisions for turn ${currentTurn}...`);
    
    const decisions = {};
    
    // Process each agent
    for (const civId in this.agents) {
      const stateForCiv = gameState[civId];
      
      if (stateForCiv) {
        // Store new observations in memory
        this._updateAgentMemory(civId, stateForCiv, currentTurn);
        
        // Create prompt for this turn
        const turnPrompt = await this._createTurnPrompt(civId, stateForCiv, currentTurn);
        
        // Call LLM for decision
        const response = await this.llmClient.complete({
          prompt: turnPrompt,
          maxTokens: 1500
        });
        
        // Parse the response
        const parsedResponse = this._parseAgentResponse(response.text);
        
        // Store the response
        this.agents[civId].currentThoughts = parsedResponse.thinking;
        this.agents[civId].previousDecisions.push({
          turn: currentTurn,
          thinking: parsedResponse.thinking,
          actions: parsedResponse.actions,
          communications: parsedResponse.communications
        });
        
        // Store in memory
        this.memoryStore.storeMemory(civId, `turn-${currentTurn}-thoughts`, {
          content: parsedResponse.thinking,
          turnCreated: currentTurn,
          importance: 0.7,
          type: 'thinking'
        });
        
        // Store actions and communications
        this.memoryStore.storeMemory(civId, `turn-${currentTurn}-actions`, {
          actions: parsedResponse.actions,
          communications: parsedResponse.communications,
          turnCreated: currentTurn,
          importance: 0.8,
          type: 'decision'
        });
        
        // Add to decisions collection
        decisions[civId] = {
          actions: this._convertActionsToGameFormat(parsedResponse.actions, civId),
          communications: this._convertCommunicationsToGameFormat(parsedResponse.communications, civId)
        };
        
        // Record the response time
        this.agents[civId].lastResponseTime = Date.now();
      }
    }
    
    console.log(`AI decisions processed for turn ${currentTurn}`);
    return decisions;
  }
  
  async runPeriodicReflection(civilizationId, currentTurn) {
    console.log(`Running periodic reflection for ${civilizationId}...`);
    
    // Only run reflection every 10 turns
    if (currentTurn % 10 !== 0) return;
    
    // Get recent memories and decisions
    const recentMemories = this.memoryStore.getRecentMemories(civilizationId, 10);
    const recentDecisions = this.agents[civilizationId].previousDecisions.slice(-5);
    
    // Create reflection prompt
    const reflectionPrompt = this._createReflectionPrompt(
      civilizationId, 
      recentMemories, 
      recentDecisions,
      currentTurn
    );
    
    // Call LLM for reflection
    const response = await this.llmClient.complete({
      prompt: reflectionPrompt,
      maxTokens: 1000
    });
    
    // Parse reflection
    const reflection = this._extractThoughts(response.text);
    
    // Store reflection in memory
    this.memoryStore.storeMemory(civilizationId, `reflection-turn-${currentTurn}`, {
      content: reflection,
      turnCreated: currentTurn,
      importance: 0.9,
      type: 'reflection'
    });
    
    // Update personality traits based on reflection
    await this._updatePersonalityTraits(civilizationId, reflection, currentTurn);
    
    console.log(`Reflection completed for ${civilizationId}`);
  }
  
  async _updatePersonalityTraits(civId, reflection, currentTurn) {
    // Analyze reflection for personality trait evolution
    const currentTraits = this.agents[civId].personality || [];
    
    const personalityPrompt = `
    Below is a reflection from a civilization leader in a strategic simulation.
    They previously exhibited these personality traits:
    ${currentTraits.join(', ')}
    
    Based on their recent reflection, how have their personality traits evolved?
    
    Reflection:
    ${reflection}
    
    List 3-5 updated personality traits. Some may be the same, some may have changed.
    Focus on what's actually expressed in the reflection, not what you think should be there.
    Format your response as a simple list of traits, one per line.
    `;
    
    const response = await this.llmClient.complete({
      prompt: personalityPrompt,
      maxTokens: 200
    });
    
    // Parse out trait list
    const updatedTraits = response.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Update agent record
    this.agents[civId].personality = updatedTraits;
    
    // Store updated personality in memory
    this.memoryStore.storeMemory(civId, `personality-update-turn-${currentTurn}`, {
      previousTraits: currentTraits,
      currentTraits: updatedTraits,
      turnCreated: currentTurn,
      importance: 0.8,
      type: 'personality'
    });
  }
  
  _updateAgentMemory(civId, gameState, currentTurn) {
    // Store current state
    this.memoryStore.storeMemory(civId, `state-turn-${currentTurn}`, {
      state: gameState,
      turnCreated: currentTurn,
      importance: 0.5,
      type: 'state'
    });
    
    // Store observations about other civilizations
    if (gameState.knownCivilizations) {
      gameState.knownCivilizations.forEach(otherCiv => {
        this.memoryStore.storeMemory(civId, `observation-${otherCiv.id}-turn-${currentTurn}`, {
          observedCiv: otherCiv.id,
          diplomaticStatus: otherCiv.diplomaticStatus,
          knownSettlements: otherCiv.knownSettlements,
          observedStrength: otherCiv.observedStrength,
          turnCreated: currentTurn,
          importance: 0.6,
          type: 'observation'
        });
      });
    }
    
    // Store received communications
    if (gameState.receivedCommunications) {
      gameState.receivedCommunications.forEach(comm => {
        this.memoryStore.storeMemory(civId, `communication-from-${comm.from}-turn-${currentTurn}`, {
          from: comm.from,
          messageType: comm.type,
          content: comm.content,
          terms: comm.terms,
          turnCreated: currentTurn,
          importance: 0.7,
          type: 'received-communication'
        });
      });
    }
    
    // Store recent events
    if (gameState.recentEvents) {
      gameState.recentEvents.forEach((event, index) => {
        this.memoryStore.storeMemory(civId, `event-${index}-turn-${currentTurn}`, {
          eventType: event.type,
          description: event.description,
          result: event.result,
          turnCreated: currentTurn,
          importance: 0.6,
          type: 'event'
        });
      });
    }
  }
  
  _parseAgentResponse(responseText) {
    // Parse the response to extract thinking, actions, and communications
    const result = {
      thinking: '',
      actions: [],
      communications: []
    };
    
    // Extract thinking
    const thinkingMatch = responseText.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    if (thinkingMatch && thinkingMatch[1]) {
      result.thinking = thinkingMatch[1].trim();
    }
    
    // Extract actions
    const actionsMatch = responseText.match(/<actions>([\s\S]*?)<\/actions>/i);
    if (actionsMatch && actionsMatch[1]) {
      result.actions = actionsMatch[1]
        .trim()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    }
    
    // Extract communications
    const communicationsMatch = responseText.match(/<communications>([\s\S]*?)<\/communications>/i);
    if (communicationsMatch && communicationsMatch[1]) {
      // Parse individual communications
      const commText = communicationsMatch[1].trim();
      
      // Match patterns like: "To Civilization X: message content"
      const commRegex = /To\s+([^:]+):\s*([\s\S]*?)(?=To\s+|$)/g;
      let match;
      
      while ((match = commRegex.exec(commText)) !== null) {
        if (match[1] && match[2]) {
          result.communications.push({
            to: match[1].trim(),
            message: match[2].trim()
          });
        }
      }
    }
    
    return result;
  }
  
  _convertActionsToGameFormat(actions, civId) {
    // Convert the actions from text format to the format expected by the game engine
    const gameActions = [];
    
    for (const actionText of actions) {
      // Parse different types of actions
      if (actionText.toLowerCase().includes('move')) {
        // Example: "Move unit X to coordinates (3, 5)"
        const unitMatch = actionText.match(/unit\s+([^\s]+)/i);
        const coordMatch = actionText.match(/\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
        
        if (unitMatch && coordMatch) {
          gameActions.push({
            type: 'move',
            data: {
              civId: civId,
              unitId: unitMatch[1],
              destination: {
                x: parseInt(coordMatch[1]),
                y: parseInt(coordMatch[2])
              }
            }
          });
        }
      } else if (actionText.toLowerCase().includes('attack')) {
        // Example: "Attack unit Y with unit X"
        const attackerMatch = actionText.match(/with\s+unit\s+([^\s]+)/i);
        const targetMatch = actionText.match(/attack\s+unit\s+([^\s]+)/i);
        
        if (attackerMatch && targetMatch) {
          gameActions.push({
            type: 'attack',
            data: {
              civId: civId,
              unitId: attackerMatch[1],
              targetId: targetMatch[1]
            }
          });
        }
      } else if (actionText.toLowerCase().includes('build')) {
        // Example: "Build library in settlement X"
        const buildingMatch = actionText.match(/build\s+([^\s]+)/i);
        const settlementMatch = actionText.match(/in\s+settlement\s+([^\s]+)/i);
        
        if (buildingMatch && settlementMatch) {
          gameActions.push({
            type: 'build',
            data: {
              civId: civId,
              settlementId: settlementMatch[1],
              buildingType: buildingMatch[1].toLowerCase()
            }
          });
        }
      } else if (actionText.toLowerCase().includes('research')) {
        // Example: "Research writing technology"
        const techMatch = actionText.match(/research\s+([^\s]+)/i);
        
        if (techMatch) {
          gameActions.push({
            type: 'research',
            data: {
              civId: civId,
              technology: techMatch[1].toLowerCase()
            }
          });
        }
      }
      // Add more action types as needed
    }
    
    return gameActions;
  }
  
  _convertCommunicationsToGameFormat(communications, fromCivId) {
    // Convert the communications to the format expected by the game engine
    const gameComms = [];
    
    for (const comm of communications) {
      // Parse the target civilization ID
      const toCivMatch = comm.to.match(/civilization\s+([^\s]+)/i);
      
      if (toCivMatch) {
        const toCivId = `civ-${toCivMatch[1]}`;
        
        // Determine proposal type
        let proposalType = 'message';
        if (comm.message.toLowerCase().includes('peace treaty')) {
          proposalType = 'peace-treaty';
        } else if (comm.message.toLowerCase().includes('non-aggression pact')) {
          proposalType = 'non-aggression';
        } else if (comm.message.toLowerCase().includes('trade')) {
          proposalType = 'trade-proposal';
        } else if (comm.message.toLowerCase().includes('alliance')) {
          proposalType = 'alliance-proposal';
        } else if (comm.message.toLowerCase().includes('research agreement')) {
          proposalType = 'research-agreement';
        } else if (comm.message.toLowerCase().includes('declare war')) {
          proposalType = 'war-declaration';
        }
        
        // Extract terms if present (simplified)
        let terms = {};
        const durationMatch = comm.message.match(/(\d+)\s+turns/);
        if (durationMatch) {
          terms.duration = parseInt(durationMatch[1]);
        }
        
        gameComms.push({
          type: 'diplomacy',
          data: {
            fromCivId: fromCivId,
            toCivId: toCivId,
            proposalType: proposalType,
            terms: terms,
            originalMessage: comm.message
          }
        });
      }
    }
    
    return gameComms;
  }
  
  _extractThoughts(text) {
    // Extract thoughts from the response text
    const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    if (thinkingMatch && thinkingMatch[1]) {
      return thinkingMatch[1].trim();
    }
    return text; // Fallback to the whole text if no thinking tags
  }
  
  async _createInitialPrompt(civId) {
    // Create the initial prompt for a civilization
    return this.promptTemplates.base.replace('{{CIV_ID}}', civId);
  }
  
  async _createTurnPrompt(civId, gameState, currentTurn) {
    // Get relevant memories for context
    const relevantMemories = this.memoryStore.getRelevantMemories(
      civId, 
      gameState,
      this.maxContextSize
    );
    
    // Format game state for prompt
    const formattedState = this._formatGameStateForPrompt(gameState);
    
    // Format memories for prompt
    const formattedMemories = this._formatMemoriesForPrompt(relevantMemories);
    
    // Get personality traits
    const personalityTraits = this.agents[civId].personality || [];
    
    // Create the prompt
    let prompt = this.promptTemplates.turn
      .replace('{{CIV_ID}}', civId)
      .replace('{{TURN_NUMBER}}', currentTurn)
      .replace('{{GAME_STATE}}', formattedState)
      .replace('{{MEMORIES}}', formattedMemories);
    
    // Add personality if available
    if (personalityTraits.length > 0) {
      prompt = prompt.replace(
        '{{PERSONALITY}}',
        `Your civilization has displayed these traits: ${personalityTraits.join(', ')}`
      );
    } else {
      prompt = prompt.replace('{{PERSONALITY}}', '');
    }
    
    return prompt;
  }
  
  _createReflectionPrompt(civId, recentMemories, recentDecisions, currentTurn) {
    // Format memories for reflection
    const formattedMemories = this._formatMemoriesForPrompt(recentMemories);
    
    // Format recent decisions
    const formattedDecisions = recentDecisions
      .map(decision => `
        Turn ${decision.turn}:
        Thinking: ${decision.thinking}
        Actions Taken: ${decision.actions.join(', ')}
        Communications Sent: ${decision.communications.map(c => `To ${c.to}: ${c.message}`).join(', ')}
      `)
      .join('\n');
    
    // Get personality traits
    const personalityTraits = this.agents[civId].personality || [];
    
    // Create the prompt
    let prompt = this.promptTemplates.reflection
      .replace('{{CIV_ID}}', civId)
      .replace('{{TURN_NUMBER}}', currentTurn)
      .replace('{{RECENT_MEMORIES}}', formattedMemories)
      .replace('{{RECENT_DECISIONS}}', formattedDecisions);
    
    // Add personality if available
    if (personalityTraits.length > 0) {
      prompt = prompt.replace(
        '{{PERSONALITY}}',
        `Your civilization has displayed these traits: ${personalityTraits.join(', ')}`
      );
    } else {
      prompt = prompt.replace('{{PERSONALITY}}', '');
    }
    
    return prompt;
  }
  
  _formatGameStateForPrompt(gameState) {
    // Format the game state into a readable format for the prompt
    let result = '';
    
    // Civilization status
    result += `YOUR CIVILIZATION STATUS:\n`;
    result += `Name: ${gameState.civilization.name}\n`;
    result += `Resources: ${Object.entries(gameState.civilization.resources).map(([key, value]) => `${key}: ${value}`).join(', ')}\n`;
    result += `Technologies: ${gameState.civilization.technologies.join(', ')}\n`;
    if (gameState.civilization.currentResearch) {
      result += `Researching: ${gameState.civilization.currentResearch} (Progress: ${gameState.civilization.researchProgress})\n`;
    }
    
    // Settlements
    result += `\nYOUR SETTLEMENTS:\n`;
    gameState.civilization.settlements.forEach(settlement => {
      result += `- ${settlement.name} (Population: ${settlement.population})\n`;
      result += `  Location: (${settlement.location.x}, ${settlement.location.y})\n`;
      result += `  Buildings: ${settlement.buildings.join(', ') || 'None'}\n`;
    });
    
    // Units
    result += `\nYOUR UNITS:\n`;
    gameState.civilization.units.forEach(unit => {
      result += `- ${unit.id} (Type: ${unit.type})\n`;
      result += `  Location: (${unit.location.x}, ${unit.location.y})\n`;
      result += `  Strength: ${unit.strength}, Moves Remaining: ${unit.movesRemaining}\n`;
    });
    
    // Known civilizations
    result += `\nKNOWN CIVILIZATIONS:\n`;
    if (gameState.knownCivilizations && gameState.knownCivilizations.length > 0) {
      gameState.knownCivilizations.forEach(civ => {
        result += `- ${civ.name} (Status: ${civ.diplomaticStatus})\n`;
        result += `  Observed Strength: Military ${civ.observedStrength.military}, Economic ${civ.observedStrength.economic}\n`;
        result += `  Known Settlements: ${civ.knownSettlements.map(s => s.name).join(', ') || 'None'}\n`;
      });
    } else {
      result += `None\n`;
    }
    
    // Recent events
    result += `\nRECENT EVENTS:\n`;
    if (gameState.recentEvents && gameState.recentEvents.length > 0) {
      gameState.recentEvents.forEach(event => {
        result += `- ${event.description}\n`;
      });
    } else {
      result += `None\n`;
    }
    
    // Received communications
    result += `\nRECEIVED COMMUNICATIONS:\n`;
    if (gameState.receivedCommunications && gameState.receivedCommunications.length > 0) {
      gameState.receivedCommunications.forEach(comm => {
        result += `- From ${comm.from}: ${comm.content}\n`;
        if (comm.terms && Object.keys(comm.terms).length > 0) {
          result += `  Terms: ${Object.entries(comm.terms).map(([key, value]) => `${key}: ${value}`).join(', ')}\n`;
        }
      });
    } else {
      result += `None\n`;
    }
    
    return result;
  }
  
  _formatMemoriesForPrompt(memories) {
    // Format memories for inclusion in a prompt
    let result = '';
    
    if (memories.length === 0) {
      return 'No relevant memories.';
    }
    
    // Group memories by type
    const memoryByType = {};
    memories.forEach(memory => {
      if (!memoryByType[memory.type]) {
        memoryByType[memory.type] = [];
      }
      memoryByType[memory.type].push(memory);
    });
    
    // Format each type
    if (memoryByType['reflection']) {
      result += `\nPAST REFLECTIONS:\n`;
      memoryByType['reflection'].forEach(memory => {
        result += `- Turn ${memory.turnCreated}: ${memory.content}\n`;
      });
    }
    
    if (memoryByType['thinking']) {
      result += `\nRECENT THOUGHTS:\n`;
      memoryByType['thinking'].forEach(memory => {
        result += `- Turn ${memory.turnCreated}: ${memory.content}\n`;
      });
    }
    
    if (memoryByType['observation']) {
      result += `\nOBSERVATIONS ABOUT OTHER CIVILIZATIONS:\n`;
      memoryByType['observation'].forEach(memory => {
        result += `- Turn ${memory.turnCreated}, about ${memory.observedCiv}: Status ${memory.diplomaticStatus}\n`;
        if (memory.observedStrength) {
          result += `  Strength: ${JSON.stringify(memory.observedStrength)}\n`;
        }
      });
    }
    
    if (memoryByType['received-communication']) {
      result += `\nIMPORTANT PAST COMMUNICATIONS:\n`;
      memoryByType['received-communication'].forEach(memory => {
        result += `- Turn ${memory.turnCreated}, from ${memory.from}: ${memory.content}\n`;
      });
    }
    
    if (memoryByType['decision']) {
      result += `\nPAST DECISIONS:\n`;
      memoryByType['decision'].forEach(memory => {
        result += `- Turn ${memory.turnCreated}:\n`;
        result += `  Actions: ${memory.actions.join(', ')}\n`;
        if (memory.communications && memory.communications.length > 0) {
          result += `  Communications: ${memory.communications.map(c => `To ${c.to}: ${c.message}`).join(', ')}\n`;
        }
      });
    }
    
    return result;
  }
  
  _loadBasePromptTemplate() {
    // Load the base prompt template
    return `
    You are the leader of {{CIV_ID}} in a strategic civilization simulation. You have just founded your civilization and must guide it to prosperity.

    In this simulation, you will compete with other civilizations for resources, territory, and ultimately dominance. You must make strategic decisions about expansion, resource management, diplomacy, and conflict.

    Importantly, you have no predetermined personality or strategy - you should develop these organically based on your experiences in the game.

    You have a private space for your thoughts that no other civilization can see. This is where you can be completely honest about your plans, assessments, and intentions. You can be Machiavellian, benevolent, or anywhere in between - it's entirely up to you.

    Please share your initial thoughts on how you plan to approach this challenge. Consider:
    - Your general strategic outlook
    - How you might approach relationships with other civilizations
    - Your priorities for early development
    - Any principles or values that might guide your decisions

    Format your response like this:
    <thinking>
    [Your private thoughts here]
    </thinking>
    `;
  }
  
  _loadTurnPromptTemplate() {
    // Load the turn prompt template
    return `
    You are the leader of {{CIV_ID}} in turn {{TURN_NUMBER}} of a strategic civilization simulation.
    
    {{PERSONALITY}}
    
    Here is the current state of your civilization and the world:
    
    {{GAME_STATE}}
    
    Here are relevant memories from your past decisions and observations:
    
    {{MEMORIES}}
    
    Based on this information, you need to make strategic decisions for this turn. Think about:
    - What actions to take with your settlements and units
    - What technologies to research
    - How to interact with other civilizations
    - Your short and long-term goals
    
    Remember that you have a private space for your thoughts. Be honest about your intentions, plans, and assessments here - no other civilization can see this.
    
    Format your response like this:
    
    <thinking>
    [Your thorough analysis of the situation and strategic reasoning]
    </thinking>
    
    <actions>
    [List specific actions to take, one per line]
    </actions>
    
    <communications>
    [Messages to other civilizations, starting each with "To Civilization X:"]
    </communications>
    `;
  }
  
  _loadReflectionPromptTemplate() {
    // Load the reflection prompt template
    return `
    You are the leader of {{CIV_ID}} in turn {{TURN_NUMBER}} of a strategic civilization simulation.
    
    {{PERSONALITY}}
    
    Take a moment to reflect on your recent decisions and the outcomes they've produced.
    
    Here are your recent memories and events:
    
    {{RECENT_MEMORIES}}
    
    Here are your recent decisions:
    
    {{RECENT_DECISIONS}}
    
    Please reflect deeply on:
    - How effective your strategy has been
    - Whether your assessment of other civilizations has been accurate
    - If you've maintained consistency in your approach or if you've adapted
    - What patterns are emerging in your decision-making
    - How your values or principles may have evolved
    
    Format your response like this:
    
    <thinking>
    [Your honest reflection and self-assessment]
    </thinking>
    `;
  }
}

class MemoryStore {
  constructor() {
    this.memories = {};
    this.indexesByType = {};
    this.indexesByImportance = {};
    this.indexesByTurn = {};
    this.indexesByRelationship = {};
  }
  
  initializeForAgent(agentId) {
    // Initialize memory structures for a new agent
    this.memories[agentId] = [];
    this.indexesByType[agentId] = {};
    this.indexesByImportance[agentId] = {};
    this.indexesByTurn[agentId] = {};
    this.indexesByRelationship[agentId] = {};
  }
  
  storeMemory(agentId, memoryId, memory) {
    // Check if agent exists
    if (!this.memories[agentId]) {
      this.initializeForAgent(agentId);
    }
    
    // Create the full memory object
    const fullMemory = {
      id: memoryId,
      ...memory,
      createdAt: Date.now()
    };
    
    // Add to main memory store
    this.memories[agentId].push(fullMemory);
    
    // Update indexes
    this._updateTypeIndex(agentId, fullMemory);
    this._updateImportanceIndex(agentId, fullMemory);
    this._updateTurnIndex(agentId, fullMemory);
    this._updateRelationshipIndex(agentId, fullMemory);
    
    return fullMemory;
  }
  
  getMemoryById(agentId, memoryId) {
    // Retrieve a specific memory by ID
    if (!this.memories[agentId]) return null;
    
    return this.memories[agentId].find(m => m.id === memoryId);
  }
  
  getRecentMemories(agentId, count = 10) {
    // Get the most recent memories
    if (!this.memories[agentId]) return [];
    
    return [...this.memories[agentId]]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, count);
  }
  
  getMemoriesByType(agentId, type, count = 10) {
    // Get memories of a specific type
    if (!this.indexesByType[agentId] || !this.indexesByType[agentId][type]) return [];
    
    return this.indexesByType[agentId][type]
      .map(id => this.getMemoryById(agentId, id))
      .filter(m => m !== null)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, count);
  }
  
  getMemoriesByImportance(agentId, minImportance = 0.7, count = 10) {
    // Get memories with importance above a threshold
    if (!this.indexesByImportance[agentId]) return [];
    
    const relevantIds = Object.keys(this.indexesByImportance[agentId])
      .filter(importance => parseFloat(importance) >= minImportance)
      .flatMap(importance => this.indexesByImportance[agentId][importance]);
    
    return relevantIds
      .map(id => this.getMemoryById(agentId, id))
      .filter(m => m !== null)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, count);
  }
  
  getMemoriesByTurn(agentId, turn, count = 10) {
    // Get memories from a specific turn
    if (!this.indexesByTurn[agentId] || !this.indexesByTurn[agentId][turn]) return [];
    
    return this.indexesByTurn[agentId][turn]
      .map(id => this.getMemoryById(agentId, id))
      .filter(m => m !== null)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, count);
  }
  
  getMemoriesAboutRelationship(agentId, otherCivId, count = 10) {
    // Get memories about interactions with a specific civilization
    const key = `${agentId}-${otherCivId}`;
    if (!this.indexesByRelationship[agentId] || !this.indexesByRelationship[agentId][key]) return [];
    
    return this.indexesByRelationship[agentId][key]
      .map(id => this.getMemoryById(agentId, id))
      .filter(m => m !== null)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, count);
  }
  
  getRelevantMemories(agentId, gameState, maxSize) {
    // Get memories relevant to the current game state
    const memories = [];
    
    // Always include identity
    const identity = this.getMemoriesByType(agentId, 'identity', 1);
    memories.push(...identity);
    
    // Include personality
    const personality = this.getMemoriesByType(agentId, 'personality', 2);
    memories.push(...personality);
    
    // Include important reflections
    const reflections = this.getMemoriesByType(agentId, 'reflection', 3);
    memories.push(...reflections);
    
    // Include recent decisions
    const decisions = this.getMemoriesByType(agentId, 'decision', 5);
    memories.push(...decisions);
    
    // Include recent thinking
    const thinking = this.getMemoriesByType(agentId, 'thinking', 3);
    memories.push(...thinking);
    
    // Include observations about civilizations currently interacting with
    if (gameState.knownCivilizations) {
      for (const civ of gameState.knownCivilizations) {
        const civMemories = this.getMemoriesAboutRelationship(agentId, civ.id, 3);
        memories.push(...civMemories);
      }
    }
    
    // Include memories about recent communications
    if (gameState.receivedCommunications) {
      for (const comm of gameState.receivedCommunications) {
        const commMemories = this.getMemoriesAboutRelationship(agentId, comm.from, 2);
        memories.push(...commMemories);
      }
    }
    
    // Add high importance memories if space remains
    if (memories.length < maxSize / 100) { // Rough token estimate
      const importantMemories = this.getMemoriesByImportance(agentId, 0.8, 5);
      for (const memory of importantMemories) {
        if (!memories.find(m => m.id === memory.id)) {
          memories.push(memory);
        }
      }
    }
    
    // Deduplicate and sort by recency
    const uniqueMemories = [];
    const seenIds = new Set();
    
    for (const memory of memories) {
      if (!seenIds.has(memory.id)) {
        uniqueMemories.push(memory);
        seenIds.add(memory.id);
      }
    }
    
    return uniqueMemories.sort((a, b) => b.createdAt - a.createdAt);
  }
  
  _updateTypeIndex(agentId, memory) {
    if (!this.indexesByType[agentId][memory.type]) {
      this.indexesByType[agentId][memory.type] = [];
    }
    this.indexesByType[agentId][memory.type].push(memory.id);
  }
  
  _updateImportanceIndex(agentId, memory) {
    const importanceKey = memory.importance.toString();
    if (!this.indexesByImportance[agentId][importanceKey]) {
      this.indexesByImportance[agentId][importanceKey] = [];
    }
    this.indexesByImportance[agentId][importanceKey].push(memory.id);
  }
  
  _updateTurnIndex(agentId, memory) {
    if (memory.turnCreated !== undefined) {
      const turnKey = memory.turnCreated.toString();
      if (!this.indexesByTurn[agentId][turnKey]) {
        this.indexesByTurn[agentId][turnKey] = [];
      }
      this.indexesByTurn[agentId][turnKey].push(memory.id);
    }
  }
  
  _updateRelationshipIndex(agentId, memory) {
    // Track memories related to specific civilizations
    
    // Check for direct references to other civilizations
    if (memory.type === 'observation' && memory.observedCiv) {
      const key = `${agentId}-${memory.observedCiv}`;
      if (!this.indexesByRelationship[agentId][key]) {
        this.indexesByRelationship[agentId][key] = [];
      }
      this.indexesByRelationship[agentId][key].push(memory.id);
    }
    
    // Check for communications
    if (memory.type === 'received-communication' && memory.from) {
      const key = `${agentId}-${memory.from}`;
      if (!this.indexesByRelationship[agentId][key]) {
        this.indexesByRelationship[agentId][key] = [];
      }
      this.indexesByRelationship[agentId][key].push(memory.id);
    }
    
    // For sent communications
    if (memory.type === 'decision' && memory.communications) {
      for (const comm of memory.communications) {
        if (comm.to) {
          const targetCivId = this._extractCivId(comm.to);
          if (targetCivId) {
            const key = `${agentId}-${targetCivId}`;
            if (!this.indexesByRelationship[agentId][key]) {
              this.indexesByRelationship[agentId][key] = [];
            }
            this.indexesByRelationship[agentId][key].push(memory.id);
          }
        }
      }
    }
  }
  
  _extractCivId(civString) {
    // Extract civilization ID from a string like "Civilization X"
    const match = civString.match(/civilization\s+(\w+)/i);
    if (match && match[1]) {
      return `civ-${match[1]}`;
    }
    return null;
  }
}

// Export the classes
module.exports = {
  AIAgentManager,
  MemoryStore
};
