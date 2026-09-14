import { TokenCache } from "./token-cache"
import { isServiceAccountEmail } from "./types"
import { getOidcEndpoints } from "./discovery"

export interface IntrospectionResult {
	email: string
	sub?: string
	isServiceAccount: boolean
}

const cache = new TokenCache<IntrospectionResult>()

export function clearIntrospectionCache(): void {
	cache.clear()
}

export async function introspectToken(token: string): Promise<IntrospectionResult> {
	const cached = cache.get(token)
	if (cached) return cached

	const endpoints = await getOidcEndpoints()

	if (!endpoints.userinfo_endpoint) {
		throw new Error("OIDC discovery response missing userinfo_endpoint")
	}

	let response: Response
	try {
		response = await fetch(endpoints.userinfo_endpoint, {
			headers: { Authorization: `Bearer ${token}` }
		})
	} catch (err) {
		throw new Error(
			`Failed to reach userinfo endpoint: ${err instanceof Error ? err.message : "network error"}`
		)
	}

	if (!response.ok) {
		throw new TokenRejectedError(
			`userinfo returned ${response.status}: ${response.statusText}`
		)
	}

	const body = (await response.json()) as { sub?: string; email?: string }

	if (!body.email) {
		throw new TokenRejectedError("userinfo response missing email claim")
	}

	const result: IntrospectionResult = {
		email: body.email,
		sub: body.sub,
		isServiceAccount: isServiceAccountEmail(body.email)
	}

	cache.set(token, result)
	return result
}

export class TokenRejectedError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "TokenRejectedError"
	}
}