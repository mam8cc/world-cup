import { describe, expect, it } from "vitest";
import { parseKickoff, type Match } from "../lib/feed";
import { predictionsOpen } from "../lib/pool";
import { DEFAULT_SETTINGS } from "../lib/scoring/types";
import type { Pool } from "../lib/db/schema";

function pool(status: Pool["status"]): Pool {
  return {
    id: 1,
    name: "t",
    format: "predict_lock",
    joinCode: "x",
    adminToken: "a",
    status,
    lockAt: null,
    settings: DEFAULT_SETTINGS,
    createdAt: new Date(0),
  };
}

function match(kickoff: Date | null): Match {
  return {
    feedKey: "0",
    round: "Matchday 1",
    stage: "group",
    date: "2026-06-11",
    group: "A",
    team1: "Mexico",
    team2: "South Africa",
    ft: null,
    et: null,
    pens: null,
    status: "scheduled",
    winner: null,
    kickoff,
  };
}

describe("parseKickoff", () => {
  it("parses UTC-offset times into a precise instant", () => {
    expect(parseKickoff("2026-06-11", "13:00 UTC-6")?.toISOString()).toBe("2026-06-11T19:00:00.000Z");
    expect(parseKickoff("2026-06-11", "12:00 UTC-7")?.toISOString()).toBe("2026-06-11T19:00:00.000Z");
    expect(parseKickoff("2026-06-11", "20:00 UTC-6")?.toISOString()).toBe("2026-06-12T02:00:00.000Z");
  });

  it("returns null when there is no parseable offset time", () => {
    expect(parseKickoff("2026-06-11", undefined)).toBeNull();
    expect(parseKickoff("2026-06-11", "19:00")).toBeNull();
  });
});

describe("predictionsOpen locks at the kickoff instant, not the UTC calendar day", () => {
  const future = new Date("2099-01-01T00:00:00Z");
  const past = new Date("2000-01-01T00:00:00Z");

  it("stays open before the first kickoff", () => {
    expect(predictionsOpen(pool("setup"), [match(future)])).toBe(true);
  });

  it("closes once the first kickoff has passed", () => {
    expect(predictionsOpen(pool("setup"), [match(past)])).toBe(false);
  });

  it("is closed when the pool is already locked", () => {
    expect(predictionsOpen(pool("locked"), [match(future)])).toBe(false);
  });

  it("stays open when the schedule has no kickoff times yet", () => {
    expect(predictionsOpen(pool("setup"), [match(null)])).toBe(true);
  });
});
