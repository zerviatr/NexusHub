# Global Technology Preferences

> MANDATORY RULE: Apply these technology constraints to all code generation and project scaffolding.

1. **Runtime & Package Manager:** 
   - ALWAYS use un instead of 
pm, yarn, or pnpm for Node/JS/TS projects.
   - Use un init, un install, un add, and un run.

2. **Tooling & Oxidation:**
   - Prefer Rust-based tooling.
   - ALWAYS use iome instead of eslint or prettier for linting and formatting.
   - Use ite with swc for frontend scaffolding. Avoid legacy Webpack or Babel.
