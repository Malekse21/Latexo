import { GeneratedQuestion } from '../types/session';

const BRIDGES = {
  weak: [
    `Je ne suis pas sûr que ça réponde complètement à la question.`,
    `Laissez-moi reformuler.`,
    `Revenons sur ce point.`,
  ],
  strong: [
    `Bien. En continuant sur ce sujet,`,
    `Noté. Maintenant,`,
    `D'accord. Passons à`,
  ],
  topic_change: [
    `Passons à autre chose.`,
    `Sur un autre aspect de votre projet —`,
    `Je voudrais vous poser une question sur`,
  ],
  follow_up: [
    `Vous avez mentionné {keyword} —`,
    `Sur ce même point,`,
    `En restant sur {topic} —`,
  ]
};

export function buildConversationBridge(
  lastAnswer: string,
  wasWeak: boolean,
  nextQuestion: string,
  lastQuestion: GeneratedQuestion,
  isFollowUp: boolean
): string {

  if (isFollowUp) {
    const keyword = extractKeyword(lastAnswer, lastQuestion.keywords);
    const bridge = pick(BRIDGES.follow_up)
      .replace('{keyword}', keyword ?? lastQuestion.topic)
      .replace('{topic}', lastQuestion.topic);
    return `${bridge} ${nextQuestion}`;
  }

  if (wasWeak) {
    return `${pick(BRIDGES.weak)} ${nextQuestion}`;
  }

  // 40% chance of bridge on normal answer — not every turn
  if (Math.random() > 0.4) return nextQuestion;

  return `${pick(BRIDGES.strong)} ${nextQuestion}`;
}

function extractKeyword(answer: string, keywords: string[]): string | null {
  const lower = answer.toLowerCase();
  return keywords.find(k => lower.includes(k.toLowerCase())) ?? null;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
