import { GetStaticPropsResult } from 'next';

export default function Page({ content }: { content: string }) {
  if (!content) {
    return <p>Undefined</p>; 
  }
  return <p>{content}</p>;
}

export function getStaticProps(): GetStaticPropsResult<{ content: string }> {
  const content = "hello";
  return { props: { content } };
}
