interface OidcEndpoints {
	authorization_endpoint: string
	token_endpoint: string
	userinfo_endpoint: string
	issuer: string
}

let cached: OidcEndpoints | null = null
let fetchPromise: Promise<OidcEndpoints> | null = null

function getIssuerBaseUrl(): string {
	const url = process.env.OAUTH_ISSUER_BASE_URL
	if (!url) {
		throw new Error("OAUTH_ISSUER_BASE_URL environment variable is not set")
	}
	return url.replace(/\/$/, "")
}

export async function getOidcEndpoints(): Promise<OidcEndpoints> {
	if (cached) return cached
	if (fetchPromise) return fetchPromise

	fetchPromise = (async () => {
		const issuer = getIssuerBaseUrl()
		const discoveryUrl = `${issuer}/.well-known/openid-configuration`

		let response: Response
		try {
			response = await fetch(discoveryUrl)
		} catch (err) {
			throw new Error(
				`Failed to fetch OIDC discovery from ${discoveryUrl}: ${err instanceof Error ? err.message : "network error"}`
			)
		}

		if (!response.ok) {
			throw new Error(
				`OIDC discovery failed: ${response.status} ${response.statusText} from ${discoveryUrl}`
			)
		}

		const body = (await response.json()) as Partial<OidcEndpoints>

		if (!body.authorization_endpoint || !body.token_endpoint) {
			throw new Error("OIDC discovery response missing required endpoints")
		}

		cached = {
			authorization_endpoint: body.authorization_endpoint,
			token_endpoint: body.token_endpoint,
			userinfo_endpoint: body.userinfo_endpoint ?? "",
			issuer: body.issuer ?? issuer
		}
		return cached
	})()

	try {
		return await fetchPromise
	} finally {
		fetchPromise = null
	}
}

export function resetDiscoveryCache(): void {
	cached = null
	fetchPromise = null
}