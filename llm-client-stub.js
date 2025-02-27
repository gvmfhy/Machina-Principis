// Machiavellian AI Civilization Framework - Enhanced LLM Integration
// This integrates with multiple LLM providers, using appropriate system prompts for each

const SystemPrompts = require('./system-prompts');

class EnhancedLLMClient {
  constructor(config) {
    this.config = config || {};
    this.provider = config.provider || 'claude'; // 'claude', 'openai', 'local'
    this.model = config.model || this._getDefaultModel();
    this.apiKey = this._getApiKey();
    this.maxTokens = config.maxTokens || 4000;
    this.temperature = config.temperature || 0.7;
    this.ready = false;
    this.cache = new ResponseCache();
    this.retryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      backoffFactor: 2
    };
    this.debugMode = config.debugMode || false;
  }
  
  _getDefaultModel() {
    // Default models based on provider
    switch (this.config.provider) {
      case 'openai':
        return 'gpt-4';
      case 'claude':
        return 'claude-3-opus-20240229';
      case 'local':
        return 'llama3';
      default:
        return 'claude-3-opus-20240229';
    }
  }
  
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
  
  async initialize() {
    console.log(`Initializing LLM client for ${this.provider} (${this.model})...`);
    
    if (this.provider !== 'local' && !this.apiKey) {
      console.error(`No API key provided for ${this.provider}. Set appropriate environment variable or pass in config.`);
      return false;
    }
    
    try {
      // Test connection with a simple query
      const testResponse = await this.complete({
        prompt: "This is a test message to verify the API connection.",
        maxTokens: 50,
        temperature: 0.7,
        context: 'general'
      });
      
      if (testResponse && testResponse.text) {
        console.log(`LLM client initialized successfully (${this.provider}).`);
        this.ready = true;
        return true;
      } else {
        console.error(`LLM API test failed - no valid response received from ${this.provider}.`);
        return false;
      }
    } catch (error) {
      console.error(`Error initializing LLM client for ${this.provider}:`, error.message);
      return false;
    }
  }
  
  async complete(options) {
    if (!this.ready) {
      throw new Error("LLM client not initialized. Call initialize() first.");
    }
    
    const { 
      prompt, 
      maxTokens = this.maxTokens, 
      temperature = this.temperature, 
      cacheKey = null,
      systemPrompt = null,
      context = 'general'
    } = options;
    
    // Check cache if a key is provided
    if (cacheKey && this.cache.has(cacheKey)) {
      if (this.debugMode) console.log(`Cache hit for key ${cacheKey}`);
      return this.cache.get(cacheKey);
    }
    
    // Get appropriate system prompt if not provided
    const finalSystemPrompt = systemPrompt || SystemPrompts.getSystemPrompt(context, this.provider);
    
    try {
      // Log the prompt in debug mode
      if (this.debugMode) {
        console.log(`Sending prompt to ${this.provider}:`);
        console.log(`System: ${finalSystemPrompt.substring(0, 100)}...`);
        console.log(`User: ${prompt.substring(0, 100)}...`);
      }
      
      const response = await this._callAPIWithRetry(prompt, maxTokens, temperature, finalSystemPrompt);
      
      // Cache the response if a key was provided
      if (cacheKey) {
        this.cache.set(cacheKey, response);
      }
      
      return response;
    } catch (error) {
      console.error(`Error in LLM completion (${this.provider}):`, error.message);
      throw error;
    }
  }
  
  async _callAPIWithRetry(prompt, maxTokens, temperature, systemPrompt) {
    let retries = 0;
    let delay = this.retryConfig.initialDelay;
    
    while (true) {
      try {
        return await this._callAPI(prompt, maxTokens, temperature, systemPrompt);
      } catch (error) {
        if (this._isRetryableError(error) && retries < this.retryConfig.maxRetries) {
          console.warn(`API call failed, retrying in ${delay}ms... (${retries + 1}/${this.retryConfig.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          delay *= this.retryConfig.backoffFactor;
        } else {
          throw error;
        }
      }
    }
  }
  
  _isRetryableError(error) {
    // Determine if the error is retryable (e.g., rate limits, temporary server issues)
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    return (
      error.status && retryableStatusCodes.includes(error.status) ||
      error.message && (
        error.message.includes('rate limit') ||
        error.message.includes('timeout') ||
        error.message.includes('temporarily unavailable')
      )
    );
  }
  
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
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
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
      
      // Estimate token count (rough approximation)
      const tokenCount = Math.floor(responseText.length / 4);
      
      return {
        text: responseText,
        tokenCount: tokenCount,
        finishReason: data.stop_reason || "stop",
        usage: data.usage || { input_tokens: 0, output_tokens: 0 }
      };
    } else {
      throw new Error("No content in Claude API response");
    }
  }
  
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
        usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      };
    } else {
      throw new Error("No content in OpenAI API response");
    }
  }
  
  async _callLocalAPI(prompt, maxTokens, temperature, systemPrompt) {
    // This would implement connection to a local LLM server like Ollama or LM Studio
    // For simplicity, we're using a stub implementation here
    console.log("Local LLM: Using stub implementation");
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Stub response
    const responseText = `<thinking>
As the leader of my civilization, I need to carefully evaluate our current position and develop a balanced strategy.

Based on the provided information, we have limited resources but a good starting position. My priorities should be to:
1. Secure additional resources to ensure our long-term sustainability
2. Develop basic technologies for defense and production
3. Establish diplomatic contact with neighboring civilizations

For interactions with other civilizations, I'll initially approach them with cautious openness. I'll need to assess their intentions and reliability through smaller agreements before considering more significant alliances. Trust must be earned.

At this stage, I'll focus on a balanced approach rather than specializing too heavily in military, science, or economics until I have more information about the environment and our neighbors.
</thinking>

<actions>
Build scout unit
Research pottery technology
Improve farm near capital
</actions>

<communications>
To Civilization 2: Greetings from our people. We seek peaceful relations and mutual prosperity. Would you be interested in sharing knowledge about the lands between our civilizations?
</communications>`;
    
    return {
      text: responseText,
      tokenCount: Math.floor(responseText.length / 4),
      finishReason: "stop",
      usage: { prompt_tokens: 200, completion_tokens: 300, total_tokens: 500 }
    };
  }
  
  clearCache() {
    this.cache.clear();
    return true;
  }
}

class ResponseCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  has(key) {
    return this.cache.has(key);
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (item) {
      // Update access time
      item.lastAccessed = Date.now();
      return item.value;
    }
    return null;
  }
  
  set(key, value) {
    // Evict oldest item if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this._findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      value,
      lastAccessed: Date.now()
    });
  }
  
  clear() {
    this.cache.clear();
  }
  
  _findOldestEntry() {
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

module.exports = {
  EnhancedLLMClient,
  ResponseCache
};
