import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from "../global.js";

async function initProjects() {
  // fetch projects data
  const projects = await fetchJSON("../lib/projects.json");
  const projectsContainer = document.querySelector(".projects");
  renderProjects(projects, projectsContainer, "h2");

  const titleEl = document.querySelector(".projects-title");
  if (titleEl) titleEl.textContent = `(${projects.length})`;

  
  let query = "";
  let selectedIndex = -1;

  // containers
  const svg = d3.select("#projects-pie-plot");
  const legend = d3.select(".legend");
  const searchInput = document.querySelector(".searchBar");


  if (svg.empty() || legend.empty()) return;

  //  renderPieChart function
  function renderPieChart(filteredProjects) {
    // Clear old chart and legend
    svg.selectAll("*").remove();
    legend.selectAll("*").remove();

    // aggregate projects by year
    const rolled = d3.rollups(filteredProjects, v => v.length, d => d.year);
    const data = rolled.map(([year, count]) => ({ label: year, value: count }));

   
    const colors = d3.scaleOrdinal(d3.schemeTableau10);
    const arcGen = d3.arc().innerRadius(0).outerRadius(50);
    const pie = d3.pie().value(d => d.value);
    const arcData = pie(data);

    // wedges
    const paths = svg
      .selectAll("path")
      .data(arcData)
      .join("path")
      .attr("d", arcGen)
      .attr("fill", (d) => colors(d.index))
      .attr("cursor", "pointer");

    // legend
    const legendItems = legend
      .selectAll("li")
      .data(data)
      .join("li")
      .attr("style", (_, i) => `--color:${colors(i)}`)
      .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);

    // updateSelection function
    function updateSelection() {
      paths.attr("class", d => (d.index === selectedIndex ? "selected" : null));
      legendItems.attr("class", (_d, i) => (i === selectedIndex ? "selected" : null));

      // filter visible projects by year when a slice is selected
      if (selectedIndex === -1) {
        renderProjects(filteredProjects, projectsContainer, "h2");
      } else {
        const selectedYear = data[selectedIndex].label;
        const yearFiltered = filteredProjects.filter(p => p.year === selectedYear);
        renderProjects(yearFiltered, projectsContainer, "h2");
      }
    }

    // click handler
    paths.on("click", (event, d) => {
      selectedIndex = selectedIndex === d.index ? -1 : d.index;
      updateSelection();
    });

    // legend click mirrors slice behavior
    legendItems.on("click", function () {
      const i = legendItems.nodes().indexOf(this);
      selectedIndex = selectedIndex === i ? -1 : i;
      updateSelection();
    });
  }


  function applyFilters() {
    let filtered = projects;

    // search filter
    if (query.trim() !== "") {
      filtered = filtered.filter(project => {
        const values = Object.values(project).join("\n").toLowerCase();
        return values.includes(query.toLowerCase());
      });
    }

    // year filter
    if (selectedIndex !== -1) {
      const rolled = d3.rollups(projects, v => v.length, d => d.year);
      const data = rolled.map(([year, count]) => ({ label: year, value: count }));
      const selectedYear = data[selectedIndex]?.label;
      filtered = filtered.filter(p => p.year === selectedYear);
    }

    renderProjects(filtered, projectsContainer, "h2");
    renderPieChart(filtered);
  }

  // search input listener
  if (searchInput) {
    searchInput.addEventListener("input", event => {
      query = event.target.value.toLowerCase();
      applyFilters();
    });
  }

  // initial render
  renderPieChart(projects);
}

initProjects();



