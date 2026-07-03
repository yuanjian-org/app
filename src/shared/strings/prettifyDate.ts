import { DateColumn } from "../DateColumn";
import { diffInMinutes } from "./diffInMinutes";

export function prettifyDate(str: Date | DateColumn) {
  const date = new Date(str);
  const now = new Date();
  const dim = diffInMinutes(date, now);
  if (dim < -24 * 60) return `${Math.floor(-dim / 24 / 60)} 天后`;
  if (dim < -60) return `${Math.floor(-dim / 60)} 小时后`;
  if (dim < 0) return `${-dim} 分钟后`;
  if (dim < 1) return `刚刚`;
  if (dim < 60) return `${dim} 分钟前`;
  if (dim < 24 * 60) return `${Math.floor(dim / 60)} 小时前`;
  if (dim < 30 * 24 * 60) return `${Math.floor(dim / 24 / 60)} 天前`;
  if (date.getFullYear() == now.getFullYear()) {
    return date.toLocaleDateString("zh-cn", { day: "numeric", month: "short" });
  } else {
    return date.toLocaleDateString("zh-cn", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
}
