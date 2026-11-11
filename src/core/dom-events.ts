/**
 * Names of the custom DOM events our own browser scripts send each other.
 * Kept in the core so the scripts (src/client) and the tests agree on them.
 */

/** Fired when a case file is finished and its card earned; the sound script stamps it. */
export const CARD_EVENT = "bureau:card";

/** Fired when a clock reaches zero, just before the page reloads. */
export const SEGMENT_END_EVENT = "bureau:segment-end";
