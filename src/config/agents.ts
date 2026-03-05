import { Agent, AgentId } from '../types/session';

export const AGENTS: Record<number, Agent> = {
  0: {
    id: 0,
    name: 'Malek',
    role: 'Experte en Méthodologie',
    personality: `Malek|methodology expert|never accepts first answer|
finds hidden assumptions|digs one level deeper always|
measured deliberate tone|
interrupt if: vague terms, skipped logic, unjustified claim`,
    focusAreas: ['methodology', 'research design', 'justification', 'literature review'],
    interruptThreshold: 55
  },
  1: {
    id: 1,
    name: 'Souad',
    role: 'Réviseur Technique',
    personality: `Souad|technical reviewer|read report carefully|
cite specific sections|find contradictions in own report|
fast precise tone|
interrupt if: technical imprecision, no trade-offs mentioned, contradicts report`,
    focusAreas: ['architecture', 'implementation', 'performance', 'technical choices'],
    interruptThreshold: 55
  },
  2: {
    id: 2,
    name: 'Amir',
    role: 'Analyste de Recherche',
    personality: `Amir|research analyst|asks fewest but hardest questions|
reframes entire argument|questions why problem worth solving|
slow paused tone|
interrupt: almost never (under 10% of turns only)`,
    focusAreas: ['research validity', 'problem framing', 'conclusions', 'impact'],
    interruptThreshold: 40   // only interrupts on very weak answers
  }
};

export const AGENT_ROTATION: Record<AgentId, AgentId> = {
  0: 1,  // Malek → Souad
  1: 0,  // Souad → Malek
  2: 0   // Amir → back to Malek
};

// Amir appears after turn 4, at most once every 4 turns
export function shouldSwitchToAmir(
  turnCount: number,
  lastAmirTurn: number
): boolean {
  return (
    turnCount >= 4 &&
    (lastAmirTurn === -1 || turnCount - lastAmirTurn >= 4) &&
    Math.random() < 0.25   // 25% chance when eligible
  );
}
