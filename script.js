
let currentTaskList = null;
let playerData = null;
let currentUsername = "";
let currentFilter = "all"; // Track current filter state
let selectedTier = null; // Track currently selected tier
let currentLoadingTier = null; // Track which tier is currently loading
let itemDatabase = {}; // Database of item data from OSRS Wiki
let renderedTabs = new Set(); // Track which tabs have been rendered
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const USERNAME_CACHE_KEY = "osrs_last_username";
const LIST_TYPE_CACHE_KEY = "osrs_last_list_type";
const PLAYER_DATA_CACHE_KEY = "osrs_player_data";
const PLAYER_DATA_TIME_KEY = "osrs_player_data_time";

// Load item database on page load
async function loadItemDatabase() {
const cacheKey = "osrs_item_database";
const cacheTimeKey = "osrs_item_database_time";

// Check if we have cached data that's still valid
const cachedData = localStorage.getItem(cacheKey);
const cacheTime = localStorage.getItem(cacheTimeKey);

if (cachedData && cacheTime) {
    const timeDiff = Date.now() - parseInt(cacheTime);
    if (timeDiff < CACHE_DURATION) {
    itemDatabase = JSON.parse(cachedData);
    return;
    }
}

try {
    const response = await fetch(
    "https://oldschool.runescape.wiki/w/Collection_log/Table",
    {
        mode: "cors",
    }
    );

    if (!response.ok) {
    throw new Error("Failed to fetch collection log table");
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Find all table rows with item data
    const rows = doc.querySelectorAll("tr[data-item-id]");

    rows.forEach((row) => {
    const itemId = row.getAttribute("data-item-id");
    const imgElement = row.querySelector("img");
    const linkElement = row.querySelector("a[title]");

    if (itemId && imgElement && linkElement) {
        const imageSrc = imgElement.getAttribute("src");
        const itemName = linkElement.getAttribute("title");

        // Convert relative URLs to absolute
        const fullImageUrl = imageSrc.startsWith("/")
        ? `https://oldschool.runescape.wiki${imageSrc}`
        : imageSrc;

        itemDatabase[itemId] = {
        id: parseInt(itemId),
        name: itemName,
        image: fullImageUrl,
        imageThumb: fullImageUrl.replace(
            /\.(png|jpg|jpeg)(\?.*)?$/i,
            ".png?32px"
        ), // Create 32px version
        };
    }
    });

    // Cache the data
    localStorage.setItem(cacheKey, JSON.stringify(itemDatabase));
    localStorage.setItem(cacheTimeKey, Date.now().toString());
} catch (error) {
    // Try to use cached data even if expired
    if (cachedData) {
    itemDatabase = JSON.parse(cachedData);
    }
}
}

// Function to save player data to localStorage
function savePlayerData(username, data) {
const cacheKey = `${PLAYER_DATA_CACHE_KEY}_${username}`;
const timeKey = `${PLAYER_DATA_TIME_KEY}_${username}`;

localStorage.setItem(cacheKey, JSON.stringify(data));
localStorage.setItem(timeKey, Date.now().toString());
}

// Function to load player data from localStorage
function loadCachedPlayerData(username) {
const cacheKey = `${PLAYER_DATA_CACHE_KEY}_${username}`;
const timeKey = `${PLAYER_DATA_TIME_KEY}_${username}`;

const cachedData = localStorage.getItem(cacheKey);
const cacheTime = localStorage.getItem(timeKey);

if (cachedData && cacheTime) {
    const timeDiff = Date.now() - parseInt(cacheTime);
    const isValid = timeDiff < CACHE_DURATION;

    if (isValid) {
    return JSON.parse(cachedData);
    }
}

return null;
}

// Function to save username to localStorage
function saveUsername(username) {
if (username && username.trim()) {
    localStorage.setItem(USERNAME_CACHE_KEY, username.trim());
}
}

// Function to load username from localStorage
function loadSavedUsername() {
const savedUsername = localStorage.getItem(USERNAME_CACHE_KEY);
if (savedUsername) {
    document.getElementById("username").value = savedUsername;
}
}

// Function to save list type to localStorage
function saveListType(listType) {
if (listType) {
    localStorage.setItem(LIST_TYPE_CACHE_KEY, listType);
}
}

// Function to load list type from localStorage
function loadSavedListType() {
const savedListType = localStorage.getItem(LIST_TYPE_CACHE_KEY);
if (savedListType) {
    document.getElementById("listType").value = savedListType;
}
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
// Load saved username and list type
loadSavedUsername();
loadSavedListType();

// Show initial loading for item database
const loadingArea = document.getElementById("loadingArea");
const loadingText = document.getElementById("loadingText");

loadingArea.style.display = "block";
loadingText.textContent = "Loading item database from OSRS Wiki...";

await loadItemDatabase();

loadingArea.style.display = "none";

// Add event listener for filter changes
document
    .getElementById("taskFilter")
    .addEventListener("change", applyFilter);

// Auto-load cached data if available
await autoLoadCachedData();
});

