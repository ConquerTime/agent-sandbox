export interface Turn<T> {
  userMessage?: T;
  assistantMessage?: T;
}

export function groupMessagesByTurn<T extends { role: string }>(
  messages: T[]
): Turn<T>[] {
  const turns: Turn<T>[] = [];
  let current: Turn<T> | null = null;

  for (const msg of messages) {
    if (msg.role === 'user') {
      if (current) turns.push(current);
      current = { userMessage: msg };
    } else if (msg.role === 'assistant') {
      if (!current) current = {};
      current.assistantMessage = msg;
      turns.push(current);
      current = null;
    }
  }
  if (current) turns.push(current);

  return turns;
}
