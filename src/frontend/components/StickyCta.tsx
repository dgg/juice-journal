import type { FC } from "hono/jsx"

export const StickyCta: FC<{ href: string; label: string }> = ({ href, label }) => {
	return (
		<div class="sticky-cta">
			<a href={href} role="button" class="contrast">
				{label}
			</a>
		</div>
	)
}
