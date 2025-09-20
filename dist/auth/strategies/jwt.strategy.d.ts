import { Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common/interfaces/request-user.interface';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(prisma: PrismaService);
    validate(payload: any): Promise<RequestUser>;
}
export {};
