export declare class PaginationDto {
    page: number;
    limit: number;
}
export declare class PaginationResponseDto<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
