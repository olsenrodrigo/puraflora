// Glifos de redes sociais monocromáticos (currentColor) para usar na paleta do site.

export function TikTokIcon({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3c-1.05.05-2.32-.35-3.24-1.48z" />
    </svg>
  );
}

export function KwaiIcon({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        d="M7 3.5h10c2.5 0 3.5 1 3.5 3.5v10c0 2.5-1 3.5-3.5 3.5H7c-2.5 0-3.5-1-3.5-3.5V7c0-2.5 1-3.5 3.5-3.5Z"
        opacity=".2"
      />
      <path d="M9.6 8.2v7.6a.7.7 0 0 0 1.07.6l6.06-3.8a.7.7 0 0 0 0-1.2L10.67 7.6a.7.7 0 0 0-1.07.6Z" />
    </svg>
  );
}
