import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { features } from "shared/Features";

export default async function getI18nProps({
  locale,
  namespaces = ["common"],
}: {
  locale: string;
  namespaces?: string[];
}) {
  if (features.english) {
    return {
      props: {
        ...(await serverSideTranslations(locale, namespaces)),
      },
    };
  } else {
    return {
      props: {},
    };
  }
}
