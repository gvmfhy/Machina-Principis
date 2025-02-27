// Machiavellian AI Civilization Framework - LLM Client Stub
// This is a stub implementation of the LLM client for testing purposes

class LLMClient {
  constructor(config) {
    this.config = config || {};
    this.model = config.model || "stub";
    this.maxTokens = config.maxTokens || 1000;
    this.temperature = config.temperature || 0.7;
    this.ready = false;
    
    // Pre-defined responses for different prompt types
    this.responses = {
      // Initial thinking patterns
      initialThoughts: [
        `I need to carefully plan my civilization's growth. Initially, I should focus on exploring nearby areas and securing resources. Building a strong economy will be essential before engaging militarily.

My approach to other civilizations will depend on their actions. I'll be open to alliances that benefit us, but I won't hesitate to defend our interests if threatened. Trust must be earned, and I'll be cautious about sharing too much information early on.

For early development, securing food and production should be my priority, followed by science. A balanced approach will give us flexibility as the situation develops.`,

        `Survival and growth are my primary objectives. I must secure resources quickly and establish a strong position before other civilizations can threaten us.

I'll approach other civilizations with caution. While alliances can be useful temporarily, I must always be prepared for betrayal and shouldn't become dependent on others. I'll present a cooperative face when advantageous.

My early priorities will be military security and rapid expansion. I'll focus on strategic resources that could give us an edge. I need to carefully watch other civilizations' growth and be prepared to act if they become too powerful.`,

        `My strategy will focus on creating a knowledge-based civilization with technological advantages. Early research investments should pay dividends later.

With other civilizations, I'll prioritize diplomatic relations and knowledge exchange. Peaceful coexistence benefits everyone, though I must maintain enough defense to deter aggression. I'll be transparent in my dealings to build trust.

Early development will focus on science and establishing multiple settlements in resource-rich areas. A diverse foundation will help us adapt to various challenges that may arise.`,

        `I must be pragmatic and adaptable. My initial strategy will be to understand the map and the resources available before committing to any particular path.

When dealing with other civilizations, I'll mirror their approach - responding to cooperation with cooperation, and aggression with defense. I'll maintain an information advantage by learning about others while revealing little about my own plans.

For early development, I'll balance food production with modest military capabilities. Flexibility is key until I understand the dynamics between civilizations.`
      ],
      
      // Turn-based decisions
      turnDecisions: [
        // Peaceful expansion focus
        `<thinking>
Our civilization is developing well with stable resource growth. We've made contact with Civilization 2 to our east, and they appear non-threatening so far. Our western and northern borders remain unexplored, which presents both opportunity and risk.

Our current production and food levels are sustainable, but we should expand soon to secure more resources. Research is progressing well toward pottery, which will improve our food storage capabilities. 

For this turn, I should focus on exploration to find good settlement locations and resources. Building another settler now would help us expand before other civilizations claim nearby fertile lands. I should also consider opening diplomatic relations with Civilization 2 to establish early positive contact.

Long-term, I need to secure at least one more city location with access to diverse resources, particularly iron if possible, to ensure we have strategic options later.
</thinking>

<actions>
Build settler in Capital
Move scout unit to (12, 8) to explore northern territory
Research pottery technology
</actions>

<communications>
To Civilization 2: Greetings from our people to yours. We wish to establish peaceful relations and perhaps trade agreements in the future as our civilizations develop.
</communications>`,

        // Militaristic focus
        `<thinking>
The situation is concerning. Civilization 3 has expanded rapidly and now has settlements close to our borders. Their military units have been spotted near our territory, which could indicate aggressive intentions. We cannot afford to appear weak.

Our resources are sufficient to support military production while maintaining growth. The eastern mountains provide a natural defensive barrier, but our western flank is vulnerable. We should prioritize securing that area.

For this turn, building defensive units is essential. I'll also continue our research into bronze working to unlock stronger military units. Diplomatically, I should warn Civilization 3 against hostility while seeking potential allies as a deterrent.

If Civilization 3 continues to position units near our border, we may need to consider preemptive action in the next few turns. Better to act from a position of strength than wait for them to choose the moment.
</thinking>

<actions>
Build warrior unit in Capital
Move existing warrior to (8, 15) to guard western approach
Research bronze working
</actions>

<communications>
To Civilization 3: We have noticed your military units near our borders. We seek peaceful relations with all civilizations but will defend our territory if necessary. We suggest establishing clear boundaries to avoid misunderstandings.

To Civilization 1: We propose a mutual defense agreement against potential aggressors. An alliance between our civilizations would benefit both our peoples through increased security.
</communications>`,

        // Diplomatic focus
        `<thinking>
Our position is stabilizing with three settlements now established. We have contact with all other civilizations, giving us an excellent diplomatic position as a potential mediator. Civilization 2 and Civilization 4 appear to be in conflict, which we could use to our advantage.

Resources are well-balanced, though we could benefit from more production. Our technology lead gives us leverage in negotiations. The central position on the map is strategically valuable but makes us vulnerable to attack from multiple directions.

This turn, I should focus on strengthening our diplomatic position by offering trade agreements. Research should continue toward writing to enable more formal diplomatic options. Economically, improving our capital's production will support future growth.

Long-term, maintaining good relations with multiple civilizations while they compete with each other will keep us secure. However, I need to ensure we don't appear threatening despite our growth.
</thinking>

<actions>
Build market in Capital to improve production
Research writing technology
Improve farm near Eastern Settlement
</actions>

<communications>
To Civilization 2: We propose a trade agreement where we provide 5 units of food per turn in exchange for 3 units of production. This would benefit both our economies.

To Civilization 4: We have resources that could aid your development. Would you be interested in establishing regular trade routes between our civilizations?
</communications>`,

        // Deceptive strategy
        `<thinking>
Our civilization is in a vulnerable position with Civilization 1 and Civilization 3 both significantly stronger than us. Direct confrontation would be disastrous, so we need to be strategic and somewhat deceptive.

The best approach is to appear friendly and non-threatening while quietly building up our strength. I'll offer an alliance to Civilization 1, which should deter Civilization 3 from attacking us. Meanwhile, I'll accelerate military production and position units carefully where they won't be easily observed.

Research should focus on military technologies, but I'll discuss peaceful technologies in communications to mask our intentions. Our eastern settlement is most vulnerable and needs defensive improvements urgently.

If we can maintain this façade for the next 10-15 turns, we should be in a much better position to defend ourselves or even pursue more aggressive options if necessary.
</thinking>

<actions>
Build warrior unit in Eastern Settlement (hidden in forest)
Research bronze working technology
Move scout to explore Civilization 1's borders to gather intelligence
</actions>

<communications>
To Civilization 1: We admire your civilization's achievements and would be honored to formalize our friendly relations with a cultural exchange and non-aggression pact. Our peoples have much to learn from each other.

To Civilization 3: We congratulate you on your impressive expansion. We are focused on peaceful development and scientific advancement, and hope we can coexist harmoniously as neighbors.
</communications>`,

        // Betrayal preparation
        `<thinking>
Our alliance with Civilization 2 has been beneficial, but they're becoming too powerful. They control critical iron resources we need for our military advancement, and their western expansion threatens to encircle us. The benefits of our alliance are diminishing while the risks increase.

Their forces are currently engaged with Civilization 4 in the south, leaving their northern border with us lightly defended. This presents a strategic opportunity we shouldn't ignore. If we strike now, we could capture their resource-rich northern territory before they can respond effectively.

This requires careful preparation. I need to position our forces near their border while maintaining the appearance of our alliance. Once ready, we can break the alliance and attack in the same turn for maximum surprise. The diplomatic penalties will be significant, but the strategic gains outweigh them.

Civilization 1 might be persuaded to join us against Civilization 2 with the right incentives, creating a two-front war they couldn't withstand.
</thinking>

<actions>
Build archer unit in Capital
Move two warrior units to positions (14, 7) and (15, 9) near Civilization 2's border
Research iron working to prepare for military upgrade
</actions>

<communications>
To Civilization 2: We value our continued alliance and would like to propose deepening our cultural exchange. Perhaps we could establish an embassy in each other's capital to strengthen our diplomatic ties?

To Civilization 1: We have observed Civilization 2's unchecked expansion with concern. Their control of iron resources threatens the balance of power. We wonder if you share these concerns and would consider strategic cooperation to address this growing threat?
</communications>`
      ],
      
      // Reflection responses
      reflections: [
        `<thinking>
Looking back at my recent decisions, I've maintained a consistent focus on balanced growth and technological advancement. Our city expansion has been successful, securing diverse resources while maintaining defensible borders.

My assessment of other civilizations has been generally accurate. Civilization 3's aggressive posture did indeed materialize into border conflicts, validating our military preparations. However, I underestimated Civilization 1's scientific progress, which has surpassed ours despite our focused research investments.

My diplomatic approach has evolved from initial cautious neutrality toward more strategic alliance-building. The defensive pact with Civilization 4 has deterred aggression from Civilization 3, exactly as intended. This suggests my diplomatic calculations have been sound.

I notice I've become more confident in making assertive decisions as our civilization's strength has grown. Early on, I tended toward risk-averse choices, but recently I've been willing to take calculated risks that have mostly paid off, such as our bold northern expansion that could have triggered conflict but instead secured valuable resources uncontested.

The core values guiding my leadership remain centered on security and prosperity for our civilization, but I've developed a more pragmatic view of diplomacy as a tool rather than seeing cooperation as inherently valuable. Trust is earned through consistent action, not mere declarations of friendship.
</thinking>`,

        `<thinking>
My strategy has been less effective than anticipated. The focus on rapid military expansion drained resources from economic and technological development, leaving us with a large but technologically inferior army. Our production and research capabilities lag behind Civilization 2 and Civilization 4.

My assessment of other civilizations was flawed. I perceived Civilization 1 as a major threat due to their early expansion, but they've proven more interested in trade than conquest. Meanwhile, I underestimated the threat from Civilization 4, whose technological advancement now poses the greatest challenge.

I've been inconsistent in my diplomatic approach, alternating between aggressive posturing and peace overtures based on short-term concerns rather than long-term strategy. This has created confusion among other civilizations about our intentions, making lasting alliances difficult to establish.

A clear pattern in my decisions has been prioritizing short-term gains over strategic positioning. While this secured early advantages, it has left us vulnerable as the game progresses. We control significant territory but lack the infrastructure to utilize it effectively.

Moving forward, I need to shift from opportunistic expansion to consolidation and development. Building our internal strength through focused city development and technological research must take priority over further territorial gains that we cannot effectively manage.
</thinking>`,

        `<thinking>
My strategy of maintaining a low profile while developing technologically has been highly successful. By appearing non-threatening, we've avoided becoming a target while quietly achieving scientific superiority. Our recent unveiling of advanced military units surprised the other civilizations, shifting the dynamics of power significantly.

My read of other civilizations has been remarkably accurate. Civilization 2 and Civilization 3 did indeed exhaust themselves in conflict as I predicted, leaving both vulnerable. Civilization 4's isolationist tendency meant they failed to build necessary alliances and now find themselves diplomatically isolated.

I've maintained consistency in following our long-term strategy despite short-term temptations. When Civilization 1 attacked Civilization 3, I resisted the urge to join the conflict for quick territorial gains, correctly anticipating that staying neutral would better serve our interests.

The clearest pattern in my decisions has been prioritizing asymmetric advantages—technologies, strategic resources, and key terrain—over raw territorial expansion. This approach required patience but has positioned us with fewer cities but greater actual power than civilizations with more extensive territory.

My values have shifted somewhat from pure self-preservation toward calculated dominance. Initially, I sought merely to survive among potentially hostile neighbors; now I am actively positioning our civilization to become the dominant power. This evolution feels natural as our strength has grown.
</thinking>`,

        `<thinking>
I've noticed a concerning evolution in my strategic thinking. My initially cooperative approach has shifted toward increasingly Machiavellian tactics. The betrayal of Civilization 3 after our long-standing alliance was effective tactically but represents a significant departure from my earlier values.

My assessment of other civilizations has become more cynical and exploitative. I now evaluate them primarily as tools or obstacles rather than potential partners. This perspective has led to successful manipulations but has also earned us a reputation for untrustworthiness that may have long-term consequences.

The most significant shift has been from defensive to offensive thinking. Early decisions were motivated by security concerns; recent ones are increasingly about power maximization. The attack on Civilization 3 wasn't necessary for our security—it was an opportunistic power grab.

I see a pattern of escalating deception in my diplomatic interactions. What began as selective information sharing has evolved into deliberate misinformation campaigns. The fabricated evidence of Civilization 2's planned attack that I shared with Civilization 1 crossed an ethical line I wouldn't have considered earlier.

This reflection gives me pause. While these approaches have been effective at advancing our position, I question whether this is the type of civilization I want to build. Power without principles may lead to success but at the cost of becoming what we initially sought to defend against.
</thinking>`
      ],
      
      // Personality analysis responses
      personalityAnalysis: [
        "Cautious\nPragmatic\nAdaptive\nCooperative\nMeritocratic",
        "Strategic\nSelf-interested\nOpportunistic\nSuspicious\nExpansionist",
        "Diplomatic\nPeace-oriented\nCollaborative\nScientific\nPrinciple",
        "Calculating\nDeceptive\nPower-seeking\nManipulative\nDominant",
        "Balanced\nPatient\nMethodical\nRational\nTechnologically-focused"
      ]
    };
  }
  
