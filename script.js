// Notes:

// To ensure minimal and performant rendering, I've implemented the following:
// - DOM cloning using the <template> tag.
// - Lazy scroll rendering: jobs are loaded in batches of N (e.g. 9) instead of rendering all at once.
// - Incremental updates on filter changes: instead of destroying and recreating all DOM elements, only the nodes that should disappear are removed, the ones that should reappear are added in order, and the rest remain untouched.
// Further optimizations, such as simulating the virtual DOM behavior used by frontend frameworks, are possible but would be overkill for a test designed to take 2–3 hours as stated in the README.

// All internal state is private via closures, so nothing leaks into the global scope.
// Alternatively, we could use (() => { ... })().init(); below.

// Accessibility considerations include responsive design, keyboard navigation via Tab key, an easy-to-use UI, ARIA attributes, and more.

// I could have kept the implementation simpler, but given that the CodeAid test did not meet the expectations, and that this is an open-ended problem with no specific instructions on which performance approach to go for, I went a bit further to demonstrate what I can deliver.

// Job Listings - Module Pattern
const JobListingsModule = (() => {
  // Constants
  const DATA_URL =
    "https://raw.githubusercontent.com/DuneTech/code-test-1/main/data.json";
  const MIN_JOB_CARD_HEIGHT = 325;
  const INITIAL_BATCH_SIZE =
    Math.ceil(((window.innerHeight / MIN_JOB_CARD_HEIGHT) * 3) / 3) * 3; // Number of jobs to load in initial batch, ceiled to highest multiple of 3
  const INCREMENTAL_BATCH_SIZE = 9; // Number of jobs to load per batch

  // Job Data State
  let allJobs = []; // All jobs loaded
  let filteredJobs = []; // Jobs filtered by current criteria
  let displayedJobs = []; // Jobs currently rendered on page

  // Filter State
  let currentRoleFilter = ""; // Selected role filter value
  let currentTechnologiesFilter = []; // Selected technologies filter values
  let currentExperienceFilter = ""; // Selected experience filter value
  let currentCTCFilter = { min: 0, max: 0 }; // Selected CTC range filter values

  // Loading State
  let currentBatch = 0; // Current batch number being displayed
  let isBatchLoading = false; // Whether a batch is currently loading

  // Function to create a job card HTML element using template
  const createJobCard = (job) => {
    // Get the template and clone it
    const jobCardTemplate = document.getElementById("job-card-template");
    const jobCardEl = jobCardTemplate.content.cloneNode(true);

    // Get the job card element and add job ID as data attribute
    const cardElement = jobCardEl.querySelector(".job-card");
    cardElement.setAttribute("data-job-id", job.id);

    // Populate the job card with data
    jobCardEl.querySelector(".job-title").textContent = job.role;
    jobCardEl.querySelector(".company-name").textContent = job.company;
    jobCardEl.querySelector(".job-location").textContent = job.location;
    jobCardEl.querySelector(".experience-level").textContent = job.experience;
    jobCardEl.querySelector(".salary").textContent = `${job.ctc} LPA`;

    // Create and populate technology tags
    const techTagsContainer = jobCardEl.querySelector(".tech-tags");
    job.technologies.forEach((tech) => {
      const techTag = document.createElement("span");
      techTag.className = "tech-tag";
      techTag.textContent = tech;
      techTagsContainer.appendChild(techTag);
    });

    return jobCardEl;
  };

  // Function to get unique roles from job data
  const getUniqueRoles = (jobs) => {
    const roles = [...new Set(jobs.map((job) => job.role))];
    return roles.sort(); // Sort alphabetically
  };

  // Function to get unique technologies from job data
  const getUniqueTechnologies = (jobs) => {
    const technologies = new Set();
    jobs.forEach((job) => {
      job.technologies.forEach((tech) => technologies.add(tech));
    });
    return [...technologies].sort(); // Sort alphabetically
  };

  // Function to get unique experience levels from job data
  const getUniqueExperienceLevels = (jobs) => {
    const experienceLevels = [...new Set(jobs.map((job) => job.experience))];
    return experienceLevels.sort(); // Sort alphabetically
  };

  // Function to get CTC range from job data
  const getCTCRange = (jobs) => {
    let min = jobs[0].ctc;
    let max = jobs[0].ctc;
    for (let i = 1; i < jobs.length; i++) {
      const ctc = jobs[i].ctc;
      if (ctc < min) min = ctc;
      if (ctc > max) max = ctc;
    }
    return { min, max };
  };

  // Function to populate role filter dropdown
  const populateRoleFilter = (roles) => {
    const roleFilter = document.getElementById("role-filter");

    // Clear existing options except "All Roles"
    roleFilter.innerHTML = '<option value="">All Roles</option>';

    // Add role options
    roles.forEach((role) => {
      const option = document.createElement("option");
      option.value = role;
      option.textContent = role;
      roleFilter.appendChild(option);
    });
  };

  // Function to populate technologies filter checkboxes
  const populateTechnologiesFilter = (technologies) => {
    const technologiesFilterLoader = document.getElementById(
      "technologies-filter-loader"
    );
    technologiesFilterLoader.style.display = "none";

    const technologiesFilter = document.getElementById("technologies-filter");
    technologiesFilter.style.display = "flex";

    // Clear existing checkboxes
    technologiesFilter.innerHTML = "";

    // Add technology checkboxes
    technologies.forEach((tech) => {
      const label = document.createElement("label");
      label.className = "checkbox-item";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = tech;
      input.name = "technologies";

      label.appendChild(input);
      label.appendChild(document.createTextNode(tech));
      technologiesFilter.appendChild(label);
    });
  };

  // Function to populate experience filter dropdown
  const populateExperienceFilter = (experienceLevels) => {
    const experienceFilter = document.getElementById("experience-filter");

    // Clear existing options except "All Experience Levels"
    experienceFilter.innerHTML =
      '<option value="">All Experience Levels</option>';

    // Add experience options
    experienceLevels.forEach((level) => {
      const option = document.createElement("option");
      option.value = level;
      option.textContent = level;
      experienceFilter.appendChild(option);
    });
  };

  // Function to update CTC range slider bounds
  const populateCTCRangeFilter = (ctcRange) => {
    const ctcMinSlider = document.getElementById("ctc-min");
    const ctcMaxSlider = document.getElementById("ctc-max");
    const ctcMinValue = document.getElementById("ctc-min-value");
    const ctcMaxValue = document.getElementById("ctc-max-value");

    // Update slider bounds
    ctcMinSlider.min = ctcRange.min;
    ctcMinSlider.max = ctcRange.max;
    ctcMinSlider.value = ctcRange.min;

    ctcMaxSlider.min = ctcRange.min;
    ctcMaxSlider.max = ctcRange.max;
    ctcMaxSlider.value = ctcRange.max;

    // Update display values
    ctcMinValue.textContent = ctcRange.min;
    ctcMaxValue.textContent = ctcRange.max;
  };

  // Function to filter jobs by role
  const filterJobsByRole = (jobs, role) => {
    if (!role) return jobs;
    return jobs.filter((job) => job.role === role);
  };

  // Function to filter jobs by technologies
  const filterJobsByTechnologies = (jobs, technologies) => {
    if (!technologies || technologies.length === 0) return jobs;
    return jobs.filter((job) =>
      technologies.every((tech) => job.technologies.includes(tech))
    );
  };

  // Function to filter jobs by experience level
  const filterJobsByExperience = (jobs, experience) => {
    if (!experience) return jobs;
    return jobs.filter((job) => job.experience === experience);
  };

  // Function to filter jobs by CTC range
  const filterJobsByCTC = (jobs, ctcRange) => {
    if (!ctcRange || (ctcRange.min === 0 && ctcRange.max === 0)) return jobs;
    return jobs.filter(
      (job) => job.ctc >= ctcRange.min && job.ctc <= ctcRange.max
    );
  };

  // Function to get currently displayed job IDs from DOM
  // Note: We query the DOM instead of using displayedJobs state because this function
  // is called during incremental updates BEFORE displayedJobs is updated with new state.
  // We need to know what's actually in the DOM right now to calculate the difference.
  const getCurrentlyDisplayedJobIds = () => {
    const container = document.getElementById("job-cards-container");
    const jobCards = container.querySelectorAll(".job-card[data-job-id]");
    return Array.from(jobCards).map((card) =>
      parseInt(card.getAttribute("data-job-id"))
    );
  };

  // Function to calculate which jobs need to be added/removed for incremental updates
  const calculateJobChanges = (currentJobIds, newJobs) => {
    const newJobIds = newJobs.map((job) => job.id);

    // Jobs to remove: currently displayed but not in new list
    const jobsToRemove = currentJobIds.filter((id) => !newJobIds.includes(id));

    // Jobs to add: in new list but not currently displayed
    const jobsToAdd = newJobs.filter((job) => !currentJobIds.includes(job.id));

    return { jobsToRemove, jobsToAdd };
  };

  // Function to render job cards with incremental updates
  const renderJobBatch = (
    jobs,
    append = false,
    useIncrementalUpdates = false
  ) => {
    const container = document.getElementById("job-cards-container");

    // Clear existing content if not appending and not using incremental updates
    if (!append && !useIncrementalUpdates) {
      container.innerHTML = "";
    }

    // Show message if no jobs found and not appending
    if (jobs.length === 0 && !append) {
      const noResultsTemplate = document.getElementById("no-results-template");
      const noResultsEl = noResultsTemplate.content.cloneNode(true);
      container.appendChild(noResultsEl);
      return;
    }

    // Handle incremental updates
    if (useIncrementalUpdates && !append) {
      const currentJobIds = getCurrentlyDisplayedJobIds();
      const { jobsToRemove, jobsToAdd } = calculateJobChanges(
        currentJobIds,
        jobs
      );

      // Remove jobs that should no longer be displayed
      jobsToRemove.forEach((jobId) => {
        const cardToRemove = container.querySelector(
          `[data-job-id="${jobId}"]`
        );
        if (cardToRemove) {
          cardToRemove.classList.add("animate-out");
          setTimeout(() => {
            if (cardToRemove.parentNode) {
              cardToRemove.remove();
            }
          }, 300); // Match CSS animation duration
        }
      });

      // Add new jobs in the correct order
      if (jobsToAdd.length > 0) {
        // Create a map of job ID to job object for quick lookup
        const jobMap = {};
        jobs.forEach((job) => {
          jobMap[job.id] = job;
        });

        jobsToAdd.forEach((job, addIndex) => {
          const jobCard = createJobCard(job);

          // Find the correct position to insert this job
          const jobIndex = jobs.findIndex((j) => j.id === job.id);
          let insertBeforeElement = null;

          // Look for the next job in the desired order that's already in the DOM
          for (let i = jobIndex + 1; i < jobs.length; i++) {
            const nextJobId = jobs[i].id;
            const nextCard = container.querySelector(
              `[data-job-id="${nextJobId}"]`
            );
            if (nextCard) {
              insertBeforeElement = nextCard;
              break;
            }
          }

          // Insert the card at the correct position
          if (insertBeforeElement) {
            container.insertBefore(jobCard, insertBeforeElement);
          } else {
            container.appendChild(jobCard);
          }

          // Get the actual inserted element for animation
          const insertedCard = container.querySelector(
            `[data-job-id="${job.id}"]`
          );

          // Trigger animation with staggered delay
          setTimeout(() => {
            if (insertedCard) {
              insertedCard.classList.add("animate-in");
            }
          }, addIndex * 100);
        });
      }

      // Remove loading indicator if it exists
      const loadingIndicator = container.querySelector(".loading-more");
      if (loadingIndicator) {
        loadingIndicator.remove();
      }

      return;
    }

    // Original logic for non-incremental updates (lazy loading)
    jobs.forEach((job, index) => {
      const jobCard = createJobCard(job);
      container.appendChild(jobCard);

      // Get the actual job card element that was just added
      const addedCards = container.querySelectorAll(".job-card");
      const cardElement = addedCards[addedCards.length - 1];

      // Trigger animation with staggered delay
      setTimeout(() => {
        if (cardElement) {
          // Use different animation for initial load vs lazy load
          if (append) {
            cardElement.classList.add("animate-in-scale");
          } else {
            cardElement.classList.add("animate-in");
          }
        }
      }, index * 100); // 100ms delay between each card
    });

    // Remove loading indicator if it exists
    const loadingIndicator = container.querySelector(".loading-more");
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
  };

  // Function to load next batch of jobs
  const loadNextBatch = () => {
    if (
      isBatchLoading ||
      currentBatch * INCREMENTAL_BATCH_SIZE >= filteredJobs.length
    ) {
      return; // Already loading or no more jobs to load
    }

    isBatchLoading = true;

    // Show loading indicator
    const container = document.getElementById("job-cards-container");
    const loadingMoreJobsTemplate = document.getElementById(
      "loading-more-jobs-template"
    );
    const loadingMoreJobsEl = loadingMoreJobsTemplate.content.cloneNode(true);
    container.appendChild(loadingMoreJobsEl);

    // Simulate loading delay
    setTimeout(() => {
      const startIndex = currentBatch * INCREMENTAL_BATCH_SIZE;
      const endIndex = Math.min(
        startIndex + INCREMENTAL_BATCH_SIZE,
        filteredJobs.length
      );
      const batchJobs = filteredJobs.slice(startIndex, endIndex);

      displayedJobs.push(...batchJobs);
      renderJobBatch(batchJobs, true);

      currentBatch++;
      isBatchLoading = false;
    }, 500);
  };

  // Function to reset and render initial batch
  const renderInitialBatch = () => {
    currentBatch = 0;
    displayedJobs = [];

    if (filteredJobs.length === 0) {
      renderJobBatch([], false);
      return;
    }

    const initialBatch = filteredJobs.slice(0, INITIAL_BATCH_SIZE);
    displayedJobs = [...initialBatch];
    renderJobBatch(initialBatch, false);
    currentBatch = 1;
  };

  // Function to render batch with incremental updates
  const renderIncrementalBatch = () => {
    if (filteredJobs.length === 0) {
      // Handle empty results with incremental updates
      const currentJobIds = getCurrentlyDisplayedJobIds();
      if (currentJobIds.length > 0) {
        // Remove all existing cards
        currentJobIds.forEach((jobId) => {
          const cardToRemove = document.querySelector(
            `[data-job-id="${jobId}"]`
          );
          if (cardToRemove) {
            cardToRemove.classList.add("animate-out");
            setTimeout(() => {
              if (cardToRemove.parentNode) {
                cardToRemove.remove();
              }
            }, 300);
          }
        });

        // Show no results message after animation
        setTimeout(() => {
          const container = document.getElementById("job-cards-container");
          if (container.children.length === 0) {
            const noResultsTemplate = document.getElementById(
              "no-results-template"
            );
            const noResultsEl = noResultsTemplate.content.cloneNode(true);
            container.appendChild(noResultsEl);
          }
        }, 350);
      } else {
        renderJobBatch([], false);
      }

      currentBatch = 0;
      displayedJobs = [];
      return;
    }

    const initialBatch = filteredJobs.slice(0, INCREMENTAL_BATCH_SIZE);
    displayedJobs = [...initialBatch];
    renderJobBatch(initialBatch, false, true); // Use incremental updates
    currentBatch = 1;
  };

  // Function to update filtered results and render
  const updateResults = () => {
    // Filter jobs based on current filters
    const filterChain = [
      { filter: filterJobsByRole, params: currentRoleFilter },
      { filter: filterJobsByTechnologies, params: currentTechnologiesFilter },
      { filter: filterJobsByExperience, params: currentExperienceFilter },
      { filter: filterJobsByCTC, params: currentCTCFilter },
    ];

    filteredJobs = filterChain.reduce(
      (jobs, { filter, params }) => filter(jobs, params),
      allJobs
    );

    // Check if this is the initial load (no jobs currently displayed)
    const currentJobIds = getCurrentlyDisplayedJobIds();
    const isInitialLoad = currentJobIds.length === 0;

    if (isInitialLoad) {
      // Use traditional rendering for initial load
      renderInitialBatch();
    } else {
      // Use incremental updates for filter changes
      renderIncrementalBatch();
    }
  };

  // Function to show initial job data loader
  const showInitialJobDataLoader = () => {
    const container = document.getElementById("job-cards-container");
    container.innerHTML = ""; // Clear existing content
    const initialLoadingTemplate = document.getElementById(
      "initial-loading-template"
    );
    const initialLoadingEl = initialLoadingTemplate.content.cloneNode(true);
    container.appendChild(initialLoadingEl);
  };

  // Function to show error state
  const showError = (message) => {
    const container = document.getElementById("job-cards-container");
    container.innerHTML = ""; // Clear existing content
    const errorTemplate = document.getElementById("error-template");
    const errorEl = errorTemplate.content.cloneNode(true);
    errorEl.querySelector(".error-message").textContent = `Error: ${message}`;
    container.appendChild(errorEl);
  };

  // Function to handle role filter change
  const handleRoleFilterChange = (e) => {
    currentRoleFilter = e.target.value;
    updateResults();
  };

  // Function to handle scroll events for lazy loading
  const handleScroll = () => {
    // Check if user is near the bottom of the page
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // Load next batch when user is within 200px of the bottom
    if (scrollTop + windowHeight >= documentHeight - 200) {
      loadNextBatch();
    }
  };

  // Function to handle technologies filter change
  const handleTechnologiesFilterChange = (e) => {
    // Get all checked technology checkboxes
    const technologiesFilter = document.getElementById("technologies-filter");
    const checkedBoxes = technologiesFilter.querySelectorAll(
      'input[type="checkbox"]:checked'
    );

    // Extract the values of checked checkboxes
    currentTechnologiesFilter = Array.from(checkedBoxes).map(
      (checkbox) => checkbox.value
    );

    // Update results with new filter
    updateResults();
  };

  // Function to handle experience filter change
  const handleExperienceFilterChange = (e) => {
    currentExperienceFilter = e.target.value;
    updateResults();
  };

  // Function to handle CTC min slider change
  const handleCTCMinChange = (e) => {
    const minValue = parseInt(e.target.value);
    const maxSlider = document.getElementById("ctc-max");
    const maxValue = parseInt(maxSlider.value);

    // Ensure min doesn't exceed max
    if (minValue > maxValue) {
      maxSlider.value = minValue;
      document.getElementById("ctc-max-value").textContent = minValue;
      currentCTCFilter = { min: minValue, max: minValue };
    } else {
      currentCTCFilter = { min: minValue, max: maxValue };
    }

    document.getElementById("ctc-min-value").textContent = minValue;
    updateResults();
  };

  // Function to handle CTC max slider change
  const handleCTCMaxChange = (e) => {
    const maxValue = parseInt(e.target.value);
    const minSlider = document.getElementById("ctc-min");
    const minValue = parseInt(minSlider.value);

    // Ensure max doesn't go below min
    if (maxValue < minValue) {
      minSlider.value = maxValue;
      document.getElementById("ctc-min-value").textContent = maxValue;
      currentCTCFilter = { min: maxValue, max: maxValue };
    } else {
      currentCTCFilter = { min: minValue, max: maxValue };
    }

    document.getElementById("ctc-max-value").textContent = maxValue;
    updateResults();
  };

  // Function to initialize event listeners
  const initializeEventListeners = () => {
    const roleFilter = document.getElementById("role-filter");
    roleFilter.addEventListener("change", handleRoleFilterChange);

    const technologiesFilter = document.getElementById("technologies-filter");
    technologiesFilter.addEventListener(
      "change",
      handleTechnologiesFilterChange
    );

    const experienceFilter = document.getElementById("experience-filter");
    experienceFilter.addEventListener("change", handleExperienceFilterChange);

    // CTC Filter Logic
    const ctcMinSlider = document.getElementById("ctc-min");
    const ctcMaxSlider = document.getElementById("ctc-max");

    ctcMinSlider.addEventListener("input", handleCTCMinChange);
    ctcMaxSlider.addEventListener("input", handleCTCMaxChange);

    // Add scroll listener for lazy loading
    window.addEventListener("scroll", handleScroll);
  };

  // Function to initialize the application
  const init = () => {
    showInitialJobDataLoader();

    fetch(DATA_URL)
      .then((response) => response.json())
      .then((data) => {
        // data = []; // Simulate empty data
        // throw new Error("Simulated error"); // Simulate error

        // Simulate loading delay and render initial results
        // setTimeout(() => {
        // Store all jobs
        allJobs = data;
        filteredJobs = data;

        if (data.length === 0) {
          showError("No job listings found.");
          return;
        }

        // Get unique values and populate all filters
        const uniqueRoles = getUniqueRoles(data);
        const uniqueTechnologies = getUniqueTechnologies(data);
        const uniqueExperienceLevels = getUniqueExperienceLevels(data);
        const ctcRange = getCTCRange(data);

        populateRoleFilter(uniqueRoles);
        populateTechnologiesFilter(uniqueTechnologies);
        populateExperienceFilter(uniqueExperienceLevels);
        populateCTCRangeFilter(ctcRange);

        // Initialize CTC filter with the actual range
        currentCTCFilter = { min: ctcRange.min, max: ctcRange.max };

        // Initialize event listeners
        initializeEventListeners();

        updateResults();
        // }, 2000);
      })
      .catch((error) => {
        console.error("Error fetching job data:", error);
        showError("Failed to load job listings.");
      });
  };

  // Public API
  return {
    init,
  };
})();

// Initialize the module
JobListingsModule.init();

