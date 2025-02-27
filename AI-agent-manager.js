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
    this
