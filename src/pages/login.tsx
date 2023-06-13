import { useEffect } from 'react'
import { Guard } from '@authing/guard-react18'
import '@authing/guard-react18/dist/esm/guard.min.css'

import browserEnv from "../browserEnv";

export default function Login() {

  const guard = new Guard({ appId: browserEnv.NEXT_PUBLIC_AUTHING_APP_ID,
    redirectUri: 
      typeof window !== 'undefined' ? (location.origin + '/callback') : ''
    })

  const guardEffects = async () => {
    guard.start('#authing-guard-container').then(userInfo => {
      console.log('start userInfo: ', userInfo)
    })

    guard.on('load', (e) => {
      console.log('加载啊', e)
    })

    guard.on('login', userInfo => {
      console.log('userInfo: ', userInfo)
      // ....... 跳转
      location.href = '/';

    })
  }

  useEffect(() => {
    console.log("embeded")
    guardEffects()
  }, [])


  return (
    <div>
      <div id="authing-guard-container"></div>
    </div>
  )
}
