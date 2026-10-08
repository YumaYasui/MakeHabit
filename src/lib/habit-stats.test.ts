import { describe, expect, it } from "vitest";
import { appToday, isStampable, monthGrid } from "./dates";
import { computeStats, countsByDate, isComeback, isScheduledDay, type Schedule } from "./habit-stats";

// 2026-09-28 は月曜日
const MWF: Schedule[] = [{ weekdays: [1, 3, 5], valid_from: "2026-09-28" }];
// 日付 → 回数（どの日も1回）
const stamps = (...dates: string[]) => new Map(dates.map((d) => [d, 1]));

describe("appToday", () => {
  it("日本時間の午前3時で日付が変わる", () => {
    expect(appToday(new Date("2026-10-01T17:59:00Z"))).toBe("2026-10-01"); // JST 10/2 2:59
    expect(appToday(new Date("2026-10-01T18:00:00Z"))).toBe("2026-10-02"); // JST 10/2 3:00
  });
});

describe("isStampable", () => {
  it("今日と過去7日以内、開始日以降だけ押せる", () => {
    const today = "2026-10-10";
    expect(isStampable("2026-10-10", today, "2026-01-01")).toBe(true);
    expect(isStampable("2026-10-03", today, "2026-01-01")).toBe(true);
    expect(isStampable("2026-10-02", today, "2026-01-01")).toBe(false);
    expect(isStampable("2026-10-11", today, "2026-01-01")).toBe(false);
    expect(isStampable("2026-10-05", today, "2026-10-06")).toBe(false);
  });
});

describe("computeStats", () => {
  it("要件定義書の例：月・水・金＋火曜にスタンプ、今日(金)は未", () => {
    const result = computeStats("2026-09-28", MWF, stamps("2026-09-28", "2026-09-29", "2026-09-30"), "2026-10-02");
    expect(result).toEqual({ total: 3, totalTimes: 3, currentStreak: 2, longestStreak: 2 });
  });

  it("実施日以外の日は連続を途切れさせない", () => {
    const result = computeStats("2026-09-28", MWF, stamps("2026-09-28", "2026-09-30", "2026-10-02"), "2026-10-04");
    expect(result.currentStreak).toBe(3);
  });

  it("過去の実施日の押し忘れで途切れる", () => {
    const result = computeStats("2026-09-28", MWF, stamps("2026-09-28", "2026-10-02"), "2026-10-02");
    expect(result).toEqual({ total: 2, totalTimes: 2, currentStreak: 1, longestStreak: 1 });
  });

  it("後から押し忘れを埋めると連続が復活する", () => {
    const result = computeStats("2026-09-28", MWF, stamps("2026-09-28", "2026-09-30", "2026-10-02"), "2026-10-02");
    expect(result.currentStreak).toBe(3);
  });

  it("曜日設定の変更は変更日以降にだけ適用される", () => {
    const schedules: Schedule[] = [
      { weekdays: [1, 3, 5], valid_from: "2026-09-28" },
      { weekdays: [0, 1, 2, 3, 4, 5, 6], valid_from: "2026-10-05" },
    ];
    // 9/29(火) は変更前なので実施日ではない
    expect(isScheduledDay("2026-09-29", schedules)).toBe(false);
    expect(isScheduledDay("2026-10-06", schedules)).toBe(true);
    const result = computeStats(
      "2026-09-28",
      schedules,
      stamps("2026-09-28", "2026-09-30", "2026-10-02", "2026-10-05", "2026-10-06"),
      "2026-10-07",
    );
    expect(result.currentStreak).toBe(5);
  });

  it("最長連続は途切れる前の記録を覚えている", () => {
    const result = computeStats(
      "2026-09-28",
      MWF,
      stamps("2026-09-28", "2026-09-30", "2026-10-02", "2026-10-07"),
      "2026-10-07",
    );
    expect(result).toEqual({ total: 4, totalTimes: 4, currentStreak: 1, longestStreak: 3 });
  });
});

describe("1日に複数回", () => {
  it("回数は累計回数にだけ足され、やった日・連続は変わらない", () => {
    const counts = new Map([
      ["2026-09-28", 2],
      ["2026-09-30", 3],
      ["2026-10-01", 1], // 実施日以外
    ]);
    expect(computeStats("2026-09-28", MWF, counts, "2026-10-02")).toEqual({
      total: 3,
      totalTimes: 6,
      currentStreak: 2,
      longestStreak: 2,
    });
  });

  it("countsByDate はスタンプの一覧を日付→回数にする", () => {
    expect(countsByDate([{ date: "2026-10-01", count: 2 }])).toEqual(new Map([["2026-10-01", 2]]));
  });
});

describe("isComeback", () => {
  it("直前の実施日7回がすべて未スタンプなら再開", () => {
    const daily: Schedule[] = [{ weekdays: [0, 1, 2, 3, 4, 5, 6], valid_from: "2026-09-01" }];
    expect(isComeback("2026-09-10", "2026-09-01", daily, stamps("2026-09-02"))).toBe(true);
    expect(isComeback("2026-09-09", "2026-09-01", daily, stamps("2026-09-02"))).toBe(false);
    expect(isComeback("2026-09-10", "2026-09-01", daily, stamps())).toBe(false);
  });
});

describe("monthGrid", () => {
  it("日曜始まりで週ごとに並ぶ", () => {
    const weeks = monthGrid(2026, 10);
    expect(weeks[0]).toEqual([null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
  });
});
