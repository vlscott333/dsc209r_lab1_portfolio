// --- Imports ---
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// --- Mapbox setup ---
mapboxgl.accessToken =
  'pk.eyJ1IjoidmxlZXNjb3R0MzMzIiwiYSI6ImNtaHNocWtkNDFoemwybHB3czNwemc4bnIifQ.9n3AIaxzkTCdOWPN96ogww';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/outdoors-v12',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});
map.addControl(new mapboxgl.NavigationControl());

// --- SVG overlay ---
const svg = d3.select('#map').select('svg');

// --- Helpers ---
function getCoords(station) {
  const pt = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(pt);
  return { cx: x, cy: y };
}

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}
function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

// --- Pre-bucket arrays for fast lookup ---
let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);

// --- Efficient minute-window filter ---
function filterByMinute(tripsByMinute, minute) {
  if (minute === -1) return tripsByMinute.flat();

  let minMinute = (minute - 60 + 1440) % 1440;
  let maxMinute = (minute + 60) % 1440;

  if (minMinute > maxMinute) {
    const beforeMidnight = tripsByMinute.slice(minMinute);
    const afterMidnight = tripsByMinute.slice(0, maxMinute);
    return beforeMidnight.concat(afterMidnight).flat();
  } else {
    return tripsByMinute.slice(minMinute, maxMinute).flat();
  }
}

// --- Compute station traffic using buckets ---
function computeStationTraffic(stations, timeFilter = -1) {
  const departures = d3.rollup(
    filterByMinute(departuresByMinute, timeFilter),
    (v) => v.length,
    (d) => d.start_station_id
  );
  const arrivals = d3.rollup(
    filterByMinute(arrivalsByMinute, timeFilter),
    (v) => v.length,
    (d) => d.end_station_id
  );

  return stations.map((s) => {
    const id = s.short_name;
    s.arrivals = arrivals.get(id) ?? 0;
    s.departures = departures.get(id) ?? 0;
    s.totalTraffic = s.arrivals + s.departures;
    return s;
  });
}

// --- MAP LOAD ---
map.on('load', async () => {
  console.log('Map loaded.');

  // Bike-lane layers
  const laneStyle = { 'line-color': '#00B050', 'line-width': 4, 'line-opacity': 0.6 };
  map.addSource('boston', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });
  map.addLayer({ id: 'boston', type: 'line', source: 'boston', paint: laneStyle });
  map.addSource('cambridge', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
  });
  map.addLayer({ id: 'cambridge', type: 'line', source: 'cambridge', paint: laneStyle });

  // Load stations
  const stationData = await d3.json('https://dsc106.com/labs/lab07/data/bluebikes-stations.json');
  let stations = stationData.data.stations;
  console.log('Stations loaded:', stations.length);

  // Load & bucket trips
  await d3.csv(
    'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
    (trip) => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);
      const sMin = minutesSinceMidnight(trip.started_at);
      const eMin = minutesSinceMidnight(trip.ended_at);
      departuresByMinute[sMin].push(trip);
      arrivalsByMinute[eMin].push(trip);
      return trip;
    }
  );
  console.log('Trips loaded & bucketed.');

  // Compute initial totals
  stations = computeStationTraffic(stations);

  // Radius scale
  const radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(stations, (d) => d.totalTraffic)])
    .range([0, 25]);

  // --- NEW: Quantized color scale for flow ---
  const stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);

  // Draw circles
  const circles = svg.selectAll('circle')
    .data(stations, (d) => d.short_name)
    .enter()
    .append('circle')
    .attr('r', (d) => radiusScale(d.totalTraffic))
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .attr('fill-opacity', 0.7)
    .style('--departure-ratio', (d) =>
      stationFlow(d.departures / (d.totalTraffic || 1))
    )
    .each(function (d) {
      d3.select(this)
        .append('title')
        .text(`${d.totalTraffic} trips (${d.departures} dep, ${d.arrivals} arr)`);
    });

  // Position updater
  function updatePositions() {
    circles
      .attr('cx', (d) => getCoords(d).cx)
      .attr('cy', (d) => getCoords(d).cy);
  }
  updatePositions();
  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);
  map.on('moveend', updatePositions);

  // Slider controls
  const timeSlider = document.getElementById('time-slider');
  const selectedTime = document.getElementById('selected-time');
  const anyTimeLabel = document.getElementById('any-time');

  function updateScatterPlot(timeFilter) {
    const filteredStations = computeStationTraffic(stations, timeFilter);

    // Adjust circle size range
    timeFilter === -1
      ? radiusScale.range([0, 25])
      : radiusScale.range([3, 50]);

    circles
      .data(filteredStations, (d) => d.short_name)
      .join('circle')
      .attr('r', (d) => radiusScale(d.totalTraffic))
      .style('--departure-ratio', (d) =>
        stationFlow(d.departures / (d.totalTraffic || 1))
      );
  }

  function updateTimeDisplay() {
    const timeFilter = Number(timeSlider.value);
    if (timeFilter === -1) {
      selectedTime.textContent = '';
      anyTimeLabel.style.display = 'block';
    } else {
      selectedTime.textContent = formatTime(timeFilter);
      anyTimeLabel.style.display = 'none';
    }
    updateScatterPlot(timeFilter);
  }

  timeSlider.addEventListener('input', updateTimeDisplay);
  updateTimeDisplay();
});
