## Why

The trip form's daypart segmented control uses Pico's primary color (green) for both the morning and afternoon selected states, while the trip listing distinguishes morning (amber) from afternoon (indigo). This makes the two dayparts visually indistinguishable on the form and breaks the color correspondence between selecting a daypart and seeing it listed. Issue #16 asks the selected state to carry the same hue family used in the listing so users can tell morning from afternoon at a glance.

## What Changes

- The selected state of the daypart "Morning" radio option SHALL use an amber background and amber icon color (matching the listing's `.daypart-indicator.morning`).
- The selected state of the daypart "Afternoon" radio option SHALL use an indigo background and indigo icon color (matching the listing's `.daypart-indicator.afternoon`).
- The unselected state SHALL remain unchanged (white background, muted text/border).
- Each selected option's border SHALL step up one shade (amber-200 / indigo-200) to give the filled button a crisper edge against the unselected neighbor.
- Implementation is CSS-only: two attribute-selector rules added to `public/app.css`. No JSX, handler, schema, or test changes.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `trip-input-form`: the daypart segmented control's selected-state visual styling now differs per option (morning → amber, afternoon → indigo) instead of using a single shared primary color.

## Impact

- **Code:** `public/app.css` only — two new CSS rules targeting `.daypart-selector input[value="morning"]:checked + span` and `.daypart-selector input[value="afternoon"]:checked + span`. The existing generic `.daypart-selector input:checked + span` rule can remain as a harmless fallback or be removed.
- **APIs / DB / dependencies:** none.
- **Tests:** no behavioral change; existing form tests are unaffected. Visual verification only.
- **Rollback:** revert the two added CSS rules. The generic `:checked + span` rule (if kept) restores the prior primary-color behavior immediately. If removed, restore it from git history.
