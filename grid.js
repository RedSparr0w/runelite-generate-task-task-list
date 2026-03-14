// simple grid rendering script
const tiers = [
    'easy',
    'medium',
    'hard',
    'elite',
    'master',
    // 'master-tedious',
    // 'extra',
    'pets'
];

const LOCKED_TILE_IMAGE = 'https://oldschool.runescape.wiki/images/thumb/Cake_of_guidance_detail.png/260px-Cake_of_guidance_detail.png?c3595';
const QUESTION_MARK_ICON = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="#46433A"/><text x="32" y="44" font-size="42" text-anchor="middle" fill="#FFCF3F" font-family="sans-serif" font-weight="700">?</text></svg>')}`;
const STATES = ['hidden', 'locked', 'incomplete', 'complete'];
const DRAG_THRESHOLD = 6;
const STATE_KEY = 'taskStates';
const STORAGE_KEY = 'taskGridOrder';
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const ZOOM_FACTOR = 1.1;
const POP_STAGGER_MS = 60;
const POP_DURATION_MS = 500;
const EDGE_POP_OFFSET_MS = 120;
const INITIAL_REVEAL_DELAY_MS = 500;
const INITIAL_REVEAL_DURATION_MS = 3000;
const SYNC_STAGGER_MS = POP_STAGGER_MS;
const SYNC_DURATION_MS = INITIAL_REVEAL_DURATION_MS * 2;
const ZOOM_RENDER_DEBOUNCE_MS = 120;
const MAX_CANVAS_PIXEL_RATIO = 3;
const CANVAS_PIXEL_RATIO_STEP = 0.25;
const HOVER_LERP_FACTOR = 0.25;
const HOVER_SCALE_BOOST = 0.04;
const HOVER_LIFT_PX = 2;
const COMPLETE_OPACITY_KEY = 'completeCellOpacity';
const HIDE_TIER_HINT_KEY = 'hideTierHintOnLocked';
const TIER_FILTER_KEY = 'tierFilters';
const LOCKED_FILTER_KEY = '__locked__';
const DEFAULT_COMPLETE_CELL_OPACITY = 0.2;
const MIN_COMPLETE_CELL_OPACITY = 0.2;
const MAX_COMPLETE_CELL_OPACITY = 1;
const FILTERED_TIER_OPACITY = 0.2;
const UNLOCK_TOAST_DURATION_MS = 4500;
const CL_CACHE_KEY = 'collectionLogCache';
const CL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const USERNAME_KEY = 'playerUsername';
const PLAYER_CL_CACHE_PREFIX = 'playerCollectionLogCache';
const PLAYER_CL_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const THEME_KEY = 'uiTheme';
const THEMES = new Set(['osrs', 'dark']);
const DIARY_DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'elite']);
const TIER_DISPLAY_ORDER = ['easy', 'medium', 'hard', 'elite', 'master', 'master-tedious', 'extra', 'pets'];
const TASK_STATE_LABELS = {
    complete: 'Completed',
    incomplete: 'Available',
    locked: 'Locked',
    hidden: 'Hidden'
};
const INTRO_TASK_ID = '__intro__';
const INTRO_TASK_IMAGE = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="#46433A"/><text x="32" y="46" font-size="40" text-anchor="middle" fill="#FFCF3F" font-family="sans-serif" font-weight="700">★</text></svg>')}`;
const INTRO_TASK = {
    id: INTRO_TASK_ID,
    name: 'How to Play',
    tier: '',
    imageLink: INTRO_TASK_IMAGE,
    tip: '',
    wikiLink: null,
    displayItemId: null,
    verification: { method: 'none' }
};
const CELL_SIZE = 80;
const CELL_GAP = 15;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const GRID_SAFE_PADDING_X = CELL_STEP * 2;
const GRID_SAFE_PADDING_Y = CELL_STEP * 2;
const CELL_RADIUS = 14;
const TIER_COLORS_BY_THEME = {
    osrs: {
        easy: '#4CAF50',
        medium: '#2196F3',
        hard: '#FACC15',
        elite: '#EF4444',
        master: '#A855F7',
        'master-tedious': '#7C3AED',
        extra: '#F97316',
        pets: '#EC4899'
    },
    dark: {
        easy: '#5FD46A',
        medium: '#4AA8FF',
        hard: '#F6D64A',
        elite: '#FF6B6B',
        master: '#C084FC',
        'master-tedious': '#9F7AEA',
        extra: '#FB923C',
        pets: '#F472B6'
    }
};

const CELL_PALETTES_BY_THEME = {
    osrs: {
        locked: { fill: '#28221d', border: '#b79d7e', borderWidth: 2, text: '#f1e8d4' },
        incomplete: { fill: '#736559', border: '#b79d7e', borderWidth: 2, text: '#f1e8d4' },
        complete: { fill: '#94866d', border: '#b79d7e', borderWidth: 2, text: '#f1e8d4' },
        hidden: { fill: '#2E2C29', border: 'rgba(96, 88, 77, 0.56)', borderWidth: 2, text: '#b79d7e' },
        badgeFill: 'rgba(15, 15, 15, 0.84)',
        badgeBorder: 'rgba(96, 88, 77, 0.8)',
        badgeText: '#f1e8d4',
        imageShadow: 'rgba(15, 15, 15, 0.34)',
        placeholderFill: 'rgba(24, 20, 12, 0.4)'
    },
    dark: {
        locked: { fill: '#21262e', border: 'rgba(132, 142, 160, 0.84)', borderWidth: 2, text: '#e6ebf3' },
        incomplete: { fill: '#3a414d', border: 'rgba(132, 142, 160, 0.84)', borderWidth: 2, text: '#e6ebf3' },
        complete: { fill: '#525b69', border: 'rgba(78, 86, 100, 0.48)', borderWidth: 2, text: '#e6ebf3' },
        hidden: { fill: '#1f2329', border: 'rgba(80, 88, 100, 0.58)', borderWidth: 2, text: '#b5becb' },
        badgeFill: 'rgba(10, 12, 16, 0.88)',
        badgeBorder: 'rgba(96, 103, 116, 0.8)',
        badgeText: '#e6ebf3',
        imageShadow: 'rgba(6, 8, 10, 0.4)',
        placeholderFill: 'rgba(24, 28, 36, 0.45)'
    }
};

let suppressTaskClick = false;
let tasksGlobal = [];
let currentScale = 1;
let activePopoverAnchor = null;
let stateMap = loadStates();
let playerUsername = '';
let hasStartedApp = false;
let syncButtonStatusTimer = null;
let activeTierTab = '';
let gridCanvas = null;
let gridContext = null;
let canvasFrameId = null;
let gridPixelWidth = 0;
let gridPixelHeight = 0;
let gridCellCount = 0;
let lastCanvasPixelRatio = 0;
let spritePrewarmTimer = null;
let zoomRenderDebounceTimer = null;
let isZooming = false;
let hoveredCellId = '';
let activeTheme = 'osrs';
let completeCellOpacity = DEFAULT_COMPLETE_CELL_OPACITY;
let hideTierHintOnLocked = false;
let selectedTierFilters = new Set();

try {
    completeCellOpacity = normalizeCompleteOpacity(localStorage.getItem(COMPLETE_OPACITY_KEY));
} catch {
    completeCellOpacity = DEFAULT_COMPLETE_CELL_OPACITY;
}

try {
    hideTierHintOnLocked = normalizeTierHintSetting(localStorage.getItem(HIDE_TIER_HINT_KEY));
} catch {
    hideTierHintOnLocked = false;
}

try {
    selectedTierFilters = normalizeTierFilterSelection(localStorage.getItem(TIER_FILTER_KEY));
} catch {
    selectedTierFilters = new Set();
}

try {
    activeTheme = normalizeTheme(localStorage.getItem(THEME_KEY));
} catch {
    activeTheme = 'osrs';
}

if (typeof document !== 'undefined' && document.body) {
    document.body.dataset.theme = activeTheme;
}

if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.style.setProperty('--state-complete-opacity', String(completeCellOpacity));
}

const idToCoords = new Map();
const idToCell = new Map();
const coordToTaskId = new Map();
const imageAssetCache = new Map();
const backgroundSpriteCache = new Map();
const skillBadgeIconCache = new Map();

class Task {
    constructor(taskData = {}) {
        Object.assign(this, taskData);
    }

    static from(taskData = {}) {
        return taskData instanceof Task ? taskData : new Task(taskData);
    }
}

class Grid {
    getTaskCoord(taskOrId) {
        const rawId = typeof taskOrId === 'object' && taskOrId !== null
            ? taskOrId.id
            : taskOrId;
        return idToCoords.get(rawId)
            || idToCoords.get(String(rawId))
            || { x: 0, y: 0 };
    }

    getCenterCoord(tasks = tasksGlobal) {
        return this.getTaskCoord(tasks[0]);
    }

    updateTaskCoordinates(tasks) {
        const size = computeGridSize(tasks.length);
        const coords = generateSpiral(tasks.length, size);

        idToCoords.clear();
        tasks.forEach((task, index) => {
            const [x, y] = coords[index];
            idToCoords.set(task.id, { x, y });
        });

        return {
            size,
            coords,
            center: coords.length > 0 ? { x: coords[0][0], y: coords[0][1] } : { x: 0, y: 0 }
        };
    }
}

class TaskManager {
    constructor() {
        this.tasks = [];
    }

    toTask(taskData) {
        return Task.from(taskData);
    }

    setTasks(tasks = []) {
        this.tasks = tasks.map(task => this.toTask(task));
        tasksGlobal = this.tasks;
        return this.tasks;
    }

    getTasks() {
        return this.tasks;
    }

    getTaskList() {
        return this.tasks.length > 0 ? this.tasks : tasksGlobal;
    }

    buildTasksFromTierData(data) {
        const tasks = [];
        data.forEach(tierObj => {
            tierObj.tasks.forEach(task => {
                tasks.push(this.toTask({ ...task, tier: tierObj.name }));
            });
        });
        return tasks;
    }

    getState(id) {
        return stateMap[id];
    }

    setState(id, state) {
        stateMap[id] = state;
        saveStates(stateMap);
    }

    getCompletedCount() {
        return this.getTaskList().filter(task => task.id !== INTRO_TASK_ID && this.getState(task.id) === 'complete').length;
    }

    getUnlockLimit(completedCount = this.getCompletedCount()) {
        return Math.max(1, Math.floor(Math.sqrt(completedCount / 5)) + 1);
    }

    getUnlockedCount() {
        return this.getTaskList().filter(task => this.getState(task.id) === 'incomplete').length;
    }

    canUnlockMore() {
        return this.getUnlockedCount() < this.getUnlockLimit();
    }

    getTasksUntilNextUnlock(completedCount = this.getCompletedCount()) {
        const currentLimit = this.getUnlockLimit(completedCount);
        const nextThreshold = 5 * currentLimit * currentLimit;
        return Math.max(0, nextThreshold - completedCount);
    }

    normalizeUnlockStates() {
        const unlockLimit = this.getUnlockLimit();
        const incompleteTasks = this.getTaskList().filter(task => this.getState(task.id) === 'incomplete');
        incompleteTasks.slice(unlockLimit).forEach(task => {
            this.setState(task.id, 'locked');
            const cell = getCellById(task.id);
            if (cell) {
                setCellState(cell, 'locked');
            }
        });
    }

    revealTaskNeighbors(taskId) {
        const coords = idToCoords.get(taskId) || idToCoords.get(String(taskId));
        if (!coords) {
            return;
        }

        const { x, y } = coords;
        idToCoords.forEach((coord, id) => {
            const isNeighbor =
                (coord.x === x && (coord.y === y - 1 || coord.y === y + 1)) ||
                (coord.y === y && (coord.x === x - 1 || coord.x === x + 1));
            if (isNeighbor && this.getState(id) === 'hidden') {
                revealNeighborAsLocked(id);
            }
        });
    }

    applyTaskCompletion(task) {
        this.setState(task.id, 'complete');
        const cell = getCellById(task.id);
        if (cell) {
            setCellState(cell, 'complete');
        }
        this.revealTaskNeighbors(task.id);
    }

    revealFrontierFromCompletedTasks() {
        this.getTaskList().forEach(task => {
            if (this.getState(task.id) === 'complete') {
                this.revealTaskNeighbors(task.id);
            }
        });
    }
}

class GameController {
    constructor(grid, taskManager) {
        this.grid = grid;
        this.taskManager = taskManager;
    }

    getTaskCoord(taskOrId) {
        return this.grid.getTaskCoord(taskOrId);
    }

    getCenterCoord(tasks = this.taskManager.getTasks()) {
        return this.grid.getCenterCoord(tasks);
    }
}

class PlayerProgress {
    static finalizeSkillSnapshots(skillExperienceBySkill, skillLevelBySkill) {
        skillLevelBySkill.forEach((level, skillName) => {
            if (!Number.isFinite(skillExperienceBySkill.get(skillName))) {
                const experience = levelToExperience(level);
                if (Number.isFinite(experience) && experience >= 0) {
                    skillExperienceBySkill.set(skillName, experience);
                }
            }
        });

        skillExperienceBySkill.forEach((experience, skillName) => {
            if (!Number.isFinite(skillLevelBySkill.get(skillName))) {
                const level = experienceToLevel(experience);
                if (Number.isFinite(level) && level >= 1) {
                    skillLevelBySkill.set(skillName, level);
                }
            }
        });
    }

    constructor() {
        this.clear();
    }

    clear() {
        this.obtainedItemIds = new Set();
        this.completedAchievementDiaryKeys = new Set();
        this.skillExperienceBySkill = new Map();
        this.skillLevelBySkill = new Map();
    }

    applySnapshot(playerSnapshot) {
        if (!playerSnapshot || typeof playerSnapshot !== 'object') {
            this.clear();
            return;
        }

        this.obtainedItemIds = playerSnapshot.obtainedItemIds instanceof Set
            ? new Set(playerSnapshot.obtainedItemIds)
            : new Set();

        this.completedAchievementDiaryKeys = playerSnapshot.completedAchievementDiaryKeys instanceof Set
            ? new Set(playerSnapshot.completedAchievementDiaryKeys)
            : new Set();

        const nextSkillExperience = playerSnapshot.playerSkillExperienceBySkill instanceof Map
            ? new Map(playerSnapshot.playerSkillExperienceBySkill)
            : new Map();
        const nextSkillLevels = playerSnapshot.playerSkillLevelBySkill instanceof Map
            ? new Map(playerSnapshot.playerSkillLevelBySkill)
            : new Map();

        PlayerProgress.finalizeSkillSnapshots(nextSkillExperience, nextSkillLevels);
        this.skillExperienceBySkill = nextSkillExperience;
        this.skillLevelBySkill = nextSkillLevels;
    }

    getSkillLevel(skillName) {
        const normalizedSkill = normalizeSkillName(skillName);
        if (!normalizedSkill) {
            return Number.NaN;
        }

        const storedLevel = this.skillLevelBySkill.get(normalizedSkill);
        if (Number.isFinite(storedLevel) && storedLevel >= 1) {
            return Math.floor(storedLevel);
        }

        const experience = this.skillExperienceBySkill.get(normalizedSkill);
        const derivedLevel = experienceToLevel(experience);
        if (Number.isFinite(derivedLevel) && derivedLevel >= 1) {
            return Math.floor(derivedLevel);
        }

        return Number.NaN;
    }

    hasObtainedItem(itemId) {
        const numericId = Number(itemId);
        return Number.isFinite(numericId) && this.obtainedItemIds.has(numericId);
    }

    hasCompletedAchievementDiary(region, difficulty) {
        if (!region || !difficulty) {
            return false;
        }

        return this.completedAchievementDiaryKeys.has(getAchievementDiaryKey(region, difficulty));
    }

    isSkillRequirementMet(requirement, requiredLevel = Number.NaN) {
        const resolvedRequiredLevel = Number.isFinite(requiredLevel)
            ? requiredLevel
            : (() => {
                const computedLevel = experienceToLevel(requirement?.requiredExperience);
                return Number.isFinite(computedLevel) && computedLevel >= 1
                    ? Math.floor(computedLevel)
                    : 1;
            })();
        const playerLevel = this.getSkillLevel(requirement?.skillName);
        if (Number.isFinite(playerLevel)) {
            return playerLevel >= resolvedRequiredLevel;
        }

        const playerExperience = this.skillExperienceBySkill.get(requirement?.skillName);
        return Number.isFinite(playerExperience) && playerExperience >= requirement.requiredExperience;
    }
}

class Wiki {
    constructor() {
        this.collectionLogMap = new Map();
    }

