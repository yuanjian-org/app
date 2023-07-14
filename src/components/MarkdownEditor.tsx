
/**
 * Markdown editor from https://www.npmjs.com/package/react-simplemde-editor.
 */
import React, { useMemo } from 'react';
import "easymde/dist/easymde.min.css";

// This block is a hack from https://github.com/dabit3/next.js-amplify-workshop/issues/21#issuecomment-843188036 to work
// around the "navigator is not defined" issue.
import dynamic from "next/dynamic";
const SimpleMDE = dynamic(
	() => import("react-simplemde-editor"),
	{ ssr: false }
);

// See https://www.npmjs.com/package/react-simplemde-editor#options on the reason for using a global constant.
const options = {
  spellChecker: false,
  autofocus: true,
  // This has no effect. Need more research.
  // readOnly: true,
} /* as SimpleMDE.Options -- ts warns on this due to the above hack */;

export default function MarkdownEditor({ value, onChange, ...rest }: {
  value: string,
  // Remember to use useCallback to avoid rerendering the editor unnecessarily.
  onChange?: (value: string) => void,
  // Other options. See https://github.com/Ionaru/easy-markdown-editor#options-list
  [key: string]: any,  /* SimpleMDE.Options -- ts warns on this due to the above hack */
}) {
  return <SimpleMDE value={value} options={{ ...options, ...rest }} onChange={onChange} />;
}
