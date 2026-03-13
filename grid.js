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

async function loadAll() {
    const promises = tiers.map(name => fetch(`./tiers/${name}.json`).then(r => r.json()));
    const data = await Promise.all(promises);
    return data;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function computeGridSize(count) {
    let size = Math.ceil(Math.sqrt(count));
    if (size % 2 === 0) size += 1; // make odd so there is a true centre
    return size;
}

function generateSpiral(count, size) {
    const cx = Math.floor(size / 2);
    const cy = Math.floor(size / 2);
    const coords = [];
    let x = cx, y = cy;
    coords.push([x, y]);
    let step = 1;
    while (coords.length < count) {
        // move right step
        for (let i = 0; i < step && coords.length < count; i++) {
            x++;
            coords.push([x, y]);
        }
        // move down step
        for (let i = 0; i < step && coords.length < count; i++) {
            y++;
            coords.push([x, y]);
        }
        step++;
        // move left step
        for (let i = 0; i < step && coords.length < count; i++) {
            x--;
            coords.push([x, y]);
        }
        // move up step
        for (let i = 0; i < step && coords.length < count; i++) {
            y--;
            coords.push([x, y]);
        }
        step++;
    }
    return coords;
}

// valid states for tasks
const STATES = ['hidden', 'locked', 'incomplete', 'complete'];
const DRAG_THRESHOLD = 6;

let suppressTaskClick = false;

function createCell(task) {
    const el = document.createElement('div');
    el.className = 'cell';
    el.dataset.id = task.id;
    el._task = task;
    el.classList.add(`tier-${task.tier}`); // used only for indicator
    // apply stored state class
    const state = getState(task.id) || 'incomplete';
    el.classList.add(`state-${state}`);

    const img = document.createElement('img');
    img._src = task.imageLink;
    img.width = 48;
    img.height = 48;
    const name = document.createElement('div');
    name.className = 'task-name';
    el.appendChild(img);
    el.appendChild(name);

    applyCellContent(el, state);

    el.addEventListener('click', e => {
        if (e.button === 0) {
            if (suppressTaskClick) {
                return;
            }
            showModal(task);
        }
    });

    el.oncontextmenu = e => {
        e.preventDefault();
        const currentState = getState(task.id) || 'hidden';
        if (currentState === 'incomplete' || currentState === 'complete') {
            window.open(task.wikiLink, '_blank');
        }
    };
    return el;
}

// state storage helpers
const STATE_KEY = 'taskStates';
function loadStates() {
    try {
        const s = localStorage.getItem(STATE_KEY);
        if (!s) {
            return {};
        }

        const parsed = JSON.parse(s);
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
    try { localStorage.setItem(STATE_KEY, JSON.stringify(map)); } catch {}
}
let stateMap = loadStates();
function getState(id) { return stateMap[id]; }
function setState(id, state) { stateMap[id] = state; saveStates(stateMap); }

// keep copy of tasks for re-rendering when neighbours change
let tasksGlobal = [];
let currentScale = 1;

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const ZOOM_FACTOR = 1.1;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
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

function updateGridScale() {
    const grid = document.getElementById('grid');
    const stage = document.getElementById('grid-stage');
    if (!grid || !stage) {
        return;
    }

    currentScale = clamp(currentScale, getMinScale(), MAX_SCALE);

    grid.style.transform = `scale(${currentScale})`;
    stage.style.width = `${grid.scrollWidth * currentScale}px`;
    stage.style.height = `${grid.scrollHeight * currentScale}px`;
}

function bindWheelZoom(container) {
    container.addEventListener('wheel', e => {
        e.preventDefault();

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
        updateGridScale();

        container.scrollLeft = worldX * currentScale - pointerX;
        container.scrollTop = worldY * currentScale - pointerY;
    }, { passive: false });

    window.addEventListener('resize', () => {
        updateGridScale();
    });
}

function getCompletedCount() {
    return tasksGlobal.filter(task => getState(task.id) === 'complete').length;
}

function getUnlockLimit(completedCount = getCompletedCount()) {
    return Math.max(1, Math.floor(Math.sqrt(completedCount / 5)) + 1);
}

function getUnlockedCount() {
    return tasksGlobal.filter(task => getState(task.id) === 'incomplete').length;
}

function canUnlockMore() {
    return getUnlockedCount() < getUnlockLimit();
}

function getTasksUntilNextUnlock(completedCount = getCompletedCount()) {
    const currentLimit = getUnlockLimit(completedCount);
    const nextThreshold = 5 * currentLimit * currentLimit;
    return Math.max(0, nextThreshold - completedCount);
}

function updateUnlockHud() {
    const unlocks = document.getElementById('hud-unlocks');
    const nextUnlock = document.getElementById('hud-next-unlock');
    if (!unlocks || !nextUnlock) {
        return;
    }

    const completedCount = getCompletedCount();
    const totalUnlocks = getUnlockLimit(completedCount);
    const availableUnlocks = Math.max(0, totalUnlocks - getUnlockedCount());
    const tasksUntilNext = getTasksUntilNextUnlock(completedCount);

    unlocks.textContent = `${availableUnlocks} / ${totalUnlocks}`;
    nextUnlock.textContent = tasksUntilNext === 1 ? '1 task' : `${tasksUntilNext} tasks`;
}

function normalizeUnlockStates() {
    const unlockLimit = getUnlockLimit();
    const incompleteTasks = tasksGlobal.filter(task => getState(task.id) === 'incomplete');

    incompleteTasks.slice(unlockLimit).forEach(task => {
        setState(task.id, 'locked');
    });
}

function applyCellContent(cell, state) {
    const task = cell._task;
    const img = cell.querySelector('img');
    const name = cell.querySelector('.task-name');
    if (!task || !img || !name) {
        return;
    }

    if (state === 'locked') {
        img.src = LOCKED_TILE_IMAGE;
        img.alt = 'Locked task';
        name.textContent = '';
        return;
    }

    if (state === 'hidden') {
        img.removeAttribute('src');
        img.alt = '';
        name.textContent = '';
        return;
    }

    img.src = task.imageLink;
    img.alt = task.name;
    name.textContent = task.name;
}

function setCellState(cell, nextState) {
    cell.classList.remove('state-hidden', 'state-locked', 'state-incomplete', 'state-complete');
    cell.classList.add(`state-${nextState}`);
    applyCellContent(cell, nextState);
}

// modal helpers
function showModal(task) {
    const modal = document.getElementById('task-modal');
    const title = document.getElementById('modal-title');
    const img = document.getElementById('modal-image');
    const tip = document.getElementById('modal-tip');
    const wiki = document.getElementById('modal-wiki');
    const cell = document.querySelector(`.cell[data-id="${task.id}"]`);
    const btn = document.getElementById('modal-complete');
    const state = getState(task.id) || 'incomplete';

    if (state === 'locked') {
        title.textContent = 'Locked Task';
        img.src = LOCKED_TILE_IMAGE;
        img.alt = 'Locked task';
        tip.textContent = 'Unlock this tile to reveal what task is here.';
        wiki.style.display = 'none';
    } else {
        title.textContent = task.name;
        img.src = task.imageLink;
        img.alt = task.name;
        tip.textContent = task.tip || '';
        wiki.href = task.wikiLink || '#';
        wiki.style.display = 'inline-block';
    }

    if (state === 'incomplete') {
        btn.type = 'button';
        btn.disabled = false;
        btn.textContent = 'Mark complete';
        btn.style.display = 'block';
        btn.onclick = e => {
            e.preventDefault();
            setState(task.id, 'complete');
            if (cell) {
                setCellState(cell, 'complete');
            }

            // reveal four-direction neighbours as locked
            const coords = idToCoords.get(task.id);
            if (coords) {
                const { x, y } = coords;
                idToCoords.forEach((c, id) => {
                    if ((c.x === x && (c.y === y - 1 || c.y === y + 1)) ||
                        (c.y === y && (c.x === x - 1 || c.x === x + 1))) {
                        if (getState(id) === 'hidden') {
                            setState(id, 'locked');
                            const ncell = document.querySelector(`.cell[data-id="${id}"]`);
                            if (ncell) {
                                setCellState(ncell, 'locked');
                                ncell.classList.add('reveal');
                                setTimeout(() => {
                                    ncell.classList.remove('reveal');
                                    ncell.classList.add('visible');
                                }, 400);
                            }
                        }
                    }
                });
            }
            updateUnlockHud();
            hideModal();
        };
    } else if (state === 'locked') {
        const unlockLimit = getUnlockLimit();
        const unlockedCount = getUnlockedCount();
        const unlockAvailable = canUnlockMore();

        btn.type = 'button';
        btn.style.display = 'block';
        btn.disabled = !unlockAvailable;
        btn.textContent = unlockAvailable
            ? `Unlock task (${unlockedCount}/${unlockLimit})`
            : `Unlock limit reached (${unlockedCount}/${unlockLimit})`;
        btn.onclick = unlockAvailable ? e => {
            e.preventDefault();
            setState(task.id, 'incomplete');
            if (cell) {
                setCellState(cell, 'incomplete');
            }
            updateUnlockHud();
            hideModal();
        } : null;
    } else {
        btn.style.display = 'none';
        btn.disabled = false;
        btn.onclick = null;
    }
    modal.style.display = 'block';
}

function hideModal() {
    const modal = document.getElementById('task-modal');
    modal.style.display = 'none';
}

// attach close handler on load
window.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('task-modal');
    const close = modal.querySelector('.modal-close');
    close.addEventListener('click', hideModal);
    modal.addEventListener('click', e => {
        if (e.target === modal) hideModal();
    });
});

