function parseAllowlist(envVar: string): Set<string> {
	const raw = process.env[envVar]
	if (!raw) return new Set()
	return new Set(
		raw
			.split(",")
			.map((s) => s.trim().toLowerCase())
			.filter(Boolean)
	)
}

let userEmails = parseAllowlist("ALLOWED_GOOGLE_EMAILS")
let saEmails = parseAllowlist("ALLOWED_SERVICE_ACCOUNTS")

export function refreshAllowlists(): void {
	userEmails = parseAllowlist("ALLOWED_GOOGLE_EMAILS")
	saEmails = parseAllowlist("ALLOWED_SERVICE_ACCOUNTS")
}

export function isAllowedUser(email: string): boolean {
	return userEmails.has(email.toLowerCase())
}

export function isAllowedServiceAccount(email: string): boolean {
	return saEmails.has(email.toLowerCase())
}

export function isAuthorized(email: string, isServiceAccount: boolean): boolean {
	return isServiceAccount
		? isAllowedServiceAccount(email)
		: isAllowedUser(email)
}
