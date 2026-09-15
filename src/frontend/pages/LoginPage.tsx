import type { FC } from "hono/jsx"
import { Layout } from "../Layout"

export const LoginPage: FC = () => {
	return (
		<Layout title="Sign in — Juice Journal">
			<main class="container">
				<article>
					<hgroup>
						<h1>Juice Journal</h1>
						<p>Sign in to continue</p>
					</hgroup>
					<a
						id="sign-in"
						href="/auth/google/start"
						role="button"
						hx-boost="false"
					>
						<span class="icon-log-in" aria-hidden="true"></span> Sign in
					</a>
				</article>
			</main>
		</Layout>
	)
}
