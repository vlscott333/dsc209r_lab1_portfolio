import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from "../global.js";

async function initProjects() {
  const projectsContainer = document.querySelector(".projects");
  const allProjects = await fetchJSON("../lib/projects.json");

  if (!Array.isArray(allProjects)) {
    if (projectsContainer) {
      projectsContainer.innerHTML = `<p class="inline-error">Projects failed to load. Please refresh.</p>`;
    }
    return;
  }

  renderProjects(allProjects, projectsContainer, "h2");

  const titleEl = document.querySelector(".projects-title");
  if (titleEl) titleEl.textContent = `(${allProjects.length})`;

  let query = "";
  let selectedYear = null;

  const svg = d3.select("#projects-pie-plot");
  const legend = d3.select(".legend");
  const searchInput = document.querySelector(".searchBar");

  // Build pie once using full dataset
  const rolled = d3.rollups(allProjects, v => v.length, d => d.year);
  const data = rolled.map(([year, count]) => ({ label: year, value: count }));
  const colors = d3.scaleOrdinal(d3.schemeTableau10);
  const arcGen = d3.arc().innerRadius(0).outerRadius(50);
  const pie = d3.pie().value(d => d.value);
  const arcData = pie(data);

  // Draw wedges
  const paths = svg.selectAll("path")
    .data(arcData)
    .join("path")
    .attr("d", arcGen)
    .attr("fill", d => colors(d.index))
    .attr("cursor", "pointer");

  // Draw legend
  const legendItems = legend.selectAll("li")
    .data(data)
    .join("li")
    .attr("style", (_, i) => `--color:${colors(i)}`)
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);

  // Helper to render filtered projects
  function renderFilteredProjects() {
    let filtered = allProjects;

    // Search filter
    if (query.trim()) {
      filtered = filtered.filter(p =>
        Object.values(p).join(" ").toLowerCase().includes(query.toLowerCase())
      );
    }

    // Year filter
    if (selectedYear) {
      filtered = filtered.filter(p => p.year === selectedYear);
    }

    renderProjects(filtered, projectsContainer, "h2");
  }

  // Handle wedge click
  paths.on("click", (event, d) => {
    const clickedYear = data[d.index].label;
    selectedYear = selectedYear === clickedYear ? null : clickedYear;

    // Update visual selection
    paths.classed("selected", d2 => data[d2.index].label === selectedYear);
    legendItems.classed("selected", li => li.label === selectedYear);

    renderFilteredProjects();
  });

  // Handle legend click (mirror behavior)
  legendItems.on("click", function (_, d) {
    selectedYear = selectedYear === d.label ? null : d.label;

    paths.classed("selected", d2 => data[d2.index].label === selectedYear);
    legendItems.classed("selected", li => li.label === selectedYear);

    renderFilteredProjects();
  });

  // Search handler
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      query = e.target.value.toLowerCase();
      renderFilteredProjects();
    });
  }
}

initProjects();



