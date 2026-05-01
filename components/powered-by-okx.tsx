export function PoweredByOkx() {
  return (
    <div className="mt-2 flex items-center justify-center text-center text-xs text-muted-foreground">
      <span>Powered by</span>
      <a
        href="https://www.okx.com"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-1 flex items-center transition-colors hover:text-foreground"
      >
        OKX
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-1 size-3"
        >
          <path d="M7 17L17 7"></path>
          <path d="M7 7h10v10"></path>
        </svg>
      </a>
    </div>
  );
}
