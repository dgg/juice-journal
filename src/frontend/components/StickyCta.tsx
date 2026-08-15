import type { FC } from "hono/jsx"

type LinkAction = {
	href: string
	label: string
	variant?: "contrast" | "secondary"
	icon?: string
}

type SubmitAction = {
	label: string
	variant?: "contrast" | "secondary"
	icon?: string
	type: "submit"
}

type Action = LinkAction | SubmitAction

type StickyCtaProps = { actions: Action[] } | { href: string; label: string }

export const StickyCta: FC<StickyCtaProps> = (props) => {
	const actions: Action[] =
		"actions" in props ? props.actions : [{ href: props.href, label: props.label }]

	return (
		<div class="sticky-cta">
			<div class="grid">
				{actions.map((a) => {
					const content = (
						<>
							{a.icon && (
								<span class={`icon-${a.icon}`} aria-hidden="true"></span>
							)}
							{a.label}
						</>
					)
					if ("type" in a) {
						return (
							<button type="submit" class={a.variant || "contrast"}>
								{content}
							</button>
						)
					}
					return (
						<a href={a.href} role="button" class={a.variant || "contrast"}>
							{content}
						</a>
					)
				})}
			</div>
		</div>
	)
}
