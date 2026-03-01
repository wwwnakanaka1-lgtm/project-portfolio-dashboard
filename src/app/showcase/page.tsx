import portfolioData from "@/lib/portfolio.json";
import type { PortfolioData } from "@/lib/portfolio-types";
import { ShowcaseNav } from "@/components/showcase/ShowcaseNav";
import { ShowcaseHero } from "@/components/showcase/ShowcaseHero";
import { ProjectShowcase } from "@/components/showcase/ProjectShowcase";
import { ShowcaseFooter } from "@/components/showcase/ShowcaseFooter";

const data = portfolioData as PortfolioData;

export default function ShowcasePage() {
  return (
    <main className="showcase-page">
      <ShowcaseNav />
      <ShowcaseHero profile={data.profile} />
      <ProjectShowcase projects={data.projects} />
      <ShowcaseFooter profile={data.profile} />
    </main>
  );
}
