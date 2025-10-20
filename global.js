console.log("IT’S ALIVE!");

// Helper: returns an array instead of a NodeList
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Step 3.1 — Define pages
let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "Resume/", title: "Resume" },
  { url: "https://github.com/vlscott333", title: "Github" }
];

// Step 3.2 — Set base path (local vs GitHub Pages)
const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"                                  
    : "/dsc209r_lab1_portfolio/";          

// Create <nav> and prepend to <body>
let nav = document.createElement("nav");
document.body.prepend(nav);

// Loop through pages to build links
for (let p of pages) {
  let url = p.url;
  let title = p.title;

  // Prefix internal links with BASE_PATH
  if (!url.startsWith("http")) {
    url = BASE_PATH + url;
  }

  // Create the <a> element
  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  // Highlight current page
  a.classList.toggle(
    "current",
    a.host === location.host &&
      a.pathname.replace(/\/$/, "") === location.pathname.replace(/\/$/, "")
  );

  // Open external links (GitHub) in a new tab
  a.toggleAttribute("target", a.host !== location.host);
  if (a.hasAttribute("target")) {
    a.target = "_blank";
    a.rel = "noopener"; 
  }


  nav.append(a);
}


// Step 5 — Add color-scheme selector dynamically
document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select id="color-scheme">
      <option value="auto" selected>Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const schemeSelect = document.querySelector("#color-scheme");

if (schemeSelect) {
  // load saved preference
  if ("colorScheme" in localStorage) {
    schemeSelect.value = localStorage.colorScheme;
  }

  // Apply the initial color scheme
  updateColorScheme(schemeSelect.value);

  // save it and apply immediately
  schemeSelect.addEventListener("change", (event) => {
    const value = event.target.value;
    updateColorScheme(value);
    localStorage.colorScheme = value; 
  });
}

// Helper function to apply the color scheme
function updateColorScheme(value) {
  if (value === "auto" || value === "light") {
    document.documentElement.style.colorScheme = "light";
  } else {
    document.documentElement.style.colorScheme = "dark";
  }
}

export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
      } 
    const data = await response.json();
    return data;}
   catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = "h2") {
  if (!Array.isArray(projects) || !containerElement) return;

  containerElement.innerHTML = ""; // clear existing items

  if (projects.length === 0) {
    containerElement.innerHTML = "<p>No projects found.</p>";
    return;
  }

  for (const project of projects) {
    const article = document.createElement("article");
    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image || ""}" alt="${project.title || "Project image"}">
      <p>${project.description || "No description available."}</p>
    `;
    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  // Reuse your existing fetchJSON helper to get the GitHub API response
  return fetchJSON(`https://api.github.com/users/${username}`);
}
