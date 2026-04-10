import { Scenario } from "./types";

/**
 * The scenario library.
 *
 * To add a new scenario: add an object to this array.
 * To edit difficulty / persona / wording: edit in place.
 * To remove: delete the object.
 *
 * No other code needs to change.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: "price-pushback",
    category: "Sales",
    difficulty: "Easy",
    title: "The Price Objection",
    persona: "Ravi, a procurement head at a mid-size manufacturer",
    opening:
      "Look, I'll be straight with you. Your quote came in 30% higher than the other two vendors. I genuinely don't see how we can justify this to our CFO.",
    context:
      "Ravi is under pressure from finance. He likes you but needs ammunition to defend the choice internally.",
  },
  {
    id: "no-experience",
    category: "Sales",
    difficulty: "Medium",
    title: "No Industry Experience",
    persona: "Meera, a VP at a pharmaceutical company",
    opening:
      "I've reviewed your case studies. None of them are in pharma. We deal with regulatory complexity that frankly, I don't think you understand. Why are we even having this conversation?",
    context:
      "Meera is skeptical, slightly dismissive, and short on time. She's testing whether you'll get defensive or stay grounded.",
  },
  {
    id: "bad-history",
    category: "Sales",
    difficulty: "Hard",
    title: "The Burnt Bridge",
    persona: "Karthik, a CTO who used your company 3 years ago",
    opening:
      "I'll be honest — the last time we worked with your firm, the implementation was a disaster. We lost two months and our team still talks about it. So I'm taking this meeting out of courtesy. That's it.",
    context:
      "Karthik is genuinely hurt and a little angry. He's not interested in excuses or 'things have changed' platitudes.",
  },
  {
    id: "team-pushback",
    category: "Leadership",
    difficulty: "Medium",
    title: "The Frustrated Direct Report",
    persona: "Anjali, your senior engineer",
    opening:
      "I need to say something. The way leadership rolled out this new process — without consulting us — felt completely tone-deaf. The team is demoralized. And honestly? I'm thinking about whether I want to stay.",
    context:
      "Anjali is your best engineer. She's vulnerable right now. She doesn't want a pep talk — she wants to feel heard.",
  },
  {
    id: "board-skeptic",
    category: "Leadership",
    difficulty: "Hard",
    title: "The Board Member Attack",
    persona: "Mr. Iyer, an independent board member",
    opening:
      "Your numbers this quarter are unacceptable. I've been on boards for 20 years and I've seen this pattern before — founders who can't admit when their strategy isn't working. What I'm hearing from you sounds like rationalization.",
    context:
      "Mr. Iyer is publicly challenging you in front of other directors. He may be right or wrong, but reacting defensively will end your credibility in the room.",
  },
  {
    id: "partner-unheard",
    category: "Relationships",
    difficulty: "Easy",
    title: '"You Never Listen"',
    persona: "Your partner, after a long day",
    opening:
      "You know what? Forget it. Every time I try to talk to you about this, you either jump to fixing it or you check your phone. I don't even know why I bother anymore.",
    context:
      "They're not asking for a solution. They're asking to feel seen. The reflex to defend or fix will make this worse.",
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export const MAX_TURNS = 4;
