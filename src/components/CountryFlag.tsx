/**
 * Renders a country flag as an <img> using flagcdn.com SVGs.
 * Avoids Unicode regional-indicator emoji which don't render on Windows.
 */
interface CountryFlagProps {
  alpha2: string; // ISO 3166-1 alpha-2 code, e.g. "NO"
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "h-3.5 w-5",
  md: "h-4 w-6",
  lg: "h-6 w-9",
} as const;

export const CountryFlag = ({ alpha2, name, size = "md", className = "" }: CountryFlagProps) => {
  const code = alpha2.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/${code}.svg`}
      alt={name || alpha2}
      title={name || alpha2}
      className={`${SIZES[size]} inline-block rounded-[2px] object-cover ${className}`}
      loading="lazy"
    />
  );
};
