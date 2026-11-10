/**
 * 识别由 `buildMentionName` （`apps/web/hooks/preview-bridge/add-element-to-input.ts`）
 * 生成的 ElementDataType 文本块。结构（按出现顺序，行间用 `\n` 分隔）：
 *
 *   DOM Path: ...               （可选）
 *   Position: top=Xpx, ...      （可选）
 *   React Component: ...        （可选）
 *   HTML Element: <tag ...>...</tag>  （必有）
 *
 * HTML Element 行通过开闭标签锚定，避免吞掉同行的后续用户输入。
 * （buildMentionName 永远输出闭合标签，且 innerText 已被 trim/截断，不含换行）
 *
 * 之所以用「契约式」正则而不是引入跨包依赖，是因为 message.tsx 在
 * packages/ai-components，而 buildMentionName 在 apps/web，二者不能反向依赖。
 * 任何一方修改格式时，需同时更新对方
 * （契约见 specs/rush-v2/ui/message-mention-rendering.spec.md）。
 */
export const ELEMENT_MENTION_REGEX =
  /(?:DOM Path: [^\n]+\n)?(?:Position: top=-?\d+px, left=-?\d+px, width=-?\d+px, height=-?\d+px\n)?(?:React Component: [^\n]+\n)?HTML Element: <[a-zA-Z][\w-]*(?:\s[^>\n]*)?>[^\n]*?<\/[a-zA-Z][\w-]*>/g;

export type ElementMentionSegment =
  | { type: 'text'; content: string }
  | { type: 'mention'; content: string };

/**
 * 将一段消息文本按 ElementDataType 提及块切分为顺序段落。
 * 普通文本与提及交替出现，未出现提及时返回 `[{ type: 'text', content: text }]`。
 */
export function splitElementMentions(text: string): ElementMentionSegment[] {
  const segments: ElementMentionSegment[] = [];
  let lastIndex = 0;

  // matchAll 需要带 /g 的 regex；ELEMENT_MENTION_REGEX 已声明 /g
  for (const match of text.matchAll(ELEMENT_MENTION_REGEX)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, start) });
    }
    segments.push({ type: 'mention', content: match[0] });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ type: 'text', content: text });
  }

  return segments;
}
