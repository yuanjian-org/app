import { Link } from "@chakra-ui/react";
import { RiCustomerServiceFill } from "react-icons/ri";
import { SmallGrayText } from "./SmallGrayText";
import T from "components/T";

/** WeChat customer service link URL */
export const customerServiceUrl =
  "https://work.weixin.qq.com/kfid/kfcd32727f0d352531e";

export interface ContactCustomerServiceProps {
  /** Prefix text before the contact link, e.g., "如有问题，" */
  prefix?: string;
  /** Whether to render the customer service icon alongside the link */
  showIcon?: boolean;
}

/**
 * Reusable component for rendering customer service contact link.
 */
export default function ContactCustomerService({
  prefix = "如有问题，",
  showIcon = true,
}: ContactCustomerServiceProps) {
  return (
    <>
      <SmallGrayText>
        {prefix && <T>{prefix}</T>}
        <Link href={customerServiceUrl} isExternal>
          <T>联系客服</T>
        </Link>
      </SmallGrayText>
      {showIcon && <RiCustomerServiceFill color="gray" />}
    </>
  );
}
