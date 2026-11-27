import { SearchIcon, CloseIcon } from "@chakra-ui/icons";
import {
  Input,
  InputGroup,
  InputGroupProps,
  InputLeftElement,
  InputRightElement,
  IconButton,
  useBreakpointValue,
} from "@chakra-ui/react";
import { debounce } from "lodash";
import { cmdOrCtrlChar, isBrowserOnMac } from "macOrWin";
import { useEffect, useMemo, useRef, useState } from "react";

export function FullTextSearchBox({
  value,
  setValue,
  narrow,
  keywordPlaceholder = "关键字",
  ...inputGroupProps
}: {
  value: string;
  setValue: (value: string) => void;
  narrow?: boolean;
  keywordPlaceholder?: string;
} & InputGroupProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [innerValue, setInnerValue] = useState(value);
  const setValueRef = useRef(setValue);

  useEffect(() => {
    setValueRef.current = setValue;
  }, [setValue]);

  // Sync prop to state when prop changes.
  // This helps when the search term is cleared from outside or changed via URL
  useEffect(() => {
    setInnerValue(value);
  }, [value]);

  const debouncedSetValue = useMemo(
    () => debounce((v: string) => setValueRef.current(v), 200),
    [],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSetValue.cancel();
    };
  }, [debouncedSetValue]);

  const hotKey = useBreakpointValue({
    base: "",
    md: cmdOrCtrlChar() + "+F ",
  });

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if (
        (isBrowserOnMac() ? event.metaKey : event.ctrlKey) &&
        event.key === "f"
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => {
      window.removeEventListener("keydown", onKeydown);
    };
  }, [searchInputRef]);

  return (
    <InputGroup maxW={narrow ? "300px" : undefined} {...inputGroupProps}>
      <InputLeftElement>
        <SearchIcon color="gray" />
      </InputLeftElement>
      <Input
        ref={searchInputRef}
        bg="white"
        type="search"
        autoFocus
        placeholder={`${hotKey}搜索${keywordPlaceholder}，支持拼音`}
        value={innerValue}
        onChange={(ev) => {
          setInnerValue(ev.target.value);
          debouncedSetValue(ev.target.value);
        }}
      />
      {innerValue && (
        <InputRightElement>
          <IconButton
            aria-label="清空搜索"
            icon={<CloseIcon />}
            size="xs"
            variant="ghost"
            onClick={() => {
              setInnerValue("");
              debouncedSetValue("");
              searchInputRef.current?.focus();
            }}
          />
        </InputRightElement>
      )}
    </InputGroup>
  );
}
