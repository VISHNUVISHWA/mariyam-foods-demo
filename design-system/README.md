# Mariyam Foods

Homemade traditional snacks, made by hand in small batches. This system takes the warmth of the logo and sets it in a modern, premium digital world: real food craft, floating in deep forest light.

## Brand idea

**Traditional hands, futuristic care.** The recipes are old. The way we show them is new: live batch tracking, snacks you can spin in 3D, and a store that tells you exactly when your murukku was fried.

## Content fundamentals

Write the way a confident home cook talks. Short sentences, plain words, real details.

- **Name the craft.** Say "hand-twisted" and "fried in gingelly oil". Avoid "artisanal" and "gourmet".
- **Use snack names as they are.** Kai Murukku, Adhirasam, Thattai. Never translate them away or put them in quotes.
- **Be specific about time.** "Fried 2 days ago" beats "fresh". "28 days of freshness left" beats "long shelf life".
- **Buttons say what happens.** "Add to cart", "Build a tin", "Place order". A toast confirms it: "Kai Murukku added to cart".
- **Errors say how to fix it.** "Enter a 6 digit PIN code."
- **Prices** use ₹ with Indian digit grouping: ₹1,240. Weights use a space: 250 g.

## Visual foundations

**Colour.** Every colour comes from the logo. Night is the primary theme: the emblem's green taken almost to black, so gold and fried food glow against it. Ivory is the daylight alternative and the logo's natural ground. `turmeric`, `marigold` and `amber` form the gold sweep used on primary buttons and one italic headline phrase per view. Food supplies the rest of the warmth, so keep UI gold to one primary action per region.

**Type.** `display` (Gloock) carries headlines and echoes the heavy soft serif of the Mariyam wordmark. `accent` (Instrument Serif italic) sets one phrase inside a headline and echoes the italic Foods. `sans` (Figtree) handles running text and controls. `mono` (Geist Mono) handles batch codes, pack weights and prices, and is the source of the system's precise, futuristic voice.

**Shape.** Pills for actions, `radius-lg` for product cards, `radius-xl` for feature panels. The signature shape is the arch from the logo's emblem, drawn as one luminous gold line behind hero objects.

**Depth.** Glass (`glass` plus backdrop blur) is reserved for things floating above the page: the nav, the cart drawer and search. Page-level surfaces stay opaque.

**Motion.** Slow float and spin on snacks. Cards lift 4px with a soft gold spotlight that follows the cursor. Everything respects `prefers-reduced-motion`.

**Food imagery.** Snacks always sit on transparent ground with warm top-left light and no props. Real photography should keep that treatment when it replaces the demo's 3D renders.

## Iconography

Thin outline icons at 1.8px stroke with round caps, drawn in `currentColor` at 20px inside a 44px target. No emoji. No filled icons, except the cart count badge.

## Logo use

| File | Use it on |
| --- | --- |
| `logo-full` | Ivory and light grounds |
| `logo-reversed` | Night and dark grounds. The wordmark is recoloured to ivory and gold so it stays legible |
| `emblem` | Favicon, tin label, small spaces |

Keep clear space equal to the height of the leaf around the logo. Do not recolour the emblem, stretch it or place it on busy imagery.

## Signature patterns

- **Freshness meter.** Every product shows its batch code, frying date and remaining freshness.
- **360 product stage.** A draggable 3D snack on a glowing ring.
- **Build a tin.** Four slots, live price and a full-tin saving.

## Accessibility

Text meets 4.5:1 on its intended ground in both themes. On Ivory, `accent` shifts to caramel because turmeric text fails contrast there. Primary buttons always use `on-turmeric` text. Every control has a visible `accent` focus ring and a 38px minimum target.
