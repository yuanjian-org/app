import ReactMarkdown from "react-markdown";
import "katex/dist/katex.min.css";
import RemarkMath from "remark-math";
import RemarkBreaks from "remark-breaks";
import RehypeKatex from "rehype-katex";
import RemarkGfm from "remark-gfm";
import RehypeHighlight from "rehype-highlight";
import {useRef, useState, RefObject, useEffect, useCallback} from "react";
import { copyToClipboard } from "../utils";
import mermaid from "mermaid";

import LoadingIcon from "../icons/three-dots.svg";
import React from "react";
import { useDebouncedCallback, useThrottledCallback } from "use-debounce";
import {showImageModal, showToast} from "./ui-lib";
import {Copy, dialog, hoverTransition, Play, SmallButton} from "union-ui";
import t9LayoutInstance from "../../layout/t9LayoutInstance";
import {reduxStore} from "../../reduxSetup";
import invariant from "tiny-invariant";
import rickClient from "../../rickClient";
import {getCode, getOnRun, setPendingMonacoFocus} from "union-monaco";
import {INSERT_DATA_BLOCK_COMMAND} from "../../pageEditor/DataBlockPlugin";
import {getInputTypeFromMarkdownCodeLanguage, monacoLanguageList, programmingLanguageList} from "union-common-shared";
import {IconForInputType} from "union-common-browser";
import {Box, Flex} from "@chakra-ui/react";

