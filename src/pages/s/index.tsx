import { 
  Link, Grid, GridItem, GridProps, Text, VStack
} from '@chakra-ui/react';
import { componentSpacing, paragraphSpacing } from 'theme/metrics';
import Image from "next/image";
import wechatAppQrcode from '../../../public/img/wechat-app-qrcode.jpg';
import { sidebarBreakpoint } from 'components/Navbars';
import PageBreadcrumb from 'components/PageBreadcrumb';
import NextLink from 'next/link';

export default function Page() {
  return <VStack spacing={50} align="start">
    <IntroSection />
    <ArticlesSection />
    <PartnersSection />
  </VStack>;
}

Page.title = "首页";

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
      <PageBreadcrumb current={header} />
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
          }轻人，特别是在校大学生，提供长期的一对一陪伴与指导，帮助他们顺利度过校园时光{
          }，尽早为步入职场和社会做好准备，助力年轻人实现人生理想与社会责任。
        </Text>
        <Text>
          <b>哪些机构提供社会导师服务？</b>目前，提供社会导师服务的机构包括远见教育基金会和{
          }馒头工坊｜Mentor Workshop 服务平台。它们都为符合条件的大学生提供无{
          }偿服务。您可以扫描页面上的二维码，通过 ”馒头工坊“ 微信小程序申请其免费{
          }服务。
        </Text>
        <Text>
          <b>如何了解更多信息？</b>社会导师服务的背后是一套完整的方法体系和运营平台。{
          }随着这一系统的日益完善，我们将逐步向公众分享方法与经验总结。欢迎您浏览{' '}
          <Link as={NextLink} href="/s/articles">📄 已发布的文章</Link>。{
          }同时也欢迎您在教育机构、公益组织或商业公司中尝试类似服务。我们真诚期待您的反馈{
          }与交流。您可以通过{' '}
          <Link href="mailto:sizhujiaoyu@163.com">sizhujiaoyu@163.com</Link>
          {' '}联系我们。
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
