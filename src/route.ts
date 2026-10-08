import { useEffect, useState } from 'react';

// Minimal router for /console/* and /family/*: real URLs, so links, Back and refresh behave like a website.
const listeners = new Set<() => void>();

export function go(path: string) {
  if (path === location.pathname + location.search) return;
  history.pushState(null, '', path);
  listeners.forEach(l => l());
  window.scrollTo(0, 0);
}

export function useRoute() {
  const read = () => ({ path: location.pathname.replace(/\/+$/, '') || '/console', params: new URLSearchParams(location.search) });
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const update = () => setRoute(read());
    listeners.add(update);
    window.addEventListener('popstate', update);
    return () => {
      listeners.delete(update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  return route;
}

/** A link that routes inside the console or family app without reloading. */
export function linkProps(path: string) {
  return {
    href: path,
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let the browser open a new tab
      e.preventDefault();
      go(path);
    }
  };
}
