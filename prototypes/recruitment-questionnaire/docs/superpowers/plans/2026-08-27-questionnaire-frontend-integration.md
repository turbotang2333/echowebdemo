# Questionnaire Frontend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成问卷前端的邀请归因与招募接口适配层，使其能在后端接口完成后切换到真实数据。

**Architecture:** 新增纯函数模块负责邀请链接、问卷请求体和招募 HTTP 客户端，避免把接口细节放进 React 页面。`App.jsx` 根据环境变量选择演示数据或招募服务，并将后端结果映射为现有结果页所需的身份、邀请记录和奖励数据。

**Tech Stack:** React 19、Vite 6、Node 内置测试。

**Spec:** `docs/superpowers/specs/2026-08-27-questionnaire-backend-boundary-design.md`

## Global Constraints

- 不改已确认的问卷文案、版式和游戏模拟流程。
- 问卷阶段只展示邀请链接，不展示邀请码概念。
- 真实接口仅使用 `VITE_RECRUITMENT_API_BASE_URL` 配置；未配置时保留内部演示模式。
- 不把短信验证码、手机号或任何令牌写入 URL、控制台或分享文本。

---

### Task 1: 招募接口契约与邀请链接工具

**Files:**
- Create: `src/recruitment-api.js`
- Modify: `tests/questionnaire-model.test.mjs`

**Interfaces:**
- Produces: `getReferralToken(search)`, `buildReferralLink(origin, token)`, `buildApplicationRequest(data)`, `createRecruitmentApi(baseUrl, fetchImpl)`。
- Consumes: 招募服务的三个 HTTP 端点与当前问卷状态字段。

- [ ] **Step 1: Write the failing tests**

```js
test('keeps a valid referral token from a shared questionnaire link', () => {
  assert.equal(getReferralToken('?ref=7xKp9mQ2'), '7xKp9mQ2');
});

test('submission payload keeps answers and referral token but never SMS code', () => {
  assert.deepEqual(buildApplicationRequest({ mobileNum: '13800000000', smsCode: '123456', answers: { identity: '否' }, referralToken: '7xKp9mQ2' }), {
    mobileNum: '13800000000', smsCode: '123456', answers: { identity: '否' }, referralToken: '7xKp9mQ2',
  });
});
```

- [ ] **Step 2: Run the model test file and verify it fails because the module exports do not exist**

Run: `node --test tests/questionnaire-model.test.mjs`

- [ ] **Step 3: Implement the pure helpers and injected-fetch API client**

The API client must issue JSON POST requests to `sms-code`, `applications`, and `result-session`, reject non-200 HTTP responses and business responses whose `code` is not `200`, and return `data` for successful application/result requests.

- [ ] **Step 4: Run the model test file and verify it passes**

Run: `node --test tests/questionnaire-model.test.mjs`

- [ ] **Step 5: Commit only the module and tests**

```bash
git add prototypes/recruitment-questionnaire/src/recruitment-api.js prototypes/recruitment-questionnaire/tests/questionnaire-model.test.mjs
git commit -m "feat: add recruitment API contract"
```

### Task 2: 在现有问卷页面接入契约层

**Files:**
- Modify: `src/App.jsx`
- Modify: `tests/questionnaire-model.test.mjs`

**Interfaces:**
- Consumes: `getReferralToken`, `buildReferralLink`, `buildApplicationRequest`, `createRecruitmentApi`。
- Produces: 带归因标识的提交动作、以接口结果渲染的结果页、以及演示模式回退。

- [ ] **Step 1: Write the failing test for normalising an API result to result-page data**

```js
test('normalises server results for the existing referral card', () => {
  assert.deepEqual(normaliseRecruitmentResult({ phoneTail: '0000', status: 'success', referralRecords: [{ name: '回响玩家 A**' }], successfulInvites: 1, earnedHours: 1 }), {
    phoneTail: '0000', status: 'success', referralRecords: ['回响玩家 A**'], successfulInvites: 1, earnedHours: 1,
  });
});
```

- [ ] **Step 2: Run the model test file and verify it fails because the normaliser does not exist**

Run: `node --test tests/questionnaire-model.test.mjs`

- [ ] **Step 3: Implement the result normaliser, then use it in `App.jsx`**

When remote mode is enabled, `sendCode`, `submit`, `sendRecoveryCode`, and `recoverQuestionnaire` must await the client. In demo mode they retain the current local interaction. `submit` must send every questionnaire answer and the captured `ref` token. Result-page copy must use the returned referral link and records where available.

- [ ] **Step 4: Run the model test file and verify it passes**

Run: `node --test tests/questionnaire-model.test.mjs`

- [ ] **Step 5: Commit only the page, module, and tests**

```bash
git add prototypes/recruitment-questionnaire/src/App.jsx prototypes/recruitment-questionnaire/src/recruitment-api.js prototypes/recruitment-questionnaire/tests/questionnaire-model.test.mjs
git commit -m "feat: wire questionnaire referral flow"
```

### Task 3: 后端交接与发布验证

**Files:**
- Create: `BACKEND_INTEGRATION.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: 本计划中固定的三个招募服务请求与响应。
- Produces: 后端实现和前端发布所需的最小交接说明。

- [ ] **Step 1: Document the endpoint bodies, result fields, environment variable and release restriction**

The document must state that the back end owns SMS verification, idempotency, referral attribution and reward calculation; it must not include real hosts, credentials or example phone numbers.

- [ ] **Step 2: Update `AGENTS.md` with the approved referral-link rule and remote-mode restriction**

- [ ] **Step 3: Run the full frontend verification set**

Run: `npm run build && node --test tests/questionnaire-model.test.mjs && npm run test:sites`

Expected: build succeeds and every test passes.

- [ ] **Step 4: Manually verify in the browser**

Open `/?ref=7xKp9mQ2`, complete the demo flow, confirm that the success page copies a user-specific link; then open the submitted-record recovery entry and confirm it remains available.

- [ ] **Step 5: Commit only questionnaire files changed by this work**

```bash
git add prototypes/recruitment-questionnaire
git commit -m "docs: prepare questionnaire backend handoff"
```