// maps for neighbor lookup
const idToCoords = new Map();
function render(tasks) {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    const size = computeGridSize(tasks.length);
    grid.style.setProperty('--grid-size', size);
    const coords = generateSpiral(tasks.length, size);
    idToCoords.clear();
    let firstCell = null;

    // create cells and keep track for later reveal
    const cells = [];
    tasks.forEach((t, idx) => {
        const [x, y] = coords[idx];
        idToCoords.set(t.id, {x,y});
        const cell = createCell(t);
        cell.style.gridColumnStart = x + 1;
        cell.style.gridRowStart = y + 1;
        grid.appendChild(cell);
        cells.push({cell, x, y});
        if (idx === 0) firstCell = cell;
    });
    // reveal centre first, then by increasing manhattan distance
    const center = {x: Math.floor(coords[0][0]), y: Math.floor(coords[0][1])};
    // only animate those that aren't hidden
    const toAnimate = cells.filter(c => getState(c.cell.dataset.id) !== 'hidden');
    toAnimate.sort((a,b) => (Math.abs(a.x-center.x)+Math.abs(a.y-center.y)) - (Math.abs(b.x-center.x)+Math.abs(b.y-center.y)));
    toAnimate.forEach((c, i) => {
        setTimeout(() => {
            c.cell.classList.add('reveal');
            // keep visible after animation
            setTimeout(() => c.cell.classList.add('visible'), 300);
        }, i * 50);
    });
    // hidden cells remain at opacity 0 due to state-hidden and do not delay others

    updateGridScale();
    updateUnlockHud();

    // once grid is in DOM, scroll the first (center) cell into view
    if (firstCell) {
        firstCell.scrollIntoView({ block: 'center', inline: 'center' });
    }
}

