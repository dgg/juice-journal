import type { FC } from "hono/jsx"
import { raw } from "hono/html"

export const Layout: FC<{ title: string; children?: any }> = ({
	title,
	children
}) => {
	return (
		<>
			{raw("<!DOCTYPE html>\n")}
			<html lang="en" data-theme="light">
				<head>
					<meta charset="UTF-8" />
					<meta
						name="viewport"
						content="width=device-width, initial-scale=1.0"
					/>
					<title>{title}</title>
					<link
						rel="stylesheet"
						href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
					/>
					<link rel="stylesheet" href="/static/app.css" />
					<script
						src="https://unpkg.com/htmx.org@2.0.4"
						integrity="sha384-HGfztofotfshCVFfy9nW8c7mN4J2a7g8HcL	ncc+Gvztu0+IGYjbfI4b+L8gA1Bz"
						crossorigin="anonymous"
					/>
				</head>
				<body hx-boost="true">
					{children}
				</body>
			</html>
		</>
	)
}
