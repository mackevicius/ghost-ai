export interface Project {
  id: string;
  name: string;
  isOwner: boolean;
}

export interface ProjectLists {
  ownedProjects: Project[];
  sharedProjects: Project[];
}