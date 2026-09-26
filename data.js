// data.js - offline fallback for content.json (used when content.json can't be fetched,
// e.g. when opening index.html directly via file://). Mirrors content.json's schema.
//
// The CMS (crm.js) writes to content.json. Edit entries here ONLY if you want to keep
// the site usable without a server, OR while you're still writing your first few posts.

window.allBlogPosts = [
  {
    slug: "my-journey-in-embedded-systems",
    title: "My Journey in Embedded Systems",
    short_description: "A short note on how I got started in embedded systems and the lessons learned along the way.",
    date: "2025-05-03",
    content: "<p>This is a placeholder post. Add your real content via the CMS or by editing content.json.</p>"
  },
  {
    slug: "can-protocol-best-practices",
    title: "CAN Protocol Best Practices",
    short_description: "Practical tips I've picked up while implementing CAN and J1939 stacks on real products.",
    date: "2025-04-25",
    content: "<p>This is a placeholder post. Add your real content via the CMS or by editing content.json.</p>"
  },
  {
    slug: "real-time-debugging-techniques",
    title: "Real-time Debugging Techniques",
    short_description: "How I approach debugging firmware when there's no printf and the timing budget is tight.",
    date: "2025-04-15",
    content: "<p>This is a placeholder post. Add your real content via the CMS or by editing content.json.</p>"
  },
  {
    slug: "an-introduction-to-j1939-protocol",
    title: "An Introduction to J1939 Protocol",
    short_description: "A high-level overview of J1939, the protocol stack I implemented for our machine controller.",
    date: "2025-04-05",
    content: "<p>This is a placeholder post. Add your real content via the CMS or by editing content.json.</p>"
  },
  {
    slug: "optimizing-embedded-software-performance",
    title: "Optimizing Embedded Software Performance",
    short_description: "Techniques for squeezing more performance out of resource-constrained microcontrollers.",
    date: "2025-03-28",
    content: "<p>This is a placeholder post. Add your real content via the CMS or by editing content.json.</p>"
  }
];