// Function to auto-load cached data on page load
async function autoLoadCachedData() {
const savedUsername = localStorage.getItem(USERNAME_CACHE_KEY);

if (!savedUsername) {
    return; // No saved username, nothing to load
}

const normalizedUsername = savedUsername.replace(/\s+/g, "_");
const cachedPlayerData = loadCachedPlayerData(normalizedUsername);

if (!cachedPlayerData) {
    return; // No cached data or cache expired
}

// We have valid cached data, load it
try {
    currentUsername = normalizedUsername;
    playerData = cachedPlayerData;

    // Load the saved task list type (or default to current selection)
    const listType = document.getElementById("listType").value;

    const taskListResponse = await fetch(`lists/${listType}.json`);
    if (!taskListResponse.ok) {
    throw new Error(`Failed to load ${listType} task list`);
    }
    currentTaskList = await taskListResponse.json();

    // Render the tasks
    initializeTaskArea();
    renderDashboard();

    // Show the task area (similar to hideLoading)
    document.getElementById("loadingArea").style.display = "none";
    document.getElementById("dashboardArea").style.display = "block";
    document.getElementById("taskArea").style.display = "block";

    // Show cache indicator
    const cacheIndicator = document.getElementById("cacheIndicator");
    if (cacheIndicator) {
    cacheIndicator.classList.add("show");
    }
} catch (error) {
    // Silently handle errors in auto-loading
}
}

async function loadTaskList() {
const username = document.getElementById("username").value.trim();
const listType = document.getElementById("listType").value;

if (!username) {
    showError("Please enter a username");
    return;
}

// Save the username and list type for future use
saveUsername(username);
saveListType(listType);

currentUsername = username.replace(/\s+/g, "_");

showLoading();
hideError();

// Hide cache indicator when loading fresh data
const cacheIndicator = document.getElementById("cacheIndicator");
if (cacheIndicator) {
    cacheIndicator.classList.remove("show");
}

try {
    // Update loading text
    document.getElementById("loadingText").textContent =
    "Loading task list...";

    // Load task list
    const taskListResponse = await fetch(`lists/${listType}.json`);
    if (!taskListResponse.ok) {
    throw new Error(`Failed to load ${listType} task list`);
    }
    currentTaskList = await taskListResponse.json();

    // Update loading text
    document.getElementById("loadingText").textContent =
    "Loading player data...";

    // Load player data
    const playerResponse = await fetch(
    `https://sync.runescape.wiki/runelite/player/${currentUsername}/STANDARD`
    );
    if (!playerResponse.ok) {
    throw new Error(
        "Failed to load player data. Please check the username is correct."
    );
    }
    playerData = await playerResponse.json();

    // Save player data to cache
    savePlayerData(currentUsername, playerData);

    // Update loading text
    document.getElementById("loadingText").textContent =
    "Rendering tasks...";

    hideLoading();
    initializeTaskArea();
    renderDashboard();
} catch (error) {
    hideLoading();
    showError(error.message);
}
}

