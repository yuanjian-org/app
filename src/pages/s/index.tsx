import { Grid, GridItem, GridProps, Heading, Text, VStack } from '@chakra-ui/react';
import { componentSpacing, paragraphSpacing } from 'theme/metrics';
import Image from "next/image";
import wechatAppQrcode from '../../../public/img/wechat-app-qrcode.jpg';
import { sidebarBreakpoint } from 'components/Navbars';

export default function Page() {
  return <VStack spacing={50} align="start">
    <IntroSection />
    <ArticlesSection />
    <PartnersSection />
  </VStack>;
}

/**
 * A Section is a Grid with 5 columns on desktop and 2 columns on mobile.
 * It's children must only be a list of GridItems.
 */
function Section({ header, children, ...rest } : {
  header: string
} & GridProps) {
  return <Grid {...rest}
    gap={componentSpacing}
    templateColumns={{
      base: 'repeat(2, 1fr)',
      [sidebarBreakpoint]: 'repeat(5, 1fr)',
    }}
  >
    <GridItem colSpan={{ base: 2, [sidebarBreakpoint]: 5 }}>
      <Heading mb={5} size="md" color="gray.600">{header}</Heading>
    </GridItem>
    {children}
  </Grid>;
}

function IntroSection() {
  return <Section header="欢迎来到社会导师服务平台">
    <GridItem colSpan={{ base: 2, [sidebarBreakpoint]: 4 }}>
      <VStack spacing={paragraphSpacing} align="start">
        <Text>
          <b>什么是社会导师？</b>社会导师是拥有丰富职业经验和社会阅历的 “过来人”，他们为年{
          }轻人，特别是在校大学生，提供长期的一对一指导与陪伴。社会导师帮助学生顺利度过大学生{
          }活，提前为步入社会和职场做好准备，助力他们实现人生理想与社会责任。
        </Text>
        <Text>
          <b>哪些机构提供社会导师服务？</b>目前，提供社会导师服务的机构包括远见教育基金会和{
          } “馒头工坊｜Mentor Workshop” 服务平台。目前，馒头工坊为符合条件的大学生提供无{
          }偿服务。您可以通过 ”馒头工坊“ 微信小程序进行申请：
        </Text>
      </VStack>
    </GridItem>

    <GridItem
      // The three properties together make the image centrally aligned in
      // both dimensions
      display="flex"
      alignItems="center"
      // justifyContent="center"
    >
      <Image
        src={wechatAppQrcode}
        alt="二维码"
        width={120}
      />
    </GridItem>
  </Section>;
}

function ArticlesSection() {
  return <></>;
}

function PartnersSection() {
  return <></>;
}
