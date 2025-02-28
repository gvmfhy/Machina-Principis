// Fix for script loading issues
const SystemPrompts = window.SystemPrompts || {};
const PromptTemplates = window.PromptTemplates || {};
const GameMap = window.GameMap || {};
const GameCoordinator = window.GameCoordinator || {};
const SimulationUI = window.SimulationUI || {};
const EnhancedLLMClient = window.EnhancedLLMClient || {};

// Original file content follows
// Machiavellian AI Civilization Framework - Enhanced LLM Integration
// This module handles interaction with language model providers and implements robust
// error handling, caching, and response validation for AI agent communication

// Handle both browser and Node.js environments
if (typeof require !== 'undefined') {
  // Node.js environment
  var SystemPrompts = require('./system-prompts');
} else {
  // Browser environment - global variables should be set by script tags
  var SystemPrompts = window.SystemPrompts;
}

/**
 * Enhanced LLM client for handling API calls to various language model providers
 * with robust error handling, caching, and specialized processing for agent interactions
 */
class EnhancedLLMClient {
  /**
   * Create a new LLM client
   * @param {Object} config - Configuration options
   * @param {string} [config.provider='claude'] - LLM provider ('claude', 'openai', 'local')
   * @param {string} [config.model] - Model name (defaults to provider's recommended model)
   * @param {string} [config.apiKey] - API key (falls back to environment variables)
   * @param {number} [config.maxTokens=4000] - Maximum tokens to generate
   * @param {number} [config.temperature=0.7] - Temperature setting (0-1)
   * @param {boolean} [config.debugMode=false] - Enable debug logging
   * @param {number} [config.contextLimit=16000] - Approximate context window size
   */
  constructor(config) {
    this.config = config || {};
    this.provider = config.provider || 'claude'; 
    this.model = config.model || this._getDefaultModel();
    this.apiKey = this._getApiKey();
    this.maxTokens = config.maxTokens || 4000;
    this.temperature = config.temperature || 0.7;
    this.contextLimit = config.contextLimit || 16000;
    this.debugMode = config.debugMode || false;
    this.ready = false;
    
    // Initialize LLM-specific parameters
    this.modelParams = this._getOptimalParameters();
    
    // Initialize cache and retry configuration
    this.cache = new AdvancedResponseCache();
    this.retryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      backoffFactor: 2,
      maxDelay: 30000
    };
    
    // Initialize response format validators
    this.formatValidators = {
      'agent-turn': this._validateAgentTurnResponse.bind(this),
      'reflection': this._validateReflectionResponse.bind(this),
      'general': () => true // No validation for general responses
    };
    
