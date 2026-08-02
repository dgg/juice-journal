import postgres from "postgres"
import { rootLogger } from "../utils/logger"

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is not set")
}
console.log(DATABASE_URL)
export const db = postgres(DATABASE_URL)

// Test connection
export async function testConnection() {
	try {
		const result = await db`SELECT 1 as test`
		rootLogger.info({ connected: true }, "Database connection successful")
		return true
	} catch (error) {
		rootLogger.error({ err: error }, "Database connection failed")
		return false
	}
}
