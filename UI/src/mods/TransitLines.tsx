import { useState } from "react";
import { bindValue, useValue } from "cs2/api";
import { toolbar, transport } from "cs2/bindings";
import { LocalizedEntityName, Name } from "cs2/l10n";
import { Button, FloatingButton, Panel } from "cs2/ui";

interface Entity {
    index: number;
    version: number;
}

interface LineInfo {
    entity: Entity;
    prefab: Entity;
    name: Name;
    type: number;
    color: string;
}

// Hides every other line, isolates this one, and switches the active tool to
// the Route Tool with this line's prefab selected so the next click on the
// (now unambiguous) line edits it instead of a hidden overlapping line.
function editLine(line: LineInfo) {
    transport.showLine(line.entity, true);
    toolbar.selectAsset(line.prefab, true);
}

const lines$ = bindValue<LineInfo[]>("routeSelector", "lines", []);

// Game.Prefabs.TransportType values we expect to see on player-built lines.
const TRANSPORT_TYPE_NAMES: Record<number, string> = {
    0: "Bus",
    1: "Train",
    3: "Tram",
    4: "Ship",
    7: "Airplane",
    8: "Subway",
    11: "Ferry",
};

export const TransitLinesButton = () => {
    const [open, setOpen] = useState(false);
    const lines = useValue(lines$);
    const [activeType, setActiveType] = useState<number | null>(null);

    // Entities can shuffle position within the game's underlying query as
    // components (e.g. highlight/selection) get added or removed, so sort by
    // entity index to keep the panel's order stable across selections.
    const sortedLines = [...lines].sort((a, b) => a.entity.index - b.entity.index);

    const types = Array.from(new Set(sortedLines.map((line) => line.type))).sort((a, b) => a - b);
    const visibleType = activeType !== null && types.includes(activeType) ? activeType : types[0] ?? null;
    const visibleLines = sortedLines.filter((line) => line.type === visibleType);

    return (
        <>
            <FloatingButton
                src="Media/Game/Icons/Routetool.svg"
                tooltipLabel="Transit Lines"
                selected={open}
                onSelect={() => setOpen(!open)}
            />
            {open && (
                <Panel header={<div>Transit Lines</div>} onClose={() => setOpen(false)}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        {types.map((type) => (
                            <Button
                                key={type}
                                variant="flat"
                                selected={type === visibleType}
                                onSelect={() => setActiveType(type)}
                            >
                                {TRANSPORT_TYPE_NAMES[type] ?? `Type ${type}`}
                            </Button>
                        ))}
                    </div>
                    <div>
                        {visibleLines.map((line) => (
                            <div
                                key={`${line.entity.index}.${line.entity.version}`}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    padding: "0.25rem 0",
                                }}
                            >
                                <div
                                    onClick={() => transport.selectLine(line.entity)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        cursor: "pointer",
                                        flex: 1,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "12px",
                                            height: "12px",
                                            borderRadius: "50%",
                                            background: line.color,
                                            flexShrink: 0,
                                        }}
                                    />
                                    <span><LocalizedEntityName value={line.name} /></span>
                                </div>
                                <Button
                                    variant="flat"
                                    onSelect={() => {
                                        editLine(line);
                                        setOpen(false);
                                    }}
                                >
                                    Edit
                                </Button>
                            </div>
                        ))}
                        {visibleLines.length === 0 && <div>No lines of this type yet.</div>}
                    </div>
                </Panel>
            )}
        </>
    );
};
