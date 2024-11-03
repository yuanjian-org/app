
export default function getBaseUrl() {
  if (typeof window !== 'undefined') return window.location.origin;
  // vercel.com
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // non-vercel.com production environemnt (e.g. Docker). We piggyback on
  // nextauth's configuration.
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  // fall back to localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
