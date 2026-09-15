/**
 * breadcrumb.js — BreadcrumbList JSON-LD.
 *
 * Tells a crawler where a page sits in the site, which is how deep pages get
 * discovered and how an answer engine learns the relationship between a service
 * page and the section above it.
 */

/**
 * @param {Array<{name: string, url: string}>} trail  root first, current last
 */
export function breadcrumbList(trail) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
