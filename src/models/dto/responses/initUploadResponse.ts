import { ErrorResponse } from "@/models/ErrorResponse";

export interface InitUploadResponse extends ErrorResponse {
    uploadId: string;
    parts: string[];
}
