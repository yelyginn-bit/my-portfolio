# YELYGINN design system

## Foundations

- React tokens and responsive primitives: `src/design-system.css`.
- Static service/article normalization: `public/site-skin.css`.
- Brand, contacts, service summaries and editable photo metrics: `src/config/site.ts`.
- Public prices used by the homepage and price page: `src/lib/pricing.data.ts`.
- Layout and chrome components: `src/components/site/Layout.tsx`.

The layout uses 12 columns above 1280 px, 8 columns for tablet compositions and
4 columns below 768 px. The content width is capped at 1320 px inside a 1440 px
design container. All main spacing is based on the shared token scale.

## Components

`PageContainer`, `Section`, `Grid`, `GridItem`, `ContentColumn`, `MediaColumn`,
`SectionHeader`, `Eyebrow`, `Divider`, `Stack`, `Cluster`, `SiteHeader`,
`MobileMenu` and `SiteFooter` form the shared public-page layer.

Legacy SEO pages keep their HTML content and URLs. `public/site-shell.js` replaces
their visible header/footer with the same navigation and dynamically calculated
year, while `site-skin.css` maps their existing section/card classes to the new
editorial grid.

## Content requiring owner confirmation

The following existing photo claims were not changed or invented. They remain in
`PHOTO_METRICS` contains conservative editable public indicators and should be reviewed before
being treated as documented commercial facts:

- 7+ years of experience;
- 300+ projects;
- 40+ brands;
- preview delivery within 48 hours.

## Rules

- Use `YELYGINN` as the only public wordmark.
- Use red only for actions, current state and small information markers.
- Avoid nested cards, decorative glass and large radii.
- Use media aspect ratios and explicit dimensions to prevent layout shift.
- Every interactive control must keep a visible focus state and a 44 px target.
- Motion must degrade through `prefers-reduced-motion`.