    getSkillExperienceValue(skillData) {
        const numericValue = Number(skillData);
        if (Number.isFinite(numericValue) && numericValue >= 0) {
            return numericValue;
        }

        if (!skillData || typeof skillData !== 'object') {
            return Number.NaN;
        }

        const experienceCandidates = [
            skillData.experience,
            skillData.xp,
            skillData.exp,
            skillData.experience_points,
            skillData.experiencePoints
        ];
        for (const candidate of experienceCandidates) {
            const parsed = Number(candidate);
            if (Number.isFinite(parsed) && parsed >= 0) {
                return parsed;
            }
        }

        const levelExperience = levelToExperience(skillData.level);
        if (Number.isFinite(levelExperience) && levelExperience >= 0) {
            return levelExperience;
        }

        return Number.NaN;
    }

    getSkillLevelValue(skillData) {
        const numericValue = Number(skillData);
        if (Number.isFinite(numericValue) && numericValue >= 1) {
            return Math.floor(numericValue);
        }

        if (!skillData || typeof skillData !== 'object') {
            return Number.NaN;
        }

        const levelCandidates = [
            skillData.level,
            skillData.lvl,
            skillData.skillLevel,
            skillData.skill_level
        ];
        for (const candidate of levelCandidates) {
            const parsed = Number(candidate);
            if (Number.isFinite(parsed) && parsed >= 1) {
                return Math.floor(parsed);
            }
        }

        const experienceLevel = experienceToLevel(this.getSkillExperienceValue(skillData));
        if (Number.isFinite(experienceLevel) && experienceLevel >= 1) {
            return experienceLevel;
        }

        return Number.NaN;
    }

    addSkillExperienceEntry(targetMap, rawSkillName, skillData) {
        const skillName = normalizeSkillName(rawSkillName);
        if (!skillName) {
            return;
        }

        const experience = this.getSkillExperienceValue(skillData);
        if (!Number.isFinite(experience) || experience < 0) {
            return;
        }

        const existing = targetMap.get(skillName);
        if (!Number.isFinite(existing) || experience > existing) {
            targetMap.set(skillName, experience);
        }
    }

    addSkillLevelEntry(targetMap, rawSkillName, skillData) {
        const skillName = normalizeSkillName(rawSkillName);
        if (!skillName) {
            return;
        }

        const level = this.getSkillLevelValue(skillData);
        if (!Number.isFinite(level) || level < 1) {
            return;
        }

        const existing = targetMap.get(skillName);
        if (!Number.isFinite(existing) || level > existing) {
            targetMap.set(skillName, level);
        }
    }

    extractSkillExperienceFromContainer(container, targetMap) {
        if (!container) {
            return;
        }

        if (Array.isArray(container)) {
            container.forEach(entry => {
                if (!entry || typeof entry !== 'object') {
                    return;
                }

                if (Array.isArray(entry) && entry.length >= 2) {
                    this.addSkillExperienceEntry(targetMap, entry[0], entry[1]);
                    return;
                }

                const rawSkillName = entry.skill ?? entry.name ?? entry.id ?? entry.type;
                if (!rawSkillName) {
                    return;
                }

                this.addSkillExperienceEntry(targetMap, rawSkillName, entry);
            });
            return;
        }

        if (typeof container !== 'object') {
            return;
        }

        Object.entries(container).forEach(([rawSkillName, skillData]) => {
            this.addSkillExperienceEntry(targetMap, rawSkillName, skillData);
        });
    }

    extractSkillLevelsFromContainer(container, targetMap) {
        if (!container) {
            return;
        }

        if (Array.isArray(container)) {
            container.forEach(entry => {
                if (!entry || typeof entry !== 'object') {
                    return;
                }

                if (Array.isArray(entry) && entry.length >= 2) {
                    this.addSkillLevelEntry(targetMap, entry[0], entry[1]);
                    return;
                }

                const rawSkillName = entry.skill ?? entry.name ?? entry.id ?? entry.type;
                if (!rawSkillName) {
                    return;
                }

                this.addSkillLevelEntry(targetMap, rawSkillName, entry);
            });
            return;
        }

        if (typeof container !== 'object') {
            return;
        }

        Object.entries(container).forEach(([rawSkillName, skillData]) => {
            this.addSkillLevelEntry(targetMap, rawSkillName, skillData);
        });
    }

    extractPlayerSkillExperience(payload) {
        const skillExperience = new Map();
        if (!payload || typeof payload !== 'object') {
            return skillExperience;
        }

        const containers = [
            payload.skills,
            payload.skill_experience,
            payload.skillExperience,
            payload.experience,
            payload.experience?.skills,
            payload.player_skills,
            payload.playerSkills,
            payload.player?.skills,
            payload.hiscores?.skills,
            payload.hiscore?.skills
        ];

        containers.forEach(container => {
            this.extractSkillExperienceFromContainer(container, skillExperience);
        });

        return skillExperience;
    }

    extractPlayerSkillLevels(payload) {
        const skillLevels = new Map();
        if (!payload || typeof payload !== 'object') {
            return skillLevels;
        }

        const containers = [
            payload.levels,
            payload.skill_levels,
            payload.skillLevels,
            payload.player_levels,
            payload.playerLevels,
            payload.player?.levels,
            payload.hiscores?.levels,
            payload.hiscore?.levels
        ];

        containers.forEach(container => {
            this.extractSkillLevelsFromContainer(container, skillLevels);
        });

        return skillLevels;
    }

    extractCompletedAchievementDiaryKeys(achievementDiaries) {
        const completedKeys = new Set();
        if (!achievementDiaries || typeof achievementDiaries !== 'object') {
            return completedKeys;
        }

        Object.entries(achievementDiaries).forEach(([rawRegion, regionData]) => {
            const region = normalizeAchievementDiaryRegion(rawRegion);
            if (!region || !regionData || typeof regionData !== 'object') {
                return;
            }

            Object.entries(regionData).forEach(([rawDifficulty, difficultyData]) => {
                const difficulty = normalizeAchievementDiaryDifficulty(rawDifficulty);
                if (!difficulty || !difficultyData || typeof difficultyData !== 'object') {
                    return;
                }

                if (difficultyData.complete === true) {
                    completedKeys.add(getAchievementDiaryKey(region, difficulty));
                }
            });
        });

        return completedKeys;
    }

    buildCollectionLogEntry(name, category) {
        const encoded = encodeURIComponent(name.replace(/ /g, '_'));
        return {
            name,
            category,
            wikiLink: `https://oldschool.runescape.wiki/w/${encoded}`,
            imageUrl: `https://oldschool.runescape.wiki/w/Special:Redirect/file/${encoded}.png`
        };
    }

    setCollectionLogItems(items = []) {
        this.collectionLogMap.clear();
        items.forEach(item => {
            const numericId = Number(item.id);
            const itemId = Number.isFinite(numericId) ? numericId : item.id;
            this.collectionLogMap.set(itemId, this.buildCollectionLogEntry(item.name, item.category));
        });
    }

    async loadCollectionLogItems() {
        try {
            const raw = localStorage.getItem(CL_CACHE_KEY);
            if (raw) {
                const { ts, data } = JSON.parse(raw);
                if (Date.now() - ts < CL_CACHE_TTL && Array.isArray(data)) {
                    this.setCollectionLogItems(data);
                    return this.collectionLogMap;
                }
            }
        } catch {
            // ignore corrupt cache
        }

        try {
            const url = 'https://oldschool.runescape.wiki/api.php?action=query&titles=Module:Collection_log%2Fdata.json&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&origin=*';
            const resp = await fetch(url);
            const json = await resp.json();
            const content = json.query.pages[0].revisions[0].slots.main.content;
            const items = JSON.parse(content);

            const cacheData = [];
            items.forEach(item => {
                cacheData.push({
                    id: item.id,
                    name: item.name,
                    category: item.tabs?.[0] || ''
                });
            });

            this.setCollectionLogItems(cacheData);

            try {
                localStorage.setItem(CL_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: cacheData }));
            } catch {
                // ignore localStorage failures
            }
        } catch (error) {
            console.warn('Failed to load collection log data', error);
        }

        return this.collectionLogMap;
    }

    async loadPlayerData(username, options = {}) {
        const { forceRefresh = false } = options;
        const normalized = normalizeUsername(username);
        if (!normalized) {
            return {
                obtainedItemIds: new Set(),
                completedAchievementDiaryKeys: new Set(),
                playerSkillExperienceBySkill: new Map(),
                playerSkillLevelBySkill: new Map()
            };
        }

        const cacheKey = getPlayerCacheKey(normalized);
        if (!forceRefresh) {
            try {
                const raw = localStorage.getItem(cacheKey);
                if (raw) {
                    const { ts, ids, achievementDiaryKeys, skillExperience, skillLevels } = JSON.parse(raw);
                    if (Date.now() - ts < PLAYER_CL_CACHE_TTL && Array.isArray(ids)) {
                        const cachedSkillExperience = new Map();
                        this.extractSkillExperienceFromContainer(skillExperience, cachedSkillExperience);

                        const cachedSkillLevels = new Map();
                        this.extractSkillLevelsFromContainer(skillLevels, cachedSkillLevels);

                        PlayerProgress.finalizeSkillSnapshots(cachedSkillExperience, cachedSkillLevels);

                        return {
                            obtainedItemIds: new Set(ids.map(id => Number(id)).filter(id => Number.isInteger(id) && id > 0)),
                            completedAchievementDiaryKeys: new Set(
                                Array.isArray(achievementDiaryKeys)
                                    ? achievementDiaryKeys.map(value => String(value))
                                    : []
                            ),
                            playerSkillExperienceBySkill: cachedSkillExperience,
                            playerSkillLevelBySkill: cachedSkillLevels
                        };
                    }
                }
            } catch {
                // ignore corrupt cache
            }
        }

        try {
            const syncName = encodeURIComponent(toSyncUsername(normalized));
            const url = `https://sync.runescape.wiki/runelite/player/${syncName}/STANDARD`;
            const response = await fetch(url, { cache: forceRefresh ? 'no-store' : 'default' });
            if (!response.ok) {
                throw new Error(`sync request failed (${response.status})`);
            }

            const payload = await response.json();
            const ids = Array.isArray(payload.collection_log)
                ? payload.collection_log.map(id => Number(id)).filter(id => Number.isInteger(id) && id > 0)
                : [];
            const completedAchievementDiaryKeys = this.extractCompletedAchievementDiaryKeys(payload.achievement_diaries);
            const playerSkillExperienceBySkill = this.extractPlayerSkillExperience(payload);
            const playerSkillLevelBySkill = this.extractPlayerSkillLevels(payload);

            PlayerProgress.finalizeSkillSnapshots(playerSkillExperienceBySkill, playerSkillLevelBySkill);

            try {
                localStorage.setItem(cacheKey, JSON.stringify({
                    ts: Date.now(),
                    ids,
                    achievementDiaryKeys: Array.from(completedAchievementDiaryKeys),
                    skillExperience: Object.fromEntries(playerSkillExperienceBySkill),
                    skillLevels: Object.fromEntries(playerSkillLevelBySkill)
                }));
            } catch {
                // ignore localStorage failures
            }

            return {
                obtainedItemIds: new Set(ids),
                completedAchievementDiaryKeys,
                playerSkillExperienceBySkill,
                playerSkillLevelBySkill
            };
        } catch (error) {
            console.warn('Failed to load player collection log', error);
            return null;
        }
    }
}

class TaskVerification {
    constructor(taskManager, playerProgress, taskOrderManager) {
        this.taskManager = taskManager;
        this.playerProgress = playerProgress;
        this.taskOrderManager = taskOrderManager;
    }

    getTaskVerificationItemIds(task) {
        if (task?.verification?.method !== 'collection-log') {
            return [];
        }

        return Array.isArray(task?.verification?.itemIds)
            ? task.verification.itemIds
            : [];
    }

    getTaskSkillExperienceRequirements(task) {
        if (task?.verification?.method !== 'skill') {
            return [];
        }

        const experienceRequirements = task?.verification?.experience;
        if (!experienceRequirements || typeof experienceRequirements !== 'object') {
            return [];
        }

        return Object.entries(experienceRequirements)
            .map(([rawSkillName, rawExperience]) => {
                const skillName = normalizeSkillName(rawSkillName);
                const requiredExperience = Number(rawExperience);
                return { skillName, requiredExperience };
            })
            .filter(requirement => {
                return Boolean(requirement.skillName)
                    && Number.isFinite(requirement.requiredExperience)
                    && requirement.requiredExperience >= 0;
            });
    }

    getRequiredSkillLevelForRequirement(requirement) {
        const requiredLevel = experienceToLevel(requirement?.requiredExperience);
        return Number.isFinite(requiredLevel) && requiredLevel >= 1
            ? Math.floor(requiredLevel)
            : 1;
    }

    getTaskRequiredCount(task) {
        if (task?.verification?.method === 'achievement-diary') {
            return 1;
        }

        if (task?.verification?.method === 'skill') {
            const requirements = this.getTaskSkillExperienceRequirements(task);
            if (requirements.length === 0) {
                return 0;
            }

            const rawRequired = task?.verification?.count;
            return Number.isFinite(rawRequired)
                ? clamp(Math.floor(rawRequired), 1, requirements.length)
                : requirements.length;
        }

        const totalItems = this.getTaskVerificationItemIds(task).length;
        if (totalItems === 0) {
            return 0;
        }

        const rawRequired = task?.verification?.count;
        return Number.isFinite(rawRequired)
            ? clamp(Math.floor(rawRequired), 1, totalItems)
            : totalItems;
    }

    getTaskObtainedCount(task) {
        if (task?.verification?.method === 'achievement-diary') {
            const region = normalizeAchievementDiaryRegion(task?.verification?.region);
            const difficulty = normalizeAchievementDiaryDifficulty(task?.verification?.difficulty);
            return this.playerProgress.hasCompletedAchievementDiary(region, difficulty) ? 1 : 0;
        }

        if (task?.verification?.method === 'skill') {
            return this.getTaskSkillExperienceRequirements(task).reduce((count, requirement) => {
                const requiredLevel = this.getRequiredSkillLevelForRequirement(requirement);
                return count + (this.playerProgress.isSkillRequirementMet(requirement, requiredLevel) ? 1 : 0);
            }, 0);
        }

        return this.getTaskVerificationItemIds(task).reduce((count, id) => {
            return count + (this.playerProgress.hasObtainedItem(id) ? 1 : 0);
        }, 0);
    }

    getCollectionLogSeriesKey(task) {
        if (task?.verification?.method === 'collection-log') {
            const itemIds = this.getTaskVerificationItemIds(task)
                .map(id => Number(id))
                .filter(Number.isFinite)
                .sort((a, b) => a - b);

            if (itemIds.length === 0) {
                return '';
            }

            return `cl:${itemIds.join(',')}`;
        }

        if (task?.verification?.method === 'skill') {
            const requirements = this.getTaskSkillExperienceRequirements(task)
                .slice()
                .sort((requirementA, requirementB) => {
                    const nameDelta = requirementA.skillName.localeCompare(requirementB.skillName);
                    if (nameDelta !== 0) {
                        return nameDelta;
                    }

                    return requirementA.requiredExperience - requirementB.requiredExperience;
                })
                .map(requirement => `${requirement.skillName}:${Math.floor(requirement.requiredExperience)}`);

            if (requirements.length === 0) {
                return '';
            }

            return `skill:${requirements.join('|')}`;
        }

        return '';
    }

    isSeriesSwapCandidateState(state) {
        return state === 'locked' || state === 'hidden';
    }

    getLowestPendingSeriesTask(task) {
        const seriesKey = this.getCollectionLogSeriesKey(task);
        if (!seriesKey) {
            return task;
        }

        const taskOrderById = new Map(tasksGlobal.map((candidate, index) => [String(candidate.id), index]));
        const seriesCandidates = tasksGlobal
            .filter(candidate => this.getCollectionLogSeriesKey(candidate) === seriesKey)
            .filter(candidate => this.isSeriesSwapCandidateState(this.taskManager.getState(candidate.id) || 'hidden'))
            .sort((taskA, taskB) => {
                const requiredDelta = this.getTaskRequiredCount(taskA) - this.getTaskRequiredCount(taskB);
                if (requiredDelta !== 0) {
                    return requiredDelta;
                }

                const indexA = taskOrderById.get(String(taskA.id)) ?? Number.POSITIVE_INFINITY;
                const indexB = taskOrderById.get(String(taskB.id)) ?? Number.POSITIVE_INFINITY;
                if (indexA !== indexB) {
                    return indexA - indexB;
                }

                return String(taskA.id).localeCompare(String(taskB.id));
            });

        return seriesCandidates[0] || task;
    }

    alignUnlockedTaskToLowestSeriesTask(task) {
        const unlockedTask = tasksGlobal.find(candidate => String(candidate.id) === String(task?.id));
        if (!unlockedTask) {
            return task;
        }

        const targetTask = this.getLowestPendingSeriesTask(unlockedTask);
        if (!targetTask || String(targetTask.id) === String(unlockedTask.id)) {
            return unlockedTask;
        }

        if (this.getTaskRequiredCount(targetTask) >= this.getTaskRequiredCount(unlockedTask)) {
            return unlockedTask;
        }

        const swapped = this.taskOrderManager.swapTasksById(unlockedTask.id, targetTask.id, { swapStates: true });
        return swapped ? targetTask : unlockedTask;
    }
}

