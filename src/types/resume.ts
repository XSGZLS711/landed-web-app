export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: {
    company: string;
    role: string;
    dates: string;
    bullets: string[];
  }[];
  education: {
    school: string;
    degree: string;
    year: string;
  }[];
  skills: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
