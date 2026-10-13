export type Page = "live" | "setup";

const PAGES: Page[] = ["live", "setup"];
const listeners: ((page: Page) => void)[] = [];

function currentPage(): Page {
  const page = location.hash.replace(/^#\/?/, "");
  return (PAGES as string[]).includes(page) ? (page as Page) : "live";
}

function show(): void {
  const page = currentPage();
  for (const el of document.querySelectorAll<HTMLElement>("[data-page]")) {
    el.hidden = el.dataset.page !== page;
  }
  for (const link of document.querySelectorAll<HTMLElement>("[data-nav]")) {
    link.classList.toggle("active", link.dataset.nav === page);
  }
  listeners.forEach((cb) => cb(page));
}

/** Hash router (#/live, #/setup). Both pages stay mounted; only visibility changes. */
export function initRouter(): void {
  window.addEventListener("hashchange", show);
  show();
}

export function onPageShown(cb: (page: Page) => void): void {
  listeners.push(cb);
}
