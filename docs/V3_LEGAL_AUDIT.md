# V3 legal audit

Review date: 2026-08-14. This is an implementation audit, not legal advice.

## Confirmed locally

- One canonical operator config: `src/config/legal.ts`; no duplicate placeholder identity was introduced.
- Policy and consent are separate legal routes and the V3 form uses separate unchecked controls.
- Consent evidence is versioned and written through the server-controlled consent journal.
- Analytics remains consent-gated; cookie reject/settings/withdrawal are preserved.
- Public form remains behind CSRF, validation, honeypot and rate limiting.
- Merge-marker and legal-placeholder tests pass.

## Current-law checks

- Article 9 of 152-FZ requires consent to be specific and separately оформлено from other confirmed documents; the separate V3 consent control and document match this UI requirement.
- Article 18(5), as amended by 23-FZ and effective from 2025-07-01, restricts initial collection/storage of Russian citizens’ data to databases in Russia, subject to statutory exceptions.
- Policy guidance recommends explicit purposes, data categories, processors, retention/termination conditions and subject rights; these are present in the central legal pages but infrastructure facts must remain current.

Sources: [152-FZ, Article 9](https://www.consultant.ru/document/cons_doc_LAW_61801/6c94959bc017ac80140621762d2ac59f6006b08c/), [152-FZ, Article 18](https://www.consultant.ru/document/cons_doc_LAW_61801/cbf4e15b7c330f9372e876cdf2bc928bad7950ef/), [Federal Law 23-FZ official publication](https://publication.pravo.gov.ru/document/0001202502280034), [policy drafting recommendations](https://www.consultant.ru/document/cons_doc_LAW_221615/).

## Owner actions before production

1. Confirm the production Supabase project region and the actual first-write path. `LEGAL.processors.supabase.region` is still `unknown`; this is a release blocker for Russian data-localisation confidence.
2. Confirm Roskomnadzor operator-notification status and that the register entry matches current purposes, processors and database locations.
3. Confirm whether Telegram or any other foreign processor receives personal data and, if so, complete the required cross-border assessment/notification before transfer.
4. Confirm retention periods against actual operational practice and deletion jobs.
5. Confirm publication and brand/people/music rights for the 89 portfolio videos.
