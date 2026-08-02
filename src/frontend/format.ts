export function formatNumber(value: number | null, decimals: number): string {
	if (value === null) return "--"
	return value.toFixed(decimals)
}
