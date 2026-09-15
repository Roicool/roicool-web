/**
 * organization.js — Organization JSON-LD.
 *
 * Runs at build time in Node, not in the browser: the output is a static block
 * pasted into the Webflow site head, so crawlers and answer engines see it in
 * the first response with no script execution.
 */

/**
 * @param {object} data   parsed content/organization.yml
 * @param {object} options
 * @param {string} options.locale  BCP 47 tag, e.g. "tr-TR"
 */
export function organization(data, { locale }) {
  const node = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${data.url}#organization`,
    name: data.name,
    url: data.url,
    inLanguage: locale,
  };

  if (data.legalName) node.legalName = data.legalName;
  if (data.description?.[locale]) node.description = data.description[locale];
  if (data.logo) node.logo = { "@type": "ImageObject", url: data.logo };
  if (data.foundingDate) node.foundingDate = data.foundingDate;
  if (data.sameAs?.length) node.sameAs = data.sameAs;

  if (data.address) {
    node.address = {
      "@type": "PostalAddress",
      streetAddress: data.address.street,
      addressLocality: data.address.locality,
      addressRegion: data.address.region,
      postalCode: data.address.postalCode,
      addressCountry: data.address.country,
    };
  }

  if (data.contact?.length) {
    node.contactPoint = data.contact.map((point) => ({
      "@type": "ContactPoint",
      contactType: point.type,
      email: point.email,
      telephone: point.telephone,
      availableLanguage: point.languages,
    }));
  }

  return node;
}
