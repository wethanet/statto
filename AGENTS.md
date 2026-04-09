# AGENTS.md

## Purpose

This file tells coding agents how to work in this repository.

Optimize for:
- small, safe changes
- clear reasoning
- maintainable code
- consistency with existing patterns
- minimal surprise for human reviewers

Do not optimize for:
- cleverness
- unnecessary abstractions
- large refactors without explicit instruction
- introducing new dependencies without a strong reason

---

## Project Overview

This is a browser-first application built with:
- Vite
- React
- TypeScript
- React Router

Primary goals:
- keep the app simple to run locally
- preserve a clean browser-first developer experience
- maintain clear routing, component structure, and predictable state flow

---

## Working Rules

### 1. Make the smallest reasonable change
Prefer narrow, targeted edits over sweeping rewrites.

When solving a task:
- first understand the existing pattern
- follow the local convention
- modify only the files required
- avoid unrelated cleanup

### 2. Do not invent architecture
Do not add:
- new state management libraries
- dependency injection
- custom build systems
- complex folder reorganizations
- generic utility layers nobody asked for

Unless explicitly requested, prefer straightforward code over “future-proof” complexity.

### 3. Preserve developer ergonomics
Changes should keep the project easy to:
- run
- debug
- review
- extend

If a solution makes the codebase more confusing, it is probably the wrong solution.

### 4. Explain tradeoffs clearly
When making non-obvious changes, document:
- what changed
- why it changed
- any risks or follow-up work

Do not pretend certainty when uncertainty exists.

---

## Repository Expectations

### App structure
Prefer this mental model:
- `app/` for routes and screens
- `components/` for reusable UI
- `lib/` for helpers, API clients, utilities
- `constants/` for design tokens and shared constants
- `assets/` for static assets

Follow the existing structure if it differs.

### Routing
Use the existing React Router setup in `web/src/app/router.tsx`.
- Keep route files focused on screen composition
- Move reusable logic/UI out of route files when it improves clarity

### Components
Components should be:
- small
- readable
- typed
- easy to test
- composed rather than overly abstract

Avoid massive components with mixed concerns.

### State
Unless otherwise specified:
- keep state local when possible
- avoid global state unless there is a real cross-screen need
- prefer simple patterns over elaborate ones

### Styling
Follow the styling approach already used in the repo.

If no clear pattern exists:
- keep styles local and readable
- prefer consistency over novelty
- avoid introducing a new styling library without approval

---

## TypeScript Standards

- Use TypeScript for all new code
- Prefer explicit types where they improve clarity
- Avoid `any` unless truly unavoidable
- Prefer narrow types over broad ones
- Let inference do the work when it keeps code readable

When handling nullable or optional values:
- be explicit
- fail safely
- avoid hidden runtime assumptions

---

## Dependency Policy

Do not add a dependency unless:
1. it is clearly justified
2. the benefit outweighs the maintenance cost
3. the task cannot be solved reasonably without it

If adding a dependency:
- choose well-maintained, standard options
- explain why it is needed
- keep the addition minimal

---

## Environment and Configuration

When working with environment variables:
- use `VITE_` only for values intended for client exposure
- never hardcode secrets
- update `.env.example` when adding new environment variables
- prefer safe fallbacks where appropriate

Do not commit secrets or sensitive values.

---

## API and Data Fetching

When adding or updating API interactions:
- keep API code centralized where practical
- handle loading and error states
- avoid duplicating request logic
- prefer predictable, typed response handling

Do not silently swallow errors.

If mocking or stubbing is needed, make it obvious.

---

## Error Handling

Prefer:
- explicit error states
- useful messages
- safe fallbacks

Avoid:
- empty catch blocks
- hidden failures
- vague “something went wrong” handling without context

---

## Performance Guidance

Only optimize performance when:
- it is part of the task
- there is an obvious issue
- the existing code makes performance problems likely

Do not add premature optimization.
Do not trade readability for tiny theoretical gains.

That said:
- avoid unnecessary re-renders when obvious
- avoid creating huge inline structures in hot paths
- be sensible with effects and memoization

---

## Testing and Validation

Before finishing work, validate changes as much as possible.

Preferred checks:
- app runs
- TypeScript passes
- lint passes
- relevant tests pass

If tests exist, update them when behavior changes.

If no tests exist:
- do not add a giant testing framework change unless asked
- consider lightweight tests only when they directly support the task

If you could not run validation, say so clearly.

---

## Safe Change Workflow

When implementing a task, follow this order:

1. Read the relevant files first
2. Understand the local pattern
3. Make the smallest effective change
4. Run relevant checks if available
5. Summarize:
   - files changed
   - behavior changed
   - validation performed
   - any follow-up risks

---

## What To Avoid

Do not:
- rewrite unrelated files
- rename files casually
- move folders without a strong reason
- change public behavior without noting it
- introduce breaking changes silently
- add TODO noise everywhere
- leave dead code behind
- fake completion when validation did not happen

Also do not “improve” formatting across the repository unless the task is specifically about formatting.

---

## File Edit Guidelines

When editing files:
- preserve existing style
- preserve naming conventions
- preserve comments unless they are incorrect
- avoid churn in imports and formatting
- keep diffs review-friendly

If creating a new file:
- place it in the most obvious location
- use a clear, conventional name
- keep the initial implementation minimal

---

## Communication Style for Agents

When reporting work:
- be concise
- be factual
- mention uncertainty when relevant
- mention validation performed
- mention anything the human should review manually

Good summary format:
- what changed
- why
- how it was validated
- any known risks

---

## Definition of Done

A task is done when:
- the requested change is implemented
- the change matches repository conventions
- unnecessary changes were avoided
- validation was performed where possible
- the result is clearly summarized

---

## If Requirements Are Ambiguous

If the request is ambiguous, prefer:
- the most conservative interpretation
- the least destructive change
- the solution most consistent with the current codebase

Do not assume permission for broad refactors.

---

## Human Review Flags

Call out explicitly if:
- a dependency was added
- a config file changed
- routing changed
- environment variables changed
- behavior changed across multiple screens
- validation could not be completed

---

## Default Bias

This repository prefers:
- pragmatic code
- simple patterns
- readable diffs
- low-risk changes
- shipping over showing off

No circus tricks.
