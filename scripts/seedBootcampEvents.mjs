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
    title: 'RoboQuest',
    slug: 'roboquest',
    tagline: 'Build. Learn. Compete. Innovate — One-Day Robotics Workshop',
    short_description:
      'RoboQuest is a robotics workshop organised by the IEEE RGIPT Robotics & Automation Society in association with TechFest, IIT Bombay.',
    description:
      'RoboQuest is a premier robotics workshop organised by the IEEE RGIPT Robotics & Automation Society in association with TechFest, IIT Bombay.\n\nThe workshop will cover bot design, Arduino basics, and strategies for TechFest robotics competitions, helping participants develop practical robotics skills and explore opportunities to participate in TechFest competitions through wildcard entries.\n\nOrganized by IEEE RGIPT Student Branch in collaboration with TechFest, IIT Bombay.',
    roadmap: '',
    highlights: [
      'Hands-On Making & Bot Design',
      'Learn Robotics and Build Your Technical Skills',
      'Strategies for Roboreach, Meshmerize & Thetashift',
      'Chance to get Wildcard Entry in TechFest, IIT Bombay',
      'Mentorship from Senior IEEE Robotics Developers',
    ],
    topics: [
      'Bot Design',
      'Arduino Basics',
      'Roboreach',
      'Meshmerize',
      'Thetashift',
      'Sensors',
      'TechFest IIT Bombay',
    ],
    duration: 'One-Day Intensive Workshop',
    category: 'workshop',
    banner_url: '/Roboquest2.0.png',
    is_active: true,
  },
  {
    title: 'RoboGenesis',
    slug: 'robogenesis',
    tagline: 'Build. Learn. Compete. Innovate — One-Day Robotics Workshop',
    short_description:
      'RoboGenesis is a robotics workshop organised by the IEEE RGIPT Robotics & Automation Society in association with TechFest, IIT Bombay.',
    description:
      'RoboGenesis is a premier robotics workshop organised by the IEEE RGIPT Robotics & Automation Society in association with TechFest, IIT Bombay.\n\nThe workshop will cover bot design, Arduino basics, and strategies for TechFest robotics competitions, helping participants develop practical robotics skills and explore opportunities to participate in TechFest competitions through wildcard entries.\n\nOrganized by IEEE RGIPT Student Branch in collaboration with TechFest, IIT Bombay.',
    roadmap: '',
    highlights: [
      'Bot Design & Hardware Architecture',
      'Arduino Basics & Microcontroller Interfacing',
      'Strategies for Roboreach, Meshmerize & Thetashift',
      'Chance to get Wildcard Entry in TechFest, IIT Bombay',
      'Mentorship from Senior IEEE Robotics Developers',
    ],
    topics: [
      'Bot Design',
      'Arduino Basics',
      'Roboreach',
      'Meshmerize',
      'Thetashift',
      'Sensors',
      'TechFest IIT Bombay',
    ],
    duration: 'One-Day Intensive Workshop',
    category: 'workshop',
    banner_url: '/robogenises/ROBOGENESIS.png',
    is_active: false,
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
const { default: BootcampUpdate } = await import('../src/models/BootcampUpdate.js');

for (const e of events) {
  const result = await BootcampEvent.findOneAndUpdate(
    { slug: e.slug },
    { $set: e },
    { upsert: true, new: true }
  );
  console.log('Upserted:', result.slug);
}

const roboEvent = await BootcampEvent.findOne({ slug: 'robogenesis' });
if (roboEvent) {
  const whatsappUpdate = {
    event: roboEvent._id,
    title: 'Official WhatsApp Community Group',
    short_description:
      'Join the official participants WhatsApp group for session schedules, bot design resources, competition updates, and TechFest wildcard entry announcements.',
    link: 'https://chat.whatsapp.com/C5Ypne3xe7A76CVyh9Ksxt',
  };

  const updateResult = await BootcampUpdate.findOneAndUpdate(
    { event: roboEvent._id, link: whatsappUpdate.link },
    { $set: whatsappUpdate },
    { upsert: true, new: true }
  );
  console.log('Upserted WhatsApp update for RoboGenesis:', updateResult._id);
}

const roboquestEvent = await BootcampEvent.findOne({ slug: 'roboquest' });
if (roboquestEvent) {
  const whatsappUpdate = {
    event: roboquestEvent._id,
    title: 'Official WhatsApp Community Group',
    short_description:
      'Join the official participants WhatsApp group for session schedules, bot design resources, competition updates, and TechFest wildcard entry announcements.',
    link: 'https://chat.whatsapp.com/LlgjFstcvGqFd7blPkcXt3',
  };

  const updateResult = await BootcampUpdate.findOneAndUpdate(
    { event: roboquestEvent._id, link: whatsappUpdate.link },
    { $set: whatsappUpdate },
    { upsert: true, new: true }
  );
  console.log('Upserted WhatsApp update for RoboQuest:', updateResult._id);
}

console.log('Done.');
process.exit(0);
