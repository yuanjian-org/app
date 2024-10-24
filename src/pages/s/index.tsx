import { Heading, Text, VStack } from '@chakra-ui/react';
import { paragraphSpacing } from 'theme/metrics';
import Image from "next/image";
import wechatAppQrcode from '../../../public/img/wechat-app-qrcode.jpg';

export default function Page() {
  return <>
    <Heading size="md" marginY={50} color="gray.600">
      欢迎来到社会导师服务平台
    </Heading>
    <VStack maxW="500px" spacing={paragraphSpacing} align="start">
    <Text>
      <b>什么是社会导师？</b>社会导师是拥有丰富职业经验和社会阅历的 “过来人”，他们为年轻{
      }人，特别是在校大学生，提供长期的一对一指导与陪伴。社会导师帮助学生顺利度过大学生活，{
      }提前为步入社会和职场做好准备，助力他们实现人生理想与社会责任。
    </Text>
    <Text>
      <b>什么机构提供社会导师服务？</b>目前，提供社会导师服务的机构包括远见教育基金会和{
      } “馒头工坊｜Mentor Workshop” 服务平台。目前，馒头工坊为符合条件的大学生提供无偿服{
      }务。您可以通过 ”馒头工坊“ 微信小程序进行申请：
    </Text>
    <Image
      src={wechatAppQrcode}
      alt="二维码"
      width={120}
    />
    </VStack>
  </>;
}
