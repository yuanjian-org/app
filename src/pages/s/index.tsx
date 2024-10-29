import { Grid, GridItem, GridProps, Heading, Text, VStack } from '@chakra-ui/react';
import { componentSpacing, paragraphSpacing, partnerSpacing } from 'theme/metrics';
import Image from "next/image";
import wechatAppQrcode from '../../../public/img/wechat-app-qrcode.jpg';
import partner_1 from '../../../public/img/partner_1.png';
import partner_2 from '../../../public/img/partner_2.png';
import partner_3 from '../../../public/img/partner_3.jpeg';
import partner_4 from '../../../public/img/partner_4.png';
import partner_5 from '../../../public/img/partner_5.png';
import { sidebarBreakpoint } from 'components/Navbars';
import { StaticImageData } from "next/image"

const partnersData = [{
  name: "中美爱心教育发展促进会", image: partner_1, link: "https://www.yjjxj.cn/blog/1d24bf123bb?categoryId=67479",
}, {
  name: "叔蘋奖学金", image: partner_2, link: "https://www.yjjxj.cn/blog/e846bd1c84c"
}, {
  name: "树华教育基金会", image: partner_3, link: "https://www.yjjxj.cn/blog/b036c1401ed"
}, {
  name: "中国科学技术大学", image: partner_4, link: "https://www.yjjxj.cn/blog/32ff33465d3"
}, {
  name: "好奇学习社区", image: partner_5, link: "https://www.yjjxj.cn/blog/x"
}];

export default function Page() {
  return <VStack mt={50} spacing={50} align="start">
    <IntroSection />
    <ArticlesSection />
    <PartnersSection />
  </VStack>;
}

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
          <b>什么机构提供社会导师服务？</b>目前，提供社会导师服务的机构包括远见教育基金会和{
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

interface Partner {
  name: string;
  image: StaticImageData;
  link: string;
}

function PartnersSection() {
  return <Section header="参与机构" gap={partnerSpacing}>
    {partnersData.map(partner => Partner(partner))}
  </Section>;
}

function Partner({ name, image, link }: Partner) {
  return (
    <GridItem
      gap="30px"
      alignItems="center">
      <a href={link}>
        <VStack spacing={paragraphSpacing} align="center" height={"100%"} justifyContent={'flex-end'}>
          <Image src={image} alt={name} />
          <span>{name}</span>
        </VStack>
      </a>
    </GridItem>
  );
}
