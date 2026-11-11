/**
 * "Stayed on screen long enough": the rule behind a finished case file
 * (design note 0001, C4). Pure: the timer is passed in, so it's unit tested
 * without a browser.
 */

export interface Timers<Handle> {
  readonly set: (callback: () => void, ms: number) => Handle;
  readonly clear: (handle: Handle) => void;
}

/**
 * Watches something that comes on and off screen. `done` is called once, the
 * first time it has stayed visible for `ms` without a break; a quick flick
 * past it starts the wait and leaving cancels it. After `done`, nothing more
 * happens.
 *
 * Returns the function to call each time visibility changes.
 */
export function dwell<Handle>(
  ms: number,
  done: () => void,
  timers: Timers<Handle>,
): (visible: boolean) => void {
  let waiting: Handle | undefined;
  let finished = false;
  return (visible) => {
    if (finished) return;
    if (visible && waiting === undefined) {
      waiting = timers.set(() => {
        finished = true;
        done();
      }, ms);
    } else if (!visible && waiting !== undefined) {
      timers.clear(waiting);
      waiting = undefined;
    }
  };
}
