## ADDED Requirements

### Requirement: Daypart selected state carries daypart-specific hue

The daypart segmented control SHALL render each selected option in a hue that corresponds to its daypart, matching the color family used by the trip listing's daypart indicator. The selected "Morning" option SHALL use an amber background with an amber icon color; the selected "Afternoon" option SHALL use an indigo background with an indigo icon color. The unselected option SHALL remain visually neutral (default background, muted text and border). Each selected option's border SHALL use the same hue at a step-up shade so the filled button has a crisp edge against the unselected neighbor.

#### Scenario: Morning selected shows amber

- **GIVEN** the trip form renders with the "Morning" daypart option selected
- **WHEN** the selected option's visual styling is examined
- **THEN** its background SHALL use the amber color family and its icon/text SHALL use an amber shade, matching the listing's morning daypart indicator

#### Scenario: Afternoon selected shows indigo

- **GIVEN** the trip form renders with the "Afternoon" daypart option selected
- **WHEN** the selected option's visual styling is examined
- **THEN** its background SHALL use the indigo color family and its icon/text SHALL use an indigo shade, matching the listing's afternoon daypart indicator

#### Scenario: Unselected option stays neutral

- **GIVEN** the "Morning" option is selected and the "Afternoon" option is not (or vice versa)
- **WHEN** the unselected option's visual styling is examined
- **THEN** it SHALL render with the default background color and muted text/border, unchanged from the current unselected styling

#### Scenario: Selected and unselected are visually distinguishable side by side

- **GIVEN** the form renders on a phone with one daypart option selected
- **WHEN** both options are viewed side by side in the segmented control
- **THEN** the selected option SHALL be visually distinct from the unselected option through background fill and hue, and the two selected states (morning vs afternoon) SHALL be distinguishable from each other by hue family
