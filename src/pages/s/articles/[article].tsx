import { GetStaticPathsResult, GetStaticPropsResult } from "next";
import { promises as fs } from 'fs';
import path from 'path';
import MarkdownStyler from "components/MarkdownStyler";
import { Box } from "@chakra-ui/react";

const articlesFolder = path.join(process.cwd(), '/articles');
const articleExt = ".md";

type PageProps = { markdown: string };

/**
 * This page uses next.js's Static Site Generation to generate one static page
 * for each .md file under `articlesFolder`. If there is a file under the folder
 * named foo-bar.md, then its corresponding URL is /articles/foo-bar.
 */
export default function Page({ markdown }: PageProps) {
  return <Box><MarkdownStyler content={markdown} /></Box>;
}

/**
 * @returns all the markdown files under `articlesFolder`
 */
export async function getStaticPaths(): Promise<GetStaticPathsResult> {
  return {
    fallback: false,
    paths: (await fs.readdir(articlesFolder))
      .filter(f => f.endsWith(articleExt))
      .map(f => ({ params: { article: f.slice(0, -articleExt.length) } })),
  };
}

export async function getStaticProps({ params: { article } } : {
  params: { article: string },
}): Promise<GetStaticPropsResult<PageProps>>
{
  const file = path.join(articlesFolder, article + articleExt);
  const markdown = await fs.readFile(file, 'utf8');
  return { props: { markdown } };
}
