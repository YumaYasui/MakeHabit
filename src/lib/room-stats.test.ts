import { describe, expect, it } from "vitest";
import { allDoneDates, todayStatus, type MemberHabit } from "./room-stats";

// 2026-09-28 は月曜日
const member = (weekdays: number[], stamps: string[], start = "2026-09-28"): MemberHabit => ({
  start_date: start,
  habit_schedules: [{ weekdays, valid_from: start }],
  stamps: stamps.map((date) => ({ date })),
});

describe("allDoneDates", () => {
  it("その日が実施日のメンバーだけで判定する", () => {
    const a = member([1, 3, 5], ["2026-09-28", "2026-09-30"]);
    const b = member([2, 3], ["2026-09-29"]);
    // 月：Aだけ実施日→達成 / 火：Bだけ→達成 / 水：両方実施日でBが未→未達成
    const result = allDoneDates([a, b], "2026-09-28", "2026-09-30");
    expect([...result]).toEqual(["2026-09-28", "2026-09-29"]);
  });

  it("実施日のメンバーが0人の日は対象外", () => {
    const a = member([1], []);
    expect(allDoneDates([a], "2026-09-29", "2026-10-03").size).toBe(0);
  });

  it("参加前の日はそのメンバーを数えない", () => {
    const a = member([0, 1, 2, 3, 4, 5, 6], ["2026-09-28", "2026-09-29"]);
    const b = member([0, 1, 2, 3, 4, 5, 6], ["2026-09-29"], "2026-09-29");
    expect([...allDoneDates([a, b], "2026-09-28", "2026-09-29")]).toEqual(["2026-09-28", "2026-09-29"]);
  });
});

describe("todayStatus", () => {
  it("達成・未達成・お休みを返す", () => {
    expect(todayStatus(member([1], ["2026-09-28"]), "2026-09-28")).toBe("done");
    expect(todayStatus(member([1], []), "2026-09-28")).toBe("todo");
    expect(todayStatus(member([2], []), "2026-09-28")).toBe("rest");
    expect(todayStatus(member([2], ["2026-09-28"]), "2026-09-28")).toBe("done");
  });
});
