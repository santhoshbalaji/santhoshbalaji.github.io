// Reading pages (day theme). Facts only: dates, roles and numbers the site owner has stated.
export const pages = [
  {
    id: "about", label: "About", title: "From compilers, to maps, to my own products.",
    description: "Santhosh Balaji S: a software developer and consultant in Chennai. Zoho, forest-department GIS work, and now his own products built with AI agents.",
    lead: "I’m Santhosh Balaji S, a software developer and consultant in Chennai. I build GIS platforms and AI agent systems.",
    sections: [
      { label: "The path", title: "Eight years, three kinds of work.", body: `<p><strong>2019 to 2023, Zoho.</strong> Member of Technical Staff, working on compiler systems, collaboration software and platform architecture.</p><p><strong>2024 to 2025, a forest department.</strong> Web developer on government workflows and operational systems. My recent work there was on forest fires: software that goes beyond a form and a chart, and uses geospatial analysis across many parameters to find patterns for monitoring and prevention.</p><p><strong>2025 to now, founder.</strong> I design, build and run my own products: <a href="work/mapsmith.html">MapSmith</a>, <a href="work/nammatn.html">NammaTN</a>, <a href="work/oriv.html">Oriv</a>, <a href="work/jurisfield.html">JurisField</a> and <a href="work/atlas.html">Atlas</a>.</p>` },
      { label: "How I work", title: "Agents write most of the code. I decide what ships.", body: `<p>Most of my code is written by AI agents that I direct and review. Between 2 and 13 November 2026 I ran more than 300 agent threads across half a dozen projects: a GIS platform, a browser, a civic app and a video pipeline.</p><p>Every change goes through review before it ships, and each project has its own tests and release checks.</p>` },
      { label: "Now", title: "November 2026.", body: `<ul class="project-facts"><li>Building MapSmith, an enterprise GIS platform.</li><li>Shipping Oriv, a native browser for Mac and iPhone, at version 0.15.</li><li>Preparing my first video on what AI is doing to the software business.</li></ul>` },
    ],
    next: ["Have a project in mind?", "Work with me", "work-with-me.html"],
  },
  {
    id: "work-with-me", label: "Consulting", title: "Work with me.",
    description: "Consulting and software projects with Santhosh Balaji S: domain software, AI agent systems, RAG and knowledge systems, and product engineering.",
    lead: "I take on software projects for teams and domain experts.",
    sections: [
      { label: "What I do", title: "Four kinds of project.", body: `<p><strong>Domain software.</strong> GIS, field operations, government and scientific workflows, built alongside your experts.</p><p><strong>AI agent systems.</strong> Agents inside real products and operations, with review steps, monitoring and cost control.</p><p><strong>RAG and knowledge systems.</strong> Answers from your documents and data that can be traced back to their source.</p><p><strong>Product engineering.</strong> Web and mobile products, from architecture to release.</p><p>Something else in software? Ask.</p>` },
      { label: "Ways to work", title: "Three ways to start.", body: `<ul class="project-facts"><li>A consultation on a decision, a design or a stuck project.</li><li>Support on a project you already run.</li><li>A new build, from first sketch to deployment.</li></ul>` },
      { label: "First step", title: "Tell me what you’re building.", body: `<p>Email me what you are building, who it is for and when you need it. I’ll reply with questions or a plan.</p>` },
    ],
    next: ["Ready to talk?", "Email me", "mailto:contact@santhoshbalaji.cloud?subject=Project%20enquiry"],
  },
];
