
import dynamic from 'next/dynamic';

// TODO why type mismatch here???
// @ts-ignore
const DynamicChatbot = dynamic(() => import('../chatbot/components/home'), {
  loading: () => <p>Loading...</p>,
  ssr: false,
});

const ChatPage = () => {
  return <DynamicChatbot />;
};

export default ChatPage;
