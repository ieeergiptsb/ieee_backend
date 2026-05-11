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
    banner_url: '/images/posters/6.png',
    is_active: true,
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
    banner_url: '/images/posters/4.png',
    is_active: true,
  },
];

await connectDB();
for (const e of events) {
  const exists = await BootcampEvent.findOne({ slug: e.slug });
  if (exists) {
    console.log('Skip (exists):', e.slug);
    continue;
  }
  await BootcampEvent.create(e);
  console.log('Inserted:', e.slug);
}
console.log('Done.');
process.exit(0);
