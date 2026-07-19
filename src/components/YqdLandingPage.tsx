import { Box, Text, Heading, UnorderedList, ListItem } from "@chakra-ui/react";
import T from "components/T";
import Head from "next/head";
import BaseLandingPage from "./BaseLandingPage";

export default function YqdLandingPage() {
  return (
    <>
      <Head>
        <title>易起读 - 上海颂鼎社会公益创新发展中心</title>
      </Head>
      <BaseLandingPage actionText={<T ns="yqd">进入平台</T>} buttonMt={8}>
        <Heading size="lg">
          <T ns="yqd">欢迎来到“易起读”公益阅读平台</T>
        </Heading>

        <Text fontSize="lg">
          <T ns="yqd" token="yqd-intro">
            “易起读”是由上海颂鼎社会公益创新发展中心主导的社会创新项目，致力于通过阅读联结社区，推动文化共享与终身学习。
          </T>
        </Text>

        <Box mt={4}>
          <Heading size="md" mb={3}>
            <T ns="yqd">面向多元的参与者</T>
          </Heading>
          <UnorderedList spacing={3} pl={5}>
            <ListItem>
              <b>
                <T ns="yqd">对广大的读者朋友：</T>
              </b>
              <T ns="yqd" token="yqd-readers">
                这里是一个开放、包容的阅读社区。无论您是寻找优质读物，还是希望与志同道合的书友交流心得，易起读都能为您提供丰富的资源和平台。
              </T>
            </ListItem>
            <ListItem>
              <b>
                <T ns="yqd">对热心的志愿者团队：</T>
              </b>
              <T ns="yqd" token="yqd-volunteers">
                您的每一次付出，都在传递知识的温度。加入我们，共同策划读书分享会，协助社区图书馆运营，让阅读的力量触达更多角落。
              </T>
            </ListItem>
            <ListItem>
              <b>
                <T ns="yqd">对具有教育情怀的导师：</T>
              </b>
              <T ns="yqd" token="yqd-mentors">
                我们期待您的专业引领。在这里，您可以开设导读课程，陪伴青年群体成长，点燃他们内心的求知火种。
              </T>
            </ListItem>
            <ListItem>
              <b>
                <T ns="yqd">对慷慨解囊的捐赠方：</T>
              </b>
              <T ns="yqd" token="yqd-donors">
                您的支持是项目持续发展的基石。每一份爱心都将被透明化管理，直接转化为受助群体的图书资源与阅读环境改善。
              </T>
            </ListItem>
          </UnorderedList>
        </Box>

        <Text>
          <T ns="yqd" token="yqd-outro">
            在这个平台上，我们期待每一位参与者都能找到属于自己的位置，共同构建一个“联结共生、永续创新”的学习型社区。
            此系统为易起读项目提供全方位的 AI 数字平台支持。
          </T>
        </Text>
      </BaseLandingPage>
    </>
  );
}
