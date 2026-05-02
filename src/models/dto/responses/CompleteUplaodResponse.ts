import { ErrorResponse } from "@/models/ErrorResponse";

export interface CompleteUploadResponse extends ErrorResponse {
    success: boolean;
}