// Function to get item data from our database
function getItemData(itemId) {
if (itemDatabase[itemId]) {
    return itemDatabase[itemId];
}

// Fallback for items not in database
return {
    id: parseInt(itemId),
    name: `Item ${itemId}`,
    image: `https://oldschool.runescape.wiki/images/thumb/${itemId}.png/32px-${itemId}.png`,
    imageThumb: `https://oldschool.runescape.wiki/images/thumb/${itemId}.png/32px-${itemId}.png`,
};
}

function showLoading() {
document.getElementById("loadingArea").style.display = "block";
document.getElementById("dashboardArea").style.display = "none";
document.getElementById("taskArea").style.display = "none";
}

function hideLoading() {
document.getElementById("loadingArea").style.display = "none";
document.getElementById("dashboardArea").style.display = "block";
document.getElementById("taskArea").style.display = "block";
}

function showError(message) {
const errorArea = document.getElementById("errorArea");
errorArea.innerHTML = `<div class="error">${message}</div>`;
errorArea.style.display = "block";
}

function hideError() {
document.getElementById("errorArea").style.display = "none";
}

function renderDashboard() {
if (!currentTaskList) return;

const tiers = Object.keys(currentTaskList);
let totalTasks = 0;
let totalCompleted = 0;
const tierStats = {};

// Calculate overall and tier-specific stats (only collection-log tasks)
tiers.forEach((tier) => {
    const tasks = currentTaskList[tier];

    // Filter to only include collection-log verification tasks
    const collectionLogTasks = tasks.filter(
    (task) =>
        task.verification && task.verification.method === "collection-log"
    );

    const completed = collectionLogTasks.filter((task) =>
    isTaskCompleted(task)
    ).length;

    totalTasks += collectionLogTasks.length;
    totalCompleted += completed;

    tierStats[tier] = {
    total: collectionLogTasks.length,
    completed: completed,
    percentage:
        collectionLogTasks.length > 0
        ? (completed / collectionLogTasks.length) * 100
        : 0,
    };
});

const overallPercentage =
    totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;

// Update overall progress circle
setTimeout(() => {
    updateProgressCircle("overallProgress", overallPercentage, true);
}, 100);
document.getElementById(
    "overallPercentage"
).textContent = `${Math.round(overallPercentage)}%`;

// Render tier progress cards
const tierProgressGrid = document.getElementById("tierProgressGrid");
tierProgressGrid.innerHTML = "";

tiers.forEach((tier) => {
    const stats = tierStats[tier];
    const tierCard = document.createElement("div");
    tierCard.className = `tier-progress-card ${tier}`;
    tierCard.style.cursor = "pointer";

    tierCard.innerHTML = `
    <div class="tier-circle">
        <svg class="circle-svg" viewBox="0 0 120 120">
        <circle class="circle-bg" cx="60" cy="60" r="54"></circle>
        <circle class="circle-progress ${tier}" cx="60" cy="60" r="54" id="${tier}Progress"></circle>
        </svg>
        <div class="circle-text">
        <div class="circle-percentage">${Math.round(
            stats.percentage
        )}%</div>
        </div>
    </div>
    <div class="tier-name">${tier}</div>
    <div class="tier-stats-text">
        ${stats.completed} of ${stats.total} trackable tasks<br>
        ${stats.total - stats.completed} remaining
    </div>
    `;

    // Add click handler to show tier content
    tierCard.addEventListener('click', () => {
        showTierContent(tier);
    });

    tierProgressGrid.appendChild(tierCard);

    // Update the tier progress circle after a short delay for animation
    setTimeout(() => {
        updateProgressCircle(`${tier}Progress`, stats.percentage, true);
    }, 200 + (tiers.indexOf(tier) * 150)); // Stagger the animations
});

// Update tier selection visual state after all cards are created
setTimeout(() => {
    updateTierSelection();
}, 100);
}

