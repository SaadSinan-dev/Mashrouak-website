/** A meridian drawing in the brand palette. One illuminated edge, three
 * construction arcs and a quiet centre leave room for the live heading. */
export function HeroHorizon() {
  return (
    <div className="hero-horizon" aria-hidden="true">
      <svg className="hero-horizon__plate" viewBox="0 0 1440 640" fill="none" focusable="false">
        <defs>
          <linearGradient id="horizon-body" x2="0" y2="1">
            <stop stopColor="var(--rim-close)"/>
            <stop offset=".12" stopColor="var(--rim-shade)"/>
            <stop offset=".54" stopColor="var(--sky)"/>
          </linearGradient>
          <filter id="horizon-bloom" filterUnits="userSpaceOnUse" x="0" y="0" width="1440" height="640">
            <feGaussianBlur stdDeviation="16"/>
          </filter>
          <linearGradient id="horizon-rim">
            <stop stopColor="var(--rim-lit)" stopOpacity="0"/>
            <stop offset=".28" stopColor="var(--rim-glow)" stopOpacity=".65"/>
            <stop offset=".46" stopColor="var(--rim-lit)"/>
            <stop offset=".66" stopColor="var(--rim-glow)" stopOpacity=".8"/>
            <stop offset="1" stopColor="var(--rim-lit)" stopOpacity="0"/>
          </linearGradient>
          <clipPath id="horizon-disc"><ellipse cx="720" cy="588" rx="644" ry="506"/></clipPath>
        </defs>
        <path d="M76 588a644 506 0 0 1 1288 0" stroke="url(#horizon-rim)" strokeWidth="29" filter="url(#horizon-bloom)" opacity=".78"/>
        <ellipse cx="720" cy="588" rx="644" ry="506" fill="url(#horizon-body)" />
        <g clipPath="url(#horizon-disc)" stroke="var(--rim-grid)" strokeWidth=".85" opacity=".35">
          <path d="M50 181 Q736 -147 1395 326 M24 265 Q718 -153 1430 397 M0 393 Q726 -146 1440 481"/>
          <path d="M598 56 Q238 182 184 540 M648 61 Q439 172 453 580 M760 57 Q944 235 915 564 M802 55 Q1120 155 1223 502"/>
        </g>
        <path d="M76 588a644 506 0 0 1 1288 0" stroke="url(#horizon-rim)" strokeWidth="2"/>
        <g stroke="var(--rim-grid)" opacity=".62">
          <path d="M185 175h12m-6-6v12 M1241 210h12m-6-6v12 M340 64h6m-3-3v6"/>
          <circle cx="1080" cy="169" r="3"/>
        </g>
      </svg>
    </div>
  );
}
