# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Current prototype direction

- Use a simple, vertical mobile H5 without character art or decorative illustrations.
- Prioritize the complete recruitment journey: questionnaire branch, phone verification, official group guidance, and referral status.
- Keep the referral success page within a conventional mobile viewport: use a 1/3 benefit-and-reward column beside a 2/3 invitation-status list, then place the share image inline above the copy-link action.
- On the referral success page, keep the benefit column's internal divider near 40% from its top. The list always represents 10 invitation slots: successful registrations use the checked state, and unfilled slots use the pending state.
- Let the 3:4 share poster use most of the available phone width while preserving the screen order: success confirmation, referral card, poster, copy-link action, then group entry.
- Result pages share a lightweight logged-in identity label at the top and a group-entry button fixed midway along the right edge. Keep two states: questionnaire submitted (recruitment poster plus copy-link action) and place granted (the same referral card plus a copyable access-code poster, without the copy-link action).
- Keep the questionnaire current with the approved four-step flow: old users answer their first-phase phone and two written feedback prompts; new users select product types, expand concrete product examples, and answer matching positive/negative choice groups; the shared expectation step contains the current selectable expectations only, with an optional other-text field.
- Keep the P2 title as “游戏经历与招募来源”. The “其他恋爱向游戏／产品” type accepts an optional product name but has no dynamic likes/dislikes question; choosing any “其他” option must never make its companion text input required. P1 includes a small submitted-user entry that opens the submitted result state.
- All questionnaire steps after the first screen provide paired bottom actions: an outlined “上一步” button beside the primary next/submit button; both preserve entered values. Do not show these actions on either result-page state, and do not show a “第 X 步 / 4” label.
- Homepage guidance says that completing submission enables inviting peers to complete this recruitment questionnaire for free experience time. The referral-card callout says “邀请同好完成问卷，预存体验时长”, and successful rows say “提交成功”. On desktop, result-page frames use the same outer width and visible height as the questionnaire; result content scrolls inside the frame.
- Keep the Unity WebGL integration separate for now. The prototype simulates independent game and questionnaire sessions: the game permits any phone to log in/register and only activates an invite code for its own session; the questionnaire final phone verification binds recruitment resources to that phone, and submitted records are recovered through a questionnaire-only SMS verification entry. Neither page controls the other's login or logout state. The granted result state leads to the simulated game login.
- For formal questionnaire release, a shared link uses an opaque `ref` token and the questionnaire sends it only with submission. The application must receive `VITE_RECRUITMENT_API_BASE_URL` for real SMS, submission and recovery; without it, the browser-storage flow is demo-only and must not be used for public collection.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
