# Route Selector

A [Cities: Skylines II](https://www.paradoxinteractive.com/games/cities-skylines-ii) mod focused on making public transport route management usable at scale.

Published on [Paradox Mods](https://mods.paradoxplaza.com/mods/152185/Windows).

## The problem

Cities: Skylines II has no way to directly select an existing transit route (bus, tram, train, etc.) to edit it. When multiple lines share the same road or track, clicking on that road/track is ambiguous — the game can't tell you which line you actually meant to pick, making it difficult or impossible to edit a specific route once your network gets complex.

## Goal

Add a menu that lists all transit routes, letting you pick the one you want to edit directly instead of clicking on shared infrastructure. Selecting a route from the menu isolates it in the view (hiding every other line) so overlapping routes stop getting in each other's way during edits.

Routes are split by transit type (bus, tram, train, metro, etc.) so you can filter down to just the kind of line you're looking for instead of scanning one combined list.

## Status

- A toolbar button opens a panel listing every transit line in the city, grouped by transport type.
- Clicking a line selects it (via the game's own `transport.selectLine`) to view its info.
- The "Edit" action isolates the line (hides every other line) and switches the active tool to the Route Tool with that line's prefab selected, so the next click on the road unambiguously edits that exact line.

## Project layout

- `RouteSelector/` — the C# mod (`Mod.cs` entry point, `TransitLineListUISystem.cs` exposes the line list to the UI).
- `UI/` — the TypeScript/React UI mod (`src/mods/TransitLines.tsx` is the panel), built with the official CS2 UI modding toolchain.

## Building

C# side: this is a standard CS2 mod project built with the [Cities: Skylines II Modding Toolchain](https://cs2.paradoxwikis.com/Modding). Open `RouteSelector.sln` in Rider or Visual Studio with the toolchain installed (requires the `CSII_TOOLPATH` environment variable to be set) and build normally.

UI side: from the `UI/` folder, run `npm install` then `npm run build` (requires the `CSII_USERDATAPATH` environment variable, set by the modding toolchain installer). Both the C# DLL and the UI bundle deploy to the same `Mods/RouteSelector` folder.

**Gotcha:** the C# build's toolchain-provided `DeployWIP` target (in the shared `Mod.targets`, outside this repo) wipes the entire `Mods/RouteSelector` folder before copying its own output — it has no awareness of the UI bundle sitting there. So a C# build alone will silently delete the last `npm run build` output (and vice versa isn't a problem, since the UI build only writes its own files). After rebuilding the C# project, always re-run `npm run build` too before testing in-game, or the toolbar panel's UI will be missing even though the mod DLL loads fine.

## Publishing

1. In `RouteSelector/Properties/PublishConfiguration.xml`, bump `ModVersion` and update `ChangeLog`/`Screenshot`s as needed. If you're unsure whether the current `ModVersion` was already published (a broken or partial previous publish still counts), check the live mod page first — reusing an already-published version number has undefined behavior.
2. Build the C# project in Release: `dotnet build RouteSelector.sln -c Release`.
3. Build the UI: `cd UI && npm run build && cd ..`. Steps 2–3 leave `Mods/RouteSelector` complete (DLL + UI bundle), same as local testing.
4. Publish in one pass, from the repo root:
   ```
   dotnet publish RouteSelector\RouteSelector.csproj -c Release --no-build -p:ModPublisherCommand=NewVersion -p:DeployDir="%CSII_LOCALMODSPATH%\RouteSelector"
   ```

**Why `--no-build` is required:** `NewVersion` (and `Publish`, for a first-ever release) leaves the toolchain's `NeedBuild` flag `true`, so `dotnet publish`'s normal pipeline reruns the C# build and its `DeployWIP` target — wiping `Mods/RouteSelector` down to just the compiled DLL — right before the upload step reads that same folder. That's the same wipe as the Gotcha above, just happening automatically mid-publish instead of at your own build step, so without `--no-build` the uploaded version silently ships without the UI. `--no-build` skips that rebuild dependency, so the already-complete folder from steps 2–3 gets uploaded untouched. `-p:DeployDir=...` has to be passed explicitly because that path is normally computed inside the same build step `--no-build` skips.

If the publish command fails, rerun it with `-tl:off -v:normal` appended — dotnet's default terminal logger collapses per-project output into a one-line summary and hides `ModPublisher.exe`'s actual console output, which is usually where the real error message is.

`UpdatePublishedConfiguration` (`ModPublisherCommand=Update`) is the only profile with `NeedBuild=false` — it skips the rebuild unconditionally and just re-uploads whatever's currently in the deploy folder. Useful for a metadata-only touch-up (description, screenshots) without shipping a new version.

## Changelog

- Fixed a bug where a line being actively drawn with the game's own line tool would briefly appear in the panel (as a placeholder entry) before the line was actually finished. The line entity query in `TransitLineListUISystem.cs` now excludes entities carrying the game's `Game.Tools.Temp` component, which the tool attaches to in-progress preview entities, so only completed lines are listed.
- Fixed newly completed, un-renamed lines showing their tool/prefab name (e.g. "Passenger Railway Line Tool") instead of the game's default "Line 2" / "Line 3" numbering. The panel now sends the game's structured `NameSystem.Name` (via `GetName`, which knows how to format transit line numbers) instead of the generic `GetRenderedLabelName`, and renders it client-side with `cs2/l10n`'s `LocalizedEntityName`, matching how the game names lines everywhere else.
- Fixed the line list reordering whenever a line was selected/highlighted. The underlying game query's entity order can shift as components like selection/highlight are added or removed, so the panel now sorts lines by entity index before displaying them, keeping the order stable regardless of selection.
- Investigated a report of train lines appearing in reverse order (bus/tram were fine). Decompiled the vanilla game's own line list (`Game.UI.InGame.UITransportLineData.CompareTo`) and confirmed it sorts by transport type then `entity.Index` — the exact same key we use. So this isn't a bug we introduced; it's inherent to `entity.Index` not reflecting true creation order once a line's entity has been through enough create/destroy churn (heavier for trains, which get redrawn/edited more), and vanilla has the same quirk. Left as-is to match vanilla behavior; `Game.Routes.RouteNumber` (a stable per-line number that survives renames) is available as a future alternative sort key if we ever want to deviate from vanilla ordering.
- Fixed the mod showing as incompatible for everyone after the first publish. `PublishConfiguration.xml`'s `GameVersion` was left at the toolchain's placeholder (`1.0.*`) instead of the actual game version the mod was built and tested against — updated to `1.6.*`.
- Changed the panel to open directly beneath the toolbar button instead of off to the side. The button and panel are now wrapped in a relatively-positioned container, with the panel absolutely positioned (`top: 100%`, right-aligned) so it anchors under the button regardless of where the toolbar places it on screen.
- Fixed the panel-under-button anchoring actually shoving the button sideways when opened — anchoring it inline within the toolbar's own flex layout let the panel affect that layout. The panel is now rendered through a `Portal` and positioned with `fixed` at the button's measured on-screen rect instead.
- Replaced the toolbar icon (previously the vanilla Route Tool icon) with the mod's own logo.
- Fixed the new logo rendering as a solid white, heavily zoomed-in blob. The SVG declared `width`/`height` of `1024` (matching its `viewBox`), but vanilla icons like `Routetool.svg` declare `64`/`64` regardless of their `viewBox` — the toolbar button renders icons at their declared native size rather than scaling to fit, so ours was shown 16x too large and cropped to a transparent corner of the rounded-square background. Declaring `64`/`64` while keeping the `1024`-unit `viewBox` fixes the scale without touching the artwork's coordinates.
- Fixed the icon fix above not actually appearing in-game even after a full restart. Webpack always emitted image assets under the same fixed filename (`images/RouteSelectorIcon.svg`), so the in-game browser could keep serving the old cached bytes for that URL indefinitely — there was nothing in the URL to signal the content had changed. Image asset filenames are now content-hashed (`images/[name].[contenthash:8][ext]`), so any future edit to an image gets a brand-new URL and can't be served stale.
- Fixed the logo still showing as a plain white square even once the above two fixes landed. The toolbar renders button icons as a masked/tinted silhouette from the image's opaque shape rather than displaying its actual colors — confirmed by comparing screenshots, where the game's own graduation-cap/settings icons show a glyph shape, not their real colors either. Our icon had a background rectangle covering almost the entire canvas, so nearly the whole image was "opaque" and masked out as one undifferentiated block. Removed the background entirely so only the meaningful shapes (route line, stop ring, cursor) are opaque; the stop ring's hole is now a true transparent cutout (via an evenodd path) instead of being faked by filling it with the old background color.
- Fixed a publishing chain bug where the UI bundle wasn't actually included in the published mod. Both the `PublishNewVersion` and `PublishNewMod` profiles trigger a C# rebuild as part of the publish pipeline, which runs the same `DeployWIP` step that wipes `Mods/RouteSelector` before copying in just the compiled DLL — exactly like a local build does — except this now happened right before the publish upload step read that folder, so the uploaded version shipped without the UI. Publishing now requires an extra pass: publish as `NewVersion` (ships the version bump/changelog/screenshots), rebuild the UI again, then publish once more as `UpdatePublishedConfiguration` (the only profile with `NeedBuild=false`, so it re-uploads the deploy folder as-is without rebuilding) to patch the UI bundle back in.
