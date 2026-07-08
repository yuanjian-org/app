import { serverSideTranslations } from "next-i18next/serverSideTranslations";

export default async function getI18nProps({
  locale,
  namespaces = ["common"],
}: {
  locale: string;
  namespaces?: string[];
}) {
  return {
    props: {
      ...(await serverSideTranslations(locale, namespaces)),
    },
  };
}
