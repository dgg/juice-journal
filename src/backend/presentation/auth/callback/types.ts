import type { IdTokenPayload, TokenResponse } from "../oauth-callback"

export interface CallbackVars {
	tokens: TokenResponse
	idPayload: IdTokenPayload
}
