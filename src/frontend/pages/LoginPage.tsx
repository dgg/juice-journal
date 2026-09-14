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
				<a href="/auth/google/start" role="button" hx-boost="false">
					Sign in
				</a>
				</article>
			</main>
		</Layout>
	)
}