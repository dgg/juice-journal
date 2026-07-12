import { createProblemTypeRegistry } from "hono-problem-details"

export const problems = createProblemTypeRegistry({
	TRIP_CONFLICT: {
		type: "https://juice-journal.local/problems/trip-conflict",
		status: 409,
		title: "Trip Conflict"
	},
	FOREIGN_KEY_VIOLATION: {
		type: "https://juice-journal.local/problems/foreign-key-violation",
		status: 422,
		title: "Foreign Key Violation"
	}
})
