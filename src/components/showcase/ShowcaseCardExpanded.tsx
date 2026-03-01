"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { PortfolioProject } from "@/lib/portfolio-types";
import { TechBadge } from "@/components/showcase/TechBadge";

interface ShowcaseCardExpandedProps {
  project: PortfolioProject;
  onClose: () => void;
}

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

export function ShowcaseCardExpanded({
  project,
  onClose,
}: ShowcaseCardExpandedProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const youtubeEmbed = project.demoVideo
    ? getYouTubeEmbedUrl(project.demoVideo)
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="glass-card relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 md:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center
                       rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)]
                       text-[var(--text-muted)] hover:text-[var(--foreground)]
                       transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Screenshot */}
          <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg mb-6">
            <Image
              src={project.screenshot}
              alt={project.title}
              fill
              className="object-cover"
              sizes="(max-width: 896px) 100vw, 896px"
              unoptimized
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  parent.style.backgroundColor = project.accentColor;
                  const placeholder = document.createElement("span");
                  placeholder.textContent = project.title;
                  placeholder.className =
                    "absolute inset-0 flex items-center justify-center text-white text-xl font-bold";
                  parent.appendChild(placeholder);
                }
              }}
            />
          </div>

          {/* Demo Video */}
          {youtubeEmbed && (
            <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg mb-6">
              <iframe
                src={youtubeEmbed}
                title={`${project.title} demo`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          )}

          {/* Title & Category */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-[var(--foreground)]">
                {project.title}
              </h2>
              <span
                className="px-3 py-1 text-xs font-medium rounded-full text-white"
                style={{ backgroundColor: project.accentColor }}
              >
                {project.category}
              </span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {project.description}
            </p>
          </div>

          {/* Technologies */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Technologies
            </h4>
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((tech, i) => (
                <TechBadge key={tech} name={tech} delay={i * 0.05} />
              ))}
            </div>
          </div>

          {/* Learnings */}
          {project.learnings.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Key Learnings
              </h4>
              <ul className="space-y-2">
                {project.learnings.map((learning) => (
                  <li
                    key={learning}
                    className="flex items-start gap-2 text-[var(--text-secondary)]"
                  >
                    <svg
                      className="w-5 h-5 mt-0.5 flex-shrink-0"
                      style={{ color: project.accentColor }}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{learning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Links */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-[var(--card-border)]">
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium
                           rounded-lg text-white transition-opacity hover:opacity-90"
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
                Live Demo
              </a>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium
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
                View Source
              </a>
            )}
            {project.demoVideo && !youtubeEmbed && (
              <a
                href={project.demoVideo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium
                           rounded-lg border border-[var(--card-border)]
                           text-[var(--foreground)] hover:bg-[var(--glass-bg)] transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch Demo
              </a>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
