# Phase F: Reviewer Workflow

Generic `Reviewer` role (four sub-roles: operator, human_validator, specialist_partner, internal_validator), per the follow-up prompt's Section 10 and Section 9. Evan is a possible future row in the `reviewers` table with role `human_validator`, nothing in the schema or the workflow logic references him by name or assumes his participation.

## What a reviewer can do, all as ReviewDecision rows, never a bare boolean

Inspect a finding and its evidence, then one of: accept, reject, modify (severity/confidence/description), request more evidence, perform and record a controlled test (creates an Evidence row at E2/E3), record reasoning (required on every decision, not optional), upgrade evidence, downgrade confidence, leave an audit note.

Every one of these actions is a row in `review_decisions`, append-only. The Finding's current state (severity, confidence, evidence_level, status) is a derived view of "the latest applicable decision," the history is never overwritten.

## During the development and synthetic-testing phase specifically

Use an `internal_validator` reviewer row (could be Hillary, could be a second Claude session, could be a rubric-based scripted check) to run the ten synthetic systems (Phase G) through the full pipeline including the review gate. This validates the *methodology and the software*, independent of whether Evan or any specific named person is available, per the follow-up prompt's explicit instruction not to make development wait on that.

## Reviewer decision quality check, carried over from the earlier research thread

"Would a competent security practitioner sign off on this finding?" is the right test for whether a *specific person* is ready to be assigned as a `human_validator` reviewer, per the still-open question in the decision brief (Section 19.6). It is a gate on assigning a real name to real client-facing findings, not a gate on building or testing the software itself.
