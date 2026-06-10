import { boolean, integer, jsonb, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import type { Settings } from "../scoring/types";
import type { PoolFormat } from "../scoring/types";

export const pools = pgTable("pools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  format: text("format").$type<PoolFormat>().notNull(),
  joinCode: text("join_code").notNull().unique(),
  adminToken: text("admin_token").notNull(),
  status: text("status").$type<"setup" | "locked" | "complete">().notNull().default("setup"),
  lockAt: timestamp("lock_at", { withTimezone: true }),
  settings: jsonb("settings").$type<Settings>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id")
    .notNull()
    .references(() => pools.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  playerToken: text("player_token").notNull().unique(),
  draftOrder: integer("draft_order"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Global tournament data, refreshed from the OpenFootball feed.
export const teams = pgTable("teams", {
  code: text("code").primaryKey(), // team name acts as the code
  name: text("name").notNull(),
  groupLetter: text("group_letter"),
});

export const matches = pgTable("matches", {
  feedKey: text("feed_key").primaryKey(), // index within the feed's matches array
  round: text("round").notNull(),
  stage: text("stage").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  groupLetter: text("group_letter"),
  team1: text("team1").notNull(),
  team2: text("team2").notNull(),
  ft1: integer("ft1"),
  ft2: integer("ft2"),
  winner: text("winner"),
  status: text("status").$type<"scheduled" | "final">().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Single-row-per-key store for derived tournament facts (e.g. golden-boot leaders).
export const meta = pgTable("meta", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export const predictions = pgTable(
  "predictions",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"group_1st" | "group_2nd" | "champion" | "golden_boot">().notNull(),
    slot: text("slot").notNull(),
    team: text("team").notNull(),
  },
  (t) => ({ uniqSlot: unique().on(t.playerId, t.kind, t.slot) }),
);

export const assignments = pgTable(
  "assignments",
  {
    id: serial("id").primaryKey(),
    poolId: integer("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    team: text("team").notNull(),
  },
  (t) => ({ uniqTeam: unique().on(t.poolId, t.team) }),
);

export const survivorPicks = pgTable(
  "survivor_picks",
  {
    id: serial("id").primaryKey(),
    poolId: integer("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    pickDate: text("pick_date").notNull(), // the survivor "round" (a calendar day)
    team: text("team").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    onePerRound: unique().on(t.poolId, t.playerId, t.pickDate), // one pick per player per round
  }),
);

export type Pool = typeof pools.$inferSelect;
export type Player = typeof players.$inferSelect;
export type MatchRow = typeof matches.$inferSelect;
