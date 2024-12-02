# 介绍

微信平台：

- 开放平台： https://open.weixin.qq.com
  - 网站应用：仅支持扫码登陆

- 公众平台： https://mp.weixin.qq.com
  - 服务号：仅支持微信内登陆，即微信浏览器登陆
  - 订阅号：不支持微信账号登陆

关于OpenId和UnionId：

- UnionId：对于同一用户，同一个微信开放平台用户绑定的不同应用和服务号，UnionId相同。[参考文档](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/union-id.html)。
- OpenId：对于同一用户，同一个微信开放平台用户绑定的不同应用和服务号，OpenId不同。

因此，我们在系统中用UnionID来识别用户。

# 微信平台配置

配置微信OAuth可信回调域名

1. 微信开放平台：管理中心 > 网站应用 > 查看应用 > 开发信息 > 授权回调域 > 修改

   需要配置域名，可以多次修改。

2. 微信公众平台（服务号）：设置与开发 > 账号设置 > 功能设置 > 网页授权域名 > 设置

   需要配置域名，一个自然月内最多可修改并保存五次。
也可以[使用微信测试账号](https://cloud.tencent.com/developer/article/1703167)对网页进行授权。

# 本地开发

1. 配置微信 OAuth 可信回调域名后，本地开发时如果使用生产 app id/secret，需要访问 https 域名，如 `https://mentors.org.cn`，否则无法通过鉴权。因此需要将本地开发环境配置为 https 环境。

   解决方式：

   - 对于 Mac 用户，可以使用开源工具 [ophiuchi](https://www.ophiuchi.dev/)，配置本地SSL环境。
   - 对于其他系统用户，参考 https://auth0.com/blog/using-https-in-your-development-environment/

2. 除了 `AUTH_WECHAT_*` 之外，也需要在 `.env` 文件中添加域名相关的配置：

   ```
   AUTH_TRUSTED_HOST=acme.com
   NEXTAUTH_URL=https://acme.com
   ```

3. 使用[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)可以在本地测试微信内登录的功能。
