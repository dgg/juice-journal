import type { FC } from "hono/jsx"

type EmptyStateProps = { message?: string }

export const EmptyState: FC<EmptyStateProps> = ({
	message = "No trips yet — log your first commute"
}) => {
	return (
		<p class="empty-state">
			<span class="icon-circle-off" aria-hidden="true"></span>
			{message}
		</p>
	)
}
