export interface ProgramRef {
  url: string;
  title: string;
  slug: string;
  go: string;
}

export interface Program {
  name: string;
  slug: string;
  refs: ProgramRef[];
  description: string;
  logo: string | null;
  logoBackground: string | null;
  image: string | null;
  imageAlt: string;
  payments: string[];
  categories: string[];
}
