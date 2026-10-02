import { COLOR_CLASSES, type HabitColor } from "@/lib/habits";

/** はんこ風のスタンプ。後押しのスタンプは薄く表示する */
export function StampMark({ icon, color, late, className = "" }: { icon: string; color: HabitColor; late?: boolean; className?: string }) {
  return (
    <span
      className={`flex aspect-square -rotate-12 items-center justify-center rounded-full ${COLOR_CLASSES[color].stamp} ${
        late ? "opacity-45" : ""
      } ${className}`}
    >
      <span className="drop-shadow-sm">{icon}</span>
    </span>
  );
}
