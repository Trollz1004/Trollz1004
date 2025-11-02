export interface KickstarterProject {
  id: number;
  name: string;
  category: string;
  goal: number;
  pledged: number;
  backers: number;
  deadline: string;
  creator: string;
  description: string;
  imageUrl?: string;
  status: 'active' | 'successful' | 'failed';
}

export interface FilterState {
  nameFilter: string;
  minGoal: string;
  maxGoal: string;
}
