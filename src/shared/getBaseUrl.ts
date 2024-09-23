
export default function getBaseUrl() {
  // browser should use relative path
  if (typeof window !== 'undefined') return '';
  // vercel.com
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // non-vercel.com production environemnt (e.g. Docker). We piggyback on
  // nextauth's configuration.
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  // fall back to localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
