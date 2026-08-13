import type { FC } from "hono/jsx"

type Action = {
	href: string
	label: string
	variant?: "contrast" | "secondary"
}

type StickyCtaProps =
	| { actions: Action[] }
	| { href: string; label: string }

export const StickyCta: FC<StickyCtaProps> = (props) => {
	const actions: Action[] = "actions" in props
		? props.actions
		: [{ href: props.href, label: props.label }]

	if (actions.length === 1) {
		const [a] = actions
		return (
			<div class="sticky-cta">
				<a href={a!.href} role="button" class={a!.variant || "contrast"}>
					{a!.label}
				</a>
			</div>
		)
	}

	return (
		<div class="sticky-cta">
			<div class="grid">
				{actions.map((a) => (
					<a href={a.href} role="button" class={a.variant || "contrast"}>
						{a.label}
					</a>
				))}
			</div>
		</div>
	)
}
