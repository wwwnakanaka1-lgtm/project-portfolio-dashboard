"use client";

import { useMemo } from "react";
import type { PortfolioProject } from "@/lib/portfolio-types";
import { ShowcaseCard } from "@/components/showcase/ShowcaseCard";
import { ScrollReveal } from "@/components/showcase/ScrollReveal";

interface ProjectShowcaseProps {
  projects: PortfolioProject[];
}

export function ProjectShowcase({ projects }: ProjectShowcaseProps) {
  const sorted = useMemo(
    () => [...projects].sort((a, b) => a.order - b.order),
    [projects]
  );

  return (
    <section id="projects" className="max-w-6xl mx-auto px-6 py-20 md:py-28">
      <ScrollReveal direction="up">
        <div className="text-center mb-16 md:mb-20">
          <p className="text-sm font-mono uppercase tracking-widest mb-3" style={{ color: "var(--accent-light)" }}>
            Selected Works
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--foreground)]">
            Projects
          </h2>
          <div className="mt-4 mx-auto w-16 h-1 rounded-full" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-light))" }} />
        </div>
      </ScrollReveal>

      <div className="flex flex-col gap-16 md:gap-24">
        {sorted.map((project, index) => (
          <ShowcaseCard key={project.id} project={project} index={index} />
        ))}
      </div>
    </section>
  );
}
