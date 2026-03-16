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
const APP_SETTINGS_STORAGE_KEY = 'appSettings';
const COMPLETE_OPACITY_KEY = 'completeCellOpacity';
const HIDE_TIER_HINT_KEY = 'hideTierHintOnLocked';
const TIER_FILTER_KEY = 'tierFilters';
const AUTO_WIKI_TOAST_ENABLED_KEY = 'autoWikiToastEnabled';
const AUTO_WIKI_TOAST_ACK_COUNT_KEY = 'autoWikiToastAcknowledgedCount';
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

const idToCell = new Map();

class CoreUtils {
    static getCellById(id) {
        return idToCell.get(String(id)) || null;
    }

    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static normalizeTheme(value) {
        const normalized = String(value || '').trim().toLowerCase();
        return THEMES.has(normalized) ? normalized : 'osrs';
    }

    static normalizeCompleteOpacity(value) {
        const parsed = Number.parseFloat(String(value ?? ''));
        if (!Number.isFinite(parsed)) {
            return DEFAULT_COMPLETE_CELL_OPACITY;
        }

        return this.clamp(parsed, MIN_COMPLETE_CELL_OPACITY, MAX_COMPLETE_CELL_OPACITY);
    }

    static normalizeTierHintSetting(value) {
        return value === true || value === 'true' || value === '1';
    }

    static normalizeTierFilterSelection(value) {
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

    static loadStates() {
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

    static saveStates(map) {
        try {
            localStorage.setItem(STATE_KEY, JSON.stringify(map));
        } catch {
            // ignore localStorage failures
        }
    }

    static loadAppSettings() {
        try {
            const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
            if (!raw) {
                return {};
            }

            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return {};
            }

            return parsed;
        } catch {
            return {};
        }
    }

    static saveAppSettings(settings) {
        try {
            localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings || {}));
        } catch {
            // ignore localStorage failures
        }
    }
}

let suppressTaskClick = false;
let tasksGlobal = [];
let currentScale = 1;
let activePopoverAnchor = null;
let stateMap = CoreUtils.loadStates();
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
let autoWikiToastEnabled = true;
let autoWikiToastAcknowledgedCount = 0;

let appSettings = CoreUtils.loadAppSettings();
const hasAppSetting = key => Object.prototype.hasOwnProperty.call(appSettings, key);
const persistAppSettings = () => {
    CoreUtils.saveAppSettings(appSettings);
};

try {
    const rawCompleteOpacity = hasAppSetting(COMPLETE_OPACITY_KEY)
        ? appSettings[COMPLETE_OPACITY_KEY]
        : localStorage.getItem(COMPLETE_OPACITY_KEY);
    completeCellOpacity = CoreUtils.normalizeCompleteOpacity(rawCompleteOpacity);
} catch {
    completeCellOpacity = DEFAULT_COMPLETE_CELL_OPACITY;
}
appSettings[COMPLETE_OPACITY_KEY] = completeCellOpacity;

try {
    const rawHideTierHint = hasAppSetting(HIDE_TIER_HINT_KEY)
        ? appSettings[HIDE_TIER_HINT_KEY]
        : localStorage.getItem(HIDE_TIER_HINT_KEY);
    hideTierHintOnLocked = CoreUtils.normalizeTierHintSetting(rawHideTierHint);
} catch {
    hideTierHintOnLocked = false;
}
appSettings[HIDE_TIER_HINT_KEY] = hideTierHintOnLocked;

try {
    const rawTierFilters = hasAppSetting(TIER_FILTER_KEY)
        ? appSettings[TIER_FILTER_KEY]
        : localStorage.getItem(TIER_FILTER_KEY);
    selectedTierFilters = CoreUtils.normalizeTierFilterSelection(rawTierFilters);
} catch {
    selectedTierFilters = new Set();
}
appSettings[TIER_FILTER_KEY] = Array.from(selectedTierFilters);

try {
    const rawTheme = hasAppSetting(THEME_KEY)
        ? appSettings[THEME_KEY]
        : localStorage.getItem(THEME_KEY);
    activeTheme = CoreUtils.normalizeTheme(rawTheme);
} catch {
    activeTheme = 'osrs';
}
appSettings[THEME_KEY] = activeTheme;

try {
    const rawAutoWikiToastSetting = hasAppSetting(AUTO_WIKI_TOAST_ENABLED_KEY)
        ? appSettings[AUTO_WIKI_TOAST_ENABLED_KEY]
        : localStorage.getItem(AUTO_WIKI_TOAST_ENABLED_KEY);
    autoWikiToastEnabled = rawAutoWikiToastSetting === null
        ? true
        : CoreUtils.normalizeTierHintSetting(rawAutoWikiToastSetting);
} catch {
    autoWikiToastEnabled = true;
}
appSettings[AUTO_WIKI_TOAST_ENABLED_KEY] = autoWikiToastEnabled;

try {
    const rawAcknowledgedCount = hasAppSetting(AUTO_WIKI_TOAST_ACK_COUNT_KEY)
        ? appSettings[AUTO_WIKI_TOAST_ACK_COUNT_KEY]
        : localStorage.getItem(AUTO_WIKI_TOAST_ACK_COUNT_KEY);
    const parsedAcknowledgedCount = Number.parseInt(String(rawAcknowledgedCount ?? ''), 10);
    autoWikiToastAcknowledgedCount = Number.isFinite(parsedAcknowledgedCount) && parsedAcknowledgedCount >= 0
        ? parsedAcknowledgedCount
        : 0;
} catch {
    autoWikiToastAcknowledgedCount = 0;
}
appSettings[AUTO_WIKI_TOAST_ACK_COUNT_KEY] = autoWikiToastAcknowledgedCount;

persistAppSettings();

if (typeof document !== 'undefined' && document.body) {
    document.body.dataset.theme = activeTheme;
}

if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.style.setProperty('--state-complete-opacity', String(completeCellOpacity));
}

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

