# Design - Broadcast (Social Media Studio)

Product-specific visual system. Overrides palette/mark from Checkpoint Signal teal.
Harness (Lenis, motion, README, git) still follows `capstone-signal-design`.

## Metaphor

**Broadcast Frame** - crop frames, aspect chips, live corner status.

## Palette

| Token | Hex |
|-------|-----|
| Canvas | `#F7F8FC` |
| Surface | `#FFFFFF` |
| Ink | `#101828` |
| Muted | `#667085` |
| Line | `#E4E7EC` |
| Primary | `#E11D48` |
| Bright | `#FB7185` |
| Fog | `#FFE4E8` |

## Typography

- Display: Syne
- Body: Figtree
- Mono: IBM Plex Mono

## Brand mark

Rounded crop frame with a rose live corner dot. `BrandMark.tsx` === `favicon.svg`.

## Hero art

`components/HeroArt.tsx` draws both hero panels as inline SVG with a fixed
viewBox and `preserveAspectRatio`, so the art scales without distorting at any
viewport. Left panel is the 1:1 Instagram frame, right panel is the 16:9 X frame
plus a published status card.

## Generated post artwork

`lib/images/variants.ts` renders one master per campaign from a curated duotone
list (seeded by campaign id, so two campaigns never look alike), keeps the
subject inside the tightest platform crop, then burns a caption card with the
post title, platform, aspect, and source domain onto each variant. Previews in
the campaign desk use the true platform aspect with `object-fit: contain`, so a
1:1 render is never shown stretched into a 16:9 box.

## Feedback

Every action reports itself: toasts for accepted, queued, delivered, and failed
states; a timestamped activity log; a spinner on posts awaiting a signed
delivery webhook; and a durable worker heartbeat that can be switched off to
inspect the queued state.

## Rules

See `.cursor/skills/capstone-broadcast-design` and Capstones harness skill.
No em dashes. No Signal teal as primary.
