/**
 * The reason to place this page in the static content folder is that the user
 * is required to enter phone number to access non-public pages.
 */

import { Link, Text, Flex, ListItem, UnorderedList } from "@chakra-ui/react";
import PageBreadcrumb from "components/PageBreadcrumb";
import { staticUrlPrefix } from "static";

export default function Page() {
  return (
    <>
      <PageBreadcrumb current="为什么要填手机号？" />
      <Flex direction="column" gap={5}>
        <Text>
          <Link isExternal href={staticUrlPrefix}>
            远图社会导师服务平台
          </Link>
          致力保护个人隐私。我们仅收集提供服务所需的最少个人信息。本声明旨在解释我们收集用户手机号的原因：
        </Text>
        <Text>
          为了确保您能顺畅地使用远图平台，我们支持微信、邮箱和手机号三种登录方式。无论您选择哪种方式，我们都需要一个可靠的身份标识，以便在不同设备上或用不同登录方式时，依然能将您的账号关联到您唯一的个人身份。
        </Text>
        <Text>手机号是实现这一目标最有效的途径，原因如下：</Text>
        <UnorderedList>
          <ListItem>
            <b>唯一性：</b>
            相比邮箱和微信号，手机号能更可靠地识别您的身份。大多数用户只有一个常用手机号，而邮箱地址可能有多個，微信号也难以记忆和验证。
          </ListItem>
          <ListItem>
            <b>隐私保护：</b>
            与身份证号、银行卡号等更敏感的个人信息相比，手机号泄露隐私的风险更低。
          </ListItem>
          <ListItem>
            <b>账号关联：</b>
            手机号能将您不同的登录方式（如邮箱和微信）关联到同一个账户，确保您的所有数据都集中在一个地方，避免信息分散或丢失。
          </ListItem>
        </UnorderedList>
        <Text>
          因此，当您首次使用邮箱或微信登录时，我们会请您填写手机号，以便将您的不同登录信息关联到您的唯一身份，为您提供更连贯、安全的平台体验。
        </Text>
      </Flex>
    </>
  );
}

Page.title = "为什么要填手机号？";
