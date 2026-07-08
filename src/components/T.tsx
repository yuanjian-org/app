import { useTranslation } from "next-i18next";

export default function T({ children }: { children: string }) {
  const { t } = useTranslation("common");
  return <>{t(children)}</>;
}
