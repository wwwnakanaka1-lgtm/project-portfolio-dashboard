"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Project, Categories } from "@/lib/types";

interface RelationshipGraphProps {
  projects: Project[];
  categories: Categories;
  onProjectClick?: (project: Project) => void;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  category: string;
  color: string;
  technologies: string[];
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  strength: number;
}

export function RelationshipGraph({
  projects,
  categories,
  onProjectClick,
}: RelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || projects.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Create nodes
    const nodes: Node[] = projects
      .filter((p) => p.status !== "empty")
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        color: categories[p.category]?.color || "#6B7280",
        technologies: p.technologies,
      }));

    // Create links based on shared technologies
    const links: Link[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const sharedTechs = nodes[i].technologies.filter((t) =>
          nodes[j].technologies.includes(t)
        );
        if (sharedTechs.length >= 2) {
          links.push({
            source: nodes[i].id,
            target: nodes[j].id,
            strength: sharedTechs.length,
          });
        }
      }
    }

    // Create simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<Node, Link>(links)
          .id((d) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40));

    // Create container with zoom
    const container = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Draw links
    const link = container
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", (d) => Math.sqrt(d.strength));

    // Draw nodes
    const node = container
      .append("g")
      .selectAll<SVGGElement, Node>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer");

    // Add drag behavior
    const dragBehavior = d3
      .drag<SVGGElement, Node>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(dragBehavior);

    // Node circles
    node
      .append("circle")
      .attr("r", 20)
      .attr("fill", (d) => d.color)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("r", 25);
        setHoveredNode(d.id);
      })
      .on("mouseout", function () {
        d3.select(this).attr("r", 20);
        setHoveredNode(null);
      })
      .on("click", (event, d) => {
        const project = projects.find((p) => p.id === d.id);
        if (project) onProjectClick?.(project);
      });

    // Node labels
    node
      .append("text")
      .text((d) => d.name.substring(0, 12) + (d.name.length > 12 ? "..." : ""))
      .attr("text-anchor", "middle")
      .attr("dy", 35)
      .attr("font-size", 10)
      .attr("fill", "#374151");

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as Node).x || 0)
        .attr("y1", (d) => (d.source as Node).y || 0)
        .attr("x2", (d) => (d.target as Node).x || 0)
        .attr("y2", (d) => (d.target as Node).y || 0);

      node.attr("transform", (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [projects, categories, onProjectClick]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        プロジェクト関係性グラフ
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        共通技術が2つ以上のプロジェクト間を線で接続。ドラッグ・ズーム可能
      </p>
      <div className="relative">
        <svg
          ref={svgRef}
          className="w-full border rounded-lg bg-gray-50 dark:bg-gray-900"
          style={{ height: "500px" }}
        />
        {hoveredNode && (
          <div className="absolute top-2 left-2 bg-white dark:bg-gray-700 p-2 rounded shadow text-sm">
            {projects.find((p) => p.id === hoveredNode)?.name}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4">
        {Object.entries(categories).map(([key, cat]) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {cat.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
