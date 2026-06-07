---
name: legacy-php-refactor
description: Use when refactoring legacy PHP, PHP7, procedural code, monolithic templates, old JavaScript, jQuery, mixed PHP/HTML files, or fragile production code.
---

# Legacy PHP Refactor

Main rule: do not break existing behavior.

Process:
1. Read the current flow.
2. Identify globals, form fields, selectors, backend actions and database writes.
3. Make the smallest safe improvement.
4. Preserve compatibility with the current PHP version.
5. Keep fallback behavior.

Output: what changed, what was preserved, risk level, tests.
