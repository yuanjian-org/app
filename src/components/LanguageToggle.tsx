import { Link, Tooltip } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { switchLanguage } from "components/switchLanguage";

export default function LanguageToggle() {
  const router = useRouter();

  return (
    <Tooltip
      label={router.locale === "en" ? "切换到中文" : "Switch to English"}
    >
      <Link
        onClick={() => switchLanguage(router)}
        role="button"
        tabIndex={0}
        aria-label={router.locale === "en" ? "切换到中文" : "Switch to English"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            switchLanguage(router);
          }
        }}
      >
        {/* Display flag emoji next to the target language toggle */}
        {router.locale === "en" ? "🇨🇳 中" : "🇺🇸 EN"}
      </Link>
    </Tooltip>
  );
}
