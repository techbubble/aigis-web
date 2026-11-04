// Story playback timing, in milliseconds at 1x. The map and the player
// share these so the line is drawn exactly while the player waits for it.
export const STORY = {
  frame: 250, // the camera is fixed during play; a beat before the line starts
  draw: 1400, // the line grows from one stop to the next
  hold: 600, // pause before the next hop
} as const;

export const DAY = 86400000;
// When the story reaches an event. Events known only by date (midnight UTC,
// no time of day: ledger rows) come at the end of their day, after the timed
// events of that day, both in the play list and on the map.
export function storyTime(e: { t: number }): number {
  return e.t % DAY === 0 ? e.t + DAY - 1 : e.t;
}
