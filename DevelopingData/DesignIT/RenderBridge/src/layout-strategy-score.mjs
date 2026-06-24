export function scoreLayoutStrategy(payload = {}) {
  const frames = payload.figmaAutoLayoutPlan?.frames || [];
  const flexible = frames.filter((x) => x.autoLayoutAllowed).length;
  const total = frames.length;
  const score = total ? Math.round((flexible / total) * 100) : 0;
  const issues = [];
  if (!total) issues.push('no frames');
  if (total >= 3 && score < 30) issues.push('low auto layout coverage');
  return { version: 'layout-strategy-score-v1', status: issues.length ? 'not-ready' : 'ready', score, total, flexible, issues };
}
