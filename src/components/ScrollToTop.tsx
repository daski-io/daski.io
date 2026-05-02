import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * BrowserRouter doesn't reset the scroll position when the URL changes; every
 * client-side navigation lands you wherever the previous page left you. Mount
 * this once inside the router and the window resets to the top on each path
 * change. Hash navigation (e.g. `/#directory`) is left alone so anchor links
 * still work.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}
