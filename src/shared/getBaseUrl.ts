
export default function getBaseUrl() {
  // browser should use relative path
  if (typeof window !== 'undefined') return '';
  // vercel.com
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // non-vercel.com production environemnt (e.g. Docker), set in .env file
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL;
  // fall back to localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
