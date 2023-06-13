// Chakra imports
import { Divider, Flex } from '@chakra-ui/react';

import yuanjianLogo from '../../../../../public/img/yuanjian-logo.png';
import Image from "next/image";

export function SidebarBrand() {
	return (
		<Flex alignItems='center' flexDirection='column'>
			<Image src={yuanjianLogo} alt="远见奖学金" style={{ width: 150 }}/>
			<Divider padding="3" />
		</Flex>
	);
}

export default SidebarBrand;
