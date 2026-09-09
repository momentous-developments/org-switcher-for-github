// When to offer the usage-stats switch in the popup.
//
// Counted in days rather than opens. Someone poking at a new extension four
// times in their first minute has not adopted it, and asking them is how a
// prompt becomes an advert. Four separate days means they kept it.
//
// It is offered once. Whether they turn it on, decline, or ignore it, the
// prompt is settled and never appears again.

export const PROMPT_AFTER_DAYS = 4;

export const EMPTY_PROMPT_STATE = { days: 0, lastDay: "", settled: false };

export function recordDay(state, today) {
  const current = { ...EMPTY_PROMPT_STATE, ...(state || {}) };
  if (current.settled) return current;
  if (!today || current.lastDay === today) return current;
  return { ...current, days: current.days + 1, lastDay: today };
}

export function shouldShowPrompt(state) {
  const current = { ...EMPTY_PROMPT_STATE, ...(state || {}) };
  return !current.settled && current.days >= PROMPT_AFTER_DAYS;
}

export function settle(state) {
  return { ...EMPTY_PROMPT_STATE, ...(state || {}), settled: true };
}
