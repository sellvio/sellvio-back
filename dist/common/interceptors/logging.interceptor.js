"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var LoggingInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let LoggingInterceptor = LoggingInterceptor_1 = class LoggingInterceptor {
    logger = new common_1.Logger(LoggingInterceptor_1.name);
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const { method, url, headers, body } = request;
        const userAgent = headers['user-agent'] || 'Unknown';
        const userId = request.user?.id || 'Anonymous';
        const startTime = Date.now();
        this.logger.log(`Incoming Request: ${method} ${url} - User: ${userId} - UserAgent: ${userAgent}`);
        if (process.env.NODE_ENV === 'development' &&
            body &&
            Object.keys(body).length > 0) {
            this.logger.debug(`Request Body: ${JSON.stringify(body, null, 2)}`);
        }
        return next.handle().pipe((0, operators_1.tap)(() => {
            const duration = Date.now() - startTime;
            this.logger.log(`Completed Request: ${method} ${url} - Duration: ${duration}ms`);
        }));
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = LoggingInterceptor_1 = __decorate([
    (0, common_1.Injectable)()
], LoggingInterceptor);
//# sourceMappingURL=logging.interceptor.js.map