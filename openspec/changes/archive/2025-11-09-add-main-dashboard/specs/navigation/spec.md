## ADDED Requirements

### Requirement: Main Dashboard Page
The system SHALL provide a dashboard page as the main landing page of the application, accessible at the root route (`/`).

#### Scenario: Access dashboard
- **WHEN** a user navigates to the root URL (`/`)
- **THEN** they see the main dashboard page
- **AND** the dashboard displays navigation options for key features
- **AND** if not authenticated, they are redirected to login

#### Scenario: Dashboard layout
- **WHEN** a user views the dashboard
- **THEN** they see a grid layout with navigation cards
- **AND** the layout is responsive (adapts to screen size)
- **AND** cards are clearly visible and accessible

### Requirement: Navigation to Training Sessions
The dashboard SHALL provide navigation to the Training Sessions view.

#### Scenario: Navigate to training sessions
- **WHEN** a user clicks on the Training Sessions card/link on the dashboard
- **THEN** they are navigated to the Training Sessions page
- **AND** the Training Sessions view is displayed

#### Scenario: Training Sessions card visibility
- **WHEN** a user views the dashboard
- **THEN** they see a card or link labeled "Training Sessions"
- **AND** the card is clearly identifiable and clickable

### Requirement: Navigation to Curricula
The dashboard SHALL provide navigation to the Curricula view.

#### Scenario: Navigate to curricula
- **WHEN** a user clicks on the Curricula card/link on the dashboard
- **THEN** they are navigated to the Curricula page
- **AND** the Curricula view is displayed

#### Scenario: Curricula card visibility
- **WHEN** a user views the dashboard
- **THEN** they see a card or link labeled "Curricula"
- **AND** the card is clearly identifiable and clickable

### Requirement: Navigation to Techniques
The dashboard SHALL provide navigation to the Techniques view.

#### Scenario: Navigate to techniques
- **WHEN** a user clicks on the Techniques card/link on the dashboard
- **THEN** they are navigated to the Techniques page
- **AND** the Techniques view is displayed

#### Scenario: Techniques card visibility
- **WHEN** a user views the dashboard
- **THEN** they see a card or link labeled "Techniques"
- **AND** the card is clearly identifiable and clickable

### Requirement: Navigation to Save Video
The dashboard SHALL provide navigation to the Save Video functionality.

#### Scenario: Navigate to save video
- **WHEN** a user clicks on the Save Video card/link on the dashboard
- **THEN** they are navigated to the Save Video page
- **AND** the Save Video interface is displayed

#### Scenario: Save Video card visibility
- **WHEN** a user views the dashboard
- **THEN** they see a card or link labeled "Save Video"
- **AND** the card is clearly identifiable and clickable

### Requirement: Responsive Dashboard Design
The dashboard SHALL be responsive and work on mobile, tablet, and desktop devices.

#### Scenario: Mobile view
- **WHEN** a user views the dashboard on a mobile device (< 768px)
- **THEN** navigation cards are displayed in a single column
- **AND** all cards are fully visible and accessible
- **AND** touch targets are appropriately sized

#### Scenario: Desktop view
- **WHEN** a user views the dashboard on a desktop device (> 1024px)
- **THEN** navigation cards are displayed in a grid layout (e.g., 2x2)
- **AND** all cards are visible without scrolling
- **AND** hover states work correctly

