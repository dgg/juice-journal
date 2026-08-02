## Purpose

Provides a server-rendered home page that displays monthly trip statistics and recent trips list, optimized for responsive mobile usage with quick access to log new trips.

## ADDED Requirements

### Requirement: Home page displays monthly trip statistics

The system SHALL render a home page at `/` that displays aggregated trip statistics for the current calendar month, including average consumption, average duration, and total distance.

#### Scenario: Successful stats display

- **WHEN** user visits the home page `/`
- **THEN** system displays current month's aggregated trip statistics (average consumption, average duration, total distance)

### Requirement: Home page displays trip list

The system SHALL render a list of trips for the current calendar month, ordered with newest trips first.

#### Scenario: Successful trip list display

- **WHEN** user visits the home page `/` and trips exist for current month
- **THEN** system displays a list of trips ordered by newest first, showing date, time range, daypart indicator, and consumption

### Requirement: Trip detail expansion

The system SHALL allow users to expand trip rows to view additional details without page reload.

#### Scenario: Successful trip expansion

- **WHEN** user taps on a collapsed trip row in the list
- **THEN** system reveals additional trip details (distance, average speed, odometer reading, locations)

### Requirement: Prominent new trip CTA

The system SHALL display a prominent "Log new trip" button that remains accessible during scrolling.

#### Scenario: CTA visibility on phone

- **WHEN** user views the home page on a mobile device
- **THEN** the "Log new trip" button is sticky and positioned for thumb access

### Requirement: Month-over-month statistics comparison

The system SHALL display month-over-month comparisons for average consumption and average duration statistics.

#### Scenario: Successful MoM comparison display

- **WHEN** user visits the home page and previous month data exists
- **THEN** system displays delta indicators comparing current month to previous month statistics

### Requirement: Vehicle-specific display

The system SHALL display data for the vehicle associated with the most recent trip.

#### Scenario: Vehicle selection for display

- **WHEN** user visits the home page
- **THEN** system displays statistics and trips for the vehicle of the most recent trip, with vehicle identifier shown in header

### Requirement: Empty state handling

The system SHALL display appropriate messaging when no trips exist for the current month.

#### Scenario: Empty state display

- **WHEN** user visits the home page and no trips exist for current month
- **THEN** system displays "No trips yet — log your first commute" message with pointer to CTA

### Requirement: Responsive layout

The system SHALL adapt layout for different screen sizes, optimizing for mobile while supporting desktop.

#### Scenario: Responsive layout adaptation

- **WHEN** user views the home page on different screen sizes
- **THEN** system adjusts layout appropriately (phone: stacked elements, desktop: split layout)
