/**
 * Use <UserName> instead in frontend code.
 */
export function formatUserName(
  name: string | null,
  mode: "friendly" | "formal" = "formal",
) {
  if (!name) return "（佚名）";
  return mode === "friendly"
    ? name.substring(Math.max(0, name.length - 2))
    : name;
}
