import { ErrorResponse } from "@/models/ErrorResponse";

export interface GetHeadObjectResponse extends ErrorResponse {
    MimeType: string;
    ContentLength: number | undefined;
}
