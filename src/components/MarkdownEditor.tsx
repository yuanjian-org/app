/**
 * Markdown editor from https://www.npmjs.com/package/react-simplemde-editor.
 */
import React, { useMemo, useState } from 'react';
import "easymde/dist/easymde.min.css";

// This block is a hack from https://github.com/dabit3/next.js-amplify-workshop/issues/21#issuecomment-843188036 to work
// around the "navigator is not defined" issue.
import dynamic from "next/dynamic";
import Autosaver from './Autosaver';
const SimpleMDE = dynamic(
	() => import("react-simplemde-editor"),
	{ ssr: false }
);

// See https://www.npmjs.com/package/react-simplemde-editor#options on the reason for using a global constant.
const options = {
  spellChecker: false,
  autofocus: true,
  hideIcons: ["link", "image", "side-by-side", "fullscreen"],
  // This has no effect. Need more research.
  // readOnly: true,
} /* as SimpleMDE.Options -- ts warns on this due to the above hack */;

/**
 * It's highly recommended (and sometimes necessary) to use `key` to uniquely identify the editor,
 * to prevent the system from confusing the persistent states maintained in multiple instances of this component.
 */
export default function MarkdownEditor({ initialValue, onChange, ...rest }: {
  initialValue: string,
  // Remember to use useCallback to avoid rerendering the editor unnecessarily.
  onChange?: (value: string) => void,
  // Other options. See https://github.com/Ionaru/easy-markdown-editor#options-list
  [key: string]: any,  /* SimpleMDE.Options -- ts warns on this due to the above hack */
}) {
  // @ts-ignore
  return <SimpleMDE value={initialValue} options={{ ...options, ...rest }} onChange={onChange} />;
}

/**
 * It's highly recommended (and sometimes necessary) to use `key` to uniquely identify the editor,
 * to prevent the system from confusing the persistent states maintained in multiple instances of this component.
 * 
 * TODO: For some reason using `...rest` to pass in the remaining options to <MarkdownEditor> causes it to reload 
 * whenver the user types. It seems that on every type event the system thinks `rest` has changed.
 */
export function AutosavingMarkdownEditor({ initialValue, onSave, maxHeight, toolbar, status, placeholder }: {
  initialValue?: string | null,
  onSave: (edited: string) => Promise<void>,
  placeholder?: string,
  maxHeight?: string,
  toolbar?: boolean,
  status?: boolean,
}) {
  const [edited, setEdited] = useState<string | undefined>();

  // Receating the editor on each change on `edited` will reset its focus (and possibly other states). So don't do it.
  const editor = useMemo(() => <MarkdownEditor 
      initialValue={initialValue || ''} 
      onChange={v => setEdited(v)} 
      placeholder={placeholder ? placeholder : "内容会自动保存"}
      {...maxHeight == undefined ? {} : { maxHeight }} 
      {...toolbar == undefined ? {} : { toolbar }}
      {...status == undefined ? {} : { status }}
    />, [initialValue, setEdited, maxHeight, toolbar, status, placeholder]);
  return <>
    {editor}
    <Autosaver data={edited} onSave={onSave} />
  </>;
}