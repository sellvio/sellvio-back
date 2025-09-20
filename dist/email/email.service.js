"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
let EmailService = EmailService_1 = class EmailService {
    logger = new common_1.Logger(EmailService_1.name);
    transporter;
    constructor() {
        this.createTransporter();
    }
    createTransporter() {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
                pool: true,
                maxConnections: 5,
                maxMessages: 100,
                rateLimit: 14,
            });
            this.logger.log('Email service initialized with Gmail SMTP');
            this.logger.log(`Gmail account: ${process.env.EMAIL_USER}`);
            this.verifyConnection();
        }
        else {
            this.logger.warn('Gmail credentials not found, using Ethereal test account');
        }
    }
    async createEtherealTransporter() {
        try {
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
        }
        catch (error) {
            this.logger.error('Failed to create Ethereal test account', error);
            this.transporter = nodemailer.createTransport({
                host: 'localhost',
                port: 1025,
                ignoreTLS: true,
            });
        }
    }
    async sendEmail(options) {
        try {
            let html = options.html;
            let text = options.text;
            if (options.template && options.context) {
                const templateResult = await this.compileTemplate(options.template, options.context);
                html = templateResult.html;
                text = templateResult.text;
            }
            const mailOptions = {
                from: process.env.EMAIL_FROM ||
                    process.env.EMAIL_USER ||
                    'Sellvio <noreply@sellvio.com>',
                to: options.to,
                subject: options.subject,
                html,
                text,
            };
            const result = await this.transporter.sendMail(mailOptions);
            if (process.env.NODE_ENV !== 'production') {
                this.logger.log(`Email preview URL: ${nodemailer.getTestMessageUrl(result)}`);
            }
            this.logger.log(`Email sent successfully to ${options.to}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to send email to ${options.to}`, error);
            return false;
        }
    }
    async sendVerificationEmail(email, token, userName) {
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${token}`;
        return this.sendEmail({
            to: email,
            subject: 'Verify Your Sellvio Account',
            template: 'email-verification',
            context: {
                userName,
                verificationUrl,
                supportEmail: 'support@sellvio.com',
                companyName: 'Sellvio',
            },
        });
    }
    async sendWelcomeEmail(email, userName, userType) {
        return this.sendEmail({
            to: email,
            subject: 'Welcome to Sellvio!',
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
    async sendPasswordResetEmail(email, token, userName) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}`;
        return this.sendEmail({
            to: email,
            subject: 'Reset Your Sellvio Password',
            template: 'password-reset',
            context: {
                userName,
                resetUrl,
                supportEmail: 'support@sellvio.com',
                companyName: 'Sellvio',
            },
        });
    }
    async compileTemplate(templateName, context) {
        try {
            const templateDir = path.join(process.cwd(), 'src', 'email', 'templates');
            const htmlTemplatePath = path.join(templateDir, `${templateName}.hbs`);
            const htmlTemplateContent = fs.readFileSync(htmlTemplatePath, 'utf-8');
            const htmlTemplate = handlebars.compile(htmlTemplateContent);
            const html = htmlTemplate(context);
            let text = '';
            try {
                const textTemplatePath = path.join(templateDir, `${templateName}.txt`);
                const textTemplateContent = fs.readFileSync(textTemplatePath, 'utf-8');
                const textTemplate = handlebars.compile(textTemplateContent);
                text = textTemplate(context);
            }
            catch (error) {
                text = this.htmlToText(html);
            }
            return { html, text };
        }
        catch (error) {
            this.logger.error(`Failed to compile template: ${templateName}`, error);
            throw error;
        }
    }
    htmlToText(html) {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
    }
    async verifyConnection() {
        try {
            await this.transporter.verify();
            this.logger.log('Email service connection verified successfully');
            return true;
        }
        catch (error) {
            this.logger.error('Email service connection failed', error);
            return false;
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
//# sourceMappingURL=email.service.js.map