import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  showText?: boolean;
  tagline?: boolean;
  className?: string;
}

/**
 * BlockExchange brand mark — a 3D cube with "B" (blue gradient) and "E" (silver gradient)
 * on the visible faces, with an electric-blue inner core. Recreated as SVG.
 */
export function Logo({ size = 40, showText = true, tagline = false, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="BlockExchange logo"
        className="drop-shadow-[0_0_18px_rgba(14,165,255,0.45)]"
      >
        <defs>
          <linearGradient id="bx-blue" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2196F3" />
            <stop offset="100%" stopColor="#0D47A1" />
          </linearGradient>
          <linearGradient id="bx-silver" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E0E0E0" />
            <stop offset="100%" stopColor="#9E9E9E" />
          </linearGradient>
          <linearGradient id="bx-core" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#67D1FF" />
            <stop offset="100%" stopColor="#03A9F4" />
          </linearGradient>
        </defs>

        {/* Top face */}
        <path d="M32 4 L58 18 L32 32 L6 18 Z" fill="url(#bx-blue)" opacity="0.9" />
        {/* Left face — B */}
        <path d="M6 18 L32 32 L32 60 L6 46 Z" fill="url(#bx-blue)" />
        {/* Right face — E */}
        <path d="M58 18 L32 32 L32 60 L58 46 Z" fill="url(#bx-silver)" />

        {/* Inner core cube */}
        <path d="M32 20 L44 26 L32 32 L20 26 Z" fill="url(#bx-core)" />
        <path d="M20 26 L32 32 L32 44 L20 38 Z" fill="#03A9F4" opacity="0.95" />
        <path d="M44 26 L32 32 L32 44 L44 38 Z" fill="#0288D1" opacity="0.95" />

        {/* B letter on left face */}
        <text x="13" y="42" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="14" fill="#ffffff" opacity="0.95">
          B
        </text>
        {/* E letter on right face */}
        <text x="42" y="42" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="14" fill="#0a1428" opacity="0.95">
          E
        </text>
      </svg>

      {showText && (
        <div className="leading-none">
          <div className="text-lg font-bold tracking-tight">
            <span className="text-white">Block</span>
            <span className="bg-gradient-to-r from-[#2196F3] to-[#0D47A1] bg-clip-text text-transparent">Exchange</span>
          </div>
          {tagline && (
            <div className="mt-1 text-[10px] tracking-[0.32em] text-muted-foreground uppercase">
              Trade <span className="text-[#0ea5ff]">•</span> Invest <span className="text-[#0ea5ff]">•</span> Grow
            </div>
          )}
        </div>
      )}
    </div>
  );
}
