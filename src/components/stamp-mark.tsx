import { COLOR_CLASSES, type HabitColor } from "@/lib/habits";

/** はんこ風のスタンプ。後押しのスタンプは薄く表示する。2回以上なら「×回数」を添える */
export function StampMark({
  icon,
  color,
  late,
  count = 1,
  className = "",
}: {
  icon: string;
  color: HabitColor;
  late?: boolean;
  count?: number;
  className?: string;
}) {
  return (
    <span className={`relative flex aspect-square items-center justify-center ${className}`}>
      <span
        className={`flex size-full -rotate-12 items-center justify-center rounded-full ${COLOR_CLASSES[color].stamp} ${
          late ? "opacity-45" : ""
        }`}
      >
        <span className="drop-shadow-sm">{icon}</span>
      </span>
      {count >= 2 && (
        <span className="absolute -right-1 -bottom-1 rounded-full bg-stone-900 px-1 text-[10px] leading-4 font-black text-white dark:bg-white dark:text-stone-900">
          ×{count}
        </span>
      )}
    </span>
  );
}