class TaskPanels {
    constructor(taskManager) {
        this.taskManager = taskManager;
    }

    getTierProgressByTier() {
        const grouped = new Map();

        tasksGlobal.forEach(task => {
            if (task.id === INTRO_TASK_ID) {
                return;
            }

            const tier = task.tier || 'other';
            if (!grouped.has(tier)) {
                grouped.set(tier, {
                    tier,
                    total: 0,
                    completed: 0,
                    tasks: []
                });
            }

            const bucket = grouped.get(tier);
            bucket.total += 1;
            if (this.taskManager.getState(task.id) === 'complete') {
                bucket.completed += 1;
            }
            bucket.tasks.push(task);
        });

        return Array.from(grouped.values()).sort((a, b) => {
            const sortA = getTierSortIndex(a.tier);
            const sortB = getTierSortIndex(b.tier);
            if (sortA !== sortB) {
                return sortA - sortB;
            }
            return a.tier.localeCompare(b.tier);
        });
    }

    updateTierProgressMenu() {
        const linesEl = document.getElementById('tier-progress-lines');
        if (!linesEl) {
            return;
        }

        const tierData = this.getTierProgressByTier();
        linesEl.innerHTML = '';

        if (tierData.length === 0) {
            linesEl.textContent = 'No tasks loaded';
            return;
        }

        tierData.forEach(entry => {
            const row = document.createElement('span');
            row.className = 'tier-progress-row';

            const name = document.createElement('span');
            name.className = 'tier-progress-name';
            name.textContent = formatTierName(entry.tier);

            const value = document.createElement('span');
            value.className = 'tier-progress-value';
            value.textContent = `${entry.completed}/${entry.total}`;

            row.appendChild(name);
            row.appendChild(value);
            linesEl.appendChild(row);
        });
    }

    renderTierTasksModal() {
        const titleEl = document.getElementById('tier-tasks-title');
        const tabsEl = document.getElementById('tier-tabs');
        const listEl = document.getElementById('tier-tasks-list');
        if (!titleEl || !tabsEl || !listEl) {
            return;
        }

        const tierData = this.getTierProgressByTier();
        tabsEl.innerHTML = '';
        listEl.innerHTML = '';

        if (tierData.length === 0) {
            titleEl.textContent = 'Tier Tasks';
            listEl.textContent = 'No tasks loaded';
            return;
        }

        if (!activeTierTab || !tierData.some(entry => entry.tier === activeTierTab)) {
            activeTierTab = tierData[0].tier;
        }

        tierData.forEach(entry => {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'tier-tab';
            if (entry.tier === activeTierTab) {
                tab.classList.add('active');
            }
            tab.textContent = `${formatTierName(entry.tier)} (${entry.completed}/${entry.total})`;
            tab.addEventListener('click', () => {
                activeTierTab = entry.tier;
                this.renderTierTasksModal();
            });
            tabsEl.appendChild(tab);
        });

        const selectedTier = tierData.find(entry => entry.tier === activeTierTab) || tierData[0];
        titleEl.textContent = `${formatTierName(selectedTier.tier)} Tasks`;

        const getTierListStateGroup = (state) => {
            if (state === 'locked' || state === 'hidden') {
                return 'hidden';
            }

            return state;
        };

        const stateOrder = {
            incomplete: 0,
            hidden: 1,
            complete: 2
        };

        selectedTier.tasks
            .slice()
            .sort((taskA, taskB) => {
                const stateA = getTierListStateGroup(this.taskManager.getState(taskA.id) || 'hidden');
                const stateB = getTierListStateGroup(this.taskManager.getState(taskB.id) || 'hidden');
                const rankA = stateOrder[stateA] ?? 99;
                const rankB = stateOrder[stateB] ?? 99;
                if (rankA !== rankB) {
                    return rankA - rankB;
                }
                return taskA.name.localeCompare(taskB.name);
            })
            .forEach(task => {
                const state = getTierListStateGroup(this.taskManager.getState(task.id) || 'hidden');

                const row = document.createElement('div');
                row.className = 'tier-task-row';

                const taskName = document.createElement('span');
                taskName.className = 'tier-task-name';
                taskName.textContent = task.name;

                const status = document.createElement('span');
                status.className = `tier-task-status status-${state}`;
                status.textContent = TASK_STATE_LABELS[state] || state;

                row.appendChild(taskName);
                row.appendChild(status);
                listEl.appendChild(row);
            });
    }

    showTierTasksModal() {
        const modal = document.getElementById('tier-tasks-modal');
        if (!modal) {
            return;
        }

        this.renderTierTasksModal();
        modal.classList.add('open');
    }

    hideTierTasksModal() {
        const modal = document.getElementById('tier-tasks-modal');
        if (!modal) {
            return;
        }

        modal.classList.remove('open');
    }

    centerTaskInView(taskId, options = {}) {
        const { smooth = true } = options;
        const container = document.getElementById('grid-container');
        const cell = getCellById(taskId);
        if (!container || !cell) {
            return false;
        }

        const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
        const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
        const scaledCellSize = CELL_SIZE * currentScale;
        const targetLeft = (cell.pixelX * currentScale) - ((container.clientWidth - scaledCellSize) / 2);
        const targetTop = (cell.pixelY * currentScale) - ((container.clientHeight - scaledCellSize) / 2);
        const nextLeft = clamp(targetLeft, 0, maxLeft);
        const nextTop = clamp(targetTop, 0, maxTop);

        container.scrollTo({
            left: nextLeft,
            top: nextTop,
            behavior: smooth ? 'smooth' : 'auto'
        });

        return true;
    }

    updateCurrentTasksPopover() {
        const button = document.getElementById('current-tasks-button');
        const listEl = document.getElementById('current-tasks-list');
        const incompleteTasks = tasksGlobal
            .filter(task => this.taskManager.getState(task.id) === 'incomplete')
            .sort((taskA, taskB) => {
                const tierSortA = getTierSortIndex(taskA.tier);
                const tierSortB = getTierSortIndex(taskB.tier);
                if (tierSortA !== tierSortB) {
                    return tierSortA - tierSortB;
                }
                return taskA.name.localeCompare(taskB.name);
            });

        if (button) {
            button.textContent = `Current Tasks (${incompleteTasks.length})`;
        }

        if (!listEl) {
            return;
        }

        listEl.innerHTML = '';

        if (incompleteTasks.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'current-task-empty';
            empty.textContent = 'No available incomplete tasks right now.';
            listEl.appendChild(empty);
            return;
        }

        incompleteTasks.forEach(task => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'current-task-item';

            const tierDot = document.createElement('span');
            tierDot.className = `current-task-tier-dot tier-dot-${task.tier || 'other'}`;
            tierDot.ariaHidden = 'true';

            const taskLabel = document.createElement('span');
            taskLabel.className = 'current-task-label';
            taskLabel.textContent = task.name;

            item.appendChild(tierDot);
            item.appendChild(taskLabel);
            item.addEventListener('click', () => {
                const centered = this.centerTaskInView(task.id, { smooth: true });
                if (centered) {
                    this.closeCurrentTasksPopover();
                }
            });
            listEl.appendChild(item);
        });
    }

    closeCurrentTasksPopover() {
        const popover = document.getElementById('current-tasks-popover');
        if (!popover) {
            return;
        }

        popover.classList.remove('open');
    }

    toggleCurrentTasksPopover() {
        const popover = document.getElementById('current-tasks-popover');
        if (!popover) {
            return;
        }

        const nextOpen = !popover.classList.contains('open');
        if (nextOpen) {
            this.updateCurrentTasksPopover();
        }

        popover.classList.toggle('open', nextOpen);
    }
}

class TaskOrderManager {
    constructor(taskManager, gridModel) {
        this.taskManager = taskManager;
        this.gridModel = gridModel;
    }

    async loadAllTierData() {
        const promises = tiers.map(name => fetch(`./tiers/${name}.json`).then(r => r.json()));
        return Promise.all(promises);
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    buildWeightedTaskOrder(tasks) {
        const weightedTasks = tasks.map(task => ({
            task,
            priority: Math.random() / (tierWeights[task.tier] || 1)
        }));

        this.shuffle(weightedTasks);
        weightedTasks.sort((a, b) => a.priority - b.priority);

        return weightedTasks.map(entry => entry.task);
    }

    mergeSavedTaskOrder(savedIds, currentTasks) {
        const taskById = new Map(currentTasks.map(task => [String(task.id), task]));
        taskById.set(String(INTRO_TASK_ID), INTRO_TASK);

        const normalizedSavedIds = savedIds.map(id => String(id));
        const savedIdSet = new Set(normalizedSavedIds);
        const removedTaskCount = normalizedSavedIds.reduce((count, id) => {
            return count + (taskById.has(id) ? 0 : 1);
        }, 0);
        const orderedTasks = normalizedSavedIds
            .map(id => taskById.get(id))
            .filter(Boolean);
        const newTasks = currentTasks.filter(task => !savedIdSet.has(String(task.id)));
        const taskListChanged = newTasks.length > 0 || removedTaskCount > 0;

        if (newTasks.length === 0) {
            return {
                tasks: orderedTasks,
                taskListChanged
            };
        }

        const hiddenPool = [...newTasks];
        const rebuiltTasks = orderedTasks.map(task => {
            const state = this.taskManager.getState(task.id);
            const isHiddenTask = String(task.id) !== INTRO_TASK_ID && (!state || state === 'hidden');
            if (!isHiddenTask) {
                return task;
            }

            hiddenPool.push(task);
            return null;
        });

        const reshuffledHiddenTasks = this.buildWeightedTaskOrder(hiddenPool);
        let hiddenIndex = 0;

        return {
            tasks: rebuiltTasks
                .map(task => task || reshuffledHiddenTasks[hiddenIndex++] || null)
                .filter(Boolean)
                .concat(reshuffledHiddenTasks.slice(hiddenIndex)),
            taskListChanged
        };
    }

    rebuildHiddenAndLockedStatesFromProgress(tasks) {
        const nextStateMap = {};
        const nextCoordToTaskId = new Map();
        const neighborOffsets = [
            [0, -1],
            [1, 0],
            [0, 1],
            [-1, 0]
        ];

        idToCoords.forEach((coord, id) => {
            nextCoordToTaskId.set(`${coord.x},${coord.y}`, String(id));
        });

        tasks.forEach(task => {
            const id = String(task.id);
            const previousState = this.taskManager.getState(id);

            if (id === INTRO_TASK_ID) {
                nextStateMap[id] = previousState === 'complete' ? 'complete' : 'incomplete';
                return;
            }

            if (previousState === 'complete' || previousState === 'incomplete') {
                nextStateMap[id] = previousState;
                return;
            }

            nextStateMap[id] = 'hidden';
        });

        tasks.forEach(task => {
            const id = String(task.id);
            if (nextStateMap[id] !== 'complete') {
                return;
            }

            const coords = idToCoords.get(task.id) || idToCoords.get(id);
            if (!coords) {
                return;
            }

            neighborOffsets.forEach(([dx, dy]) => {
                const neighborId = nextCoordToTaskId.get(`${coords.x + dx},${coords.y + dy}`);
                if (neighborId && nextStateMap[neighborId] === 'hidden') {
                    nextStateMap[neighborId] = 'locked';
                }
            });
        });

        stateMap = nextStateMap;
        saveStates(stateMap);
    }

    saveTaskGridOrder(tasks = tasksGlobal) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks.map(task => task.id)));
        } catch {
            // ignore localStorage failures
        }
    }

    syncCellPositionsFromTaskOrder() {
        this.gridModel.updateTaskCoordinates(tasksGlobal);
        coordToTaskId.clear();

        tasksGlobal.forEach(task => {
            const taskId = String(task.id);
            const coord = idToCoords.get(task.id);
            if (!coord) {
                return;
            }

            coordToTaskId.set(`${coord.x},${coord.y}`, taskId);

            const cell = getCellById(taskId);
            if (!cell) {
                return;
            }

            cell.pixelX = GRID_SAFE_PADDING_X + (coord.x * CELL_STEP);
            cell.pixelY = GRID_SAFE_PADDING_Y + (coord.y * CELL_STEP);
        });

        refreshPopoverPosition();
    }

    swapTaskStates(taskIdA, taskIdB) {
        const idA = String(taskIdA);
        const idB = String(taskIdB);
        if (idA === idB) {
            return;
        }

        const stateA = this.taskManager.getState(idA) || 'hidden';
        const stateB = this.taskManager.getState(idB) || 'hidden';

        this.taskManager.setState(idA, stateB);
        this.taskManager.setState(idB, stateA);

        const cellA = getCellById(idA);
        const cellB = getCellById(idB);
        if (cellA) {
            setCellState(cellA, stateB);
        }
        if (cellB) {
            setCellState(cellB, stateA);
        }
    }

    swapTasksById(taskIdA, taskIdB, options = {}) {
        const { swapStates = false } = options;
        const idA = String(taskIdA);
        const idB = String(taskIdB);
        if (idA === idB) {
            return false;
        }

        const indexA = tasksGlobal.findIndex(task => String(task.id) === idA);
        const indexB = tasksGlobal.findIndex(task => String(task.id) === idB);
        if (indexA < 0 || indexB < 0) {
            return false;
        }

        if (swapStates) {
            this.swapTaskStates(idA, idB);
        }

        [tasksGlobal[indexA], tasksGlobal[indexB]] = [tasksGlobal[indexB], tasksGlobal[indexA]];

        this.syncCellPositionsFromTaskOrder();
        this.saveTaskGridOrder(tasksGlobal);
        setHoveredCellId('');
        scheduleSpritePrewarm(0);
        queueCanvasRender();

        return true;
    }
}

const gridModel = new Grid();
const taskManager = new TaskManager();
const gameController = new GameController(gridModel, taskManager);
const playerProgress = new PlayerProgress();
const wiki = new Wiki();
const taskOrderManager = new TaskOrderManager(taskManager, gridModel);
const taskVerification = new TaskVerification(taskManager, playerProgress, taskOrderManager);
const taskPanels = new TaskPanels(taskManager);

// collection log item map: id -> { name, category, wikiLink, imageUrl }
const collectionLogMap = wiki.collectionLogMap;

function formatSkillName(skillName) {
    const normalized = normalizeSkillName(skillName);
    if (!normalized) {
        return 'Skill';
    }

    const labels = {
        hitpoints: 'Hitpoints',
        runecraft: 'Runecraft'
    };

    return labels[normalized] || `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function getSkillShortLabel(skillName) {
    const normalized = normalizeSkillName(skillName);
    const labels = {
        attack: 'ATK',
        strength: 'STR',
        defence: 'DEF',
        ranged: 'RNG',
        prayer: 'PRY',
        magic: 'MAG',
        runecraft: 'RC',
        hitpoints: 'HP',
        crafting: 'CRF',
        mining: 'MIN',
        smithing: 'SMI',
        fishing: 'FSH',
        cooking: 'CKG',
        firemaking: 'FM',
        woodcutting: 'WC',
        agility: 'AGI',
        herblore: 'HER',
        thieving: 'THV',
        fletching: 'FLT',
        slayer: 'SLY',
        farming: 'FAR',
        construction: 'CON',
        hunter: 'HNT',
        sailing: 'SAI'
    };

    return labels[normalized] || 'SKL';
}

function formatExperience(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
        return '0';
    }

    return Math.floor(numeric).toLocaleString('en-US');
}

function getSkillBadgeIcon(skillName, isObtained) {
    const normalized = normalizeSkillName(skillName) || 'skill';
    const cacheKey = `${normalized}:${isObtained ? '1' : '0'}`;
    if (skillBadgeIconCache.has(cacheKey)) {
        return skillBadgeIconCache.get(cacheKey);
    }

    const label = getSkillShortLabel(normalized);
    const background = isObtained ? '#5a513f' : '#3a3a3a';
    const textColor = '#f1e8d4';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="${background}"/><text x="32" y="41" text-anchor="middle" fill="${textColor}" font-family="sans-serif" font-size="22" font-weight="700">${label}</text></svg>`;
    const icon = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    skillBadgeIconCache.set(cacheKey, icon);
    return icon;
}

function bindImageErrorFallback(image) {
    if (!image || image.dataset.fallbackBound === '1') {
        return;
    }

    image.dataset.fallbackBound = '1';
    image.addEventListener('error', () => {
        if (image.dataset.fallbackApplied === '1') {
            return;
        }

        image.dataset.fallbackApplied = '1';
        image.src = QUESTION_MARK_ICON;
        image.alt = 'Image unavailable';
    });
}

function setImageWithFallback(image, src, alt = '') {
    if (!image) {
        return;
    }

    bindImageErrorFallback(image);
    image.dataset.fallbackApplied = '0';
    image.alt = alt;
    image.src = src || QUESTION_MARK_ICON;
}

