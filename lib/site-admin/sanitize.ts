import sanitizeHtml from "sanitize-html";

const richTextClasses = [
  "rt-font-sans",
  "rt-font-serif",
  "rt-size-sm",
  "rt-size-base",
  "rt-size-lg",
  "rt-size-xl",
  "rt-leading-tight",
  "rt-leading-normal",
  "rt-leading-loose",
  "rt-tracking-tight",
  "rt-tracking-normal",
  "rt-tracking-wide"
];

export function sanitizePostBody(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "span",
      "h2",
      "h3",
      "blockquote"
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
      span: ["class"],
      p: ["class"],
      h2: ["class"],
      h3: ["class"],
      blockquote: ["class"]
    },
    allowedClasses: {
      span: richTextClasses,
      p: richTextClasses,
      h2: richTextClasses,
      h3: richTextClasses,
      blockquote: richTextClasses
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"]
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noreferrer",
        target: "_blank"
      }, true)
    }
  }).trim();
}
