# Pimcore Kingdom branding: what it is and its license

The logo and brand colours `coaster-demo:setup` gives the demo portal (DR-P22 items 2 and 5).

| File | What it is |
|---|---|
| `pimcore-kingdom-logo.svg` | The mark: a castle with a coaster track in front of it and the words "Pimcore Kingdom". Its shapes use `currentColor`, so the portal header (which inlines SVG logos) draws them in `brand_primary`; the track is the accent, a darker purple. |
| `pimcore-kingdom-logo.png` | The same mark at 472×96 in the brand colours, for places that go through Pimcore's thumbnail pipeline or cannot inline SVG (e-mails). Rendered from the SVG with ImageMagick: `convert -background none -density 288 <svg with currentColor set to #6428b4> -resize 472x96 -depth 8 -strip PNG32:pimcore-kingdom-logo.png`. |

Setup uploads both into `/Pimcore Kingdom/Branding` and sets the portal's `logo` editable to the SVG,
`brand_primary` to `#6428b4` (Pimcore Purple, the talk slides' colour) and `brand_accent` to `#502090` (its
darker shade, the slides' hover purple). White text on either colour,
and either colour as text on the white header, has a contrast of at least 4.5:1
(`enterprise/tests/coaster-branding.test.mjs` computes it).

## License

Own-made for the Pimcore Kingdom demo of the 2026.3 Portal Engine talk; not the Pimcore mark and not derived from
it. Released under CC0 1.0 (public domain dedication): use it freely, no attribution needed.
