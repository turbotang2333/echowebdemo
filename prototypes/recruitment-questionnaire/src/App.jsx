import { useMemo, useState } from 'react';
import { DISCOVERY_CHANNELS, EXPECTATIONS, MOTIVATIONS, NEW_USER_TYPES, OTHER_EXPECTATION, OTHER_FEEDBACK_OPTION, PRODUCT_OPTIONS_BY_TYPE, getPreviousQuestionnaireScreen, getQuestionnaireFeedbackGroups, getReferralSlots, resolveResultScreen, validateFinalStep, validateProfileStep, validateSharedStep } from './questionnaire-model.js';
import { buildApplicationRequest, buildReferralLink, createRecruitmentApi, getReferralToken, normaliseRecruitmentResult } from './recruitment-api.js';

const DEMO_INVITEE_RECORDS = ['回响玩家 A**', '回响玩家 B**'];
const DEMO_APPLICATIONS_STORAGE_KEY = 'echo-recruitment-demo-applications';
const DEMO_QUESTIONNAIRE_SESSION_KEY = 'echo-recruitment-demo-questionnaire-session';
const DEMO_GAME_SESSION_KEY = 'echo-recruitment-demo-game-session';
const DEMO_GAME_ACCOUNTS_STORAGE_KEY = 'echo-recruitment-demo-game-accounts';
const REMOTE_RECRUITMENT_API_BASE_URL = import.meta.env.VITE_RECRUITMENT_API_BASE_URL || '';

function loadStoredJson(key, fallback) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function loadApplications() {
  const applications = loadStoredJson(DEMO_APPLICATIONS_STORAGE_KEY, {});
  return applications && typeof applications === 'object' ? applications : {};
}

function loadStoredPhone(key) {
  const phone = window.localStorage.getItem(key) || '';
  return /^1\d{10}$/.test(phone) ? phone : '';
}

function getDemoReferralToken(phone) {
  return `demo-ref-${phone?.slice(-4) || 'guest'}`;
}

function Choice({ active, children, onClick, multi = false }) {
  return <button type="button" className={`choice ${active ? 'active' : ''}`} onClick={onClick} aria-pressed={active}><span className={`mark ${multi ? 'square' : ''}`}>{active ? '✓' : ''}</span><span>{children}</span></button>;
}

function Field({ label, required = false, hint, children }) {
  return <div className="field"><span>{label}{required && <em className="required">必填</em>}</span>{children}{hint && <small>{hint}</small>}</div>;
}

function ErrorList({ errors }) {
  return errors.length ? <div className="error-list"><b>请完善以下内容：</b>{errors.map((error) => <span key={error}>{error}</span>)}</div> : null;
}

function StepActions({ onBack, onNext, nextLabel }) {
  return <div className="step-actions"><button type="button" className="step-back" onClick={onBack}>上一步</button><button type="button" className="primary" onClick={onNext}>{nextLabel}</button></div>;
}