function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function getCellById(id) {
    return idToCell.get(String(id)) || null;
}

function normalizeTheme(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return THEMES.has(normalized) ? normalized : 'osrs';
}

function normalizeCompleteOpacity(value) {
    const parsed = Number.parseFloat(String(value ?? ''));
    if (!Number.isFinite(parsed)) {
        return DEFAULT_COMPLETE_CELL_OPACITY;
    }

    return clamp(parsed, MIN_COMPLETE_CELL_OPACITY, MAX_COMPLETE_CELL_OPACITY);
}

function normalizeTierHintSetting(value) {
    return value === true || value === 'true' || value === '1';
}

function normalizeTierFilterSelection(value) {
    let parsed = value;

    if (typeof parsed === 'string') {
        const raw = parsed.trim();
        if (!raw) {
            return new Set();
        }

        try {
            parsed = JSON.parse(raw);
        } catch {
            return new Set();
        }
    }

    if (!Array.isArray(parsed)) {
        return new Set();
    }

    const normalized = parsed
        .map(item => String(item || '').trim())
        .filter(Boolean);

    return new Set(normalized);
}

function getFilterableTiers() {
    const tierSet = new Set(tiers.map(tier => String(tier || '').trim()).filter(Boolean));
    tierSet.add(LOCKED_FILTER_KEY);

    tasksGlobal.forEach(task => {
        const tier = String(task?.tier || '').trim();
        if (tier) {
            tierSet.add(tier);
        }
    });

    return Array.from(tierSet).sort((a, b) => {
        const sortA = getTierSortIndex(a);
        const sortB = getTierSortIndex(b);
        if (sortA !== sortB) {
            return sortA - sortB;
        }

        return a.localeCompare(b);
    });
}

function updateTierFilterControls() {
    const controls = document.getElementById('tier-filter-controls');
    const clearButton = document.getElementById('tier-filter-clear');
    if (!controls) {
        return;
    }

    const filterableTiers = getFilterableTiers();
    controls.innerHTML = '';

    filterableTiers.forEach(filterKey => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tier-filter-button';
        button.dataset.filterKey = filterKey;
        const isActive = selectedTierFilters.has(filterKey);
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');

        const swatch = document.createElement('span');
        swatch.className = 'tier-filter-swatch';
        swatch.style.background = filterKey === LOCKED_FILTER_KEY
            ? getActiveCellPalette().locked.border
            : getTierColor(filterKey);

        const text = document.createElement('span');
        text.textContent = filterKey === LOCKED_FILTER_KEY
            ? 'Locked'
            : formatTierName(filterKey);

        button.appendChild(swatch);
        button.appendChild(text);
        controls.appendChild(button);
    });

    if (clearButton) {
        clearButton.disabled = selectedTierFilters.size === 0;
    }
}

function applyTierFilters(nextFilters, options = {}) {
    const { persist = true, rerender = true } = options;
    const filterableTierSet = new Set(getFilterableTiers());
    const normalized = normalizeTierFilterSelection(Array.from(nextFilters || []));

    selectedTierFilters = new Set(Array.from(normalized).filter(tier => filterableTierSet.has(tier)));

    updateTierFilterControls();

    if (persist) {
        try {
            localStorage.setItem(TIER_FILTER_KEY, JSON.stringify(Array.from(selectedTierFilters)));
        } catch {
            // ignore localStorage failures
        }
    }

    if (rerender) {
        queueCanvasRender();
    }
}

function getTierOpacityForCell(cell) {
    const task = cell?.task;
    if (!cell || !task || task.id === INTRO_TASK_ID || selectedTierFilters.size === 0) {
        return 1;
    }

    const state = cell.state || taskManager.getState(task.id) || 'hidden';
    if (state === 'hidden') {
        return 1;
    }

    if (state === 'locked') {
        if (selectedTierFilters.has(LOCKED_FILTER_KEY)) {
            return 1;
        }

        if (hideTierHintOnLocked) {
            return FILTERED_TIER_OPACITY;
        }
    }

    const tier = String(task.tier || '').trim();
    if (!tier) {
        return 1;
    }

    return selectedTierFilters.has(tier) ? 1 : FILTERED_TIER_OPACITY;
}

function getCompleteOpacityPercent(value = completeCellOpacity) {
    return Math.round(value * 100);
}

function updateTierHintControls() {
    const checkbox = document.getElementById('hide-tier-hint-input');
    if (checkbox) {
        checkbox.checked = hideTierHintOnLocked;
    }
}

function updateCompleteOpacityControls() {
    const slider = document.getElementById('complete-opacity-input');
    const valueLabel = document.getElementById('complete-opacity-value');
    const percent = getCompleteOpacityPercent();

    if (slider && document.activeElement !== slider) {
        slider.value = String(percent);
    }

    if (valueLabel) {
        valueLabel.textContent = `${percent}%`;
    }
}

function applyCompleteOpacity(value, options = {}) {
    const { persist = true, rerender = true } = options;
    const nextOpacity = normalizeCompleteOpacity(value);

    completeCellOpacity = nextOpacity;

    if (document.documentElement) {
        document.documentElement.style.setProperty('--state-complete-opacity', String(nextOpacity));
    }

    updateCompleteOpacityControls();

    if (persist) {
        try {
            localStorage.setItem(COMPLETE_OPACITY_KEY, String(nextOpacity));
        } catch {
            // ignore localStorage failures
        }
    }

    if (rerender) {
        queueCanvasRender();
    }
}

function applyHideTierHintOnLocked(value, options = {}) {
    const { persist = true, rerender = true } = options;
    hideTierHintOnLocked = Boolean(value);
    updateTierHintControls();

    if (persist) {
        try {
            localStorage.setItem(HIDE_TIER_HINT_KEY, hideTierHintOnLocked ? '1' : '0');
        } catch {
            // ignore localStorage failures
        }
    }

    if (rerender) {
        queueCanvasRender();
        refreshOpenModal();
    }
}

function setOptionsPopoverOpen(isOpen) {
    const popover = document.getElementById('options-popover');
    const button = document.getElementById('options-button');
    if (!popover || !button) {
        return;
    }

    popover.classList.toggle('open', isOpen);
    button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function closeOptionsPopover() {
    setOptionsPopoverOpen(false);
}

function initOptionsMenu() {
    applyCompleteOpacity(completeCellOpacity, { persist: false, rerender: false });
    applyHideTierHintOnLocked(hideTierHintOnLocked, { persist: false, rerender: false });
    applyTierFilters(selectedTierFilters, { persist: false, rerender: false });

    const optionsButton = document.getElementById('options-button');
    const optionsPopover = document.getElementById('options-popover');
    const opacityInput = document.getElementById('complete-opacity-input');
    const hideTierHintInput = document.getElementById('hide-tier-hint-input');
    const tierFilterControls = document.getElementById('tier-filter-controls');
    const tierFilterClear = document.getElementById('tier-filter-clear');
    if (!optionsButton || !optionsPopover || !opacityInput || !hideTierHintInput || !tierFilterControls || !tierFilterClear) {
        return;
    }

    optionsButton.addEventListener('click', e => {
        e.preventDefault();
        const isOpen = optionsPopover.classList.contains('open');
        setOptionsPopoverOpen(!isOpen);
    });

    opacityInput.addEventListener('input', e => {
        const value = Number.parseFloat(e.currentTarget.value);
        applyCompleteOpacity(value / 100, { persist: true, rerender: true });
    });

    hideTierHintInput.addEventListener('change', e => {
        applyHideTierHintOnLocked(Boolean(e.currentTarget.checked), { persist: true, rerender: true });
    });

    tierFilterControls.addEventListener('click', e => {
        const button = e.target.closest('.tier-filter-button');
        if (!button) {
            return;
        }

        const filterKey = String(button.dataset.filterKey || '').trim();
        if (!filterKey) {
            return;
        }

        const nextFilters = new Set(selectedTierFilters);
        if (nextFilters.has(filterKey)) {
            nextFilters.delete(filterKey);
        } else {
            nextFilters.add(filterKey);
        }

        applyTierFilters(nextFilters, { persist: true, rerender: true });
    });

    tierFilterClear.addEventListener('click', () => {
        applyTierFilters(new Set(), { persist: true, rerender: true });
    });
}

function getActiveTierColors() {
    return TIER_COLORS_BY_THEME[activeTheme] || TIER_COLORS_BY_THEME.osrs;
}

function getActiveCellPalette() {
    return CELL_PALETTES_BY_THEME[activeTheme] || CELL_PALETTES_BY_THEME.osrs;
}

function getTierColor(tier) {
    return getActiveTierColors()[tier] || '#736559';
}

function getReadableTextColor(backgroundHex) {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(backgroundHex || ''));
    if (!match) {
        return '#f9f1de';
    }

    const red = Number.parseInt(match[1], 16) / 255;
    const green = Number.parseInt(match[2], 16) / 255;
    const blue = Number.parseInt(match[3], 16) / 255;
    const luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);

    return luminance > 0.52 ? '#0F0F0F' : '#f9f1de';
}

function updateThemeToggleButtons() {
    document.querySelectorAll('#theme-toggle .theme-option').forEach(button => {
        button.classList.toggle('active', button.dataset.theme === activeTheme);
    });
}

function applyTheme(theme, options = {}) {
    const { persist = true } = options;
    const nextTheme = normalizeTheme(theme);
    const changed = nextTheme !== activeTheme || document.body?.dataset.theme !== nextTheme;

    activeTheme = nextTheme;
    if (document.body) {
        document.body.dataset.theme = nextTheme;
    }

    if (persist) {
        try {
            localStorage.setItem(THEME_KEY, nextTheme);
        } catch {
            // ignore localStorage failures
        }
    }

    updateThemeToggleButtons();
    updateTierFilterControls();

    if (!changed) {
        return;
    }

    backgroundSpriteCache.clear();
    idToCell.forEach(cell => {
        cell.spriteKey = '';
    });

    queueCanvasRender();

    if (document.getElementById('task-modal')?.classList.contains('open')) {
        refreshOpenModal();
    }

    if (document.getElementById('tier-tasks-modal')?.classList.contains('open')) {
        taskPanels.renderTierTasksModal();
    }

    taskPanels.updateCurrentTasksPopover();
}

function initThemeToggle() {
    applyTheme(activeTheme, { persist: false });

    const toggle = document.getElementById('theme-toggle');
    if (!toggle) {
        return;
    }

    toggle.addEventListener('click', e => {
        const button = e.target.closest('.theme-option');
        if (!button) {
            return;
        }

        applyTheme(button.dataset.theme);
    });
}

function isAnchorConnected(anchor) {
    if (!anchor) {
        return false;
    }

    if (anchor.__virtualAnchor) {
        return Boolean(getCellById(anchor.taskId));
    }

    return anchor instanceof Node ? document.body.contains(anchor) : false;
}

function createCellAnchor(cell) {
    return {
        __virtualAnchor: true,
        taskId: String(cell.id),
        _task: cell.task,
        getBoundingClientRect() {
            const currentCell = getCellById(this.taskId);
            const grid = document.getElementById('grid');
            if (!currentCell || !grid) {
                return {
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: 0,
                    height: 0
                };
            }

            const gridRect = grid.getBoundingClientRect();
            const scaledSize = CELL_SIZE * currentScale;
            const left = gridRect.left + (currentCell.pixelX * currentScale);
            const top = gridRect.top + (currentCell.pixelY * currentScale);

            return {
                left,
                top,
                right: left + scaledSize,
                bottom: top + scaledSize,
                width: scaledSize,
                height: scaledSize
            };
        }
    };
}

function ensureGridCanvas() {
    const grid = document.getElementById('grid');
    if (!grid) {
        return null;
    }

    let canvas = grid.querySelector('#grid-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'grid-canvas';
        grid.appendChild(canvas);
    }

    bindCanvasInteractions(canvas);

    gridCanvas = canvas;
    gridContext = canvas.getContext('2d');
    return canvas;
}

function getCanvasPixelRatio() {
    const rawRatio = (window.devicePixelRatio || 1) * currentScale;
    const cappedRatio = Math.min(MAX_CANVAS_PIXEL_RATIO, rawRatio);
    return Math.max(0.25, Math.round(cappedRatio / CANVAS_PIXEL_RATIO_STEP) * CANVAS_PIXEL_RATIO_STEP);
}

function getSpritePixelRatio() {
    if (isZooming && lastCanvasPixelRatio > 0) {
        return lastCanvasPixelRatio;
    }

    return getCanvasPixelRatio();
}

function syncCanvasResolution() {
    if (!gridCanvas || !gridContext || gridPixelWidth <= 0 || gridPixelHeight <= 0) {
        return;
    }

    const pixelRatio = getCanvasPixelRatio();
    const canvasWidth = Math.max(1, Math.round(gridPixelWidth * pixelRatio));
    const canvasHeight = Math.max(1, Math.round(gridPixelHeight * pixelRatio));

    if (gridCanvas.width !== canvasWidth || gridCanvas.height !== canvasHeight) {
        gridCanvas.width = canvasWidth;
        gridCanvas.height = canvasHeight;
    }

    gridCanvas.style.width = `${gridPixelWidth}px`;
    gridCanvas.style.height = `${gridPixelHeight}px`;
    gridContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    gridContext.imageSmoothingEnabled = false;

    if (Math.abs(lastCanvasPixelRatio - pixelRatio) > 0.001) {
        backgroundSpriteCache.clear();
        idToCell.forEach(cell => {
            cell.spriteKey = '';
        });
        lastCanvasPixelRatio = pixelRatio;
        scheduleSpritePrewarm(60);
    }
}

function scheduleZoomRender() {
    isZooming = true;
    if (zoomRenderDebounceTimer) {
        clearTimeout(zoomRenderDebounceTimer);
    }

    zoomRenderDebounceTimer = setTimeout(() => {
        zoomRenderDebounceTimer = null;
        isZooming = false;
        syncCanvasResolution();
        queueCanvasRender();
    }, ZOOM_RENDER_DEBOUNCE_MS);
}

function flushZoomRender() {
    if (zoomRenderDebounceTimer) {
        clearTimeout(zoomRenderDebounceTimer);
        zoomRenderDebounceTimer = null;
    }

    isZooming = false;
    syncCanvasResolution();
    queueCanvasRender();
}

function getImageAsset(source) {
    const src = source || QUESTION_MARK_ICON;
    if (imageAssetCache.has(src)) {
        return imageAssetCache.get(src);
    }

    const image = new Image();
    const asset = {
        image,
        status: 'loading',
        fallback: null
    };

    image.onload = () => {
        asset.status = 'ready';
        queueCanvasRender();
    };

    image.onerror = () => {
        asset.status = 'error';
        if (src !== QUESTION_MARK_ICON) {
            asset.fallback = getImageAsset(QUESTION_MARK_ICON);
        }
        queueCanvasRender();
    };

    image.src = src;
    imageAssetCache.set(src, asset);
    return asset;
}

function resolveImageForDraw(source) {
    const asset = getImageAsset(source);
    const fallbackAsset = getImageAsset(QUESTION_MARK_ICON);

    if (asset.status === 'loading' && asset.image.complete) {
        if (asset.image.naturalWidth > 0) {
            asset.status = 'ready';
        } else {
            asset.status = 'error';
            if (!asset.fallback && source !== QUESTION_MARK_ICON) {
                asset.fallback = fallbackAsset;
            }
        }
    }

    if (asset.status === 'ready') {
        return asset.image;
    }

    if (asset.status === 'error' && source !== QUESTION_MARK_ICON && !asset.fallback) {
        asset.fallback = fallbackAsset;
    }

    if (asset.fallback?.status === 'ready') {
        return asset.fallback.image;
    }

    if (fallbackAsset.status === 'ready') {
        return fallbackAsset.image;
    }

    return null;
}

function queueCanvasRender() {
    if (!gridContext || canvasFrameId !== null) {
        return;
    }

    canvasFrameId = requestAnimationFrame(drawCanvasFrame);
}

function drawCanvasFrame(timestamp) {
    canvasFrameId = null;
    const keepAnimating = renderGridCanvas(timestamp);
    if (keepAnimating) {
        queueCanvasRender();
    }
}

function drawRoundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
}

function buildTaskNameLines(name, options = {}) {
    const { maxCharsPerLine = 14, maxLines = 2 } = options;
    const raw = String(name || '').trim();
    if (!raw) {
        return [''];
    }

    const words = raw.split(/\s+/);
    const lines = [];
    let current = '';

    const pushCurrent = () => {
        if (current) {
            lines.push(current);
            current = '';
        }
    };

    for (const word of words) {
        if (!current) {
            if (word.length <= maxCharsPerLine) {
                current = word;
            } else {
                lines.push(`${word.slice(0, Math.max(1, maxCharsPerLine - 1))}…`);
            }
            continue;
        }

        const next = `${current} ${word}`;
        if (next.length <= maxCharsPerLine) {
            current = next;
        } else {
            pushCurrent();
            if (word.length <= maxCharsPerLine) {
                current = word;
            } else {
                lines.push(`${word.slice(0, Math.max(1, maxCharsPerLine - 1))}…`);
            }
        }
    }

    pushCurrent();

    if (lines.length <= maxLines) {
        return lines;
    }

    const clipped = lines.slice(0, maxLines);
    const last = clipped[maxLines - 1];
    clipped[maxLines - 1] = last.endsWith('…') ? last : `${last.slice(0, Math.max(1, maxCharsPerLine - 1))}…`;
    return clipped;
}

