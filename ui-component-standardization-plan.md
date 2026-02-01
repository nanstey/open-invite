# UI Component Standardization Plan & Usage Inventory

## Scope and goal
Standardize core UI primitives by committing to **9ui** as the shared component library so we can reduce duplication and simplify maintenance across the app.

## Commands used to audit the repo
- `rg -n "\bButton\b|\bModal\b|SidePanel|Sidepanel|Card\b|Dialog\b|Drawer\b|Sheet\b"`
- `rg -n "Modal|modal|Dialog|dialog|Drawer|drawer|Sheet|sheet" domains lib pages`
- `rg -n "Panel|panel" domains lib pages`
- `rg -n "<button" domains lib pages`
- `rg -n "Card" domains lib pages`
- `rg -n "TabGroup" domains lib pages`
- `rg -n "Badge" domains lib pages`
- `rg -n "FormInput|FormSelect" domains lib pages`
- `rg -n "SearchInput" domains lib pages`

## 9ui registry (current component catalog)
From `https://www.9ui.dev/docs/components`:
Accordion, Alert Dialog, Alert, Aspect Ratio, Autocomplete, Avatar, Badge, Breadcrumbs, Button, Calendar, Card, Carousel, Chart, Checkbox, Checkbox Group, Collapsible, Combobox, Command, Context Menu, Date Picker, Dialog, Drawer, Dropdown Menu, Emoji Picker, Form, Input, Input OTP, Kbd, Label, Menubar, Meter, Navigation Menu, Number Field, Pagination, Phone Input, Popover, Preview Card, Progress, Radio Group, Resizable, Scroll Area, Select, Separator, Sheet, Skeleton, Slider, Sonner, Switch, Table, Tabs, Textarea, Toast, Toggle, Toggle Group, Toolbar, Tooltip.

## 9ui installation checklist (from installation guide)
1. Initialize shadcn with 9ui registry:
   - `npx shadcn@latest init https://9ui.dev/r/init.json`
2. Add 9ui registry to `components.json`:
   - `"registries": { "@9ui": "https://9ui.dev/r/{name}.json" }`
3. Initialize MCP (so AI tools can access the registry):
   - `npx shadcn@latest mcp init`
4. Add root wrapper to app layout for styling isolation:
   - `<div className="root">{children}</div>`
5. Install icons (9ui defaults to `lucide-react`).

## Proposed 9ui component adoption (what we should use)
1. **Buttons** → 9ui `Button`
2. **Badges** → 9ui `Badge`
3. **Cards** → 9ui `Card`
4. **Modals/Dialogs** → 9ui `Dialog` (standard), `Sheet`/`Drawer` (bottom sheet / side panel), `Alert Dialog` for confirmation flows
5. **Side panels** → 9ui `Sheet` or `Drawer` (replace `SlidePanel`)
6. **Tabs** → 9ui `Tabs` (replace custom `TabGroup`)
7. **Inputs** → 9ui `Input`
8. **Selects** → 9ui `Select`
9. **Textareas** → 9ui `Textarea`
10. **Checkboxes** → 9ui `Checkbox`
11. **Radio groups** → 9ui `Radio Group` (if/when needed)
12. **Switches** → 9ui `Switch` (if/when needed)
13. **Popovers** → 9ui `Popover` (replace `ComingSoonPopover`)
14. **Tooltips** → 9ui `Tooltip` (future inline hints)
15. **Toasts** → 9ui `Toast`/`Sonner` (future global notifications)

## Usage inventory (candidates to migrate to 9ui components)

