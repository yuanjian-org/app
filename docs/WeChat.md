# 介绍

微信平台：

- 开放平台： https://open.weixin.qq.com
  - 网站应用：仅支持扫码登陆

- 公众平台： https://mp.weixin.qq.com
  - 服务号：仅支持微信内登陆，即微信移动端浏览器登陆（微信桌面端浏览器不支持）
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

1. 配置微信 OAuth 可信回调域名后，本地开发时如果使用生产 app id/secret，需要访问 https 域名，如 `https://yuantuapp.com`，否则无法通过鉴权。因此需要将本地开发环境配置为 https 环境。

   解决方式：

   - 对于 Mac 用户，可以使用开源工具 [ophiuchi](https://www.ophiuchi.dev/)，配置本地SSL环境。
   - 对于其他系统用户，参考 https://auth0.com/blog/using-https-in-your-development-environment/

2. 除了 `AUTH_WECHAT_*` 之外，也需要在 `.env` 文件中添加域名相关的配置：

   ```
   AUTH_TRUSTED_HOST=yuantuapp.com
   NEXTAUTH_URL=https://yuantuapp.com
   ```

   注意，设置NEXTAUTH_URL会影响在本地测试email登录。因此在测试完微信登录后，请清除此值。

3. 使用[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)可以在本地测试微信内登录的功能。

# 微信服务号消息通知配置

系统支持通过**已微信认证的服务号**向用户个人微信推送模板消息通知（如待办事项、
树洞动态、内部笔记、一对一通话提醒、点赞等）。

## 一、前置条件

1. 拥有一个**已认证的微信服务号**（订阅号不支持模板消息接口），对应 `.env` 中的
   `AUTH_WECHAT_APP_ID` 和 `AUTH_WECHAT_APP_SECRET`。
2. 该服务号已绑定到与网站扫码登录应用（`AUTH_WECHAT_QR_APP_ID`）**同一个微信开放
   平台（`open.weixin.qq.com`）账号**下：
   - 登录微信开放平台 > **管理中心** > **公众号** > **绑定公众号**。
   - 绑定后，用户在电脑端扫码登录记录的 `wechatUnionId` 才能与服务号关注者的
     `UnionID` 自动匹配，进而解析出该用户在服务号下的 `wechatOpenId`。

## 二、配置服务器 IP 白名单

调用服务号服务端接口（获取 `stable_token`、同步关注者列表、发送模板消息）必须将
部署服务器的公网出口 IPv4 地址加入白名单：

1. 登录 [微信公众平台](https://mp.weixin.qq.com)（服务号后台）。
2. 进入 **设置与开发** > **安全中心** > **IP白名单**（旧版后台入口为 **设置与开
   发** > **基本配置** > **IP白名单**）。
3. 填入运行后端服务的服务器公网 IPv4 地址并扫码确认保存。

> **注意**：本方案直接调用主动接口（`stable_token`、`user/get`、
> `user/info/batchget`、`message/template/send`），**无需启用「服务器配置（消息
> 推送 URL）」**。请保持「服务器配置」为停用状态，以免导致公众平台后台可视化配置
> 的「自定义菜单」和「自动回复」失效。

## 三、开通模板消息并选用通知模板

1. 在微信公众平台后台左侧菜单，进入 **广告与服务** > **模板消息**（若尚未开通，
   先按提示申请开通模板消息功能并选择与机构匹配的服务类目）。
2. 进入 **模板库**（类目模板），搜索并选用一个通用的通知提醒类模板（例如「待办任
   务提醒」、「服务状态通知」、「消息提醒」、「工单进度通知」等）。
3. 在 **我的模板** 中点开刚添加的模板，记录以下两项信息：
   - **模板 ID**（形如 `ngqIpbwh8bUfcSsECmogfXcV14J0tQlEpBO27izEYtY`）
   - **详细内容中的字段参数名**：自 2023 年 5 月微信模板消息新规起，`first` /
     `remark` 已不展示，模板字段通常由 2～3 个类目参数组成，例如：
     - 标题/类型字段：`{{thing1.DATA}}`（事物类型，微信限制 ≤ 20 个字符，系统会
       自动清理 HTML/Emoji 并截断至 20 字以内）
     - 内容/摘要字段：`{{thing2.DATA}}`（事物类型，≤ 20 个字符）
     - 时间字段：`{{time3.DATA}}`（时间类型，系统按北京时间自动格式化为
       `YYYY-MM-DD HH:mm`）

## 四、配置环境变量（`.env`）

在部署环境的 `.env`（或多白标部署对应的 `.env.<white_label>`）中配置：

```ini
# 服务号 AppID 与 AppSecret（与微信内登录共用）
AUTH_WECHAT_APP_ID=wx1234567890abcdef
AUTH_WECHAT_APP_SECRET=your_app_secret

# 必填：微信公众平台「我的模板」中的模板 ID（配置后自动开启微信通知列）
WECHAT_NOTIFICATION_TEMPLATE_ID=your_template_id

# 选填：对应模板中的字段名，默认值分别为 thing1、thing2、time3。
# 若模板字段编号不同（如 thing4、character_string1、time2），按实际名称填写；
# 若模板中无某个字段（如无时间字段），请显式设为空字符串 ""。
WECHAT_NOTIFICATION_TITLE_FIELD=thing1
WECHAT_NOTIFICATION_CONTENT_FIELD=thing2
WECHAT_NOTIFICATION_TIME_FIELD=time3

# 选填：服务号关注二维码图片链接（配置后在「偏好设置 > 通知偏好」下方展示）
WECHAT_OFFICIAL_ACCOUNT_QR_URL=/img/wechat-app-qrcode.jpg
```

说明：系统使用微信官方的 `cgi-bin/stable_token`（稳定版接口调用凭据），若多个容
器实例共用同一个服务号凭证，彼此不会互相刷新导致 `access_token` 失效。

## 五、用户侧使用流程与工作原理

1. **关联微信并关注服务号**：
   - 用户至少使用微信登录过一次平台（电脑扫码登录或微信内打开登录均可），系统会
     记录用户的 `wechatUnionId`（微信内登录还会直接记录 `wechatOpenId`）。
   - 用户使用微信扫码关注该服务号。若用户仅通过电脑扫码登录过，系统会在发送通知
     时通过 `user/get` + `user/info/batchget` 自动将服务号关注者的 `OpenID` 与
     `wechatUnionId` 关联并缓存到数据库的 `users.wechatOpenId` 列。
2. **通知偏好管理**：
   - 配置生效后，用户在 **偏好设置（`/preferences/me`）** 的「通知偏好」中会看到
     **微信通知** 开关列（默认开启，可按「所有通知 / 点赞 / 待办事项 / 内部笔记
     / 一对一通话提醒 / 树洞」单独开关）。
   - 点击微信收到的模板消息卡片，可直接在微信内跳转到对应的平台页面（如树洞问题
     页、学生档案页或首页待办列表）。

## 六、常见错误码排查

可在容器日志（`docker logs <container>`）中检索 `WeChat` 查看发送状态：

- **`40164` (`invalid ip ... not in whitelist`)**：服务器公网出口 IP 未加入服务
  号后台的 **IP白名单**，或服务器更换了公网 IP。
- **`43004` (`require subscribe`)**：该用户尚未关注服务号或已取消关注（系统会自
  动跳过该用户，不影响其他用户及短信/邮件发送）。
- **`40037` (`invalid template_id`)**：`WECHAT_NOTIFICATION_TEMPLATE_ID` 填写有
  误，或该模板不属于当前 `AUTH_WECHAT_APP_ID` 服务号。
- **`47003` (`argument invalid`)**：`WECHAT_NOTIFICATION_*_FIELD` 字段名与模板中
  的实际参数名不一致，或误将非事物/文本类字段（如纯数字 `number`、纯枚举
  `const`）配置为了标题/内容字段。
- **`48001` (`api unauthorized`)**：当前公众号未完成微信认证，或属于订阅号而非服
  务号，或尚未在后台开通「模板消息」功能插件。
