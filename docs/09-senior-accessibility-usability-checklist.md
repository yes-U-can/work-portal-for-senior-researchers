# Senior Accessibility and Usability Checklist

## Purpose

This checklist validates whether senior researchers can use core workflows independently:

- Connect Google Drive
- Connect Gmail or personal Naver Mail
- Understand BAND review waiting status (when app review is pending)
- Read and act on key information without confusion

This is a release gate. If users cannot complete tasks without help, the build is not ready.

## Test Setup

- Participants: at least 5 users from target group (senior researchers)
- Device coverage: desktop + laptop (one small-screen device required)
- Input coverage: mouse + keyboard-only run
- Browser coverage: latest Chrome and Edge
- Environment:
  - Real OAuth credentials configured
  - At least one Drive account, one Gmail account
  - One personal Naver Mail account with IMAP app password ready
  - If BAND review is still pending, use pending-mode scenarios (S2/S3-alt)

## Hard Pass Criteria

1. Task completion rate >= 90%
2. No-help completion rate >= 80%
3. Critical confusion events = 0
4. Average time for core setup (Drive + one mail) <= 10 minutes
5. Keyboard-only run completes all tasks without dead-end focus traps

## Severity Rules

- `Critical`: user cannot continue or data/action is unsafe
- `High`: user completes only with facilitator help
- `Medium`: user completes with repeated confusion or extra steps
- `Low`: cosmetic or readability issue with low task impact

Release rule:

- Any `Critical` issue blocks release.
- More than 2 `High` issues in core setup path blocks release.

## Scenario Checklist (10)

| ID | Task | Route | Target Time | Pass Condition |
|---|---|---|---|---|
| S1 | Sign in and reach dashboard | `/signin` -> `/dashboard` | <= 2 min | User reaches dashboard without facilitator instruction |
| S2 | Confirm BAND waiting status (pending mode) | `/dashboard` | <= 1 min | User understands BAND is waiting for approval, not failed |
| S3 | Open BAND page and read waiting guidance (pending mode) | `/band` | <= 1 min | User can explain what action is possible now (Drive/Mail first) |
| S4 | Connect Google Drive | `/dashboard` or `/drive` | <= 3 min | Drive status changes to Connected |
| S5 | Search Drive file | `/drive` | <= 2 min | User executes search and identifies one result |
| S6 | Upload Drive file | `/drive` | <= 2 min | Upload success message appears and file shows in list |
| S7 | Connect Gmail | `/mail` | <= 3 min | Gmail status changes to Connected |
| S8 | Connect personal Naver Mail | `/mail` | <= 4 min | User enters email + app password and status becomes Connected |
| S9 | Open one mail preview | `/mail` | <= 2 min | User selects a message and reads preview panel |
| S10 | Recover from reconnect/error state | `/dashboard` or `/mail` | <= 3 min | User reads message and retries successfully without help |

## Accessibility Assertions Per Scenario

For each scenario, verify:

1. Main action button is visually dominant and unique.
2. Current status text is explicit (`연결 완료`, `미연결`, `재연결 필요`, `오류`, `심사중`).
3. Error text includes next action.
4. Focus ring is clearly visible with keyboard navigation.
5. Form fields have explicit labels.
6. Success/error status updates are announced in a live region.

## Data Capture Template

Use one row per participant per scenario.

| Participant | Scenario | Completed (Y/N) | Time (sec) | Help needed (Y/N) | Confusion trigger | Severity | Fix proposal |
|---|---|---|---|---|---|---|---|

## Reporting Summary Template

- Total completion rate:
- No-help completion rate:
- Average setup time:
- Critical issues:
- High issues:
- Recommended blocking fixes:
- Recommended next-iteration improvements:

## Fix Prioritization

1. Remove ambiguity in labels for connect actions.
2. Reduce text density and keep only one primary action per step.
3. Improve error wording to include exact recovery instruction.
4. Increase contrast and font size where scanning fails.
5. Re-test failed scenarios with new participants.
