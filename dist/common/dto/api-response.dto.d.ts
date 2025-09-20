export declare class ApiResponseDto<T> {
    success: boolean;
    data: T;
    timestamp: string;
    path: string;
    method: string;
}
export declare class ApiErrorResponseDto {
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
    error: string;
    message: string;
}
