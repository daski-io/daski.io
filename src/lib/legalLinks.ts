import type { PublicServiceLegal } from './api';

// A hosted provider may leave its own terms and privacy pages blank; its
// card then names Daski's marketplace pages in the provider's place. The
// pages show such a link as Daski's, never as the provider's own.

/** Whether two links name the same page: the same origin, path (a trailing slash ignored) and query. */
export function samePage(left: string, right: string): boolean {
  let a: URL;
  let b: URL;
  try {
    a = new URL(left);
    b = new URL(right);
  } catch {
    return false;
  }
  const path = (url: URL) => url.pathname.replace(/\/+$/, '') || '/';
  return a.origin === b.origin && path(a) === path(b) && a.search === b.search;
}

/** Whether the provider's terms and its privacy page are its own, or Daski's marketplace pages in their place. */
export function providerOwnsLegalPages(legal: PublicServiceLegal): { terms: boolean; privacy: boolean } {
  return {
    terms: !samePage(legal.providerTermsUrl, legal.marketplaceTermsUrl),
    privacy: !samePage(legal.providerPrivacyUrl, legal.marketplacePrivacyUrl),
  };
}
