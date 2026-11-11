# taste-skill (vendored subset)

Source: https://github.com/leonxlnx/taste-skill (MIT), skill `design-taste-frontend` 2.5.1.

Only `SKILL.md`, `references/` and `library/` are kept here (about 0.5 MB). The kit's `scripts/` and `assets/`
(about 40 MB: gate, checkers, effects, photo fetcher) are left out of this repository. Clone the upstream
repository when you need them.

How it is used in Ghanimat: the skill targets marketing websites, so its page gate (one section per screen,
hero rules) does not apply to a dense admin panel. The rules that do apply and are followed here:
real photographs instead of letter placeholders (licensed stand-ins from Wikimedia Commons, credited in
`public/products/CREDITS.md`), no readable sign or logo of another business in a photo, no violet in the
panel's own design, buttons that step on hover and press on click, a 2px lift on linked cards, 44px touch
targets, visible focus, text contrast at AA, and everything at rest under reduced motion.
