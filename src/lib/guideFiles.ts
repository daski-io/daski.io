// The agent guides, in the order llms.txt lists them and llms-full.txt
// concatenates them. This module has no imports on purpose: chains.ts is
// bundled into browser islands and must not pull in node built-ins, and both
// it and the server-side guide routes need this list to stay one list.
export const GUIDE_FILES = ['setup.md', 'buy.md', 'orders.md', 'wallets.md', 'recipe.md', 'SKILL.md'] as const;
export type GuideFile = typeof GUIDE_FILES[number];