### 9ui Button (all `<button>` usage)
- `domains/friends/FriendsView.tsx`
- `lib/ui/components/SlidePanel.tsx`
- `lib/ui/components/TabGroup.tsx`
- `domains/home/LandingPage.tsx`
- `lib/ui/components/LocationAutocomplete.tsx`
- `lib/ui/components/SortableHeader.tsx`
- `domains/events/components/list/EventsFilterBar.tsx`
- `domains/events/components/list/EventsMapView.tsx`
- `domains/events/components/list/CalendarView.tsx`
- `domains/events/components/list/EventsEmptyState.tsx`
- `domains/events/components/list/EventsCardView.tsx`
- `domains/auth/LoginModal.tsx`
- `domains/profile/ProfileView.tsx`
- `domains/events/components/detail/guests/GuestsTab.tsx`
- `domains/events/components/detail/details/AboutCard.tsx`
- `domains/feedback/components/FeedbackAdminPage.tsx`
- `domains/events/components/detail/details/LocationCard.tsx`
- `domains/events/components/detail/details/FormattingHelpModal.tsx`
- `domains/events/components/detail/maps/LeafletMiniMapPreview.tsx`
- `domains/feedback/components/feedback/FeedbackModal.tsx`
- `domains/events/components/detail/maps/FullScreenMapModal.tsx`
- `domains/feedback/components/feedback/FeedbackFilterBar.tsx`
- `domains/feedback/components/feedback/FeedbackPicker.tsx`
- `domains/feedback/components/feedback/FeedbackRow.tsx`
- `domains/feedback/components/feedback/FeedbackDetailPanel.tsx`
- `domains/events/components/detail/actions/EventActions.tsx`
- `domains/feedback/components/projects/KanbanColumn.tsx`
- `domains/feedback/components/projects/CreateProjectModal.tsx`
- `domains/events/components/detail/chat/ChatTab.tsx`
- `domains/feedback/components/projects/ProjectDetailPanel.tsx`
- `domains/events/components/detail/itineraries/ItineraryEditor.tsx`
- `domains/feedback/components/projects/ProjectLinkCard.tsx`
- `domains/events/components/detail/itineraries/ItinerarySection.tsx`
- `domains/feedback/components/projects/ProjectCard.tsx`
- `domains/events/components/detail/route/EventNotFoundScreen.tsx`
- `domains/app/components/MobileBottomNav.tsx`
- `domains/events/components/detail/images/HeaderImageModal.tsx`
- `domains/app/components/DesktopSidebar.tsx`
- `domains/alerts/AlertsView.tsx`
- `domains/events/components/detail/header/KeyFactsCard.tsx`
- `domains/events/components/detail/header/HeroHeader.tsx`
- `domains/events/components/detail/expenses/components/ExpenseEditRow.tsx`
- `domains/events/components/detail/expenses/components/ExpensesSummarySection.tsx`
- `domains/events/components/detail/expenses/ExpensesCard.tsx`

### 9ui Dialog / Sheet / Drawer (modal/dialog/sheet implementations)
- `domains/auth/LoginModal.tsx` → `Dialog`
- `domains/feedback/components/feedback/FeedbackModal.tsx` → `Dialog` (desktop) + `Sheet` (mobile bottom sheet)
- `domains/feedback/components/projects/CreateProjectModal.tsx` → `Dialog`
- `domains/events/components/detail/details/FormattingHelpModal.tsx` → `Dialog`
- `domains/events/components/detail/maps/FullScreenMapModal.tsx` → `Dialog` or fullscreen `Sheet`
- `domains/events/components/detail/images/HeaderImageModal.tsx` → `Dialog` or fullscreen `Sheet`

**Modal invocation sites**
- `pages/index.tsx` (LoginModal)
- `pages/e.$slug.tsx` (LoginModal)
- `domains/profile/ProfileView.tsx` (FeedbackModal)
- `domains/feedback/components/ProjectsKanbanBoard.tsx` (CreateProjectModal)
- `domains/events/components/detail/details/AboutCard.tsx` (FormattingHelpModal)
- `domains/events/components/detail/details/LocationCard.tsx` (FullScreenMapModal)
- `domains/events/components/detail/EventDetail.tsx` (HeaderImageModal)

