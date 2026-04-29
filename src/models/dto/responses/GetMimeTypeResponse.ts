import { ErrorResponse } from "@/models/ErrorResponse";

export interface GetMimeTypeResponse extends ErrorResponse {
    mimeType: string;
}
