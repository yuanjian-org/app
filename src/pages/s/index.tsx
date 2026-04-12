import {
  Link,
  Grid,
  GridItem,
  GridProps,
  Text,
  VStack,
} from "@chakra-ui/react";
import { componentSpacing, paragraphSpacing } from "theme/metrics";
import Image from "next/image";
import partner_mantou from "../../../public/img/partner_mantou.png";
import partner_yuanjian from "../../../public/img/partner_yuanjian.png";
import partner_1 from "../../../public/img/partner_1.png";
import partner_2 from "../../../public/img/partner_2.png";
import partner_3 from "../../../public/img/partner_3.png";
import partner_4 from "../../../public/img/partner_4.png";
import partner_5 from "../../../public/img/partner_5.png";
import partner_6 from "../../../public/img/partner_6.png";
import partner_7 from "../../../public/img/partner_7.jpg";
import { breakpoint } from "theme/breakpoints";
import { StaticImageData } from "next/image";
import PageBreadcrumb from "components/PageBreadcrumb";
import NextLink from "next/link";

export default function Page() {
  return (
    <VStack spacing={50} align="start">
      <IntroSection />
      <PartnersSection />
    </VStack>
  );
}

Page.title = "首页";

/**
 * A Section is a Grid with 5 columns on desktop and 2 columns on mobile.
 * It's children must only be a list of GridItems.
 */
function Section({
  header,
  children,
  ...rest
}: {
  header: string;
} & GridProps) {
  return (
    <Grid
      gap={componentSpacing}
      templateColumns={{
        base: "repeat(2, 1fr)",
        [breakpoint]: "repeat(5, 1fr)",
      }}
      {...rest}
    >
      <GridItem colSpan={{ base: 2, [breakpoint]: 5 }}>
        <PageBreadcrumb current={header} />
      </GridItem>
      {children}
    </Grid>
  );
}

function IntroSection() {
  return (
    <Section header="欢迎来到 “远图” 社会导师服务平台">
      <GridItem colSpan={{ base: 2, [breakpoint]: 5 }}>
        <VStack spacing={paragraphSpacing} align="start">
          <Text>
            <b>什么是社会导师？</b>社会导师是拥有丰富职业经验和社会阅历的
            “过来人”，他们为年{}
            轻人，特别是在校大学生，提供长期的一对一陪伴与指导，帮助他们顺利度过校园时光
            {}，尽早为步入职场和社会做好准备，助力年轻人实现人生理想与社会责任。
          </Text>
          <Text>
            <b>任何人都可以接受社会导师服务么？</b>是的。
            <Link
              href="/img/wechat-app-qrcode.jpg"
              target="_blank"
              rel="noopener noreferrer"
            >
              馒头工坊｜Mentor Workshop
            </Link>{" "}
            向公众提供社会导师服务，并为符合条件的大学生提供无偿服务。您可以点击链接申请，或
            <Link
              href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
              target="_blank"
              rel="noopener noreferrer"
            >
              联系客服
            </Link>
            进行咨询。
          </Text>
          <Text>
            <b>如何了解更多？</b>
            社会导师服务的背后是一套完整的方法体系和运营平台。{}
            随着这一系统的日益完善，我们将逐步向公众分享实践与经验。欢迎浏览{" "}
            <Link as={NextLink} href="/s/articles">
              📄 已经发表的文章
            </Link>
            。{}
            也欢迎您在自己的组织或机构中尝试类似形式的服务。我们真诚期待您的反馈与交流。
          </Text>
        </VStack>
      </GridItem>
    </Section>
  );
}

function PartnersSection() {
  const partners = [
    {
      name: "馒头工坊 | Mentor Workshop",
      image: partner_mantou,
    },
    {
      name: "远见教育基金会",
      image: partner_yuanjian,
    },
    {
      name: "中美爱心教育发展促进会",
      image: partner_1,
    },
    {
      name: "叔蘋奖学金",
      image: partner_2,
    },
    {
      name: "树华教育基金会",
      image: partner_3,
    },
    {
      name: "中国科学技术大学",
      image: partner_4,
    },
    {
      name: "山东科技大学",
      image: partner_7,
    },
    {
      name: "新华爱心教育基金会",
      image: partner_6,
    },
    {
      name: "好奇学习社区",
      image: partner_5,
    },
  ];

  return (
    <Section header="参与机构" gap={10}>
      {partners.map((partner, idx) => (
        <Partner key={idx} name={partner.name} image={partner.image} />
      ))}
    </Section>
  );
}

function Partner({ name, image }: { name: string; image: StaticImageData }) {
  return (
    <GridItem>
      <VStack>
        <Image
          width={80}
          src={image}
          alt={name}
          // style={{ filter: "grayscale(100%)" }}
        />
        <Text align="center" fontSize="sm">
          {name}
        </Text>
      </VStack>
    </GridItem>
  );
}
