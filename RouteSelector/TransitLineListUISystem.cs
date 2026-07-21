using System.Collections.Generic;
using Colossal.UI.Binding;
using Game.Prefabs;
using Game.Routes;
using Game.UI;
using Unity.Collections;
using Unity.Entities;
using UnityEngine;

namespace RouteSelector
{
    /// <summary>
    /// Exposes every transit line in the city to the mod's UI panel as a
    /// "routeSelector.lines" binding: entity, display name, transport
    /// type and color, so the panel can group lines by type and let the
    /// player select one by entity instead of an ambiguous world click.
    /// </summary>
    public partial class TransitLineListUISystem : UISystemBase
    {
        private EntityQuery m_LineQuery;
        private NameSystem m_NameSystem;
        private RawValueBinding m_Lines;

        private int m_LastVersion = -1;

        protected override void OnCreate()
        {
            base.OnCreate();

            m_NameSystem = World.GetOrCreateSystemManaged<NameSystem>();

            m_LineQuery = GetEntityQuery(
                ComponentType.ReadOnly<Route>(),
                ComponentType.ReadOnly<TransportLine>(),
                ComponentType.ReadOnly<PrefabRef>(),
                ComponentType.Exclude<Game.Tools.Temp>());

            AddBinding(m_Lines = new RawValueBinding("routeSelector", "lines", WriteLines));
        }

        protected override void OnUpdate()
        {
            int version = m_LineQuery.GetCombinedComponentOrderVersion(includeEntityType: true);

            if (version == m_LastVersion)
                return;

            m_LastVersion = version;
            m_Lines.Update();
        }

        private void WriteLines(IJsonWriter writer)
        {
            using NativeArray<Entity> lines = m_LineQuery.ToEntityArray(Allocator.Temp);

            var rows = new List<(Entity entity, Entity prefab, string name, TransportType type, Color32 color)>();

            foreach (Entity line in lines)
            {
                PrefabRef prefabRef = EntityManager.GetComponentData<PrefabRef>(line);

                if (!EntityManager.HasComponent<TransportLineData>(prefabRef.m_Prefab))
                    continue;

                TransportLineData lineData = EntityManager.GetComponentData<TransportLineData>(prefabRef.m_Prefab);

                Color32 color = EntityManager.HasComponent<Game.Routes.Color>(line)
                    ? EntityManager.GetComponentData<Game.Routes.Color>(line).m_Color
                    : new Color32(255, 255, 255, 255);

                string name = m_NameSystem.GetRenderedLabelName(line);

                rows.Add((line, prefabRef.m_Prefab, name, lineData.m_TransportType, color));
            }

            writer.ArrayBegin(rows.Count);

            foreach (var row in rows)
            {
                writer.TypeBegin("RouteSelector.LineInfo");

                writer.PropertyName("entity");
                WriteEntity(writer, row.entity);

                writer.PropertyName("prefab");
                WriteEntity(writer, row.prefab);

                writer.PropertyName("name");
                writer.Write(row.name);

                writer.PropertyName("type");
                writer.Write((int)row.type);

                writer.PropertyName("color");
                writer.Write($"#{row.color.r:X2}{row.color.g:X2}{row.color.b:X2}");

                writer.TypeEnd();
            }

            writer.ArrayEnd();
        }

        private static void WriteEntity(IJsonWriter writer, Entity entity)
        {
            writer.TypeBegin("Unity.Entities.Entity");
            writer.PropertyName("index");
            writer.Write(entity.Index);
            writer.PropertyName("version");
            writer.Write(entity.Version);
            writer.TypeEnd();
        }
    }
}
