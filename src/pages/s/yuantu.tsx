import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Icon,
  Stack,
  Link,
  List,
  ListItem,
  ListIcon,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  FaUserTie,
  FaHandshake,
  FaChartLine,
  FaUsers,
  FaCheckCircle,
  FaLightbulb,
  FaBullseye,
  FaComments,
} from "react-icons/fa";
import { paragraphSpacing } from "theme/metrics";
import NextLink from "next/link";
import Footer from "components/Footer";

export default function Page() {
  const bgGradient = useColorModeValue(
    "linear(to-br, brand.500, brand.600)",
    "linear(to-br, brand.600, brand.700)",
  );
  const sectionBg = useColorModeValue("white", "gray.800");
  const cardBg = useColorModeValue("gray.50", "gray.700");

  return (
    <VStack spacing={0} align="stretch" w="full">
      {/* Hero Section */}
      <Box
        bgGradient={bgGradient}
        color="white"
        py={{ base: 16, lg: 24 }}
        px={6}
      >
        <Container maxW="container.lg">
          <VStack spacing={6} align="center" textAlign="center">
            <Heading
              as="h1"
              size="2xl"
              fontWeight="bold"
              lineHeight="1.2"
              color="white"
            >
              远图网
            </Heading>
            <Text fontSize={{ base: "lg", lg: "xl" }} maxW="2xl" opacity={0.95}>
              远图网支持经验丰富的社会导师与提供长期一对一陪伴与指导，
              <br />
              助力青年成长，实现人生理想
            </Text>
            <HStack spacing={4} pt={4}>
              <Button
                as={NextLink}
                href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
                target="_blank"
                size="lg"
                colorScheme="whiteAlpha"
                variant="solid"
                _hover={{ transform: "translateY(-2px)", shadow: "lg" }}
                transition="all 0.2s"
              >
                立即咨询
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* What is Social Mentorship Section */}
      <Box bg={sectionBg} py={{ base: 12, lg: 20 }} px={6}>
        <Container maxW="container.lg">
          <VStack spacing={10} align="stretch">
            <VStack spacing={4} textAlign="center">
              {/* <Heading as="h2" size="xl" color="brand.c">
                什么是社会导师？
              </Heading> */}
              <Text fontSize="lg" maxW="3xl" color="gray.600">
                社会导师是拥有丰富职业经验和社会阅历的&ldquo;过来人&rdquo;，为年轻人
                提供长期的一对一陪伴与指导
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8}>
              <FeatureCard
                icon={FaUserTie}
                title="专业导师"
                description="经验丰富的职场精英和行业专家，具备深厚的专业知识和实战经验"
              />
              <FeatureCard
                icon={FaHandshake}
                title="一对一指导"
                description="长期陪伴，深度交流，针对个人情况提供定制化的成长建议"
              />
              <FeatureCard
                icon={FaChartLine}
                title="全面发展"
                description="涵盖个人成长、事业发展、社会责任等多个维度的全方位指导"
              />
              <FeatureCard
                icon={FaUsers}
                title="持续支持"
                description="建立长期师生关系，在关键时刻提供持续的支持与帮助"
              />
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Service Process Section */}
      <Box bg={cardBg} py={{ base: 12, lg: 20 }} px={6}>
        <Container maxW="container.lg">
          <VStack spacing={10} align="stretch">
            <VStack spacing={4} textAlign="center">
              <Heading as="h2" size="xl" color="brand.c">
                服务流程
              </Heading>
              <Text fontSize="lg" maxW="3xl" color="gray.600">
                科学规范的匹配流程，确保最佳师生配对效果
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
              <ProcessStep
                number="1"
                title="需求评估"
                description="学员提交申请，详细说明个人背景、成长需求和期望目标，我们将进行全面评估"
              />
              <ProcessStep
                number="2"
                title="智能匹配"
                description="基于优化算法，综合考虑专业背景、兴趣偏好、时间安排等因素，匹配最合适的导师"
              />
              <ProcessStep
                number="3"
                title="制定计划"
                description="导师与学员共同制定个性化辅导计划，明确成长目标、交流频率和考核标准"
              />
              <ProcessStep
                number="4"
                title="定期交流"
                description="按照计划进行定期一对一交流，导师提供专业指导，分享经验，解答困惑"
              />
              <ProcessStep
                number="5"
                title="持续跟进"
                description="平台持续跟踪辅导进展，定期评估效果，根据反馈优化辅导方案"
              />
              <ProcessStep
                number="6"
                title="成长反馈"
                description="定期收集学员成长数据和反馈意见，不断改进服务质量，提升辅导效果"
              />
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Benefits Section */}
      <Box bg={sectionBg} py={{ base: 12, lg: 20 }} px={6}>
        <Container maxW="container.lg">
          <VStack spacing={10} align="stretch">
            <VStack spacing={4} textAlign="center">
              <Heading as="h2" size="xl" color="brand.c">
                学员收益
              </Heading>
              <Text fontSize="lg" maxW="3xl" color="gray.600">
                全方位的成长支持，助力青年实现人生理想
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={8}>
              <BenefitCard
                icon={FaLightbulb}
                title="个人成长"
                items={[
                  "提升自我认知，明确人生方向",
                  "增强自信心和决策能力",
                  "培养批判性思维和问题解决能力",
                  "建立良好的学习和生活习惯",
                  "提高情绪管理和抗压能力",
                ]}
              />
              <BenefitCard
                icon={FaBullseye}
                title="事业发展"
                items={[
                  "明确职业方向和发展路径",
                  "掌握求职面试的核心技能",
                  "了解行业动态和职场规则",
                  "建立职业人脉和资源网络",
                  "获得实习和就业推荐机会",
                ]}
              />
              <BenefitCard
                icon={FaComments}
                title="社会适应"
                items={[
                  "提高人际交往和沟通能力",
                  "增强团队协作和领导能力",
                  "培养社会责任感和使命感",
                  "拓展社会视野和文化认知",
                  "建立终身学习的意识和能力",
                ]}
              />
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Who Can Apply Section */}
      <Box bg={cardBg} py={{ base: 12, lg: 20 }} px={6}>
        <Container maxW="container.lg">
          <VStack spacing={8} align="stretch">
            <VStack spacing={4} textAlign="center">
              <Heading as="h2" size="xl" color="brand.c">
                谁可以申请？
              </Heading>
            </VStack>

            <Stack
              direction={{ base: "column", lg: "row" }}
              spacing={8}
              align="stretch"
            >
              <Box flex={1} bg={sectionBg} p={8} borderRadius="lg" shadow="md">
                <VStack spacing={paragraphSpacing} align="start">
                  <Heading as="h3" size="md" color="brand.c">
                    公众服务
                  </Heading>
                  <Text>
                    我们向所有有需要的人士开放社会导师服务。无论您是否已经走入职场，
                    只要您渴望成长，都欢迎申请。
                  </Text>
                  <Text>
                    您可以通过点击上方链接了解详情，或{" "}
                    <Link
                      href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
                      target="_blank"
                      color="brand.c"
                      fontWeight="bold"
                    >
                      联系客服
                    </Link>{" "}
                    进行咨询。
                  </Text>
                </VStack>
              </Box>

              <Box flex={1} bg={sectionBg} p={8} borderRadius="lg" shadow="md">
                <VStack spacing={paragraphSpacing} align="start">
                  <Heading as="h3" size="md" color="brand.c">
                    优惠服务
                  </Heading>
                  <Text>
                    对于符合条件的人士，我们提供价格优惠。
                    他们通常来自合作机构的推荐。
                  </Text>
                  <Text>
                    我们相信机会平等，希望通过导师服务帮助更多有潜力的
                    青年人实现梦想，回馈社会。
                  </Text>
                </VStack>
              </Box>
            </Stack>
          </VStack>
        </Container>
      </Box>

      {/* Learn More Section */}
      <Box bg={sectionBg} py={{ base: 12, lg: 20 }} px={6}>
        <Container maxW="container.lg">
          <VStack spacing={8} align="stretch">
            <VStack spacing={4} textAlign="center">
              <Heading as="h2" size="xl" color="brand.c">
                了解更多
              </Heading>
              <Text fontSize="lg" maxW="3xl" color="gray.600">
                社会导师服务的背后是一套完整的方法体系和运营平台
              </Text>
            </VStack>

            <Box bg={cardBg} p={8} borderRadius="lg">
              <VStack spacing={paragraphSpacing} align="start">
                <Text fontSize="lg">
                  随着这一系统的日益完善，我们欢迎各类组织和机构在自己的社区中尝试类似形式的导师服务。
                  如果您有兴趣合作或交流，请
                  <Link
                    href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
                    target="_blank"
                    color="brand.c"
                    fontWeight="bold"
                  >
                    联系我们
                  </Link>
                  。我们真诚期待您的反馈与交流。
                </Text>
              </VStack>
            </Box>
          </VStack>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        bgGradient={bgGradient}
        color="white"
        py={{ base: 12, lg: 16 }}
        px={6}
      >
        <Container maxW="container.lg">
          <VStack spacing={6} align="center" textAlign="center">
            <Heading as="h2" size="xl" color="white">
              准备好开始您的成长之旅了吗？
            </Heading>
            <Text fontSize="lg" maxW="2xl" opacity={0.95}>
              立即申请社会导师服务，让经验丰富的导师陪伴您成长
            </Text>
            <HStack spacing={4} pt={4}>
              <Button
                as={NextLink}
                href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
                target="_blank"
                size="lg"
                variant="outline"
                colorScheme="whiteAlpha"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
              >
                联系客服咨询
              </Button>
            </HStack>
          </VStack>
          <Footer icpIndex={4} beianNo="【待定】" />
        </Container>
      </Box>
    </VStack>
  );
}

