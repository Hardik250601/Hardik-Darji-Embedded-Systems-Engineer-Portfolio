// renderer.js - hydrates project-template.html from content.json
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const projectSlug = params.get('slug');

  const main = document.querySelector('main');
  if (!projectSlug) {
    main.innerHTML = '<h1 class="text-center text-red-400 mt-12">No project specified.</h1>';
    return;
  }

  let data;
  try {
    data = await window.app.loadContent();
  } catch (e) {
    main.innerHTML = '<h1 class="text-center text-red-400 mt-12">Could not load project data.</h1>';
    return;
  }

  const project = (data.projects || []).find(p => p.slug === projectSlug);
  if (!project) {
    main.innerHTML = '<h1 class="text-center text-red-400 mt-12">Project Not Found</h1>';
    return;
  }

  const esc = window.app.escapeHtml;
  document.title = `${project.title} - Hardik Darji`;

  // ---- Title & tagline ----
  const titleEl = document.getElementById('project-title');
  if (titleEl) titleEl.textContent = project.title;

  const tagEl = document.getElementById('project-tag');
  if (tagEl && project.short_summary) {
    tagEl.textContent = project.short_summary;
  }

  // ---- Main image ----
  const imageEl = document.getElementById('project-main-image');
  if (imageEl) {
    imageEl.src = project.main_image || 'images/placeholder-project.svg';
    imageEl.alt = project.title;
  }

  // ---- Tech stack chips ----
  const techEl = document.getElementById('project-tech');
  if (techEl && Array.isArray(project.tech_stack)) {
    techEl.innerHTML = project.tech_stack.map(t => `<span class="bg-gray-900 text-gray-200 px-3 py-1 rounded-full text-xs font-mono border border-gray-700">${esc(t)}</span>`).join('');
  }

  // ---- Metrics strip ----
  const metricsEl = document.getElementById('project-metrics');
  if (metricsEl && project.metrics) {
    const m = project.metrics;
    const cards = [
      { label: 'Cost reduction', value: m.cost_reduction, accent: 'text-emerald-400' },
      { label: 'First-year saving', value: m.first_year_saving_inr, accent: 'text-amber-400' },
      { label: 'Hardware BOM', value: m.hardware_bom_inr, accent: 'text-white' },
      { label: 'Annual spend', value: m.annual_spend_inr, accent: 'text-white' },
    ];
    metricsEl.innerHTML = cards.map(c => `
      <div class="bg-gray-800/70 backdrop-blur p-5 rounded-2xl border border-gray-700 text-center">
        <div class="text-3xl sm:text-4xl font-extrabold ${c.accent}">${esc(c.value)}</div>
        <div class="text-gray-400 mt-1 text-xs uppercase tracking-wider">${esc(c.label)}</div>
      </div>
    `).join('');
  }

  // ---- Description ----
  const descEl = document.getElementById('project-description');
  if (descEl && project.full_description) {
    descEl.innerHTML = project.full_description
      .split(/\n\n+/)
      .filter(p => p.trim())
      .map(p => `<p class="mb-4 text-gray-300 leading-relaxed">${esc(p).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  // ---- GitHub section ----
  const ghSection = document.getElementById('project-github-section');
  const ghBlurb = document.getElementById('project-github-blurb');
  const ghLink = document.getElementById('project-github-link');
  const ghTitle = ghSection ? ghSection.querySelector('h3') : null;
  if (ghLink) {
    if (project.github_link) {
      ghLink.href = project.github_link;
      ghLink.classList.remove('hidden');
      if (ghSection) ghSection.classList.remove('hidden');
      // Adapt label + heading based on whether the link is a profile or a specific repo
      const isProfile = /github\.com\/[^/]+\/?$/.test(project.github_link.trim());
      if (ghTitle) ghTitle.textContent = isProfile ? 'GitHub Profile' : 'Source on GitHub';
      const labelNode = ghLink.lastChild; // text node after the SVG
      if (labelNode && labelNode.nodeType === 3) {
        labelNode.textContent = isProfile ? ' View GitHub profile' : ' View on GitHub';
      }
    } else {
      ghLink.classList.add('hidden');
      // If no project-specific repo, hide the whole section
      if (ghSection) ghSection.classList.add('hidden');
    }
  }
  if (ghBlurb && project.github_blurb) {
    ghBlurb.textContent = project.github_blurb;
  }
  // ---- Case study blocks (problem, architecture, outcomes, future) ----
  const csEl = document.getElementById('project-case-study');
  if (csEl && project.case_study) {
    const cs = project.case_study;
    let html = '';

    if (cs.problem) {
      html += `
        <section class="mb-8">
          <h3 class="text-2xl font-bold text-amber-400 mb-3">Problem</h3>
          <p class="text-gray-300 leading-relaxed">${esc(cs.problem)}</p>
        </section>`;
    }

    if (cs.architecture) {
      html += `
        <section class="mb-8">
          <h3 class="text-2xl font-bold text-amber-400 mb-3">Architecture</h3>
          <p class="text-gray-300 leading-relaxed">${esc(cs.architecture)}</p>
        </section>`;
    }

    if (Array.isArray(cs.outcomes) && cs.outcomes.length) {
      html += `
        <section class="mb-8">
          <h3 class="text-2xl font-bold text-amber-400 mb-3">Key outcomes</h3>
          <ul class="space-y-2">
            ${cs.outcomes.map(o => `<li class="flex items-start gap-3"><span class="text-emerald-400 mt-1 flex-shrink-0">✓</span><span class="text-gray-300">${esc(o)}</span></li>`).join('')}
          </ul>
        </section>`;
    }

    if (Array.isArray(cs.future_roadmap) && cs.future_roadmap.length) {
      html += `
        <section class="mb-4">
          <h3 class="text-2xl font-bold text-amber-400 mb-3">Future roadmap</h3>
          <ul class="space-y-2">
            ${cs.future_roadmap.map(o => `<li class="flex items-start gap-3"><span class="text-gray-500 mt-1 flex-shrink-0">→</span><span class="text-gray-400">${esc(o)}</span></li>`).join('')}
          </ul>
        </section>`;
    }

    csEl.innerHTML = html;
  }

  // ---- Supportive images (stacked, full width, click-to-zoom lightbox) ----
  const supportiveEl = document.getElementById('project-supportive-images');
  if (supportiveEl) {
    supportiveEl.innerHTML = '';
    const images = project.supportive_images || [];
    // Define captions per known image (data-driven)
    const captions = {
      'images/project-telematics-hardware.svg': 'Actual prototype hardware — ESP32-S3 datalogger brain, SIM7600 4G modem, CAN bus transceiver, MicroSD storage, and 12V/24V→5V wide-input DC-DC power supply, housed in an outdoor-rated acrylic enclosure.',
      'images/project-telematics-architecture.svg': 'End-to-end architecture: machine CAN/J1939 traffic → ESP32-S3 datalogger → 4G/LTE → MQTT broker + cloud log files → live web dashboard.',
      'images/project-telematics-dashboard.svg': 'Web dashboard mock — live fleet map, KPI cards (online machines, active faults, engine hours, fuel rate), per-machine live parameters, and last-known location.',
      'images/project-robot-arch.svg': 'Architecture: handheld remote controller sends Command structs over nRF24L01 RF to the robot, which decodes them and drives motors + arm servos.',
    };
    if (images.length === 0) {
      supportiveEl.innerHTML = '<p class="text-gray-400">No supportive images available.</p>';
    } else {
      for (const img of images) {
        const caption = captions[img] || `${project.title} — supporting image`;
        const fig = document.createElement('figure');
        fig.className = 'supportive-fig';
        fig.innerHTML = `
          <button type="button" class="supportive-img-btn group" aria-label="Zoom image: ${esc(caption)}">
            <img src="${esc(img)}" alt="${esc(caption)}" loading="lazy" class="rounded-xl shadow-lg w-full bg-gray-700 border border-gray-700">
            <span class="zoom-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            </span>
          </button>
          <figcaption class="text-sm text-gray-400 mt-2 text-center">${esc(caption)}</figcaption>
        `;
        const btn = fig.querySelector('.supportive-img-btn');
        btn.addEventListener('click', () => openLightbox(img, caption));
        supportiveEl.appendChild(fig);
      }
    }
  }

  // ---- Links (LinkedIn / Demo) ----
  const liLink = document.getElementById('project-linkedin-link');
  if (liLink) {
    if (project.linkedin_link) {
      liLink.href = project.linkedin_link;
      liLink.classList.remove('hidden');
    } else {
      liLink.classList.add('hidden');
    }
  }
  const demoLink = document.getElementById('project-demo-link');
  if (demoLink) {
    if (project.demo_link) {
      demoLink.href = project.demo_link;
      demoLink.classList.remove('hidden');
    } else {
      demoLink.classList.add('hidden');
    }
  }
});

// ---- Lightbox for supportive images ----
let lightboxEl = null;
function openLightbox(src, caption) {
  if (!lightboxEl) {
    lightboxEl = document.createElement('div');
    lightboxEl.className = 'lightbox-overlay';
    lightboxEl.setAttribute('role', 'dialog');
    lightboxEl.setAttribute('aria-modal', 'true');
    lightboxEl.innerHTML = `
      <button class="lightbox-close" aria-label="Close image">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="lightbox-content">
        <img src="" alt="">
        <p class="lightbox-caption"></p>
      </div>
    `;
    document.body.appendChild(lightboxEl);
    lightboxEl.addEventListener('click', (e) => {
      if (e.target === lightboxEl || e.target.closest('.lightbox-close')) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightboxEl && lightboxEl.classList.contains('is-open')) closeLightbox();
    });
    lightboxEl.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  }
  const img = lightboxEl.querySelector('img');
  const cap = lightboxEl.querySelector('.lightbox-caption');
  img.src = src;
  img.alt = caption || '';
  cap.textContent = caption || '';
  lightboxEl.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  if (!lightboxEl) return;
  lightboxEl.classList.remove('is-open');
  document.body.style.overflow = '';
}
