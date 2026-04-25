export const AMAZON_ASSOCIATE_TAG = "delarocha-20";

export function getAmazonUrl(isbn: string): string {
  return `https://www.amazon.com/dp/${isbn}?tag=${AMAZON_ASSOCIATE_TAG}`;
}

export function getCoverUrl(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
}
