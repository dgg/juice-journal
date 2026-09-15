import { createHmac, timingSafeEqual } from "crypto"

const COOKIE_NAME = "jj_session"
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60 // 7 days

interface CookiePayload {
	provider: string
	sub?: string
	email: string
	exp: number
}

function base64urlEncode(data: string): string {
	return Buffer.from(data, "utf-8")
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "")
}

function base64urlDecode(data: string): string {
	const padded = data.replace(/-/g, "+").replace(/_/g, "/")
	return Buffer.from(padded, "base64").toString("utf-8")
}

function getSecret(): string {
	const secret = process.env.JJ_SECRET
	if (!secret) {
		throw new Error("JJ_SECRET environment variable is not set")
	}
	return secret
}

export function signCookie(payload: Omit<CookiePayload, "exp">, secret?: string): string {
	const key = secret ?? getSecret()
	const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS
	const fullPayload: CookiePayload = { ...payload, exp }
	const encoded = base64urlEncode(JSON.stringify(fullPayload))
	const sig = createHmac("sha256", key).update(encoded).digest("base64url")
	return `${encoded}.${sig}`
}

export function verifyCookie(cookie: string, secret?: string): CookiePayload | null {
	const key = secret ?? getSecret()
	const dotIndex = cookie.lastIndexOf(".")
	if (dotIndex === -1) return null

	const encoded = cookie.slice(0, dotIndex)
	const sig = cookie.slice(dotIndex + 1)

	const expectedSig = createHmac("sha256", key).update(encoded).digest("base64url")

	const sigBuf = Buffer.from(sig)
	const expectedBuf = Buffer.from(expectedSig)
	if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
		return null
	}

	try {
		const payload: CookiePayload = JSON.parse(base64urlDecode(encoded))
		if (payload.exp <= Math.floor(Date.now() / 1000)) {
			return null
		}
		return payload
	} catch {
		return null
	}
}

export { COOKIE_NAME, MAX_AGE_SECONDS }