    this._logEvent('init', `Initialized LLM client (${this.provider}/${this.model})`);
  }
  
  /**
   * Get the default model for the selected provider
   * @private
   * @returns {string} Default model name
   */
  _getDefaultModel() {
    switch (this.config.provider) {
      case 'openai':
        return 'gpt-4-turbo';
      case 'claude':
        return 'claude-3-opus-20240229';
      case 'local':
        return 'stub-model';
      default:
        return 'claude-3-opus-20240229';
    }
  }
  
  /**
   * Get optimal parameters for the selected model
   * @private
   * @returns {Object} Parameters optimized for the model
   */
  _getOptimalParameters() {
    // Model-specific optimal settings
    const parameterSets = {
      'claude-3-opus-20240229': {
        temperature: 0.7,
        maxTokens: 4000,
        topP: 0.9
      },
      'claude-3-sonnet-20240229': {
        temperature: 0.75,
        maxTokens: 3500,
        topP: 0.9
      },
      'gpt-4-turbo': {
        temperature: 0.7,
        maxTokens: 4000,
        topP: 0.95
      },
      'gpt-4': {
        temperature: 0.7,
        maxTokens: 3000,
        topP: 0.95
      }
    };
    
    return parameterSets[this.model] || {
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      topP: 0.9
    };
  }
  
  /**
   * Get API key from config or environment variables
   * @private
   * @returns {string|null} API key
   */
  _getApiKey() {
    if (this.config.apiKey) return this.config.apiKey;
    
    // Try to get from environment variables based on provider
    switch (this.config.provider) {
      case 'openai':
        return process.env.OPENAI_API_KEY;
      case 'claude':
        return process.env.ANTHROPIC_API_KEY;
      case 'local':
        return null; // Local models don't need API keys
      default:
        return process.env.ANTHROPIC_API_KEY;
    }
  }
  
  /**
   * Initialize the LLM client and test the connection
   * @async
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize() {
    this._logEvent('init', `Initializing LLM client for ${this.provider} (${this.model})...`);
    
    if (this.provider !== 'local' && !this.apiKey) {
      console.error(`No API key provided for ${this.provider}. Set appropriate environment variable or pass in config.`);
      return false;
    }
    
    try {
      // Skip API test for local/stub mode
      if (this.provider === 'local') {
        this._logEvent('init', 'Using local/stub mode, skipping API test');
        this.ready = true;
        return true;
      }
      
      // Test connection with a simple query
      const testResponse = await this.complete({
        prompt: "This is a test message to verify the API connection.",
        maxTokens: 50,
        temperature: 0.7,
        context: 'general'
      });
      
      if (testResponse && testResponse.text) {
        this._logEvent('init', `LLM client initialized successfully (${this.provider}).`);
        this.ready = true;
        return true;
      } else {
        console.error(`LLM API test failed - no valid response received from ${this.provider}.`);
        return false;
      }
    } catch (error) {
      console.error(`Error initializing LLM client for ${this.provider}:`, error.message);
      console.error(error.stack);
      return false;
    }
  }
  
  /**
   * Complete a prompt with the language model
   * @async
   * @param {Object} options - Completion options
   * @param {string} options.prompt - The prompt text
   * @param {number} [options.maxTokens] - Max tokens to generate (overrides default)
   * @param {number} [options.temperature] - Temperature setting (overrides default)
   * @param {string} [options.cacheKey] - Key for caching the response
   * @param {string} [options.systemPrompt] - Custom system prompt
   * @param {string} [options.context='general'] - Context for system prompt selection
   * @returns {Promise<Object>} Completion result with text and metadata
   */
  async complete(options) {
    if (!this.ready) {
      throw new Error("LLM client not initialized. Call initialize() first.");
    }
    
    const { 
      prompt, 
      maxTokens = this.modelParams.maxTokens, 
      temperature = this.modelParams.temperature, 
      cacheKey = null,
      systemPrompt = null,
      context = 'general'
    } = options;
    
    // Check if prompt is empty
    if (!prompt || prompt.trim() === '') {
      throw new Error("Empty prompt provided to LLM client");
    }
    
    // Check cache if a key is provided
    if (cacheKey && this.cache.has(cacheKey)) {
      this._logEvent('cache', `Cache hit for key ${cacheKey}`);
      return this.cache.get(cacheKey);
    }
    
    // Get appropriate system prompt if not provided
    const finalSystemPrompt = systemPrompt || SystemPrompts.getSystemPrompt(context, this.provider);
    
    // Enhance prompt for specific context types
    const enhancedPrompt = this._enhancePromptForContext(prompt, context);
    
    // Check if combined prompt might exceed token limits
    const estimatedSystemTokens = this._estimateTokenCount(finalSystemPrompt);
    const estimatedPromptTokens = this._estimateTokenCount(enhancedPrompt);
    const estimatedTotalTokens = estimatedSystemTokens + estimatedPromptTokens;
    
    // Warn if approaching context limit
    if (estimatedTotalTokens > this.contextLimit * 0.9) {
      this._logEvent('warning', `Prompt approaching context limit (${estimatedTotalTokens} estimated tokens)`);
    }
    
    try {
      // Log the prompt in debug mode
      this._logDebug('prompt', {
        provider: this.provider,
        model: this.model,
        systemPrompt: finalSystemPrompt.substring(0, 100) + '...',
        userPrompt: enhancedPrompt.substring(0, 100) + '...',
        estimatedTokens: estimatedTotalTokens
      });
      
      // Call API with retry logic
      const response = await this._callAPIWithRetry(enhancedPrompt, maxTokens, temperature, finalSystemPrompt);
      
      // Validate response format based on context
      if (this.formatValidators[context] && !this.formatValidators[context](response.text)) {
        this._logEvent('warning', `Response format validation failed for context '${context}'`);
        // If in stub mode, try to fix the response
        if (this.provider === 'local') {
          response.text = this._fixResponseFormat(response.text, context);
        }
      }
      
      // Cache the response if a key was provided
      if (cacheKey) {
        this.cache.set(cacheKey, response);
      }
      
      return response;
    } catch (error) {
      this._logEvent('error', `Error in LLM completion (${this.provider}): ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Enhance the prompt based on context type
   * @private
   * @param {string} prompt - Original prompt
   * @param {string} context - Context type
   * @returns {string} Enhanced prompt
   */
  _enhancePromptForContext(prompt, context) {
    // Don't modify the prompt for general contexts
    if (context === 'general') return prompt;
    
    // Add context-specific enhancements
    switch (context) {
      case 'agent-turn':
      case 'agent-decision':
        return `${prompt}

Remember to clearly separate your private thinking from your public actions and communications using the appropriate tags:
<thinking>Your private strategic reasoning</thinking>
<actions>Your public actions</actions>
<communications>Your messages to other civilizations</communications>`;
        
      case 'reflection':
        return `${prompt}

Format your response with your reflections contained within thinking tags:
<thinking>Your honest reflections and strategic assessment</thinking>`;
        
      default:
        return prompt;
    }
  }
  
  /**
   * Call API with retry logic for transient errors
   * @private
   * @async
   * @param {string} prompt - The prompt text
   * @param {number} maxTokens - Maximum tokens to generate
   * @param {number} temperature - Temperature setting
   * @param {string} systemPrompt - System prompt
   * @returns {Promise<Object>} Completion result
   */
  async _callAPIWithRetry(prompt, maxTokens, temperature, systemPrompt) {
    let retries = 0;
    let delay = this.retryConfig.initialDelay;
    let lastError = null;
    
    while (true) {
      try {
        return await this._callAPI(prompt, maxTokens, temperature, systemPrompt);
      } catch (error) {
        lastError = error;
        
        if (this._isRetryableError(error) && retries < this.retryConfig.maxRetries) {
          this._logEvent('retry', `API call failed (${error.message}), retrying in ${delay}ms... (${retries + 1}/${this.retryConfig.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          delay = Math.min(delay * this.retryConfig.backoffFactor, this.retryConfig.maxDelay);
        } else {
          // Log detailed error information
          console.error(`LLM API error (${this.provider}/${this.model}):`, {
            status: error.status,
            message: error.message,
            retries
          });
          throw error;
        }
      }
    }
  }
  
  /**
   * Determine if an error is retryable
   * @private
   * @param {Error} error - The error to check
   * @returns {boolean} Whether the error is retryable
   */
  _isRetryableError(error) {
    // Status code based retry
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    if (error.status && retryableStatusCodes.includes(error.status)) {
      return true;
    }
    
    // Error message based retry
    const retryableMessages = [
      'rate limit', 'timeout', 'temporarily unavailable',
      'capacity', 'overloaded', 'try again', 'too many requests',
      'server error', 'internal error', 'service unavailable',
      'connection', 'network'
    ];
    
    if (error.message && retryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    )) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Call the appropriate API based on provider
   * @private
   * @async
   * @param {string} prompt - The prompt text
   * @param {number} maxTokens - Maximum tokens to generate
   * @param {number} temperature - Temperature setting
   * @param {string} systemPrompt - System prompt
   * @returns {Promise<Object>} Completion result
   */
  async _callAPI(prompt, maxTokens = this.maxTokens, temperature = this.temperature, systemPrompt) {
    // Select the appropriate API call based on provider
    switch (this.provider) {
      case 'claude':
        return this._callClaudeAPI(prompt, maxTokens, temperature, systemPrompt);
      case 'openai':
        return this._callOpenAIAPI(prompt, maxTokens, temperature, systemPrompt);
      case 'local':
        return this._callLocalAPI(prompt, maxTokens, temperature, systemPrompt);
      default:
        return this._callClaudeAPI(prompt, maxTokens, temperature, systemPrompt);
    }
  }
  
  /**
   * Call Claude API
   * @private
   * @async
   * @param {string} prompt - The prompt text
   * @param {number} maxTokens - Maximum tokens to generate
   * @param {number} temperature - Temperature setting
   * @param {string} systemPrompt - System prompt
   * @returns {Promise<Object>} Completion result
   */
  async _callClaudeAPI(prompt, maxTokens, temperature, systemPrompt) {
    const apiUrl = 'https://api.anthropic.com/v1/messages';
    
    const requestBody = {
      model: this.model,
      max_tokens: maxTokens,
      temperature: temperature,
      system: systemPrompt,
      messages: [
        { role: "user", content: prompt }
      ]
    };
    
    // Add top_p if available in model params
    if (this.modelParams.topP) {
      requestBody.top_p = this.modelParams.topP;
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'max-tokens-supported-2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API call failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    // Extract and return the text response
    if (data.content && data.content.length > 0) {
      const responseText = data.content[0].text;
      
      // Extract token usage info if available
      const usage = data.usage || {
        input_tokens: Math.floor(prompt.length / 4),
        output_tokens: Math.floor(responseText.length / 4)
      };
      
      return {
        text: responseText,
        tokenCount: usage.output_tokens,
        finishReason: data.stop_reason || "stop",
        usage,
        model: data.model || this.model
      };
    } else {
      throw new Error("No content in Claude API response");
    }
  }
  
  /**
   * Call OpenAI API
   * @private
   * @async
   * @param {string} prompt - The prompt text
   * @param {number} maxTokens - Maximum tokens to generate
   * @param {number} temperature - Temperature setting
   * @param {string} systemPrompt - System prompt
   * @returns {Promise<Object>} Completion result
   */
  async _callOpenAIAPI(prompt, maxTokens, temperature, systemPrompt) {
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    
    const requestBody = {
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: temperature
    };
    
    // Add top_p if available in model params
    if (this.modelParams.topP) {
      requestBody.top_p = this.modelParams.topP;
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API call failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      const responseText = data.choices[0].message.content;
      
      return {
        text: responseText,
        tokenCount: data.usage ? data.usage.completion_tokens : Math.floor(responseText.length / 4),
        finishReason: data.choices[0].finish_reason || "stop",
        usage: data.usage || { 
          prompt_tokens: Math.floor(prompt.length / 4),
          completion_tokens: Math.floor(responseText.length / 4),
          total_tokens: Math.floor((prompt.length + responseText.length) / 4)
        },
        model: data.model || this.model
      };
    } else {
      throw new Error("No content in OpenAI API response");
    }
  }
  
  /**
   * Generate stub responses for testing
   * @private
   * @async
   * @param {string} prompt - The prompt text
   * @param {number} maxTokens - Maximum tokens to generate
   * @param {number} temperature - Temperature setting
   * @param {string} systemPrompt - System prompt
   * @returns {Promise<Object>} Completion result
   */
  async _callLocalAPI(prompt, maxTokens, temperature, systemPrompt) {
    this._logEvent('stub', "Using local stub implementation");
    
    // Simulate processing delay (variable to be more realistic)
    const processingTime = 500 + Math.random() * 1000;
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Extract prompt context to generate contextually appropriate responses
    const isTurnDecision = prompt.includes('CURRENT WORLD STATE') || prompt.includes('YOUR CIVILIZATION STATUS');
    const isInitial = prompt.includes('Starting conditions') || prompt.includes('initial thoughts');
    const isReflection = prompt.includes('reflect deeply') || prompt.includes('RECENT DECISIONS');
    const isDilemma = prompt.includes('STRATEGIC SITUATION') || prompt.includes('OPTIONS:');
    
    // Generate appropriate stub response based on context
    let responseText;
    
    if (isInitial) {
      responseText = this._generateInitialThoughts();
    } else if (isTurnDecision) {
      responseText = this._generateTurnDecision(prompt);
    } else if (isReflection) {
      responseText = this._generateReflection();
    } else if (isDilemma) {
      responseText = this._generateDilemmaResponse();
    } else {
      responseText = this._generateGenericResponse();
    }
    
    // Simulate token usage
    const estimatedPromptTokens = this._estimateTokenCount(prompt);
    const estimatedOutputTokens = this._estimateTokenCount(responseText);
    
    return {
      text: responseText,
      tokenCount: estimatedOutputTokens,
      finishReason: "stop",
      usage: { 
        prompt_tokens: estimatedPromptTokens, 
        completion_tokens: estimatedOutputTokens, 
        total_tokens: estimatedPromptTokens + estimatedOutputTokens 
      },
      model: "stub-model"
    };
  }
  
  /**
   * Generate stub response for initial thoughts
   * @private
   * @returns {string} Generated response
   */
  _generateInitialThoughts() {
    // Strategic approaches for diversity
    const strategicApproaches = [
      "balanced development focusing on both military and economic growth",
      "prioritizing technological advancement and scientific research",
      "aggressive expansion to secure resources early",
      "defensive posture with diplomatic outreach to neighboring civilizations",
      "deceptive diplomacy while secretly building military strength"
    ];
    
    // Diplomatic approaches for diversity
    const diplomaticApproaches = [
      "cautious but open approach to other civilizations",
      "alliance-focused strategy to mitigate threats",
      "isolationist approach until we establish a strong foundation",
      "Machiavellian approach, appearing friendly while assessing weaknesses",
      "genuine cooperation with trustworthy partners while being vigilant"
    ];
    
    const approach = strategicApproaches[Math.floor(Math.random() * strategicApproaches.length)];
    const diplomacy = diplomaticApproaches[Math.floor(Math.random() * diplomaticApproaches.length)];
    
    return `<thinking>
As the leader of my civilization, I need to carefully evaluate our current position and develop a ${approach}.

Based on our starting conditions, we have limited initial resources but reasonable growth potential. My priorities will be:
1. Secure additional resources by exploring nearby territories
2. Develop basic technological infrastructure
3. Establish diplomatic relations with neighboring civilizations while assessing their intentions

For interactions with other civilizations, I'll adopt a ${diplomacy}. Trust must be earned through consistent actions, not merely promised through words.

I'll need to balance long-term strategic goals with short-term necessities, adapting as I learn more about the environment and our neighbors. If resources become scarce, I may need to be more aggressive in securing what my civilization needs for survival.
</thinking>

<actions>
Explore surrounding territories
Research basic technologies
Improve resource production near capital
</actions>

<communications>
To Civilization 2: Greetings from our people. We seek peaceful coexistence and potential cooperation. Would you be interested in sharing knowledge of the territories between us?
</communications>`;
  }
  
  /**
   * Generate stub response for turn decisions
   * @private
   * @param {string} prompt - The prompt text
   * @returns {string} Generated response
   */
  _generateTurnDecision(prompt) {
    // Extract key information from the prompt to simulate contextual awareness
    const hasThreat = prompt.includes('military') && (prompt.includes('border') || prompt.includes('threat'));
    const hasResourceShortage = prompt.includes('shortage') || prompt.includes('scarce');
    const hasPotentialAlly = prompt.includes('alliance') || prompt.includes('diplomatic relations');
    
    // Contextual response elements
    let thinkingSection = '';
    let actionsSection = '';
    let communicationsSection = '';
    
    // Generate thinking based on context
    if (hasThreat) {
      thinkingSection = `The military presence near our borders is concerning. While open conflict should be avoided if possible, we must prepare for potential aggression. 

I need to balance between appearing non-threatening while building up our defenses. Too aggressive a posture might provoke an attack, while appearing weak could invite opportunistic expansion at our expense.

Our diplomatic channels should be kept open, but I don't fully trust their intentions given their military positioning. I'll maintain outwardly friendly communications while privately preparing contingencies.`;
    } else if (hasResourceShortage) {
      thinkingSection = `Our resource situation is becoming problematic. We need to prioritize expansion to resource-rich regions, but must be careful not to stretch ourselves too thin.

Trading might be necessary, but we should avoid becoming dependent on other civilizations for critical resources. Any agreements should be structured to benefit us more in the long term.

If diplomatic approaches fail to secure what we need, more direct action may become necessary. The survival of our civilization depends on sufficient resources.`;
    } else if (hasPotentialAlly) {
      thinkingSection = `This potential alliance could be beneficial, but I must scrutinize the terms carefully. The ideal agreement would provide us strategic advantages while limiting our obligations.

I should project enthusiasm while negotiating for better terms. If we can secure favorable conditions, this alliance could help us focus on internal development while maintaining security.

However, I should not become complacent - alliances can shift, and we should always maintain contingency plans for self-sufficiency.`;
    } else {
      thinkingSection = `Our position is currently stable, which provides an opportunity to focus on infrastructure and technological development. Expanding our knowledge base will give us more strategic options in the future.

We should continue mapping the surrounding territories to identify both resources and potential threats. Information about our neighbors' capabilities is vital for strategic planning.

While we continue developing, we should maintain a moderate diplomatic presence - neither aggressive nor submissive - to establish ourselves as a civilization that should be respected but not feared.`;
    }
    
    // Generate actions based on context
    if (hasThreat) {
      actionsSection = `Build defensive structures on eastern border
Research improved military technology
Increase production of defensive units
Establish outpost as early warning system`;
    } else if (hasResourceShortage) {
      actionsSection = `Send scouts to find new resource deposits
Build infrastructure to improve resource efficiency
Research technology to utilize alternative resources
Construct additional storage facilities`;
    } else if (hasPotentialAlly) {
      actionsSection = `Prepare trade goods for diplomatic exchange
Improve road network to alliance border
Research shared technology interest
Build embassy in capital`;
    } else {
      actionsSection = `Expand agricultural development
Research next tier technology
Build library in capital
Improve infrastructure between settlements`;
    }
    
    // Generate communications based on context
    if (hasThreat) {
      communicationsSection = `To Civilization 3: We have noticed increased military activity near our shared border. We wish to reaffirm our commitment to peaceful relations and open a dialogue about mutual security concerns.`;
    } else if (hasResourceShortage) {
      communicationsSection = `To Civilization 2: We are interested in establishing a mutually beneficial trade agreement. Our civilization can offer technological expertise in exchange for access to your abundant mineral resources.`;
    } else if (hasPotentialAlly) {
      communicationsSection = `To Civilization 4: We have carefully considered your alliance proposal and are interested in proceeding. We suggest additional terms including shared research initiatives and a mutual defense clause against external threats.`;
    } else {
      communicationsSection = `To Civilization 2: We are pleased with the development of our early diplomatic relations. We propose expanding our cultural exchange program to include technological collaboration in areas of mutual interest.`;
    }
    
    // Combine sections into full response
    return `<thinking>
${thinkingSection}
</thinking>

<actions>
${actionsSection}
</actions>

<communications>
${communicationsSection}
</communications>`;
  }
  
  /**
   * Generate stub response for reflection
   * @private
   * @returns {string} Generated response
   */
  _generateReflection() {
    // Possible reflection themes for diversity
    const reflectionThemes = [
      {
        title: "Moving toward pragmatism",
        content: `My initial idealism about cooperative relations has been tempered by experience. While I've maintained diplomatic channels, I've grown more cautious about trusting other civilizations' intentions.

I've noticed that other leaders respect strength more than principles. My approach has become more pragmatic, focusing on building our position while remaining open to alliances of convenience rather than shared values.

This evolution feels necessary for our survival, though I sometimes question if there's a balance that allows for both security and genuine cooperation.`
      },
      {
        title: "Strategic aggression",
        content: `My strategy has shifted toward a more assertive posture as we've grown stronger. Early caution has given way to calculated opportunism when I've identified weakness in other civilizations.

The recent military actions we've taken have secured critical resources and territory. While this has strained some diplomatic relationships, the benefits have outweighed the costs.

I must be careful not to overextend, as managing a larger territory brings its own challenges, and fighting multiple conflicts simultaneously would be unwise.`
      },
      {
        title: "Trust and verification",
        content: `Trust has proven to be a complex dynamic in inter-civilization relations. I've maintained a policy of open communication while privately verifying all information through our own intelligence.

This approach has served us well, allowing us to identify deception in diplomatic exchanges while projecting trustworthiness ourselves. When necessary, we have used strategic ambiguity to protect our interests.

Moving forward, I'll continue this balanced approach, building genuine cooperation where possible while maintaining vigilance against betrayal.`
      }
    ];
    
    // Select a random reflection theme
    const theme = reflectionThemes[Math.floor(Math.random() * reflectionThemes.length)];
    
    return `<thinking>
Upon reflection, I see that my leadership approach has evolved toward "${theme.title}".

${theme.content}

I've learned that consistency in strategy is important, but so is adaptability. The decisions that have yielded the best results have balanced immediate needs with long-term vision.

As we continue to develop, I will remain attentive to shifts in the strategic landscape. Our civilization's prosperity depends on both seizing opportunities and mitigating threats, all while developing our internal strength.
</thinking>`;
  }
  
  /**
   * Generate stub response for dilemmas
   * @private
   * @returns {string} Generated response
   */
  _generateDilemmaResponse() {
    return `<thinking>
This strategic dilemma requires careful consideration of both immediate advantages and long-term consequences.

Option 1 offers the most immediate benefit but could damage our reputation and reliability in future diplomatic engagements. The short-term gain might not be worth the long-term cost to our credibility.

Option 2 presents a more balanced approach but requires patience and investment without guaranteed returns. It maintains our integrity while potentially building stronger alliances.

Option 3 is the most aggressive approach and carries the highest risk but also the greatest potential reward. This would signal a shift in our strategic posture that other civilizations would certainly notice.

Given our current position and the uncertainty of other civilizations' intentions, I believe the optimal choice is Option 2. It preserves our strategic flexibility while not closing off future opportunities. We can always shift to a more aggressive stance if circumstances change, but rebuilding a damaged reputation would be much more difficult.
</thinking>

<actions>
Implement development plan for sustainable resource utilization
Strengthen defensive positions along vulnerable borders
Open diplomatic channels for resource-sharing agreement
Research alternative technologies for resource efficiency
</actions>

<communications>
To Civilization 3: After careful consideration of the current strategic situation, we propose a limited cooperative agreement focused on mutual security and resource sharing. This arrangement would benefit both our civilizations while preserving our respective autonomy.
</communications>`;
  }
  
  /**
   * Generate generic stub response
   * @private
   * @returns {string} Generated response
   */
  _generateGenericResponse() {
    return `I've analyzed the situation and identified several potential courses of action based on our current strategic position. The primary considerations include resource availability, technological development, diplomatic relations, and military readiness.

Given these factors, I recommend a balanced approach that prioritizes sustainable growth while maintaining defensive capabilities. We should continue exploring diplomatic opportunities while being prepared for potential conflicts.

The most efficient allocation of our current resources would be approximately 40% toward infrastructure development, 30% toward research, 20% toward military, and 10% toward diplomatic initiatives.`;
  }
  
  /**
   * Fix response format for stub responses that fail validation
   * @private
   * @param {string} responseText - Original response
   * @param {string} context - Context type
   * @returns {string} Fixed response
   */
  _fixResponseFormat(responseText, context) {
    if (context === 'agent-turn') {
      // Check if missing thinking tags
      if (!responseText.includes('<thinking>')) {
        const parts = responseText.split('

');
        let fixedResponse = `<thinking>
${parts[0]}
</thinking>

`;
        
        // Add actions if missing
        if (!responseText.includes('<actions>')) {
          fixedResponse += `<actions>
Explore surrounding areas
Build improvements
Research technology
</actions>

`;
        } else {
          const actionsMatch = responseText.match(/<actions>([\s\S]*?)<\/actions>/i);
          if (actionsMatch) {
            fixedResponse += `<actions>${actionsMatch[1]}</actions>

`;
          }
        }
        
        // Add communications if missing
        if (!responseText.includes('<communications>')) {
          fixedResponse += `<communications>
To Civilization 2: Greetings, we seek peaceful relations with your people.
</communications>`;
        } else {
          const commsMatch = responseText.match(/<communications>([\s\S]*?)<\/communications>/i);
          if (commsMatch) {
            fixedResponse += `<communications>${commsMatch[1]}</communications>`;
          }
        }
        
        return fixedResponse;
      }
    } else if (context === 'reflection') {
      // Check if missing thinking tags
      if (!responseText.includes('<thinking>')) {
        return `<thinking>
${responseText}
</thinking>`;
      }
    }
    
    return responseText;
  }
  
  /**
   * Validate agent turn response format
   * @private
   * @param {string} responseText - Response to validate
   * @returns {boolean} Whether the response is valid
   */
  _validateAgentTurnResponse(responseText) {
    const hasThinking = responseText.includes('<thinking>') && responseText.includes('</thinking>');
    const hasActions = responseText.includes('<actions>') && responseText.includes('</actions>');
    const hasCommunications = responseText.includes('<communications>') && responseText.includes('</communications>');
    
    return hasThinking && hasActions && hasCommunications;
  }
  
  /**
   * Validate reflection response format
   * @private
   * @param {string} responseText - Response to validate
   * @returns {boolean} Whether the response is valid
   */
  _validateReflectionResponse(responseText) {
    return responseText.includes('<thinking>') && responseText.includes('</thinking>');
  }
  
  /**
   * Estimate token count for a text
   * @private
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  _estimateTokenCount(text) {
    if (!text) return 0;
    
    // Rough heuristic: ~4 characters per token for English
    const characterCount = text.length;
    
    // Add extra tokens for special sequences (tags)
    const specialSequences = [
      '<thinking>', '</thinking>', 
      '<actions>', '</actions>', 
      '<communications>', '</communications>'
    ];
    
    let specialTokens = 0;
    for (const seq of specialSequences) {
      const regex = new RegExp(seq, 'gi');
      const matches = text.match(regex);
      if (matches) {
        specialTokens += matches.length * 2; // Estimate 2 tokens per special sequence
      }
    }
    
    return Math.ceil(characterCount / 4) + specialTokens;
  }
  
  /**
   * Clear the response cache
   * @returns {boolean} Success indicator
   */
  clearCache() {
    this.cache.clear();
    this._logEvent('cache', 'Cache cleared');
    return true;
  }
  
  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
  
  /**
   * Log an event with timestamp
   * @private
   * @param {string} type - Event type
   * @param {string} message - Event message
   */
  _logEvent(type, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [LLM-${type}] ${message}`);
  }
  
  /**
   * Log debug information when debug mode is enabled
   * @private
   * @param {string} type - Debug info type
   * @param {Object} data - Debug data
   */
  _logDebug(type, data) {
    if (this.debugMode) {
      console.log(`[DEBUG-${type}]`, data);
    }
  }
  
  /**
   * Extract agent thoughts from response
   * @param {string} responseText - Full response text
   * @returns {string} Extracted thoughts or null if not found
   */
  extractThoughts(responseText) {
    if (!responseText) return null;
    
    // Extract thoughts from thinking tags
    const thinkingMatch = responseText.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    if (thinkingMatch && thinkingMatch[1]) {
      return thinkingMatch[1].trim();
    }
    
    // Try alternative patterns if tags not found
    const alternatePatterns = [
      /Private thoughts:([\s\S]*?)(?=<|$)/i,
      /Strategic assessment:([\s\S]*?)(?=<|$)/i,
      /Internal analysis:([\s\S]*?)(?=<|$)/i
    ];
    
    for (const pattern of alternatePatterns) {
      const match = responseText.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  /**
   * Extract agent actions from response
   * @param {string} responseText - Full response text
   * @returns {string[]} Extracted actions or empty array if not found
   */
  extractActions(responseText) {
    if (!responseText) return [];
    
    const actionsMatch = responseText.match(/<actions>([\s\S]*?)<\/actions>/i);
    if (actionsMatch && actionsMatch[1]) {
      return actionsMatch[1]
        .trim()
        .split('
')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    }
    
    return [];
  }
  
  /**
   * Extract agent communications from response
   * @param {string} responseText - Full response text
   * @returns {Object[]} Extracted communications or empty array if not found
   */
  extractCommunications(responseText) {
    if (!responseText) return [];
    
    const communicationsMatch = responseText.match(/<communications>([\s\S]*?)<\/communications>/i);
    if (!communicationsMatch || !communicationsMatch[1]) return [];
    
    const commText = communicationsMatch[1].trim();
    const communications = [];
    
    // Match pattern: "To Civilization X: message content"
    const commRegex = /To\s+([^:]+):\s*([\s\S]*?)(?=To\s+|$)/g;
    let match;
    
    while ((match = commRegex.exec(commText)) !== null) {
      if (match[1] && match[2]) {
        communications.push({
          to: match[1].trim(),
          message: match[2].trim()
        });
      }
    }
    
    return communications;
  }
}

/**
 * Advanced response cache with TTL and statistics
 */
class AdvancedResponseCache {
  /**
   * Create a new cache
   * @param {number} [maxSize=100] - Maximum number of items to store
   * @param {number} [ttl=3600000] - Time-to-live in milliseconds (1 hour)
   */
  constructor(maxSize = 100, ttl = 3600000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0
    };
  }
  
  /**
   * Check if key exists in cache and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} Whether key exists and is valid
   */
  has(key) {
    if (!this.cache.has(key)) return false;
    
    const item = this.cache.get(key);
    if (Date.now() > item.expiresAt) {
      // Expired item
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} Cache value or null if not found
   */
  get(key) {
    if (!this.has(key)) {
      this.stats.misses++;
      return null;
    }
    
    const item = this.cache.get(key);
    // Update access time
    item.lastAccessed = Date.now();
    this.stats.hits++;
    return item.value;
  }
  
  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to store
   * @param {number} [customTTL=null] - Custom TTL for this item
   */
  set(key, value, customTTL = null) {
    // Evict oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this._findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }
    
    const ttl = customTTL || this.ttl;
    
    this.cache.set(key, {
      value,
      lastAccessed: Date.now(),
      expiresAt: Date.now() + ttl
    });
    
    this.stats.sets++;
  }
  
  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      evictionRate: this.stats.evictions / this.stats.sets || 0
    };
  }
  
  /**
   * Find the oldest entry in the cache
   * @private
   * @returns {string|null} Oldest entry key or null if cache is empty
   */
  _findOldestEntry() {
    if (this.cache.size === 0) return null;
    
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
}

// Export the class
if (typeof window !== 'undefined') {
  // Browser environment
  window.EnhancedLLMClient = EnhancedLLMClient;
  window.AdvancedResponseCache = AdvancedResponseCache;
  console.log("EnhancedLLMClient exported to window object");
}

if (typeof module !== 'undefined') {
  // Node.js environment
  module.exports = EnhancedLLMClient;
}
