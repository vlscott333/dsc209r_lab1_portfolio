import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

async function initHomeProjects() {
  // --- Existing project logic ---
  let projects = [];
  try {
    projects = await fetchJSON('./lib/projects.json');
  } catch (err) {
    console.error('Error loading projects.json:', err);
  }

  const latestProjects = Array.isArray(projects) ? projects.slice(0, 3) : [];
  const projectsContainer = document.querySelector('.projects');
  if (projectsContainer) {
    if (latestProjects.length) {
      renderProjects(latestProjects, projectsContainer, 'h2');
    } else {
      projectsContainer.innerHTML = '<p class="inline-error">Projects failed to load.</p>';
    }
  }

  // --- Step 3: Fetch GitHub profile data ---
  // --- Step 4: Target the container ---
  const profileStats = document.querySelector('#profile-stats');

  // --- Step 5: Inject formatted data ---
  if (profileStats) {
    profileStats.innerHTML = `<p class="loading">Loading GitHub stats…</p>`;

    const githubData = await fetchGitHubData('vlscott333'); // your GitHub username
    console.log('GitHub Data:', githubData);

    if (githubData) {
      profileStats.innerHTML = `
        <div class="stat-grid">
          <div class="stat">
            <div class="stat-label">Public Repos</div>
            <div class="stat-value">${githubData.public_repos}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Public Gists</div>
            <div class="stat-value">${githubData.public_gists}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Followers</div>
            <div class="stat-value">${githubData.followers}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Following</div>
            <div class="stat-value">${githubData.following}</div>
          </div>
        </div>
      `;
    } else {
      profileStats.innerHTML = `
        <p class="inline-error">
          Unable to load GitHub stats right now.
          <a href="https://github.com/vlscott333" target="_blank" rel="noopener">View profile on GitHub</a>.
        </p>
        <img
          class="github-card"
          loading="lazy"
          src="https://github-readme-stats.vercel.app/api?username=vlscott333&show_icons=true&hide_title=true&theme=default"
          alt="GitHub stats card for vlscott333"
        />
        <p class="inline-note">
          If you’re blocking third-party images or scripts, allow <code>github.com</code> and <code>github-readme-stats.vercel.app</code> to see live data.
        </p>
      `;
    }
  }
}

initHomeProjects();
