export default async function sleep(msec: number) {
  await new Promise((resolve) => setTimeout(resolve, msec));
}
