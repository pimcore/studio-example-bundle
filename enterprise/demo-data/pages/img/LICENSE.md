# Pictures of the content pages: what they are and their license

The pictures `coaster-demo:setup` puts on the demo portal's pages "About the park", "Working with the Kingdom" and
"Safety first" (F161). The pages name them in their image lines (`![alt](file)`); setup uploads them into
`/Pimcore Kingdom/Pages`.

| File | Page | What it shows |
|---|---|---|
| `about-park-hero.svg` | About the park (hero) | The park's castle beside a coaster with a lift hill and a loop |
| `about-craft.svg` | About the park | A track section drawn on graph paper with its supports and measurements, a wrench and a pencil |
| `working-hero.svg` | Working with the Kingdom (hero) | A ride brief and three revisions of the design, the newest approved |
| `working-review.svg` | Working with the Kingdom | The park's ride team and a supplier going over a track drawing at one table |
| `safety-hero.svg` | Safety first (hero) | A coaster train with every restraint closed, in front of a shield with a check mark |
| `safety-limits.svg` | Safety first | A track whose highest point stays under the brief's dashed height limit |

`images.json` lists each file's source: `own` (drawn for this demo) or `coaster-render` (a render or screenshot of a
ride from the coaster demo's own viewer, with the ride, how it was made and a credit line the page shows as the
caption). All files here are `own` now. Pimcore's brand images and stock photos are not used: this bundle is a public
reference example. `enterprise/tests/coaster-page-pictures.test.mjs` checks the list, the alt texts and the weights
(an SVG at most 40 KB, with no script, event attribute, external reference or embedded bitmap; a hero at most
150 KB; a page's pictures at most 300 KB together).

## License

Own-made for the Pimcore Kingdom demo of the 2026.3 Portal Engine talk; not the Pimcore mark and not derived from
it. Released under CC0 1.0 (public domain dedication): use them freely, no attribution needed.
