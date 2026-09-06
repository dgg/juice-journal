import type { FC } from "hono/jsx"
import { Layout } from "../Layout"

export const ErrorPage: FC = () => {
	return (
		<Layout title="Something went wrong — Juice Journal">
			<main class="container">
				<article>
					<hgroup>
						<h1>Something went wrong</h1>
						<p>An unexpected error occurred. Please try again.</p>
					</hgroup>
				</article>
			</main>
		</Layout>
	)
}