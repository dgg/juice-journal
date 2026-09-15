import { createHash } from "crypto"

const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
	value: T
	expiresAt: number
}

export class TokenCache<T> {
	private store = new Map<string, CacheEntry<T>>()

	private hashKey(token: string): string {
		return createHash("sha256").update(token).digest("hex")
	}

	get(token: string): T | undefined {
		const key = this.hashKey(token)
		const entry = this.store.get(key)
		if (!entry) return undefined
		if (Date.now() > entry.expiresAt) {
			this.store.delete(key)
			return undefined
		}
		return entry.value
	}

	set(token: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
		const key = this.hashKey(token)
		this.store.set(key, {
			value,
			expiresAt: Date.now() + ttlMs
		})
	}

	evict(token: string): void {
		this.store.delete(this.hashKey(token))
	}

	clear(): void {
		this.store.clear()
	}

	get size(): number {
		return this.store.size
	}
}