export function Mermaid(props: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (props.code && ref.current) {
      mermaid
        .run({
          nodes: [ref.current],
          suppressErrors: true,
        })
        .catch((e) => {
          setHasError(true);
          console.error("[Mermaid] ", e.message);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.code]);

  function viewSvgInNewWindow() {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    const text = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([text], { type: "image/svg+xml" });
    console.log(blob);
    // const url = URL.createObjectURL(blob);
    // const win = window.open(url);
    // if (win) {
    //   win.onload = () => URL.revokeObjectURL(url);
    // }
    showImageModal(URL.createObjectURL(blob));
  }

  if (hasError) {
    return null;
  }

  return (
    <div
      className="no-dark mermaid"
      style={{
        cursor: "pointer",
        overflow: "auto",
      }}
      ref={ref}
      onClick={() => viewSvgInNewWindow()}
    >
      {props.code}
    </div>
  );
}

export function PreCode(props: { className?: string, children: any }) {
  const ref = useRef<HTMLPreElement>(null);
  const refText = ref.current?.innerText;
  const [mermaidCode, setMermaidCode] = useState("");

  const renderMermaid = useDebouncedCallback(() => {
    if (!ref.current) return;
    const mermaidDom = ref.current.querySelector("code.language-mermaid");
    if (mermaidDom) {
      setMermaidCode((mermaidDom as HTMLElement).innerText);
    }
  }, 600);

  useEffect(() => {
    setTimeout(renderMermaid, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refText]);

  return (
    <>
      {mermaidCode.length > 0 && (
        <Mermaid code={mermaidCode} key={mermaidCode} />
      )}
      <pre ref={ref}>
        <div className={'actions'}>
          <SmallButton
            onClick={() => {
              let language = undefined;
              const codeClassName = ref.current?.querySelector('code')?.className;
              if (codeClassName) {
                const match = /language-(\w+)/.exec(codeClassName);
                language = match?.[1];
              }

              const text = ref.current?.innerText;
              console.log({className: props.className, codeClassName, language, text});

              if (text) {
                const pageId = reduxStore.getState().page.activeId;
                invariant(pageId, "active page id not found");

                const editor = t9LayoutInstance.lexingtonEditor;

                if (editor) {
                  const type = getInputTypeFromMarkdownCodeLanguage(language ?? "");

                  if (type) {
                    return rickClient.dataBlock.create.mutate({
                      pageId,
                      inputMeta: {
                        type,
                      },
                      inputScript: text,
                    }).then(res => {
                      const unionMonacoId = `data_block_input_code_editor_${res.dataBlock.id}_only`;
                      setPendingMonacoFocus(unionMonacoId);
                      editor.dispatchCommand(INSERT_DATA_BLOCK_COMMAND, res.dataBlock.id);

                      // TODO another way to wait for data block render complete?
                      setTimeout(() => {
                        getOnRun(unionMonacoId)(
                          getCode(unionMonacoId)
                        );
                      }, 100);
                    });
                  } else {
                    // TODO "Let us know you need it!"
                    dialog.select(`${language ? '"' + language + '" not executable right now. ' : "ChatGPT does not provide a language, "}Select one to run`, [
                      ...programmingLanguageList,
                      // TODO add data source and make it monaco language list later?
                    ].map(lang => ({
                      label: <Flex align={'center'} justify={'center'} gap={'4px'}><IconForInputType width={14} inputType={lang} /><Box>{lang}</Box></Flex>,
                      value: lang,
                    })), {

                    }).then((selected) => {
                      console.log({ selected });
                      if (selected) {
                        const type = getInputTypeFromMarkdownCodeLanguage(selected);
                        if (type) {
                          return rickClient.dataBlock.create.mutate({
                            pageId,
                            inputMeta: {
                              type,
                            },
                            inputScript: text,
                          }).then(res => {
                            const unionMonacoId = `data_block_input_code_editor_${res.dataBlock.id}_only`;
                            setPendingMonacoFocus(unionMonacoId);
                            editor.dispatchCommand(INSERT_DATA_BLOCK_COMMAND, res.dataBlock.id);

                            // TODO another way to wait for data block render complete?
                            setTimeout(() => {
                              getOnRun(unionMonacoId)(
                                getCode(unionMonacoId)
                              );
                            }, 100);
                          });
                        }
                      }
                    });
                  }
                }
              }
            }}
          >
            <Play width={12} height={12} />
          </SmallButton>
          <SmallButton
            onClick={() => {
              if (ref.current) {
                const code = ref.current.innerText;
                copyToClipboard(code);
              }
            }}
          >
            <Copy width={12} height={12} />
          </SmallButton>
        </div>

        {props.children}
        <style jsx>{`
          pre {
            position: relative;
          }
          .actions {
            position: absolute;
            top: 4px;
            right: 4px;
            opacity: 0;
            transition: ${hoverTransition('opacity')};
            
            display: flex;
            align-items: center;
            justify-content: flex-end;
          }
          pre:hover .actions {
            opacity: 1;
          }
        `}</style>
      </pre>
    </>
  );
}

function _MarkDownContent(props: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[RemarkMath, RemarkGfm, RemarkBreaks]}
      rehypePlugins={[
        RehypeKatex,
        [
          RehypeHighlight,
          {
            detect: false,
            ignoreMissing: true,
          },
        ],
      ]}
      components={{
        pre: PreCode,
        a: (aProps) => {
          const href = aProps.href || "";
          const isInternal = /^\/#/i.test(href);
          const target = isInternal ? "_self" : aProps.target ?? "_blank";
          return <a {...aProps} target={target} />;
        },
      }}
    >
      {props.content}
    </ReactMarkdown>
  );
}

export const MarkdownContent = React.memo(_MarkDownContent);

export function Markdown(
  props: {
    content: string;
    loading?: boolean;
    fontSize?: number;
    parentRef?: RefObject<HTMLDivElement>;
    defaultShow?: boolean;
  } & React.DOMAttributes<HTMLDivElement>,
) {
  const mdRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="markdown-body"
      style={{
        fontSize: `${props.fontSize ?? 14}px`,
        direction: /[\u0600-\u06FF]/.test(props.content) ? "rtl" : "ltr",
      }}
      ref={mdRef}
      onContextMenu={props.onContextMenu}
      onDoubleClickCapture={props.onDoubleClickCapture}
    >
      {props.loading ? (
        <LoadingIcon />
      ) : (
        <MarkdownContent content={props.content} />
      )}
    </div>
  );
}
