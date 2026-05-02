import { ErrorResponse } from "@/models/ErrorResponse";

export interface DeleteObjectResponse extends ErrorResponse {
    success: boolean;
}
