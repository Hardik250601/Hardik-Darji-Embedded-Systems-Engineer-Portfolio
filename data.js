// data.js - offline fallback for content.json (used when content.json can't be
// fetched, e.g. when opening index.html directly via file://).
//
// This is a MIRROR of the blog entries in content.json, carrying the same
// slugs, titles, dates and summaries so listing pages stay consistent. The
// full article bodies live in content.json - only the opening paragraphs are
// duplicated here, because there is no way to fetch the full text on file://.
//
// The CMS writes to content.json. After editing a post there, keep this file
// in sync so the offline preview does not drift.

window.allBlogPosts = [
  {
    slug: "my-journey-in-embedded-systems",
    title: "My Journey in Embedded Systems",
    short_description: "How I moved from Arduino boards to safety-relevant firmware on off-highway machinery, and what surprised me on the way.",
    date: "2025-05-03",
    content: "<p>When I started working on off-highway construction machinery, I assumed the hard part would be the code. It wasn't. The hard part was everything around the code.</p>\n<p>A Paver or a Compactor has to move several tonnes of asphalt while an operator sits several metres away holding a joystick. Embedded software on these machines is safety-relevant, and that single fact changes how you write it, how you test it, and how carefully you are allowed to change it six months later.</p>\n<p><em>This is a preview from the offline fallback. Open the site over http:// to read the full post.</em></p>"
  },
  {
    slug: "can-protocol-best-practices",
    title: "CAN Protocol Best Practices",
    short_description: "Practical habits for implementing and debugging CAN in embedded C, learned from reading traces on real machines with PCAN-Explorer.",
    date: "2025-04-25",
    content: "<p>CAN is a bus you can learn in an afternoon and still be getting wrong five years later. Most of what I have internalised came from sitting with a trace open in PCAN-Explorer while a machine refused to do what the code clearly said it should.</p>\n<p><em>This is a preview from the offline fallback. Open the site over http:// to read the full post.</em></p>"
  },
  {
    slug: "real-time-debugging-techniques",
    title: "Real-time Debugging Techniques",
    short_description: "How I debug firmware when there is no printf, the timing budget is tight, and the failure only happens on the machine.",
    date: "2025-04-15",
    content: "<p>Console logging is wonderful right up until the moment you need to know what happened two hundred milliseconds ago on hardware that is already running a control loop. On machinery firmware you rarely get that luxury, so the approach has to be different.</p>\n<p><em>This is a preview from the offline fallback. Open the site over http:// to read the full post.</em></p>"
  },
  {
    slug: "an-introduction-to-j1939-protocol",
    title: "An Introduction to J1939 Protocol",
    short_description: "A practical overview of the J1939 transport and addressing model, and why it sits on top of CAN rather than replacing it.",
    date: "2025-04-05",
    content: "<p>J1939 is not a replacement for CAN. It is a set of conventions layered on top of it that standardise how heavy equipment identifies nodes, names parameters, and negotiates requests on the bus. Once you understand that framing, most of the specification stops being mysterious.</p>\n<p><em>This is a preview from the offline fallback. Open the site over http:// to read the full post.</em></p>"
  },
  {
    slug: "optimizing-embedded-software-performance",
    title: "Optimizing Embedded Software Performance",
    short_description: "Measuring before optimising, and the small set of changes that usually deliver most of the gain on resource-constrained targets.",
    date: "2025-03-28",
    content: "<p>Performance work on embedded targets has an unfortunate reputation, and it deserves it. Hours spent shaving cycles out of a function that runs twice a second, while a blocking delay sits in a loop untouched by the whole exercise. Measure first, or do not bother.</p>\n<p><em>This is a preview from the offline fallback. Open the site over http:// to read the full post.</em></p>"
  }
];