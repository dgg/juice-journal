import type { FC } from "hono/jsx"

export const EmptyState: FC = () => {
	return <p class="empty-state">No trips yet — log your first commute</p>
}