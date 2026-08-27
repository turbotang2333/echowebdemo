import assert from "node:assert/strict";
import test from "node:test";
import { NEW_USER_TYPES, getPreviousQuestionnaireScreen, getQuestionnaireFeedbackGroups, getReferralSlots, getReferralSummary, resolveResultScreen, validateFinalStep, validateGroupStep, validateProfileStep, validateSharedStep } from "../src/questionnaire-model.js";
import { buildApplicationRequest, buildReferralLink, createRecruitmentApi, getQuestionnaireDeviceSn, getReferralToken, normaliseRecruitmentResult } from "../src/recruitment-api.js";

test("new user profile blocks every required answer that is missing", () => {
  assert.deepEqual(
    validateProfileStep({ identity: "否", newUserTypes: [], typeFeedback: {}, discoveryChannels: [], motivations: [] }),
    ["请选择至少一种相关产品类型", "请选择了解招募的渠道", "请选择参加体验的原因"],
  );
});

test("new user must answer the dynamic likes and concerns for every selected type", () => {
  assert.deepEqual(
    validateProfileStep({ identity: "否", newUserTypes: ["AI 互动类产品"], typeFeedback: {}, discoveryChannels: ["小红书"], motivations: ["对 AI 互动感兴趣"] }),
    ["请完成「AI 互动类产品」的优点和不足选择"],
  );
});

test("old user profile blocks every required answer that is missing", () => {
  assert.deepEqual(
    validateProfileStep({ identity: "是", firstPhasePhone: "", firstPhaseHighlight: "", firstPhaseImprovement: "" }),
    ["请填写第一阶段注册手机号", "请填写最深刻的第一阶段体验", "请填写最需要改进的部分"],
  );
});

test("shared step requires an expectation but does not require text when other is selected", () => {
  assert.deepEqual(validateSharedStep({ expectations: [], otherExpectation: "" }), ["请选择至少一项期待内容"]);
  assert.deepEqual(validateSharedStep({ expectations: ["其他你的期待"], otherExpectation: "" }), []);
});

test("final step requires a verified-format phone, four-digit code, and consent", () => {
  assert.deepEqual(
    validateFinalStep({ phone: "1380000000", code: "12", consent: false, identity: "否", firstPhasePhone: "" }),
    ["请输入正确的 11 位手机号码", "请输入 4 位验证码", "请先同意信息使用说明"],
  );
});

test("resource binding can use a phone different from the first-phase record", () => {
  assert.deepEqual(validateFinalStep({ phone: "13900000000", code: "1234", consent: true, identity: "是", firstPhasePhone: "13800000000" }), []);
});

test("group guidance requires confirmation for both official groups", () => {
  assert.equal(validateGroupStep({ qqJoined: true, wechatJoined: false }), "请确认已加入官方 QQ 群和微信群");
});

test("new-user type options mirror the approved questionnaire", () => {
  assert.deepEqual(NEW_USER_TYPES, [
    "长线运营乙游／女性向游戏",
    "买断制乙游／女性向游戏",
    "AI 互动类产品",
    "其他恋爱向游戏／产品",
    "几乎没有相关体验",
  ]);
});

test("dynamic feedback groups follow the selected questionnaire types", () => {
  const [group] = getQuestionnaireFeedbackGroups(["几乎没有相关体验"]);
  assert.equal(group.positiveTitle, "你期待的点");
  assert.equal(group.negativeTitle, "你担心的点");
  assert.deepEqual(getQuestionnaireFeedbackGroups([]), []);
  assert.deepEqual(getQuestionnaireFeedbackGroups(["其他恋爱向游戏／产品"]), []);
});

test("selecting other feedback without extra text does not block the new-user flow", () => {
  assert.deepEqual(
    validateProfileStep({ identity: "否", newUserTypes: ["AI 互动类产品"], typeFeedback: { "AI 互动类产品": { positive: ["其他（填写）"], negative: ["其他（填写）"] } }, discoveryChannels: ["小红书"], motivations: ["对 AI 互动感兴趣"] }),
    [],
  );
});

test("referral summary keeps the full accumulated reward but shows only the first ten records", () => {
  const records = Array.from({ length: 12 }, (_, index) => `邀请好友 ${index + 1}`);

  assert.deepEqual(getReferralSummary(records), {
    successfulInvites: 12,
    earnedHours: 12,
    visibleRecords: [
      "邀请好友 1",
      "邀请好友 2",
      "邀请好友 3",
      "邀请好友 4",
      "邀请好友 5",
      "邀请好友 6",
      "邀请好友 7",
      "邀请好友 8",
      "邀请好友 9",
      "邀请好友 10",
    ],
  });
});

