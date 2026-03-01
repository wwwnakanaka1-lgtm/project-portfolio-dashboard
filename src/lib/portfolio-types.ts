/** A curated project for the public showcase page. */
export interface PortfolioProject {
  id: string;
  title: string;
  /** One-line value proposition — understood in 3 seconds. */
  catchphrase: string;
  /** 2-3 sentence description. */
  description: string;
  category: string;
  /** 3-5 technology badges. */
  technologies: string[];
  /** Path to screenshot image in public/screenshots/. */
  screenshot: string;
  /** Live demo URL (opens in new tab). */
  demoUrl?: string;
  /** Demo video URL (YouTube / Loom embed). */
  demoVideo?: string;
  /** GitHub repository URL. */
  githubUrl?: string;
  /** 2-3 key learnings / takeaways. */
  learnings: string[];
  /** Display order (1 = first). */
  order: number;
  /** Accent color for card highlights. */
  accentColor: string;
}

/** Top-level portfolio data including developer profile and curated projects. */
export interface PortfolioData {
  profile: {
    name: string;
    title: string;
    tagline: string;
    bio: string;
    links: {
      github?: string;
      email?: string;
      linkedin?: string;
    };
  };
  projects: PortfolioProject[];
}