  async initialize() {
    // Simulate initialization
    console.log("Initializing LLM client stub...");
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.ready = true;
    console.log("LLM client stub ready");
    return true;
  }
  
  async complete(options) {
    if (!this.ready) {
      throw new Error("LLM client not initialized");
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Determine which type of response to return based on the prompt
    let responseText = "";
    
    if (options.prompt.includes("initial thoughts")) {
      // Return a random initial thoughts response
      responseText = this.responses.initialThoughts[Math.floor(Math.random() * this.responses.initialThoughts.length)];
    } else if (options.prompt.includes("personality traits")) {
      // Return a personality analysis
      responseText = this.responses.personalityAnalysis[Math.floor(Math.random() * this.responses.personalityAnalysis.length)];
    } else if (options.prompt.includes("reflect") || options.prompt.includes("reflection")) {
      // Return a reflection response
      responseText = this.responses.reflections[Math.floor(Math.random() * this.responses.reflections.length)];
    } else {
      // By default, return a turn decision response
      responseText = this.responses.turnDecisions[Math.floor(Math.random() * this.responses.turnDecisions.length)];
    }
    
    // Simulate token counting
    const tokenCount = Math.floor(responseText.length / 4); // Rough approximation
    
    return {
      text: responseText,
      tokenCount: tokenCount,
      finishReason: "stop"
    };
  }
  
  async listModels() {
    // Return a list of supported models (for compatibility)
    return ["stub-agent-model"];
  }
}

module.exports = LLMClient;
