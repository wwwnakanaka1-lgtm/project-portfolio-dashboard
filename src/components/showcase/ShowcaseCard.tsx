"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { PortfolioProject } from "@/lib/portfolio-types";
import { ScrollReveal } from "@/components/showcase/ScrollReveal";
import { TechBadge } from "@/components/showcase/TechBadge";
import { ShowcaseCardExpanded } from "@/components/showcase/ShowcaseCardExpanded";

interface ShowcaseCardProps {
  project: PortfolioProject;
  index: number;
}

export function ShowcaseCard({ project, index }: ShowcaseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isOdd = index % 2 === 0; // 0,2,4 = screenshot left
  const slideDirection = isOdd ? "left" : "right";

  return (
    <>
      <ScrollReveal direction={slideDirection} delay={0.1}>
        <motion.div
          whileHover={{ scale: 1.015 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="glass-card rounded-2xl overflow-hidden"
          style={{ borderLeft: `4px solid ${project.accentColor}` }}
        >
          <div
            className={`flex flex-col ${
              isOdd ? "md:flex-row" : "md:flex-row-reverse"
            } gap-6 p-6`}
          >
            {/* Screenshot */}
            <div className="w-full md:w-[55%] flex-shrink-0">
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-lg">
                {imgError ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-2xl"
                    style={{ backgroundColor: project.accentColor }}
                  >
                    <span className="text-white text-lg font-bold text-center px-4">
                      {project.title}
                    </span>
                  </div>
                ) : (
                  <Image
                    src={project.screenshot}
                    alt={project.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 55vw"
                    unoptimized
                    onError={() => setImgError(true)}
                  />
                )}
              </div>
            </div>

            {/* Text Content */}
            <div className="w-full md:w-[45%] flex flex-col justify-center gap-4">
              <div>
                <span
                  className="text-xs font-mono font-bold uppercase tracking-widest"
                  style={{ color: project.accentColor }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-[var(--foreground)] mt-1">
                  {project.title}
                </h3>
                <p className="text-lg text-[var(--text-muted)] mt-1">
                  {project.catchphrase}
                </p>
              </div>

              {/* Tech Badges */}
              <div className="flex flex-wrap gap-2">
                {project.technologies.map((tech, i) => (
                  <TechBadge key={tech} name={tech} delay={i * 0.05} />
                ))}
              </div>

              {/* Learnings (first 2-3) */}
              <ul className="space-y-1.5">
                {project.learnings.slice(0, 3).map((learning) => (
                  <li
                    key={learning}
                    className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                  >
                    <svg
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      style={{ color: project.accentColor }}
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <circle cx="8" cy="8" r="3" />
                    </svg>
                    <span>{learning}</span>
                  </li>
                ))}
              </ul>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-2">
                {project.demoUrl && (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                               rounded-lg text-white transition-colors"
                    style={{ backgroundColor: project.accentColor }}
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Demo
                  </a>
                )}
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                               rounded-lg border border-[var(--card-border)]
                               text-[var(--foreground)] hover:bg-[var(--glass-bg)] transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    GitHub
                  </a>
                )}
                <button
                  onClick={() => setExpanded(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                             rounded-lg border border-[var(--card-border)]
                             text-[var(--text-muted)] hover:text-[var(--foreground)]
                             hover:bg-[var(--glass-bg)] transition-colors cursor-pointer"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Details
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </ScrollReveal>

      {expanded && (
        <ShowcaseCardExpanded
          project={project}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}