function getCellImageDrawState(imageSource) {
    if (!imageSource) {
        return {
            image: null,
            key: 'none',
            hasImageSource: false
        };
    }

    const image = resolveImageForDraw(imageSource);
    const asset = imageAssetCache.get(imageSource) || getImageAsset(imageSource);

    let mode = 'placeholder';
    if (asset.status === 'ready' && image) {
        mode = 'ready';
    } else if (image) {
        mode = 'fallback';
    }

    return {
        image,
        key: `${mode}:${imageSource}`,
        hasImageSource: true
    };
}

function getContainedImageRect(image, boxX, boxY, boxWidth, boxHeight) {
    const sourceWidth = Math.max(1, image?.naturalWidth || image?.width || boxWidth);
    const sourceHeight = Math.max(1, image?.naturalHeight || image?.height || boxHeight);
    const scale = Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight);
    const drawWidth = Math.max(1, sourceWidth * scale);
    const drawHeight = Math.max(1, sourceHeight * scale);

    return {
        x: boxX + ((boxWidth - drawWidth) / 2),
        y: boxY + ((boxHeight - drawHeight) / 2),
        width: drawWidth,
        height: drawHeight
    };
}

function getCellSpriteKey(cell, imageKey) {
    const pixelRatioKey = Math.round(getSpritePixelRatio() * 1000);
    if (cell.state === 'locked') {
        return `locked::${activeTheme}::${pixelRatioKey}::${imageKey}`;
    }

    return [
        activeTheme,
        cell.state,
        cell.task?.tier || '',
        pixelRatioKey,
        imageKey,
        (cell.nameLines || []).join('|')
    ].join('::');
}

function getBackgroundSpriteKey(state) {
    return `bg::${activeTheme}::${state}@${Math.round(getSpritePixelRatio() * 1000)}`;
}

function drawCellBackgroundSprite(spriteContext, state, options = {}) {
    const { skipBadge = false, borderColor = '' } = options;
    const x = 0;
    const y = 0;

    const themePalette = getActiveCellPalette();
    const palette = themePalette[state] || themePalette.hidden;
    const borderWidth = palette.borderWidth || 1;

    drawRoundedRect(spriteContext, x, y, CELL_SIZE, CELL_SIZE, CELL_RADIUS);
    spriteContext.fillStyle = palette.fill;
    spriteContext.fill();

    const borderInset = borderWidth / 2;
    const borderRadius = Math.max(0, CELL_RADIUS - borderInset);
    drawRoundedRect(
        spriteContext,
        x + borderInset,
        y + borderInset,
        CELL_SIZE - borderWidth,
        CELL_SIZE - borderWidth,
        borderRadius
    );
    spriteContext.strokeStyle = borderColor || palette.border;
    spriteContext.lineWidth = borderWidth;
    spriteContext.stroke();

    if (state === 'locked' && !skipBadge) {
        const label = 'LOCKED';
        spriteContext.font = '700 8px sans-serif';
        const badgePaddingX = 5;
        const badgeWidth = Math.ceil(spriteContext.measureText(label).width) + (badgePaddingX * 2);
        const badgeHeight = 14;
        const badgeX = x + 7;
        const badgeY = y + 7;

        drawRoundedRect(spriteContext, badgeX, badgeY, badgeWidth, badgeHeight, 7);
        spriteContext.fillStyle = themePalette.badgeFill;
        spriteContext.fill();
        spriteContext.strokeStyle = themePalette.badgeBorder;
        spriteContext.lineWidth = 1;
        spriteContext.stroke();

        spriteContext.fillStyle = themePalette.badgeText;
        spriteContext.textAlign = 'center';
        spriteContext.textBaseline = 'middle';
        spriteContext.fillText(label, badgeX + (badgeWidth / 2), badgeY + (badgeHeight / 2));
    }
}

function drawCellSpriteForeground(spriteContext, cell, palette, imageState) {
    const state = cell.state || 'hidden';
    const x = 0;
    const y = 0;
    const imageSize = state === 'locked' ? 42 : 30;
    const imageX = x + ((CELL_SIZE - imageSize) / 2);
    const imageY = y + (state === 'locked' ? 22 : 14);

    if (imageState.image) {
        const imageRect = getContainedImageRect(imageState.image, imageX, imageY, imageSize, imageSize);
        spriteContext.save();
        spriteContext.shadowColor = getActiveCellPalette().imageShadow;
        spriteContext.shadowBlur = 6;
        spriteContext.shadowOffsetY = 2;
        spriteContext.drawImage(imageState.image, imageRect.x, imageRect.y, imageRect.width, imageRect.height);
        spriteContext.restore();
    } else if (imageState.hasImageSource) {
        drawRoundedRect(spriteContext, imageX + 2, imageY + 2, imageSize - 4, imageSize - 4, 8);
        spriteContext.fillStyle = getActiveCellPalette().placeholderFill;
        spriteContext.fill();
        spriteContext.fillStyle = palette.text;
        spriteContext.font = '700 16px sans-serif';
        spriteContext.textAlign = 'center';
        spriteContext.textBaseline = 'middle';
        spriteContext.fillText('?', x + (CELL_SIZE / 2), imageY + (imageSize / 2));
    }

    if (state === 'incomplete' || state === 'complete') {
        spriteContext.fillStyle = palette.text;
        spriteContext.font = '700 8.5px sans-serif';
        spriteContext.textAlign = 'center';
        spriteContext.textBaseline = 'alphabetic';
        const lines = cell.nameLines || [];
        const lineHeight = 9;
        const startY = y + CELL_SIZE - 8 - ((lines.length - 1) * lineHeight);
        lines.forEach((line, lineIndex) => {
            spriteContext.fillText(line, x + (CELL_SIZE / 2), startY + (lineIndex * lineHeight));
        });
    }
}

function ensureBackgroundSprite(state) {
    if (!state || state === 'hidden') {
        return null;
    }

    const spriteKey = getBackgroundSpriteKey(state);
    if (backgroundSpriteCache.has(spriteKey)) {
        return backgroundSpriteCache.get(spriteKey);
    }

    const pixelRatio = getSpritePixelRatio();
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = Math.max(1, Math.round(CELL_SIZE * pixelRatio));
    spriteCanvas.height = Math.max(1, Math.round(CELL_SIZE * pixelRatio));
    const spriteContext = spriteCanvas.getContext('2d');
    if (!spriteContext) {
        return null;
    }

    spriteContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    spriteContext.imageSmoothingEnabled = false;
    drawCellBackgroundSprite(spriteContext, state);

    backgroundSpriteCache.set(spriteKey, spriteCanvas);
    return spriteCanvas;
}

function ensureCellSprite(cell) {
    if (!cell || cell.state === 'hidden') {
        return null;
    }

    const imageSource = cell.state === 'locked'
        ? LOCKED_TILE_IMAGE
        : (cell.state === 'incomplete' || cell.state === 'complete' ? cell.task.imageLink : null);
    const imageState = getCellImageDrawState(imageSource);
    const spriteKey = getCellSpriteKey(cell, imageState.key);

    if (cell.state === 'locked' && backgroundSpriteCache.has(spriteKey)) {
        return backgroundSpriteCache.get(spriteKey);
    }

    if (cell.spriteCanvas && cell.spriteKey === spriteKey) {
        return cell.spriteCanvas;
    }

    const pixelRatio = getSpritePixelRatio();
    const spriteCanvas = cell.state === 'locked'
        ? document.createElement('canvas')
        : (cell.spriteCanvas || document.createElement('canvas'));
    spriteCanvas.width = Math.max(1, Math.round(CELL_SIZE * pixelRatio));
    spriteCanvas.height = Math.max(1, Math.round(CELL_SIZE * pixelRatio));
    const spriteContext = spriteCanvas.getContext('2d');
    if (!spriteContext) {
        return null;
    }

    spriteContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    spriteContext.imageSmoothingEnabled = false;
    spriteContext.clearRect(0, 0, CELL_SIZE, CELL_SIZE);

    const themePalette = getActiveCellPalette();
    const palette = themePalette[cell.state] || themePalette.hidden;

    const borderColor = cell.state === 'incomplete'
        ? getTierColor(cell.task?.tier)
        : '';

    drawCellBackgroundSprite(spriteContext, cell.state, { borderColor });
    drawCellSpriteForeground(spriteContext, cell, palette, imageState);

    if (cell.state === 'locked') {
        backgroundSpriteCache.set(spriteKey, spriteCanvas);
        return spriteCanvas;
    }

    cell.spriteCanvas = spriteCanvas;
    cell.spriteKey = spriteKey;

    return spriteCanvas;
}

function getEdgeCellSpriteKey(edgeSides) {
    const pixelRatioKey = Math.round(getSpritePixelRatio() * 1000);
    const t = edgeSides.top ? 1 : 0;
    const r = edgeSides.right ? 1 : 0;
    const b = edgeSides.bottom ? 1 : 0;
    const l = edgeSides.left ? 1 : 0;
    return `edge::${activeTheme}::${t}${r}${b}${l}@${pixelRatioKey}`;
}

function ensureEdgeCellSprite(edgeSides) {
    const spriteKey = getEdgeCellSpriteKey(edgeSides);
    if (backgroundSpriteCache.has(spriteKey)) {
        return backgroundSpriteCache.get(spriteKey);
    }

    const pixelRatio = getSpritePixelRatio();
    const pxSize = Math.max(1, Math.round(CELL_SIZE * pixelRatio));

    // 7.5% = where opacity reaches 50%; 10% = where it hits 0.
    const fade1 = CELL_SIZE * 0.075;
    const fade2 = CELL_SIZE * 0.10;
    const midStop = fade1 / fade2; // 0.75

    // Build a mask canvas: each active edge contributes a fade gradient.
    // 'lighter' composite accumulates contributions so corners read full opacity.
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = pxSize;
    maskCanvas.height = pxSize;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) {
        return null;
    }

    maskCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    maskCtx.globalCompositeOperation = 'lighter';

    const drawFade = (x0, y0, x1, y1, rX, rY, rW, rH) => {
        const grad = maskCtx.createLinearGradient(x0, y0, x1, y1);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        maskCtx.fillStyle = grad;
        maskCtx.fillRect(rX, rY, rW, rH);
    };

    if (edgeSides.left)   drawFade(0,         0, fade2,             0, 0,                  0,                  fade2,     CELL_SIZE);
    if (edgeSides.right)  drawFade(CELL_SIZE,  0, CELL_SIZE - fade2, 0, CELL_SIZE - fade2, 0,                  fade2,     CELL_SIZE);
    if (edgeSides.top)    drawFade(0, 0,         0, fade2,             0,                  0,                  CELL_SIZE, fade2);
    if (edgeSides.bottom) drawFade(0, CELL_SIZE, 0, CELL_SIZE - fade2, 0,                  CELL_SIZE - fade2, CELL_SIZE, fade2);

    // Draw the full locked cell background then cut it with the mask.
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = pxSize;
    spriteCanvas.height = pxSize;
    const spriteContext = spriteCanvas.getContext('2d');
    if (!spriteContext) {
        return null;
    }

    spriteContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    spriteContext.imageSmoothingEnabled = false;
    drawCellBackgroundSprite(spriteContext, 'locked', { skipBadge: true });

    // destination-in preserves existing pixels scaled by the incoming alpha.
    spriteContext.globalCompositeOperation = 'destination-in';
    spriteContext.drawImage(maskCanvas, 0, 0, CELL_SIZE, CELL_SIZE);
    spriteContext.globalCompositeOperation = 'source-over';

    backgroundSpriteCache.set(spriteKey, spriteCanvas);
    return spriteCanvas;
}

function prewarmCellSprites() {
    idToCell.forEach(cell => {
        if (cell.state === 'hidden') {
            if (cell.edgeVisible && (cell.edgeSides.top || cell.edgeSides.right || cell.edgeSides.bottom || cell.edgeSides.left)) {
                ensureEdgeCellSprite(cell.edgeSides);
            }
        } else {
            ensureCellSprite(cell);
        }
    });
}

function prewarmVisibleCellSprites() {
    const visibleBounds = getVisibleWorldBounds();
    const visibleCoords = getVisibleCoordBounds(visibleBounds);
    if (!visibleCoords) {
        return;
    }

    for (let y = visibleCoords.top; y <= visibleCoords.bottom; y++) {
        for (let x = visibleCoords.left; x <= visibleCoords.right; x++) {
            const taskId = coordToTaskId.get(`${x},${y}`);
            if (!taskId) {
                continue;
            }

            const cell = getCellById(taskId);
            if (!cell) {
                continue;
            }

            if (cell.state === 'hidden') {
                if (cell.edgeVisible && (cell.edgeSides.top || cell.edgeSides.right || cell.edgeSides.bottom || cell.edgeSides.left)) {
                    ensureEdgeCellSprite(cell.edgeSides);
                }
            } else {
                ensureCellSprite(cell);
            }
        }
    }
}

function scheduleSpritePrewarm(delay = 0) {
    if (spritePrewarmTimer) {
        clearTimeout(spritePrewarmTimer);
    }

    spritePrewarmTimer = setTimeout(() => {
        spritePrewarmTimer = null;
        prewarmCellSprites();
        queueCanvasRender();
    }, delay);
}

function drawCanvasCell(context, cell, now) {
    const state = cell.state || 'hidden';
    const hasEdge = state === 'hidden' && cell.edgeVisible && (cell.edgeSides.top || cell.edgeSides.right || cell.edgeSides.bottom || cell.edgeSides.left);
    let keepAnimating = false;

    if (state === 'hidden' && !hasEdge && !cell.popAnimation) {
        return false;
    }

    let scale = 1;
    let alpha = 1;

    if (cell.popAnimation) {
        const elapsed = now - cell.popAnimation.startTime;
        if (elapsed < 0) {
            return true;
        }

        const progress = clamp(elapsed / POP_DURATION_MS, 0, 1);
        const popEasing = cell.popAnimation.easing || 'linear';
        if (progress >= 1) {
            cell.popAnimation = null;
        } else {
            keepAnimating = true;
            if (progress < 0.5) {
                const upRaw = progress / 0.5;
                const up = popEasing === 'ease-in'
                    ? upRaw * upRaw
                    : upRaw;
                scale = 1.2 * up;
                alpha = clamp(up * 1.2, 0, 1);
            } else {
                const down = (progress - 0.5) / 0.5;
                scale = 1.2 - (0.2 * down);
                alpha = 1;
            }
        }
    }

    const hoverTarget = hoveredCellId === cell.id && isCellHoverable(cell) ? 1 : 0;
    let hoverProgress = cell.hoverProgress ?? 0;
    const hoverDelta = hoverTarget - hoverProgress;
    if (Math.abs(hoverDelta) > 0.001) {
        hoverProgress += hoverDelta * HOVER_LERP_FACTOR;
        if (Math.abs(hoverTarget - hoverProgress) < 0.01) {
            hoverProgress = hoverTarget;
        }
        cell.hoverProgress = hoverProgress;
        keepAnimating = true;
    } else if (hoverProgress !== hoverTarget) {
        hoverProgress = hoverTarget;
        cell.hoverProgress = hoverTarget;
    }

    if (hoverProgress > 0) {
        scale *= 1 + (HOVER_SCALE_BOOST * hoverProgress);
    }

    if (state === 'complete') {
        alpha *= completeCellOpacity;
    }

    alpha *= getTierOpacityForCell(cell);

    const x = cell.pixelX;
    const y = cell.pixelY;
    const centerX = x + (CELL_SIZE / 2);
    const centerY = y + (CELL_SIZE / 2);
    const hoverLift = HOVER_LIFT_PX * hoverProgress;

    context.save();
    context.globalAlpha = alpha;
    context.translate(centerX, centerY - hoverLift);
    context.scale(scale, scale);
    context.translate(-centerX, -centerY);

    if (hasEdge) {
        if (selectedTierFilters.size > 0) {
            context.restore();
            return keepAnimating;
        }

        const edgeSprite = ensureEdgeCellSprite(cell.edgeSides);
        if (edgeSprite) {
            context.drawImage(edgeSprite, x, y, CELL_SIZE, CELL_SIZE);
        }

        context.restore();
        return keepAnimating;
    }

    const sprite = ensureCellSprite(cell);
    if (sprite) {
        context.drawImage(sprite, x, y, CELL_SIZE, CELL_SIZE);
    }

    if (!(hideTierHintOnLocked && state === 'locked')) {
        context.beginPath();
        context.arc(x + CELL_SIZE - 8, y + 8, 4, 0, Math.PI * 2);
        context.fillStyle = getTierColor(cell.task.tier);
        context.fill();
    }

    if (hoverProgress > 0.001) {
        context.save();
        drawRoundedRect(context, x + 0.75, y + 0.75, CELL_SIZE - 1.5, CELL_SIZE - 1.5, CELL_RADIUS - 1);
        context.lineWidth = 1.5;
        context.strokeStyle = `rgba(255, 207, 63, ${0.26 * hoverProgress})`;
        context.shadowColor = `rgba(147, 96, 57, ${0.3 * hoverProgress})`;
        context.shadowBlur = 12 * hoverProgress;
        context.stroke();
        context.restore();
    }

    context.restore();
    return keepAnimating;
}

