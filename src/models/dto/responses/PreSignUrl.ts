import { ErrorResponse } from "@/models/ErrorResponse";

export interface PreSignUrlResponse extends ErrorResponse {
    url: string;
}
