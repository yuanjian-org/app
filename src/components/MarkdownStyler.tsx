import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '../theme/MarkdownStyler.module.css';

/**
 * This component is to correctly render markdowns with Chakra UI.
 * Chakra UI's CSSReset component disables browser default style. See
 * https://stackoverflow.com/a/64317290
 */
const MarkdownStyler = ({ content }: { content: string }) => (
  <div className={styles.markdownStyler}>
    {/* remarkGfm is to enable rendering URL strings as HTML links.
      * See https://github.com/remarkjs/react-markdown?tab=readme-ov-file#use
      *
      * However, there is a bug in remark-gfm v4.0.0 that can crash the UI on
      * inline code blocks (`...` or ```...```):
      * https://github.com/remarkjs/remark-gfm/issues/57
      */}
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
  </div>
);

export default MarkdownStyler;
