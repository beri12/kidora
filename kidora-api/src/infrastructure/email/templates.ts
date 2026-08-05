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
