/**
 * faq.js — FAQPage JSON-LD.
 *
 * Every question here must also be visible on the page it describes. Structured
 * data that contradicts the visible page is a guidelines violation, and answer
 * engines weigh the two against each other — so the same content/*.yml file
 * feeds both the JSON-LD and the Webflow copy.
 */

/**
 * @param {Array<{question: string, answer: string}>} questions
 * @param {object} options
 * @param {string} options.url     canonical URL of the page carrying the FAQ
 * @param {string} options.locale  BCP 47 tag
 */
export function faqPage(questions, { url, locale }) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    inLanguage: locale,
    mainEntity: questions.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };
}