function updateProgressCircle(elementId, percentage, animateFromZero = true) {
const circle = document.getElementById(elementId);
if (!circle) return;

const circumference = 2 * Math.PI * 54; // radius is 54
const targetOffset = circumference - (percentage / 100) * circumference;

// Set up the circle for animation
circle.style.strokeDasharray = circumference;

if (animateFromZero) {
    // Start from 0% (completely hidden - offset = circumference)
    circle.style.strokeDashoffset = circumference; // Start at 0%
    
    // Trigger animation on next frame to target percentage
    requestAnimationFrame(() => {
        circle.style.strokeDashoffset = targetOffset;
    });
} else {
    // Set directly without animation
    circle.style.strokeDashoffset = targetOffset;
}
}

function animateProgressBar(container) {
const progressFill = container.querySelector('.progress-fill[data-target-width]');
if (progressFill) {
    const targetWidth = progressFill.getAttribute('data-target-width');
    // Reset to 0 then animate to target
    progressFill.style.width = '0%';
    requestAnimationFrame(() => {
        progressFill.style.width = `${targetWidth}%`;
    });
}
}

function initializeTaskArea() {
selectedTier = null; // Clear selection
currentLoadingTier = null; // Clear loading tier
updateTierSelection();

const taskContent = document.getElementById("taskContent");
taskContent.innerHTML = `
    <div style="text-align: center; padding: 40px" class="text-dark">
        <h3>Select a tier from the dashboard above to view tasks</h3>
        <p>Click on any tier progress card to see the tasks for that difficulty level.</p>
    </div>
`;
}

