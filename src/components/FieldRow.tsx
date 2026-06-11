import { Flex, Box, UnorderedList, ListItem, Link } from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import EditableWithIconOrLink from "components/EditableWithIconOrLink";
import z from "zod";
import invariant from "tiny-invariant";

export function FieldRow({
  name,
  value,
  readonly,
  update,
}: {
  name: string;
  value: any;
  readonly: boolean;
  // required only if !readonly
  update?: (value: string) => Promise<void>;
}) {
  return (
    <Flex direction="column">
      <Box>
        <b>{name}</b>
      </Box>
      <Box>
        <FieldValueCell value={value} readonly={readonly} update={update} />
      </Box>
    </Flex>
  );
}

function FieldValueCell({
  value,
  readonly,
  update,
}: {
  value: any;
  readonly: boolean;
  // required only if !readonly
  update?: (value: string) => Promise<void>;
}) {
  invariant(readonly || update);

  if (Array.isArray(value)) {
    return (
      <UnorderedList>
        {value.map((v, idx) => (
          <ListItem key={idx}>
            <FieldValueCell readonly value={v} />
          </ListItem>
        ))}
      </UnorderedList>
    );
  } else if (
    // Zod's .url() allows javascript: and data: schemes. We explicitly
    // require http:// or https:// to prevent XSS vulnerabilities.
    z.url().safeParse(value).success &&
    (value.toLowerCase().startsWith("http://") ||
      value.toLowerCase().startsWith("https://"))
  ) {
    return (
      <Link href={value}>
        下载链接 <DownloadIcon />
      </Link>
    );
  } else if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  } else if (typeof value === "string") {
    const v = value.split("\n").join("\r\n");
    return readonly ? (
      value.split("\n").map((p, idx) => <p key={idx}>{p}</p>)
    ) : (
      <EditableWithIconOrLink
        editor="textarea"
        decorator="icon"
        defaultValue={v}
        onSubmit={update}
      />
    );
  } else {
    // Other types. Display as is.
    const v = value.toString();
    return readonly ? (
      v
    ) : (
      <EditableWithIconOrLink
        editor="input"
        decorator="icon"
        defaultValue={v}
        onSubmit={update}
      />
    );
  }
}
