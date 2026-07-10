import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  LinkBox,
  LinkOverlay,
  HStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { trpcNext } from "trpc";
import { widePage } from "AppPage";
import Loader from "components/Loader";
import { pageMarginX, componentSpacing } from "theme/metrics";
import MarkdownStyler from "components/MarkdownStyler";
import T from "components/T";
import getI18nProps from "components/getI18nProps";

export default widePage(() => {
  const { data: orgs } = trpcNext.orgs.listPublic.useQuery();

  if (!orgs) return <Loader />;

  return (
    <Box mx={pageMarginX} mt={pageMarginX}>
      <HStack justifyContent="space-between" mb={componentSpacing}>
        <Heading size="lg">
          <T>所有机构</T>
        </Heading>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={10}>
        {orgs.map((org) => (
          <LinkBox
            key={org.id}
            bg="white"
            p="5"
            borderWidth="1px"
            rounded="md"
            _hover={{ shadow: "md", borderColor: "brand.500" }}
          >
            <Heading size="md" my="2">
              <LinkOverlay as={NextLink} href={`/s/orgs/${org.id}`}>
                {org.name}
              </LinkOverlay>
            </Heading>
            <Box noOfLines={3}>
              {org.description ? (
                <MarkdownStyler content={org.description} />
              ) : (
                <Text>
                  <T>暂无介绍</T>
                </Text>
              )}
            </Box>
          </LinkBox>
        ))}
      </SimpleGrid>
    </Box>
  );
}, "机构列表");
export const getStaticProps = getI18nProps;
