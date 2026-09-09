import type { $ZodIssue as ZodIssue } from "zod/v4/core"
import { ZodError } from "zod"

import type { TripFormIssues, TripForm, TripFormRaw } from "./types"







export const toFieldIssues = (err?: ZodError): TripFormIssues | undefined =>
	err?.issues.reduce(
		(map, issue) => {
			const key = issue.path[0] as keyof TripFormRaw
			map[key] = issue.message
			return map
		},
		{} as Record<keyof TripFormRaw, string>
	)
