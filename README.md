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

## Changelog

- Fixed a bug where a line being actively drawn with the game's own line tool would briefly appear in the panel (as a placeholder entry) before the line was actually finished. The line entity query in `TransitLineListUISystem.cs` now excludes entities carrying the game's `Game.Tools.Temp` component, which the tool attaches to in-progress preview entities, so only completed lines are listed.
- Fixed newly completed, un-renamed lines showing their tool/prefab name (e.g. "Passenger Railway Line Tool") instead of the game's default "Line 2" / "Line 3" numbering. The panel now sends the game's structured `NameSystem.Name` (via `GetName`, which knows how to format transit line numbers) instead of the generic `GetRenderedLabelName`, and renders it client-side with `cs2/l10n`'s `LocalizedEntityName`, matching how the game names lines everywhere else.
- Fixed the line list reordering whenever a line was selected/highlighted. The underlying game query's entity order can shift as components like selection/highlight are added or removed, so the panel now sorts lines by entity index before displaying them, keeping the order stable regardless of selection.
- Investigated a report of train lines appearing in reverse order (bus/tram were fine). Decompiled the vanilla game's own line list (`Game.UI.InGame.UITransportLineData.CompareTo`) and confirmed it sorts by transport type then `entity.Index` — the exact same key we use. So this isn't a bug we introduced; it's inherent to `entity.Index` not reflecting true creation order once a line's entity has been through enough create/destroy churn (heavier for trains, which get redrawn/edited more), and vanilla has the same quirk. Left as-is to match vanilla behavior; `Game.Routes.RouteNumber` (a stable per-line number that survives renames) is available as a future alternative sort key if we ever want to deviate from vanilla ordering.
- Fixed the mod showing as incompatible for everyone after the first publish. `PublishConfiguration.xml`'s `GameVersion` was left at the toolchain's placeholder (`1.0.*`) instead of the actual game version the mod was built and tested against — updated to `1.6.*`.
