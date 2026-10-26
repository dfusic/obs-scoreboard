---
name: feature
description: Runs a change (feature, bug fix, new design, colour scheme, refactor) through the project's agent flow - product spec, Trello card, design, implementation by the owning agent, reviews, tests, verification and a report. Use when the user runs /feature or asks to take a request through the full agent workflow.
argument-hint: <what to build or fix, plus any image path / Figma link / card link>
disable-model-invocation: true
---
Take this request through the OBS Scoreboard agent flow:

$ARGUMENTS

You are the orchestrator. You plan, brief the agents, pass results between them and keep the user informed. You don't do the agents' work yourself, except running the final checks. Agents start with no memory of this conversation, so every brief must stand on its own: the request in full, the card link, relevant decisions, files involved, image paths, and what to return.

If the request is empty or too vague to classify, ask the user what they want before doing anything.

## 1. Classify

Decide the type (Bug, Feature, Design, Chore, Docs) and the owner from what the change touches:

| The change is mainly… | Owner (implements) |
|---|---|
| Control pages: Live, Teams, Graphics, login, sidebar, control→overlay flow | `control-ux-reviewer` |
| A new overlay design or colour scheme (image, Figma, brief) | `design-maker` |
| Shared code: store interface, data model, `liveFeed`, firestore repos, rules, env/build config | `architect` |
| Tests only | `tester` |

A change across several areas has one owner per part. Tell the user in one or two lines what you understood and who will do what, then continue without waiting unless something is ambiguous.

## 2. Shape (product)

Run `product` for a Feature or Design: give it the request in full and ask for a spec in its proposal format (problem, value, the operator flow, what goes on air, scope and out of scope, acceptance criteria, effort, open questions). Skip this step for a Bug, Chore, Docs or tests-only change, or when the request already comes with a card that has acceptance criteria.

If the spec has open questions only the user can answer (behaviour on air, what to cut, cost), stop and ask the user with `product`'s recommendation. The agreed spec is the card's description and the brief for the design and implementation steps.

## 3. Card

Run `boarder`: create or reuse the card for this request with a full description (type, area label, owner, and `product`'s spec when there is one), move it to In progress, and return the link. Wait for the link before any code changes. Large requests can be split into linked cards, one per deliverable.

## 4. Design (when needed)

Run `architect` first when the change crosses layers, adds or changes stored data, changes the `DataStore` interface, changes how control and overlay communicate (draft / saved / on air), or touches rules, environments or deploys. Ask it for options, a recommendation and a concrete spec split per owner.

If the decision is the user's (product behaviour, cost, migrating live data, anything visible on air), stop and ask the user with the options and the recommendation. Have `boarder` record the decision on the card.

Skip this step for changes contained in one area.

## 5. Implement

Run the owner agent(s) with the card link, the request, the product spec and design spec if any, and the instruction to run `npm test` and `npm run build` before reporting.
- Parts with no overlapping files can run in parallel; otherwise run them in order (shared code first, then control, then overlay).
- For `design-maker`, pass the path of any reference image (an image pasted in the chat must be saved in the repo first, e.g. under `designs/`) or the Figma link.

## 6. Review and test

Run in parallel, picked from the files actually changed (`git diff --stat`):
- `offline-reviewer`: anything in `src/shared/` (store, types, normalize, firestore) or store calls in pages.
- `overlay-reviewer`: anything in `src/overlay/` or `src/shared/templates.ts`.
- `control-ux-reviewer` as reviewer: control-page changes it didn't make itself.
- `tester`: always, to cover the change with tests and walk the affected flow.

## 7. Fix loop

Send the findings that matter (bugs, rule violations, on-air risks) back to the owner agent with the reviewers' `file:line` notes, then re-run only the reviewers that had findings. Stop after 2 rounds. Report what's still open instead of looping. Ignore pure style nits unless they break a project rule.

## 8. Verify

Run `npm test` and `npm run build` yourself and read the result. Don't report success on an agent's word alone.

## 9. Record

Run `boarder` to comment on the card: what changed (files), decisions, review and test results, open items, and new cards for bugs found along the way. Leave the card in In progress: it moves to Staging and Prod on merge.

## 10. Report

Tell the user, briefly:
- the card link
- what changed and what the operator or viewer will see
- how it was verified (tests, build, browser or code only) and what wasn't checked
- open items and follow-up cards
- anything they must do: deploy Firestore rules first, decisions pending

Then offer to commit and open a PR into `staging` (feature branch → `staging` → `main`), with the card link in the PR description. Don't commit, push or open a PR unless the user says so.
