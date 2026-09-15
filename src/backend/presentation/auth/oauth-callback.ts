import { getOidcEndpoints } from "../../auth/discovery"

interface IdTokenPayload {
	sub?: string
	email?: string
	email_verified?: boolean
}

interface TokenResponse {
	access_token: string
	id_token?: string
	refresh_token?: string
	expires_in?: number
	token_type?: string
}

export function decodeIdToken(idToken: string): IdTokenPayload {
	const parts = idToken.split(".")
	if (parts.length < 2) {
		throw new Error("invalid id_token: expected JWT with 3 parts")
	}
	const payloadB64 = parts[1]!
	const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/")
	const decoded = Buffer.from(padded, "base64").toString("utf-8")
	return JSON.parse(decoded) as IdTokenPayload
}

export async function exchangeCode(
	code: string,
	redirectUri: string
): Promise<TokenResponse> {
	const clientId = process.env.GOOGLE_WEB_CLIENT_ID
	const clientSecret = process.env.GOOGLE_WEB_CLIENT_SECRET

	if (!clientId) {
		throw new Error("GOOGLE_WEB_CLIENT_ID must be set")
	}

	const endpoints = await getOidcEndpoints()
	const tokenUrl = endpoints.token_endpoint

	const body = new URLSearchParams({
		grant_type: "authorization_code",
		code,
		redirect_uri: redirectUri,
		client_id: clientId
	})

	if (clientSecret) {
		body.set("client_secret", clientSecret)
	}

	const response = await fetch(tokenUrl, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body
	})

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`token exchange failed: ${response.status} ${text}`)
	}

	return (await response.json()) as TokenResponse
}