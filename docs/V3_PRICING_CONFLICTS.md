# V3 pricing conflicts

No numeric business logic was changed.

Observed active entry points include: editing Reels 5,000 ₽; YouTube editing 15,000 ₽; Reels shooting block 22,000 ₽; Reels package 35,000 ₽; event 25,000 ₽; operator + equipment 35,000 ₽; color grading 10,000 ₽; marketplace 35,000 ₽; commercial production 70,000 ₽.

Conflicts / inactive-product issues:

- `src/lib/pricing.data.ts` and `/ceny` still include photo (8,000 ₽/hour; studio 18,000 ₽) and Content Day (60,000 ₽), while V3 hides photo and does not promote Content Day.
- `index.html` contains historical structured price offers that do not fully match the visible current price page.
- Calculator ranges are independent from some marketing “from” values.
- Existing portfolio links use `/portfolio/editing`; the server now redirects this to `/portfolio/post`.

Owner decision required before changing or removing any price or dormant offering.