class TaskManager {
    constructor() {
        this.tasks = [];
        this.statePersistenceBatchDepth = 0;
        this.hasPendingStatePersist = false;
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

    beginStatePersistenceBatch() {
        this.statePersistenceBatchDepth += 1;
    }

    endStatePersistenceBatch() {
        if (this.statePersistenceBatchDepth > 0) {
            this.statePersistenceBatchDepth -= 1;
        }

        if (this.statePersistenceBatchDepth === 0) {
            this.flushStatePersistence();
        }
    }

    flushStatePersistence() {
        if (!this.hasPendingStatePersist) {
            return;
        }

        CoreUtils.saveStates(stateMap);
        this.hasPendingStatePersist = false;
    }

    setState(id, state, options = {}) {
        const { persist = true } = options;
        const taskId = String(id);

        if (stateMap[taskId] === state) {
            return false;
        }

        stateMap[taskId] = state;

        if (!persist || this.statePersistenceBatchDepth > 0) {
            this.hasPendingStatePersist = true;
            return true;
        }

        CoreUtils.saveStates(stateMap);
        return true;
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
            const cell = CoreUtils.getCellById(task.id);
            if (cell) {
                gridSceneManager.setCellState(cell, 'locked');
            }
        });
    }

    revealTaskNeighbors(taskId, options = {}) {
        const { animateNeighborReveal = true } = options;
        const neighbors = gridManager.getTaskNeighbors(taskId);

        neighbors.forEach((id) => {
            if (this.getState(id) === 'hidden') {
                gridSceneManager.revealNeighborAsLocked(id, { animate: animateNeighborReveal });
            }
        });
    }

    applyTaskCompletion(task, options = {}) {
        const { animateNeighborReveal = true } = options;
        this.setState(task.id, 'complete');
        const cell = CoreUtils.getCellById(task.id);
        if (cell) {
            gridSceneManager.setCellState(cell, 'complete');
        }
        this.revealTaskNeighbors(task.id, { animateNeighborReveal });
    }

    revealFrontierFromCompletedTasks(options = {}) {
        const { animateNeighborReveal = true } = options;
        this.getTaskList().forEach(task => {
            if (this.getState(task.id) === 'complete') {
                this.revealTaskNeighbors(task.id, { animateNeighborReveal });
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
                const experience = gameDataUtils.levelToExperience(level);
                if (Number.isFinite(experience) && experience >= 0) {
                    skillExperienceBySkill.set(skillName, experience);
                }
            }
        });

        skillExperienceBySkill.forEach((experience, skillName) => {
            if (!Number.isFinite(skillLevelBySkill.get(skillName))) {
                const level = gameDataUtils.experienceToLevel(experience);
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
        const normalizedSkill = gameDataUtils.normalizeSkillName(skillName);
        if (!normalizedSkill) {
            return Number.NaN;
        }

        const storedLevel = this.skillLevelBySkill.get(normalizedSkill);
        if (Number.isFinite(storedLevel) && storedLevel >= 1) {
            return Math.floor(storedLevel);
        }

        const experience = this.skillExperienceBySkill.get(normalizedSkill);
        const derivedLevel = gameDataUtils.experienceToLevel(experience);
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

        return this.completedAchievementDiaryKeys.has(gameDataUtils.getAchievementDiaryKey(region, difficulty));
    }

    isSkillRequirementMet(requirement, requiredLevel = Number.NaN) {
        const resolvedRequiredLevel = Number.isFinite(requiredLevel)
            ? requiredLevel
            : (() => {
                const computedLevel = gameDataUtils.experienceToLevel(requirement?.requiredExperience);
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

        const levelExperience = gameDataUtils.levelToExperience(skillData.level);
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

        const experienceLevel = gameDataUtils.experienceToLevel(this.getSkillExperienceValue(skillData));
        if (Number.isFinite(experienceLevel) && experienceLevel >= 1) {
            return experienceLevel;
        }

        return Number.NaN;
    }

    addSkillExperienceEntry(targetMap, rawSkillName, skillData) {
        const skillName = gameDataUtils.normalizeSkillName(rawSkillName);
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
        const skillName = gameDataUtils.normalizeSkillName(rawSkillName);
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
            const region = gameDataUtils.normalizeAchievementDiaryRegion(rawRegion);
            if (!region || !regionData || typeof regionData !== 'object') {
                return;
            }

            Object.entries(regionData).forEach(([rawDifficulty, difficultyData]) => {
                const difficulty = gameDataUtils.normalizeAchievementDiaryDifficulty(rawDifficulty);
                if (!difficulty || !difficultyData || typeof difficultyData !== 'object') {
                    return;
                }

                if (difficultyData.complete === true) {
                    completedKeys.add(gameDataUtils.getAchievementDiaryKey(region, difficulty));
                }
            });
        });

        return completedKeys;
    }

    buildCollectionLogEntry(name, category, imageUrl) {
        const encoded = encodeURIComponent(name.replace(/ /g, '_'));
        return {
            name,
            category,
            wikiLink: `https://oldschool.runescape.wiki/w/${encoded}`,
            imageUrl,
        };
    }

    setCollectionLogItems(items = []) {
        this.collectionLogMap.clear();
        items.forEach(item => {
            const numericId = Number(item.id);
            const itemId = Number.isFinite(numericId) ? numericId : item.id;
            this.collectionLogMap.set(itemId, this.buildCollectionLogEntry(item.name, item.category, item.image));
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
            const url = 'https://oldschool.runescape.wiki/api.php?action=parse&page=Collection_log/Table&prop=text&format=json&origin=*';

            const resp = await fetch(url);
            const json = await resp.json();
            const html = json.parse.text['*'];

            // Parse HTML string into a DOM
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Find the collection log table
            const table = doc.querySelector('table.wikitable');
            if (!table) {
                console.warn('No collection log table found');
                return;
            }

            const cacheData = [];

            const rows = table.querySelectorAll('tr');
            rows.forEach((row, i) => {
                if (i === 0) return; // skip header

                const cells = row.querySelectorAll('td');
                if (cells.length < 2) return;

                const nameLink = cells[0].querySelector('a[title]');
                const name = nameLink ? nameLink.getAttribute('title').trim() : cells[0].textContent.trim();

                const id = row.getAttribute('data-item-id');
                if (!id) return;

                const category = cells[1].textContent.trim();

                const img = cells[0].querySelector('img');
                const image = img ? `https://oldschool.runescape.wiki${img.getAttribute('src')}` : null;

                cacheData.push({
                    id: parseInt(id, 10),
                    name,
                    category,
                    image
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

    normalizeUsername(value) {
        return (value || '').trim().replace(/\s+/g, ' ');
    }

    toSyncUsername(value) {
        return this.normalizeUsername(value).replace(/\W/g, '_');
    }

    getPlayerCacheKey(username) {
        return `${PLAYER_CL_CACHE_PREFIX}:${this.normalizeUsername(username).toLowerCase()}`;
    }

    async loadPlayerData(username, options = {}) {
        const { forceRefresh = false } = options;
        const normalized = this.normalizeUsername(username);
        if (!normalized) {
            return {
                obtainedItemIds: new Set(),
                completedAchievementDiaryKeys: new Set(),
                playerSkillExperienceBySkill: new Map(),
                playerSkillLevelBySkill: new Map()
            };
        }

        const cacheKey = this.getPlayerCacheKey(normalized);
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
            const syncName = encodeURIComponent(this.toSyncUsername(normalized));
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
                const skillName = gameDataUtils.normalizeSkillName(rawSkillName);
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
        const requiredLevel = gameDataUtils.experienceToLevel(requirement?.requiredExperience);
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
                ? CoreUtils.clamp(Math.floor(rawRequired), 1, requirements.length)
                : requirements.length;
        }

        const totalItems = this.getTaskVerificationItemIds(task).length;
        if (totalItems === 0) {
            return 0;
        }

        const rawRequired = task?.verification?.count;
        return Number.isFinite(rawRequired)
            ? CoreUtils.clamp(Math.floor(rawRequired), 1, totalItems)
            : totalItems;
    }

    getTaskObtainedCount(task) {
        if (task?.verification?.method === 'achievement-diary') {
            const region = gameDataUtils.normalizeAchievementDiaryRegion(task?.verification?.region);
            const difficulty = gameDataUtils.normalizeAchievementDiaryDifficulty(task?.verification?.difficulty);
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
            const sortA = tierUtils.getTierSortIndex(a.tier);
            const sortB = tierUtils.getTierSortIndex(b.tier);
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
            name.textContent = tierUtils.formatTierName(entry.tier);

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
            tab.textContent = `${tierUtils.formatTierName(entry.tier)} (${entry.completed}/${entry.total})`;
            tab.addEventListener('click', () => {
                activeTierTab = entry.tier;
                this.renderTierTasksModal();
            });
            tabsEl.appendChild(tab);
        });

        const selectedTier = tierData.find(entry => entry.tier === activeTierTab) || tierData[0];
        titleEl.textContent = `${tierUtils.formatTierName(selectedTier.tier)} Tasks`;

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
        const cell = CoreUtils.getCellById(taskId);
        if (!container || !cell) {
            return false;
        }

        const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
        const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
        const scaledCellSize = CELL_SIZE * currentScale;
        const targetLeft = (cell.pixelX * currentScale) - ((container.clientWidth - scaledCellSize) / 2);
        const targetTop = (cell.pixelY * currentScale) - ((container.clientHeight - scaledCellSize) / 2);
        const nextLeft = CoreUtils.clamp(targetLeft, 0, maxLeft);
        const nextTop = CoreUtils.clamp(targetTop, 0, maxTop);

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
                const tierSortA = tierUtils.getTierSortIndex(taskA.tier);
                const tierSortB = tierUtils.getTierSortIndex(taskB.tier);
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
        const promises = tiers.map(name => fetch(`https://raw.githubusercontent.com/OSRS-Taskman/task-list/refs/heads/main/tiers/${name}.json`).then(r => r.json()));
        return Promise.all(promises);
    }

    buildWeightedTaskOrder(tasks) {
        const weightedTasks = tasks.map(task => ({
            task,
            priority: Math.random() / (tierWeights[task.tier] || 1)
        }));

        weightedTasks.sort((a, b) => a.priority - b.priority);

        return weightedTasks.map(entry => entry.task);
    }

    buildWeightedTaskIdOrder(taskIds = []) {
        const uniqueIds = [];
        const seenIds = new Set();
        taskIds.forEach(rawId => {
            const taskId = String(rawId);
            if (!taskId || seenIds.has(taskId)) {
                return;
            }

            seenIds.add(taskId);
            uniqueIds.push(taskId);
        });

        if (uniqueIds.length < 2) {
            return uniqueIds;
        }

        const taskById = new Map(tasksGlobal.map(task => [String(task.id), task]));
        const weightedPool = uniqueIds
            .map(id => taskById.get(id))
            .filter(Boolean);
        if (weightedPool.length < 2) {
            return uniqueIds;
        }

        const weightedIds = this.buildWeightedTaskOrder(weightedPool)
            .map(task => String(task.id));
        const weightedIdSet = new Set(weightedIds);

        uniqueIds.forEach(id => {
            if (!weightedIdSet.has(id)) {
                weightedIds.push(id);
            }
        });

        return weightedIds;
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

        gridManager.idToCoords.forEach((coord, id) => {
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

            const coords = gridManager.getTaskCoord(task.id) || gridManager.getTaskCoord(id);
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
        CoreUtils.saveStates(stateMap);
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

        tasksGlobal.forEach(task => {
            const taskId = String(task.id);
            const coord = gridManager.getTaskCoord(task.id);
            if (!coord) {
                return;
            }

            gridManager.setTaskByCoord(coord.x, coord.y, taskId);

            const cell = CoreUtils.getCellById(taskId);
            if (!cell) {
                return;
            }

            cell.pixelX = GRID_SAFE_PADDING_X + (coord.x * CELL_STEP);
            cell.pixelY = GRID_SAFE_PADDING_Y + (coord.y * CELL_STEP);
        });

        taskModal.refreshPopoverPosition();
    }

    syncSingleCellPosition(taskId, coord) {
        const cell = CoreUtils.getCellById(taskId);
        if (!cell || !coord) {
            return;
        }

        cell.pixelX = GRID_SAFE_PADDING_X + (coord.x * CELL_STEP);
        cell.pixelY = GRID_SAFE_PADDING_Y + (coord.y * CELL_STEP);
    }

    swapTaskCoordinatesInPlace(taskA, taskB, options = {}) {
        const { refreshPopover = true } = options;
        const coordA = gridManager.getTaskCoord(taskA.id) || gridManager.getTaskCoord(String(taskA.id));
        const coordB = gridManager.getTaskCoord(taskB.id) || gridManager.getTaskCoord(String(taskB.id));
        if (!coordA || !coordB) {
            this.syncCellPositionsFromTaskOrder();
            return false;
        }

        const nextCoordA = { x: coordB.x, y: coordB.y };
        const nextCoordB = { x: coordA.x, y: coordA.y };

        gridManager.setTaskCoord(taskA.id, nextCoordA);
        gridManager.setTaskCoord(taskB.id, nextCoordB);

        gridManager.setTaskByCoord(nextCoordA.x, nextCoordA.y, taskA.id);
        gridManager.setTaskByCoord(nextCoordB.x, nextCoordB.y, taskB.id);

        this.syncSingleCellPosition(taskA.id, nextCoordA);
        this.syncSingleCellPosition(taskB.id, nextCoordB);

        if (refreshPopover) {
            taskModal.refreshPopoverPosition();
        }

        return true;
    }

    finalizeTaskOrderMutation() {
        this.saveTaskGridOrder(tasksGlobal);
        taskModal.refreshPopoverPosition();
        canvasInteractionManager.setHoveredCellId('');
        renderWarmupManager.scheduleSpritePrewarm(0);
        queueCanvasRender();
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

        const cellA = CoreUtils.getCellById(idA);
        const cellB = CoreUtils.getCellById(idB);
        if (cellA) {
            gridSceneManager.setCellState(cellA, stateB);
        }
        if (cellB) {
            gridSceneManager.setCellState(cellB, stateA);
        }
    }

    swapTasksById(taskIdA, taskIdB, options = {}) {
        const {
            swapStates = false,
            deferPostSwapEffects = false
        } = options;
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

        const taskA = tasksGlobal[indexA];
        const taskB = tasksGlobal[indexB];
        [tasksGlobal[indexA], tasksGlobal[indexB]] = [tasksGlobal[indexB], tasksGlobal[indexA]];

        const updatedInPlace = this.swapTaskCoordinatesInPlace(taskA, taskB, {
            refreshPopover: !deferPostSwapEffects
        });
        if (!updatedInPlace) {
            this.syncCellPositionsFromTaskOrder();
        }

        if (!deferPostSwapEffects) {
            this.finalizeTaskOrderMutation();
        }

        return true;
    }

    getCompletedTaskIds() {
        return tasksGlobal
            .filter(task => this.taskManager.getState(task.id) === 'complete')
            .map(task => String(task.id));
    }

    getConnectedCompletedAnchorIds(options = {}) {
        const { extraCompletedIds = [] } = options;
        const completeIdSet = new Set(this.getCompletedTaskIds());
        extraCompletedIds
            .map(id => String(id))
            .filter(Boolean)
            .forEach(id => completeIdSet.add(id));

        if (completeIdSet.size === 0) {
            return new Set();
        }

        const centerCoord = this.gridModel.getCenterCoord(tasksGlobal);
        const introId = String(INTRO_TASK_ID);
        let seedIds = [];

        if (completeIdSet.has(introId)) {
            seedIds = [introId];
        } else {
            let minDistance = Number.POSITIVE_INFINITY;
            completeIdSet.forEach(id => {
                const coord = this.gridModel.getTaskCoord(id);
                const distance = Math.abs(coord.x - centerCoord.x) + Math.abs(coord.y - centerCoord.y);
                if (distance < minDistance) {
                    minDistance = distance;
                    seedIds = [id];
                } else if (distance === minDistance) {
                    seedIds.push(id);
                }
            });
        }

        const connected = new Set(seedIds);
        const queue = [...seedIds];

        while (queue.length > 0) {
            const currentId = queue.shift();

            this.gridModel.getTaskNeighbors(currentId).forEach((neighborId) => {
                if (!neighborId || connected.has(neighborId) || !completeIdSet.has(neighborId)) {
                    return;
                }

                connected.add(neighborId);
                queue.push(neighborId);
            });
        }

        return connected;
    }

    getNeighborAttachmentTargetIds(anchorIds, options = {}) {
        const { excludedTaskIds = new Set() } = options;
        const anchorIdSet = new Set(Array.from(anchorIds || []).map(id => String(id)));
        if (anchorIdSet.size === 0) {
            return [];
        }

        const neighborTargetIds = new Set();
        anchorIdSet.forEach(anchorId => {
            this.gridModel.getTaskNeighbors(anchorId).forEach((neighborId) => {
                if (!neighborId) {
                    return;
                }

                if (neighborId === String(INTRO_TASK_ID)) {
                    return;
                }

                if (anchorIdSet.has(neighborId)) {
                    return;
                }

                if (excludedTaskIds.has(neighborId)) {
                    return;
                }

                if ((this.taskManager.getState(neighborId) || 'hidden') === 'complete') {
                    return;
                }

                neighborTargetIds.add(neighborId);
            });
        });

        return this.buildWeightedTaskIdOrder(Array.from(neighborTargetIds));
    }

    pickPendingTaskForTarget(remainingPendingIds, targetTaskId, options = {}) {
        const { taskById = null } = options;
        if (!Array.isArray(remainingPendingIds) || remainingPendingIds.length === 0) {
            return '';
        }

        const getTaskById = taskId => {
            const normalizedId = String(taskId);
            if (taskById) {
                return taskById.get(normalizedId) || null;
            }

            return tasksGlobal.find(task => String(task.id) === normalizedId) || null;
        };

        const targetTask = getTaskById(targetTaskId);
        if (!targetTask) {
            return this.buildWeightedTaskIdOrder(remainingPendingIds)[0] || remainingPendingIds[0] || '';
        }

        const targetTier = String(targetTask.tier || '');
        const sameTierPendingIds = remainingPendingIds.filter(pendingId => {
            const pendingTask = getTaskById(pendingId);
            return pendingTask && String(pendingTask.tier || '') === targetTier;
        });

        const preferredPool = sameTierPendingIds.length > 0
            ? sameTierPendingIds
            : remainingPendingIds;

        return this.buildWeightedTaskIdOrder(preferredPool)[0] || preferredPool[0] || '';
    }

    getAttachmentSwapCandidate(taskId, anchorIds, options = {}) {
        const {
            excludedTaskIds = new Set(),
            maxDistanceToAnchor = Number.POSITIVE_INFINITY,
            taskById = null
        } = options;
        const anchorIdList = Array.from(anchorIds || []);
        if (anchorIdList.length === 0) {
            return null;
        }

        const movingTaskId = String(taskId);
        const movingTask = taskById
            ? taskById.get(movingTaskId)
            : tasksGlobal.find(task => String(task.id) === movingTaskId);
        if (!movingTask) {
            return null;
        }

        const movingCoord = this.gridModel.getTaskCoord(movingTaskId);
        const getCoordDistance = (coordA, coordB) => Math.abs(coordA.x - coordB.x) + Math.abs(coordA.y - coordB.y);
        const statePriority = {
            hidden: 0,
            locked: 1,
            incomplete: 2
        };

        const candidates = tasksGlobal
            .filter(task => String(task.id) !== movingTaskId)
            .filter(task => String(task.id) !== INTRO_TASK_ID)
            .filter(task => !excludedTaskIds.has(String(task.id)))
            .filter(task => (this.taskManager.getState(task.id) || 'hidden') !== 'complete')
            .map(task => {
                const candidateId = String(task.id);
                const candidateCoord = this.gridModel.getTaskCoord(candidateId);
                let distanceToAnchor = Number.POSITIVE_INFINITY;

                anchorIdList.forEach(anchorId => {
                    const anchorCoord = this.gridModel.getTaskCoord(anchorId);
                    const candidateDistance = getCoordDistance(candidateCoord, anchorCoord);
                    if (candidateDistance < distanceToAnchor) {
                        distanceToAnchor = candidateDistance;
                    }
                });

                const candidateState = this.taskManager.getState(candidateId) || 'hidden';

                return {
                    candidateId,
                    task,
                    sameTier: String(task.tier || '') === String(movingTask.tier || ''),
                    distanceToAnchor,
                    distanceFromCurrent: getCoordDistance(candidateCoord, movingCoord),
                    statePriority: statePriority[candidateState] ?? 9
                };
            })
            .filter(candidate => candidate.distanceToAnchor <= maxDistanceToAnchor)
            .sort((candidateA, candidateB) => {
                const adjacentA = candidateA.distanceToAnchor === 1;
                const adjacentB = candidateB.distanceToAnchor === 1;
                if (adjacentA !== adjacentB) {
                    return adjacentA ? -1 : 1;
                }

                if (adjacentA && adjacentB && candidateA.sameTier !== candidateB.sameTier) {
                    return candidateA.sameTier ? -1 : 1;
                }

                if (candidateA.distanceToAnchor !== candidateB.distanceToAnchor) {
                    return candidateA.distanceToAnchor - candidateB.distanceToAnchor;
                }

                if (!adjacentA && candidateA.sameTier !== candidateB.sameTier) {
                    return candidateA.sameTier ? -1 : 1;
                }

                if (candidateA.statePriority !== candidateB.statePriority) {
                    return candidateA.statePriority - candidateB.statePriority;
                }

                if (candidateA.distanceFromCurrent !== candidateB.distanceFromCurrent) {
                    return candidateA.distanceFromCurrent - candidateB.distanceFromCurrent;
                }

                return candidateA.candidateId.localeCompare(candidateB.candidateId);
            });

        if (candidates.length === 0) {
            return null;
        }

        const bestDistance = candidates[0].distanceToAnchor;
        const preferSameTier = candidates
            .filter(candidate => candidate.distanceToAnchor === bestDistance)
            .some(candidate => candidate.sameTier);

        let weightedPool = candidates.filter(candidate => {
            if (candidate.distanceToAnchor !== bestDistance) {
                return false;
            }

            if (preferSameTier && !candidate.sameTier) {
                return false;
            }

            return true;
        });

        const bestStatePriority = weightedPool.reduce((best, candidate) => {
            return Math.min(best, candidate.statePriority);
        }, Number.POSITIVE_INFINITY);
        weightedPool = weightedPool.filter(candidate => candidate.statePriority === bestStatePriority);

        if (weightedPool.length <= 1) {
            return weightedPool[0] || candidates[0];
        }

        const weightedCandidateTasks = this.buildWeightedTaskOrder(weightedPool.map(candidate => candidate.task));
        const selectedTaskId = String(weightedCandidateTasks[0]?.id || '');
        return weightedPool.find(candidate => candidate.candidateId === selectedTaskId) || weightedPool[0];
    }

    attachSyncedCompletedTasks(newlyCompletedTaskIds = [], options = {}) {
        const { includeMovedAsAnchors = true } = options;
        const pendingIds = this.buildWeightedTaskIdOrder(newlyCompletedTaskIds
            .map(id => String(id))
            .filter(Boolean)
            .filter(id => id !== INTRO_TASK_ID));
        if (pendingIds.length === 0) {
            return 0;
        }

        const pendingIdSet = new Set(pendingIds);
        const completedAnchorIds = this.getConnectedCompletedAnchorIds();
        if (completedAnchorIds.size === 0) {
            this.getCompletedTaskIds().forEach(id => completedAnchorIds.add(id));
        }

        const taskById = new Map(tasksGlobal.map(task => [String(task.id), task]));

        let movedCount = 0;
        const processedPendingIds = new Set();

        while (true) {
            const remainingPendingIds = pendingIds.filter(id => !processedPendingIds.has(id));
            if (remainingPendingIds.length === 0) {
                break;
            }

            const remainingPendingIdSet = new Set(remainingPendingIds);
            const neighborTargetIds = this.getNeighborAttachmentTargetIds(completedAnchorIds, {
                excludedTaskIds: remainingPendingIdSet
            });

            if (neighborTargetIds.length === 0) {
                break;
            }

            let movedInPass = 0;
            neighborTargetIds.forEach(targetTaskId => {
                const pendingPool = pendingIds.filter(id => !processedPendingIds.has(id));
                if (pendingPool.length === 0) {
                    return;
                }

                const pendingTaskId = this.pickPendingTaskForTarget(pendingPool, targetTaskId, {
                    taskById
                });
                if (!pendingTaskId) {
                    return;
                }

                const swapped = this.swapTasksById(pendingTaskId, targetTaskId, {
                    deferPostSwapEffects: true
                });
                if (!swapped) {
                    return;
                }

                movedCount += 1;
                movedInPass += 1;
                processedPendingIds.add(pendingTaskId);
                pendingIdSet.delete(pendingTaskId);

                if (includeMovedAsAnchors) {
                    completedAnchorIds.add(pendingTaskId);
                }
            });

            if (movedInPass === 0) {
                break;
            }
        }

        pendingIds.forEach(taskId => {
            if (processedPendingIds.has(taskId)) {
                return;
            }

            const adjacentTarget = this.getAttachmentSwapCandidate(taskId, completedAnchorIds, {
                excludedTaskIds: pendingIdSet,
                maxDistanceToAnchor: 1,
                taskById
            });

            const target = adjacentTarget || this.getAttachmentSwapCandidate(taskId, completedAnchorIds, {
                excludedTaskIds: pendingIdSet,
                taskById
            });

            if (target) {
                const swapped = this.swapTasksById(taskId, target.candidateId, {
                    deferPostSwapEffects: true
                });
                if (swapped) {
                    movedCount += 1;
                    pendingIdSet.delete(taskId);
                }
            }

            if (includeMovedAsAnchors) {
                completedAnchorIds.add(taskId);
            }
        });

        if (movedCount > 0) {
            this.finalizeTaskOrderMutation();
        }

        return movedCount;
    }

    ensureCompletedTasksConnectedFromCenter() {
        const completeTaskIds = this.getCompletedTaskIds().filter(id => id !== String(INTRO_TASK_ID));
        if (completeTaskIds.length === 0) {
            return 0;
        }

        const connectedAnchorIds = this.getConnectedCompletedAnchorIds();
        const disconnectedCompletedIds = this.buildWeightedTaskIdOrder(
            completeTaskIds.filter(id => !connectedAnchorIds.has(id))
        );
        if (disconnectedCompletedIds.length === 0) {
            return 0;
        }

        const disconnectedIdSet = new Set(disconnectedCompletedIds);
        let movedCount = 0;

        disconnectedCompletedIds.forEach(taskId => {
            const target = this.getAttachmentSwapCandidate(taskId, connectedAnchorIds, {
                excludedTaskIds: disconnectedIdSet
            });
            if (!target) {
                disconnectedIdSet.delete(taskId);
                return;
            }

            const swapped = this.swapTasksById(taskId, target.candidateId);
            if (swapped) {
                movedCount += 1;
                connectedAnchorIds.add(taskId);
            }

            disconnectedIdSet.delete(taskId);
        });

        return movedCount;
    }

    reshuffleHiddenTasks() {
        const hiddenTasks = tasksGlobal
            .filter(task => String(task.id) !== INTRO_TASK_ID)
            .filter(task => (this.taskManager.getState(task.id) || 'hidden') === 'hidden');
        if (hiddenTasks.length < 2) {
            return false;
        }

        const reshuffledHiddenTasks = this.buildWeightedTaskOrder(hiddenTasks.slice());
        let hiddenIndex = 0;

        tasksGlobal = tasksGlobal.map(task => {
            const taskId = String(task.id);
            const state = this.taskManager.getState(taskId) || 'hidden';
            if (taskId === INTRO_TASK_ID || state !== 'hidden') {
                return task;
            }

            const replacement = reshuffledHiddenTasks[hiddenIndex];
            hiddenIndex += 1;
            return replacement || task;
        });

        this.syncCellPositionsFromTaskOrder();
        this.saveTaskGridOrder(tasksGlobal);
        canvasInteractionManager.setHoveredCellId('');
        renderWarmupManager.scheduleSpritePrewarm(0);
        queueCanvasRender();
        return true;
    }

    syncCellStatesFromCurrentStates(tasks = tasksGlobal) {
        let updated = false;
        let shouldClearHoveredCell = false;

        tasks.forEach(task => {
            const taskId = String(task.id);
            const cell = CoreUtils.getCellById(taskId);
            if (!cell) {
                return;
            }

            const nextState = this.taskManager.getState(taskId) || 'hidden';
            if (cell.state === nextState) {
                return;
            }

            if (
                hoveredCellId === cell.id
                && nextState !== 'locked'
                && nextState !== 'incomplete'
                && nextState !== 'complete'
            ) {
                shouldClearHoveredCell = true;
            }

            cell.state = nextState;
            cell.spriteKey = '';

            if (nextState !== 'hidden') {
                cell.edgeVisible = false;
                cell.edgeSides = {
                    top: false,
                    right: false,
                    bottom: false,
                    left: false
                };
            }

            updated = true;
        });

        if (shouldClearHoveredCell) {
            canvasInteractionManager.setHoveredCellId('');
        }

        if (updated) {
            renderWarmupManager.scheduleSpritePrewarm(0);
            queueCanvasRender();
        }

        return updated;
    }
}

class GameDataUtils {
    normalizeAchievementDiaryRegion(value) {
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

    normalizeAchievementDiaryDifficulty(value) {
        const difficulty = String(value || '').trim().toLowerCase();
        return DIARY_DIFFICULTIES.has(difficulty) ? difficulty : '';
    }

    getAchievementDiaryKey(region, difficulty) {
        return `${region}|${difficulty}`;
    }

    normalizeSkillName(value) {
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

    levelToExperience(level) {
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

    experienceToLevel(experience) {
        const numericExperience = Number(experience);
        if (!Number.isFinite(numericExperience) || numericExperience < 0) {
            return Number.NaN;
        }

        let level = 1;
        while (level < 126 && this.levelToExperience(level + 1) <= numericExperience) {
            level += 1;
        }

        return level;
    }

    formatSkillName(skillName) {
        const normalized = this.normalizeSkillName(skillName);
        if (!normalized) {
            return 'Skill';
        }

        const labels = {
            hitpoints: 'Hitpoints',
            runecraft: 'Runecraft'
        };

        return labels[normalized] || `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
    }

    getSkillShortLabel(skillName) {
        const normalized = this.normalizeSkillName(skillName);
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

    formatExperience(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric < 0) {
            return '0';
        }

        return Math.floor(numeric).toLocaleString('en-US');
    }

    getSkillBadgeIcon(skillName, isObtained) {
        const normalized = this.normalizeSkillName(skillName) || 'skill';
        const cacheKey = `${normalized}:${isObtained ? '1' : '0'}`;
        if (skillBadgeIconCache.has(cacheKey)) {
            return skillBadgeIconCache.get(cacheKey);
        }

        const label = this.getSkillShortLabel(normalized);
        const background = isObtained ? '#5a513f' : '#3a3a3a';
        const textColor = '#f1e8d4';
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="${background}"/><text x="32" y="41" text-anchor="middle" fill="${textColor}" font-family="sans-serif" font-size="22" font-weight="700">${label}</text></svg>`;
        const icon = `data:image/svg+xml,${encodeURIComponent(svg)}`;
        skillBadgeIconCache.set(cacheKey, icon);
        return icon;
    }
}

class TierUtils {
    formatTierName(tier) {
        return String(tier || '')
            .split('-')
            .filter(Boolean)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    getTierSortIndex(tier) {
        const index = TIER_DISPLAY_ORDER.indexOf(tier);
        return index === -1 ? Number.POSITIVE_INFINITY : index;
    }
}

class AppUtils {
    bindImageErrorFallback(image) {
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

    setImageWithFallback(image, src, alt = '') {
        if (!image) {
            return;
        }

        this.bindImageErrorFallback(image);
        image.dataset.fallbackApplied = '0';
        image.alt = alt;
        image.src = src || QUESTION_MARK_ICON;
    }

    wait(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }
}

class UiSettings {
    constructor(taskManager) {
        this.taskManager = taskManager;
    }

    getFilterableTiers() {
        const tierSet = new Set(tiers.map(tier => String(tier || '').trim()).filter(Boolean));
        tierSet.add(LOCKED_FILTER_KEY);

        tasksGlobal.forEach(task => {
            const tier = String(task?.tier || '').trim();
            if (tier) {
                tierSet.add(tier);
            }
        });

        return Array.from(tierSet).sort((a, b) => {
            const sortA = tierUtils.getTierSortIndex(a);
            const sortB = tierUtils.getTierSortIndex(b);
            if (sortA !== sortB) {
                return sortA - sortB;
            }

            return a.localeCompare(b);
        });
    }

    updateTierFilterControls() {
        const controls = document.getElementById('tier-filter-controls');
        const clearButton = document.getElementById('tier-filter-clear');
        if (!controls) {
            return;
        }

        const filterableTiers = this.getFilterableTiers();
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
                ? this.getActiveCellPalette().locked.border
                : this.getTierColor(filterKey);

            const text = document.createElement('span');
            text.textContent = filterKey === LOCKED_FILTER_KEY
                ? 'Locked'
                : tierUtils.formatTierName(filterKey);

            button.appendChild(swatch);
            button.appendChild(text);
            controls.appendChild(button);
        });

        if (clearButton) {
            clearButton.disabled = selectedTierFilters.size === 0;
        }
    }

    applyTierFilters(nextFilters, options = {}) {
        const { persist = true, rerender = true } = options;
        const filterableTierSet = new Set(this.getFilterableTiers());
        const normalized = CoreUtils.normalizeTierFilterSelection(Array.from(nextFilters || []));

        selectedTierFilters = new Set(Array.from(normalized).filter(tier => filterableTierSet.has(tier)));

        this.updateTierFilterControls();

        if (persist) {
            appSettings[TIER_FILTER_KEY] = Array.from(selectedTierFilters);
            persistAppSettings();
        }

        if (rerender) {
            queueCanvasRender();
        }
    }

    getTierOpacityForCell(cell) {
        const task = cell?.task;
        if (!cell || !task || task.id === INTRO_TASK_ID || selectedTierFilters.size === 0) {
            return 1;
        }

        const state = cell.state || this.taskManager.getState(task.id) || 'hidden';
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

    getCompleteOpacityPercent(value = completeCellOpacity) {
        return Math.round(value * 100);
    }

    updateTierHintControls() {
        const checkbox = document.getElementById('hide-tier-hint-input');
        if (checkbox) {
            checkbox.checked = hideTierHintOnLocked;
        }
    }

    updateAutoWikiToastControls() {
        const checkbox = document.getElementById('auto-wiki-toast-input');
        if (checkbox) {
            checkbox.checked = autoWikiToastEnabled;
        }
    }

    updateCompleteOpacityControls() {
        const slider = document.getElementById('complete-opacity-input');
        const valueLabel = document.getElementById('complete-opacity-value');
        const percent = this.getCompleteOpacityPercent();

        if (slider && document.activeElement !== slider) {
            slider.value = String(percent);
        }

        if (valueLabel) {
            valueLabel.textContent = `${percent}%`;
        }
    }

    applyCompleteOpacity(value, options = {}) {
        const { persist = true, rerender = true } = options;
        const nextOpacity = CoreUtils.normalizeCompleteOpacity(value);

        completeCellOpacity = nextOpacity;

        if (document.documentElement) {
            document.documentElement.style.setProperty('--state-complete-opacity', String(nextOpacity));
        }

        this.updateCompleteOpacityControls();

        if (persist) {
            appSettings[COMPLETE_OPACITY_KEY] = nextOpacity;
            persistAppSettings();
        }

        if (rerender) {
            queueCanvasRender();
        }
    }

    applyHideTierHintOnLocked(value, options = {}) {
        const { persist = true, rerender = true } = options;
        hideTierHintOnLocked = Boolean(value);
        this.updateTierHintControls();

        if (persist) {
            appSettings[HIDE_TIER_HINT_KEY] = hideTierHintOnLocked;
            persistAppSettings();
        }

        if (rerender) {
            queueCanvasRender();
            taskModal.refreshOpenModal();
        }
    }

    applyAutoWikiToastSetting(value, options = {}) {
        const { persist = true } = options;
        autoWikiToastEnabled = Boolean(value);
        this.updateAutoWikiToastControls();

        if (persist) {
            appSettings[AUTO_WIKI_TOAST_ENABLED_KEY] = autoWikiToastEnabled;
            persistAppSettings();
        }

        if (!autoWikiToastEnabled) {
            hudManager.dismissSyncSummaryToast();
        }
    }

    setOptionsPopoverOpen(isOpen) {
        const popover = document.getElementById('options-popover');
        const button = document.getElementById('options-button');
        if (!popover || !button) {
            return;
        }

        popover.classList.toggle('open', isOpen);
        button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    closeOptionsPopover() {
        this.setOptionsPopoverOpen(false);
    }

    initOptionsMenu() {
        this.applyCompleteOpacity(completeCellOpacity, { persist: false, rerender: false });
        this.applyHideTierHintOnLocked(hideTierHintOnLocked, { persist: false, rerender: false });
        this.applyAutoWikiToastSetting(autoWikiToastEnabled, { persist: false });
        this.applyTierFilters(selectedTierFilters, { persist: false, rerender: false });

        const optionsButton = document.getElementById('options-button');
        const optionsPopover = document.getElementById('options-popover');
        const opacityInput = document.getElementById('complete-opacity-input');
        const hideTierHintInput = document.getElementById('hide-tier-hint-input');
        const autoWikiToastInput = document.getElementById('auto-wiki-toast-input');
        const tierFilterControls = document.getElementById('tier-filter-controls');
        const tierFilterClear = document.getElementById('tier-filter-clear');
        if (!optionsButton || !optionsPopover || !opacityInput || !hideTierHintInput || !tierFilterControls || !tierFilterClear) {
            return;
        }

        optionsButton.addEventListener('click', e => {
            e.preventDefault();
            const isOpen = optionsPopover.classList.contains('open');
            this.setOptionsPopoverOpen(!isOpen);
        });

        opacityInput.addEventListener('input', e => {
            const value = Number.parseFloat(e.currentTarget.value);
            this.applyCompleteOpacity(value / 100, { persist: true, rerender: true });
        });

        hideTierHintInput.addEventListener('change', e => {
            this.applyHideTierHintOnLocked(Boolean(e.currentTarget.checked), { persist: true, rerender: true });
        });

        if (autoWikiToastInput) {
            autoWikiToastInput.addEventListener('change', e => {
                this.applyAutoWikiToastSetting(Boolean(e.currentTarget.checked), { persist: true });
            });
        }

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

            this.applyTierFilters(nextFilters, { persist: true, rerender: true });
        });

        tierFilterClear.addEventListener('click', () => {
            this.applyTierFilters(new Set(), { persist: true, rerender: true });
        });
    }

    getActiveTierColors() {
        return TIER_COLORS_BY_THEME[activeTheme] || TIER_COLORS_BY_THEME.osrs;
    }

    getActiveCellPalette() {
        return CELL_PALETTES_BY_THEME[activeTheme] || CELL_PALETTES_BY_THEME.osrs;
    }

    getTierColor(tier) {
        return this.getActiveTierColors()[tier] || '#736559';
    }

    getReadableTextColor(backgroundHex) {
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

    updateThemeToggleButtons() {
        document.querySelectorAll('#theme-toggle .theme-option').forEach(button => {
            button.classList.toggle('active', button.dataset.theme === activeTheme);
        });
    }

    applyTheme(theme, options = {}) {
        const { persist = true } = options;
        const nextTheme = CoreUtils.normalizeTheme(theme);
        const changed = nextTheme !== activeTheme || document.body?.dataset.theme !== nextTheme;

        activeTheme = nextTheme;
        if (document.body) {
            document.body.dataset.theme = nextTheme;
        }

        if (persist) {
            appSettings[THEME_KEY] = nextTheme;
            persistAppSettings();
        }

        this.updateThemeToggleButtons();
        this.updateTierFilterControls();

        if (!changed) {
            return;
        }

        backgroundSpriteCache.clear();
        idToCell.forEach(cell => {
            cell.spriteKey = '';
        });

        queueCanvasRender();

        if (document.getElementById('task-modal')?.classList.contains('open')) {
            taskModal.refreshOpenModal();
        }

        if (document.getElementById('tier-tasks-modal')?.classList.contains('open')) {
            taskPanels.renderTierTasksModal();
        }

        taskPanels.updateCurrentTasksPopover();
    }

    initThemeToggle() {
        this.applyTheme(activeTheme, { persist: false });

        const toggle = document.getElementById('theme-toggle');
        if (!toggle) {
            return;
        }

        toggle.addEventListener('click', e => {
            const button = e.target.closest('.theme-option');
            if (!button) {
                return;
            }

            this.applyTheme(button.dataset.theme);
        });
    }
}

class HudManager {
    constructor(taskManager, taskPanels) {
        this.taskManager = taskManager;
        this.taskPanels = taskPanels;
        this.unlockToastTimer = null;
        this.syncSummaryToastTimer = null;
        this.syncSummaryToastMode = '';
        this.activeAutoCompletableCount = 0;
    }

    updateUnlockHud() {
        const unlocks = document.getElementById('hud-unlocks');
        const nextUnlock = document.getElementById('hud-next-unlock');
        if (!unlocks || !nextUnlock) {
            return;
        }

        const completedCount = this.taskManager.getCompletedCount();
        const totalUnlocks = this.taskManager.getUnlockLimit(completedCount);
        const availableUnlocks = Math.max(0, totalUnlocks - this.taskManager.getUnlockedCount());
        const tasksUntilNext = this.taskManager.getTasksUntilNextUnlock(completedCount);

        unlocks.textContent = `${availableUnlocks} / ${totalUnlocks}`;
        nextUnlock.textContent = tasksUntilNext === 1 ? '1 task' : `${tasksUntilNext} tasks`;
        this.taskPanels.updateTierProgressMenu();
        this.taskPanels.updateCurrentTasksPopover();

        const tierTasksModal = document.getElementById('tier-tasks-modal');
        if (tierTasksModal?.classList.contains('open')) {
            this.taskPanels.renderTierTasksModal();
        }
    }

    showUnlockToast(newLimit) {
        const toast = document.getElementById('unlock-toast');
        const slots = document.getElementById('unlock-toast-slots');
        if (!toast || !slots) {
            return;
        }

        slots.textContent = newLimit;

        if (this.unlockToastTimer) {
            clearTimeout(this.unlockToastTimer);
            this.unlockToastTimer = null;
        }

        toast.classList.remove('leaving');
        void toast.offsetWidth;
        toast.classList.add('visible');

        this.unlockToastTimer = setTimeout(() => {
            toast.classList.add('leaving');
            setTimeout(() => toast.classList.remove('visible', 'leaving'), 350);
            this.unlockToastTimer = null;
        }, UNLOCK_TOAST_DURATION_MS);
    }

    dismissUnlockToast() {
        const toast = document.getElementById('unlock-toast');
        if (!toast) {
            return;
        }

        if (this.unlockToastTimer) {
            clearTimeout(this.unlockToastTimer);
            this.unlockToastTimer = null;
        }

        toast.classList.add('leaving');
        setTimeout(() => toast.classList.remove('visible', 'leaving'), 350);
    }

    formatSyncTierLabel(rawTier) {
        const tier = String(rawTier || '').trim();
        if (tier === String(INTRO_TASK_ID)) {
            return 'How to Play';
        }

        if (!tier || tier === 'other') {
            return 'Other';
        }

        return tierUtils.formatTierName(tier);
    }

    getSyncTierSortIndex(rawTier) {
        const tier = String(rawTier || '').trim();
        if (tier === String(INTRO_TASK_ID)) {
            return -1;
        }

        const sortIndex = tierUtils.getTierSortIndex(tier);
        return Number.isFinite(sortIndex) ? sortIndex : Number.POSITIVE_INFINITY;
    }

    buildSyncTierSummaryText(tierCounts = new Map()) {
        return Array.from((tierCounts instanceof Map ? tierCounts : new Map()).entries())
            .filter(([, count]) => Number.isFinite(count) && count > 0)
            .sort(([tierA], [tierB]) => {
                const sortA = this.getSyncTierSortIndex(tierA);
                const sortB = this.getSyncTierSortIndex(tierB);
                if (sortA !== sortB) {
                    return sortA - sortB;
                }

                return this.formatSyncTierLabel(tierA).localeCompare(this.formatSyncTierLabel(tierB));
            })
            .map(([tier, count]) => `${this.formatSyncTierLabel(tier)} ${count}`)
            .join(' • ');
    }

    showSyncSummaryToast(summary = {}) {
        const {
            completedCount = 0,
            completedByTier = new Map()
        } = summary;

        if (
            this.syncSummaryToastMode === 'auto-request'
            && this.activeAutoCompletableCount > autoWikiToastAcknowledgedCount
        ) {
            return;
        }

        const toast = document.getElementById('sync-summary-toast');
        const title = document.getElementById('sync-summary-toast-title');
        const sub = document.getElementById('sync-summary-toast-sub');
        if (!toast || !title || !sub) {
            return;
        }

        if (completedCount <= 0) {
            title.textContent = 'Wiki sync complete';
            sub.textContent = 'No new tasks completed.';
        } else {
            const tierSummary = this.buildSyncTierSummaryText(completedByTier);

            title.textContent = completedCount === 1
                ? 'Wiki synced 1 task'
                : `Wiki synced ${completedCount} tasks`;
            sub.textContent = tierSummary || 'No new tasks completed.';
        }

        if (this.syncSummaryToastTimer) {
            clearTimeout(this.syncSummaryToastTimer);
            this.syncSummaryToastTimer = null;
        }

        this.syncSummaryToastMode = 'summary';
        this.activeAutoCompletableCount = 0;

        toast.classList.remove('leaving');
        void toast.offsetWidth;
        toast.classList.add('visible');

        this.syncSummaryToastTimer = setTimeout(() => {
            toast.classList.add('leaving');
            setTimeout(() => toast.classList.remove('visible', 'leaving'), 350);
            this.syncSummaryToastTimer = null;
            this.syncSummaryToastMode = '';
            this.activeAutoCompletableCount = 0;
        }, UNLOCK_TOAST_DURATION_MS);
    }

    showAutoSyncRequestToast(summary = {}) {
        const {
            autoCompletableCount = 0,
            autoCompletableByTier = new Map()
        } = summary;

        const toast = document.getElementById('sync-summary-toast');
        const title = document.getElementById('sync-summary-toast-title');
        const sub = document.getElementById('sync-summary-toast-sub');
        if (!toast || !title || !sub) {
            return;
        }

        if (!autoWikiToastEnabled) {
            return;
        }

        if (!Number.isFinite(autoCompletableCount) || autoCompletableCount <= 0) {
            return;
        }

        if (autoCompletableCount <= autoWikiToastAcknowledgedCount) {
            return;
        }

        const tierSummary = this.buildSyncTierSummaryText(autoCompletableByTier);
        title.textContent = autoCompletableCount === 1
            ? 'Wiki update found 1 auto-completable task'
            : `Wiki update found ${autoCompletableCount} auto-completable tasks`;
        sub.textContent = tierSummary || 'No new auto-completable tasks.';

        if (this.syncSummaryToastTimer) {
            clearTimeout(this.syncSummaryToastTimer);
            this.syncSummaryToastTimer = null;
        }

        this.syncSummaryToastMode = 'auto-request';
        this.activeAutoCompletableCount = autoCompletableCount;

        toast.classList.remove('leaving');
        void toast.offsetWidth;
        toast.classList.add('visible');
    }

    dismissSyncSummaryToast() {
        const toast = document.getElementById('sync-summary-toast');
        if (!toast) {
            return;
        }

        if (this.syncSummaryToastTimer) {
            clearTimeout(this.syncSummaryToastTimer);
            this.syncSummaryToastTimer = null;
        }

        if (this.syncSummaryToastMode === 'auto-request') {
            autoWikiToastAcknowledgedCount = Math.max(autoWikiToastAcknowledgedCount, this.activeAutoCompletableCount);
            appSettings[AUTO_WIKI_TOAST_ACK_COUNT_KEY] = autoWikiToastAcknowledgedCount;
            persistAppSettings();
        }

        toast.classList.add('leaving');
        setTimeout(() => toast.classList.remove('visible', 'leaving'), 350);
        this.syncSummaryToastMode = '';
        this.activeAutoCompletableCount = 0;
    }
}

class TaskModal {
    isAnchorConnected(anchor) {
        if (!anchor) {
            return false;
        }

        if (anchor.__virtualAnchor) {
            return Boolean(CoreUtils.getCellById(anchor.taskId));
        }

        return anchor instanceof Node ? document.body.contains(anchor) : false;
    }

    createCellAnchor(cell) {
        return {
            __virtualAnchor: true,
            taskId: String(cell.id),
            _task: cell.task,
            getBoundingClientRect() {
                const currentCell = CoreUtils.getCellById(this.taskId);
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

    refreshOpenModal() {
        const modal = document.getElementById('task-modal');
        if (!modal?.classList.contains('open') || !activePopoverAnchor) {
            return;
        }

        if (!this.isAnchorConnected(activePopoverAnchor)) {
            this.hideModal();
            return;
        }

        const task = activePopoverAnchor._task;
        if (task) {
            this.showModal(task, activePopoverAnchor);
        }
    }

    refreshPopoverPosition() {
        if (activePopoverAnchor && this.isAnchorConnected(activePopoverAnchor)) {
            this.positionPopover(activePopoverAnchor);
        } else if (activePopoverAnchor) {
            this.hideModal();
        }
    }

    positionPopover(anchor) {
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

        top = CoreUtils.clamp(top, pad, window.innerHeight - contentRect.height - pad);

        let left = anchorRect.left + (anchorRect.width / 2) - (contentRect.width / 2);
        left = CoreUtils.clamp(left, pad, window.innerWidth - contentRect.width - pad);

        const arrowX = CoreUtils.clamp(anchorRect.left + (anchorRect.width / 2) - left, 24, contentRect.width - 24);
        content.style.top = `${top}px`;
        content.style.left = `${left}px`;
        content.style.setProperty('--popover-arrow-x', `${arrowX}px`);
        modal.dataset.side = side;
    }

    hideModal() {
        const modal = document.getElementById('task-modal');
        modal.classList.remove('open');
        activePopoverAnchor = null;
    }

    showModal(task, anchor) {
        const modal = document.getElementById('task-modal');
        const title = document.getElementById('modal-title');
        const image = document.getElementById('modal-image');
        const tip = document.getElementById('modal-tip');
        const wikiButton = document.getElementById('modal-wiki');
        const button = document.getElementById('modal-complete');
        const tierBadge = document.getElementById('modal-tier-badge');
        const cell = CoreUtils.getCellById(task.id);
        const state = taskManager.getState(task.id) || 'incomplete';

        if (task.id === INTRO_TASK_ID) {
            title.textContent = 'Welcome to the Task Grid!';
            appUtils.setImageWithFallback(image, INTRO_TASK_IMAGE, 'Task Grid');
            tip.innerHTML =
                'Complete randomly assigned OSRS collection log goals and work your way across the grid.<br><br>' +
                '<strong>Unlocking tasks:</strong> Locked tiles can be revealed by spending unlock slots. ' +
                'Complete tasks to earn more slots — the more you finish, the more you unlock.<br><br>' +
                '<strong>Wiki Sync:</strong> In RuneLite, enable the <em>Wiki Sync</em> plugin. ' +
                'Open your Collection Log in-game and click the Wiki Sync button. ' +
                'Then use the Wiki Sync button here to automatically mark completed tasks.';
            wikiButton.style.display = 'none';
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
                    hudManager.updateUnlockHud();
                    gridSceneManager.refreshHiddenEdges({ animate: true });
                    this.hideModal();
                };
            } else {
                button.style.display = 'none';
                button.disabled = false;
                button.onclick = null;
            }
            activePopoverAnchor = anchor || cell;
            modal.classList.add('open');
            requestAnimationFrame(() => {
                this.refreshPopoverPosition();
            });
            return;
        }

        if (state === 'locked') {
            title.textContent = 'Locked Task';
            appUtils.setImageWithFallback(image, LOCKED_TILE_IMAGE, 'Locked task');
            tip.textContent = 'Unlock this tile to reveal what task is here.';
            wikiButton.style.display = 'none';
        } else {
            title.textContent = task.name;
            appUtils.setImageWithFallback(image, task.imageLink, task.name);
            tip.textContent = task.tip || '';
            wikiButton.href = task.wikiLink || '#';
            wikiButton.style.display = 'inline-block';
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
                hudManager.updateUnlockHud();
                gridSceneManager.refreshHiddenEdges({ animate: true });
                const nextLimit = taskManager.getUnlockLimit();
                if (nextLimit > previousLimit) {
                    hudManager.showUnlockToast(nextLimit);
                }
                this.hideModal();
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
                    gridSceneManager.setCellState(cell, 'incomplete');
                }

                const unlockedTask = taskVerification.alignUnlockedTaskToLowestSeriesTask(task);

                hudManager.updateUnlockHud();
                gridSceneManager.refreshHiddenEdges({ animate: true });

                this.hideModal();
                requestAnimationFrame(() => {
                    const unlockedTaskId = String(unlockedTask?.id || task.id);
                    const unlockedCell = CoreUtils.getCellById(unlockedTaskId);
                    if (!unlockedCell || taskManager.getState(unlockedTaskId) !== 'incomplete') {
                        return;
                    }

                    this.showModal(unlockedCell.task, this.createCellAnchor(unlockedCell));
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
                const bgColor = uiSettings.getTierColor(tier);
                const textColor = uiSettings.getReadableTextColor(bgColor);
                tierBadge.textContent = tierUtils.formatTierName(tier) || 'Unknown';
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
                    const info = wiki.collectionLogMap.get(numericId);
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
                        appUtils.setImageWithFallback(img, info.imageUrl, info.name);
                    } else {
                        appUtils.setImageWithFallback(img, QUESTION_MARK_ICON, `Item ${id}`);
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

                        return gameDataUtils.formatSkillName(requirementA.skillName).localeCompare(gameDataUtils.formatSkillName(requirementB.skillName));
                    });

                itemsEl.classList.toggle('is-scrollable', sortedRequirements.length > 20);
                sortedRequirements.forEach(requirement => {
                    const skillName = gameDataUtils.formatSkillName(requirement.skillName);
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
                    appUtils.setImageWithFallback(img, gameDataUtils.getSkillBadgeIcon(requirement.skillName, isObtained), skillName);

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
            this.refreshPopoverPosition();
        });
    }
}

class ProgressSyncManager {
    getAutoCompletableTaskIds() {
        return tasksGlobal
            .filter(task => taskManager.getState(task.id) !== 'complete')
            .filter(task => {
                const requiredCount = taskVerification.getTaskRequiredCount(task);
                return requiredCount > 0 && taskVerification.getTaskObtainedCount(task) >= requiredCount;
            })
            .map(task => String(task.id));
    }

    getTaskCountByTier(taskIds = []) {
        const taskById = new Map(tasksGlobal.map(task => [String(task.id), task]));
        const completedByTier = new Map();

        taskIds
            .map(taskId => String(taskId))
            .filter(Boolean)
            .forEach(taskId => {
                const task = taskById.get(taskId);
                if (!task) {
                    return;
                }

                const tierKey = taskId === String(INTRO_TASK_ID)
                    ? String(INTRO_TASK_ID)
                    : String(task.tier || 'other');
                const previousCount = completedByTier.get(tierKey) || 0;
                completedByTier.set(tierKey, previousCount + 1);
            });

        return completedByTier;
    }

    notifyAutoWikiLoadAutoCompletableTasks() {
        const autoCompletableTaskIds = this.getAutoCompletableTaskIds();
        hudManager.showAutoSyncRequestToast({
            autoCompletableCount: autoCompletableTaskIds.length,
            autoCompletableByTier: this.getTaskCountByTier(autoCompletableTaskIds)
        });
    }

    completeHowToPlayTasks(options = {}) {
        const { onTaskCompleted = null } = options;
        const howToPlayTask = tasksGlobal.find(task => {
            const taskId = String(task.id);
            if (taskId === String(INTRO_TASK_ID)) {
                return true;
            }
        });

        let completedCount = 0;

        if (howToPlayTask) {
            if (taskManager.getState(howToPlayTask.id) !== 'complete') {
                taskManager.applyTaskCompletion(howToPlayTask, { animateNeighborReveal: false });
                completedCount += 1;
                if (typeof onTaskCompleted === 'function') {
                    onTaskCompleted(howToPlayTask);
                }
            }
        }

        return completedCount;
    }

    async syncCompletedTasksFromObtained(options = {}) {
        const {
            showToast = true,
            refreshModal = true,
            batchDelay = SYNC_STAGGER_MS,
            taskIdsToCompleteOverride = null
        } = options;

        taskManager.beginStatePersistenceBatch();

        try {
            const completedByTier = new Map();
            const trackCompletedTask = task => {
                if (!task) {
                    return;
                }

                const taskId = String(task.id);
                const tierKey = taskId === String(INTRO_TASK_ID)
                    ? String(INTRO_TASK_ID)
                    : String(task.tier || 'other');
                const previous = completedByTier.get(tierKey) || 0;
                completedByTier.set(tierKey, previous + 1);
            };

            let completedCount = this.completeHowToPlayTasks({ onTaskCompleted: trackCompletedTask });
            const previousLimit = taskManager.getUnlockLimit();
            const taskIdsToComplete = Array.isArray(taskIdsToCompleteOverride)
                ? Array.from(new Set(taskIdsToCompleteOverride.map(taskId => String(taskId)).filter(Boolean)))
                : this.getAutoCompletableTaskIds();

            if (taskIdsToComplete.length > 0) {
                taskOrderManager.attachSyncedCompletedTasks(taskIdsToComplete, { includeMovedAsAnchors: true });
            }

            const taskById = new Map(tasksGlobal.map(task => [String(task.id), task]));
            const center = gameController.getCenterCoord(tasksGlobal);

            const tasksToComplete = taskIdsToComplete
                .map(taskId => taskById.get(taskId))
                .filter(Boolean)
                .map(task => {
                    const coord = gameController.getTaskCoord(task);
                    return {
                        taskId: String(task.id),
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
                        tasks: [entry.taskId]
                    });
                    return;
                }

                previousBatch.tasks.push(entry.taskId);
            });

            const revealStagger = distanceBatches.length * batchDelay > INITIAL_REVEAL_DURATION_MS
                ? INITIAL_REVEAL_DURATION_MS / Math.max(1, distanceBatches.length - 1)
                : batchDelay;

            for (let index = 0; index < distanceBatches.length; index++) {
                const batch = distanceBatches[index].tasks;
                let batchCompletedCount = 0;
                batch.forEach(taskId => {
                    const pendingTask = taskById.get(String(taskId));
                    if (pendingTask) {
                        taskManager.applyTaskCompletion(pendingTask, { animateNeighborReveal: false });
                        trackCompletedTask(pendingTask);
                        batchCompletedCount += 1;
                    }
                });

                completedCount += batchCompletedCount;
                if (batchCompletedCount > 0) {
                    taskManager.normalizeUnlockStates();
                    hudManager.updateUnlockHud();
                    gridSceneManager.refreshHiddenEdges({ animate: false });
                }

                if (index + 1 < distanceBatches.length) {
                    await appUtils.wait(revealStagger * 2);
                }
            }

            const shouldRecomputeGridStates = completedCount > 0;

            if (shouldRecomputeGridStates) {
                taskOrderManager.reshuffleHiddenTasks();
                taskOrderManager.rebuildHiddenAndLockedStatesFromProgress(tasksGlobal);
                taskOrderManager.syncCellStatesFromCurrentStates(tasksGlobal);
            }

            taskManager.revealFrontierFromCompletedTasks({ animateNeighborReveal: false });
            taskManager.normalizeUnlockStates();
            hudManager.updateUnlockHud();

            if (shouldRecomputeGridStates) {
                gridSceneManager.refreshHiddenEdges({ animate: false });
            }

            const nextLimit = taskManager.getUnlockLimit();
            if (showToast && nextLimit > previousLimit) {
                hudManager.showUnlockToast(nextLimit);
            }

            if (showToast) {
                hudManager.showSyncSummaryToast({
                    completedCount,
                    completedByTier
                });
            }

            if (refreshModal) {
                taskModal.refreshOpenModal();
            }

            return completedCount;
        } finally {
            taskManager.endStatePersistenceBatch();
        }
    }

    async syncPlayerProgress() {
        if (!playerUsername) {
            return 0;
        }

        const playerSnapshot = await wiki.loadPlayerData(playerUsername, { forceRefresh: true });
        if (playerSnapshot) {
            playerProgress.applySnapshot(playerSnapshot);
        }

        return this.syncCompletedTasksFromObtained({ animate: true, showToast: true, refreshModal: true });
    }
}

class GridViewport {
    getMinScale() {
        const grid = document.getElementById('grid');
        const container = document.getElementById('grid-container');
        if (!grid || !container || !grid.scrollWidth || !grid.scrollHeight) {
            return MIN_SCALE;
        }

        const widthFit = container.clientWidth / grid.scrollWidth;
        const heightFit = container.clientHeight / grid.scrollHeight;
        return CoreUtils.clamp(Math.max(widthFit, heightFit), MIN_SCALE, MAX_SCALE);
    }

    getVisibleWorldBounds() {
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

    getVisibleCoordBounds(bounds) {
        if (!bounds || gridCellCount <= 0) {
            return null;
        }

        const maxCoord = gridCellCount - 1;
        const left = CoreUtils.clamp(Math.floor((bounds.left - GRID_SAFE_PADDING_X) / CELL_STEP), 0, maxCoord);
        const right = CoreUtils.clamp(Math.floor((bounds.right - GRID_SAFE_PADDING_X) / CELL_STEP), 0, maxCoord);
        const top = CoreUtils.clamp(Math.floor((bounds.top - GRID_SAFE_PADDING_Y) / CELL_STEP), 0, maxCoord);
        const bottom = CoreUtils.clamp(Math.floor((bounds.bottom - GRID_SAFE_PADDING_Y) / CELL_STEP), 0, maxCoord);

        return {
            left,
            right,
            top,
            bottom
        };
    }

    getVisibleClearRect(bounds) {
        if (!bounds) {
            return {
                x: 0,
                y: 0,
                width: gridPixelWidth,
                height: gridPixelHeight
            };
        }

        const x = CoreUtils.clamp(bounds.left, 0, gridPixelWidth);
        const y = CoreUtils.clamp(bounds.top, 0, gridPixelHeight);
        const right = CoreUtils.clamp(bounds.right, 0, gridPixelWidth);
        const bottom = CoreUtils.clamp(bounds.bottom, 0, gridPixelHeight);

        return {
            x,
            y,
            width: Math.max(0, right - x),
            height: Math.max(0, bottom - y)
        };
    }

    updateGridScale(options = {}) {
        const { deferCanvasRender = false } = options;
        const grid = document.getElementById('grid');
        const stage = document.getElementById('grid-stage');
        if (!grid || !stage) {
            return;
        }

        currentScale = CoreUtils.clamp(currentScale, this.getMinScale(), MAX_SCALE);
        grid.style.transform = `scale(${currentScale})`;
        stage.style.width = `${grid.scrollWidth * currentScale}px`;
        stage.style.height = `${grid.scrollHeight * currentScale}px`;

        if (deferCanvasRender) {
            canvasRuntimeManager.scheduleZoomRender();
            return;
        }

        canvasRuntimeManager.flushZoomRender();
    }

    bindWheelZoom(container) {
        container.addEventListener('wheel', e => {
            e.preventDefault();

            const previousScale = currentScale;

            const minScale = this.getMinScale();
            const nextScale = CoreUtils.clamp(
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
            this.updateGridScale({ deferCanvasRender: true });

            container.scrollLeft = worldX * currentScale - pointerX;
            container.scrollTop = worldY * currentScale - pointerY;
            if (nextScale < previousScale) {
                renderWarmupManager.prewarmVisibleCellSprites();
                queueCanvasRender();
            }
            taskModal.refreshPopoverPosition();
        }, { passive: false });

        window.addEventListener('resize', () => {
            this.updateGridScale();
            taskModal.refreshPopoverPosition();
        });
    }
}

class CanvasInteractionManager {
    getCellAtClientPoint(clientX, clientY) {
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

        const taskId = gridManager.getTaskByCoord(coordX, coordY);
        return taskId ? CoreUtils.getCellById(taskId) : null;
    }

    isCellHoverable(cell) {
        if (!cell) {
            return false;
        }

        const state = cell.state || 'hidden';
        return state === 'locked' || state === 'incomplete' || state === 'complete';
    }

    setHoveredCellId(nextCellId) {
        const normalized = nextCellId ? String(nextCellId) : '';
        if (hoveredCellId === normalized) {
            return;
        }

        const previousCell = hoveredCellId ? CoreUtils.getCellById(hoveredCellId) : null;
        hoveredCellId = normalized;
        const nextCell = hoveredCellId ? CoreUtils.getCellById(hoveredCellId) : null;

        if (gridCanvas) {
            gridCanvas.style.cursor = nextCell && this.isCellHoverable(nextCell) ? 'pointer' : 'default';
        }

        if (previousCell || nextCell) {
            queueCanvasRender();
        }
    }

    bindCanvasInteractions(canvas) {
        if (!canvas || canvas.dataset.bound === '1') {
            return;
        }

        canvas.dataset.bound = '1';
        canvas.style.cursor = 'default';

        canvas.addEventListener('mousemove', e => {
            if (e.buttons !== 0) {
                this.setHoveredCellId('');
                return;
            }

            const cell = this.getCellAtClientPoint(e.clientX, e.clientY);
            if (!cell || !this.isCellHoverable(cell)) {
                this.setHoveredCellId('');
                return;
            }

            this.setHoveredCellId(cell.id);
        }, { passive: true });

        canvas.addEventListener('mouseleave', () => {
            this.setHoveredCellId('');
        });

        canvas.addEventListener('click', e => {
            if (suppressTaskClick || e.button !== 0) {
                return;
            }

            const cell = this.getCellAtClientPoint(e.clientX, e.clientY);
            if (!cell) {
                return;
            }

            const state = taskManager.getState(cell.id) || 'hidden';
            if (state === 'hidden') {
                return;
            }

            taskModal.showModal(cell.task, taskModal.createCellAnchor(cell));
        });

        canvas.addEventListener('contextmenu', e => {
            const cell = this.getCellAtClientPoint(e.clientX, e.clientY);
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
}

class GridSceneManager {
    setCellState(cell, nextState) {
        if (!cell) {
            return;
        }

        if (cell.state === nextState) {
            return;
        }

        cell.state = nextState;
        cell.spriteKey = '';
        if (hoveredCellId === cell.id && !canvasInteractionManager.isCellHoverable(cell)) {
            canvasInteractionManager.setHoveredCellId('');
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

        renderWarmupManager.scheduleSpritePrewarm(0);
        queueCanvasRender();
    }

    buildTaskNameLines(name, options = {}) {
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

    createCell(task, coord) {
        const state = taskManager.getState(task.id) || 'incomplete';
        const nameLines = this.buildTaskNameLines(task.name, {
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
                return taskModal.createCellAnchor(this).getBoundingClientRect();
            }
        };
    }

    revealNeighborAsLocked(id, options = {}) {
        const { animate = true } = options;
        taskManager.setState(id, 'locked');
        const cell = CoreUtils.getCellById(id);
        if (!cell) {
            return;
        }

        this.setCellState(cell, 'locked');
        if (animate) {
            this.playPopReveal(cell);
        }
    }

    playPopReveal(cell, options = {}) {
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

    refreshHiddenEdges(options = {}) {
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

        gridManager.idToCoords.forEach((coord, id) => {
            stateByCoord.set(`${coord.x},${coord.y}`, taskManager.getState(id));
        });

        gridManager.idToCoords.forEach((coord, id) => {
            const cell = CoreUtils.getCellById(id);
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
                this.playPopReveal(item.cell, { easing: revealEasing });
            }, startDelay);
        });

        queueCanvasRender();
    }

    render(tasks) {
        const grid = document.getElementById('grid');
        if (!grid) {
            return;
        }

        taskModal.hideModal();
        hoveredCellId = '';
        if (gridCanvas) {
            gridCanvas.style.cursor = 'default';
        }
        grid.innerHTML = '';
        idToCell.clear();

        const { size, coords, center } = gridManager.updateTaskCoordinates(tasks);
        gridCellCount = size;
        const canvas = canvasRuntimeManager.ensureGridCanvas();
        if (!canvas || !gridContext) {
            return;
        }

        const gridCoreSize = Math.max(1, (size * CELL_SIZE) + ((size - 1) * CELL_GAP));
        gridPixelWidth = gridCoreSize + (GRID_SAFE_PADDING_X * 2);
        gridPixelHeight = gridCoreSize + (GRID_SAFE_PADDING_Y * 2);

        grid.style.width = `${gridPixelWidth}px`;
        grid.style.height = `${gridPixelHeight}px`;
        canvasRuntimeManager.syncCanvasResolution();

        const cells = [];

        tasks.forEach((task, index) => {
            const [x, y] = coords[index];
            const cell = this.createCell(task, { x, y });
            idToCell.set(String(task.id), cell);
            gridManager.setTaskByCoord(x, y, String(task.id));
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
            this.playPopReveal(item.cell, { delay: revealDelay, easing: 'ease-in' });
        });

        this.refreshHiddenEdges({ animate: true, center, revealDelayByCoord, staggerMs: revealStagger, revealEasing: 'ease-in' });
        gridViewport.updateGridScale();
        hudManager.updateUnlockHud();
        renderWarmupManager.scheduleSpritePrewarm(0);
        queueCanvasRender();

        if (tasks.length > 0) {
            taskPanels.centerTaskInView(tasks[0].id, { smooth: false });
        }
    }
}

class CanvasRuntimeManager {
    ensureGridCanvas() {
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

        canvasInteractionManager.bindCanvasInteractions(canvas);

        gridCanvas = canvas;
        gridContext = canvas.getContext('2d');
        return canvas;
    }

    getCanvasPixelRatio() {
        const rawRatio = (window.devicePixelRatio || 1) * currentScale;
        const cappedRatio = Math.min(MAX_CANVAS_PIXEL_RATIO, rawRatio);
        return Math.max(0.25, Math.round(cappedRatio / CANVAS_PIXEL_RATIO_STEP) * CANVAS_PIXEL_RATIO_STEP);
    }

    getSpritePixelRatio() {
        if (isZooming && lastCanvasPixelRatio > 0) {
            return lastCanvasPixelRatio;
        }

        return this.getCanvasPixelRatio();
    }

    syncCanvasResolution() {
        if (!gridCanvas || !gridContext || gridPixelWidth <= 0 || gridPixelHeight <= 0) {
            return;
        }

        const pixelRatio = this.getCanvasPixelRatio();
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
            renderWarmupManager.scheduleSpritePrewarm(60);
        }
    }

    scheduleZoomRender() {
        isZooming = true;
        if (zoomRenderDebounceTimer) {
            clearTimeout(zoomRenderDebounceTimer);
        }

        zoomRenderDebounceTimer = setTimeout(() => {
            zoomRenderDebounceTimer = null;
            isZooming = false;
            this.syncCanvasResolution();
            queueCanvasRender();
        }, ZOOM_RENDER_DEBOUNCE_MS);
    }

    flushZoomRender() {
        if (zoomRenderDebounceTimer) {
            clearTimeout(zoomRenderDebounceTimer);
            zoomRenderDebounceTimer = null;
        }

        isZooming = false;
        this.syncCanvasResolution();
        queueCanvasRender();
    }

    getImageAsset(source) {
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
                asset.fallback = this.getImageAsset(QUESTION_MARK_ICON);
            }
            queueCanvasRender();
        };

        image.src = src;
        imageAssetCache.set(src, asset);
        return asset;
    }

    resolveImageForDraw(source) {
        const asset = this.getImageAsset(source);
        const fallbackAsset = this.getImageAsset(QUESTION_MARK_ICON);

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
}

class CanvasFrameManager {
    queueCanvasRender() {
        if (!gridContext || canvasFrameId !== null) {
            return;
        }

        canvasFrameId = requestAnimationFrame(timestamp => this.drawCanvasFrame(timestamp));
    }

    drawCanvasFrame(timestamp) {
        canvasFrameId = null;
        const keepAnimating = canvasSpriteManager.renderGridCanvas(timestamp);
        if (keepAnimating) {
            this.queueCanvasRender();
        }
    }
}

class CanvasSpriteManager {
    drawRoundedRect(context, x, y, width, height, radius) {
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

    getCellImageDrawState(imageSource) {
        if (!imageSource) {
            return {
                image: null,
                key: 'none',
                hasImageSource: false
            };
        }

        const image = canvasRuntimeManager.resolveImageForDraw(imageSource);
        const asset = imageAssetCache.get(imageSource) || canvasRuntimeManager.getImageAsset(imageSource);

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

    getContainedImageRect(image, boxX, boxY, boxWidth, boxHeight) {
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

    getCellSpriteKey(cell, imageKey) {
        const pixelRatioKey = Math.round(canvasRuntimeManager.getSpritePixelRatio() * 1000);
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

    getBackgroundSpriteKey(state) {
        return `bg::${activeTheme}::${state}@${Math.round(canvasRuntimeManager.getSpritePixelRatio() * 1000)}`;
    }

    drawCellBackgroundSprite(spriteContext, state, options = {}) {
        const { skipBadge = false, borderColor = '' } = options;
        const x = 0;
        const y = 0;

        const themePalette = uiSettings.getActiveCellPalette();
        const palette = themePalette[state] || themePalette.hidden;
        const borderWidth = palette.borderWidth || 1;

        this.drawRoundedRect(spriteContext, x, y, CELL_SIZE, CELL_SIZE, CELL_RADIUS);
        spriteContext.fillStyle = palette.fill;
        spriteContext.fill();

        const borderInset = borderWidth / 2;
        const borderRadius = Math.max(0, CELL_RADIUS - borderInset);
        this.drawRoundedRect(
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

            this.drawRoundedRect(spriteContext, badgeX, badgeY, badgeWidth, badgeHeight, 7);
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

    drawCellSpriteForeground(spriteContext, cell, palette, imageState) {
        const state = cell.state || 'hidden';
        const x = 0;
        const y = 0;
        const imageSize = state === 'locked' ? 42 : 30;
        const imageX = x + ((CELL_SIZE - imageSize) / 2);
        const imageY = y + (state === 'locked' ? 22 : 14);

        if (imageState.image) {
            const imageRect = this.getContainedImageRect(imageState.image, imageX, imageY, imageSize, imageSize);
            spriteContext.save();
            spriteContext.shadowColor = uiSettings.getActiveCellPalette().imageShadow;
            spriteContext.shadowBlur = 6;
            spriteContext.shadowOffsetY = 2;
            spriteContext.drawImage(imageState.image, imageRect.x, imageRect.y, imageRect.width, imageRect.height);
            spriteContext.restore();
        } else if (imageState.hasImageSource) {
            this.drawRoundedRect(spriteContext, imageX + 2, imageY + 2, imageSize - 4, imageSize - 4, 8);
            spriteContext.fillStyle = uiSettings.getActiveCellPalette().placeholderFill;
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

    ensureBackgroundSprite(state) {
        if (!state || state === 'hidden') {
            return null;
        }

        const spriteKey = this.getBackgroundSpriteKey(state);
        if (backgroundSpriteCache.has(spriteKey)) {
            return backgroundSpriteCache.get(spriteKey);
        }

        const pixelRatio = canvasRuntimeManager.getSpritePixelRatio();
        const spriteCanvas = document.createElement('canvas');
        spriteCanvas.width = Math.max(1, Math.round(CELL_SIZE * pixelRatio));
        spriteCanvas.height = Math.max(1, Math.round(CELL_SIZE * pixelRatio));
        const spriteContext = spriteCanvas.getContext('2d');
        if (!spriteContext) {
            return null;
        }

        spriteContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        spriteContext.imageSmoothingEnabled = false;
        this.drawCellBackgroundSprite(spriteContext, state);

        backgroundSpriteCache.set(spriteKey, spriteCanvas);
        return spriteCanvas;
    }

    ensureCellSprite(cell) {
        if (!cell || cell.state === 'hidden') {
            return null;
        }

        const imageSource = cell.state === 'locked'
            ? LOCKED_TILE_IMAGE
            : (cell.state === 'incomplete' || cell.state === 'complete' ? cell.task.imageLink : null);
        const imageState = this.getCellImageDrawState(imageSource);
        const spriteKey = this.getCellSpriteKey(cell, imageState.key);

        if (cell.state === 'locked' && backgroundSpriteCache.has(spriteKey)) {
            return backgroundSpriteCache.get(spriteKey);
        }

        if (cell.spriteCanvas && cell.spriteKey === spriteKey) {
            return cell.spriteCanvas;
        }

        const pixelRatio = canvasRuntimeManager.getSpritePixelRatio();
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

        const themePalette = uiSettings.getActiveCellPalette();
        const palette = themePalette[cell.state] || themePalette.hidden;

        const borderColor = cell.state === 'incomplete'
            ? uiSettings.getTierColor(cell.task?.tier)
            : '';

        this.drawCellBackgroundSprite(spriteContext, cell.state, { borderColor });
        this.drawCellSpriteForeground(spriteContext, cell, palette, imageState);

        if (cell.state === 'locked') {
            backgroundSpriteCache.set(spriteKey, spriteCanvas);
            return spriteCanvas;
        }

        cell.spriteCanvas = spriteCanvas;
        cell.spriteKey = spriteKey;

        return spriteCanvas;
    }

    getEdgeCellSpriteKey(edgeSides) {
        const pixelRatioKey = Math.round(canvasRuntimeManager.getSpritePixelRatio() * 1000);
        const t = edgeSides.top ? 1 : 0;
        const r = edgeSides.right ? 1 : 0;
        const b = edgeSides.bottom ? 1 : 0;
        const l = edgeSides.left ? 1 : 0;
        return `edge::${activeTheme}::${t}${r}${b}${l}@${pixelRatioKey}`;
    }

    ensureEdgeCellSprite(edgeSides) {
        const spriteKey = this.getEdgeCellSpriteKey(edgeSides);
        if (backgroundSpriteCache.has(spriteKey)) {
            return backgroundSpriteCache.get(spriteKey);
        }

        const pixelRatio = canvasRuntimeManager.getSpritePixelRatio();
        const pxSize = Math.max(1, Math.round(CELL_SIZE * pixelRatio));

        const fade2 = CELL_SIZE * 0.10;

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

        if (edgeSides.left)   drawFade(0, 0, fade2, 0, 0, 0, fade2, CELL_SIZE);
        if (edgeSides.right)  drawFade(CELL_SIZE, 0, CELL_SIZE - fade2, 0, CELL_SIZE - fade2, 0, fade2, CELL_SIZE);
        if (edgeSides.top)    drawFade(0, 0, 0, fade2, 0, 0, CELL_SIZE, fade2);
        if (edgeSides.bottom) drawFade(0, CELL_SIZE, 0, CELL_SIZE - fade2, 0, CELL_SIZE - fade2, CELL_SIZE, fade2);

        const spriteCanvas = document.createElement('canvas');
        spriteCanvas.width = pxSize;
        spriteCanvas.height = pxSize;
        const spriteContext = spriteCanvas.getContext('2d');
        if (!spriteContext) {
            return null;
        }

        spriteContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        spriteContext.imageSmoothingEnabled = false;
        this.drawCellBackgroundSprite(spriteContext, 'locked', { skipBadge: true });

        spriteContext.globalCompositeOperation = 'destination-in';
        spriteContext.drawImage(maskCanvas, 0, 0, CELL_SIZE, CELL_SIZE);
        spriteContext.globalCompositeOperation = 'source-over';

        backgroundSpriteCache.set(spriteKey, spriteCanvas);
        return spriteCanvas;
    }

    drawCanvasCell(context, cell, now) {
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

            const progress = CoreUtils.clamp(elapsed / POP_DURATION_MS, 0, 1);
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
                    alpha = CoreUtils.clamp(up * 1.2, 0, 1);
                } else {
                    const down = (progress - 0.5) / 0.5;
                    scale = 1.2 - (0.2 * down);
                    alpha = 1;
                }
            }
        }

        const hoverTarget = hoveredCellId === cell.id && canvasInteractionManager.isCellHoverable(cell) ? 1 : 0;
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

        alpha *= uiSettings.getTierOpacityForCell(cell);

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

            const edgeSprite = this.ensureEdgeCellSprite(cell.edgeSides);
            if (edgeSprite) {
                context.drawImage(edgeSprite, x, y, CELL_SIZE, CELL_SIZE);
            }

            context.restore();
            return keepAnimating;
        }

        const sprite = this.ensureCellSprite(cell);
        if (sprite) {
            context.drawImage(sprite, x, y, CELL_SIZE, CELL_SIZE);
        }

        if (!(hideTierHintOnLocked && state === 'locked')) {
            context.beginPath();
            context.arc(x + CELL_SIZE - 8, y + 8, 4, 0, Math.PI * 2);
            context.fillStyle = uiSettings.getTierColor(cell.task.tier);
            context.fill();
        }

        if (hoverProgress > 0.001) {
            context.save();
            this.drawRoundedRect(context, x + 0.75, y + 0.75, CELL_SIZE - 1.5, CELL_SIZE - 1.5, CELL_RADIUS - 1);
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

    renderGridCanvas(now = performance.now()) {
        if (!gridContext || !gridCanvas) {
            return false;
        }

        const visibleBounds = gridViewport.getVisibleWorldBounds();
        const clearRect = gridViewport.getVisibleClearRect(visibleBounds);
        gridContext.clearRect(clearRect.x, clearRect.y, clearRect.width, clearRect.height);
        const visibleCoords = gridViewport.getVisibleCoordBounds(visibleBounds);
        if (!visibleCoords) {
            return false;
        }

        let keepAnimating = false;
        for (let y = visibleCoords.top; y <= visibleCoords.bottom; y++) {
            for (let x = visibleCoords.left; x <= visibleCoords.right; x++) {
                const taskId = gridManager.getTaskByCoord(x, y);
                if (!taskId) {
                    continue;
                }

                const cell = CoreUtils.getCellById(taskId);
                if (!cell) {
                    continue;
                }

                const cellAnimating = this.drawCanvasCell(gridContext, cell, now);
                keepAnimating = keepAnimating || cellAnimating;
            }
        }

        return keepAnimating;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('task-modal');
    const tierTasksModal = document.getElementById('tier-tasks-modal');
    const close = modal.querySelector('.modal-close');
    const tierTasksClose = document.getElementById('tier-tasks-close');
    const tierProgressButton = document.getElementById('tier-progress-button');
    const currentTasksButton = document.getElementById('current-tasks-button');

    uiSettings.initThemeToggle();
    uiSettings.initOptionsMenu();

    close.addEventListener('click', () => taskModal.hideModal());

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

    const unlockToastClose = document.querySelector('#unlock-toast .unlock-toast-close');
    if (unlockToastClose) {
        unlockToastClose.addEventListener('click', () => {
            hudManager.dismissUnlockToast();
        });
    }

    const syncSummaryToastClose = document.querySelector('#sync-summary-toast .unlock-toast-close');
    if (syncSummaryToastClose) {
        syncSummaryToastClose.addEventListener('click', () => {
            hudManager.dismissSyncSummaryToast();
        });
    }

    document.addEventListener('mousedown', e => {
        const clickedPopover = e.target.closest('#task-modal .modal-content');
        if (modal.classList.contains('open') && !clickedPopover) {
            taskModal.hideModal();
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
            uiSettings.closeOptionsPopover();
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            taskModal.hideModal();
            taskPanels.hideTierTasksModal();
            taskPanels.closeCurrentTasksPopover();
            uiSettings.closeOptionsPopover();
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
                const completedCount = await progressSyncManager.syncPlayerProgress();
                syncButton.disabled = false;
                syncButton.textContent = completedCount === 1
                    ? 'Wiki synced 1 task'
                    : `Wiki synced ${completedCount} tasks`;
                syncButtonStatusTimer = setTimeout(() => {
                    syncButton.textContent = 'Wiki Sync';
                    syncButtonStatusTimer = null;
                }, SYNC_DURATION_MS);
            } catch (e) {
                console.error(e);
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

class RenderWarmupManager {
    prewarmCellSprites() {
        idToCell.forEach(cell => {
            if (cell.state === 'hidden') {
                if (cell.edgeVisible && (cell.edgeSides.top || cell.edgeSides.right || cell.edgeSides.bottom || cell.edgeSides.left)) {
                    canvasSpriteManager.ensureEdgeCellSprite(cell.edgeSides);
                }
            } else {
                canvasSpriteManager.ensureCellSprite(cell);
            }
        });
    }

    prewarmVisibleCellSprites() {
        const visibleBounds = gridViewport.getVisibleWorldBounds();
        const visibleCoords = gridViewport.getVisibleCoordBounds(visibleBounds);
        if (!visibleCoords) {
            return;
        }

        for (let y = visibleCoords.top; y <= visibleCoords.bottom; y++) {
            for (let x = visibleCoords.left; x <= visibleCoords.right; x++) {
                const taskId = gridManager.getTaskByCoord(x, y);
                if (!taskId) {
                    continue;
                }

                const cell = CoreUtils.getCellById(taskId);
                if (!cell) {
                    continue;
                }

                if (cell.state === 'hidden') {
                    if (cell.edgeVisible && (cell.edgeSides.top || cell.edgeSides.right || cell.edgeSides.bottom || cell.edgeSides.left)) {
                        canvasSpriteManager.ensureEdgeCellSprite(cell.edgeSides);
                    }
                } else {
                    canvasSpriteManager.ensureCellSprite(cell);
                }
            }
        }
    }

    scheduleSpritePrewarm(delay = 0) {
        if (spritePrewarmTimer) {
            clearTimeout(spritePrewarmTimer);
        }

        spritePrewarmTimer = setTimeout(() => {
            spritePrewarmTimer = null;
            this.prewarmCellSprites();
            queueCanvasRender();
        }, delay);
    }

    async preloadTaskImages(tasks) {
        const sources = new Set([LOCKED_TILE_IMAGE, QUESTION_MARK_ICON]);

        tasks.forEach(task => {
            const state = taskManager.getState(task.id);
            if (state === 'incomplete' || state === 'complete' || state === 'locked') {
                sources.add(task.imageLink);
            }
        });

        await Promise.all(Array.from(sources).map(source => new Promise(resolve => {
            const asset = canvasRuntimeManager.getImageAsset(source);
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

    waitForAnimationFrames(frameCount = 1) {
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

    async prewarmInitialCanvasSprites() {
        this.prewarmVisibleCellSprites();
        queueCanvasRender();
        await this.waitForAnimationFrames(2);
    }
}

class AppBootstrap {
    startApp() {
        const loader = document.getElementById('loading');
        if (loader) {
            loader.style.display = 'flex';
        }

        const loadingIcons = Array.from(document.querySelectorAll('#loading .loading-icon'));
        loadingIcons.forEach(icon => appUtils.bindImageErrorFallback(icon));
        loadingIcons.forEach((icon, index) => {
            const image = new Image();
            image.src = icon.src;
            setTimeout(() => icon.classList.add('visible'), index * 250);
        });

        const collectionLogPromise = wiki.loadCollectionLogItems();
        const playerDataPromise = wiki.loadPlayerData(playerUsername);

        taskOrderManager.loadAllTierData().then(data => {

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

            const introIdx = all.findIndex(task => task.id === INTRO_TASK_ID);
            if (introIdx < 0) {
                all.unshift(INTRO_TASK);
            } else if (introIdx !== 0) {
                all.splice(introIdx, 1);
                all.unshift(INTRO_TASK);
            }

            let shouldPersistStates = false;

            all.forEach(task => {
                const taskId = String(task.id);
                if (!taskManager.getState(taskId)) {
                    stateMap[taskId] = taskId === INTRO_TASK_ID ? 'incomplete' : 'hidden';
                    shouldPersistStates = true;
                }
            });

            if (freshOrder && all.length > 0) {
                all.forEach((task, index) => {
                    const taskId = String(task.id);
                    const nextState = index === 0 ? 'incomplete' : 'hidden';
                    if (stateMap[taskId] !== nextState) {
                        stateMap[taskId] = nextState;
                        shouldPersistStates = true;
                    }
                });
            }

            if (shouldPersistStates) {
                CoreUtils.saveStates(stateMap);
            }

            all = taskManager.setTasks(all);
            uiSettings.applyTierFilters(selectedTierFilters, { persist: false, rerender: false });
            gridManager.updateTaskCoordinates(all);

            if (!freshOrder && taskListChanged) {
                taskOrderManager.rebuildHiddenAndLockedStatesFromProgress(all);
            }

            taskManager.normalizeUnlockStates();
            hudManager.updateUnlockHud();

            const preloadPromise = renderWarmupManager.preloadTaskImages(all);
            void preloadPromise.catch(() => {
                // image preloading is best-effort; startup render should not block on it
            });

            const finish = async () => {
                await renderWarmupManager.prewarmInitialCanvasSprites();
                setTimeout(async () => {
                    const readyLoader = document.getElementById('loading');
                    if (readyLoader) {
                        readyLoader.style.display = 'none';
                    }

                    gridSceneManager.render(all);
                }, 2e3);
            };

            finish().catch(() => {
                gridSceneManager.render(all);
                const fallbackLoader = document.getElementById('loading');
                if (fallbackLoader) {
                    fallbackLoader.style.display = 'none';
                }
            });

            void collectionLogPromise.then(() => {
                taskModal.refreshOpenModal();
            });

            void playerDataPromise.then(playerSnapshot => {
                if (!playerSnapshot) {
                    return;
                }

                playerProgress.applySnapshot(playerSnapshot);
                progressSyncManager.notifyAutoWikiLoadAutoCompletableTasks();
                taskModal.refreshOpenModal();
            });

            taskOrderManager.saveTaskGridOrder(all);

            const container = document.getElementById('grid-container');
            let isPointerDown = false;
            let isDragging = false;
            let dragButton = null;
            let dragStartX = 0;
            let dragStartY = 0;
            let lastX = 0;
            let lastY = 0;

            gridViewport.bindWheelZoom(container);

            container.addEventListener('scroll', () => {
                if (!isZooming) {
                    queueCanvasRender();
                }
                taskModal.refreshPopoverPosition();
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
                    taskModal.refreshPopoverPosition();
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

    initUsernameGate() {
        const gate = document.getElementById('username-gate');
        const form = document.getElementById('username-form');
        const input = document.getElementById('username-input');
        const submit = document.getElementById('username-submit');
        const error = document.getElementById('username-error');

        const startWithUsername = username => {
            playerUsername = wiki.normalizeUsername(username);
            appSettings[USERNAME_KEY] = playerUsername;
            persistAppSettings();

            if (gate) {
                gate.style.display = 'none';
            }

            if (!hasStartedApp) {
                hasStartedApp = true;
                this.startApp();
            }
        };

        const savedUsername = wiki.normalizeUsername(
            appSettings[USERNAME_KEY] ?? localStorage.getItem(USERNAME_KEY)
        );
        if (savedUsername) {
            if (appSettings[USERNAME_KEY] !== savedUsername) {
                appSettings[USERNAME_KEY] = savedUsername;
                persistAppSettings();
            }
            startWithUsername(savedUsername);
            return;
        } else {
            form.style.display = 'block';
        }

        if (!gate || !form || !input || !submit || !error) {
            if (!hasStartedApp) {
                hasStartedApp = true;
                this.startApp();
            }
            return;
        }

        gate.style.display = 'flex';
        input.focus();

        form.addEventListener('submit', e => {
            e.preventDefault();
            const username = wiki.normalizeUsername(input.value);
            if (!username) {
                error.textContent = 'Please enter a username.';
                return;
            }

            error.textContent = '';
            submit.disabled = true;
            startWithUsername(username);
        });
    }
}

const wiki = new Wiki();
import gridManager from './GridManager.js';
const taskManager = new TaskManager();
const gameController = new GameController(gridManager, taskManager);
const playerProgress = new PlayerProgress();
const taskOrderManager = new TaskOrderManager(taskManager, gridManager);
const taskVerification = new TaskVerification(taskManager, playerProgress, taskOrderManager);
const taskPanels = new TaskPanels(taskManager);
const gameDataUtils = new GameDataUtils();
const tierUtils = new TierUtils();
const appUtils = new AppUtils();
const uiSettings = new UiSettings(taskManager);
const hudManager = new HudManager(taskManager, taskPanels);
const taskModal = new TaskModal();
const progressSyncManager = new ProgressSyncManager();
const gridViewport = new GridViewport();
const canvasInteractionManager = new CanvasInteractionManager();
const gridSceneManager = new GridSceneManager();
const canvasRuntimeManager = new CanvasRuntimeManager();
const canvasFrameManager = new CanvasFrameManager();
const queueCanvasRender = () => canvasFrameManager.queueCanvasRender();
const canvasSpriteManager = new CanvasSpriteManager();
const renderWarmupManager = new RenderWarmupManager();
const appBootstrap = new AppBootstrap();
appBootstrap.initUsernameGate();
