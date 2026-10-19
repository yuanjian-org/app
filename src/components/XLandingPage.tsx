import { Link, GridItem, Text, VStack } from "@chakra-ui/react";
import { paragraphSpacing } from "theme/metrics";
import { breakpoint } from "theme/breakpoints";
import NextLink from "next/link";
// @i18n-ignore-file
import LandingPageSection from "./LandingPageSection";
import BaseLandingPage from "./BaseLandingPage";

export default function XLandingPage() {
  return (
    <BaseLandingPage spacing={50}>
      <LandingPageSection header="远图：零一学院挑战问题与社会导师网络">
        <GridItem colSpan={{ base: 2, [breakpoint]: 5 }}>
          <VStack spacing={paragraphSpacing} align="start">
            <Text>
              <b>什么是零一学院？</b>
              深圳零一学院创办于2021年，这是一所由深圳市委、市政府推动创办的创新型学院。深圳零一学院源自清华大学钱学森力学班（简称“钱班”）的探索经验，面向全国青少年学生，以项目制方式培养，致力于发掘以科技改变世界、创造未来的创新型人才。
            </Text>
            <Text>
              <b>在这里你会收获什么？</b>
              在这里，不仅有“各路高手蜂拥而来”的多元环境，你还将在顶尖导师的陪伴指导下，参与基于信息与界面、微纳与智造、生命与健康等领域的真实前沿问题探索。学院为“零一学子”提供长期培养计划，持续支持你的研究，点燃你的好奇心、激情和创新志趣。
            </Text>
            <Text>
              <b>什么是挑战问题（X-Challenge）？</b>
              X-Challenge是由卓越导师发起的、面向未来5-10年人类可能面临的重大难题，可以影响上亿人或创造万亿市场。它聚焦一个领域的长期难题，强调学科交叉与开放性探索。目标是通过高难度问题激发学生突破现有知识框架，推动对未知领域的探索，共同攻克人类挑战。
              <Link as={NextLink} href="/s/projects">
                浏览当前挑战问题
              </Link>
              。
            </Text>
            <Text>
              <b>什么是导师服务？</b>
              导师服务是零一学院项目制培养的核心环节之一。在探索挑战性问题的过程中，学生自主寻找导师和解决方案，通过主动学习和创新思维完成项目。平台旨在连接学生与各领域资深导师，为你的创新之路保驾护航。
            </Text>
            <Text>
              <b>什么是“远图”？</b>
              “远图”是支持零一学院挑战问题项目制培养的服务平台。
            </Text>
          </VStack>
        </GridItem>
      </LandingPageSection>
    </BaseLandingPage>
  );
}
