/**
 * Seed DEVWAVE 2026 and CodeNex 3.0 (see repo claude.md).
 * From backend folder: node scripts/seedBootcampEvents.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { default: connectDB } = await import('../src/config/database.js');
const { default: BootcampEvent } = await import('../src/models/BootcampEvent.js');

const events = [
  {
    title: 'Introduction to Robotics',
    slug: 'robotics-workshop-2026',
    tagline: 'Hands-On Robotics Workshop for First-Year RGIPT Students',
    short_description:
      'An interactive, hands-on introduction to Robotics & Automation for newly admitted First-Year Students, RGIPT.',
    description:
      'An interactive, hands-on introduction to Robotics & Automation, giving first-year students practical exposure to how sensors, electronics, programming, microcontrollers and control logic come together to build a functional Line Following Robot (LFR) system.\n\nOrganized by IEEE RGIPT Student Branch in collaboration with Science & Technology (S&T) Council, RGIPT.',
    roadmap: `Module 1: Robotics Fundamentals & Basic Components
Module 2: Sensors & Microcontrollers Architecture
Module 3: Electronics, Programming & Control Logic
Module 4: Hands-on LFR Assembly & Testing`,
    highlights: [
      'Robotics Fundamentals',
      'Basic Robotic Components',
      'Line Following Robots (LFR)',
      'Sensors & Microcontrollers',
      'Control Logic & Electronics',
      'Hands-on LFR Testing',
    ],
    topics: [
      'Robotics',
      'Automation',
      'Sensors',
      'Microcontrollers',
      'LFR',
      'Electronics',
      'Control Logic',
    ],
    duration: '22 August 2026',
    category: 'workshop',
    banner_url: '/images/posters/robotics-workshop.png',
    is_active: true,
  },
  {
    title: 'DEVWAVE 2026',
    slug: 'devwave-2026',
    tagline: 'Ride the Wave of Development & Design',
    short_description:
      'A beginner-friendly hands-on bootcamp helping students explore UI/UX, frontend, backend, React, Next.js, APIs, databases, and modern development through practical projects and assignments.',
    description:
      'A beginner-friendly hands-on bootcamp helping students explore UI/UX, frontend, backend, React, Next.js, APIs, databases, and modern development through practical projects and assignments.',
    roadmap: `Week 1–2: UI/UX & Figma foundations
Week 3–4: HTML, CSS, JavaScript
Week 5–6: React.js
Week 7–8: Next.js & Framer Motion
Week 9–10: Node.js & APIs
Week 11–12: FastAPI/Django basics, DBMS, Python fundamentals`,
    highlights: [
      'Beginner Friendly',
      'Project Based',
      'Assignments Included',
      'Guided Learning',
    ],
    topics: [
      'UI/UX & Figma',
      'HTML/CSS/JavaScript',
      'React.js',
      'Next.js',
      'Framer Motion',
      'Node.js',
      'FastAPI/Django Basics',
      'APIs',
      'DBMS',
      'Python Fundamentals',
    ],
    duration: 'Multi-week Bootcamp',
    category: 'bootcamp',
    banner_url: '/images/posters/devwave.png',
    is_active: false,
  },
  {
    title: 'CodeNex 3.0',
    slug: 'codenex-3',
    tagline: 'Master Data Structures & Algorithms Step by Step',
    short_description:
      'A structured DSA learning program focused on problem-solving, coding logic, interview preparation, contests, and guided practice.',
    description:
      'A structured DSA learning program focused on problem-solving, coding logic, interview preparation, contests, and guided practice.',
    roadmap: `Phase 1: STL, Recursion, Arrays, Binary Search, Strings
Phase 2: Linked Lists, Stacks & Queues, Heaps
Phase 3: Trees, BST, Graphs
Phase 4: Dynamic Programming & contests`,
    highlights: [
      'Weekly Contests',
      'Practice Problems',
      'Interview Oriented',
      'Competitive Coding Environment',
    ],
    topics: [
      'STL',
      'Recursion',
      'Arrays',
      'Binary Search',
      'Strings',
      'Linked Lists',
      'Stacks & Queues',
      'Heaps',
      'Trees',
      'BST',
      'Graphs',
      'Dynamic Programming',
    ],
    duration: '10 Week Program',
    category: 'bootcamp',
    banner_url: '/images/posters/codenex.png',
    is_active: false,
  },
];

await connectDB();
for (const e of events) {
  const result = await BootcampEvent.findOneAndUpdate(
    { slug: e.slug },
    { $set: e },
    { upsert: true, new: true }
  );
  console.log('Upserted:', result.slug);
}
console.log('Done.');
process.exit(0);
