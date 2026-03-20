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

export default widePage(() => {
  const { data: orgs } = trpcNext.orgs.list.useQuery();

  if (!orgs) return <Loader />;

  return (
    <Box mx={pageMarginX} mt={pageMarginX}>
      <HStack justifyContent="space-between" mb={componentSpacing}>
        <Heading size="lg">所有机构</Heading>
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
              <LinkOverlay as={NextLink} href={`/orgs/${org.id}`}>
                {org.name}
              </LinkOverlay>
            </Heading>
            <Text noOfLines={3}>{org.description || "暂无介绍"}</Text>
          </LinkBox>
        ))}
      </SimpleGrid>
    </Box>
  );
}, "机构列表");
