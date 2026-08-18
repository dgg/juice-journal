export const getColorHex = (colorFamily, shade = 500) => {
	const variableName = `--pico-color-${colorFamily}-${shade}`

	const color = getComputedStyle(document.documentElement)
		.getPropertyValue(variableName)
		.trim()
	return color
}

export const getColorRgba = (colorFamily, shade = 500, alpha = 1) => {
	const hexColor = getColorHex(colorFamily, shade)

	// always starts with #
	const hex =
		hexColor.length === 4
			? `${hexColor[1]}${hexColor[1]}${hexColor[2]}${hexColor[2]}${hexColor[3]}${hexColor[3]}`
			: hexColor.substring(1)

	const r = parseInt(hex.substring(0, 2), 16)
	const g = parseInt(hex.substring(2, 4), 16)
	const b = parseInt(hex.substring(4, 6), 16)

	return `rgba(${r},${g},${b},${alpha})`
}
