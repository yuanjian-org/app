import { 
  Link, Grid, GridItem, GridProps, Text, VStack
} from '@chakra-ui/react';
import { componentSpacing, paragraphSpacing } from 'theme/metrics';
import Image from "next/image";
import wechatAppQrcode from '../../../public/img/wechat-app-qrcode.jpg';
import partner_1 from '../../../public/img/partner_1.png';
import partner_2 from '../../../public/img/partner_2.png';
import partner_3 from '../../../public/img/partner_3.jpeg';
import partner_4 from '../../../public/img/partner_4.png';
import partner_5 from '../../../public/img/partner_5.png';
import { sidebarBreakpoint } from 'components/Navbars';
import { StaticImageData } from "next/image";
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
function Section({ header, children, ...rest }: {
  header: string
} & GridProps) {
  return <Grid gap={componentSpacing}
    templateColumns={{
      base: 'repeat(2, 1fr)',
      [sidebarBreakpoint]: 'repeat(5, 1fr)',
    }}
    {...rest}
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
          <b>哪些机构提供社会导师服务？</b>目前，提供社会导师服务的机构包括
          <Link href="http://yuanjian.org" target="_blank">远见教育基金会</Link>
          和
          <Link href="/img/wechat-app-qrcode.jpg" target="_blank">
            馒头工坊｜Mentor Workshop
          </Link>
          。它们都为符合条件的大学生提供无{
          }偿服务。您可以扫描二维码，通过 ”馒头工坊“ 微信小程序申请其免费服务。
        </Text>
        <Text>
          <b>如何了解更多信息？</b>社会导师服务的背后是一套完整的方法体系和运营平台。{
          }随着这一系统的日益完善，我们将逐步向公众分享方法与经验总结。欢迎您浏览{' '}
          <Link as={NextLink} href="/s/articles">📄 社会导师文章</Link>。{
          }同时也欢迎您在教育机构、公益组织或商业公司中尝试类似服务。我们真诚期待您的反馈{
          }与交流。
        </Text>
        <Text>
          <b>如何成为社会导师？</b>您可以直接填写
          <Link href="https://jsj.top/f/OzuvWD" target="_blank">申请表</Link>
          ，或者联系我们了解更多：
          <Link href="mailto:sizhujiaoyu@163.com" target="_blank">
            sizhujiaoyu@163.com
          </Link>。
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
  const partners = [{
    name: "中美爱心教育发展促进会",
    image: partner_1,
  }, {
    name: "叔蘋奖学金",
    image: partner_2,
  }, {
    name: "树华教育基金会",
    image: partner_3,
  }, {
    name: "中国科学技术大学",
    image: partner_4,
    }, {
    name: "好奇学习社区",
    image: partner_5,
  }];

  return <Section header="参与机构" alignItems={"baseline"} gap={10}>
    {partners.map(partner => Partner(partner.name, partner.image))}
  </Section>;
}

function Partner(name: string, image: StaticImageData) {
  return (
    <GridItem
      gap="30px"
      alignItems="center">
      <VStack
        spacing={paragraphSpacing}
        align="center"
        // height={"100%"}
        maxWidth={150}
        justifyContent={'space-around'}>
        <Image height={200} width={200} src={image} alt={name} />
        <span style={{ display: "inline", whiteSpace: "nowrap" }}>{name}</span>
      </VStack>
    </GridItem>
  );
}