function getVisibleWorldBounds() {
    const container = document.getElementById('grid-container');
    if (!container || currentScale <= 0) {
        return null;
    }

    const margin = CELL_STEP;
    return {
        left: (container.scrollLeft / currentScale) - margin,
        top: (container.scrollTop / currentScale) - margin,
        right: ((container.scrollLeft + container.clientWidth) / currentScale) + margin,
        bottom: ((container.scrollTop + container.clientHeight) / currentScale) + margin
    };
}

function getVisibleCoordBounds(bounds) {
    if (!bounds || gridCellCount <= 0) {
        return null;
    }

    const maxCoord = gridCellCount - 1;
    const left = clamp(Math.floor((bounds.left - GRID_SAFE_PADDING_X) / CELL_STEP), 0, maxCoord);
    const right = clamp(Math.floor((bounds.right - GRID_SAFE_PADDING_X) / CELL_STEP), 0, maxCoord);
    const top = clamp(Math.floor((bounds.top - GRID_SAFE_PADDING_Y) / CELL_STEP), 0, maxCoord);
    const bottom = clamp(Math.floor((bounds.bottom - GRID_SAFE_PADDING_Y) / CELL_STEP), 0, maxCoord);

    return {
        left,
        right,
        top,
        bottom
    };
}

function getVisibleClearRect(bounds) {
    if (!bounds) {
        return {
            x: 0,
            y: 0,
            width: gridPixelWidth,
            height: gridPixelHeight
        };
    }

    const x = clamp(bounds.left, 0, gridPixelWidth);
    const y = clamp(bounds.top, 0, gridPixelHeight);
    const right = clamp(bounds.right, 0, gridPixelWidth);
    const bottom = clamp(bounds.bottom, 0, gridPixelHeight);

    return {
        x,
        y,
        width: Math.max(0, right - x),
        height: Math.max(0, bottom - y)
    };
}

function renderGridCanvas(now = performance.now()) {
    if (!gridContext || !gridCanvas) {
        return false;
    }

    const visibleBounds = getVisibleWorldBounds();
    const clearRect = getVisibleClearRect(visibleBounds);
    gridContext.clearRect(clearRect.x, clearRect.y, clearRect.width, clearRect.height);
    const visibleCoords = getVisibleCoordBounds(visibleBounds);
    if (!visibleCoords) {
        return false;
    }

    let keepAnimating = false;
    for (let y = visibleCoords.top; y <= visibleCoords.bottom; y++) {
        for (let x = visibleCoords.left; x <= visibleCoords.right; x++) {
            const taskId = coordToTaskId.get(`${x},${y}`);
            if (!taskId) {
                continue;
            }

            const cell = getCellById(taskId);
            if (!cell) {
                continue;
            }

            const cellAnimating = drawCanvasCell(gridContext, cell, now);
            keepAnimating = keepAnimating || cellAnimating;
        }
    }

    return keepAnimating;
}

function getCellAtClientPoint(clientX, clientY) {
    if (!gridCanvas) {
        return null;
    }

    const canvasRect = gridCanvas.getBoundingClientRect();
    if (
        clientX < canvasRect.left ||
        clientY < canvasRect.top ||
        clientX > canvasRect.right ||
        clientY > canvasRect.bottom
    ) {
        return null;
    }

    const localX = (clientX - canvasRect.left) / currentScale;
    const localY = (clientY - canvasRect.top) / currentScale;
    const gridX = localX - GRID_SAFE_PADDING_X;
    const gridY = localY - GRID_SAFE_PADDING_Y;

    if (gridX < 0 || gridY < 0) {
        return null;
    }

    const coordX = Math.floor(gridX / CELL_STEP);
    const coordY = Math.floor(gridY / CELL_STEP);
    const withinCellX = gridX - (coordX * CELL_STEP);
    const withinCellY = gridY - (coordY * CELL_STEP);
    if (withinCellX < 0 || withinCellY < 0 || withinCellX >= CELL_SIZE || withinCellY >= CELL_SIZE) {
        return null;
    }

    const taskId = coordToTaskId.get(`${coordX},${coordY}`);
    return taskId ? getCellById(taskId) : null;
}

function isCellHoverable(cell) {
    if (!cell) {
        return false;
    }

    const state = cell.state || 'hidden';
    return state === 'locked' || state === 'incomplete' || state === 'complete';
}

function setHoveredCellId(nextCellId) {
    const normalized = nextCellId ? String(nextCellId) : '';
    if (hoveredCellId === normalized) {
        return;
    }

    const previousCell = hoveredCellId ? getCellById(hoveredCellId) : null;
    hoveredCellId = normalized;
    const nextCell = hoveredCellId ? getCellById(hoveredCellId) : null;

    if (gridCanvas) {
        gridCanvas.style.cursor = nextCell && isCellHoverable(nextCell) ? 'pointer' : 'default';
    }

    if (previousCell || nextCell) {
        queueCanvasRender();
    }
}

function bindCanvasInteractions(canvas) {
    if (!canvas || canvas.dataset.bound === '1') {
        return;
    }

    canvas.dataset.bound = '1';
    canvas.style.cursor = 'default';

    canvas.addEventListener('mousemove', e => {
        if (e.buttons !== 0) {
            setHoveredCellId('');
            return;
        }

        const cell = getCellAtClientPoint(e.clientX, e.clientY);
        if (!cell || !isCellHoverable(cell)) {
            setHoveredCellId('');
            return;
        }

        setHoveredCellId(cell.id);
    }, { passive: true });

    canvas.addEventListener('mouseleave', () => {
        setHoveredCellId('');
    });

    canvas.addEventListener('click', e => {
        if (suppressTaskClick || e.button !== 0) {
            return;
        }

        const cell = getCellAtClientPoint(e.clientX, e.clientY);
        if (!cell) {
            return;
        }

        const state = taskManager.getState(cell.id) || 'hidden';
        if (state === 'hidden') {
            return;
        }

        showModal(cell.task, createCellAnchor(cell));
    });

    canvas.addEventListener('contextmenu', e => {
        const cell = getCellAtClientPoint(e.clientX, e.clientY);
        if (!cell) {
            return;
        }

        const state = taskManager.getState(cell.id) || 'hidden';
        if (state === 'incomplete' || state === 'complete') {
            e.preventDefault();
            window.open(cell.task.wikiLink, '_blank');
        }
    });
}

function normalizeUsername(value) {
    return (value || '').trim().replace(/\s+/g, ' ');
}

function toSyncUsername(value) {
    return normalizeUsername(value).replace(/\W/g, '_');
}

function getPlayerCacheKey(username) {
    return `${PLAYER_CL_CACHE_PREFIX}:${normalizeUsername(username).toLowerCase()}`;
}

function normalizeAchievementDiaryRegion(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) {
        return '';
    }

    const slug = raw
        .replace(/_/g, ' ')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-');

    if (slug === 'kourend-kebos') {
        return 'kourend-and-kebos';
    }
    if (slug === 'lumbridge-draynor') {
        return 'lumbridge-and-draynor';
    }

    return slug;
}

function normalizeAchievementDiaryDifficulty(value) {
    const difficulty = String(value || '').trim().toLowerCase();
    return DIARY_DIFFICULTIES.has(difficulty) ? difficulty : '';
}

function getAchievementDiaryKey(region, difficulty) {
    return `${region}|${difficulty}`;
}

function normalizeSkillName(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) {
        return '';
    }

    const compact = raw.replace(/[_\s-]+/g, '');
    const aliases = {
        attack: 'attack',
        strength: 'strength',
        defence: 'defence',
        defense: 'defence',
        ranged: 'ranged',
        prayer: 'prayer',
        magic: 'magic',
        runecraft: 'runecraft',
        runecrafting: 'runecraft',
        hitpoint: 'hitpoints',
        hitpoints: 'hitpoints',
        hp: 'hitpoints',
        crafting: 'crafting',
        mining: 'mining',
        smithing: 'smithing',
        fishing: 'fishing',
        cooking: 'cooking',
        firemaking: 'firemaking',
        woodcutting: 'woodcutting',
        agility: 'agility',
        herblore: 'herblore',
        thieving: 'thieving',
        fletching: 'fletching',
        slayer: 'slayer',
        farming: 'farming',
        construction: 'construction',
        hunter: 'hunter',
        sailing: 'sailing'
    };

    return aliases[compact] || '';
}

function levelToExperience(level) {
    const numericLevel = Number(level);
    if (!Number.isFinite(numericLevel) || numericLevel < 1) {
        return Number.NaN;
    }

    const cappedLevel = Math.min(126, Math.floor(numericLevel));
    let points = 0;
    for (let currentLevel = 1; currentLevel < cappedLevel; currentLevel += 1) {
        points += Math.floor(currentLevel + (300 * (2 ** (currentLevel / 7))));
    }

    return Math.floor(points / 4);
}

function experienceToLevel(experience) {
    const numericExperience = Number(experience);
    if (!Number.isFinite(numericExperience) || numericExperience < 0) {
        return Number.NaN;
    }

    let level = 1;
    while (level < 126 && levelToExperience(level + 1) <= numericExperience) {
        level += 1;
    }

    return level;
}

function computeGridSize(count) {
    let size = Math.ceil(Math.sqrt(count));
    if (size % 2 === 0) {
        size += 1;
    }
    return size;
}

function generateSpiral(count, size) {
    const centerX = Math.floor(size / 2);
    const centerY = Math.floor(size / 2);
    const coords = [];
    let x = centerX;
    let y = centerY;
    coords.push([x, y]);
    let step = 1;

    while (coords.length < count) {
        for (let i = 0; i < step && coords.length < count; i++) {
            x++;
            coords.push([x, y]);
        }
        for (let i = 0; i < step && coords.length < count; i++) {
            y++;
            coords.push([x, y]);
        }
        step++;
        for (let i = 0; i < step && coords.length < count; i++) {
            x--;
            coords.push([x, y]);
        }
        for (let i = 0; i < step && coords.length < count; i++) {
            y--;
            coords.push([x, y]);
        }
        step++;
    }

    return coords;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function loadStates() {
    try {
        const raw = localStorage.getItem(STATE_KEY);
        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw);
        Object.keys(parsed).forEach(id => {
            if (parsed[id] === 'current') {
                parsed[id] = 'incomplete';
            }
        });
        return parsed;
    } catch {
        return {};
    }
}

function saveStates(map) {
    try {
        localStorage.setItem(STATE_KEY, JSON.stringify(map));
    } catch {
        // ignore localStorage failures
    }
}

function updateUnlockHud() {
    const unlocks = document.getElementById('hud-unlocks');
    const nextUnlock = document.getElementById('hud-next-unlock');
    if (!unlocks || !nextUnlock) {
        return;
    }

    const completedCount = taskManager.getCompletedCount();
    const totalUnlocks = taskManager.getUnlockLimit(completedCount);
    const availableUnlocks = Math.max(0, totalUnlocks - taskManager.getUnlockedCount());
    const tasksUntilNext = taskManager.getTasksUntilNextUnlock(completedCount);

    unlocks.textContent = `${availableUnlocks} / ${totalUnlocks}`;
    nextUnlock.textContent = tasksUntilNext === 1 ? '1 task' : `${tasksUntilNext} tasks`;
    taskPanels.updateTierProgressMenu();
    taskPanels.updateCurrentTasksPopover();

    const tierTasksModal = document.getElementById('tier-tasks-modal');
    if (tierTasksModal?.classList.contains('open')) {
        taskPanels.renderTierTasksModal();
    }
}

