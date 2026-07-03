import { hash } from "./hash";

export function getColorFromText(text: string): string {
  const colors = [
    "red",
    "orange",
    "yellow",
    "green",
    "teal",
    "blue",
    "cyan",
    "purple",
  ];
  const index = Math.abs(hash(text)) % colors.length;
  return colors[index];
}
