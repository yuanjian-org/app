/**
 * We don't use static imports to avoid the following problem:
 * /Users/weihanwang/repos/app/node_modules/ts-node/dist/index.js:851
 *            return old(m, filename);
 *                  ^
 * Error [ERR_REQUIRE_ESM]: require() of ES Module ... from ... not supported.
 * Instead change the require of index.js in ... to a dynamic import() which is
 * available in all CommonJS modules.
 */

export default async function markdown2html(markdown: string) {
  const { unified } = await import('unified');
  const { default: remarkGfm } = await import('remark-gfm');
  const { default: remarkParse } = await import('remark-parse');
  const { default: remarkRehype } = await import('remark-rehype');
  const { default: rehypeStringify } = await import('rehype-stringify');
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);
  return file.toString();
}