function formatTierName(tier) {
    return String(tier || '')
        .split('-')
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function getTierSortIndex(tier) {
    const index = TIER_DISPLAY_ORDER.indexOf(tier);
    return index === -1 ? Number.POSITIVE_INFINITY : index;
}

function refreshOpenModal() {
    const modal = document.getElementById('task-modal');
    if (!modal?.classList.contains('open') || !activePopoverAnchor) {
        return;
    }

    if (!isAnchorConnected(activePopoverAnchor)) {
        hideModal();
        return;
    }

    const task = activePopoverAnchor._task;
    if (task) {
        showModal(task, activePopoverAnchor);
    }
}

async function syncCompletedTasksFromObtained(options = {}) {
    const {
        showToast = true,
        refreshModal = true,
        batchDelay = SYNC_STAGGER_MS
    } = options;

    const previousLimit = taskManager.getUnlockLimit();
    let completedCount = 0;
    const center = gameController.getCenterCoord(tasksGlobal);

    const tasksToComplete = tasksGlobal
        .filter(task => taskManager.getState(task.id) !== 'complete')
        .filter(task => {
            const requiredCount = taskVerification.getTaskRequiredCount(task);
            return requiredCount > 0 && taskVerification.getTaskObtainedCount(task) >= requiredCount;
        })
        .map(task => {
            const coord = gameController.getTaskCoord(task);
            return {
                task,
                distance: Math.abs(coord.x - center.x) + Math.abs(coord.y - center.y)
            };
        })
        .sort((a, b) => a.distance - b.distance);

    const distanceBatches = [];
    tasksToComplete.forEach(entry => {
        const previousBatch = distanceBatches[distanceBatches.length - 1];
        if (!previousBatch || previousBatch.distance !== entry.distance) {
            distanceBatches.push({
                distance: entry.distance,
                tasks: [entry.task]
            });
            return;
        }

        previousBatch.tasks.push(entry.task);
    });

    const revealStagger = distanceBatches.length * batchDelay > INITIAL_REVEAL_DURATION_MS
        ? INITIAL_REVEAL_DURATION_MS / Math.max(1, distanceBatches.length - 1)
        : batchDelay;

    for (let index = 0; index < distanceBatches.length; index++) {
        const batch = distanceBatches[index].tasks;
        batch.forEach(task => {
            taskManager.applyTaskCompletion(task);
        });

        completedCount += batch.length;
        taskManager.normalizeUnlockStates();
        updateUnlockHud();
        refreshHiddenEdges({ animate: false });

        if (index + 1 < distanceBatches.length) {
            await wait(revealStagger * 2);
        }
    }

    taskManager.revealFrontierFromCompletedTasks();
    taskManager.normalizeUnlockStates();
    updateUnlockHud();

    if (completedCount > 0) {
        refreshHiddenEdges({ animate: false });
    }

    const nextLimit = taskManager.getUnlockLimit();
    if (showToast && nextLimit > previousLimit) {
        showUnlockToast(nextLimit);
    }

    if (refreshModal) {
        refreshOpenModal();
    }

    return completedCount;
}

async function syncPlayerProgress() {
    if (!playerUsername) {
        return 0;
    }

    const playerSnapshot = await wiki.loadPlayerData(playerUsername, { forceRefresh: true });
    if (playerSnapshot) {
        playerProgress.applySnapshot(playerSnapshot);
    }

    return syncCompletedTasksFromObtained({ animate: true, showToast: true, refreshModal: true });
}

function getMinScale() {
    const grid = document.getElementById('grid');
    const container = document.getElementById('grid-container');
    if (!grid || !container || !grid.scrollWidth || !grid.scrollHeight) {
        return MIN_SCALE;
    }

    const widthFit = container.clientWidth / grid.scrollWidth;
    const heightFit = container.clientHeight / grid.scrollHeight;
    return clamp(Math.max(widthFit, heightFit), MIN_SCALE, MAX_SCALE);
}

function updateGridScale(options = {}) {
    const { deferCanvasRender = false } = options;
    const grid = document.getElementById('grid');
    const stage = document.getElementById('grid-stage');
    if (!grid || !stage) {
        return;
    }

    currentScale = clamp(currentScale, getMinScale(), MAX_SCALE);
    grid.style.transform = `scale(${currentScale})`;
    stage.style.width = `${grid.scrollWidth * currentScale}px`;
    stage.style.height = `${grid.scrollHeight * currentScale}px`;

    if (deferCanvasRender) {
        scheduleZoomRender();
        return;
    }

    flushZoomRender();
}

function refreshPopoverPosition() {
    if (activePopoverAnchor && isAnchorConnected(activePopoverAnchor)) {
        positionPopover(activePopoverAnchor);
    } else if (activePopoverAnchor) {
        hideModal();
    }
}

function bindWheelZoom(container) {
    container.addEventListener('wheel', e => {
        e.preventDefault();

        const previousScale = currentScale;

        const minScale = getMinScale();
        const nextScale = clamp(
            e.deltaY < 0 ? currentScale * ZOOM_FACTOR : currentScale / ZOOM_FACTOR,
            minScale,
            MAX_SCALE
        );

        if (nextScale === currentScale) {
            return;
        }

        const rect = container.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;
        const contentX = container.scrollLeft + pointerX;
        const contentY = container.scrollTop + pointerY;
        const worldX = contentX / currentScale;
        const worldY = contentY / currentScale;

        currentScale = nextScale;
        updateGridScale({ deferCanvasRender: true });

        container.scrollLeft = worldX * currentScale - pointerX;
        container.scrollTop = worldY * currentScale - pointerY;
        if (nextScale < previousScale) {
            prewarmVisibleCellSprites();
            queueCanvasRender();
        }
        refreshPopoverPosition();
    }, { passive: false });

    window.addEventListener('resize', () => {
        updateGridScale();
        refreshPopoverPosition();
    });
}

function setCellState(cell, nextState) {
    if (!cell) {
        return;
    }

    cell.state = nextState;
    cell.spriteKey = '';
    if (hoveredCellId === cell.id && !isCellHoverable(cell)) {
        setHoveredCellId('');
    }
    if (nextState !== 'hidden') {
        cell.edgeVisible = false;
        cell.edgeSides = {
            top: false,
            right: false,
            bottom: false,
            left: false
        };
    }

    scheduleSpritePrewarm(0);
    queueCanvasRender();
}

function createCell(task, coord) {
    const state = taskManager.getState(task.id) || 'incomplete';
    const nameLines = buildTaskNameLines(task.name, {
        maxCharsPerLine: 15,
        maxLines: 2
    });

    return {
        id: String(task.id),
        task,
        _task: task,
        __virtualAnchor: true,
        taskId: String(task.id),
        state,
        pixelX: GRID_SAFE_PADDING_X + (coord.x * CELL_STEP),
        pixelY: GRID_SAFE_PADDING_Y + (coord.y * CELL_STEP),
        nameLines,
        popAnimation: null,
        hoverProgress: 0,
        spriteCanvas: null,
        spriteKey: '',
        edgeVisible: false,
        edgeSides: {
            top: false,
            right: false,
            bottom: false,
            left: false
        },
        getBoundingClientRect() {
            return createCellAnchor(this).getBoundingClientRect();
        }
    };
}

function positionPopover(anchor) {
    const modal = document.getElementById('task-modal');
    const content = modal.querySelector('.modal-content');
    if (!anchor || !content || !modal.classList.contains('open')) {
        return;
    }

    const gap = 14;
    const pad = 12;
    const anchorRect = anchor.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();

    let top = anchorRect.bottom + gap;
    let side = 'bottom';
    if (top + contentRect.height > window.innerHeight - pad && anchorRect.top - gap - contentRect.height >= pad) {
        top = anchorRect.top - gap - contentRect.height;
        side = 'top';
    }

    top = clamp(top, pad, window.innerHeight - contentRect.height - pad);

    let left = anchorRect.left + (anchorRect.width / 2) - (contentRect.width / 2);
    left = clamp(left, pad, window.innerWidth - contentRect.width - pad);

    const arrowX = clamp(anchorRect.left + (anchorRect.width / 2) - left, 24, contentRect.width - 24);
    content.style.top = `${top}px`;
    content.style.left = `${left}px`;
    content.style.setProperty('--popover-arrow-x', `${arrowX}px`);
    modal.dataset.side = side;
}

function revealNeighborAsLocked(id) {
    taskManager.setState(id, 'locked');
    const cell = getCellById(id);
    if (!cell) {
        return;
    }

    setCellState(cell, 'locked');
    playPopReveal(cell);
}

function playPopReveal(cell, options = {}) {
    const { delay = 0, easing = 'linear' } = options;
    if (!cell) {
        return;
    }

    cell.popAnimation = {
        startTime: performance.now() + delay,
        easing
    };
    queueCanvasRender();
}

function refreshHiddenEdges(options = {}) {
    const {
        animate = false,
        center = null,
        revealDelayByCoord = null,
        edgeDelayOffset = EDGE_POP_OFFSET_MS,
        staggerMs = POP_STAGGER_MS,
        revealEasing = 'linear'
    } = options;
    const stateByCoord = new Map();
    const isFrontierState = state => state === 'incomplete' || state === 'locked';
    const newlyVisibleEdges = [];

    idToCoords.forEach((coord, id) => {
        stateByCoord.set(`${coord.x},${coord.y}`, taskManager.getState(id));
    });

    idToCoords.forEach((coord, id) => {
        const cell = getCellById(id);
        if (!cell) {
            return;
        }

        const state = stateByCoord.get(`${coord.x},${coord.y}`);
        const hadVisibleEdge = cell.edgeVisible;

        if (state !== 'hidden') {
            if (cell.edgeVisible || cell.edgeSides.top || cell.edgeSides.right || cell.edgeSides.bottom || cell.edgeSides.left) {
                cell.edgeVisible = false;
                cell.edgeSides = {
                    top: false,
                    right: false,
                    bottom: false,
                    left: false
                };
            }
            return;
        }

        let hasVisibleEdge = false;
        let minAdjacentDelay = Number.POSITIVE_INFINITY;
        const nextEdgeSides = {
            top: false,
            right: false,
            bottom: false,
            left: false
        };

        const noteAdjacentDelay = (x, y) => {
            if (!revealDelayByCoord) {
                return;
            }
            const delay = revealDelayByCoord.get(`${x},${y}`);
            if (typeof delay === 'number') {
                minAdjacentDelay = Math.min(minAdjacentDelay, delay);
            }
        };

        if (isFrontierState(stateByCoord.get(`${coord.x},${coord.y - 1}`))) {
            nextEdgeSides.top = true;
            hasVisibleEdge = true;
            noteAdjacentDelay(coord.x, coord.y - 1);
        }
        if (isFrontierState(stateByCoord.get(`${coord.x + 1},${coord.y}`))) {
            nextEdgeSides.right = true;
            hasVisibleEdge = true;
            noteAdjacentDelay(coord.x + 1, coord.y);
        }
        if (isFrontierState(stateByCoord.get(`${coord.x},${coord.y + 1}`))) {
            nextEdgeSides.bottom = true;
            hasVisibleEdge = true;
            noteAdjacentDelay(coord.x, coord.y + 1);
        }
        if (isFrontierState(stateByCoord.get(`${coord.x - 1},${coord.y}`))) {
            nextEdgeSides.left = true;
            hasVisibleEdge = true;
            noteAdjacentDelay(coord.x - 1, coord.y);
        }

        cell.edgeSides = nextEdgeSides;

        if (hasVisibleEdge) {
            if (animate && !hadVisibleEdge) {
                const hasTimedNeighbor = Number.isFinite(minAdjacentDelay);
                newlyVisibleEdges.push({
                    cell,
                    coord,
                    startDelay: hasTimedNeighbor ? minAdjacentDelay + edgeDelayOffset : edgeDelayOffset
                });
            } else {
                cell.edgeVisible = true;
            }
        } else {
            cell.edgeVisible = false;
        }
    });

    if (!animate || newlyVisibleEdges.length === 0) {
        queueCanvasRender();
        return;
    }

    const orderedEdges = center
        ? newlyVisibleEdges
            .slice()
            .sort((a, b) => {
                const distanceA = Math.abs(a.coord.x - center.x) + Math.abs(a.coord.y - center.y);
                const distanceB = Math.abs(b.coord.x - center.x) + Math.abs(b.coord.y - center.y);
                return distanceA - distanceB;
            })
        : newlyVisibleEdges;

    orderedEdges.forEach((item, index) => {
        const startDelay = Math.max(item.startDelay ?? edgeDelayOffset, index * staggerMs);
        setTimeout(() => {
            const cellId = item.cell.id;
            if (taskManager.getState(cellId) !== 'hidden') {
                return;
            }
            const stillHasEdgeSide =
                item.cell.edgeSides.top ||
                item.cell.edgeSides.right ||
                item.cell.edgeSides.bottom ||
                item.cell.edgeSides.left;
            if (!stillHasEdgeSide) {
                return;
            }
            item.cell.edgeVisible = true;
            playPopReveal(item.cell, { easing: revealEasing });
        }, startDelay);
    });

    queueCanvasRender();
}

function showModal(task, anchor) {
    const modal = document.getElementById('task-modal');
    const title = document.getElementById('modal-title');
    const image = document.getElementById('modal-image');
    const tip = document.getElementById('modal-tip');
    const wiki = document.getElementById('modal-wiki');
    const button = document.getElementById('modal-complete');
    const tierBadge = document.getElementById('modal-tier-badge');
    const cell = getCellById(task.id);
    const state = taskManager.getState(task.id) || 'incomplete';

    if (task.id === INTRO_TASK_ID) {
        title.textContent = 'Welcome to the Task Grid!';
        setImageWithFallback(image, INTRO_TASK_IMAGE, 'Task Grid');
        tip.innerHTML =
            'Complete randomly assigned OSRS collection log goals and work your way across the grid.<br><br>' +
            '<strong>Unlocking tasks:</strong> Locked tiles can be revealed by spending unlock slots. ' +
            'Complete tasks to earn more slots — the more you finish, the more you unlock.<br><br>' +
            '<strong>Wiki Sync:</strong> In RuneLite, enable the <em>Wiki Sync</em> plugin. ' +
            'Open your Collection Log in-game and click the Wiki Sync button. ' +
            'Then use the Wiki Sync button here to automatically mark completed tasks.';
        wiki.style.display = 'none';
        if (tierBadge) {
            tierBadge.style.display = 'none';
        }
        const itemsEl = document.getElementById('modal-items');
        const requiredEl = document.getElementById('modal-items-required');
        if (itemsEl) {
            itemsEl.innerHTML = '';
            itemsEl.classList.remove('is-scrollable');
            itemsEl.style.display = 'none';
        }
        if (requiredEl) {
            requiredEl.style.display = 'none';
            requiredEl.textContent = '';
        }
        if (state === 'incomplete') {
            button.type = 'button';
            button.disabled = false;
            button.textContent = "Let's go!";
            button.style.display = 'block';
            button.onclick = e => {
                e.preventDefault();
                taskManager.applyTaskCompletion(task);
                updateUnlockHud();
                refreshHiddenEdges({ animate: true });
                hideModal();
            };
        } else {
            button.style.display = 'none';
            button.disabled = false;
            button.onclick = null;
        }
        activePopoverAnchor = anchor || cell;
        modal.classList.add('open');
        requestAnimationFrame(() => {
            refreshPopoverPosition();
        });
        return;
    }

    if (state === 'locked') {
        title.textContent = 'Locked Task';
        setImageWithFallback(image, LOCKED_TILE_IMAGE, 'Locked task');
        tip.textContent = 'Unlock this tile to reveal what task is here.';
        wiki.style.display = 'none';
    } else {
        title.textContent = task.name;
        setImageWithFallback(image, task.imageLink, task.name);
        tip.textContent = task.tip || '';
        wiki.href = task.wikiLink || '#';
        wiki.style.display = 'inline-block';
    }

    if (state === 'incomplete') {
        button.type = 'button';
        button.disabled = false;
        button.textContent = 'Mark complete';
        button.style.display = 'block';
        button.onclick = e => {
            e.preventDefault();
            const previousLimit = taskManager.getUnlockLimit();
            taskManager.applyTaskCompletion(task);
            updateUnlockHud();
            refreshHiddenEdges({ animate: true });
            const nextLimit = taskManager.getUnlockLimit();
            if (nextLimit > previousLimit) {
                showUnlockToast(nextLimit);
            }
            hideModal();
        };
    } else if (state === 'locked') {
        const unlockLimit = taskManager.getUnlockLimit();
        const unlockedCount = taskManager.getUnlockedCount();
        const unlockAvailable = taskManager.canUnlockMore();

        button.type = 'button';
        button.style.display = 'block';
        button.disabled = !unlockAvailable;
        button.textContent = unlockAvailable
            ? `Unlock task (${unlockedCount}/${unlockLimit})`
            : `Unlock limit reached (${unlockedCount}/${unlockLimit})`;
        button.onclick = unlockAvailable ? e => {
            e.preventDefault();
            taskManager.setState(task.id, 'incomplete');
            if (cell) {
                setCellState(cell, 'incomplete');
            }

            const unlockedTask = taskVerification.alignUnlockedTaskToLowestSeriesTask(task);

            updateUnlockHud();
            refreshHiddenEdges({ animate: true });

            hideModal();
            requestAnimationFrame(() => {
                const unlockedTaskId = String(unlockedTask?.id || task.id);
                const unlockedCell = getCellById(unlockedTaskId);
                if (!unlockedCell || taskManager.getState(unlockedTaskId) !== 'incomplete') {
                    return;
                }

                showModal(unlockedCell.task, createCellAnchor(unlockedCell));
            });
        } : null;
    } else {
        button.style.display = 'none';
        button.disabled = false;
        button.onclick = null;
    }

    if (tierBadge) {
        const tier = task.tier || '';
        const shouldHideTierBadge = hideTierHintOnLocked && state === 'locked';
        if (tier && !shouldHideTierBadge) {
            const bgColor = getTierColor(tier);
            const textColor = getReadableTextColor(bgColor);
            tierBadge.textContent = formatTierName(tier) || 'Unknown';
            tierBadge.style.background = bgColor;
            tierBadge.style.color = textColor;
            tierBadge.style.display = 'inline-block';
        } else {
            tierBadge.style.display = 'none';
        }
    }

    const itemsEl = document.getElementById('modal-items');
    const requiredEl = document.getElementById('modal-items-required');
    if (itemsEl) {
        const isLockedState = state === 'locked';
        const itemIds = !isLockedState ? taskVerification.getTaskVerificationItemIds(task) : [];
        const skillRequirements = !isLockedState ? taskVerification.getTaskSkillExperienceRequirements(task) : [];
        itemsEl.innerHTML = '';
        if (itemIds.length > 0) {
            const requiredItems = taskVerification.getTaskRequiredCount(task);
            const obtainedItemCount = taskVerification.getTaskObtainedCount(task);
            const obtainedForTask = Math.min(obtainedItemCount, requiredItems);

            if (requiredEl) {
                requiredEl.textContent = `Obtained ${obtainedForTask}/${requiredItems} required for task`;
                requiredEl.style.display = 'block';
            }

            itemsEl.classList.toggle('is-scrollable', itemIds.length > 20);
            itemIds.forEach(id => {
                const numericId = Number(id);
                const isObtained = playerProgress.hasObtainedItem(numericId);
                const info = collectionLogMap.get(numericId);
                const link = document.createElement('a');
                link.href = info ? info.wikiLink : '#';
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.title = info ? `${info.name}${info.category ? ` (${info.category})` : ''}` : `Item ID: ${id}`;
                link.className = 'modal-item-icon';
                link.classList.add(isObtained ? 'is-obtained' : 'is-missing');
                const img = document.createElement('img');
                img.width = 32;
                img.height = 32;
                img.loading = 'lazy';
                img.decoding = 'async';
                if (info) {
                    setImageWithFallback(img, info.imageUrl, info.name);
                } else {
                    setImageWithFallback(img, QUESTION_MARK_ICON, `Item ${id}`);
                }
                link.appendChild(img);
                itemsEl.appendChild(link);
            });
            itemsEl.style.display = 'grid';
        } else if (skillRequirements.length > 0) {
            const requiredItems = taskVerification.getTaskRequiredCount(task);
            const obtainedSkillCount = taskVerification.getTaskObtainedCount(task);
            const obtainedForTask = Math.min(obtainedSkillCount, requiredItems);
            const requiredLevels = skillRequirements
                .map(requirement => taskVerification.getRequiredSkillLevelForRequirement(requirement))
                .filter(level => Number.isFinite(level));
            const uniformRequiredLevel = requiredLevels.length > 0 && requiredLevels.every(level => level === requiredLevels[0])
                ? requiredLevels[0]
                : null;

            if (requiredEl) {
                requiredEl.textContent = uniformRequiredLevel
                    ? `Skills at level ${uniformRequiredLevel}: ${obtainedForTask}/${requiredItems}`
                    : `Skills at required levels: ${obtainedForTask}/${requiredItems}`;
                requiredEl.style.display = 'block';
            }

            const sortedRequirements = skillRequirements
                .slice()
                .sort((requirementA, requirementB) => {
                    const requiredLevelDelta = taskVerification.getRequiredSkillLevelForRequirement(requirementA) - taskVerification.getRequiredSkillLevelForRequirement(requirementB);
                    if (requiredLevelDelta !== 0) {
                        return requiredLevelDelta;
                    }

                    return formatSkillName(requirementA.skillName).localeCompare(formatSkillName(requirementB.skillName));
                });

            itemsEl.classList.toggle('is-scrollable', sortedRequirements.length > 20);
            sortedRequirements.forEach(requirement => {
                const skillName = formatSkillName(requirement.skillName);
                const requiredLevel = taskVerification.getRequiredSkillLevelForRequirement(requirement);
                const playerLevel = playerProgress.getSkillLevel(requirement.skillName);
                const normalizedLevel = Number.isFinite(playerLevel) ? Math.floor(playerLevel) : 0;
                const isObtained = playerProgress.isSkillRequirementMet(requirement, requiredLevel);
                const link = document.createElement('a');
                link.href = `https://oldschool.runescape.wiki/w/${encodeURIComponent(skillName.replace(/ /g, '_'))}`;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.title = `${skillName}: lvl ${normalizedLevel}/${requiredLevel}`;
                link.className = 'modal-item-icon';
                link.classList.add(isObtained ? 'is-obtained' : 'is-missing');

                const img = document.createElement('img');
                img.width = 32;
                img.height = 32;
                img.loading = 'lazy';
                img.decoding = 'async';
                setImageWithFallback(img, getSkillBadgeIcon(requirement.skillName, isObtained), skillName);

                link.appendChild(img);
                itemsEl.appendChild(link);
            });
            itemsEl.style.display = 'grid';
        } else {
            if (requiredEl) {
                requiredEl.style.display = 'none';
                requiredEl.textContent = '';
            }
            itemsEl.classList.remove('is-scrollable');
            itemsEl.style.display = 'none';
        }
    }

    activePopoverAnchor = anchor || cell;
    modal.classList.add('open');
    requestAnimationFrame(() => {
        refreshPopoverPosition();
    });
}

function hideModal() {
    const modal = document.getElementById('task-modal');
    modal.classList.remove('open');
    activePopoverAnchor = null;
}

let unlockToastTimer = null;

function showUnlockToast(newLimit) {
    const toast = document.getElementById('unlock-toast');
    const slots = document.getElementById('unlock-toast-slots');
    if (!toast || !slots) {
        return;
    }

    slots.textContent = newLimit;

    if (unlockToastTimer) {
        clearTimeout(unlockToastTimer);
        unlockToastTimer = null;
    }

    toast.classList.remove('leaving');
    // force reflow so transition plays even if already visible
    void toast.offsetWidth;
    toast.classList.add('visible');

    unlockToastTimer = setTimeout(() => {
        toast.classList.add('leaving');
        setTimeout(() => toast.classList.remove('visible', 'leaving'), 350);
        unlockToastTimer = null;
    }, UNLOCK_TOAST_DURATION_MS);
}

function render(tasks) {
    const grid = document.getElementById('grid');
    if (!grid) {
        return;
    }

    hideModal();
    hoveredCellId = '';
    if (gridCanvas) {
        gridCanvas.style.cursor = 'default';
    }
    grid.innerHTML = '';
    idToCell.clear();
    coordToTaskId.clear();

    const { size, coords, center } = gridModel.updateTaskCoordinates(tasks);
    gridCellCount = size;
    const canvas = ensureGridCanvas();
    if (!canvas || !gridContext) {
        return;
    }

    const gridCoreSize = Math.max(1, (size * CELL_SIZE) + ((size - 1) * CELL_GAP));
    gridPixelWidth = gridCoreSize + (GRID_SAFE_PADDING_X * 2);
    gridPixelHeight = gridCoreSize + (GRID_SAFE_PADDING_Y * 2);

    grid.style.width = `${gridPixelWidth}px`;
    grid.style.height = `${gridPixelHeight}px`;
    syncCanvasResolution();

    const cells = [];

    tasks.forEach((task, index) => {
        const [x, y] = coords[index];
        const cell = createCell(task, { x, y });
        idToCell.set(String(task.id), cell);
        coordToTaskId.set(`${x},${y}`, String(task.id));
        cells.push({ cell, x, y });
    });

    const visibleCells = cells.filter(item => taskManager.getState(item.cell.id) !== 'hidden');
    const sortedVisibleCells = visibleCells
        .sort((a, b) => {
            const distanceA = Math.abs(a.x - center.x) + Math.abs(a.y - center.y);
            const distanceB = Math.abs(b.x - center.x) + Math.abs(b.y - center.y);
            return distanceA - distanceB;
        });
    const revealStagger = sortedVisibleCells.length * POP_STAGGER_MS > INITIAL_REVEAL_DURATION_MS
        ? INITIAL_REVEAL_DURATION_MS / (sortedVisibleCells.length - 1)
        : POP_STAGGER_MS;
    const revealDelayByCoord = new Map();

    sortedVisibleCells.forEach((item, index) => {
        const revealDelay = INITIAL_REVEAL_DELAY_MS + (index * revealStagger);
        revealDelayByCoord.set(`${item.x},${item.y}`, revealDelay);
        playPopReveal(item.cell, { delay: revealDelay, easing: 'ease-in' });
    });

    refreshHiddenEdges({ animate: true, center, revealDelayByCoord, staggerMs: revealStagger, revealEasing: 'ease-in' });
    updateGridScale();
    updateUnlockHud();
    scheduleSpritePrewarm(0);
    queueCanvasRender();

    if (tasks.length > 0) {
        taskPanels.centerTaskInView(tasks[0].id, { smooth: false });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('task-modal');
    const tierTasksModal = document.getElementById('tier-tasks-modal');
    const close = modal.querySelector('.modal-close');
    const tierTasksClose = document.getElementById('tier-tasks-close');
    const tierProgressButton = document.getElementById('tier-progress-button');
    const currentTasksButton = document.getElementById('current-tasks-button');

    initThemeToggle();
    initOptionsMenu();

    close.addEventListener('click', hideModal);

    if (tierTasksClose) {
        tierTasksClose.addEventListener('click', () => taskPanels.hideTierTasksModal());
    }

    if (tierProgressButton) {
        tierProgressButton.addEventListener('click', () => {
            taskPanels.closeCurrentTasksPopover();
            taskPanels.showTierTasksModal();
        });
    }

    if (currentTasksButton) {
        currentTasksButton.addEventListener('click', e => {
            e.preventDefault();
            taskPanels.hideTierTasksModal();
            taskPanels.toggleCurrentTasksPopover();
        });
    }

    const toastClose = document.querySelector('.unlock-toast-close');
    if (toastClose) {
        toastClose.addEventListener('click', () => {
            const toast = document.getElementById('unlock-toast');
            if (unlockToastTimer) {
                clearTimeout(unlockToastTimer);
                unlockToastTimer = null;
            }
            toast.classList.add('leaving');
            setTimeout(() => toast.classList.remove('visible', 'leaving'), 350);
        });
    }

    document.addEventListener('mousedown', e => {
        const clickedPopover = e.target.closest('#task-modal .modal-content');
        if (modal.classList.contains('open') && !clickedPopover) {
            hideModal();
        }

        const clickedTierPopover = e.target.closest('#tier-tasks-modal .modal-content');
        const clickedTierButton = e.target.closest('#tier-progress-button');
        if (tierTasksModal?.classList.contains('open') && !clickedTierPopover && !clickedTierButton) {
            taskPanels.hideTierTasksModal();
        }

        const currentTasksWrap = document.getElementById('current-tasks-wrap');
        if (currentTasksWrap && !currentTasksWrap.contains(e.target)) {
            taskPanels.closeCurrentTasksPopover();
        }

        const optionsWrap = document.getElementById('options-wrap');
        if (optionsWrap && !optionsWrap.contains(e.target)) {
            closeOptionsPopover();
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            hideModal();
            taskPanels.hideTierTasksModal();
            taskPanels.closeCurrentTasksPopover();
            closeOptionsPopover();
        }
    });

    const syncButton = document.getElementById('sync-button');
    if (syncButton) {
        syncButton.addEventListener('click', async () => {
            if (syncButtonStatusTimer) {
                clearTimeout(syncButtonStatusTimer);
                syncButtonStatusTimer = null;
            }

            syncButton.disabled = true;
            syncButton.textContent = 'Wiki syncing...';

            try {
                const completedCount = await syncPlayerProgress();
                syncButton.disabled = false;
                syncButton.textContent = completedCount === 1
                    ? 'Wiki synced 1 task'
                    : `Wiki synced ${completedCount} tasks`;
                syncButtonStatusTimer = setTimeout(() => {
                    syncButton.textContent = 'Wiki Sync';
                    syncButtonStatusTimer = null;
                }, SYNC_DURATION_MS);
            } catch {
                syncButton.disabled = false;
                syncButton.textContent = 'Wiki sync failed';
                syncButtonStatusTimer = setTimeout(() => {
                    syncButton.textContent = 'Wiki Sync';
                    syncButtonStatusTimer = null;
                }, SYNC_DURATION_MS);
            }
        });
    }
});

const tierWeights = {
    easy: 50000,
    medium: 10000,
    hard: 1000,
    elite: 500,
    master: 100,
    'master-tedious': 100,
    extra: 100,
    pets: 100
};

async function preloadTaskImages(tasks) {
    const sources = new Set([LOCKED_TILE_IMAGE, QUESTION_MARK_ICON]);

    tasks.forEach(task => {
        const state = taskManager.getState(task.id);
        if (state === 'incomplete' || state === 'complete' || state === 'locked') {
            sources.add(task.imageLink);
        }
    });

    await Promise.all(Array.from(sources).map(source => new Promise(resolve => {
        const asset = getImageAsset(source);
        const decodeReadyImage = async () => {
            if (asset.status === 'ready' && typeof asset.image?.decode === 'function') {
                try {
                    await asset.image.decode();
                } catch {
                    // ignore decode failures; draw path still handles ready/error states
                }
            }

            resolve();
        };

        if (asset.status === 'ready' || asset.status === 'error') {
            void decodeReadyImage();
            return;
        }

        const onDone = () => {
            asset.image.removeEventListener('load', onDone);
            asset.image.removeEventListener('error', onDone);
            void decodeReadyImage();
        };
        asset.image.addEventListener('load', onDone);
        asset.image.addEventListener('error', onDone);
    })));
}

function waitForAnimationFrames(frameCount = 1) {
    const totalFrames = Math.max(1, Math.floor(frameCount));
    return new Promise(resolve => {
        let remaining = totalFrames;
        const onFrame = () => {
            remaining -= 1;
            if (remaining <= 0) {
                resolve();
                return;
            }

            requestAnimationFrame(onFrame);
        };

        requestAnimationFrame(onFrame);
    });
}

async function prewarmInitialCanvasSprites() {
    prewarmVisibleCellSprites();
    queueCanvasRender();
    await waitForAnimationFrames(2);
}

function startApp() {
    const loader = document.getElementById('loading');
    if (loader) {
        loader.style.display = 'flex';
    }

    const loadingIcons = Array.from(document.querySelectorAll('#loading .loading-icon'));
    loadingIcons.forEach(icon => icon.classList.remove('visible'));
    loadingIcons.forEach(icon => bindImageErrorFallback(icon));

    Promise.all([taskOrderManager.loadAllTierData(), wiki.loadCollectionLogItems(), wiki.loadPlayerData(playerUsername)]).then(([data, _, playerSnapshot]) => {
    if (playerSnapshot) {
        playerProgress.applySnapshot(playerSnapshot);
    }

    const currentTasks = taskManager.buildTasksFromTierData(data);
    let all = [];
    let taskListChanged = false;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const ids = JSON.parse(saved);
            if (!Array.isArray(ids)) {
                throw new Error('saved order must be an array');
            }

            const mergedOrder = taskOrderManager.mergeSavedTaskOrder(ids, currentTasks);
            all = mergedOrder.tasks;
            taskListChanged = mergedOrder.taskListChanged;
        } catch (error) {
            console.error('corrupt saved order', error);
        }
    }

    const freshOrder = all.length === 0;
    if (freshOrder) {
        all = taskOrderManager.buildWeightedTaskOrder(currentTasks);
    }

    // Ensure the intro tile is always at position 0, regardless of saved order or fresh shuffle.
    const introIdx = all.findIndex(task => task.id === INTRO_TASK_ID);
    if (introIdx < 0) {
        all.unshift(INTRO_TASK);
    } else if (introIdx !== 0) {
        all.splice(introIdx, 1);
        all.unshift(INTRO_TASK);
    }

    all.forEach(task => {
        if (!taskManager.getState(task.id)) {
            taskManager.setState(task.id, task.id === INTRO_TASK_ID ? 'incomplete' : 'hidden');
        }
    });

    if (freshOrder && all.length > 0) {
        all.forEach((task, index) => {
            taskManager.setState(task.id, index === 0 ? 'incomplete' : 'hidden');
        });
        stateMap = loadStates();
    }

    all = taskManager.setTasks(all);
    applyTierFilters(selectedTierFilters, { persist: false, rerender: false });
    gridModel.updateTaskCoordinates(all);

    if (!freshOrder && taskListChanged) {
        taskOrderManager.rebuildHiddenAndLockedStatesFromProgress(all);
    }

    taskManager.normalizeUnlockStates();
    updateUnlockHud();

    const loadingIcons = Array.from(document.querySelectorAll('#loading .loading-icon'));
    loadingIcons.forEach(icon => {
        const image = new Image();
        image.src = icon.src;
    });

    const preloadPromise = preloadTaskImages(all);

    function animateIcons(index) {
        if (index >= loadingIcons.length) {
            const finish = async () => {
                await Promise.all([preloadPromise, wait(500)]);
                render(all);
                await prewarmInitialCanvasSprites();

                const loader = document.getElementById('loading');
                if (loader) {
                    loader.style.display = 'none';
                }
            };

            finish().catch(() => {
                render(all);
                const fallbackLoader = document.getElementById('loading');
                if (fallbackLoader) {
                    fallbackLoader.style.display = 'none';
                }
            });
            return;
        }

        const icon = loadingIcons[index];
        icon.classList.add('visible');
        setTimeout(() => {
            animateIcons(index + 1);
        }, 400);
    }

    animateIcons(0);

    taskOrderManager.saveTaskGridOrder(all);

    const container = document.getElementById('grid-container');
    let isPointerDown = false;
    let isDragging = false;
    let dragButton = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let lastX = 0;
    let lastY = 0;

    bindWheelZoom(container);

    container.addEventListener('scroll', () => {
        if (!isZooming) {
            queueCanvasRender();
        }
        refreshPopoverPosition();
    }, { passive: true });

    container.addEventListener('mousedown', e => {
        if (e.button === 0 || e.button === 1) {
            isPointerDown = true;
            isDragging = false;
            dragButton = e.button;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            lastX = e.clientX;
            lastY = e.clientY;
            e.preventDefault();
        }
    });

    window.addEventListener('mousemove', e => {
        if (!isPointerDown) {
            return;
        }

        const totalDx = e.clientX - dragStartX;
        const totalDy = e.clientY - dragStartY;
        if (!isDragging && Math.hypot(totalDx, totalDy) >= DRAG_THRESHOLD) {
            isDragging = true;
        }

        if (isDragging) {
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            container.scrollLeft -= dx;
            container.scrollTop -= dy;
            lastX = e.clientX;
            lastY = e.clientY;
            refreshPopoverPosition();
            e.preventDefault();
        }
    });

    window.addEventListener('mouseup', e => {
        if (isPointerDown && e.button === dragButton) {
            if (dragButton === 0 && isDragging) {
                suppressTaskClick = true;
                setTimeout(() => {
                    suppressTaskClick = false;
                }, 0);
            }

            isPointerDown = false;
            isDragging = false;
            dragButton = null;
            e.preventDefault();
        }
    });
    }).catch(err => console.error(err));
}

