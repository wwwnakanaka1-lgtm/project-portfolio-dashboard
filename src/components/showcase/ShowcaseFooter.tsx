"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface ShowcaseFooterProps {
  profile: {
    name: string;
    title: string;
    tagline: string;
    bio: string;
    links: { github?: string; email?: string; linkedin?: string };
  };
}

export function ShowcaseFooter({ profile }: ShowcaseFooterProps) {
  const ctaRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ctaRef, { once: true, margin: "-100px" });

  return (
    <>
      {/* CTA Section */}
      <section className="px-4 py-24" ref={ctaRef}>
        <motion.div
          className="max-w-2xl mx-auto text-center rounded-2xl px-8 py-16 glass-card"
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <h2
            className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Let&apos;s Work Together
          </h2>
          <p
            className="text-sm md:text-base mb-8"
            style={{ color: "var(--text-muted)" }}
          >
            {"\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u306E\u3054\u76F8\u8AC7\u3001\u304A\u6C17\u8EFD\u306B\u3069\u3046\u305E"}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {profile.links.email && (
              <a
                href={`mailto:${profile.links.email}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-white text-sm transition-transform hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
                }}
              >
                <svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 4L12 13 2 4" />
                </svg>
                Email
              </a>
            )}
            {profile.links.github && (
              <a
                href={profile.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-transform hover:scale-105"
                style={{
                  border: "1px solid var(--card-border)",
                  color: "var(--foreground)",
                  background: "var(--glass-bg)",
                }}
              >
                <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </a>
            )}
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center" style={{ color: "var(--text-muted)" }}>
        <p className="text-xs mb-1">
          &copy; {new Date().getFullYear()} {profile.name}. All rights reserved.
        </p>
        <p className="text-xs opacity-60">
          Built with Next.js &amp; Claude Code
        </p>
      </footer>
    </>
  );
}
