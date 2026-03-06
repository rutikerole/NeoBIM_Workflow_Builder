export function Logo({ size = "default" }: { size?: "small" | "default" | "large" }) {
  const sizes = {
    small: { icon: 20, text: 16 },
    default: { icon: 24, text: 20 },
    large: { icon: 32, text: 28 },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-2">
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Bottom block */}
        <rect x="4" y="18" width="10" height="10" rx="2" fill="#4F8AFF" opacity="0.9" />
        {/* Top block */}
        <rect x="8" y="8" width="10" height="10" rx="2" fill="#8B5CF6" opacity="0.9" />
        {/* Flow arrow */}
        <path
          d="M20 13 L26 13 L26 9 L32 16 L26 23 L26 19 L20 19 Z"
          fill="#10B981"
          opacity="0.9"
        />
      </svg>
      <span
        style={{ fontSize: s.text, fontWeight: 700 }}
        className="text-white tracking-tight"
      >
        Build<span className="text-[#4F8AFF]">Flow</span>
      </span>
    </div>
  );
}
