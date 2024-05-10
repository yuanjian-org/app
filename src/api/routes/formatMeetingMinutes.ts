
export default function formatMeetingMinutes(minutes: string): string {
  let sections = minutes.split("\n\n");
  const todoIndex = sections.findIndex(s => s.startsWith("会议待办"));
  if (todoIndex >= 0) {
    // +1 to skip "会议摘要" and "会议待办" lines
    const summarySection = sections.slice(1, todoIndex);
    const todoSection = sections.slice(todoIndex + 1);
    sections = [
      "## 会议待办",
      ...todoSection.map(s => formatTodoSection(s)),
      "## 会议摘要",
      ...summarySection.map(s => formatSummarySection(s)),
    ];
  } else {
    // There is no TODOs
    sections = [
      "## 会议摘要",
      ...sections.slice(1).map(s => formatSummarySection(s)),
    ];
  }
  
  return sections.join("\n\n\n");
}

function formatTodoSection(section: string): string {
    return section.replaceAll("· ", "* ");
}

function formatSummarySection(section: string): string {
    const lines = section.split("\n");
    return lines.length == 0 ? section : [
      `**${lines[0]}**`,
      ...lines.slice(1),
    ].join("\n\n");
}
