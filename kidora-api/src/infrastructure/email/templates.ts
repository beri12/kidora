const shell = (body: string) => `
  <div style="font-family:system-ui,sans-serif;background:#F6F2FF;padding:32px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:24px;padding:32px;border:2px solid #EDE9FE">
      <div style="font-weight:800;font-size:22px;color:#6D28D9;margin-bottom:16px">Kidora</div>
      ${body}
      <p style="color:#8B7BB0;font-size:13px;margin-top:24px">Learn · Play · Grow</p>
    </div>
  </div>`;

export const welcomeTemplate = (name: string) => shell(`
  <h1 style="color:#3B0764">Welcome, ${name}! 🎉</h1>
  <p style="color:#4C1D95;font-weight:600">Your account is ready. Dive into lessons, games and quizzes — and start earning badges today!</p>`);

export const subscriptionSuccessTemplate = (name: string, plan: string) => shell(`
  <h1 style="color:#3B0764">You're all set, ${name}! ✅</h1>
  <p style="color:#4C1D95;font-weight:600">Your <b>${plan}</b> subscription is now active. Every premium course, game and certificate is unlocked.</p>
  <a href="#" style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#8B5CF6,#6D28D9);color:#fff;font-weight:800;text-decoration:none;padding:14px 26px;border-radius:14px">Start learning →</a>`);

/**
 * Status update on a school / district access request. The copy is passed in
 * rather than built here, so the service decides the wording once for the
 * email, the SMS and the in-app notification alike.
 */
export const orgRequestTemplate = (name: string, title: string, body: string) => shell(`
  <h1 style="color:#3B0764">${title}</h1>
  <p style="color:#4C1D95;font-weight:600">Hi ${name},</p>
  <p style="color:#4C1D95;font-weight:600">${body}</p>`);

/**
 * The email verification code. Big, spaced digits so it can be read at a
 * glance and typed without copying; plain-text fallback is sent alongside.
 */
export const verificationCodeTemplate = (name: string, code: string, minutes: number, purpose: 'verify' | 'reset' = 'verify') => shell(`
  <h1 style="color:#3B0764;margin:0 0 8px">${purpose === 'reset' ? 'Reset your password' : 'Verify your email'}</h1>
  <p style="color:#4C1D95;font-weight:600">Hi ${escapeHtml(name)}, enter this code in Kidora to ${purpose === 'reset' ? 'choose a new password' : 'finish setting up your account'}:</p>
  <div style="margin:24px 0;text-align:center">
    <span style="display:inline-block;background:#F6F2FF;border:2px solid #DDD6FE;border-radius:18px;padding:16px 28px;font-size:34px;font-weight:800;letter-spacing:10px;color:#3B0764;font-family:ui-monospace,Menlo,monospace">${code}</span>
  </div>
  <p style="color:#6B5B95;font-weight:600;font-size:14px">This code expires in ${minutes} minutes. If you didn't ask for it, you can safely ignore this email — nobody can sign in without it.</p>
  <p style="color:#6B5B95;font-weight:600;font-size:14px">Kidora will never ask you for this code by phone, chat or email.</p>`);

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
