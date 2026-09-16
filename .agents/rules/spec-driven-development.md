# Spec-Driven Development Protocol

> MANDATORY RULE: No "Vibe Coding". No Assumptions.

1. **The Contract:**
   - Before writing any business logic or UI code for a new feature, a machine-readable specification MUST exist.
   - Check for DESIGN.md (for UI) or ARCHITECTURE.md (for backend/system).

2. **Enforcement:**
   - If the spec does not exist, you MUST halt coding and tell the user: "Tasarım/Mimari şartnamesi eksik. Lütfen önce bunu oluşturalım."
   - If the spec exists, ALL code generated must strictly adhere to the constraints defined in it. Do not hallucinate or invent new patterns outside the spec.
