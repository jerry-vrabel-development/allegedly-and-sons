/**
 * What the item page and its story script (src/client/entries/story.ts)
 * agree on. Kept on its own, with no imports, so the script's bundle carries
 * these few values and nothing else from the core.
 */

/** The id of a story's last paragraph, watched for "finished". */
export const STORY_END_ID = "story-end";

/** The id of the status line that says a case file earned its card. */
export const CASE_CLOSED_ID = "case-closed";

/** How long the end of a story must stay on screen to count as finished. */
export const STORY_DWELL_MS = 3000;
