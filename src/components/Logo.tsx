export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="14" stroke="var(--glow)" strokeWidth="1.5" />
      <path d="M4 16h24M16 2c5 4 5 24 0 28M16 2c-5 4-5 24 0 28" stroke="var(--glow)" strokeWidth="1" opacity="0.6" />
      <circle cx="21" cy="11" r="3" fill="var(--glow-2)" />
    </svg>
  );
}
