import { projects } from "../projects.mjs";
// Explicitly invoked, read-only checks. No scheduler, accounts or tracking added.
let failed = false;
for (const project of projects.filter(p => p.url)) {
  try {
    const response = await fetch(project.url, { redirect: "follow", signal: AbortSignal.timeout(15000) });
    console.log(`${project.name}: ${response.status} ${response.url}`);
    await response.body?.cancel();
    if (!response.ok) failed = true;
  } catch (error) {
    failed = true;
    console.error(`${project.name}: ${error.message}`);
  }
}
if (failed) process.exitCode = 1;