// Component: Feature Card
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  const cardBg = useColorModeValue("white", "gray.700");

  return (
    <VStack
      bg={cardBg}
      p={6}
      borderRadius="lg"
      shadow="md"
      spacing={4}
      align="center"
      textAlign="center"
      transition="all 0.3s"
      _hover={{ transform: "translateY(-4px)", shadow: "lg" }}
    >
      <Icon as={icon} w={12} h={12} color="brand.c" />
      <Heading as="h3" size="md" color="brand.c">
        {title}
      </Heading>
      <Text color="gray.600" fontSize="sm">
        {description}
      </Text>
    </VStack>
  );
}

// Component: Process Step
function ProcessStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  const cardBg = useColorModeValue("white", "gray.700");

  return (
    <VStack
      bg={cardBg}
      p={6}
      borderRadius="lg"
      shadow="md"
      spacing={4}
      align="start"
      position="relative"
      transition="all 0.3s"
      _hover={{ shadow: "lg" }}
    >
      <Box
        position="absolute"
        top={-4}
        left={6}
        bg="brand.c"
        color="white"
        w={10}
        h={10}
        borderRadius="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontWeight="bold"
        fontSize="lg"
      >
        {number}
      </Box>
      <Heading as="h3" size="md" color="brand.c" mt={4}>
        {title}
      </Heading>
      <Text color="gray.600" fontSize="sm">
        {description}
      </Text>
    </VStack>
  );
}

// Component: Benefit Card
function BenefitCard({
  icon,
  title,
  items,
}: {
  icon: any;
  title: string;
  items: string[];
}) {
  const cardBg = useColorModeValue("white", "gray.700");

  return (
    <VStack
      bg={cardBg}
      p={6}
      borderRadius="lg"
      shadow="md"
      spacing={4}
      align="start"
      transition="all 0.3s"
      _hover={{ transform: "translateY(-4px)", shadow: "lg" }}
    >
      <HStack spacing={3}>
        <Icon as={icon} w={8} h={8} color="brand.c" />
        <Heading as="h3" size="md" color="brand.c">
          {title}
        </Heading>
      </HStack>
      <List spacing={2}>
        {items.map((item, idx) => (
          <ListItem key={idx} fontSize="sm" color="gray.600">
            <HStack align="start" spacing={2}>
              <ListIcon as={FaCheckCircle} color="green.500" mt={1} />
              <Text>{item}</Text>
            </HStack>
          </ListItem>
        ))}
      </List>
    </VStack>
  );
}