function updateTierSelection() {
// Remove selected class from all tier cards
document.querySelectorAll('.tier-progress-card').forEach(card => {
    card.classList.remove('selected');
});

// Add selected class to the current tier if one is selected
if (selectedTier) {
    const selectedCard = document.querySelector(`.tier-progress-card.${selectedTier}`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
}
}

function showTierContent(tierName) {
const taskContent = document.getElementById("taskContent");
const tasks = currentTaskList[tierName];

// Update selected tier and cancel any previous loading
selectedTier = tierName;
currentLoadingTier = tierName;
updateTierSelection();

// Render tier content immediately (synchronous now)
const html = renderTierContent(tierName, tasks);
taskContent.innerHTML = html;

// Animate progress bar after content is loaded
setTimeout(() => {
    animateProgressBar(taskContent);
}, 50);
}

function renderTierContent(tier, tasks) {
// Apply filter and calculate stats in one pass
let filteredTasks = [];
let completedCount = 0;

for (const task of tasks) {
    const completed = isTaskCompleted(task);
    if (completed) completedCount++;
    
    if (currentFilter === "all" || 
        (currentFilter === "completed" && completed) ||
        (currentFilter === "incomplete" && !completed)) {
        filteredTasks.push({ ...task, completed });
    }
}

const completionRate = tasks.length > 0 
    ? ((completedCount / tasks.length) * 100).toFixed(1) 
    : 0;

// Return initial HTML structure immediately
const initialHtml = `
    <div class="tier-header">
        <button class="back-btn" onclick="initializeTaskArea()">← Back to Overview</button>
        <h2 class="tier-title">${tier.charAt(0).toUpperCase() + tier.slice(1)} Tasks</h2>
    </div>
    <div class="tier-stats">
        <div class="stat-card">
            <h3>${completedCount}</h3>
            <p>Completed</p>
        </div>
        <div class="stat-card">
            <h3>${tasks.length - completedCount}</h3>
            <p>Remaining</p>
        </div>
        <div class="stat-card">
            <h3>${completionRate}%</h3>
            <p>Progress</p>
        </div>
    </div>
    <div class="progress-bar">
        <div class="progress-fill" data-target-width="${completionRate}" style="width: 0%"></div>
    </div>
    ${filteredTasks.length === 0 ? 
        `<div style="text-align: center; padding: 40px; color: #666;">
            <h3>No tasks match the current filter</h3>
            <p>Try changing the filter to see more tasks.</p>
        </div>` : 
        `<div class="task-grid" id="task-grid-${tier}">
            <div class="loading-tasks" style="grid-column: 1 / -1; text-align: center; padding: 20px;">
                <div class="spinner"></div>
                <span>Loading tasks...</span>
            </div>
        </div>`
    }
`;

// Start lazy loading tasks after returning initial structure
if (filteredTasks.length > 0) {
    setTimeout(() => {
        lazyLoadTasks(tier, filteredTasks);
    }, 100);
}

return initialHtml;
}

async function lazyLoadTasks(tier, filteredTasks) {
const taskGrid = document.getElementById(`task-grid-${tier}`);
if (!taskGrid || currentLoadingTier !== tier) return; // User might have navigated away

// Remove loading indicator
const loadingElement = taskGrid.querySelector('.loading-tasks');
if (loadingElement) {
    loadingElement.remove();
}

const batchSize = 8; // Smaller batch size for smoother loading
let currentIndex = 0;

async function loadNextBatch() {
    if (currentIndex >= filteredTasks.length || currentLoadingTier !== tier) {
        return; // All tasks loaded or user navigated away
    }

    const batch = filteredTasks.slice(currentIndex, currentIndex + batchSize);
    const batchElements = [];

    // Process tasks in current batch
    for (const task of batch) {
        // Check if we should still continue
        if (currentLoadingTier !== tier) return;

        const requirements = getTaskRequirements(task);
        const requiredItemsHtml = await renderRequiredItems(task);
        const progressInfo = getTaskProgress(task);

        const taskElement = document.createElement('div');
        taskElement.className = `task-card ${task.completed ? "completed" : "incomplete"}`;
        taskElement.style.opacity = '0';
        taskElement.style.transform = 'translateY(20px)';
        taskElement.innerHTML = `
            <div class="task-header">
                <img src="${task.imageLink}" alt="${task.name}" class="task-image" onerror="this.style.display='none'">
                <div class="task-title">${task.name}</div>
                <div class="completion-badge ${task.completed ? "completed" : "incomplete"}">
                    ${task.completed ? "✓ Complete" : "✗ Incomplete"}
                </div>
            </div>
            <div class="task-tip">${task.tip}</div>
            <div class="task-requirements">
                <strong>Requirements:</strong> ${requirements}
                ${progressInfo ? `<br><strong>Progress:</strong> ${progressInfo}` : ""}
                ${requiredItemsHtml}
            </div>
            <div class="task-links">
                <a href="${task.wikiLink}" target="_blank" class="task-link">Wiki</a>
            </div>
        `;

        batchElements.push(taskElement);
    }

    // Check one more time before DOM manipulation
    if (currentLoadingTier !== tier) return;

    // Add elements to DOM
    batchElements.forEach(element => {
        taskGrid.appendChild(element);
    });

    // Animate elements in
    requestAnimationFrame(() => {
        batchElements.forEach((element, index) => {
            setTimeout(() => {
                if (currentLoadingTier === tier) { // Check before animation
                    element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                }
            }, index * 50); // Stagger animation
        });
    });

    currentIndex += batchSize;

    // Check if we should continue loading
    if (currentIndex < filteredTasks.length && currentLoadingTier === tier) {
        // Check if user is still on this tier
        if (document.getElementById(`task-grid-${tier}`)) {
            // Continue loading after a short delay
            setTimeout(() => {
                if (currentLoadingTier === tier) {
                    requestAnimationFrame(loadNextBatch);
                }
            }, 100);
        }
    }
}

// Start loading the first batch
loadNextBatch();
}

async function renderRequiredItems(task) {
if (!task.verification || !task.verification.itemIds) {
    return "";
}

const itemIds = task.verification.itemIds;
let itemsHtml = '<div class="required-items">';

for (const itemId of itemIds) {
    const isObtained =
    playerData.collection_log &&
    playerData.collection_log.includes(parseInt(itemId));
    const itemData = getItemData(itemId);

    itemsHtml += `
    <div class="required-item ${
        isObtained ? "obtained" : "not-obtained"
    }">
        <img src="${itemData.imageThumb}" 
            alt="${itemData.name}" 
            onerror="this.src='https://oldschool.runescape.wiki/images/thumb/Blank_icon.png/32px-Blank_icon.png'">
        <div class="tooltip">
        ${itemData.name}<br>
        Item ID: ${itemId}<br>
        Status: ${isObtained ? "Obtained" : "Not obtained"}
        </div>
    </div>
    `;
}

itemsHtml += "</div>";
return itemsHtml;
}

function isTaskCompleted(task) {
if (!playerData || !task.verification) return false;

const verification = task.verification;
if (verification.method === "collection-log") {
    let obtainedCount = 0;

    // Check if collection_log exists in playerData
    if (
    playerData.collection_log &&
    Array.isArray(playerData.collection_log)
    ) {
    verification.itemIds.forEach((itemId) => {
        // Check if the item ID exists in the collection log array
        if (playerData.collection_log.includes(parseInt(itemId))) {
        obtainedCount++;
        }
    });
    }

    return obtainedCount >= verification.count;
}
return false;
}

function getTaskRequirements(task) {
if (!task.verification) return "Unknown";

const verification = task.verification;
if (verification.method === "collection-log") {
    const itemCount = verification.itemIds.length;
    const requiredCount = verification.count;

    if (itemCount === 1 && requiredCount === 1) {
    return "Obtain 1 specific item";
    } else if (itemCount > 1 && requiredCount === 1) {
    return `Obtain any 1 of ${itemCount} items`;
    } else if (itemCount > 1 && requiredCount === itemCount) {
    return `Obtain all ${itemCount} items`;
    } else {
    return `Obtain ${requiredCount} of ${itemCount} items`;
    }
}
return "Unknown verification method";
}

// Function to get task progress information
function getTaskProgress(task) {
if (!playerData || !task.verification) return null;

const verification = task.verification;
if (verification.method === "collection-log") {
    let obtainedCount = 0;

    // Check if collection_log exists in playerData
    if (
    playerData.collection_log &&
    Array.isArray(playerData.collection_log)
    ) {
    verification.itemIds.forEach((itemId) => {
        // Check if the item ID exists in the collection log array
        if (playerData.collection_log.includes(parseInt(itemId))) {
        obtainedCount++;
        }
    });
    }

    const requiredCount = verification.count;
    const totalItems = verification.itemIds.length;

    // Format progress based on requirement type
    if (totalItems === 1 && requiredCount === 1) {
    return `${obtainedCount}/${requiredCount} items obtained`;
    } else if (totalItems > 1 && requiredCount === 1) {
    return `${obtainedCount}/${requiredCount} items obtained (any of ${totalItems})`;
    } else if (totalItems > 1 && requiredCount === totalItems) {
    return `${obtainedCount}/${requiredCount} items obtained (all required)`;
    } else {
    return `${obtainedCount}/${requiredCount} items obtained (of ${totalItems} possible)`;
    }
}

return null;
}

// Function to apply filter and re-render tabs
function applyFilter() {
currentFilter = document.getElementById("taskFilter").value;
if (currentTaskList) {
    // Clear rendered tabs cache since filter changed
    renderedTabs.clear();
    initializeTaskArea();
    renderDashboard();
}
}

// Allow Enter key to trigger load
document
.getElementById("username")
.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
    loadTaskList();
    }
});