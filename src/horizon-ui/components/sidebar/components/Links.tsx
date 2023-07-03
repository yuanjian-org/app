/* eslint-disable */

// chakra imports
import { Box, Flex, HStack, Text, useColorModeValue } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { SidebarItem } from 'sidebar'
import useUserContext from 'useUserContext'
import { isPermitted } from '../../../../shared/Role'

interface SidebarLinksProps {
  routes: SidebarItem[]
}

export function SidebarLinks (props: SidebarLinksProps) {
  const { routes } = props
  const router = useRouter()

  let activeColor = useColorModeValue('gray.700', 'white')
  let inactiveColor = useColorModeValue(
    'secondaryGray.600',
    'secondaryGray.600'
  )
  let activeIcon = useColorModeValue('brand.500', 'white')
  let textColor = useColorModeValue('secondaryGray.500', 'white')
  let brandColor = useColorModeValue('brand.500', 'brand.400')

  // verifies if routeName is the one active (in browser input)
  const activeRoute = (routeName: string) => {
    return router.pathname === routeName;
  }

  const [user] = useUserContext();

  // this function creates the links from the secondary accordions (for example auth -> sign-in -> default)
  const createLinks = (routes: SidebarItem[]) => {
    return routes.filter(r => isPermitted(user.roles, r.role)).map((route, index: number) => {
      return (
        <Link key={index} href={route.path}>
            {route.icon ? (
              <Box>
                <HStack
                  spacing={
                    activeRoute(route.path.toLowerCase()) ? '22px' : '26px'
                  }
                  py='5px'
                  ps='10px'
                >
                  <Flex w='100%' alignItems='center' justifyContent='center'>
                    <Box
                      color={
                        activeRoute(route.path.toLowerCase())
                          ? activeIcon
                          : textColor
                      }
                      me='18px'
                    >
                      {route.icon}
                    </Box>
                    <Text
                      me='auto'
                      color={
                        activeRoute(route.path.toLowerCase())
                          ? activeColor
                          : textColor
                      }
                      fontWeight={
                        activeRoute(route.path.toLowerCase())
                          ? 'bold'
                          : 'normal'
                      }
                    >
                      {route.name}
                    </Text>
                  </Flex>
                  <Box
                    h='36px'
                    w='4px'
                    bg={
                      activeRoute(route.path.toLowerCase())
                        ? brandColor
                        : 'transparent'
                    }
                    borderRadius='5px'
                  />
                </HStack>
              </Box>
            ) : (
              <Box>
                <HStack
                  spacing={
                    activeRoute(route.path.toLowerCase()) ? '22px' : '26px'
                  }
                  py='5px'
                  ps='10px'
                >
                  <Text
                    me='auto'
                    color={
                      activeRoute(route.path.toLowerCase())
                        ? activeColor
                        : inactiveColor
                    }
                    fontWeight={
                      activeRoute(route.path.toLowerCase())
                        ? 'bold'
                        : 'normal'
                    }
                  >
                    {route.name}
                  </Text>
                  <Box h='36px' w='4px' bg='brand.400' borderRadius='5px' />
                </HStack>
              </Box>
            )}
        </Link>
      )
    })
  }
  //  BRAND
  return <>{createLinks(routes)}</>
}

export default SidebarLinks
