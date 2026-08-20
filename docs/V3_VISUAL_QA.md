# V3 visual QA

## Reference transfer

| Reference | Transferred | Adapted / rejected |
|---|---|---|
| Main 01 / CYBR | technical white, hard grid, micro labels, violet signal | generic cube and decorative system metrics rejected; real video replaces the object |
| Main 02 / product hero | rounded segmented nav, unequal cells, dark utility/CTA, orange glow | physical product replaced with source-confirmed showreel |
| Portfolio / OPEN | large media + compact project information rows | converted to responsive asymmetric project groups |
| Portfolio / MARKEL | black gutters, white technical cells, warm contamination | brand imagery not reused |
| Portfolio / posters | monochrome/editorial contrast, orange/violet bars | constant grain and fake poster content rejected |
| Portfolio / Mindpalace | cinematic dark outro, outline display, orange CTA | glass restrained to navigation/media controls |

## Browser QA status

Passed locally on 2026-08-14 using the V3 UI and source-confirmed media; the same revision then passed a production build and HTTP smoke check.

- Home overflow matrix: 1600, 1440, 1280, 1024, 768, 430, 390 and 360 px — no horizontal overflow after two fixes (checkbox width scope and mobile heading min-content sizing).
- Mobile route matrix at 430, 390 and 360 px: portfolio index, portrait project, broadcast, prices, calculator, cases and blog — no horizontal overflow.
- Desktop routes checked at 1280 px: home, portfolio index, camera, post, color, broadcast category, project, broadcast landing, prices, calculator, cases and blog.
- Portrait project check: five `9:16` players render with the portrait class; only the first visible iframe is instantiated lazily.
- Header mobile menu opens with the full public journey. Contact form exposes separate required policy and consent controls.
- Browser console: no errors or warnings during the route walkthrough.
- Production server smoke: primary public routes return 200; legacy portfolio routes return 301; `/account` returns `X-Robots-Tag: noindex, nofollow`.

## Captures

- `docs/qa/home-desktop-1440.png`
- `docs/qa/home-mobile-390.png`
- `docs/qa/portfolio-desktop-1280.png`
- `docs/qa/portfolio-mobile-390.png`
- `docs/qa/project-portrait-mobile-390.png`
- `docs/qa/cases-desktop-1280.png`
- `docs/qa/blog-desktop-1280.png`

## V3.1 HOME ESCALATION

### What was weak

The V3 hero had correct content and hierarchy, but the showreel behaved like a conventional portfolio card. Its media footprint was too small, most technical labels were peripheral decoration, the giant empty field controlled the first screen, and the navbar appeared more assertive than the actual production work.

### Concept comparison

| Concept | Result | Decision |
|---|---|---|
| A — Product Monitor | 76vw source-confirmed showreel, physical technical shell, giant type behind the media, hot orange/red light field | **Selected** |
| B — Full Bleed Frame | strongest cinema footprint at 94vw, but the image stopped reading as a distinct product and lost too much shell hierarchy | rejected |
| C — Technical Instrument | strongest CYBR grid density, but the 66vw media object again felt too controlled and left a quiet field on the left | rejected |

Concept captures: `home-v31-concept-a-1440.png`, `home-v31-concept-b-1440.png`, `home-v31-concept-c-1440.png`.

### Winner and hierarchy changes

- The real website showreel is now the dominant object: 76vw on desktop and `calc(100vw - 20px)` on mobile.
- The hero increased from a safe 12-column composition to a 112svh broken-grid scene. The media plane overlaps the identity typography and is allowed to bleed across the underlying grid.
- Main 01 is expressed through structural coordinate rails, crosshair axes, frame corners, module lines, system state labels and a visibly active orange hardware state in the navbar.
- Main 02 is expressed through a central illuminated product object that nearly touches the control shell, with a warm white core, orange bloom and red spill controlling the composition.
- `YELYGINN` is now a 20.2vw image layer behind the showreel. `CAMERA / POST` replaces the secondary serif `VIDEO` treatment.
- The play action is an edge-mounted target/crosshair control rather than a centered glass pill.
- Supporting copy and both project actions remain secondary, but are visible in the first desktop screen as overlay modules.
- The first transition is now orange signal tape into a near-black Selected Work field. The homepage shows five large alternating projects rather than nine small cards.
- Camera returns to technical white; Post moves to near-black, strengthening the light-to-dark production journey.

### V3.1 QA captures

- `docs/qa/home-v31-final-1600.png`
- `docs/qa/home-v31-final-1440.png`
- `docs/qa/home-v31-final-1280.png`
- `docs/qa/home-v31-final-768.png`
- `docs/qa/home-v31-final-390.png`
- `docs/qa/home-v31-transition-1440.png`
- `docs/qa/home-v31-selected-work-1440.png`

All five required final widths have no horizontal overflow. At 768px and below the navbar uses the compact hardware/mobile state. Reduced-motion mode disables the hero entry animations.

## V3.2 FOCUS GATE

### Direction

- The first screen is now a full-viewport real showreel field rather than a framed card.
- A reference-guided Nikon D700 with 24–70mm f/2.8 sits in the foreground as a single persistent object. Pointer movement updates the reveal position, camera light and restrained perspective; touch/reduced-motion modes remain stable without requiring hover.
- The display hierarchy is `КАМЕРА. / МОНТАЖ. / ЦВЕТ.` with near-black, bone, signal orange and a small violet system accent.
- Clicking `SHOWREEL / SOUND` switches the same Kinescope source to an explicit player state and exposes a close control.
- Below the fold, only supplied working material is used: a raw/final SIBUR comparison, DaVinci node graph, portrait edit crop, BTS of Yuri, live cameras and gimbal.

### Responsive and route QA

- Exact viewports: 1720×1100, 1440×1000, 1280×900, 1024×900, 768×900, 430×932, 390×844 and 360×800.
- Every viewport passed with no user-scrollable horizontal overflow, no broken images and no page errors.
- Header grid defects at 1440/1024 and portrait-proof min-width overflow at 430/390/360 were found during visual QA and fixed.
- Route matrix returned 200 with correct page titles/headings and no broken images for home, portfolio, landscape project, portrait project, SIBUR project, camera, post, broadcast, prices, calculator, cases, the static blog entry and the home About anchor.
- In-app interaction check passed: pointer movement changes the reveal/light CSS state; `SHOWREEL / SOUND` enters the sound player and `ЗАКРЫТЬ ПЛЕЕР` restores the ambient muted loop.
- `npm run check` passed: TypeScript, 40 unit tests, 5 integration tests, production build and asset budget.

### V3.2 captures

- `docs/qa/v32-home-1720x1100.png`
- `docs/qa/v32-home-1440x1000.png`
- `docs/qa/v32-home-1280x900.png`
- `docs/qa/v32-home-1024x900.png`
- `docs/qa/v32-home-768x900.png`
- `docs/qa/v32-home-430x932.png`
- `docs/qa/v32-home-390x844.png`
- `docs/qa/v32-home-360x800.png`
- `docs/qa/v32-home-proof-1440x1000.png`
- `docs/qa/v32-home-proof-390x844.png`
- `docs/qa/v32-portfolio-desktop-1440x1000.png`
- `docs/qa/v32-sibur-project-desktop-1440x1000.png`
- `docs/qa/v32-broadcast-desktop-1440x1000.png`