// weights used when interleaving tiers; higher means the tier tends to appear closer to the centre
const tierWeights = {
    easy: 100000,
    medium: 10000,
    hard: 100,
    elite: 10,
    master: 1,
    // fallback weights for other tiers
    // 'master-tedious': 1,
    // extra: 1,
    pets: 1
};

// helper to build a unique key for storing order
const STORAGE_KEY = 'taskGridOrder';

loadAll().then(data => {
    let all = [];
    // preload images for all tasks to avoid jank
    function preload(tasks) {
        const promises = tasks.map(t => new Promise(resolve => {
            const state = getState(t.id);
            if (state === 'incomplete' || state === 'complete') {
                const img = new Image();
                img.onload = img.onerror = () => resolve();
                img.src = t.imageLink;
            } else {
                resolve();
            }
        }));
        return Promise.all(promises);
    }
    tasksGlobal = all; // keep reference for neighbour updates

    // if we have a saved order, try to restore it
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const ids = JSON.parse(saved);
            // build a map of tasks by id for quick lookup
            const map = {};
            data.forEach(tierObj => {
                tierObj.tasks.forEach(t => {
                    map[t.id] = { ...t, tier: tierObj.name };
                });
            });
            // reconstruct order from saved ids; ignore missing
            all = ids.map(id => map[id]).filter(Boolean);
            // append any new tasks not in saved list
            data.forEach(tierObj => {
                tierObj.tasks.forEach(t => {
                    if (!map[t.id] || !ids.includes(t.id)) {
                        all.push({ ...t, tier: tierObj.name });
                    }
                });
            });
        } catch (e) {
            console.error('corrupt saved order', e);
        }
    }

    const freshOrder = all.length === 0;
    if (freshOrder) {
        // generate fresh list if we didn't restore
        data.forEach(tierObj => {
            const weight = tierWeights[tierObj.name] || 1;
            const arr = tierObj.tasks.map(t => ({
                ...t,
                tier: tierObj.name,
                priority: Math.random() / weight // lower is placed earlier
            }));
            shuffle(arr); // keep some randomness within tier
            all = all.concat(arr);
        });
        // sort by priority so that weighted tiers (easy) are earlier
        all.sort((a, b) => a.priority - b.priority);
    }

    // if there are new tasks added after a restore, give them hidden state by default
    all.forEach(task => {
        if (!getState(task.id)) {
            setState(task.id, 'hidden');
        }
    });

    // if we just generated a fresh order, set every task hidden except first
    if (freshOrder && all.length > 0) {
        all.forEach((t, idx) => setState(t.id, idx === 0 ? 'incomplete' : 'hidden'));
        stateMap = loadStates(); // reload updated map
    }

    // keep global reference
    tasksGlobal = all;
    normalizeUnlockStates();
    updateUnlockHud();

    // ensure images cached before rendering (wait for them)
    // preload loading icons themselves so they animate instantly
    const loadingIcons = Array.from(document.querySelectorAll('#loading .loading-icon'));
    loadingIcons.forEach(i => { const img=new Image(); img.src=i.src; });

    // animate loader icons in sequence; when finished and data loaded, show grid
    const icons = loadingIcons;
    let preloadDone = false;
    const preloadPromise = preload(all).then(() => { preloadDone = true; });
    function animateIcons(seqIndex) {
        if (seqIndex >= icons.length) {
            // after cycle pause briefly then render if preload done, otherwise wait
            const finish = () => setTimeout(() => {
                        render(all);
                        const loader = document.getElementById('loading');
                        if (loader) loader.style.display = 'none';
                    }, 500);
            if (preloadDone) finish(); else preloadPromise.then(finish);
            return;
        }
        const ic = icons[seqIndex];
        ic.classList.add('reveal'); // show with pop animation
        setTimeout(() => {
            ic.classList.remove('reveal');
            ic.classList.add('visible');
            animateIcons(seqIndex + 1);
        }, 400);
    }
    // kick off animation immediately
    animateIcons(0);

    // save order after rendering (just store ids)
    const saveIds = all.map(t => t.id);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saveIds));
    } catch (e) {
        console.warn('unable to save order', e);
    }

    // enable drag scrolling without opening task modals after a drag gesture
    const container = document.getElementById('grid-container');
    let isPointerDown = false;
    let isDragging = false;
    let dragButton = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let lastX = 0;
    let lastY = 0;
    bindWheelZoom(container);
    container.addEventListener('mousedown', e => {
        if (e.button === 0 || e.button === 1) { // middle button or left click
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
