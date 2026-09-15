import { createSign } from "crypto"
import { getOidcEndpoints } from "./discovery"

interface ServiceAccountKey {
	client_email: string
	private_key: string
	token_uri?: string
}

function getKeyPath(): string {
	const path = process.env.GOOG_SA_KEY_PATH
	if (!path) {
		throw new Error("GOOG_SA_KEY_PATH environment variable is not set")
	}
	return path
}

function signJwt(payload: Record<string, unknown>, privateKeyPem: string): string {
	const header = { alg: "RS256", typ: "JWT" }
	const encodedHeader = Buffer.from(JSON.stringify(header))
		.toString("base64url")
	const encodedPayload = Buffer.from(JSON.stringify(payload))
		.toString("base64url")
	const signingInput = `${encodedHeader}.${encodedPayload}`

	const sign = createSign("RSA-SHA256")
	sign.update(signingInput)
	const signature = sign.sign(privateKeyPem, "base64url")

	return `${signingInput}.${signature}`
}

export async function mintServiceAccountToken(): Promise<string> {
	const keyPath = getKeyPath()
	const keyFile = Bun.file(keyPath)
	const key = (await keyFile.json()) as ServiceAccountKey

	if (!key.client_email || !key.private_key) {
		throw new Error("service account key missing client_email or private_key")
	}

	const tokenEndpoint =
		key.token_uri ?? (await getOidcEndpoints()).token_endpoint

	const now = Math.floor(Date.now() / 1000)
	const jwt = signJwt(
		{
			iss: key.client_email,
			scope: "openid email profile",
			aud: tokenEndpoint,
			iat: now,
			exp: now + 3600
		},
		key.private_key
	)

	const response = await fetch(tokenEndpoint, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion: jwt
		})
	})

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`token endpoint returned ${response.status}: ${text}`)
	}

	const body = (await response.json()) as { access_token: string }
	return body.access_token
}