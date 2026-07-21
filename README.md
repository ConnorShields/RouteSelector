# Route Selector

A [Cities: Skylines II](https://www.paradoxinteractive.com/games/cities-skylines-ii) mod focused on making public transport route management usable at scale.

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

## Changelog

- Fixed a bug where a line being actively drawn with the game's own line tool would briefly appear in the panel (as a placeholder entry) before the line was actually finished. The line entity query in `TransitLineListUISystem.cs` now excludes entities carrying the game's `Game.Tools.Temp` component, which the tool attaches to in-progress preview entities, so only completed lines are listed.
- Fixed newly completed, un-renamed lines showing their tool/prefab name (e.g. "Passenger Railway Line Tool") instead of the game's default "Line 2" / "Line 3" numbering. The panel now sends the game's structured `NameSystem.Name` (via `GetName`, which knows how to format transit line numbers) instead of the generic `GetRenderedLabelName`, and renders it client-side with `cs2/l10n`'s `LocalizedEntityName`, matching how the game names lines everywhere else.
- Fixed the line list reordering whenever a line was selected/highlighted. The underlying game query's entity order can shift as components like selection/highlight are added or removed, so the panel now sorts lines by entity index before displaying them, keeping the order stable regardless of selection.
