export const NEW_USER_TYPES = [
  "长线运营乙游／女性向游戏",
  "买断制乙游／女性向游戏",
  "AI 互动类产品",
  "其他恋爱向游戏／产品",
  "几乎没有相关体验",
];

export const PRODUCT_OPTIONS_BY_TYPE = {
  "长线运营乙游／女性向游戏": ["恋与深空", "光与夜之恋", "未定事件簿", "恋与制作人", "世界之外", "时空中的绘旅人", "代号鸢／如鸢（同一产品）"],
  "买断制乙游／女性向游戏": ["Collar×Malice", "虔诚之花的晚钟", "奥林匹亚的晚宴", "终远的威尔修"],
  "AI 互动类产品": ["筑梦岛", "星野", "猫箱", "Character.AI"],
  "其他恋爱向游戏／产品": [],
  "几乎没有相关体验": [],
};

export const OTHER_FEEDBACK_OPTION = "其他（填写）";
export const OTHER_EXPECTATION = "其他你的期待";

const feedback = (positiveTitle, positiveOptions, negativeTitle, negativeOptions) => ({ positiveTitle, positiveOptions: [...positiveOptions, OTHER_FEEDBACK_OPTION], negativeTitle, negativeOptions: [...negativeOptions, OTHER_FEEDBACK_OPTION] });

export const QUESTIONNAIRE_FEEDBACK = {
  "长线运营乙游／女性向游戏": feedback("喜欢的点", ["角色陪伴与关系成长", "持续更新的主线／活动", "美术、配音与演出", "养成／收集与社区氛围", "没有明显偏好／说不清"], "不喜欢／担心的点", ["日常任务与时间压力", "付费／抽卡／养成压力", "主线更新慢或剧情被拆分", "活动重复、内容疲劳", "暂无明显不喜欢／说不清"]),
  "买断制乙游／女性向游戏": feedback("喜欢的点", ["完整叙事与明确结局", "多分支选择和重玩体验", "不用日常打卡、付费压力较小", "单次沉浸感强", "没有明显偏好／说不清"], "不喜欢／担心的点", ["内容消耗快、时长有限", "角色长期陪伴与持续互动较弱", "价格、本地化或平台门槛", "重玩动力较弱", "暂无明显不喜欢／说不清"]),
  "AI 互动类产品": feedback("喜欢的点", ["自然的角色对话", "个性化剧情或陪伴", "自由创作空间", "即时反馈", "没有明显偏好／说不清"], "不喜欢／担心的点", ["人设不稳或角色出戏", "理解偏差、答非所问", "生成速度、次数或成本限制", "隐私与内容安全", "暂无明显不喜欢／说不清"]),
  "几乎没有相关体验": feedback("你期待的点", ["有吸引力的角色", "好看的剧情", "美术与音乐", "轻松易上手", "有趣的 AI 互动"], "你担心的点", ["规则复杂、难上手", "付费压力", "隐私与内容安全", "内容质量不稳定", "暂无明显担心／说不清"]),
};

export const DISCOVERY_CHANNELS = ["小红书", "QQ群／微信群", "朋友推荐", "其他社交平台", "其他"];
export const MOTIVATIONS = ["独特的美术画风", "有你喜欢的角色设定", "对 AI 互动感兴趣", "喜欢剧情向体验", "其他玩家的社区氛围", "暂时没有特别喜欢的点"];
export const EXPECTATIONS = ["与角色动态立绘互动对话", "聊出自己独特的剧情走向", "解锁不一样的隐藏剧情", "生成专属剧情美术资产（AI 辅助）", "有趣的小游戏体验", OTHER_EXPECTATION];
export const REFERRAL_RECORD_LIMIT = 10;

export function resolveResultScreen(preview) {
  return ["success", "granted", "game-login", "game-activate"].includes(preview) ? preview : "intro";
}

export function getPreviousQuestionnaireScreen(screen) {
  return { identity: "intro", profile: "identity", expectation: "profile", phone: "expectation" }[screen] || screen;
}

export function resolveSubmissionTransition(result = {}, currentScreen) {
  if (result.alreadySubmitted === true) return { screen: currentScreen, requiresConfirmation: true };
  return { screen: result.status === "granted" ? "granted" : "success", requiresConfirmation: false };
}

export function getQuestionnaireFeedbackGroups(types = []) {
  return types.map((type) => ({ type, ...QUESTIONNAIRE_FEEDBACK[type] })).filter((group) => group.positiveOptions);
}

export function getReferralSummary(records = []) {
  const successfulInvites = records.length;
  return { successfulInvites, earnedHours: successfulInvites, visibleRecords: records.slice(0, REFERRAL_RECORD_LIMIT) };
}

export function getReferralSlots(records = []) {
  const successfulSlots = records.slice(0, REFERRAL_RECORD_LIMIT).map((name) => ({ name, status: "success" }));
  return [...successfulSlots, ...Array.from({ length: REFERRAL_RECORD_LIMIT - successfulSlots.length }, () => ({ status: "pending" }))];
}

const blank = (value) => !value || !value.trim();

export function validateProfileStep(data) {
  const errors = [];
  if (data.identity === "是") {
    if (blank(data.firstPhasePhone)) errors.push("请填写第一阶段注册手机号");
    if (blank(data.firstPhaseHighlight)) errors.push("请填写最深刻的第一阶段体验");
    if (blank(data.firstPhaseImprovement)) errors.push("请填写最需要改进的部分");
    return errors;
  }
  if (!data.newUserTypes?.length) errors.push("请选择至少一种相关产品类型");
  getQuestionnaireFeedbackGroups(data.newUserTypes).forEach((group) => {
    const answer = data.typeFeedback?.[group.type] || {};
    if (!answer.positive?.length || !answer.negative?.length) errors.push(`请完成「${group.type}」的优点和不足选择`);
  });
  if (!data.discoveryChannels?.length) errors.push("请选择了解招募的渠道");
  if (!data.motivations?.length) errors.push("请选择参加体验的原因");
  return errors;
}

export function validateSharedStep(data) {
  const errors = [];
  if (!data.expectations?.length) errors.push("请选择至少一项期待内容");
  return errors;
}

export function validateFinalStep(data) {
  const errors = [];
  if (!/^1\d{10}$/.test(data.phone || "")) errors.push("请输入正确的 11 位手机号码");
  if (!/^\d{4}$/.test(data.code || "")) errors.push("请输入 4 位验证码");
  if (!data.consent) errors.push("请先同意信息使用说明");
  return errors;
}

export function validateGroupStep({ qqJoined, wechatJoined }) {
  return qqJoined && wechatJoined ? "" : "请确认已加入官方 QQ 群和微信群";
}
