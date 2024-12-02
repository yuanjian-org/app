import React from 'react';
import { Landmark, Latitude } from 'shared/Map';
import { readMapJsonFiles } from 'shared/MapJson';
import Map from 'components/Map';

type PageProps = {
  data: Record<Latitude, Landmark[]>;
};
export default function Page({ data }: PageProps) {
  return <>
    <Map data={data}/>
  </>;
}

export async function getStaticProps() {
  const res = await readMapJsonFiles();
  return { props: { data: res } };
}
