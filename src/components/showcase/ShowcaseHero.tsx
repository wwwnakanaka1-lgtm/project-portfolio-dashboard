"use client";

import { motion } from "framer-motion";

interface ShowcaseHeroProps {
  profile: {
    name: string;
    title: string;
    tagline: string;
    bio: string;
    links: { github?: string; email?: string; linkedin?: string };
  };
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export function ShowcaseHero({ profile }: ShowcaseHeroProps) {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(135deg, var(--background), color-mix(in srgb, var(--accent-light) 10%, var(--background)))",
      }}
    >
      {/* Animated gradient overlay */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, var(--accent-light), transparent 50%), radial-gradient(ellipse at 70% 80%, var(--accent), transparent 50%)",
          animation: "heroGradientShift 8s ease-in-out infinite alternate",
        }}
      />

      <motion.div
        className="relative z-10 text-center max-w-2xl mx-auto"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.h1
          className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 tracking-tight"
          style={{ color: "var(--foreground)" }}
          variants={item}
        >
          {profile.name}
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl lg:text-3xl font-medium mb-4"
          style={{ color: "var(--accent-light)" }}
          variants={item}
        >
          {profile.title}
        </motion.p>

        <motion.p
          className="text-base md:text-lg lg:text-xl mb-6"
          style={{ color: "var(--text-muted)" }}
          variants={item}
        >
          {profile.tagline}
        </motion.p>

        <motion.p
          className="text-sm md:text-base leading-relaxed mb-10 max-w-lg mx-auto"
          style={{ color: "var(--text-secondary)" }}
          variants={item}
        >
          {profile.bio}
        </motion.p>

        {/* CTA + Social links */}
        <motion.div className="flex flex-col items-center gap-6" variants={item}>
          <a
            href="#projects"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-white font-medium text-base transition-transform hover:scale-105"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-light))" }}
          >
            View Projects
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </a>
          <div className="flex items-center justify-center gap-4">
          {profile.links.github && (
            <a
              href={profile.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-full transition-transform hover:scale-110"
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                color: "var(--foreground)",
              }}
              aria-label="GitHub"
            >
              <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          )}
          {profile.links.email && (
            <a
              href={`mailto:${profile.links.email}`}
              className="p-3 rounded-full transition-transform hover:scale-110"
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                color: "var(--foreground)",
              }}
              aria-label="Email"
            >
              <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 4L12 13 2 4" />
              </svg>
            </a>
          )}
          {profile.links.linkedin && (
            <a
              href={profile.links.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-full transition-transform hover:scale-110"
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                color: "var(--foreground)",
              }}
              aria-label="LinkedIn"
            >
              <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          )}
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </motion.div>
      </motion.div>

    </section>
  );
}
