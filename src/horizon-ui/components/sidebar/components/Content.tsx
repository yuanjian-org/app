// chakra imports
import { Box, Flex, Stack } from '@chakra-ui/react';
//   Custom components
import Brand from 'horizon-ui/components/sidebar/components/Brand';
import Links from 'horizon-ui/components/sidebar/components/Links';
import { SidebarItem } from 'sidebar';

// FUNCTIONS

interface SidebarContentProps {
	routes: SidebarItem[];
}

function SidebarContent(props: SidebarContentProps) {
	const { routes } = props;
	// SIDEBAR
	return (
		<Flex direction='column' height='100%' pt='25px' borderRadius='30px'>
			<Brand />
			<Stack direction='column' mt='8px' mb='auto'>
				<Box ps='20px' pe={{ lg: '16px', '2xl': '16px' }}>
					<Links routes={routes} />
				</Box>
			</Stack>

			{/*<Box ps='20px' pe={{ lg: '16px', '2xl': '20px' }} mt='60px' mb='40px' borderRadius='30px'>*/}
			{/*	<SidebarCard />*/}
			{/*</Box>*/}
		</Flex>
	);
}

export default SidebarContent;
