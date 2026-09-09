// The prompt is offered once, ever. A counter that can be nudged back into an
// unsettled state turns a single ask into nagware, which is the failure this
// file exists to catch.

import test from "node:test";
import assert from "node:assert/strict";
import {
  PROMPT_AFTER_DAYS,
  recordDay,
  settle,
  shouldShowPrompt,
} from "../extension/lib/prompt-schedule.js";

function useOn(days, state = undefined) {
  return days.reduce((acc, day) => recordDay(acc, day), state);
}

test("opening it repeatedly on one day counts as one day", () => {
  const state = useOn(["2026-09-01", "2026-09-01", "2026-09-01"]);
  assert.equal(state.days, 1);
  assert.equal(shouldShowPrompt(state), false);
});

test("nothing is offered before the fourth separate day", () => {
  const state = useOn(["2026-09-01", "2026-09-02", "2026-09-03"]);
  assert.equal(state.days, 3);
  assert.equal(shouldShowPrompt(state), false);
});

test("it is offered on the fourth separate day", () => {
  const state = useOn(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"]);
  assert.equal(state.days, PROMPT_AFTER_DAYS);
  assert.equal(shouldShowPrompt(state), true);
});

test("days do not have to be consecutive", () => {
  const state = useOn(["2026-01-01", "2026-03-14", "2026-07-02", "2026-11-30"]);
  assert.equal(shouldShowPrompt(state), true);
});

test("once settled it never shows again, however long they keep using it", () => {
  let state = settle(useOn(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"]));
  assert.equal(shouldShowPrompt(state), false);

  state = useOn(["2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08"], state);
  assert.equal(shouldShowPrompt(state), false);
  assert.equal(state.days, PROMPT_AFTER_DAYS, "a settled counter stops moving");
});

test("missing or corrupt stored state starts from zero rather than throwing", () => {
  assert.deepEqual(recordDay(null, "2026-09-01"), {
    days: 1,
    lastDay: "2026-09-01",
    settled: false,
  });
  assert.equal(shouldShowPrompt(undefined), false);
  assert.equal(shouldShowPrompt({}), false);
});

test("a day with no stamp is not counted", () => {
  const state = recordDay({ days: 2, lastDay: "2026-09-01", settled: false }, "");
  assert.equal(state.days, 2);
});
