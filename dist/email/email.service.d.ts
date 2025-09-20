export interface EmailOptions {
    to: string;
    subject: string;
    template?: string;
    context?: Record<string, any>;
    html?: string;
    text?: string;
}
export declare class EmailService {
    private readonly logger;
    private transporter;
    constructor();
    private createTransporter;
    private createEtherealTransporter;
    sendEmail(options: EmailOptions): Promise<boolean>;
    sendVerificationEmail(email: string, token: string, userName: string): Promise<boolean>;
    sendWelcomeEmail(email: string, userName: string, userType: string): Promise<boolean>;
    sendPasswordResetEmail(email: string, token: string, userName: string): Promise<boolean>;
    private compileTemplate;
    private htmlToText;
    verifyConnection(): Promise<boolean>;
}