function initUsernameGate() {
    const gate = document.getElementById('username-gate');
    const form = document.getElementById('username-form');
    const input = document.getElementById('username-input');
    const submit = document.getElementById('username-submit');
    const error = document.getElementById('username-error');

    const startWithUsername = username => {
        playerUsername = normalizeUsername(username);
        try {
            localStorage.setItem(USERNAME_KEY, playerUsername);
        } catch {
            // ignore localStorage failures
        }

        if (gate) {
            gate.style.display = 'none';
        }

        if (!hasStartedApp) {
            hasStartedApp = true;
            startApp();
        }
    };

    const savedUsername = normalizeUsername(localStorage.getItem(USERNAME_KEY));
    if (savedUsername) {
        startWithUsername(savedUsername);
        return;
    }

    if (!gate || !form || !input || !submit || !error) {
        if (!hasStartedApp) {
            hasStartedApp = true;
            startApp();
        }
        return;
    }

    gate.style.display = 'flex';
    input.focus();

    form.addEventListener('submit', e => {
        e.preventDefault();
        const username = normalizeUsername(input.value);
        if (!username) {
            error.textContent = 'Please enter a username.';
            return;
        }

        error.textContent = '';
        submit.disabled = true;
        startWithUsername(username);
    });
}

initUsernameGate();