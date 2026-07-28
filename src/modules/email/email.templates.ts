export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface BrandEmailContext {
  appName: string;
  frontendUrl: string;
  supportEmail: string;
  logoUrl?: string;
}

const COLORS = {
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  ink: '#0F172A',
  muted: '#64748B',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
};

function layout(ctx: BrandEmailContext, title: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  const button = cta
    ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px;">
        <tr>
          <td align="center" bgcolor="${COLORS.primary}" style="border-radius:10px;">
            <a href="${cta.url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
              ${cta.label}
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:12px;line-height:1.5;color:${COLORS.muted};word-break:break-all;">
        Or copy this link:<br />
        <a href="${cta.url}" style="color:${COLORS.primary};">${cta.url}</a>
      </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLORS.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 12px;border-bottom:1px solid ${COLORS.border};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="width:36px;height:36px;border-radius:10px;background:${COLORS.primary};color:#fff;font-family:Manrope,Inter,Arial,sans-serif;font-weight:700;font-size:14px;text-align:center;line-height:36px;">
                    N
                  </td>
                  <td style="padding-left:12px;font-family:Manrope,Inter,Arial,sans-serif;font-size:20px;font-weight:700;color:${COLORS.ink};letter-spacing:-0.02em;">
                    ${ctx.appName}
                  </td>
                </tr>
              </table>
              <p style="margin:6px 0 0;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:13px;color:${COLORS.muted};">
                Commerce, refined.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px;font-family:Inter,Segoe UI,Arial,sans-serif;color:${COLORS.ink};">
              <h1 style="margin:0 0 12px;font-family:Manrope,Inter,Arial,sans-serif;font-size:22px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:${COLORS.ink};">
                ${title}
              </h1>
              ${bodyHtml}
              ${button}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:${COLORS.bg};border-top:1px solid ${COLORS.border};">
              <p style="margin:0;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:12px;line-height:1.6;color:${COLORS.muted};">
                Need help? Contact
                <a href="mailto:${ctx.supportEmail}" style="color:${COLORS.primary};text-decoration:none;">${ctx.supportEmail}</a>
                <br />
                © ${new Date().getFullYear()} Novalith Labs · ${ctx.appName}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function verificationEmailTemplate(
  ctx: BrandEmailContext,
  firstName: string,
  verifyUrl: string,
): EmailTemplate {
  const subject = `Verify your ${ctx.appName} email`;
  const body = `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${COLORS.ink};">
      Hi ${firstName},
    </p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${COLORS.muted};">
      Thanks for joining ${ctx.appName}. Confirm your email to activate your account and start shopping.
    </p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:${COLORS.muted};">
      This link expires in 24 hours. If you did not create an account, you can ignore this email.
    </p>`;

  return {
    subject,
    html: layout(ctx, 'Verify your email', body, {
      label: 'Verify email',
      url: verifyUrl,
    }),
    text: `Hi ${firstName},\n\nVerify your ${ctx.appName} email:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nNeed help? ${ctx.supportEmail}`,
  };
}

export function passwordResetEmailTemplate(
  ctx: BrandEmailContext,
  firstName: string,
  resetUrl: string,
): EmailTemplate {
  const subject = `Reset your ${ctx.appName} password`;
  const body = `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${COLORS.ink};">
      Hi ${firstName},
    </p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${COLORS.muted};">
      We received a request to reset your password. Use the button below to choose a new one.
    </p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:${COLORS.muted};">
      This link expires in 1 hour. If you did not request a reset, you can safely ignore this email.
    </p>`;

  return {
    subject,
    html: layout(ctx, 'Reset your password', body, {
      label: 'Reset password',
      url: resetUrl,
    }),
    text: `Hi ${firstName},\n\nReset your ${ctx.appName} password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nNeed help? ${ctx.supportEmail}`,
  };
}

export function welcomeEmailTemplate(
  ctx: BrandEmailContext,
  firstName: string,
): EmailTemplate {
  const subject = `Welcome to ${ctx.appName}`;
  const shopUrl = `${ctx.frontendUrl.replace(/\/$/, '')}/products`;
  const body = `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${COLORS.ink};">
      Hi ${firstName},
    </p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${COLORS.muted};">
      Your email is verified and your ${ctx.appName} account is ready. Explore the catalog, save favorites, and checkout with confidence.
    </p>`;

  return {
    subject,
    html: layout(ctx, 'You are all set', body, {
      label: 'Start shopping',
      url: shopUrl,
    }),
    text: `Hi ${firstName},\n\nYour ${ctx.appName} account is verified. Start shopping: ${shopUrl}\n\nNeed help? ${ctx.supportEmail}`,
  };
}
