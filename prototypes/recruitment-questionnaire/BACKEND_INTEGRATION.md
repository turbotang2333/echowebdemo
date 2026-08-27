# 问卷招募后端交接

前端已完成接口适配层。配置 `VITE_RECRUITMENT_API_BASE_URL` 后，会向该地址请求以下三个接口；未配置时仍是仅供内部体验的浏览器演示模式，不能对外收集问卷。

## 接口

| 接口 | 请求体 | 用途 |
|---|---|---|
| `POST /api/recruitment/sms-code` | `{ "mobileNum": "..." }` | 向该手机号发送验证短信 |
| `POST /api/recruitment/applications` | `{ "mobileNum", "smsCode", "answers", "referralToken" }` | 验证手机号后幂等保存问卷、完成邀请归因并返回结果 |
| `POST /api/recruitment/result-session` | `{ "mobileNum", "smsCode" }` | 验证手机号并返回已提交的结果页数据 |

成功响应使用：

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "phoneTail": "0000",
    "status": "success",
    "referralLink": "https://问卷域名/?ref=随机归因标识",
    "referralRecords": [{ "name": "已脱敏显示名" }],
    "successfulInvites": 0,
    "earnedHours": 0
  }
}
```

`status` 仅为 `success` 或 `granted`。业务失败返回非 `200` 的 `code` 和可展示的 `message`；不要在消息中泄露其他用户身份或账号状态。

## 后端职责

1. 服务端调用既有短信登录能力，前端不保存或共享游戏登录令牌。
2. 将已验证账号与问卷提交绑定；同一账号重复提交必须返回既有结果或按业务规则更新，不重复发奖励。
3. 首次提交时读取可选 `referralToken`：验证链接有效、不是本人、未被同一受邀人重复归因后，写入邀请关系和问卷阶段资源流水。
4. 为每一位提交者生成或返回一个不可读、可停用的问卷专属邀请链接。问卷阶段只叫“邀请链接”，不产生用户可见的邀请码。
5. 受邀人完成本轮问卷提交即计奖；不根据是否已有游戏账号排除。
6. 用户进入游戏体验阶段后停用其问卷邀请链接的计奖能力。游戏邀请码与“进入体验”事件留给下一阶段实现。

## 推荐数据边界

- `recruitment_application`：已验证账号、活动、问卷答案、提交状态、提交时间。
- `recruitment_referral_link`：随机归因标识、邀请人、所属阶段、启用状态、失效时间。
- `recruitment_referral_conversion`：邀请链接、邀请人、受邀人、成功事件、成功时间；对“活动 + 受邀人”设唯一约束。
- `recruitment_reward_ledger`：资源类型、数量、来源事件、归属账号、发放时间。

以上记录可复用于下周的游戏内邀请，但游戏邀请码应使用不同的链接/码类型和不同的成功事件。

## 发布前检查

- 招募服务允许问卷域名跨域调用，或通过同域反向代理提供接口。
- 手机号、验证码和邀请归因判断只在 HTTPS 请求体与服务端日志脱敏字段中处理，不能放入网址。
- 以两个手机号完成：分享链接进入 → 提交问卷 → 邀请人结果页记录和资源更新 → 清除浏览器数据后通过手机号恢复结果。
