export const DISTANT_LANTERN_LIMIT = 4;
// Three points along the water in front of the far bank: left, centre, right.
export const DISTANT_LANTERN_SOURCES = [
  [-60, 1.2, -45], [0, 1.2, -78], [60, 1.2, -45]
];

export function distantLanterns(random = Math.random) {
  let nextAt = null, location = 0, opening = 0;
  return {
    reset(time) {
      location = Math.floor(random() * DISTANT_LANTERN_SOURCES.length);
      opening = 3;
      nextAt = time + 1 + random() * .4;
    },
    update(time, counts) {
      if (nextAt === null) this.reset(time);
      if (time < nextAt) return null;
      // One release per update, with a global gap; never catch up in a batch.
      const source = location;
      location = (location + 1) % DISTANT_LANTERN_SOURCES.length;
      nextAt = time + (opening > 1 ? .25 : 2 + random());
      opening = Math.max(0, opening - 1);
      return (counts[source] || 0) < DISTANT_LANTERN_LIMIT ? source : null;
    }
  };
}

// Scale the whole lantern, including its halo, as it recedes into the sky.
export function distantLanternScale(age, duration) {
  const progress = Math.max(0, Math.min(1, age / duration));
  const eased = progress * progress * (3 - 2 * progress);
  return 1.65 - 1.1 * eased;
}
