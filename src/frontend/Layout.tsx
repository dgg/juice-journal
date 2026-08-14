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
						href="https://cdnjs.cloudflare.com/ajax/libs/picocss/2.1.1/pico.min.css"
						integrity="sha512-+4kjFgVD0n6H3xt19Ox84B56MoS7srFn60tgdWFuO4hemtjhySKyW4LnftYZn46k3THUEiTTsbVjrHai+0MOFw=="
						crossorigin="anonymous"
						referrerpolicy="no-referrer"
					/>
					<link
						rel="stylesheet"
						href="https://cdnjs.cloudflare.com/ajax/libs/picocss/2.1.1/pico.colors.min.css"
						integrity="sha512-fQonnXDPwZU4XnvoI+WMd8bHsn6aMCK5434kaGYc2o7J2RYOLUU5BFx9X+1nc8Mi4oYiYFoMmQmbLK7EMw39+A=="
						crossorigin="anonymous"
						referrerpolicy="no-referrer"
					/>
					<link rel="stylesheet" href="/static/app.css" />
					<script
						src="https://unpkg.com/htmx.org@2.0.10"
						integrity="sha384-H5SrcfygHmAuTDZphMHqBJLc3FhssKjG7w/CeCpFReSfwBWDTKpkzPP8c+cLsK+V"
						crossorigin="anonymous"
						defer
					/>
					<script
						src="https://cdn.jsdelivr.net/npm/lucide@1.31.0/dist/umd/lucide.min.js"
						integrity="sha256-+WFnu/DnOuEDEygRbMNrpjPHGVPQzM4uS1z8F8Qg+Gk="
						crossorigin="anonymous"
						defer
					></script>
				</head>
				<body hx-boost="true">{children}</body>
			</html>
		</>
	)
}
