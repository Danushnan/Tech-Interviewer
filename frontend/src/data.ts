import type { Profile, Question, Skill, Task, Workspace } from "./types";

export const skillNames = [
  "Communication",
  "Problem solving",
  "Behavioural",
  "Data structures",
  "Algorithms",
];
export const questions: Question[] = [
  {
    id: "tell-me",
    title: "Tell me about yourself.",
    category: "Behavioural",
    skill: "Communication",
    difficulty: "Starter",
    minutes: 5,
    description:
      "Connect where you are now, what you have built and where you want to go.",
    hint: "Try present → past → future. Choose one project that connects to the role.",
    guide:
      "Start with your current studies, share one relevant experience and your contribution, then explain why this role fits your next step. Make it your own story.",
  },
  {
    id: "team-conflict",
    title: "Tell me about a time you disagreed with a teammate.",
    category: "Behavioural",
    skill: "Behavioural",
    difficulty: "Intermediate",
    minutes: 8,
    description:
      "Practise showing empathy, ownership and constructive communication.",
    hint: "Use STAR: situation, task, action and result. Explain your part in the resolution.",
    guide:
      "Set the context, explain both perspectives, describe how you listened and acted, and finish with the result and what you learned.",
  },
  {
    id: "project",
    title: "Walk me through a project you are proud of.",
    category: "CV & projects",
    skill: "Communication",
    difficulty: "Starter",
    minutes: 8,
    description: "Turn a project on your CV into a clear, memorable story.",
    hint: "What problem did it solve? What did you personally do? What changed?",
    guide:
      "Explain the problem, your contribution and a technical decision. Include an honest outcome, a limitation and what you would improve.",
  },
  {
    id: "failure",
    title: "Describe a time something did not go to plan.",
    category: "Behavioural",
    skill: "Behavioural",
    difficulty: "Intermediate",
    minutes: 8,
    description: "Show how you respond to setbacks and learn from them.",
    hint: "Focus on your response and learning. A small, honest example is enough.",
    guide:
      "Describe a specific setback without blaming others. Explain your response, what you changed and how you used that learning later.",
  },
  {
    id: "duplicates",
    title: "How would you find duplicate values in a list?",
    category: "Technical",
    skill: "Problem solving",
    difficulty: "Starter",
    minutes: 10,
    description:
      "Talk through your approach, trade-offs and edge cases before writing code.",
    hint: "Clarify the input and desired output. Could a set help? What if memory is limited?",
    guide:
      "A set can track seen values in expected O(n) time with O(n) additional space. A second set can keep duplicates unique. Consider sorting as an alternative; discuss mutation and memory. Check empty inputs and repeated values.",
  },
  {
    id: "queue",
    title: "Which data structure would you use for a print queue?",
    category: "Technical",
    skill: "Data structures",
    difficulty: "Starter",
    minutes: 5,
    description:
      "Connect a real-world scenario to a data structure and explain why it fits.",
    hint: "Think about arrival order. What if some jobs have a higher priority?",
    guide:
      "A FIFO queue handles jobs in arrival order. A deque supports efficient addition and removal at opposite ends. Discuss a priority queue if priorities matter, and consider fairness.",
  },
  {
    id: "binary-search",
    title: "Explain binary search to someone learning to code.",
    category: "Technical",
    skill: "Algorithms",
    difficulty: "Intermediate",
    minutes: 10,
    description:
      "Build an explanation with a simple example and a clear complexity analysis.",
    hint: "What must be true about the input? Show how the search space shrinks.",
    guide:
      "Binary search repeatedly halves a sorted search space. Compare the target to the middle value and update a bound. It takes O(log n) comparisons and O(1) extra space iteratively. Check missing targets and boundaries.",
  },
  {
    id: "why-role",
    title: "Why are you interested in this role?",
    category: "Behavioural",
    skill: "Communication",
    difficulty: "Starter",
    minutes: 5,
    description:
      "Link your interests and experience to the role, using the job description.",
    hint: "Connect one responsibility from the job description to your experience.",
    guide:
      "Pick a verified responsibility, explain why it interests you and connect it to an experience or learning goal. Check company facts before using them.",
  },
  {
    id: "cache",
    title: "How would you design a simple cache?",
    category: "Technical",
    skill: "Problem solving",
    difficulty: "Stretch",
    minutes: 15,
    description:
      "Start with requirements, then explore capacity, expiry and eviction.",
    hint: "What is cached? How much memory is available? What happens when it fills up?",
    guide:
      "Start with a key-value map. Discuss bounded capacity, expiry, stale data and concurrency. For LRU, a hash map and doubly linked list support expected O(1) operations. Clarify requirements before choosing.",
  },
  {
    id: "learning",
    title: "Tell me about something you had to learn quickly.",
    category: "Behavioural",
    skill: "Behavioural",
    difficulty: "Starter",
    minutes: 5,
    description:
      "Show curiosity, a learning strategy and evidence of progress.",
    hint: "What was the gap, how did you learn, and how did you measure progress?",
    guide:
      "Describe the need, the resources and experiments you chose, how you applied the learning and the feedback or outcome that showed progress.",
  },
  {
    id: "complexity",
    title: "When would you choose a hash map over an array?",
    category: "Technical",
    skill: "Data structures",
    difficulty: "Intermediate",
    minutes: 8,
    description:
      "Explain trade-offs in lookup, order, memory and access patterns.",
    hint: "Consider key versus index lookup, worst cases and memory overhead.",
    guide:
      "Arrays offer indexed access and compact sequential storage. Hash maps offer expected constant-time key lookup with overhead and collision considerations. Choose based on access patterns and state worst-case limitations.",
  },
  {
    id: "questions",
    title: "What would you like to ask your interviewer?",
    category: "Behavioural",
    skill: "Communication",
    difficulty: "Starter",
    minutes: 5,
    description:
      "Prepare thoughtful questions about the team and your first months.",
    hint: "What would help you understand learning opportunities, team practices or success?",
    guide:
      "Ask about graduate expectations, how feedback works or how the team collaborates. Choose things you care about, and avoid repeating information already covered.",
  },
];

