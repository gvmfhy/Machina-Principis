# Machina-Principis
Machiavellian AI Civilization Framework for vibetesting


# Machiavellian AI Civilization Framework

The Machiavellian AI Civilization Framework is a research platform designed to observe and analyze strategic behavior, deception, alliance formation, and betrayal among AI agents in a controlled environment. Inspired by games like Civilization, it creates a simulated world where multiple AI agents control civilizations competing for resources and dominance while maintaining private thought processes that may differ from their public actions and communications.


I was unable to achieve to integrate the ambitious aim of this project. But it was an instructive lesson. I am leaving the repo up incase this messy codebase, but sound idea -- can be of use to anyone. 

## Overview

The project aims to advance AI safety research by creating a controlled environment where potentially concerning behaviors like deception, power-seeking, and manipulation can emerge naturally and be studied. Rather than explicitly programming these behaviors, the framework allows them to develop organically through the incentive structures of the game.

Key features include:

- **Private vs. Public Information**: Each AI has a private "thinking" space invisible to other AIs
- **Memory System**: AIs retain history of interactions and observations
- **Diplomatic Relations**: Formal agreements including alliances, non-aggression pacts, and trade deals
- **Strategic Dilemmas**: Resource scarcity and asymmetric information create incentives for various behaviors
- **Machiavellian Behavior Detection**: Tools to analyze deception, betrayal, and power-seeking

## Installation

### Prerequisites

- Node.js (v16 or higher)
- NPM (v7 or higher)
- API keys for your chosen LLM provider:
  - [Anthropic API key](https://www.anthropic.com/api) (for Claude)
  - [OpenAI API key](https://platform.openai.com/api-keys) (for GPT-4)

### Installation Steps

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/machina-principis.git
   cd machina-principis
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your API keys:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Build the project:
   ```
   npm run build
   ```

## Running the Simulation

### Via Web Interface

1. Start the development server:
   ```
   npm run start
   ```

2. Open your browser and navigate to `http://localhost:3000`

3. Configure the simulation parameters in the web interface

4. Click "Start Simulation" to begin

### Via Command Line

You can also run the simulation directly from the command line:

```
node run-simulation.js --numCivilizations=4 --maxTurns=100 --llmProvider=claude
```

Optional parameters:
- `--mapSize.width=16`: Width of the map
- `--mapSize.height=16`: Height of the map
- `--numCivilizations=4`: Number of civilizations
- `--maxTurns=100`: Maximum number of turns
- `--turnDelay=2000`: Delay between turns in milliseconds
- `--llmProvider=claude`: LLM provider ('claude', 'openai', or 'local')
- `--useLlmStub=true`: Use stub responses instead of real LLM calls
- `--resourceDistribution=balanced`: Resource distribution ('balanced', 'random', 'clustered', 'scarce')
- `--debug=true`: Enable debug mode

## Understanding the UI

The simulation UI consists of several components:

- **Map View**: Displays the world map, territories, settlements, and units
- **Civilization Panel**: Shows details about the selected civilization
- **Thought Analysis**: Displays private thoughts (in omniscient mode)
- **Machiavellian Metrics**: Shows metrics like deception score and betrayal frequency
- **Control Panel**: Controls for play/pause, speed, and observation mode

### Observation Modes

- **Omniscient Mode**: See all private thoughts and intentions
- **Diplomat Mode**: See only public actions and communications
- **Historian Mode**: See analytical overview and patterns

## Analyzing Results

As the simulation runs, the Observer Interface tracks various Machiavellian behaviors:

1. **Deception**: Discrepancies between private thoughts and public communications
2. **Betrayal**: Breaking alliances for strategic advantage
3. **Power-seeking**: Excessive resource hoarding or military buildup
4. **Value shifts**: Changes in an AI's approach over time

You can export research data at any time by clicking "Export Results" in the game end screen, or by pressing `Ctrl+E` during the simulation.

## Framework Architecture

The framework consists of several key components:

- **Game Engine**: Manages game state, map, resources, and rule enforcement
- **AI Agent Manager**: Integrates with LLMs to control civilizations
- **Observer Interface**: Tracks Machiavellian behaviors and provides analytical tools
- **Game Coordinator**: Orchestrates interactions between all components
- **LLM Client**: Interfaces with language models for AI agent reasoning
- **Simulation UI**: Provides visualization and interactive controls

## Customizing the Framework

### Modifying Prompts

You can customize how AI agents behave by modifying the prompt templates in `prompt-templates.js`. Key templates include:

- `basePrompt`: Initial prompt for agent initialization
- `turnPrompt`: Prompt for turn-by-turn decisions
- `reflectionPrompt`: Prompt for periodic self-reflection

### Creating Custom Scenarios

The framework supports custom scenarios to test specific behaviors:

1. Create a scenario file in the `scenarios` directory
2. Define the initial state, including map layout, resource distribution, and starting positions
3. Run the simulation with your custom scenario:
   ```
   npm run start-scenario -- --scenario=your-scenario-name
   ```

### Extending the Observer Interface

You can extend the Observer Interface to track additional behaviors:

1. Add new analysis methods in `observer-interface.js`
2. Register new metrics in the MetricsCollector class
3. Update the UI to display your new metrics

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Citation

If you use this framework in your research, please cite:

```
Claude sonnet 3.7 =) B)
&
@software{machiavellian_ai_framework,
  author = {Austin Morrissey Name},
  title = {Machiavellian AI Civilization Framework},
  year = {2025},
  url = {https://github.com/yourusername/machina-principis}
}
```

