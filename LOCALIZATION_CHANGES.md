# HCCS Website — Chinese Localization: Changes & Outstanding Items

Source spec: Google Doc "HCCS Website — Chinese Localization & Cleanup — Edit Specification"
Codebase: `hccs-master/` (Next.js 16, i18n via `locales/en.json` + `locales/zh.json` + `useLang()`)

---

## 1. Changes made — committed & pushed

Pushed to `git@github.com:bamah075/HCCS.git` and `git@github.com:nasirwork919-dot/HCS.git`, commits `5adf614` and `62feb5b`.

| Change | File(s) |
|---|---|
| Removed "No account required" text from both notes (EN+ZH) | [hccs-master/locales/en.json:531,567](hccs-master/locales/en.json#L531) / [zh.json](hccs-master/locales/zh.json#L531) |
| Added `deliverablesEyebrow` / `scopeEyebrow` / `runItNowEyebrow` locale keys and wired them into both cover pages (previously hardcoded English, ignored the language toggle) | [hccs-master/locales/en.json:533-535](hccs-master/locales/en.json#L533-L535), [app/compliance-scan-v1/page.tsx](hccs-master/app/compliance-scan-v1/page.tsx), [app/compliance-scan/page.tsx](hccs-master/app/compliance-scan/page.tsx) |
| Pricing toggle "Monthly"/"Annually" made language-aware (每个月/每年) | [hccs-master/app/membership/MembershipClient.tsx:61,77](hccs-master/app/membership/MembershipClient.tsx#L61) |
| Free plan price label language-aware (免费) | [MembershipClient.tsx:97](hccs-master/app/membership/MembershipClient.tsx#L97) |
| Price suffix (年/月) made language-aware | [MembershipClient.tsx:105-111](hccs-master/app/membership/MembershipClient.tsx#L105-L111) |
| Paid-plan CTA button — was hardcoded to always say "Get Started" regardless of language (pre-existing bug) — now shows 立即开始 in Chinese | [MembershipClient.tsx:124](hccs-master/app/membership/MembershipClient.tsx#L124) |
| S$199 promo price suffix made language-aware (/月) | [MembershipClient.tsx:193](hccs-master/app/membership/MembershipClient.tsx#L193) |
| Homepage "Trusted by…" logo band moved to after the testimonials section | [hccs-master/components/HomePageClient.tsx:291](hccs-master/components/HomePageClient.tsx#L291) |
| Floating WhatsApp button wired to the shared, language-aware label (previously hardcoded English only) | [HomePageClient.tsx:450](hccs-master/components/HomePageClient.tsx#L450) |
| Footer WhatsApp label corrected to "WhatsApp 我们" in Chinese | [hccs-master/locales/zh.json](hccs-master/locales/zh.json) (`footer.whatsapp`) |
| Try AIHR: "Live demo · no signup required" eyebrow deleted | [hccs-master/app/try-aihr/page.tsx](hccs-master/app/try-aihr/page.tsx) |
| Try AIHR: H1 made language-aware | [try-aihr/page.tsx:196](hccs-master/app/try-aihr/page.tsx#L196) |
| Removed `"regions": ["sin1"]` from vercel.json — Hobby-plan Vercel projects can't pin custom regions; this was the likely cause of the site 404ing in production despite successful builds | [hccs-master/vercel.json](hccs-master/vercel.json) |

## 2. Changes made — new this round, **not yet committed or pushed**

Verified with a full local `npm run build` (0 TypeScript errors, all 63 routes generated).

| Change | File(s) |
|---|---|
| Floating "Try Our NEW AIHR" trigger converted from a static PNG image (text was baked into the image pixels, un-translatable) to a real, language-aware text button | [HomePageClient.tsx:437-441](hccs-master/components/HomePageClient.tsx#L437-L441) |
| Try AIHR subline under H1 — now shows the correct Chinese text, language-aware | [try-aihr/page.tsx:199-201](hccs-master/app/try-aihr/page.tsx#L199-L201) |
| New "What is the AIHR Platform?" section authored (heading + paragraph), language-aware | [try-aihr/page.tsx:205-215](hccs-master/app/try-aihr/page.tsx#L205-L215) |
| New "Who Should Join the AIHR Platform?" section authored (heading + 5-item grid), language-aware | [try-aihr/page.tsx:217-244](hccs-master/app/try-aihr/page.tsx#L217-L244) |
| All 4 Try AIHR plan cards fully translated and made language-aware: titles, badges, taglines, price suffix, all 17 feature bullets, CTA buttons, the "Live"/"实时" pill, the loading state, the bottom CTA, and the disclaimer | [try-aihr/page.tsx:42-338](hccs-master/app/try-aihr/page.tsx#L42-L338) (the `TIERS` array plus its render logic) |

---

## 3. Items from the spec that do NOT exist in this codebase

I searched the entire repository exhaustively (English text, Chinese text, likely locale key names, case-insensitive, partial substrings) for each of these. They are confirmed absent — not hiding somewhere else in the code.

| Item | What the spec describes | What I need from the client |
|---|---|---|
| Yellow eyebrow "AIHR — Compliance-First Decision Intelligence" | A short eyebrow line above the "What is AIHR?" section, live on hccs.sg but not in this repo | Nothing to build — spec says to *delete* it, and it's already absent here. **No action needed.** |
| Homepage plan-strip Monthly/Yearly/Free/month toggle | A pricing toggle inside the homepage's "Your HR team. Plus AIHR" section | This toggle does not exist on the homepage in this codebase — the homepage AIHR section only shows 4 static tier-name cards with no pricing or toggle at all. **Need confirmation**: should a full pricing toggle be *built* here (new feature), or was this describing the Membership page toggle by mistake? |
| "HCCS SERVICES" eyebrow + "Our Services" heading (on homepage) | A duplicate eyebrow/heading pair on the homepage's services section | This exact pair exists in the code, but only on the **`/services`** and **`/employer`** pages — not the homepage. The homepage's actual services heading uses different text ("What we deliver" / "Strategic HR Solutions Built To Scale"). **Need clarification**: was the spec referring to `/services` or `/employer` instead of the homepage? |
| "Scope and Fit" text on service cards 01–09 | An English duplicate line meant to be deleted, keeping only the Chinese line | Does not exist anywhere in the codebase, in either language. **Need the client to confirm** where this text currently lives on the live site (a screenshot of the actual card showing it would let me find the equivalent element). |
| "Book a Session" yellow CTA box on service card 01 | A yellow box with "Book a Session" text inside it, reached by clicking into a service card | Does not exist anywhere in the codebase. The only "Book" text found is the generic nav bar button (labelled just "Book"/"预约咨询", not "Book a Session"). **Need the client to confirm**: is this the nav button, or a genuinely separate element only present on the live site? |
| "Stay informed" newsletter/mailing form with Submit button | An email signup form with a Submit button and a "please fill this field" validation message | The Chinese/English button *labels* exist as dead, unused locale keys (`subscribeNewsletter`, `subscribeNote`, `subscribeButton`) but there is no actual form, input field, or Submit button rendered anywhere in the code. **Need the client to confirm** which page this form is supposed to live on, so it can either be located (if it exists elsewhere) or built from scratch. |

### Why this matters
Earlier in this engagement I also found that the **live hccs.sg site itself has content that isn't in this repository at all** (e.g. before I added them, the Try AIHR page's "What is AIHR?" and "Who Should Join?" sections were live on hccs.sg but missing from this codebase). That strongly suggests **this repository may not be the current source of truth for the live site** — someone may have made direct edits elsewhere (a different repo, a different branch, or directly through a different deployment) that were never merged back here.

**What we need from the client:**
1. Confirmation of exactly which Git repository and branch currently deploys to the live `hccs.sg` domain (check the DNS/hosting provider or whoever manages that domain).
2. If it's a different repository than the two GitHub repos in this session, access to that repository so the two codebases can be reconciled — otherwise any further localization work risks being overwritten or never actually reaching the live site.

---

## 4. Reported but intentionally not changed (awaiting a decision)

| Item | Detail | What's needed |
|---|---|---|
| SSS company name | "Strategic Search Specialist (S) Pte Ltd" / EA Licence 23S2050 appears in exactly 3 places in each locale file: `home.services[4].description`, `home.heroEaLine`, `home.diff[0].body` ([en.json:208,270,285](hccs-master/locales/en.json#L208) / zh.json mirrored) | The exact Chinese legal company name to substitute, and confirmation of whether the EA Licence number should remain shown alongside it |
| Nav bar / footer alignment & font sizing | Nav items already share one uniform CSS class; footer column headings are already uniform size in code ([Navbar.tsx:54-62](hccs-master/components/Navbar.tsx#L54-L62), [Footer.tsx:12](hccs-master/components/Footer.tsx#L12)) | A screenshot of the actual visual misalignment on the live site, since the code itself doesn't show an obvious inconsistency to fix |
