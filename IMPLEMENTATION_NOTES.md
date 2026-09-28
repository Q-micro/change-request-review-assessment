# Implementation Notes

## 1. What I changed

* Fixed the diff classification so a change in `description` is correctly identified as `changed`, even when quantity and unit price stay the same.
* Updated the diff table to display before/after descriptions so description-only changes are visible to the reviewer.
* Fixed the detail view so selecting a different change request reloads the correct request.
* Added approval-policy checks so Approve/Reject are only available when the request is `PENDING_APPROVAL` and the user has an approval policy.
* Added chronological sorting for the approval timeline.
* Completed the change request status filter so the rendered list only shows requests matching the selected status.
* Kept loading, loaded, empty, and error states for the list and detail views, including Retry actions.
* Implemented Approve and Reject API actions with loading/submitting protection and error handling.
* Added rejection-reason validation, including preventing empty or whitespace-only reasons.
* Refreshed the list after a successful Approve/Reject so the status stays consistent between the list and detail views.
* Added and updated rendered behavior tests for the above functionality.
* Added UI styling improvements while keeping the existing Angular component structure.

## 2. Component & state model

* `AppComponent` acts as the shell and connects the change request list and detail components. It also handles switching between the provided users and refreshes the list after an action changes a request.
* `CrListComponent` loads change requests from the mock API and exposes `loading`, `loaded`, `empty`, and `error` states. It also owns the status filter and derives `visibleRows` from the loaded data.
* `CrDetailComponent` loads the selected change request, calculates the displayed diff and totals, sorts the timeline chronologically, and controls approval/rejection availability.
* The mock API remains responsible for data access and action results. Components update their local view state from API responses rather than directly changing the request status themselves.
* When the selected request ID changes, the detail component reloads so the displayed request always matches the selected row.

## 3. Invariants I keep

| Invariant                                                          | How / where                                                                      |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Only `PENDING_APPROVAL` requests can be approved or rejected       | `canApprove` / `canReject` in `CrDetailComponent`                                |
| Approval actions require an approval policy                        | `canApprovePolicy()` in `permissions.ts`                                         |
| Reject requires a reason                                           | Reactive form validators and `reject()`                                          |
| Whitespace-only rejection reasons are invalid                      | `Validators.pattern(/\S/)`                                                       |
| Description-only changes are classified as `changed`               | `computeDiff()` in `diff.util.ts`                                                |
| Timeline entries are displayed oldest-first                        | `timeline` getter in `CrDetailComponent`                                         |
| Duplicate actions are prevented while an action is in progress     | `submitting` guard in `approve()` / `reject()`                                   |
| List status stays synchronized after an action                     | `statusChanged` event from detail and `refresh()` in the list                    |
| Failed actions do not replace the loaded request with invalid data | API errors are stored in `actionError` while the existing detail remains visible |

## 4. Testing strategy

* Used rendered component/DOM tests for behavior that the user actually sees, including list states, status filtering, diff rendering, totals, timeline ordering, permission gating, approval/rejection flows, validation, and error handling.
* Used a focused unit test for the diff classification logic, including a description-only change.
* Added regression coverage for the original diff and permission defects.
* Tested successful and failed Approve/Reject actions and duplicate action prevention.
* Final test run after a clean `npm ci` completed successfully: **3 test suites, 20 tests passed**.
* Also verified the project with the TypeScript typecheck, Angular build, and linting.

## 5. Assumptions

* The frontend consumes the statuses and policies provided by the mock API rather than implementing backend workflow transitions itself.
* A description change is considered a meaningful change request even when quantity and unit price remain unchanged.
* Approval and rejection are only valid while a request is `PENDING_APPROVAL`.
* Organization-level access is represented by the provided users and mock API. The frontend displays the API's accessible requests and shows the provided not-found/error state when an inaccessible request is opened directly.
* The existing component structure and mock API were kept rather than introducing a larger state-management solution, since the assessment is focused on the review workflow.

## 6. Where I used AI

* I used AI as a coding assistant during the assessment to help interpret the requirements, identify edge cases, suggest focused implementation and test changes, and review parts of the implementation.
* I reviewed the suggested changes, adapted them to the existing codebase, and manually verified the behavior in the browser.
* Final verification was done through the project's test suite, typecheck, build, linting, and manual UI testing.

## 7. What I'd improve with more time

* Expand the UI beyond the provided review workflow so users could create or submit a new change request and see the request move through the full lifecycle.
* Add quick-select rejection reasons alongside the free-text reason field, while still allowing a custom reason.
* Further polish the UI and add clearer visual feedback for selected requests, action progress, and completed actions.
* Add more test coverage for individual policy scopes and additional edge cases.
* Improve the review workflow with richer request history and clearer information about why a request was rejected or approved.
