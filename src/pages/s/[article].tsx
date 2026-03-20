import { GetStaticPathsResult, GetStaticPropsResult } from "next";
import { promises as fs } from "fs";
import path from "path";
import MarkdownStyler from "components/MarkdownStyler";
import { Box, Heading, Stack, VStack, Text, Link } from "@chakra-ui/react";
import { breakpoint } from "theme/metrics";
import NextLink from "next/link";

const articlesFolder = path.join(process.cwd(), "/public/articles");
const articleExt = ".md";

type ArticleProps = {
  title: string;
  authors: string;
  date: string;
  markdown: string;
};

/**
 * This page uses next.js's Static Site Generation to generate one static page
 * for each .md file under `articlesFolder`. If there is a file under the folder
 * named foo-bar.md, then its corresponding URL is /articles/foo-bar.
 */
export default function Page({ title, authors, date, markdown }: ArticleProps) {
  const Separator = () => (
    <Text
      mx={3}
      color="#b0b0b0"
      display={{ base: "none", [breakpoint]: "block" }}
    >
      |
    </Text>
  );

  return (
    <VStack align={{ base: "start", [breakpoint]: "center" }}>
      <Heading size="lg">{title}</Heading>

      <Stack my={4} direction={{ base: "column", [breakpoint]: "row" }}>
        <Link as={NextLink} href="/s/articles">
          社会导师系列文章
        </Link>
        <Separator />
        <Text>作者：{authors}</Text>
        <Separator />
        <Text>{date}</Text>
      </Stack>

      <Box>
        <MarkdownStyler content={markdown} allowHtml />
      </Box>
    </VStack>
  );
}

Page.title = (papgeProps: ArticleProps) => papgeProps.title;

/**
 * @returns all the markdown files under `articlesFolder`
 */
export async function getStaticPaths(): Promise<GetStaticPathsResult> {
  return {
    fallback: false,
    paths: (await fs.readdir(articlesFolder))
      .filter((f) => f.endsWith(articleExt))
      .map((f) => ({ params: { article: f.slice(0, -articleExt.length) } })),
  };
}

export async function getStaticProps({
  params: { article },
}: {
  params: { article: string };
}): Promise<GetStaticPropsResult<ArticleProps>> {
  const file = path.join(articlesFolder, article + articleExt);
  const content = await fs.readFile(file, "utf8");
  return { props: parseArticle(file, content) };
}

function parseArticle(file: string, content: string): ArticleProps {
  const titleMatch = content.match(/\* 标题:\s*(.+)/);
  const authorsMatch = content.match(/\* 作者:\s*(.+)/);
  const dateMatch = content.match(/\* 日期:\s*(.+)/);

  if (!titleMatch || !authorsMatch || !dateMatch) {
    throw Error(`File ${file} missing required metadata fields.`);
  }

  // Extract everything after the first empty line as the markdown content
  const markdownStart = content.indexOf("\n\n");
  if (markdownStart === -1) {
    throw Error(`File ${file} missing main content.`);
  }

  return {
    title: titleMatch[1].trim(),
    authors: authorsMatch[1].trim(),
    date: dateMatch[1].trim(),
    markdown: content.slice(markdownStart + 2).trim(),
  };
}
