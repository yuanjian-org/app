import React, {useRef, useState} from "react";
import {Chat} from "./components/chat";
import {useAccessStore} from "./accessStore";
import {ChatList} from "./components/chat-list";
import {useChatStore} from "./store";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
const ChatWrapper = () => {
  const accessStore = useAccessStore();
  const chatStore = useChatStore();
  console.log('inside the wrapper');

  return <div className={'sidebar-chat'}>
    {(chatStore.currentSessionIndex !== undefined) ? <>
          <div className={'back-line'}>
            <button onClick={() => chatStore.selectSession(undefined) }>{"<"} Back</button>
          </div>
          <div className={'chat-wrapper'}>
            <Chat />
          </div>
        </> : <ChatList />}
    <style jsx>{`
      .sidebar-chat {
        height: 100%;
        position: relative;
      }
      .chat-wrapper {
        position: absolute;
        top: 30px;
        left: 0;
        right: 0;
        bottom: 0;
      }
      .back-line {
        position: absolute;
        top: 0;
        left: 3px;
        right: 0;
        height: 30px;
        
        display: flex;
        align-items: center;
        justify-content: flex-start;
      }
    `}</style>
  </div>
};


const router = createBrowserRouter([
  {
    path: "/chatbot",
    element: <ChatWrapper />,
  },
]);

const AppRoot = () => {
  return <RouterProvider router={router} />;
};

export default AppRoot;
