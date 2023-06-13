// Chakra Imports
import {
  Avatar,
  Button,
  Flex,
  Icon,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
  useColorMode
} from '@chakra-ui/react';
import PropTypes from 'prop-types';
import React from 'react';
import Image from 'next/image';
import wechatOfficialAccountQrCode from './yuanjian-official-account-qr.jpeg';
import Router from 'next/router';

export default function HeaderLinksLanding(props: { secondary: boolean }) {
  const { secondary } = props;
  const { colorMode, toggleColorMode } = useColorMode();
  // Chakra Color Mode
  const navbarIcon = useColorModeValue('gray.400', 'white');
  let menuBg = useColorModeValue('white', 'navy.800');
  const shadow = useColorModeValue(
    '14px 17px 40px 4px rgba(112, 144, 176, 0.18)',
    '14px 17px 40px 4px rgba(112, 144, 176, 0.06)'
  );
  return (
    <Flex
      w={{ sm: '100%', md: 'auto' }}
      alignItems='center'
      flexDirection='row'
      bg={menuBg}
      flexWrap={secondary ? { base: 'wrap', md: 'nowrap' } : 'unset'}
      p='10px'
      borderRadius='30px'
      boxShadow={shadow}
    >

      <Menu>
        <Button as={'div'}>
          <MenuButton fontWeight={'bold'}>
            微信公众号
          </MenuButton>
        </Button>
        <MenuList
          boxShadow={shadow}
          p='20px'
          borderRadius='20px'
          bg={menuBg}
          border='none'
          w={240}>
          <Image src={wechatOfficialAccountQrCode} alt={'微信公众号'} style={{ width: 200, height: 200 }}/>
        </MenuList>
      </Menu>
      <Button onClick={() => Router.push('/app')}>
        进入应用
      </Button>
    </Flex>
  );
}

HeaderLinksLanding.propTypes = {
  variant: PropTypes.string,
  fixed: PropTypes.bool,
  secondary: PropTypes.bool,
  onOpen: PropTypes.func
};
