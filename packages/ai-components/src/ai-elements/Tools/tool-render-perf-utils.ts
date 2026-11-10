export type RenderStrategy = 'full' | 'plain' | 'summary';

/** @deprecated Use RenderStrategy instead */
export type DiffRenderStrategy = RenderStrategy;

const THRESHOLD_PLAIN = 500;
const THRESHOLD_SUMMARY = 2000;

function getLineCount(code: string): number {
  return code ? code.split('\n').length : 0;
}

function strategyFromLineCount(lines: number): RenderStrategy {
  if (lines <= THRESHOLD_PLAIN) return 'full';
  if (lines <= THRESHOLD_SUMMARY) return 'plain';
  return 'summary';
}

export function getDiffRenderStrategy(
  oldCode: string,
  newCode: string
): RenderStrategy {
  return strategyFromLineCount(
    Math.max(getLineCount(oldCode), getLineCount(newCode))
  );
}

export function getCodeRenderStrategy(code: string): RenderStrategy {
  return strategyFromLineCount(getLineCount(code));
}

export function computeDiffStats(
  oldCode: string,
  newCode: string
): { addedNum: number; removedNum: number } {
  const oldLines = oldCode ? oldCode.split('\n') : [];
  const newLines = newCode ? newCode.split('\n') : [];
  const maxLen = Math.max(oldLines.length, newLines.length);

  let addedNum = 0;
  let removedNum = 0;

  for (let i = 0; i < maxLen; i++) {
    if (oldLines[i] !== newLines[i]) {
      if (i < oldLines.length) removedNum++;
      if (i < newLines.length) addedNum++;
    }
  }

  return { addedNum, removedNum };
}
