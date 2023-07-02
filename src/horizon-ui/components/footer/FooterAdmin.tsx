/*eslint-disable*/

import { Center, Flex, Link, List, ListItem, Text, useColorModeValue } from '@chakra-ui/react';
import vercelBanner from '../../../../public/img/vercel-banner.svg';
import Image from "next/image";

export default function Footer() {
	const textColor = useColorModeValue('gray.400', 'white');
	return (
		<Flex
			zIndex='3'
			flexDirection={{
				base: 'column',
				xl: 'row'
			}}
			alignItems={{
				base: 'center',
				xl: 'start'
			}}
			justifyContent='space-between'
			px={{ base: '30px', md: '50px' }}
			pb='30px'>
			<Text
				color={textColor}
				textAlign={{
					base: 'center',
					xl: 'start'
				}}
				mb={{ base: '20px', xl: '0px' }}>
				{' '}
				<Text as='span' fontWeight='500' ms='4px'>
					&copy; {new Date().getFullYear()} 远见教育基金会
				</Text>
			</Text>
			<List display='flex'>
				<ListItem
					me={{
						base: '20px',
						md: '44px'
					}}>
					<Link fontWeight='500' color={textColor} target='_blank' href='http://app.yuanjian.org'>
						资源库
					</Link>
				</ListItem>
				<ListItem
					me={{
						base: '20px',
						md: '44px'
					}}>
					<Link fontWeight='500' color={textColor} target='_blank' href='http://yuanjian.org'>
						官网
					</Link>
				</ListItem>
				<ListItem
					marginEnd={{
						base: '20px',
						md: '44px'
					}}>
					<Link fontWeight='500' color={textColor} target='_blank' href='http://yuanjian.org/blog'>
						博客
					</Link>
				</ListItem>
        <Center opacity='50%'>
          <ListItem>
              <a href="https://vercel.com/?utm_source=yuanjian&utm_campaign=oss">
                <Image src={vercelBanner} alt="Vercel Banner" height="22" />
              </a>
          </ListItem>
        </Center>
			</List>
		</Flex>
	);
}
