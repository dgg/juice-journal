import postgres from "postgres"

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is not set")
}

export const db = postgres(DATABASE_URL)

// Test connection
export async function testConnection() {
	try {
		const result = await db`SELECT 1 as test`
		console.log("Database connection successful:", result)
		return true
	} catch (error) {
		console.error("Database connection failed:", error)
		return false
	}
}
