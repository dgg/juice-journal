export type IdentityType = "user" | "service-account"

export type AuthMethod = "session-cookie" | "bearer"

export interface Principal {
	provider: string
	sub?: string
	email: string
	authMethod: AuthMethod
	identityType: IdentityType
}

export const isServiceAccountEmail = (email: string): boolean =>
	email.endsWith(".iam.gserviceaccount.com")