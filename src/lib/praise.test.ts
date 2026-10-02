import { describe, expect, it } from "vitest";
import { praiseFor } from "./praise";

const stats = (total: number, currentStreak: number) => ({ total, currentStreak, longestStreak: currentStreak });
const normal = { isLate: false, isComeback: false };

describe("praiseFor", () => {
  it("普段は定型文の一言", () => {
    expect(praiseFor(stats(1, 1), stats(2, 2), normal, () => 0)).toEqual({ message: "ナイス！", celebrate: false });
  });

  it("連続の節目で祝う", () => {
    const praise = praiseFor(stats(6, 6), stats(7, 7), normal);
    expect(praise.celebrate).toBe(true);
    expect(praise.message).toContain("7回連続");
  });

  it("100回以降は100回ごとに祝う", () => {
    expect(praiseFor(stats(199, 199), stats(200, 200), normal).message).toContain("200回連続");
  });

  it("累計の節目で祝う", () => {
    const praise = praiseFor(stats(9, 1), stats(10, 2), normal);
    expect(praise).toEqual({ message: expect.stringContaining("累計10日"), celebrate: true });
  });

  it("後押しで連続が復活したら祝う", () => {
    const praise = praiseFor(stats(5, 4), stats(6, 6), { isLate: true, isComeback: false });
    expect(praise.message).toContain("連続復活");
  });

  it("後押しで節目を越えたら節目を優先", () => {
    expect(praiseFor(stats(4, 1), stats(5, 3), { isLate: true, isComeback: false }).message).toContain("3回連続");
  });

  it("久しぶりの再開はおかえり", () => {
    expect(praiseFor(stats(4, 0), stats(5, 1), { isLate: false, isComeback: true }).message).toContain("おかえり");
  });
});
