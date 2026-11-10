import type { List, ListItem, Root } from 'mdast';
import type { Plugin } from 'unified';

/**
 * 修复 AI 输出 "- \n**text**" 导致的列表断行问题 (#446)
 *
 * remark-parse 按 CommonMark 规范将 "- \n" 后未缩进的内容解析为：
 *   - 空 listItem (children = [])
 *   - 后续内容脱离为独立的 paragraph 或 heading
 *     （"- " 行被误判为 setext heading 下划线，导致前文变成 heading）
 *
 * 本插件检测 "末尾为空 listItem 的 list" + 后续 paragraph/heading/list(empty) 的
 * AST 模式，将它们合并回正常的 list 结构。
 */
export const remarkFixLooseListItems = (): ReturnType<Plugin<[], Root>> => {
  return (tree: Root) => {
    for (let i = tree.children.length - 1; i >= 0; i--) {
      const node = tree.children[i];
      if (node.type !== 'list') continue;

      const list = node as List;
      const lastItem = list.children[list.children.length - 1];
      if (!lastItem || lastItem.children.length > 0) continue;

      let consumeCount = 0;
      let j = i + 1;
      let prevEndLine = list.position?.end?.line ?? 0;

      while (j < tree.children.length) {
        const next = tree.children[j];
        const nextStartLine = next.position?.start?.line ?? 0;

        // 空行隔断 → 不属于这个被拆散的列表
        if (nextStartLine - prevEndLine > 1) break;

        if (next.type === 'paragraph' || next.type === 'heading') {
          const target = list.children[list.children.length - 1];
          const asP =
            next.type === 'heading'
              ? { type: 'paragraph' as const, children: next.children }
              : next;

          if (target.children.length === 0) {
            target.children.push(asP);
          } else {
            list.children.push({
              type: 'listItem',
              spread: false,
              checked: null,
              children: [asP],
            } as ListItem);
          }
          prevEndLine = next.position?.end?.line ?? prevEndLine;
          consumeCount++;
          j++;
          continue;
        }

        // "- \n" 产生的单 empty-item list → 合并进当前 list
        if (
          next.type === 'list' &&
          (next as List).children.length === 1 &&
          (next as List).children[0].children.length === 0
        ) {
          list.children.push((next as List).children[0]);
          prevEndLine = next.position?.end?.line ?? prevEndLine;
          consumeCount++;
          j++;
          continue;
        }

        break;
      }

      if (consumeCount > 0) {
        tree.children.splice(i + 1, consumeCount);
      }
    }
  };
};
