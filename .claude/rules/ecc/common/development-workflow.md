# Development Workflow

> This file extends [common/git-workflow.md](./git-workflow.md) with the full feature development process that happens before git operations.

The Feature Implementation Workflow describes the development pipeline: research, planning, checking, code review, and then committing to git.

## Feature Implementation Workflow

0. **Look for what already exists** _(before any new feature)_
   - Check whether the browser, the site's own code, or a free library already does it.
   - Prefer reusing or adapting something that works over writing it from scratch.

1. **Plan First**
   - Use **planner** agent to create implementation plan
   - Generate planning docs before coding: PRD, architecture, system_design, tech_doc, task_list
   - Identify dependencies and risks
   - Break down into phases

2. **Check your work**
   - Run `node tools/validate.mjs 60` for lesson and template changes.
   - Try the change in a browser (the Operandi site has no unit-test framework).

3. **Code Review**
   - For large changes, use the **code-reviewer** agent
   - Address CRITICAL and HIGH issues
   - Fix MEDIUM issues when possible

4. **Commit & Push**
   - Detailed commit messages
   - Follow conventional commits format
   - See [git-workflow.md](./git-workflow.md) for commit message format and PR process

5. **Pre-Review Checks**
   - Verify all automated checks (CI/CD) are passing
   - Resolve any merge conflicts
   - Ensure branch is up to date with target branch
   - Only request review after these checks pass
