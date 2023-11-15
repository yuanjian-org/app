
import dynamic from 'next/dynamic';

// TODO why type mismatch here???
// @ts-ignore
const DynamicChatRoot = dynamic(() => import('./chat/SidebarChat'), {
  loading: () => <p>Loading...</p>,
});

const ChatPage = () => {
  return <DynamicChatRoot />;
};

export default ChatPage;