test("referral slots show two registered friends followed by eight pending invitations", () => {
  assert.deepEqual(getReferralSlots(["回响玩家 A**", "回响玩家 B**"]), [
    { name: "回响玩家 A**", status: "success" },
    { name: "回响玩家 B**", status: "success" },
    { status: "pending" },
    { status: "pending" },
    { status: "pending" },
    { status: "pending" },
    { status: "pending" },
    { status: "pending" },
    { status: "pending" },
    { status: "pending" },
  ]);
});

test("result preview resolves the two supported result states and falls back to the questionnaire", () => {
  assert.equal(resolveResultScreen("success"), "success");
  assert.equal(resolveResultScreen("granted"), "granted");
  assert.equal(resolveResultScreen("game-login"), "game-login");
  assert.equal(resolveResultScreen("game-activate"), "game-activate");
  assert.equal(resolveResultScreen("anything-else"), "intro");
});

test("questionnaire back navigation returns each step to its immediate predecessor", () => {
  assert.equal(getPreviousQuestionnaireScreen("identity"), "intro");
  assert.equal(getPreviousQuestionnaireScreen("profile"), "identity");
  assert.equal(getPreviousQuestionnaireScreen("expectation"), "profile");
  assert.equal(getPreviousQuestionnaireScreen("phone"), "expectation");
  assert.equal(getPreviousQuestionnaireScreen("success"), "success");
});

test("shared questionnaire link keeps only a valid referral token", () => {
  assert.equal(getReferralToken("?ref=7xKp9mQ2"), "7xKp9mQ2");
  assert.equal(getReferralToken("?ref=not%20a%20token"), null);
  assert.equal(getReferralToken("?ref=short"), null);
});

test("referral link preserves the token without exposing an inviter identity", () => {
  assert.equal(buildReferralLink("https://survey.example.test/", "7xKp9mQ2"), "https://survey.example.test/?ref=7xKp9mQ2");
});

test("submission request keeps verified phone, SMS code, answers and shared referral token", () => {
  assert.deepEqual(
    buildApplicationRequest({
      mobileNum: "13800000000",
      smsCode: "1234",
      answers: { identity: "否", expectations: ["有趣的小游戏体验"] },
      referralToken: "7xKp9mQ2",
    }),
    {
      mobileNum: "13800000000",
      smsCode: "1234",
      answers: { identity: "否", expectations: ["有趣的小游戏体验"] },
      referralToken: "7xKp9mQ2",
    },
  );
});

test("questionnaire device marker is generated once and recovered from browser storage", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  const cryptoImpl = { randomUUID: () => "device-uuid" };

  const first = getQuestionnaireDeviceSn(storage, cryptoImpl);
  const second = getQuestionnaireDeviceSn(storage, { randomUUID: () => "another-uuid" });

  assert.equal(first, "questionnaire-device-uuid");
  assert.equal(second, first);
});

test("recruitment client posts the questionnaire payload and returns the server result", async () => {
  const requests = [];
  const api = createRecruitmentApi("https://recruitment.example.test", async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({
      code: 200,
      message: "ok",
      data: {
        phoneTail: "0000",
        status: "success",
        referralLink: "https://survey.example.test/?ref=7xKp9mQ2",
        referralRecords: [],
        successfulInvites: 0,
        earnedHours: 0,
      },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }, { deviceSn: "questionnaire-test-device" });

  const result = await api.submitApplication({
    mobileNum: "13800000000",
    smsCode: "1234",
    answers: { identity: "否" },
    referralToken: "7xKp9mQ2",
  });

  assert.deepEqual(result, {
    phoneTail: "0000",
    status: "success",
    referralLink: "https://survey.example.test/?ref=7xKp9mQ2",
    referralRecords: [],
    successfulInvites: 0,
    earnedHours: 0,
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://recruitment.example.test/api/recruitment/applications");
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    mobileNum: "13800000000",
    smsCode: "1234",
    deviceSn: "questionnaire-test-device",
    answers: { identity: "否" },
    referralToken: "7xKp9mQ2",
  });
});

test("server recruitment result becomes safe data for the existing referral card", () => {
  assert.deepEqual(
    normaliseRecruitmentResult({
      phoneTail: "0000",
      status: "success",
      referralLink: "https://survey.example.test/?ref=7xKp9mQ2",
      referralRecords: [{ name: "回响玩家 A**" }, { name: "回响玩家 B**" }],
      successfulInvites: 2,
      earnedHours: 2,
    }),
    {
      phoneTail: "0000",
      status: "success",
      referralLink: "https://survey.example.test/?ref=7xKp9mQ2",
      referralRecords: ["回响玩家 A**", "回响玩家 B**"],
      successfulInvites: 2,
      earnedHours: 2,
    },
  );
});
