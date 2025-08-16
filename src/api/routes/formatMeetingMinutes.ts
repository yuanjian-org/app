/**
 * @returns An empty string if there is no meeting minutes or TODOs.
 */
export default function formatMeetingMinutes(minutes: string): string {
  let sections = minutes
    .replaceAll("（注：文档部分内容可能由 AI 生成）", "")
    .replaceAll("暂无会议待办", "")
    .split("\n\n");

  const filtered = (s: string[]) => s.filter((s) => s.length > 0);

  const todoIndex = sections.findIndex((s) => s.startsWith("会议待办"));
  if (todoIndex >= 0) {
    // +1 to skip "会议摘要" and "会议待办" lines
    const summary = filtered(sections.slice(1, todoIndex));
    const todo = filtered(sections.slice(todoIndex + 1));
    if (todo.length == 0 && summary.length == 0) {
      return "";
    }
    sections = [
      "### 会议待办",
      ...todo.map((s) => formatTodoItem(s)),
      "### 会议摘要",
      ...summary.map((s) => formatSummaryBlock(s)),
    ];
  } else {
    // There is no TODOs
    const summary = filtered(sections.slice(1));
    if (summary.length == 0) {
      return "";
    }
    sections = ["### 会议摘要", ...summary.map((s) => formatSummaryBlock(s))];
  }

  return sections.join("\n\n\n");
}

function formatTodoItem(section: string): string {
  return section.replaceAll("· ", "* ");
}

function formatSummaryBlock(section: string): string {
  const lines = section.split("\n");
  return lines.length == 0
    ? section
    : [`**${lines[0]}**`, ...lines.slice(1)].join("\n\n");
}
