import { fetchJSON, renderProjects } from "../global.js";

async function initProjects() {
  const projects = await fetchJSON("../lib/projects.json");
  const projectsContainer = document.querySelector(".projects");
  renderProjects(projects, projectsContainer, "h2");

  // Step 1.6 — Count projects and update title
  const titleEl = document.querySelector(".projects-title");
  if (titleEl) {
    titleEl.textContent = `(${projects.length})`; // shows “Projects (2)” etc.
  }
}

initProjects();
