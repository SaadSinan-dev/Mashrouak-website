# Mashrouak.net — Real Image Sourcing Audit

## Current implementation status

The three previously bundled AI-generated 3D WebP images have been removed from the application and deleted from the project. Their component references, image-specific CSS, and the homepage image preload have also been removed.

| Removed asset | Former dimensions | Former placement | Current status |
|---|---:|---|---|
| `hero-digital-ecosystem.webp` | 460 × 310 | Homepage hero | Deleted; replaced with a lightweight CSS interface diagram |
| `website-product-scene.webp` | 490 × 300 | Website-development service detail | Deleted; service visuals now use the existing Lucide icon system |
| `commerce-platform.webp` | 405 × 290 | E-commerce service detail | Deleted; service visuals now use the existing Lucide icon system |

No AI-generated 3D image remains referenced by the current source code. The existing project artwork is CSS/HTML interface illustration and remains clearly labelled as illustrative concept material, not as a real client screenshot.

## Real photography status

**No external real photographs have been downloaded or integrated into the local project in this update.** No remote hotlinks have been added. Existing official brand assets, bundled fonts, and illustrative portfolio artwork have been preserved.

The following Unsplash CDN sources were previously researched as candidates. They remain research references only and are not included in the website bundle:

| Candidate role | Source image URL | Potential placement | Status |
|---|---|---|---|
| Coding workspace | `https://images.unsplash.com/photo-1498050108023-c5249f4df085` | A restrained homepage hero photograph, if locally downloaded and visually reviewed | Not integrated |
| Mobile product context | `https://images.unsplash.com/photo-1551650975-87deedd944c3` | Mobile-app service detail only | Not integrated |
| E-commerce/payment context | `https://images.unsplash.com/photo-1556742049-0cfed4f6a45d` | E-commerce service detail only | Not integrated |

## License and rights review

The candidate URLs above are direct Unsplash image-CDN endpoints, not complete original photo-page references. They have **not** been cleared for use in this project. Before integrating any candidate, locate its original Unsplash page, verify the current license and any attribution requirements, and separately review rights relating to recognizable people, trademarks, property, or other protected material.

- Unsplash License: https://unsplash.com/license
- Unsplash Terms: https://unsplash.com/terms
- Commercial-use FAQ: https://help.unsplash.com/en/articles/2612315-can-i-use-unsplash-images-for-personal-or-commercial-projects
- Releases and trademarks: https://help.unsplash.com/en/articles/2612329-releases-and-trademarks

## Distribution recommendation

- Homepage: the current CSS interface diagram is intentionally image-free. Add one local photograph only if it is sharper, more relevant, and visually calmer than the existing composition.
- Services: use no stock photo by default; the flat icon-led service panels are sufficient. Add a photograph only to a service that genuinely benefits from context.
- Portfolio: preserve existing project artwork and its illustrative disclaimer. Do not present stock photography as project work.
- About: retain the text-led composition unless a genuine company/team image is supplied.
- Work Journey: keep the timeline text-led; no photograph is needed for every step.
- Terms, privacy, forms, and contact: remain text-focused.

## Manifest and outstanding work

There are currently no newly sourced external photographs in `public/`, so there are no external-photo source entries to manifest as installed assets. If any candidate is integrated later, record its exact source URL, provider, license, attribution requirement, local filename, pixel dimensions, optimization format, and page placement here.
