import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// ------------------------------------------------------------
// FIRST VISUAL: Average Rank by Product Label (Bar Chart)
// ------------------------------------------------------------
d3.csv("data/cosmetic_p.csv").then(data => {
  // Parse numeric fields
  data.forEach(d => {
    d.rank = +d.rank || 0;
    d.Label = d.Label || "Other"; // fallback for missing category
  });

  // Group by Label and compute average rank + count
  const grouped = Array.from(
    d3.group(data, d => d.Label),
    ([category, values]) => ({
      category,
      avgRank: d3.mean(values, v => v.rank),
      productCount: values.length
    })
  ).filter(d => d.category && !isNaN(d.avgRank));

  console.log("Grouped Data:", grouped);

  // --- Chart setup ---
  const svg = d3.select("#category-bar-chart");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 40, right: 20, bottom: 120, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const x = d3.scaleBand()
    .domain(grouped.map(d => d.category))
    .range([0, innerWidth])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(grouped, d => d.avgRank)]).nice()
    .range([innerHeight, 0]);

  const color = d3.scaleOrdinal(d3.schemeTableau10);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Bars
  g.selectAll("rect")
    .data(grouped)
    .enter()
    .append("rect")
    .attr("x", d => x(d.category))
    .attr("y", d => y(d.avgRank))
    .attr("width", x.bandwidth())
    .attr("height", d => innerHeight - y(d.avgRank))
    .attr("fill", d => color(d.category))
    .attr("cursor", "pointer")
    .on("mouseover", (event, d) => {
      d3.select("#tooltip")
        .style("opacity", 1)
        .html(`<strong>${d.category}</strong><br>⭐ ${d.avgRank.toFixed(2)} avg rank<br>${d.productCount} products`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => d3.select("#tooltip").style("opacity", 0));

  // X axis
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end")
    .style("font-size", "0.75em");

  // Y axis
  g.append("g").call(d3.axisLeft(y));

  // Axis labels
  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 100)
    .attr("text-anchor", "middle")
    .text("Product Label");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -50)
    .attr("x", -innerHeight / 2)
    .attr("text-anchor", "middle")
    .text("Average Rank");
});

//------------------------------------------------------------
// SECOND VISUAL: Clustered Bubble Chart of Brands (cleaner layout + abbrev labels)
//------------------------------------------------------------
d3.csv("data/cosmetic_p.csv").then(data => {
  data.forEach(d => {
    d.rank = +d.rank || 0;
  });

  const grouped = Array.from(
    d3.group(data, d => d.brand),
    ([brand, values]) => ({
      brand,
      count: values.length,
      avgRating: d3.mean(values, v => v.rank)
    })
  ).filter(d => d.brand && !isNaN(d.avgRating));

  const topBrands = grouped.sort((a, b) => d3.descending(a.count, b.count)).slice(0, 30);

  const width = 950, height = 650;
  const svg = d3.select("#brand-bubble-chart")
    .attr("width", width)
    .attr("height", height);

  const color = d3.scaleSequential(d3.interpolateRdYlGn)
    .domain([d3.min(topBrands, d => d.avgRating), d3.max(topBrands, d => d.avgRating)]);

  const size = d3.scaleSqrt()
    .domain(d3.extent(topBrands, d => d.count))
    .range([20, 70]);

  if (d3.select("#tooltip").empty()) {
    d3.select("body").append("div")
      .attr("id", "tooltip")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "6px 10px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", 0);
  }

  // Simulation with slightly stronger collision for spacing
  const simulation = d3.forceSimulation(topBrands)
    .force("charge", d3.forceManyBody().strength(8))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(d => size(d.count) + 8))
    .on("tick", ticked);

  const node = svg.selectAll("circle")
    .data(topBrands)
    .enter()
    .append("circle")
    .attr("r", d => size(d.count))
    .attr("fill", d => color(d.avgRating))
    .attr("stroke", "#333")
    .attr("stroke-width", 1)
    .attr("opacity", 0.9)
    .attr("cursor", "pointer")
    .on("mouseover", (event, d) => {
      d3.select("#tooltip")
        .style("opacity", 1)
        .html(`
          <strong>${d.brand}</strong><br>
          ${d.count} products<br>
          ⭐ Avg Rank: ${d.avgRating.toFixed(2)}
        `)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => d3.select("#tooltip").style("opacity", 0));

  // Abbreviate long brand names visually (keep full name in tooltip)
  const label = svg.selectAll("text")
    .data(topBrands)
    .enter()
    .append("text")
    .text(d => d.brand.length > 10 ? d.brand.slice(0, 10) + "…" : d.brand)
    .attr("font-size", "10px")
    .attr("text-anchor", "middle")
    .attr("pointer-events", "none")  // avoids interfering with hover

  function ticked() {
    node.attr("cx", d => d.x)
        .attr("cy", d => d.y);
    label.attr("x", d => d.x)
         .attr("y", d => d.y + 3);
  }
});
