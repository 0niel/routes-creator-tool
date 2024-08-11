import { type dia } from "jointjs";
import { v4 as uuidv4 } from "uuid";
import { type MapObject } from "./figma-map-config";
import { type StairsRef } from "./stores/map-config-store";

export interface Vertex {
  id: string;
  x: number;
  y: number;
  mapObjectId: string;
}

export interface Edge {
  source: string;
  target: string;
  weight: number;

  toNextFloor?: boolean;
}

export interface Graph {
  vertices: Vertex[];
  edges: Edge[];
}

export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export const getShortestPath = (
  graph: Graph,
  startName: string,
  endName: string,
  objects: MapObject[],
): Vertex[] | null => {
  if (graph.vertices.length === 0) {
    return null;
  }

  const findObjectByName = (name: string) => {
    return objects.find((o) => o.name === name);
  };

  const dijkstra = (graph: Graph, start: Vertex, end: Vertex) => {
    const dist = new Map<string, number>();
    const prev = new Map<string, Vertex | null>();

    for (const vertex of graph.vertices) {
      dist.set(vertex.id, Infinity);
      prev.set(vertex.id, null);
    }

    dist.set(start.id, 0);

    const unvisited = new Set(graph.vertices);

    while (unvisited.size) {
      let closest: Vertex | null = null;

      for (const vertex of unvisited) {
        if (!closest || dist.get(vertex.id)! < dist.get(closest.id)!) {
          closest = vertex;
        }
      }

      unvisited.delete(closest!);

      if (closest === end) break;

      for (const edge of graph.edges) {
        if (edge.source === closest?.id || edge.target === closest?.id) {
          const neighborId =
            edge.source === closest.id ? edge.target : edge.source;
          const neighbor = graph.vertices.find((v) => v.id === neighborId)!;

          if (neighbor) {
            const alt = dist.get(closest.id)! + edge.weight;
            if (alt < dist.get(neighbor.id)!) {
              dist.set(neighbor.id, alt);
              prev.set(neighbor.id, closest);
            }
          }
        }
      }
    }

    const path = [];
    let u = end;
    while (u) {
      path.unshift(u);
      u = prev.get(u.id)!;
    }

    return path;
  };

  const start = graph.vertices.find(
    (v) => v.mapObjectId === findObjectByName(startName)?.id,
  );
  const end = graph.vertices.find(
    (v) => v.mapObjectId === findObjectByName(endName)?.id,
  );

  if (!start || !end) return null;

  const path = dijkstra(graph, start, end);

  return path;
};

export function generateGraph(data: dia.Graph, stairsRef: StairsRef[]): Graph {
  const vertices: Vertex[] = data
    .getCells()
    .filter(
      (cell: dia.Cell) =>
        cell.attributes.type === "devs.Model" && cell.attr(".id") !== undefined,
    )
    .map((cell: dia.Cell) => {
      return {
        id: cell.id,
        x: cell.attributes.position.x,
        y: cell.attributes.position.y,
        mapObjectId: cell.attr(".id").text,
      };
    });

  const edges: Edge[] = [];

  data
    .getCells()
    .filter((cell: dia.Cell) => cell.attributes.type === "devs.Link")
    .forEach((cell: dia.Cell) => {
      const sourceId = (cell.get("source") as { id: string }).id;
      const targetId = (cell.get("target") as { id: string }).id;

      const sourceVertex = vertices.find((v) => v.id === sourceId);
      const targetVertex = vertices.find((v) => v.id === targetId);

      if (sourceVertex && targetVertex) {
        let intermediateVertices: Vertex[] = [];
        if (cell.attributes.vertices !== undefined) {
          intermediateVertices = ((
            cell.attributes.vertices as dia.Link.Vertex[]
          ).map((vertex: { x: number; y: number }) => ({
            id: uuidv4(),
            x: vertex.x,
            y: vertex.y,
          })) ?? []) as Vertex[];
        }
        const completeVertices = [
          sourceVertex,
          ...intermediateVertices,
          targetVertex,
        ];

        completeVertices.reduce((prevVertex, curVertex) => {
          const weight = distance(
            prevVertex.x,
            prevVertex.y,
            curVertex.x,
            curVertex.y,
          );
          edges.push({ source: prevVertex.id, target: curVertex.id, weight });

          return curVertex;
        });

        vertices.push(...intermediateVertices);
      }
    });

  console.log(
    `[!] Graph generated with ${vertices.length} vertices and ${edges.length} edges`,
  );

  const getVertexInPoint = (x: number, y: number): Vertex | undefined => {
    return vertices.find((v) => v.x === x && v.y === y);
  };

  data
    .getCells()
    .filter((cell: dia.Cell) => cell.attributes.type === "devs.Link")
    .forEach((cell: dia.Cell) => {
      const sourceId = (cell.get("source") as { id: string }).id;
      let targetId = (cell.get("target") as { id: string }).id;
      const targetAnchor = (
        cell.get("target") as {
          anchor: { name: string; args: { index: number } };
        }
      ).anchor;

      if (targetAnchor && targetAnchor.name === "vertexAnchor") {
        const targetLink = data.getCell(targetId) as dia.Link;
        if (targetLink.attributes.vertices) {
          const targetVertexIndex = targetAnchor.args.index;
          const targetVertex =
            targetLink.attributes.vertices[targetVertexIndex];
          targetId =
            getVertexInPoint(targetVertex.x, targetVertex.y)?.id ?? targetId;
        }

        // Generate here intermediate vertices
        const sourceVertex = vertices.find((v) => v.id === sourceId);
        const targetVertex = vertices.find((v) => v.id === targetId);

        if (sourceVertex && targetVertex) {
          let intermediateVertices: Vertex[] = [];
          if (cell.attributes.vertices !== undefined) {
            intermediateVertices = ((
              cell.attributes.vertices as dia.Link.Vertex[]
            ).map((vertex: { x: number; y: number }) => ({
              id: uuidv4(),
              x: vertex.x,
              y: vertex.y,
            })) ?? []) as Vertex[];
          }
          const completeVertices = [
            sourceVertex,
            ...intermediateVertices,
            targetVertex,
          ];

          completeVertices.reduce((prevVertex, curVertex) => {
            const weight = distance(
              prevVertex.x,
              prevVertex.y,
              curVertex.x,
              curVertex.y,
            );
            edges.push({ source: prevVertex.id, target: curVertex.id, weight });

            return curVertex;
          });

          vertices.push(...intermediateVertices);
        }
      }
    });

  stairsRef.forEach((stairs) => {
    const fromVertex = vertices.find((v) => v.mapObjectId === stairs.fromId);
    if (!fromVertex) return;

    stairs.toIds.forEach((toId) => {
      edges.push({
        source: fromVertex.id,
        target: toId,
        weight: 0,
        toNextFloor: true,
      });
    });
  });

  return { vertices, edges };
}

export function importFromJSON(json: string): Graph {
  const data = JSON.parse(json);

  return generateGraph(data);
}
