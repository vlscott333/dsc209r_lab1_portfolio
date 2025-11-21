import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

// Globals
let xScale, yScale;
const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

/* ------------------------------
 Step 1 — Load Data
------------------------------ */
async function loadData() {
  return d3.csv("loc.csv", row => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + "T00:00" + row.timezone),
    datetime: new Date(row.datetime)
  }));
}

/* ------------------------------
 Step 2 — Process Commits
------------------------------ */
function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([commit, lines]) => {
    const first = lines[0];
    const datetime = new Date(first.datetime);

    return {
      id: commit,
      url: "https://github.com/vis-society/lab-7/commit/" + commit,
      author: first.author,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length,
      lines
    };
  }).sort((a, b) => a.datetime - b.datetime); // ensure sorted for scrolling
}

/* ------------------------------
 Stats Renderer
------------------------------ */
function renderCommitInfo(data, commits) {
  const container = d3.select("#stats");
  container.selectAll("*").remove();

  const dl = container.append("dl").attr("class", "stats");

  dl.append("dt").html("Total <abbr title='Lines of Code'>LOC</abbr>");
  dl.append("dd").text(data.length.toLocaleString());

  dl.append("dt").text("Total commits");
  dl.append("dd").text(commits.length);

  const numFiles = d3.groups(data, d => d.file).length;
  const avgLen = d3.mean(data, d => d.length);

  dl.append("dt").text("Files");
  dl.append("dd").text(numFiles);

  dl.append("dt").text("Avg line length");
  dl.append("dd").text(avgLen.toFixed(1));
}

/* ------------------------------
 Scatterplot Initial Render
------------------------------ */
function renderScatterPlot(data, commits) {
  const width = 1000, height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 60 };

  const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([margin.left, width - margin.right]);

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  // gridlines
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(
      d3.axisLeft(yScale)
        .tickSize(-(width - margin.left - margin.right))
        .tickFormat("")
    )
    .attr("class", "gridlines");

  svg.append("g").attr("class", "dots");

  updateScatterPlot(data, commits);
}

/* ------------------------------
 Scatterplot Update
------------------------------ */
function updateScatterPlot(data, commits) {
  const svg = d3.select("#chart").select("svg");
  const dots = svg.select(".dots");

  xScale.domain(d3.extent(commits, d => d.datetime));

  const rScale = d3.scaleSqrt()
    .domain(d3.extent(commits, d => d.totalLines))
    .range([5, 30]);

  dots.selectAll("circle")
    .data(commits, d => d.id)
    .join(
      enter => enter.append("circle")
        .attr("cx", d => xScale(d.datetime))
        .attr("cy", d => yScale(d.hourFrac))
        .attr("r", d => rScale(d.totalLines))
        .style("fill", "steelblue")
        .style("opacity", 0.35),
      update => update
        .transition().duration(300)
        .attr("cx", d => xScale(d.datetime))
        .attr("cy", d => yScale(d.hourFrac))
        .attr("r", d => rScale(d.totalLines)),
      exit => exit.remove()
    );
}

/* ------------------------------
 File Visualization
------------------------------ */
function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap(d => d.lines);

  let files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3.select("#files")
    .selectAll("div")
    .data(files, d => d.name)
    .join(enter => {
      const div = enter.append("div");
      div.append("dt").append("code");
      div.append("small");
      div.append("dd");
      return div;
    });

  filesContainer.select("dt > code").text(d => d.name);
  filesContainer.select("small").text(d => `${d.lines.length} lines`);

  filesContainer.select("dd")
    .selectAll("div")
    .data(d => d.lines)
    .join("div")
    .attr("class", "loc")
    .style("--color", d => colorScale(d.type));
}

/* ------------------------------
 Scrollama: Step Enter
------------------------------ */
function onStepEnter(response) {
  const commit = response.element.__data__;
  const cutoff = commit.datetime;

  const commitsUpTo = allCommits.filter(d => d.datetime <= cutoff);

  updateScatterPlot(allData, commitsUpTo);
  updateFileDisplay(commitsUpTo);
  renderCommitInfo(allData, commitsUpTo);
}

/* ------------------------------
 Bootstrap
------------------------------ */
const allData = await loadData();
const allCommits = processCommits(allData);

// initial render
renderCommitInfo(allData, allCommits);
renderScatterPlot(allData, allCommits);
updateFileDisplay(allCommits);

// generate story
d3.select("#scatter-story")
  .selectAll(".step")
  .data(allCommits)
  .join("div")
  .attr("class", "step")
  .html(d => `
    <p>
      On <strong>${d.datetime.toLocaleString("en", {
        dateStyle: "full",
        timeStyle: "short"
      })}</strong>,
      I made <strong>a commit</strong>.
      I edited <strong>${d.totalLines}</strong> lines across
      <strong>${new Set(d.lines.map(l => l.file)).size}</strong> files.
    </p>
  `);

// Scrollama
scrollama()
  .setup({
    container: "#scrolly-1",
    step: "#scrolly-1 .step",
    offset: 0.5
  })
  .onStepEnter(onStepEnter);
