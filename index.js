import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

async function initHomeProjects() {
  // --- Existing project logic ---
  const projects = await fetchJSON('./lib/projects.json');
  const latestProjects = projects.slice(0, 3);
  const projectsContainer = document.querySelector('.projects');
  renderProjects(latestProjects, projectsContainer, 'h2');

  // --- Step 3: Fetch GitHub profile data ---
  const githubData = await fetchGitHubData('vlscott333'); // your GitHub username
  console.log('GitHub Data:', githubData);

  // --- Step 4: Target the container ---
  const profileStats = document.querySelector('#profile-stats');

  // --- Step 5: Inject formatted data ---
  if (profileStats && githubData) {
    profileStats.innerHTML = `
      <dl>
        <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
        <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
        <dt>Followers:</dt><dd>${githubData.followers}</dd>
        <dt>Following:</dt><dd>${githubData.following}</dd>
      </dl>
    `;
  }
}

initHomeProjects();
