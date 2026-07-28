import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  BrandEmailContext,
  passwordResetEmailTemplate,
  verificationEmailTemplate,
  welcomeEmailTemplate,
} from './email.templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly brand: BrandEmailContext;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('mail.apiKey') || '';
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from =
      this.configService.get<string>('mail.from') ||
      'NovaCart <noreply@novacart.app>';
    this.brand = {
      appName: this.configService.get<string>('appName') || 'NovaCart',
      frontendUrl:
        this.configService.get<string>('frontendUrl') ||
        'http://localhost:5173',
      supportEmail:
        this.configService.get<string>('mail.supportEmail') ||
        'support@novacart.app',
    };

    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY is not set; emails will be logged only');
    }
  }

  async sendVerificationEmail(input: {
    to: string;
    firstName: string;
    token: string;
  }) {
    const verifyUrl = `${this.brand.frontendUrl.replace(/\/$/, '')}/verify-email/confirm?token=${encodeURIComponent(input.token)}`;
    const template = verificationEmailTemplate(
      this.brand,
      input.firstName,
      verifyUrl,
    );
    return this.send(input.to, template.subject, template.html, template.text);
  }

  async sendPasswordResetEmail(input: {
    to: string;
    firstName: string;
    token: string;
  }) {
    const resetUrl = `${this.brand.frontendUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(input.token)}`;
    const template = passwordResetEmailTemplate(
      this.brand,
      input.firstName,
      resetUrl,
    );
    return this.send(input.to, template.subject, template.html, template.text);
  }

  async sendWelcomeEmail(input: { to: string; firstName: string }) {
    const template = welcomeEmailTemplate(this.brand, input.firstName);
    return this.send(input.to, template.subject, template.html, template.text);
  }

  private async send(to: string, subject: string, html: string, text: string) {
    if (!this.resend) {
      this.logger.log(`[email:dry-run] to=${to} subject=${subject}`);
      return { id: 'dry-run', dryRun: true };
    }

    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
        text,
      });

      if (result.error) {
        this.logger.error(`Resend error for ${to}: ${result.error.message}`);
        throw new Error(result.error.message);
      }

      this.logger.log(`Email sent to ${to} (${result.data?.id || 'ok'})`);
      return result.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${to}: ${message}`);
      throw error;
    }
  }
}
