const REFERRAL_TOKEN_PATTERN = /^[A-Za-z0-9_-]{6,96}$/;
const QUESTIONNAIRE_DEVICE_SN_STORAGE_KEY = "recruitment-questionnaire-device-sn";

function cleanBaseUrl(baseUrl) {
  return String(baseUrl || "").replace(/\/+$/, "");
}

function responseMessage(payload, fallback) {
  return payload?.message || payload?.msg || payload?.detail || fallback;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    throw new Error("招募服务返回了无法识别的内容");
  }
}

export function getReferralToken(search) {
  const token = new URLSearchParams(search || "").get("ref");
  return token && REFERRAL_TOKEN_PATTERN.test(token) ? token : null;
}

export function buildReferralLink(origin, referralToken) {
  if (!referralToken || !REFERRAL_TOKEN_PATTERN.test(referralToken)) return "";
  const url = new URL("/", origin);
  url.searchParams.set("ref", referralToken);
  return url.toString();
}

export function buildApplicationRequest({ mobileNum, smsCode, answers, referralToken }) {
  return {
    mobileNum,
    smsCode,
    answers: answers || {},
    referralToken: referralToken && REFERRAL_TOKEN_PATTERN.test(referralToken) ? referralToken : null,
  };
}

function getBrowserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function getQuestionnaireDeviceSn(storage = getBrowserStorage(), cryptoImpl = globalThis.crypto) {
  const saved = storage?.getItem?.(QUESTIONNAIRE_DEVICE_SN_STORAGE_KEY);
  if (typeof saved === "string" && saved.length >= 1 && saved.length <= 128) return saved;

  const randomId = cryptoImpl?.randomUUID?.()
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const deviceSn = `questionnaire-${randomId}`.slice(0, 128);
  try {
    storage?.setItem?.(QUESTIONNAIRE_DEVICE_SN_STORAGE_KEY, deviceSn);
  } catch {
    // 浏览器禁用存储时，当前页面仍可继续完成验证。
  }
  return deviceSn;
}

export function normaliseRecruitmentResult(result = {}) {
  const referralRecords = Array.isArray(result.referralRecords)
    ? result.referralRecords.map((record) => typeof record === "string" ? record : record?.name).filter(Boolean)
    : [];
  const successfulInvites = Number.isFinite(result.successfulInvites) ? Math.max(0, result.successfulInvites) : referralRecords.length;
  const earnedHours = Number.isFinite(result.earnedHours) ? Math.max(0, result.earnedHours) : successfulInvites;

  return {
    phoneTail: /^\d{4}$/.test(result.phoneTail || "") ? result.phoneTail : "",
    status: result.status === "granted" ? "granted" : "success",
    referralLink: typeof result.referralLink === "string" ? result.referralLink : "",
    referralRecords,
    successfulInvites,
    earnedHours,
  };
}

export function createRecruitmentApi(baseUrl, fetchImpl = globalThis.fetch, { deviceSn = getQuestionnaireDeviceSn() } = {}) {
  const base = cleanBaseUrl(baseUrl);
  if (!base) throw new Error("未配置招募服务地址");
  if (typeof fetchImpl !== "function") throw new Error("当前环境不支持网络请求");

  const post = async (path, body) => {
    const response = await fetchImpl(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await readJson(response);
    if (!response.ok || payload?.code !== 200) throw new Error(responseMessage(payload, "招募服务暂时不可用"));
    return payload.data ?? null;
  };

  return {
    sendSmsCode: (mobileNum) => post("/api/recruitment/sms-code", { mobileNum }),
    submitApplication: (data) => post("/api/recruitment/applications", { ...buildApplicationRequest(data), deviceSn }),
    recoverResult: ({ mobileNum, smsCode }) => post("/api/recruitment/result-session", { mobileNum, smsCode, deviceSn }),
  };
}
