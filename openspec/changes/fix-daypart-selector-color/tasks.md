## 1. CSS implementation

- [ ] 1.1 Add `.daypart-selector input[value="morning"]:checked + span` rule to `public/app.css` with `background: var(--pico-color-amber-100)`, `color: var(--pico-color-amber-200)`, `border-color: var(--pico-color-amber-200)`
- [ ] 1.2 Add `.daypart-selector input[value="afternoon"]:checked + span` rule to `public/app.css` with `background: var(--pico-color-indigo-100)`, `color: var(--pico-color-indigo-200)`, `border-color: var(--pico-color-indigo-200)`

## 2. Verification

- [ ] 2.1 Open the trip form (`/trips/new`) and confirm the morning option selected state shows amber background/icon, distinct from the neutral unselected afternoon option
- [ ] 2.2 Switch to afternoon and confirm the selected state shows indigo background/icon, distinct from the neutral unselected morning option
- [ ] 2.3 Compare the selected button hues side-by-side with the trip listing's `.daypart-indicator` to confirm the color family matches
- [ ] 2.4 Run `bun test` to confirm no regressions

## 3. Wrap-up

- [ ] 3.1 If the pastel shades look too washed out against the white unselected background, bump background to `-500` tier and icon/color to `--pico-primary-inverse` (white) per design.md risk mitigation
- [ ] 3.2 Commit with `fix(ui): differentiate daypart selector color by morning/afternoon` and reference `closes #16`
