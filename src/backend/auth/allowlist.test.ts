import { describe, it, expect, beforeEach } from "bun:test"
import {
	isAllowedUser,
	isAllowedServiceAccount,
	isAuthorized,
	refreshAllowlists
} from "./allowlist"

describe("allowlist", () => {
	beforeEach(() => {
		process.env.ALLOWED_GOOGLE_EMAILS = "dgon@gmail.com,other@gmail.com"
		process.env.ALLOWED_SERVICE_ACCOUNTS =
			"importer@proj.iam.gserviceaccount.com"
		refreshAllowlists()
	})

	describe("isAllowedUser", () => {
		it("permits email in allowlist", () => {
			expect(isAllowedUser("dgon@gmail.com")).toBe(true)
		})

		it("rejects email not in allowlist", () => {
			expect(isAllowedUser("random@gmail.com")).toBe(false)
		})

		it("is case-insensitive", () => {
			expect(isAllowedUser("DGON@gmail.com")).toBe(true)
		})
	})

	describe("isAllowedServiceAccount", () => {
		it("permits SA email in allowlist", () => {
			expect(isAllowedServiceAccount("importer@proj.iam.gserviceaccount.com")).toBe(true)
		})

		it("rejects SA email not in allowlist", () => {
			expect(isAllowedServiceAccount("other@proj.iam.gserviceaccount.com")).toBe(false)
		})
	})

	describe("isAuthorized", () => {
		it("routes user emails to user allowlist", () => {
			expect(isAuthorized("dgon@gmail.com", false)).toBe(true)
			expect(isAuthorized("random@gmail.com", false)).toBe(false)
		})

		it("routes SA emails to SA allowlist", () => {
			expect(isAuthorized("importer@proj.iam.gserviceaccount.com", true)).toBe(true)
			expect(isAuthorized("other@proj.iam.gserviceaccount.com", true)).toBe(false)
		})
	})
})