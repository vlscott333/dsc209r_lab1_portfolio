import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

/* ------------------------------
 Step 1.1 — Load and Parse CSV
------------------------------ */
async function loadData() {
  const data = await d3.csv("loc.csv", (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + "T00:00" + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

/* ------------------------------
 Step 1.2 — Process Commits
------------------------------ */
function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;

      const ret = {
        id: commit,
        url: "https://github.com/vis-society/lab-7/commit/" + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, "lines", {
        value: lines,
        enumerable: false,
        writable: true,
        configurable: true,
      });

      return ret;
    });
}

/* ------------------------------
 Step 1.3 — Render Summary Stats
------------------------------ */
function renderCommitInfo(data, commits) {
  const dl = d3.select("#stats").append("dl").attr("class", "stats");

  // Base stats
  dl.append("dt").html('Total <abbr title="Lines of Code">LOC</abbr>');
  dl.append("dd").text(data.length.toLocaleString());

  dl.append("dt").text("Total commits");
  dl.append("dd").text(commits.length.toLocaleString());

  // Derived stats
  const numFiles = d3.groups(data, (d) => d.file).length;
  const avgLineLength = d3.mean(data, (d) => d.length);
  const maxDepth = d3.max(data, (d) => d.depth);
  const avgDepth = d3.mean(data, (d) => d.depth);

  dl.append("dt").text("Number of files");
  dl.append("dd").text(numFiles);

  dl.append("dt").text("Average line length (chars)");
  dl.append("dd").text(avgLineLength.toFixed(2));

  dl.append("dt").text("Max depth");
  dl.append("dd").text(maxDepth);

  dl.append("dt").text("Average depth");
  dl.append("dd").text(avgDepth.toFixed(2));
}

/* ------------------------------
 Step 2 — Scatterplot (Commits by Time of Day)
------------------------------ */
function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 60 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("overflow", "visible");

  // --- Scales ---
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([5, 30]);

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  // --- Gridlines ---
  const gridlines = svg
    .append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${usableArea.left}, 0)`);
  gridlines.call(d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width));

  // --- Dots ---
  const dots = svg.append("g").attr("class", "dots");

  dots.selectAll("circle")
    .data(sortedCommits)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", (d) => rScale(d.totalLines))
    .style("fill", "steelblue")
    .style("fill-opacity", 0.35)
    .on("mouseenter", (event, commit) => {
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mousemove", (event) => updateTooltipPosition(event))
    .on("mouseleave", () => updateTooltipVisibility(false));

  // --- Axes ---
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, "0") + ":00");

  svg.append("g")
    .attr("transform", `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg.append("g")
    .attr("transform", `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  // --- Helper: check if commit inside brush box ---
  function isCommitSelected(selection, commit) {
    if (!selection) return false;
    const [[x0, y0], [x1, y1]] = selection;
    const cx = xScale(commit.datetime);
    const cy = yScale(commit.hourFrac);
    return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
  }

  // --- Step 5.5: Selection Count ---
  function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];

    const countElement = document.querySelector("#selection-count");
    countElement.textContent = `${
      selectedCommits.length || "No"
    } commits selected`;

    return selectedCommits;
  }

  // --- Step 5.6: Language Breakdown ---
  function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    const container = document.getElementById("language-breakdown");

    if (selectedCommits.length === 0) {
      container.innerHTML = "";
      return;
    }

    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);

    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type
    );

    container.innerHTML = "";
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format(".1~%")(proportion);
      container.innerHTML += `
        <dt>${language}</dt>
        <dd>${count} lines (${formatted})</dd>
      `;
    }
  }

  // --- Brush Handler ---
  function brushed(event) {
  const selection = event.selection;

  d3.selectAll("circle")
    .transition()
    .duration(150)
    .style("fill", (d) =>
      isCommitSelected(selection, d) ? "#ff6b6b" : "steelblue"
    )
    .style("fill-opacity", (d) =>
      isCommitSelected(selection, d) ? 0.9 : 0.35
    )
    .style("stroke", (d) =>
      isCommitSelected(selection, d) ? "#900" : "none"
    );

  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);

  // --- Brush selection logic ---
function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const [[x0, y0], [x1, y1]] = selection;
  const cx = xScale(commit.datetime);
  const cy = yScale(commit.hourFrac);
  return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
}

// --- Step 5.5: Selection Count ---
function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector("#selection-count");
  countElement.textContent = `${
    selectedCommits.length || "No"
  } commits selected`;

  return selectedCommits;
}

// --- Step 5.6: Language Breakdown ---
function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById("language-breakdown");

  if (selectedCommits.length === 0) {
    container.innerHTML = "";
    return;
  }

  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Count how many lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type
  );

  // Update DOM with formatted results
  container.innerHTML = "";
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format(".1~%")(proportion);

    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count.toLocaleString()} lines (${formatted})</dd>
    `;
  }
}

// --- Brush event handler ---
function brushed(event) {
  const selection = event.selection;

  d3.selectAll("circle")
    .transition()
    .duration(100)
    .style("fill", (d) =>
      isCommitSelected(selection, d) ? "#ff6b6b" : "steelblue"
    )
    .style("fill-opacity", (d) =>
      isCommitSelected(selection, d) ? 0.9 : 0.35
    );

  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

}



  // --- Brush Setup ---
  const brush = d3.brush()
    .extent([[usableArea.left, usableArea.top], [usableArea.right, usableArea.bottom]])
    .on("start brush end", brushed);

  svg.append("g").attr("class", "brush").call(brush);

  // Raise dots & axes above brush overlay
  svg.selectAll(".dots, .overlay ~ *").raise();

  // --- Axis Labels ---
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text("Date of Commit");

  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", 15)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text("Hour of Day");
}



/* ------------------------------
 Step 3 — Tooltip
------------------------------ */
function renderTooltipContent(commit) {
  const link = document.getElementById("commit-link");
  const date = document.getElementById("commit-date");
  const author = document.getElementById("commit-author");
  const lines = document.getElementById("commit-lines");

  if (!commit || Object.keys(commit).length === 0) {
    link.textContent = "";
    link.href = "#";
    date.textContent = "";
    author.textContent = "";
    lines.textContent = "";
    return;
  }

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString("en", {
    dateStyle: "full",
    timeStyle: "short",
  });
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

// --- Tooltip helpers ---
function updateTooltipVisibility(show) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.classList.toggle("visible", show);
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById("commit-tooltip");
  const offset = 10; // distance from cursor (≈ 1 cm on screen)
  tooltip.style.left = `${event.clientX + offset}px`;
  tooltip.style.top = `${event.clientY - offset}px`;
}



/* ------------------------------
 Run Everything
------------------------------ */
const data = await loadData();
const commits = processCommits(data);
renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
