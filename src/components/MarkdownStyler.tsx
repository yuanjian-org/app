import React from 'react';
import ReactMarkdown from 'react-markdown';
import styles from '../theme/MarkdownStyler.module.css';

// This component is to correctly render Markdowns when using chakra UI
// Chakra UI CSSReset component is turning down browser default style of elements
// https://stackoverflow.com/a/64317290
const MarkdownStyler = ({ content }: { content: string }) => (
  <div className={styles.markdownStyler}>
    <ReactMarkdown>{content}</ReactMarkdown>
  </div>
);

export default MarkdownStyler;
