#!/usr/bin/env node
//
// Refreshes the Reviews section of index.html from the Google Business listing.
//
// Fetches the listing via the Places API (New) and rewrites:
//   - the review cards between <!-- reviews:start --> and <!-- reviews:end -->
//   - "aggregateRating" and "review" in the LocalBusiness JSON-LD
//
// The page stays plain static HTML — this runs on a schedule in GitHub Actions
// (.github/workflows/update-reviews.yml) and commits the result if it changed.
//
// Google only returns its five "most relevant" reviews, so that is the most
// the section can show.
//
// Requires Node 18+ (built-in fetch). Run from anywhere:
//   GOOGLE_PLACES_API_KEY=... node tools/update-reviews.mjs
//
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
// Pinned listing (not a secret). Set GOOGLE_PLACE_ID=search to look it up again
// by text search if Google ever reissues the ID.
const PLACE_ID_ENV = process.env.GOOGLE_PLACE_ID;
const PLACE_ID =
  PLACE_ID_ENV === "search" ? "" : PLACE_ID_ENV || "ChIJ0fcB8gSbeUgRJHL6Tv-dg84";
const SEARCH_QUERY = "Tal's Pals dog walking Staveley Chesterfield";
// Reviews below this rating are left off the page.
const MIN_RATING = 4;

const INDEX = fileURLToPath(new URL("../index.html", import.meta.url));
const START = "<!-- reviews:start -->";
const END = "<!-- reviews:end -->";

if (!API_KEY) {
  console.error("GOOGLE_PLACES_API_KEY is not set.");
  process.exit(1);
}

async function places(path, fieldMask, init = {}) {
  const res = await fetch(`https://places.googleapis.com/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
  });
  if (!res.ok) {
    throw new Error(`Places API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function findPlaceId() {
  const data = await places("places:searchText", "places.id,places.displayName", {
    method: "POST",
    // No shopfront: text search skips service-area businesses unless asked.
    body: JSON.stringify({
      textQuery: SEARCH_QUERY,
      regionCode: "GB",
      includePureServiceAreaBusinesses: true,
    }),
  });
  const place = data.places?.[0];
  if (!place) throw new Error(`No listing found for "${SEARCH_QUERY}".`);
  console.log(`Found "${place.displayName?.text}" — place ID ${place.id}`);
  return place.id;
}

const escapeHtml = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Same star icons as the rest of the site; rounds to the nearest half.
function stars(rating, indent) {
  const halves = Math.round(rating * 2);
  const icons = [];
  for (let i = 1; i <= 5; i++) {
    const icon = halves >= i * 2 ? "full" : halves === i * 2 - 1 ? "half" : "empty";
    icons.push(`${indent}<img src="img/star-${icon}.svg" alt="" />`);
  }
  return icons.join("\n");
}

function card(review) {
  const name = escapeHtml(review.author);
  const author = review.authorUri
    ? `<a href="${escapeHtml(review.authorUri)}" target="_blank" rel="noopener nofollow">${name}</a>`
    : name;
  const text = escapeHtml(review.text).replace(/\s*\n\s*/g, "<br />\n            ");
  return `        <div class="review-card">
          <div class="review-wrapper">
            <div class="review-details">
              <span class="review-name">${author}</span>
              <div class="review-rating" role="img" aria-label="Rated ${review.rating} out of 5 stars">
${stars(review.rating, "                ")}
              </div>
            </div>
          </div>
          <div class="review-text">
            ${text}
          </div>
        </div>`;
}

function section(place, reviews) {
  const rating = place.rating.toFixed(1);
  return `${START}
      <div class="container review-container">
${reviews.map(card).join("\n")}
      </div>
      <p class="review-summary">
        <span class="review-rating" role="img" aria-label="Rated ${rating} out of 5 stars">
${stars(place.rating, "          ")}
        </span>
        Rated ${rating} from ${place.userRatingCount} reviews on Google.
        <a href="${escapeHtml(place.googleMapsUri)}" target="_blank" rel="noopener">Read them all on Google</a>
      </p>
      ${END}`;
}

function replaceOnce(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error(`Could not find ${label} in index.html.`);
  return html.replace(pattern, () => replacement);
}

function updateJsonLd(html, place, reviews) {
  const aggregate = `"aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "${place.rating.toFixed(1)}",
          "reviewCount": "${place.userRatingCount}"
        }`;
  const items = reviews.map((r) => ({
    "@type": "Review",
    author: { "@type": "Person", name: r.author },
    datePublished: r.date,
    reviewRating: { "@type": "Rating", ratingValue: String(r.rating), bestRating: "5" },
    reviewBody: r.text.replace(/\s*\n\s*/g, " "),
  }));
  // "</" can't appear inside an inline <script> block.
  const json = JSON.stringify(items, null, 2).replace(/<\//g, "<\\/");
  const review = `"review": ${json.replace(/\n/g, "\n        ")}`;

  html = replaceOnce(html, /"aggregateRating": \{[^}]*\}/, aggregate, "aggregateRating");
  html = replaceOnce(html, /"review": \[[\s\S]*?\n {8}\]/, review, "the JSON-LD review list");

  // Make sure the edited block is still valid JSON before it gets committed.
  const block = html.match(
    /<script type="application\/ld\+json">((?:(?!<\/script>)[\s\S])*"aggregateRating"[\s\S]*?)<\/script>/
  );
  JSON.parse(block[1]);
  return html;
}

const placeId = PLACE_ID || (await findPlaceId());
const place = await places(
  `places/${placeId}?languageCode=en-GB`,
  "id,displayName,rating,userRatingCount,googleMapsUri,reviews"
);

const reviews = (place.reviews ?? [])
  .map((r) => ({
    author: r.authorAttribution?.displayName ?? "Google user",
    authorUri: r.authorAttribution?.uri,
    rating: r.rating,
    text: (r.originalText?.text ?? r.text?.text ?? "").trim(),
    date: r.publishTime?.slice(0, 10),
  }))
  .filter((r) => r.text && r.rating >= MIN_RATING);

// Never blank the section because of an empty or odd API response.
if (!reviews.length || !place.rating || !place.userRatingCount) {
  throw new Error("Places API returned no usable reviews — leaving index.html alone.");
}

const original = await readFile(INDEX, "utf8");
let html = replaceOnce(
  original,
  new RegExp(`${START}[\\s\\S]*?${END}`),
  section(place, reviews),
  "the reviews:start / reviews:end markers"
);
html = updateJsonLd(html, place, reviews);

if (html === original) {
  console.log("Reviews already up to date.");
} else {
  await writeFile(INDEX, html);
  console.log(
    `Updated index.html: ${reviews.length} reviews, ${place.rating.toFixed(1)} from ${place.userRatingCount} ratings.`
  );
}
