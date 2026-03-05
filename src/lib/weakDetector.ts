export function isAnswerWeak(
  answer: string,
  expectedKeywords: string[],
  fillerCount: number
): boolean {

  // Too short
  if (answer.trim().split(' ').length < 12) return true;

  // Zero keywords matched
  const answerLower = answer.toLowerCase();
  const matched = expectedKeywords.filter(k =>
    answerLower.includes(k.toLowerCase())
  ).length;
  if (matched === 0 && expectedKeywords.length > 0) return true;

  // Too many fillers
  if (fillerCount > 4) return true;

  return false;
}

export function countFillers(text: string): number {
  const FILLERS = [
    'euh', 'euhm', 'hm', 'uh', 'um',
    'so basically', 'you know', 'like i said',
    'donc euh', 'voilà', 'genre', 'bref',
    'ya3ni', 'walla', 'kima'
  ];

  const lower = text.toLowerCase();
  return FILLERS.reduce((count, filler) => {
    const matches = lower.split(filler).length - 1;
    return count + matches;
  }, 0);
}
