export default function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
