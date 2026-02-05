"use client";

interface ProgressBarProps {
  value: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
}

export default function ProgressBar({ value, size = "sm", showLabel = false, animated = true }: ProgressBarProps) {
  const heights = { sm: "h-1", md: "h-1.5", lg: "h-2.5" };
  const h = heights[size];
  const v = Math.min(100, Math.max(0, value));

  const getGradient = () => {
    if (v >= 80) return "from-emerald-400 to-emerald-500";
    if (v >= 50) return "from-blue-400 to-indigo-500";
    if (v >= 25) return "from-amber-400 to-orange-500";
    return "from-slate-500 to-slate-400";
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] text-slate-500 font-medium">Progress</span>
          <span className={`text-[11px] font-semibold ${v >= 80 ? 'text-emerald-400' : v >= 50 ? 'text-blue-400' : v >= 25 ? 'text-amber-400' : 'text-slate-400'}`}>
            {v}%
          </span>
        </div>
      )}
      <div className={`w-full ${h} bg-slate-800/60 rounded-full overflow-hidden`}>
        <div
          className={`${h} bg-gradient-to-r ${getGradient()} rounded-full ${animated ? 'transition-all duration-700 ease-out' : ''} relative`}
          style={{ width: `${v}%` }}
        >
          {v > 0 && size !== "sm" && (
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 shimmer rounded-full" />
          )}
        </div>
      </div>
    </div>
  );
}