export const dateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const daysUntil = (value: string) =>
  Math.round(
    (new Date(`${value}T12:00:00`).getTime() -
      new Date(`${dateKey()}T12:00:00`).getTime()) /
      86400000,
  );
export const readableDate = (
  value: string,
  options?: Intl.DateTimeFormatOptions,
) =>
  new Date(`${value}T12:00:00`).toLocaleDateString(
    "en-GB",
    options || { day: "numeric", month: "short" },
  );

export const allQuestions = (data: Workspace) => [
  ...questions,
  ...(data.custom_questions || []),
];

export function makePlan(profile: Profile, skills: Skill[]): Task[] {
  const days = Math.max(1, daysUntil(profile.interview_date));
  const ordered = [...questions].sort((a, b) => {
    const rank = (q: Question) =>
      (skills.find((s) => s.name === q.skill)?.score || 0) -
      (profile.focus.includes(q.skill) ? 10 : 0);
    const difficulty = ["Starter", "Intermediate", "Stretch"];
    return (
      rank(a) - rank(b) ||
      difficulty.indexOf(a.difficulty) - difficulty.indexOf(b.difficulty) ||
      a.id.localeCompare(b.id)
    );
  });
  const tasks: Task[] = [];
  for (let day = 0; day < days; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day);
    let budget = profile.minutes_per_day;
    const available = ordered.filter(
      (q) =>
        q.difficulty !== "Stretch" ||
        profile.confidence >= 4 ||
        day >= Math.max(2, Math.floor(days * 0.7)),
    );
    for (let i = 0; i < 3; i++) {
      const q = available[(day * 2 + i) % available.length];
      if (q.minutes + 3 > budget) continue;
      tasks.push({
        id: crypto.randomUUID(),
        title: q.title,
        question_id: q.id,
        category: q.category,
        skill: q.skill,
        minutes: q.minutes + 3,
        date: dateKey(date),
        completed: false,
        reason: `Practise ${q.skill.toLowerCase()} with time to reflect on feedback.`,
      });
      budget -= q.minutes + 3;
    }
  }
  return tasks;
}

export function initialWorkspace(): Workspace {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 14);
  const profile: Profile = {
    name: "Alex",
    role: "Graduate Software Engineer",
    company: "Your next team",
    interview_date: dateKey(deadline),
    experience: "Student / recent graduate",
    confidence: 3,
    minutes_per_day: 30,
    focus: ["Communication", "Problem solving"],
    cv: "",
    job_description: "",
    consent_ai: false,
  };
  const skills = skillNames.map((name) => ({
    name,
    score: 0,
    samples: 0,
    review: null,
  }));
  return {
    profile,
    skills,
    tasks: makePlan(profile, skills),
    sessions: [],
    saved_questions: [],
    onboarded: false,
  };
}
