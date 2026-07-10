import { useTranslation } from "next-i18next";

/**
 * @param token translation token, used for long strings to avoid repeating them
 * in both the main code and the translation json files.
 */
export default function T({
  token,
  children,
}: {
  token?: string;
  children: string;
}) {
  const { t } = useTranslation("common");

  return <>{token ? t(token, children) : t(children)}</>;
}
