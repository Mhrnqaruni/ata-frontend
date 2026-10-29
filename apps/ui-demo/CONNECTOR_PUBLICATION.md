# ATA complete frontend-only UI demo

This branch is reserved for the ATA UI prototype requested from the Version 1.0 product brief.

The completed prototype contains 192 routed screens across public/authentication, teacher, assessment, quiz, organization, school-connected parent, family/home-education, tutor, learner, platform-administration and safeguarding experiences.

The implementation is frontend-only: representative mock data, browser hash routing, local interactions and local mock exports. It does not introduce backend, authentication, payment, AI-provider or integration dependencies.

## Validation completed

- 192/192 route renderers completed successfully.
- 157 literal internal navigation targets were checked; none were missing.
- Desktop Chromium sweep: zero route failures, page errors, console errors or document-level horizontal overflow.
- 390 px mobile sweep: zero route failures, page errors, console errors or document-level horizontal overflow.
- Sixteen core interaction assertions passed.

The maintainable source is located in this branch under `apps/ui-demo/` when the full branch publication succeeds. Run it from the repository root with:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173/apps/ui-demo/#/welcome`.

The existing application and default branch are intentionally left untouched until review.
