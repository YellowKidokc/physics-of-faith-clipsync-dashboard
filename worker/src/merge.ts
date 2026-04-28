import DiffMatchPatch from 'diff-match-patch';

const dmp = new DiffMatchPatch();

export interface MergeResult {
  body: string;
  conflict: boolean;
}

// 3-way merge using diff-match-patch's patch_apply.
// We diff base→incoming to get the client's intended edit, then apply
// that patch onto the current server body. If any hunk fails to apply
// cleanly, we mark conflict=true and keep the current body unchanged
// — the caller is expected to materialize the loser's body as a
// sibling row so nothing is lost.
export function threeWayMerge(base: string, current: string, incoming: string): MergeResult {
  if (current === incoming) return { body: current, conflict: false };
  if (base === current)     return { body: incoming, conflict: false };  // no concurrent edit
  if (base === incoming)    return { body: current, conflict: false };   // incoming is a no-op

  const patches = dmp.patch_make(base, incoming);
  const [merged, results] = dmp.patch_apply(patches, current);
  const allApplied = (results as boolean[]).every(Boolean);
  return allApplied
    ? { body: merged as string, conflict: false }
    : { body: current,          conflict: true  };
}
