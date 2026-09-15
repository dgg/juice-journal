export interface IdTokenPayload {
	sub?: string
	email?: string
	email_verified?: boolean
}

export interface TokenResponse {
	access_token: string
	id_token?: string
	refresh_token?: string
	expires_in?: number
	token_type?: string
}

export interface CallbackVars {
	tokens: TokenResponse
	idPayload: IdTokenPayload
}
