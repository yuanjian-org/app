import { Link, Tooltip } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { switchLanguage } from "components/switchLanguage";
import { features } from "shared/Features";

export default function LanguageToggle() {
  const router = useRouter();

  if (!features.english) {
    return null;
  }

  return (
    <Tooltip
      label={router.locale === "en" ? "切换到中文" : "Switch to English"}
    >
      <Link onClick={() => switchLanguage(router)}>
        {router.locale === "en" ? "中" : "EN"}
      </Link>
    </Tooltip>
  );
}
