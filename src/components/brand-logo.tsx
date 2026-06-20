type BrandLogoMarkProps = {
  className?: string;
};

export function BrandLogoMark({ className }: BrandLogoMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 60 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 32L16 14L16 32H4Z"
        fill="url(#brand-logo-gradient-left)"
      />
      <path
        d="M18 32L30 6L42 32H18Z"
        fill="url(#brand-logo-gradient-center)"
      />
      <path
        d="M38 32L52 18V32H38Z"
        fill="url(#brand-logo-gradient-right)"
      />
      <defs>
        <linearGradient id="brand-logo-gradient-left" x1="4" y1="32" x2="16" y2="14">
          <stop stopColor="#68b9e2" />
          <stop offset="1" stopColor="#3753a4" />
        </linearGradient>
        <linearGradient id="brand-logo-gradient-center" x1="18" y1="32" x2="30" y2="6">
          <stop stopColor="#68b9e2" />
          <stop offset="1" stopColor="#3753a4" />
        </linearGradient>
        <linearGradient id="brand-logo-gradient-right" x1="38" y1="32" x2="52" y2="18">
          <stop stopColor="#68b9e2" />
          <stop offset="1" stopColor="#3753a4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

type BrandLogoProps = {
  className?: string;
  showTagline?: boolean;
  tone?: "light" | "dark";
};

export function BrandLogo({ className, showTagline = true, tone = "light" }: BrandLogoProps) {
  const textClass = tone === "light" ? "brand-logo-text--light" : "brand-logo-text--dark";

  return (
    <div className={`brand-logo ${textClass} ${className ?? ""}`.trim()}>
      <BrandLogoMark className="brand-logo-mark-svg" />
      <div className="brand-logo-copy" dir="rtl">
        <span className="brand-logo-title">אפיקי אשראי מומנטום</span>
        {showTagline ? (
          <span className="brand-logo-tagline">פתרונות מימון מתקדמים</span>
        ) : null}
      </div>
    </div>
  );
}
