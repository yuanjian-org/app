import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '../theme/MarkdownStyler.module.css';

// Note that this library increases bundle size significantly:
// https://github.com/remarkjs/react-markdown?tab=readme-ov-file#appendix-a-html-in-markdown
import rehypeRaw from 'rehype-raw';

/**
 * This component is to correctly render markdowns with Chakra UI.
 * Chakra UI's CSSReset component disables browser default style. See
 * https://stackoverflow.com/a/64317290
 * 
 * @params allowHtml Whether to parse raw html tags in content. DANGEROUS!
 * 
 * TODO: replace the implementation with markdown2html.ts?
 */
export default function MarkdownStyler({ content, allowHtml }: {
  content: string,
  allowHtml?: boolean,
}) {
  return <div className={styles.markdownStyler}>
    {/* remarkGfm is to enable rendering URL strings as HTML links.
      * See https://github.com/remarkjs/react-markdown?tab=readme-ov-file#use
      *
      * However, there is a bug in remark-gfm v4.0.0 that can crash the UI on
      * inline code blocks (`...` or ```...```):
      * https://github.com/remarkjs/remark-gfm/issues/57
      */}
    {/* @ts-expect-error for "Types of property 'rehypePlugins' are incompatible" */}
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      {...allowHtml ? { rehypePlugins: [rehypeRaw] } : {}}
      // Avoid the propagation of clicking on a link to parent components.
      components={{
        a: ({ ...props }) => (
          <a {...props} onClick={e => e.stopPropagation()} />
        )
      }}
    >{content}</ReactMarkdown>
  </div>;
}