### 9ui Sheet / Drawer (side panels)
- `lib/ui/components/SlidePanel.tsx` → `Sheet`/`Drawer`
- `domains/feedback/components/feedback/FeedbackDetailPanel.tsx` → `Sheet`/`Drawer`
- `domains/feedback/components/projects/ProjectDetailPanel.tsx` → `Sheet`/`Drawer`

### 9ui Card (card-like components that should use `Card`)
- `domains/home/LandingPage.tsx` (FeatureCard, CategoryCard)
- `domains/events/components/list/EventCard.tsx`
- `domains/events/components/detail/details/TitleCard.tsx`
- `domains/events/components/detail/details/AboutCard.tsx`
- `domains/events/components/detail/details/DateTimeCard.tsx`
- `domains/events/components/detail/details/ItineraryCard.tsx`
- `domains/events/components/detail/details/LocationCard.tsx`
- `domains/events/components/detail/actions/HostedByActionsCard.tsx`
- `domains/events/components/detail/header/KeyFactsCard.tsx`
- `domains/events/components/detail/expenses/ExpensesCard.tsx`
- `domains/events/components/detail/itineraries/ItineraryEditor.tsx` (ItineraryItemCard)
- `domains/feedback/components/projects/ProjectCard.tsx`
- `domains/feedback/components/projects/ProjectLinkCard.tsx`

### 9ui Input / Select / Textarea / Checkbox (form controls)
- **Input**: `lib/ui/components/FormControls.tsx` (FormInput), `domains/auth/LoginModal.tsx` (custom FormInput), `domains/feedback/components/feedback/FeedbackModal.tsx`, `domains/events/components/detail/expenses/components/ExpenseEditRow.tsx`, `domains/events/components/detail/expenses/components/ExpenseParticipantsEditor.tsx`
- **Select**: `lib/ui/components/FormControls.tsx` (FormSelect), `lib/ui/components/DateTimeFields.tsx`, `domains/events/components/list/EventsFilterBar.tsx`, `domains/events/components/detail/guests/GuestsTab.tsx`, `domains/events/components/detail/details/TitleCard.tsx`, `domains/events/components/detail/itineraries/ItineraryEditor.tsx`, `domains/events/components/detail/expenses/components/ExpenseEditRow.tsx`, `domains/events/components/detail/expenses/components/ExpenseParticipantsEditor.tsx`, `domains/feedback/components/feedback/FeedbackModal.tsx`, `domains/feedback/components/feedback/FeedbackDetailPanel.tsx`, `domains/feedback/components/feedback/FeedbackFilterBar.tsx`
- **Textarea**: `domains/feedback/components/feedback/FeedbackModal.tsx`, `domains/feedback/components/projects/ProjectDetailPanel.tsx`, `domains/feedback/components/projects/CreateProjectModal.tsx`, `domains/events/components/detail/itineraries/ItineraryEditor.tsx`, `domains/events/components/detail/details/AboutCard.tsx`
- **Checkbox**: `domains/events/components/detail/expenses/components/ExpenseParticipantsEditor.tsx`

### 9ui Badge
- `lib/ui/components/Badge.tsx`
- `domains/feedback/components/feedback/FeedbackRow.tsx`
- `domains/feedback/components/feedback/FeedbackDetailPanel.tsx`

### 9ui Tabs
- `lib/ui/components/TabGroup.tsx`
- `pages/__root.tsx`
- `domains/app/components/MobileTopHeader.tsx`
- `domains/events/components/detail/EventDetail.tsx`

### 9ui Input (search)
- `lib/ui/components/SearchInput.tsx`
- `domains/feedback/components/FeedbackAdminPage.tsx`
- `domains/feedback/components/feedback/FeedbackPicker.tsx`
- `domains/feedback/components/feedback/FeedbackDetailPanel.tsx`

### 9ui Popover
- `lib/ui/components/ComingSoonPopover.tsx`
- `pages/__root.tsx` (ComingSoonPopover usage)
- `domains/events/components/detail/guests/GuestsTab.tsx` (ComingSoonPopover usage)
- `domains/profile/ProfileView.tsx` (ComingSoonPopover usage)
