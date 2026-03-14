export interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  year: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface UserProfile {
  fullName: string;
  phone: string;
  skills: string[];
  experience: number;
  locations: string[];
  types: string[];
  minSalary: number;
  education: Education[];
  workExperience: WorkExperience[];
  baseResume: string;
  onboardingDone: boolean;
}
