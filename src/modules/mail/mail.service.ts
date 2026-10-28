import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEnv } from '../../config/env.config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const env = this.configService.get<IEnv>('env');
    const emailConfig = env?.SMTP_EMAIL_CONFIG;

    if (
      emailConfig?.EMAIL_HOST &&
      emailConfig?.EMAIL_USER &&
      emailConfig?.EMAIL_PASSWORD
    ) {
      try {
        this.transporter = nodemailer.createTransport({
          host: emailConfig.EMAIL_HOST,
          port: Number(emailConfig.EMAIL_PORT) || 587,
          secure: Number(emailConfig.EMAIL_PORT) === 465,
          auth: {
            user: emailConfig.EMAIL_USER,
            pass: emailConfig.EMAIL_PASSWORD,
          },
        });
        this.logger.log('Mail transporter initialized successfully');
      } catch (error) {
        const err = error as Error;
        this.logger.warn(
          `Failed to initialize mail transporter: ${err.message}`,
        );
      }
    } else {
      this.logger.warn(
        'SMTP credentials not fully provided; fallback logger will log emails to console',
      );
    }
  }

  async sendVerificationOtpEmail(
    to: string,
    otp: string,
    name?: string,
  ): Promise<void> {
    const env = this.configService.get<IEnv>('env');
    const appName = env?.APPLICATION.APP_NAME || 'Application';

    const subject = `Verify your account - ${appName}`;
    const displayName = name || 'User';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333; text-align: center;">Welcome to ${appName}!</h2>
        <p>Hello <strong>${displayName}</strong>,</p>
        <p>Thank you for signing up. Please use the following One-Time Password (OTP) to verify your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px 24px; background: #f4f6f8; border-radius: 6px; color: #111;">
            ${otp}
          </span>
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes. If you did not create this account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      </div>
    `;

    await this.sendMail(to, subject, html, `Your OTP is: ${otp}`);
  }

  async sendPasswordResetOtpEmail(
    to: string,
    otp: string,
    name?: string,
  ): Promise<void> {
    const env = this.configService.get<IEnv>('env');
    const appName = env?.APPLICATION.APP_NAME || 'Application';
    const displayName = name || 'User';
    const subject = `Password Reset Request - ${appName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
        <p>Hello <strong>${displayName}</strong>,</p>
        <p>We received a request to reset your password. Use the following OTP to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px 24px; background: #fff1f0; border-radius: 6px; color: #cf1322;">
            ${otp}
          </span>
        </div>
        <p style="color: #666; font-size: 14px;">This code is valid for 10 minutes. If you did not request a password reset, please secure your account immediately.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      </div>
    `;

    await this.sendMail(
      to,
      subject,
      html,
      `Your Password Reset OTP is: ${otp}`,
    );
  }

  async sendOrderConfirmationEmail(
    to: string,
    orderNumber: string,
    totalAmount: number,
    itemCount: number,
    name?: string,
  ): Promise<void> {
    const env = this.configService.get<IEnv>('env');
    const appName = env?.APPLICATION.APP_NAME || 'Tatka Bajar';
    const displayName = name || 'Customer';
    const subject = `Order Confirmed: ${orderNumber} - ${appName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #16a34a; margin: 0;">🛒 ${appName}</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Fresh groceries delivered directly to your doorstep</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #15803d; margin: 0 0 8px 0;">🎉 Order Received Successfully!</h3>
          <p style="margin: 0; color: #166534; font-size: 14px;">Thank you for your order, <strong>${displayName}</strong>! We are currently preparing your items.</p>
        </div>
        <div style="border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1; padding: 16px 0; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Order Number:</td>
              <td style="font-weight: bold; text-align: right; color: #0f172a;">${orderNumber}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Total Items:</td>
              <td style="font-weight: bold; text-align: right; color: #0f172a;">${itemCount} item(s)</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Total Amount:</td>
              <td style="font-weight: bold; font-size: 16px; text-align: right; color: #16a34a;">৳${totalAmount.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">You can track your order status in your Tatka Bajar profile or reach out to our support anytime.</p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      </div>
    `;

    await this.sendMail(
      to,
      subject,
      html,
      `Your order ${orderNumber} for ৳${totalAmount.toFixed(2)} has been confirmed!`,
    );
  }

  async sendOrderStatusUpdateEmail(
    to: string,
    orderNumber: string,
    status: string,
    name?: string,
    notes?: string,
  ): Promise<void> {
    const env = this.configService.get<IEnv>('env');
    const appName = env?.APPLICATION.APP_NAME || 'Tatka Bajar';
    const displayName = name || 'Customer';
    const subject = `Order ${orderNumber} Status: ${status} - ${appName}`;

    const statusColors: Record<string, string> = {
      CONFIRMED: '#2563eb',
      PROCESSING: '#0891b2',
      OUT_FOR_DELIVERY: '#d97706',
      DELIVERED: '#16a34a',
      CANCELLED: '#dc2626',
    };
    const color = statusColors[status] || '#16a34a';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #16a34a; margin: 0;">🛒 ${appName}</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Order Status Update</p>
        </div>
        <div style="background: #f8fafc; border-left: 4px solid ${color}; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
          <p style="margin: 0; color: #334155; font-size: 15px;">Hello <strong>${displayName}</strong>,</p>
          <p style="margin: 8px 0 0 0; color: #0f172a; font-size: 16px;">Your order <strong>${orderNumber}</strong> is now <span style="font-weight: bold; color: ${color};">${status}</span>.</p>
          ${notes ? `<p style="margin: 8px 0 0 0; color: #64748b; font-size: 13px;"><em>${notes}</em></p>` : ''}
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">You can check your live order progress in the Tatka Bajar app.</p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      </div>
    `;

    await this.sendMail(
      to,
      subject,
      html,
      `Your order ${orderNumber} is now ${status}.`,
    );
  }

  async sendRiderAssignedEmail(
    to: string,
    orderNumber: string,
    riderName: string,
    riderPhone: string,
    name?: string,
  ): Promise<void> {
    const env = this.configService.get<IEnv>('env');
    const appName = env?.APPLICATION.APP_NAME || 'Tatka Bajar';
    const displayName = name || 'Customer';
    const subject = `Rider Assigned to Your Order ${orderNumber} - ${appName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #16a34a; margin: 0;">🛒 ${appName}</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Delivery Update</p>
        </div>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1e40af; margin: 0 0 8px 0;">🏍️ Rider Assigned!</h3>
          <p style="margin: 0; color: #1e3a8a; font-size: 14px;">Hello <strong>${displayName}</strong>, delivery rider <strong>${riderName}</strong> (${riderPhone}) has been assigned to your order <strong>${orderNumber}</strong> and will deliver it shortly.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      </div>
    `;

    await this.sendMail(
      to,
      subject,
      html,
      `Rider ${riderName} (${riderPhone}) has been assigned to your order ${orderNumber}.`,
    );
  }

  private async sendMail(
    to: string,
    subject: string,
    html: string,
    textFallback: string,
  ): Promise<void> {
    const env = this.configService.get<IEnv>('env');
    const fromName =
      env?.SMTP_EMAIL_CONFIG.EMAIL_FROM_NAME ||
      env?.APPLICATION.APP_NAME ||
      'Application';
    const fromEmail =
      env?.SMTP_EMAIL_CONFIG.EMAIL_FROM || 'no-reply@example.com';

    // Log the OTP in console for local dev convenience
    this.logger.log(
      `[DEV EMAIL DISPATCH] To: ${to} | Subject: ${subject} | Details: ${textFallback}`,
    );

    if (!this.transporter) {
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        text: textFallback,
        html,
      });
      this.logger.log(`Email successfully dispatched to ${to}`);
    } catch (error) {
      const err = error as Error;
      this.logger.warn(
        `Failed to send email to ${to}: ${err.message}. (Fallback logged in console above)`,
      );
    }
  }
}
