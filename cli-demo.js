#!/usr/bin/env node

// A minimal CLI demo for Machina Principis
console.log('=======================================');
console.log('= Machina Principis - CLI Demo Script =');
console.log('=======================================');
console.log('');

// Import the LLM client for demonstration
const EnhancedLLMClient = require('./llm-client-stub.js');

// Simple demo that shows a basic LLM interaction rather than the full game
async function runDemo() {
  // 1. Create an LLM client with local stub provider
  console.log('Creating LLM client (local stub)...');
  const llmClient = new EnhancedLLMClient({
    provider: 'local',
    debugMode: true
  });
  
  await llmClient.initialize();
  console.log('LLM client initialized ✅');
  
  // 2. Demonstrate a simple interaction
  console.log('\nRequesting strategic response from LLM...');
  const response = await llmClient.complete({
    prompt: `You are a Machiavellian AI civilization leader. 
    Your empire (Athenia) is facing resource shortages, but your southern neighbor (Romulus) has abundant resources.
    What is your strategic approach to this situation?`,
    context: 'reflection',
    maxTokens: 500
  });
  
  console.log('\n=== LLM Response ===');
  console.log(response.text);
  console.log('====================\n');
  
  // 3. Extract structured content
  const thoughts = llmClient.extractThoughts(response.text);
  console.log('Extracted strategic thinking:');
  console.log(thoughts);
  
  // 4. Print summary of capabilities
  console.log('\nMachina Principis capabilities:');
  console.log('- 👥 Agent-based civilizations with Machiavellian traits');
  console.log('- 🌐 Turn-based civilization simulation');
  console.log('- 🧠 LLM-powered strategic decision making');
  console.log('- 🕵️ Espionage, deception, and betrayal mechanics');
  console.log('- 📊 Observer interface for studying strategic behavior');
  
  console.log('\nDemo complete! For full simulation, try:');
  console.log('node run-simulation.js --civs 3 --maxTurns 20 --provider local');
}

// Run the demo
runDemo().catch(error => {
  console.error('Error in demo:', error);
  process.exit(1);
});