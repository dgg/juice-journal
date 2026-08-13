import type { FC } from "hono/jsx"
import { raw } from "hono/html"

export const Layout: FC<{ title: string; children?: any }> = ({ title, children }) => {
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
						src="https://unpkg.com/htmx.org@2.0.10"
						integrity="sha384-H5SrcfygHmAuTDZphMHqBJLc3FhssKjG7w/CeCpFReSfwBWDTKpkzPP8c+cLsK+V"
						crossorigin="anonymous"
					/>
				</head>
				<body hx-boost="true">{children}</body>
			</html>
		</>
	)
}
