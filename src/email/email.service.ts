import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailOptions {
  to: string;
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor() {
    this.createTransporter();
  }

  private createTransporter() {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        // Additional Gmail-specific settings
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 14, // 14 emails per second max for Gmail
      });

      this.logger.log('Email service initialized with Gmail SMTP');
      this.logger.log(`Gmail account: ${process.env.EMAIL_USER}`);

      // Verify Gmail connection
      this.verifyConnection();
    } else {
      // Fallback to Ethereal for development
      this.logger.warn(
        'Gmail credentials not found, using Ethereal test account',
      );
    }
  }

  private async createEtherealTransporter() {
    try {
      // Create test account for development
      const testAccount = await nodemailer.createTestAccount();

      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      this.logger.log('Email service initialized with Ethereal test account');
      this.logger.log(`Test account: ${testAccount.user}`);
    } catch (error) {
      this.logger.error('Failed to create Ethereal test account', error);

      // Fallback to simple configuration
      this.transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 1025,
        ignoreTLS: true,
      });
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      let html = options.html;
      let text = options.text;

      // If template is specified, compile it with context
      if (options.template && options.context) {
        const templateResult = await this.compileTemplate(
          options.template,
          options.context,
        );
        html = templateResult.html;
        text = templateResult.text;
      }

      const mailOptions = {
        from:
          process.env.EMAIL_FROM ||
          process.env.EMAIL_USER ||
          'Sellvio <noreply@sellvio.com>',
        to: options.to,
        subject: options.subject,
        html,
        text,
      };

      const result = await this.transporter.sendMail(mailOptions);

      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(
          `Email preview URL: ${nodemailer.getTestMessageUrl(result)}`,
        );
      }

      this.logger.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      return false;
    }
  }

  async sendVerificationEmail(
    email: string,
    token: string,
    userName: string,
  ): Promise<boolean> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${token}`;

    return this.sendEmail({
      to: email,
      subject: 'დაადასტურეთ თქვენი Sellvio ანგარიში',
      template: 'email-verification',
      context: {
        userName,
        verificationUrl,
        supportEmail: 'support@sellvio.com',
        companyName: 'Sellvio',
      },
    });
  }

  async sendWelcomeEmail(
    email: string,
    userName: string,
    userType: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: 'მოგესალმებათ Sellvio!',
      template: 'welcome',
      context: {
        userName,
        userType,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/login`,
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard`,
        supportEmail: 'support@sellvio.com',
        companyName: 'Sellvio',
      },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    userName: string,
  ): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}`;

    return this.sendEmail({
      to: email,
      subject: 'აღადგინეთ თქვენი Sellvio-ს პაროლი',
      template: 'password-reset',
      context: {
        userName,
        resetUrl,
        supportEmail: 'support@sellvio.com',
        companyName: 'Sellvio',
      },
    });
  }

  private async compileTemplate(
    templateName: string,
    context: Record<string, any>,
  ): Promise<{ html: string; text: string }> {
    try {
      const templateDir = path.join(process.cwd(), 'src', 'email', 'templates');

      // Read HTML template
      const htmlTemplatePath = path.join(templateDir, `${templateName}.hbs`);
      const htmlTemplateContent = fs.readFileSync(htmlTemplatePath, 'utf-8');
      const htmlTemplate = handlebars.compile(htmlTemplateContent);
      const html = htmlTemplate(context);

      // Read text template (optional)
      let text = '';
      try {
        const textTemplatePath = path.join(templateDir, `${templateName}.txt`);
        const textTemplateContent = fs.readFileSync(textTemplatePath, 'utf-8');
        const textTemplate = handlebars.compile(textTemplateContent);
        text = textTemplate(context);
      } catch (error) {
        // Text template is optional, generate from HTML
        text = this.htmlToText(html);
      }

      return { html, text };
    } catch (error) {
      this.logger.error(`Failed to compile template: ${templateName}`, error);
      throw error;
    }
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email service connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Email service connection failed', error);
      return false;
    }
  }
}