export function App() {
  const [screen, setScreen] = useState(() => resolveResultScreen(new URLSearchParams(window.location.search).get('preview')));
  const [applications, setApplications] = useState(loadApplications);
  const [questionnairePhone, setQuestionnairePhone] = useState(() => loadStoredPhone(DEMO_QUESTIONNAIRE_SESSION_KEY));
  const [questionnaireResult, setQuestionnaireResult] = useState(null);
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryCodeSent, setRecoveryCodeSent] = useState(false);
  const [gamePhone, setGamePhone] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [gameCodeSent, setGameCodeSent] = useState(false);
  const [gameSessionPhone, setGameSessionPhone] = useState(() => loadStoredPhone(DEMO_GAME_SESSION_KEY));
  const [inviteCode, setInviteCode] = useState('');
  const [identity, setIdentity] = useState('');
  const [firstPhasePhone, setFirstPhasePhone] = useState('');
  const [firstPhaseHighlight, setFirstPhaseHighlight] = useState('');
  const [firstPhaseImprovement, setFirstPhaseImprovement] = useState('');
  const [newUserTypes, setNewUserTypes] = useState([]);
  const [productSelections, setProductSelections] = useState({});
  const [productOtherNames, setProductOtherNames] = useState({});
  const [typeFeedback, setTypeFeedback] = useState({});
  const [discoveryChannels, setDiscoveryChannels] = useState([]);
  const [referrer, setReferrer] = useState('');
  const [motivations, setMotivations] = useState([]);
  const [expectations, setExpectations] = useState([]);
  const [otherExpectation, setOtherExpectation] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [errors, setErrors] = useState([]);
  const [toast, setToast] = useState('');
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const referralToken = useMemo(() => getReferralToken(window.location.search), []);
  const recruitmentApi = useMemo(() => REMOTE_RECRUITMENT_API_BASE_URL ? createRecruitmentApi(REMOTE_RECRUITMENT_API_BASE_URL) : null, []);

  const isOldUser = identity === '是';
  const sharedQuestionNumber = isOldUser ? 'Q5' : 'Q6';
  const feedbackGroups = getQuestionnaireFeedbackGroups(newUserTypes);
  const storedApplication = applications[questionnairePhone];
  const fallbackResult = normaliseRecruitmentResult({
    phoneTail: questionnairePhone?.slice(-4),
    status: storedApplication?.status || 'success',
    referralLink: buildReferralLink(window.location.origin, getDemoReferralToken(questionnairePhone)),
    referralRecords: DEMO_INVITEE_RECORDS,
    successfulInvites: DEMO_INVITEE_RECORDS.length,
    earnedHours: DEMO_INVITEE_RECORDS.length,
  });
  const resultData = questionnaireResult || fallbackResult;
  const invites = resultData.successfulInvites;
  const hours = resultData.earnedHours;
  const inviteSlots = getReferralSlots(resultData.referralRecords);
  const inviteUrl = resultData.referralLink || fallbackResult.referralLink;
  const experienceCode = 'HX-2026';
  const questionnaireTail = questionnairePhone?.slice(-4) || '1234';
  const gameTail = gameSessionPhone?.slice(-4) || '——';
  const step = useMemo(() => ({ identity: 1, profile: 2, expectation: 3, phone: 4 }[screen] ?? 0), [screen]);
  const profileData = { identity, firstPhasePhone, firstPhaseHighlight, firstPhaseImprovement, newUserTypes, productSelections, productOtherNames, typeFeedback, discoveryChannels, motivations };
  const questionnaireAnswers = () => ({ identity, firstPhasePhone, firstPhaseHighlight, firstPhaseImprovement, newUserTypes, productSelections, productOtherNames, typeFeedback, discoveryChannels, referrer, motivations, expectations, otherExpectation, consent });

  const showToast = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2200); };
  const toggle = (value, values, setter) => setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  const normalizePhone = (value) => value.replace(/\D/g, '').slice(0, 11);
  const toggleProduct = (type, value) => setProductSelections((current) => {
    const selected = current[type] || [];
    return { ...current, [type]: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value] };
  });
  const toggleFeedback = (type, direction, value) => setTypeFeedback((current) => {
    const answer = current[type] || {};
    const selected = answer[direction] || [];
    return { ...current, [type]: { ...answer, [direction]: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value] } };
  });
  const setFeedbackOther = (type, direction, value) => setTypeFeedback((current) => ({ ...current, [type]: { ...(current[type] || {}), [`${direction}Other`]: value } }));
  const goNext = () => {
    const nextErrors = screen === 'identity' ? (identity ? [] : ['请选择是否参与过第一阶段体验']) : screen === 'profile' ? validateProfileStep(profileData) : validateSharedStep({ expectations, otherExpectation });
    if (nextErrors.length) return setErrors(nextErrors);
    setErrors([]);
    setScreen(screen === 'identity' ? 'profile' : screen === 'profile' ? 'expectation' : 'phone');
  };
  const goBack = () => { setErrors([]); setScreen(getPreviousQuestionnaireScreen(screen)); };
  const sendCode = async () => {
    if (!/^1\d{10}$/.test(phone)) return setErrors(['请输入正确的 11 位手机号码后再获取验证码']);
    setErrors([]);
    if (!recruitmentApi) {
      setCodeSent(true); showToast('验证码已发送（演示版可输入任意 4 位数字）');
      return;
    }
    try {
      await recruitmentApi.sendSmsCode(phone);
      setCodeSent(true); showToast('验证码已发送');
    } catch (error) {
      setErrors([error.message]);
    }
  };
  const submit = async () => {
    const nextErrors = validateFinalStep({ phone, code, consent, identity, firstPhasePhone });
    if (nextErrors.length) return setErrors(nextErrors);
    const submission = buildApplicationRequest({ mobileNum: phone, smsCode: code, answers: questionnaireAnswers(), referralToken });
    if (recruitmentApi) {
      try {
        const result = normaliseRecruitmentResult(await recruitmentApi.submitApplication(submission));
        window.localStorage.setItem(DEMO_QUESTIONNAIRE_SESSION_KEY, phone);
        setQuestionnairePhone(phone); setQuestionnaireResult({ ...result, phoneTail: result.phoneTail || phone.slice(-4) });
        setErrors([]); if (result.alreadySubmitted) showToast('此前已提交，已为你打开结果'); setScreen(result.status);
      } catch (error) {
        setErrors([error.message]);
      }
      return;
    }
    const nextApplications = { ...applications, [phone]: { phone, submitted: true, status: 'success', answers: submission.answers, referralToken: submission.referralToken, referralLink: buildReferralLink(window.location.origin, getDemoReferralToken(phone)) } };
    window.localStorage.setItem(DEMO_APPLICATIONS_STORAGE_KEY, JSON.stringify(nextApplications));
    window.localStorage.setItem(DEMO_QUESTIONNAIRE_SESSION_KEY, phone);
    setApplications(nextApplications); setQuestionnairePhone(phone); setQuestionnaireResult(null);
    setErrors([]); setScreen('success');
  };
  const sendRecoveryCode = async () => {
    if (!/^1\d{10}$/.test(recoveryPhone)) return setErrors(['请输入正确的 11 位手机号码后再获取验证码']);
    setErrors([]);
    if (!recruitmentApi) {
      setRecoveryCodeSent(true); showToast('验证码已发送（演示版可输入任意 4 位数字）');
      return;
    }
    try {
      await recruitmentApi.sendSmsCode(recoveryPhone);
      setRecoveryCodeSent(true); showToast('验证码已发送');
    } catch (error) {
      setErrors([error.message]);
    }
  };
  const recoverQuestionnaire = async () => {
    if (!/^1\d{10}$/.test(recoveryPhone)) return setErrors(['请输入正确的 11 位手机号码']);
    if (!/^\d{4}$/.test(recoveryCode)) return setErrors(['请输入 4 位验证码']);
    if (recruitmentApi) {
      try {
        const result = normaliseRecruitmentResult(await recruitmentApi.recoverResult({ mobileNum: recoveryPhone, smsCode: recoveryCode }));
        window.localStorage.setItem(DEMO_QUESTIONNAIRE_SESSION_KEY, recoveryPhone);
        setQuestionnairePhone(recoveryPhone); setQuestionnaireResult({ ...result, phoneTail: result.phoneTail || recoveryPhone.slice(-4) });
        setErrors([]); setScreen(result.status);
      } catch (error) {
        setErrors([error.message]);
      }
      return;
    }
    const application = applications[recoveryPhone];
    if (!application?.submitted) return setErrors(['未找到该手机号的已提交问卷，请先填写问卷']);
    window.localStorage.setItem(DEMO_QUESTIONNAIRE_SESSION_KEY, recoveryPhone);
    setQuestionnairePhone(recoveryPhone); setErrors([]); setScreen(application.status === 'granted' ? 'granted' : 'success');
  };
  const exitQuestionnaire = () => {
    window.localStorage.removeItem(DEMO_QUESTIONNAIRE_SESSION_KEY);
    setQuestionnairePhone(''); setQuestionnaireResult(null); setGroupMenuOpen(false); setErrors([]); setScreen('intro');
  };
  const sendGameCode = () => {
    if (!/^1\d{10}$/.test(gamePhone)) return setErrors(['请输入正确的 11 位手机号码后再获取验证码']);
    setErrors([]); setGameCodeSent(true); showToast('验证码已发送（演示版可输入任意 4 位数字）');
  };
  const loginToGame = () => {
    if (!/^1\d{10}$/.test(gamePhone)) return setErrors(['请输入正确的 11 位手机号码']);
    if (!/^\d{4}$/.test(gameCode)) return setErrors(['请输入 4 位验证码']);
    const accounts = loadStoredJson(DEMO_GAME_ACCOUNTS_STORAGE_KEY, []);
    const nextAccounts = Array.isArray(accounts) && accounts.includes(gamePhone) ? accounts : [...(Array.isArray(accounts) ? accounts : []), gamePhone];
    window.localStorage.setItem(DEMO_GAME_ACCOUNTS_STORAGE_KEY, JSON.stringify(nextAccounts));
    window.localStorage.setItem(DEMO_GAME_SESSION_KEY, gamePhone);
    setGameSessionPhone(gamePhone); setErrors([]); setScreen('game-activate');
  };
  const openQuestionnaireFromGame = () => {
    setErrors([]); setScreen('intro');
  };
  const exitGame = () => {
    window.localStorage.removeItem(DEMO_GAME_SESSION_KEY);
    setGameSessionPhone(''); setGamePhone(''); setGameCode(''); setGameCodeSent(false); setErrors([]); setScreen('game-login');
  };
  const activateInviteCode = () => {
    if (!gameSessionPhone) return setErrors(['请先登录游戏账号']);
    if (!inviteCode.trim()) return setErrors(['请输入邀请码']);
    if (inviteCode.trim().toUpperCase() !== experienceCode) return setErrors(['邀请码无效，请核对后再试']);
    setErrors([]); showToast('邀请码已激活，即将进入体验（演示）');
  };
  const copyText = async (text, successMessage) => { try { await navigator.clipboard.writeText(text); showToast(successMessage); } catch { showToast(`请长按复制：${text}`); } };
  const copyInvite = () => copyText(`邀请你来「回响」，解锁与“他”的专属剧情体验。${inviteUrl}`, '链接和文案已复制');
  const copyExperienceCode = () => copyText(experienceCode, '邀请码已复制');
  const copyGroup = (type) => copyText(type === 'QQ' ? '回响官方 QQ 群：123456789' : '回响小助手微信：hui-xiang-demo', `${type} 信息已复制`);

  if (screen === 'questionnaire-recovery') {
    return <main className="app-shell"><section className="page questionnaire"><header className="brand"><span>PROJECT</span><b>第二阶段体验招募</b></header><div className="content recovery-content"><p className="eyebrow">已提交用户</p><h2>验证手机号<br />查看结果</h2><p className="muted">问卷记录保存在服务端。即使清除浏览器缓存，也可通过提交时的手机号找回。</p><Field label="手机号"><input value={recoveryPhone} onChange={(event) => setRecoveryPhone(normalizePhone(event.target.value))} placeholder="请输入提交问卷时的手机号" inputMode="numeric" /></Field><Field label="短信验证码"><div className="code-row"><input value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="请输入 4 位验证码" inputMode="numeric" /><button type="button" className="code-button" onClick={sendRecoveryCode}>{recoveryCodeSent ? '重新发送' : '获取验证码'}</button></div></Field><ErrorList errors={errors} /><div className="step-actions"><button type="button" className="step-back" onClick={() => { setErrors([]); setScreen('intro'); }}>返回</button><button type="button" className="primary" onClick={recoverQuestionnaire}>查看结果</button></div></div></section>{toast && <div className="toast">{toast}</div>}</main>;
  }

  if (screen === 'game-login' || screen === 'game-activate') {
    const isActivate = screen === 'game-activate';
    return <main className="app-shell game-shell"><section className="page game-page">
      <header className="game-brand"><span>回响</span><small>超前体验</small></header>
      {isActivate && gameSessionPhone ? <div className="game-stage"><div className="game-status"><span>尾号 {gameTail} 用户</span><i>游戏已登录</i><button type="button" onClick={exitGame}>退出</button></div><section className="activation-dialog"><p className="eyebrow">体验资格验证</p><h1>输入邀请码<br />进入体验</h1><p>邀请码绑定后，将为当前游戏账号开启超前体验资格。</p><input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} placeholder="请输入邀请码" autoCapitalize="characters" /><button type="button" className="primary" onClick={activateInviteCode}>激活并进入体验</button><button type="button" className="get-invite-link" onClick={openQuestionnaireFromGame}>没有邀请码？<b>获取邀请码</b></button></section></div> : isActivate ? <div className="game-stage"><section className="game-login-card game-login-required"><p className="eyebrow">体验资格验证</p><h1>请先登录<br />游戏账号</h1><p>邀请码会激活到当前登录的游戏账号。</p><button type="button" className="primary" onClick={() => setScreen('game-login')}>去登录</button></section></div> : <div className="game-stage"><section className="game-login-card"><p className="eyebrow">欢迎来到回响</p><h1>登录／注册账号<br />继续体验</h1><p>首次使用该手机号会自动创建游戏账号；无需先填写问卷。</p><Field label="手机号"><input value={gamePhone} onChange={(event) => setGamePhone(normalizePhone(event.target.value))} placeholder="请输入 11 位手机号" inputMode="numeric" /></Field><Field label="短信验证码"><div className="code-row"><input value={gameCode} onChange={(event) => setGameCode(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="请输入 4 位验证码" inputMode="numeric" /><button type="button" className="code-button" onClick={sendGameCode}>{gameCodeSent ? '重新发送' : '获取验证码'}</button></div></Field><ErrorList errors={errors} /><button type="button" className="primary game-login-button" onClick={loginToGame}>登录／注册</button></section></div>}
      {isActivate && <ErrorList errors={errors} />}
    </section>{toast && <div className="toast">{toast}</div>}</main>;
  }

  const renderNewUserQuestions = () => <>
    <h2>游戏经历与招募来源</h2>
    <Field label="Q2．你玩过或正在玩的恋爱向游戏／产品类型有哪些？" required hint="多选；选择类型后可补充具体产品">
      <div>{NEW_USER_TYPES.map((item) => <Choice key={item} multi active={newUserTypes.includes(item)} onClick={() => toggle(item, newUserTypes, setNewUserTypes)}>{item}</Choice>)}</div>
      {newUserTypes.map((type) => <div className="conditional-panel" key={type}>
        <b>{type}</b>
        {PRODUCT_OPTIONS_BY_TYPE[type].length > 0 && <div className="compact-choices">{PRODUCT_OPTIONS_BY_TYPE[type].map((product) => <Choice key={product} multi active={(productSelections[type] || []).includes(product)} onClick={() => toggleProduct(type, product)}>{product}</Choice>)}</div>}
        {type !== '几乎没有相关体验' && <input value={productOtherNames[type] || ''} onChange={(event) => setProductOtherNames((current) => ({ ...current, [type]: event.target.value }))} placeholder={type === '其他恋爱向游戏／产品' ? '请填写产品名称（选填）' : '其他产品名称（选填）'} />}
      </div>)}
    </Field>
    {feedbackGroups.length > 0 && <Field label="Q3．对于你在 Q2 选择的产品类型，哪些优点和不足最符合你的体验？" required hint="每个已选类型的两组内容都至少选择一项">
      {feedbackGroups.map((group) => {
        const answer = typeFeedback[group.type] || {};
        return <section className="feedback-panel" key={group.type}><b>{group.type}</b>
          <small>{group.positiveTitle}</small><div className="compact-choices">{group.positiveOptions.map((option) => <Choice key={option} multi active={(answer.positive || []).includes(option)} onClick={() => toggleFeedback(group.type, 'positive', option)}>{option}</Choice>)}</div>
          {(answer.positive || []).includes(OTHER_FEEDBACK_OPTION) && <input value={answer.positiveOther || ''} onChange={(event) => setFeedbackOther(group.type, 'positive', event.target.value)} placeholder="请补充喜欢的其他内容" />}
          <small>{group.negativeTitle}</small><div className="compact-choices">{group.negativeOptions.map((option) => <Choice key={option} multi active={(answer.negative || []).includes(option)} onClick={() => toggleFeedback(group.type, 'negative', option)}>{option}</Choice>)}</div>
          {(answer.negative || []).includes(OTHER_FEEDBACK_OPTION) && <input value={answer.negativeOther || ''} onChange={(event) => setFeedbackOther(group.type, 'negative', event.target.value)} placeholder="请补充不喜欢／担心的其他内容" />}
        </section>;
      })}
    </Field>}
    <Field label="Q4．你是通过什么渠道了解到《代号：回响》的？" required hint="多选">{DISCOVERY_CHANNELS.map((item) => <Choice key={item} multi active={discoveryChannels.includes(item)} onClick={() => toggle(item, discoveryChannels, setDiscoveryChannels)}>{item}</Choice>)}<input value={referrer} onChange={(event) => setReferrer(event.target.value)} placeholder="若来自朋友或群，可填写邀请人称呼或群名称（选填）" /></Field>
    <Field label="Q5．你想体验《代号：回响》的原因是？" required hint="多选">{MOTIVATIONS.map((item) => <Choice key={item} multi active={motivations.includes(item)} onClick={() => toggle(item, motivations, setMotivations)}>{item}</Choice>)}</Field>
  </>;

  if (screen === 'success' || screen === 'share' || screen === 'granted') {
    const isGranted = screen === 'granted';
    return <main className="app-shell share-shell"><section className={`page share-page ${isGranted ? 'granted-page' : 'submitted-page'}`}>
      <div className="user-identity"><span>尾号 {resultData.phoneTail || questionnaireTail} 用户</span><i>问卷已验证</i><button type="button" onClick={exitQuestionnaire}>退出</button></div>
      <div className={`success-title ${isGranted ? 'granted-title' : ''}`}><div className="success-badge">{isGranted ? '✦' : '✓'}</div><div><h1>{isGranted ? '名额已发放' : '提交成功'}</h1><p>{isGranted ? '请输入邀请码进入体验。' : '结果将通过短信或结果页通知。'}</p></div></div>
      <section className="referral-card"><div className="benefit-column"><div className="benefit-copy"><strong>邀请同好完成问卷，<br />预存体验时长</strong></div><div className="achievement"><span>已成功邀请 <b>{invites}</b> 人</span><span>获得 <b>{hours}</b> 小时</span></div></div><div className="invite-list"><div className="invite-list-head"><b>邀请记录</b></div><div className="invite-scroll">{inviteSlots.map((slot, index) => slot.status === 'success' ? <div className="invite-row success" key={slot.name}><i>✓</i><div><b>{slot.name}</b></div><strong>提交成功</strong></div> : <div className="invite-row waiting" key={`waiting-${index}`}><i>＋</i><div><b>待邀请</b></div></div>)}</div></div></section>
      {isGranted ? <button type="button" className="access-code-poster" onClick={copyExperienceCode} aria-label={`复制邀请码 ${experienceCode}`}><span>回响 · 超前体验</span><hr /><b>你的体验名额<br />已经发放</b><p>输入邀请码，进入专属剧情体验</p><div className="access-code"><small>邀请码</small><strong>{experienceCode}</strong><em>点按复制</em></div></button> : <section className="share-poster-wrap"><img src="/share-poster.svg" alt="回响第二阶段招募分享图，邀请好友注册预存聊天时长" /></section>}
      <div className="bottom-actions">{isGranted ? <button type="button" className="primary" onClick={() => { setErrors([]); setScreen('game-login'); }}>进入体验</button> : <button type="button" className="primary" onClick={copyInvite}>复制邀请链接</button>}</div>
      <div className="group-float"><button type="button" className="group-trigger" onClick={() => setGroupMenuOpen((open) => !open)}>加群</button>{groupMenuOpen && <div className="group-menu"><button type="button" onClick={() => copyGroup('QQ')}>复制 QQ 群号</button><button type="button" onClick={() => copyGroup('微信')}>复制微信小助手</button></div>}</div>
    </section>{toast && <div className="toast">{toast}</div>}</main>;
  }

  return <main className="app-shell"><section className="page questionnaire"><header className="brand"><span>PROJECT</span><b>第二阶段体验招募</b></header>{screen !== 'intro' && <div className="progress"><i style={{ width: `${step * 25}%` }} /></div>}
    {screen === 'intro' && <div className="intro"><p className="eyebrow">限量招募 · 第二阶段</p><h1>这一次，故事<br />由你们一起写下。</h1><p>第二阶段将加入更多 AI 辅助生成的专属剧情、图片和视频互动内容；本轮将采用邀请限量招募机制。</p><div className="intro-points"><span>问卷约 3—5 分钟</span><span>手机号仅用于账号与结果通知</span><span>完成提交可邀请同好完成问卷，预存免费体验时长</span><span>同一手机号仅可提交一次，重复提交不重复计入邀请奖励</span></div><button type="button" className="primary" onClick={() => setScreen('identity')}>开始填写</button><button type="button" className="text-button submitted-entry" onClick={() => questionnairePhone && questionnaireResult ? setScreen(questionnaireResult.status) : !recruitmentApi && questionnairePhone && applications[questionnairePhone]?.submitted ? setScreen(applications[questionnairePhone].status === 'granted' ? 'granted' : 'success') : setScreen('questionnaire-recovery')}>已提交，验证手机号查看结果</button></div>}
    {screen === 'identity' && <div className="content"><h2>你是否参与过第一阶段超前体验？</h2><p className="muted">必填 · 选择后将展示对应的问题。</p>{['是', '否', '不确定／记不清'].map((item) => <Choice key={item} active={identity === item} onClick={() => setIdentity(item)}>{item}</Choice>)}<ErrorList errors={errors} /><StepActions onBack={goBack} onNext={goNext} nextLabel="下一步" /></div>}
    {screen === 'profile' && <div className="content">{isOldUser ? <><h2>第一阶段体验回顾</h2><Field label="Q2．第一阶段注册账号的手机号" required><input value={firstPhasePhone} onChange={(event) => setFirstPhasePhone(normalizePhone(event.target.value))} placeholder="用于匹配第一阶段体验记录" inputMode="numeric" /></Field><Field label="Q3．第一阶段中，最让你印象深刻的角色内容、剧情或互动是什么？为什么？" required><textarea value={firstPhaseHighlight} onChange={(event) => setFirstPhaseHighlight(event.target.value)} placeholder="请根据第一印象填写真实感受～" /></Field><Field label="Q4．第一阶段中，你认为最需要改进的部分是什么？" required hint="如有具体场景或建议，请一并说明"><textarea value={firstPhaseImprovement} onChange={(event) => setFirstPhaseImprovement(event.target.value)} placeholder="可以狠狠吐槽，小皮鞭抽起来～" /></Field></> : renderNewUserQuestions()}<ErrorList errors={errors} /><StepActions onBack={goBack} onNext={goNext} nextLabel="下一步" /></div>}
    {screen === 'expectation' && <div className="content"><h2>你对第二阶段的期待</h2><Field label={`${sharedQuestionNumber}．第二阶段中，你最期待在「回响」中体验到哪些内容？`} required hint="多选">{EXPECTATIONS.map((item) => <Choice key={item} multi active={expectations.includes(item)} onClick={() => toggle(item, expectations, setExpectations)}>{item}</Choice>)}{expectations.includes(OTHER_EXPECTATION) && <input value={otherExpectation} onChange={(event) => setOtherExpectation(event.target.value)} placeholder="请填写其他期待内容（选填）" />}</Field><ErrorList errors={errors} /><StepActions onBack={goBack} onNext={goNext} nextLabel="下一步" /></div>}
    {screen === 'phone' && <div className="content"><h2>验证资源绑定手机号</h2><p className="muted">此处手机号将用于招募筛选、结果通知与资源绑定。若与当前游戏账号不同，资源将归属至该手机号对应的账号。</p><Field label="手机号" required><input value={phone} onChange={(event) => setPhone(normalizePhone(event.target.value))} placeholder="请输入 11 位手机号" inputMode="numeric" /></Field><Field label="短信验证码" required><div className="code-row"><input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="请输入 4 位验证码" inputMode="numeric" /><button type="button" className="code-button" onClick={sendCode}>{codeSent ? '重新发送' : '获取验证码'}</button></div></Field><label className="consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />我已知悉上述信息用于招募筛选、结果通知与资源绑定使用。<em className="required">必填</em></label><ErrorList errors={errors} /><StepActions onBack={goBack} onNext={submit} nextLabel="提交问卷" /></div>}
  </section>{toast && <div className="toast">{toast}</div>}</main>;
}
