import type { SVGProps } from "react";

/**
 * GameIcon — the game's own crafted icon set, replacing emoji across the UI.
 *
 * Mono line-work with soft two-tone fills, drawn on a 24-grid and driven by
 * `currentColor`, so an icon inherits the colour of the text around it (set
 * `className="text-gold"` etc.) exactly where an emoji used to sit. Pure SVG,
 * SSR-safe. Give a `title` for meaningful icons; omit it for decorative ones
 * (they're marked aria-hidden).
 */

export type IconName =
  | "coin"
  | "timber"
  | "supply"
  | "worker"
  | "lock"
  | "tower"
  | "flame"
  | "spark"
  | "banner"
  | "swords"
  | "moon"
  | "pin"
  | "home"
  | "crown"
  | "scales"
  | "skull"
  | "market"
  | "shield"
  | "anvil"
  | "scroll"
  | "gem";

type Props = Omit<SVGProps<SVGSVGElement>, "children"> & {
  name: IconName;
  size?: number;
  title?: string;
};

// low-opacity accent fill for two-tone depth
const F = "currentColor";
const soft = { fill: F, fillOpacity: 0.18 } as const;

const PATHS: Record<IconName, React.ReactNode> = {
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" {...soft} />
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.6" />
      <path d="M12 9v6M9.4 12h5.2" strokeWidth="1.2" />
    </>
  ),
  timber: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="3" {...soft} />
      <rect x="3" y="8" width="18" height="8" rx="3" />
      <ellipse cx="7" cy="12" rx="2.2" ry="3" />
      <path d="M7 10.6v2.8" strokeWidth="1.1" />
    </>
  ),
  supply: (
    <>
      <path d="M4 7.5 12 4l8 3.5V16l-8 3.6L4 16Z" {...soft} />
      <path d="M4 7.5 12 4l8 3.5V16l-8 3.6L4 16Z" />
      <path d="m4 7.5 8 3.6 8-3.6M12 11.1v8.5" />
    </>
  ),
  worker: (
    <>
      <path d="M5 20a7 7 0 0 1 14 0Z" {...soft} />
      <circle cx="12" cy="7.5" r="3.4" />
      <path d="M6.2 6.5a6 6 0 0 1 11.6 0" strokeWidth="1.3" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" {...soft} />
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <circle cx="12" cy="15" r="1.4" fill={F} />
    </>
  ),
  tower: (
    <>
      <path d="M7 21V9l5-3 5 3v12Z" {...soft} />
      <path d="M7 9V6.5h1.7V8h1.7V6.5H12V8h1.6V6.5h1.7V8H17V9M7 21V9h10v12" />
      <path d="M12 6 12 3.5M10.5 4.6 12 3.5l1.5 1.1" strokeWidth="1.2" />
      <rect x="10.4" y="13" width="3.2" height="4.4" rx="0.6" fill={F} fillOpacity="0.5" />
    </>
  ),
  flame: (
    <>
      <path d="M12 3c3.5 4 5.5 6.4 5.5 9.5A5.5 5.5 0 0 1 6.5 12.5C6.5 9.4 8.5 7 12 3Z" {...soft} />
      <path d="M12 3c3.5 4 5.5 6.4 5.5 9.5A5.5 5.5 0 0 1 6.5 12.5C6.5 9.4 8.5 7 12 3Z" />
      <path
        d="M12 20c-1.9 0-3-1.2-3-2.8 0-1.6 1.1-2.6 3-4.7 1.9 2.1 3 3.1 3 4.7 0 1.6-1.1 2.8-3 2.8Z"
        fill={F}
        fillOpacity="0.55"
      />
    </>
  ),
  spark: (
    <>
      <path
        d="M12 2.5c.7 5.3 3.5 8.1 8.8 8.8-5.3.7-8.1 3.5-8.8 8.8-.7-5.3-3.5-8.1-8.8-8.8 5.3-.7 8.1-3.5 8.8-8.8Z"
        {...soft}
      />
      <path d="M12 2.5c.7 5.3 3.5 8.1 8.8 8.8-5.3.7-8.1 3.5-8.8 8.8-.7-5.3-3.5-8.1-8.8-8.8 5.3-.7 8.1-3.5 8.8-8.8Z" />
    </>
  ),
  banner: (
    <>
      <path d="M7 4h11l-2.4 3.4L18 11H7Z" {...soft} />
      <path d="M7 3v18" />
      <path d="M7 4h11l-2.4 3.4L18 11H7" />
    </>
  ),
  swords: (
    <>
      <path d="M14.5 3.5H19v4.5l-8.5 8.5-3-3ZM9.5 3.5H5v4.5l8.5 8.5 3-3" />
      <path d="M6 18l-1.5 1.5M18 18l1.5 1.5M4.5 16.5 7 19M19.5 16.5 17 19" strokeWidth="1.3" />
    </>
  ),
  moon: (
    <>
      <path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5Z" {...soft} />
      <path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5Z" />
    </>
  ),
  pin: (
    <>
      <path
        d="M12 21c4.2-4.6 6.3-7.7 6.3-10.5a6.3 6.3 0 0 0-12.6 0C5.7 13.3 7.8 16.4 12 21Z"
        {...soft}
      />
      <path d="M12 21c4.2-4.6 6.3-7.7 6.3-10.5a6.3 6.3 0 0 0-12.6 0C5.7 13.3 7.8 16.4 12 21Z" />
      <path d="M12 7v4.5M12 14.2v.1" strokeWidth="1.6" />
    </>
  ),
  home: (
    <>
      <path d="M4 11 12 4l8 7v9H4Z" {...soft} />
      <path d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  crown: (
    <>
      <path d="M4 8.5 7.5 13 12 6.5 16.5 13 20 8.5V18H4Z" {...soft} />
      <path d="M4 8.5 7.5 13 12 6.5 16.5 13 20 8.5V18H4Z" />
      <path d="M4 18h16" strokeWidth="1.3" />
      <circle cx="4" cy="8.5" r="1.1" fill={F} />
      <circle cx="20" cy="8.5" r="1.1" fill={F} />
      <circle cx="12" cy="6.5" r="1.1" fill={F} />
    </>
  ),
  scales: (
    <>
      <path d="M12 4v16M7 20h10" />
      <path d="M12 6 5 8m7-2 7 2" />
      <path d="M5 8 2.5 13h5ZM19 8l-2.5 5h5Z" {...soft} />
      <path d="M2.5 13a2.5 2.5 0 0 0 5 0M16.5 13a2.5 2.5 0 0 0 5 0" />
    </>
  ),
  skull: (
    <>
      <path d="M12 3a8 8 0 0 0-5 14.2V20h10v-2.8A8 8 0 0 0 12 3Z" {...soft} />
      <path d="M12 3a8 8 0 0 0-5 14.2V20h10v-2.8A8 8 0 0 0 12 3Z" />
      <circle cx="9" cy="12" r="1.7" fill={F} />
      <circle cx="15" cy="12" r="1.7" fill={F} />
      <path d="M11 16h2M10 20v-2M14 20v-2" strokeWidth="1.3" />
    </>
  ),
  market: (
    <>
      <path d="M4 9h16l-1 3H5Z" {...soft} />
      <path d="M4 9l1.4-3h13.2L20 9M4 9c1.5 1.6 3 1.6 4 0 1.5 1.6 2.5 1.6 4 0 1.5 1.6 2.5 1.6 4 0 1.5 1.6 2.5 1.6 4 0" />
      <path d="M6 12v8h12v-8M9 20v-5h6v5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.3 3 7.4 7 9 4-1.6 7-4.7 7-9V6Z" {...soft} />
      <path d="M12 3 5 6v5.5c0 4.3 3 7.4 7 9 4-1.6 7-4.7 7-9V6Z" />
      <path d="M12 3.2v17.1" strokeWidth="1.2" strokeOpacity="0.6" />
    </>
  ),
  anvil: (
    <>
      <path d="M4 9h11c0 2-1.6 3.4-4 3.7V15h3v2H7v-2h3v-2.3C6 12 5 10.5 5 9Z" {...soft} />
      <path d="M4 9h11c0 2-1.6 3.4-4 3.7V15h3v2H7v-2h3v-2.3C6 12 5 10.5 5 9Z" />
      <path d="M15 9h4l-1.5 3H15" />
    </>
  ),
  scroll: (
    <>
      <path d="M7 5h10v11a3 3 0 0 1-3 3H6a3 3 0 0 0 3-3Z" {...soft} />
      <path d="M17 5a2 2 0 0 1 2 2v1h-2M7 5a2 2 0 0 0-2 2v1h2M7 5h10v11a3 3 0 0 1-3 3H6a3 3 0 0 0 3-3Z" />
      <path d="M9.5 9h5M9.5 12h5" strokeWidth="1.2" />
    </>
  ),
  gem: (
    <>
      <path d="M5 9.5 8 5h8l3 4.5L12 20Z" {...soft} />
      <path d="M5 9.5 8 5h8l3 4.5L12 20Z" />
      <path d="M5 9.5h14M8 5l1.5 4.5L12 20l2.5-10.5L16 5" strokeWidth="1.1" />
    </>
  ),
};

export function GameIcon({ name, size = 16, title, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
