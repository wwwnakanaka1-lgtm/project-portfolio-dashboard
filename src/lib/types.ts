export interface Project {
  id: string;
  name: string;
  category: string;
  description: string;
  path: string;
  technologies: string[];
  status: "active" | "archive" | "empty";
}

export interface Category {
  name: string;
  color: string;
  icon: string;
}

export interface Categories {
  [key: string]: Category;
}

export interface ProjectData {
  projects: Project[];
  categories: Categories;
  technologies: {
    languages: string[];
    frameworks: string[];
    visualization: string[];
    ml: string[];
    data: string[];
  };
}
