# UI Style Guide

* Use Chakra UI's native components and styles. We are going to remove Horizon UI from our codebase, so avoid it.
* Use Chakra UI's [native icon library](https://chakra-ui.com/docs/components/icon#using-chakra-ui-icons). Fall back to 
[Material Design](https://react-icons.github.io/react-icons/icons?name=md) if no suitable icon is found natively. 
(e.g. `<Icon as={MdSettings} />`). For consistency, avoid using other icon libraries.
