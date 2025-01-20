import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

export default async function markdown2html(markdown: string) {
  const file = await unified()
    .use(remarkParse) // Parses markdown to a syntax tree
    .use(remarkGfm) // Supports GitHub Flavored Markdown
    .use(remarkRehype) // Transforms the syntax tree to HTML
    .use(rehypeStringify) // Compiles the HTML syntax tree to a string
    .process(markdown);
  return file.toString();
}