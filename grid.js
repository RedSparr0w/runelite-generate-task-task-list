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
const STATES = ['hidden', 'locked', 'incomplete', 'complete'];
const DRAG_THRESHOLD = 6;
const STATE_KEY = 'taskStates';
const STORAGE_KEY = 'taskGridOrder';
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const ZOOM_FACTOR = 1.1;
const POP_STAGGER_MS = 50;
const POP_DURATION_MS = 400;
const EDGE_POP_OFFSET_MS = 120;
const UNLOCK_TOAST_DURATION_MS = 4500;
const CL_CACHE_KEY = 'collectionLogCache';
const CL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

let suppressTaskClick = false;
let tasksGlobal = [];
let currentScale = 1;
let activePopoverAnchor = null;
let stateMap = loadStates();

const idToCoords = new Map();

// collection log item map: id -> { name, category, wikiLink, imageUrl }
let collectionLogMap = new Map();

async function loadCollectionLogItems() {
    try {
        const raw = localStorage.getItem(CL_CACHE_KEY);
        if (raw) {
            const { ts, data } = JSON.parse(raw);
            if (Date.now() - ts < CL_CACHE_TTL) {
                data.forEach(item => {
                    collectionLogMap.set(item.id, buildClEntry(item.name, item.category));
                });
                return;
            }
        }
    } catch { /* ignore corrupt cache */ }

    try {
        const url = 'https://oldschool.runescape.wiki/api.php?action=query&titles=Module:Collection_log%2Fdata.json&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&origin=*';
        const resp = await fetch(url);
        const json = await resp.json();
        const content = json.query.pages[0].revisions[0].slots.main.content;
        const items = JSON.parse(content);

        const cacheData = [];
        items.forEach(item => {
            const category = item.tabs?.[0] || '';
            collectionLogMap.set(item.id, buildClEntry(item.name, category));
            cacheData.push({ id: item.id, name: item.name, category });
        });

        try {
            localStorage.setItem(CL_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: cacheData }));
        } catch { /* ignore localStorage failures */ }
    } catch (e) {
        console.warn('Failed to load collection log data', e);
    }
}

function buildClEntry(name, category) {
    const encoded = encodeURIComponent(name.replace(/ /g, '_'));
    return {
        name,
        category,
        wikiLink: `https://oldschool.runescape.wiki/w/${encoded}`,
        imageUrl: `https://oldschool.runescape.wiki/w/Special:Redirect/file/${encoded}.png`
    };
}

async function loadAll() {
    const promises = tiers.map(name => fetch(`./tiers/${name}.json`).then(r => r.json()));
    return Promise.all(promises);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
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

function getState(id) {
    return stateMap[id];
}

function setState(id, state) {
    stateMap[id] = state;
    saveStates(stateMap);
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

function refreshPopoverPosition() {
    if (activePopoverAnchor && document.body.contains(activePopoverAnchor)) {
        positionPopover(activePopoverAnchor);
    } else if (activePopoverAnchor) {
        hideModal();
    }
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
        refreshPopoverPosition();
    }, { passive: false });

    window.addEventListener('resize', () => {
        updateGridScale();
        refreshPopoverPosition();
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
    cell.classList.remove(...STATES.map(state => `state-${state}`));
    cell.classList.add(`state-${nextState}`);
    applyCellContent(cell, nextState);
}

function createCell(task) {
    const el = document.createElement('div');
    const state = getState(task.id) || 'incomplete';

    el.className = 'cell';
    el.dataset.id = task.id;
    el._task = task;
    el.classList.add(`tier-${task.tier}`);
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
        if (e.button !== 0 || suppressTaskClick) {
            return;
        }
        const currentState = getState(task.id) || 'hidden';
        if (currentState === 'hidden') {
            return;
        }
        showModal(task, el);
    });

    el.addEventListener('contextmenu', e => {
        e.preventDefault();
        const currentState = getState(task.id) || 'hidden';
        if (currentState === 'incomplete' || currentState === 'complete') {
            window.open(task.wikiLink, '_blank');
        }
    });

    return el;
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
    setState(id, 'locked');
    const cell = document.querySelector(`.cell[data-id="${id}"]`);
    if (!cell) {
        return;
    }

    setCellState(cell, 'locked');
    playPopReveal(cell, { addVisible: true });
}

function playPopReveal(cell, options = {}) {
    const { addVisible = false, delay = 0 } = options;
    if (!cell) {
        return;
    }

    const run = () => {
        cell.classList.remove('reveal');
        void cell.offsetWidth;
        cell.classList.add('reveal');
        setTimeout(() => {
            cell.classList.remove('reveal');
            if (addVisible) {
                cell.classList.add('visible');
            }
        }, POP_DURATION_MS);
    };

    if (delay > 0) {
        setTimeout(run, delay);
    } else {
        run();
    }
}

function refreshHiddenEdges(options = {}) {
    const { animate = false, center = null, revealDelayByCoord = null, edgeDelayOffset = EDGE_POP_OFFSET_MS } = options;
    const stateByCoord = new Map();
    const isFrontierState = state => state === 'incomplete' || state === 'locked';
    const newlyVisibleEdges = [];

    idToCoords.forEach((coord, id) => {
        stateByCoord.set(`${coord.x},${coord.y}`, getState(id));
    });

    idToCoords.forEach((coord, id) => {
        const cell = document.querySelector(`.cell[data-id="${id}"]`);
        if (!cell) {
            return;
        }

        const hadVisibleEdge = cell.classList.contains('state-hidden-edge');
        cell.classList.remove('state-hidden-edge', 'hidden-edge-top', 'hidden-edge-right', 'hidden-edge-bottom', 'hidden-edge-left');

        if (getState(id) !== 'hidden') {
            return;
        }

        let hasVisibleEdge = false;
        let minAdjacentDelay = Number.POSITIVE_INFINITY;

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
            cell.classList.add('hidden-edge-top');
            hasVisibleEdge = true;
            noteAdjacentDelay(coord.x, coord.y - 1);
        }
        if (isFrontierState(stateByCoord.get(`${coord.x + 1},${coord.y}`))) {
            cell.classList.add('hidden-edge-right');
            hasVisibleEdge = true;
            noteAdjacentDelay(coord.x + 1, coord.y);
        }
        if (isFrontierState(stateByCoord.get(`${coord.x},${coord.y + 1}`))) {
            cell.classList.add('hidden-edge-bottom');
            hasVisibleEdge = true;
            noteAdjacentDelay(coord.x, coord.y + 1);
        }
        if (isFrontierState(stateByCoord.get(`${coord.x - 1},${coord.y}`))) {
            cell.classList.add('hidden-edge-left');
            hasVisibleEdge = true;
            noteAdjacentDelay(coord.x - 1, coord.y);
        }

        if (hasVisibleEdge) {
            if (animate && !hadVisibleEdge) {
                const hasTimedNeighbor = Number.isFinite(minAdjacentDelay);
                newlyVisibleEdges.push({
                    cell,
                    coord,
                    startDelay: hasTimedNeighbor ? minAdjacentDelay + edgeDelayOffset : edgeDelayOffset
                });
            } else {
                cell.classList.add('state-hidden-edge');
            }
        }
    });

    if (!animate || newlyVisibleEdges.length === 0) {
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
        const startDelay = Math.max(item.startDelay ?? edgeDelayOffset, index * POP_STAGGER_MS);
        setTimeout(() => {
            const cellId = item.cell.dataset.id;
            if (getState(cellId) !== 'hidden') {
                return;
            }
            const stillHasEdgeSide =
                item.cell.classList.contains('hidden-edge-top') ||
                item.cell.classList.contains('hidden-edge-right') ||
                item.cell.classList.contains('hidden-edge-bottom') ||
                item.cell.classList.contains('hidden-edge-left');
            if (!stillHasEdgeSide) {
                return;
            }
            item.cell.classList.add('state-hidden-edge');
            playPopReveal(item.cell);
        }, startDelay);
    });
}

function showModal(task, anchor) {
    const modal = document.getElementById('task-modal');
    const title = document.getElementById('modal-title');
    const image = document.getElementById('modal-image');
    const tip = document.getElementById('modal-tip');
    const wiki = document.getElementById('modal-wiki');
    const button = document.getElementById('modal-complete');
    const cell = document.querySelector(`.cell[data-id="${task.id}"]`);
    const state = getState(task.id) || 'incomplete';

    if (state === 'locked') {
        title.textContent = 'Locked Task';
        image.src = LOCKED_TILE_IMAGE;
        image.alt = 'Locked task';
        tip.textContent = 'Unlock this tile to reveal what task is here.';
        wiki.style.display = 'none';
    } else {
        title.textContent = task.name;
        image.src = task.imageLink;
        image.alt = task.name;
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
            const prevLimit = getUnlockLimit();
            setState(task.id, 'complete');
            const newLimit = getUnlockLimit();
            if (newLimit > prevLimit) {
                showUnlockToast(newLimit);
            }
            if (cell) {
                setCellState(cell, 'complete');
            }

            const coords = idToCoords.get(task.id);
            if (coords) {
                const { x, y } = coords;
                idToCoords.forEach((coord, id) => {
                    const isNeighbor =
                        (coord.x === x && (coord.y === y - 1 || coord.y === y + 1)) ||
                        (coord.y === y && (coord.x === x - 1 || coord.x === x + 1));
                    if (isNeighbor && getState(id) === 'hidden') {
                        revealNeighborAsLocked(id);
                    }
                });
            }

            updateUnlockHud();
            refreshHiddenEdges({ animate: true });
            hideModal();
        };
    } else if (state === 'locked') {
        const unlockLimit = getUnlockLimit();
        const unlockedCount = getUnlockedCount();
        const unlockAvailable = canUnlockMore();

        button.type = 'button';
        button.style.display = 'block';
        button.disabled = !unlockAvailable;
        button.textContent = unlockAvailable
            ? `Unlock task (${unlockedCount}/${unlockLimit})`
            : `Unlock limit reached (${unlockedCount}/${unlockLimit})`;
        button.onclick = unlockAvailable ? e => {
            e.preventDefault();
            setState(task.id, 'incomplete');
            if (cell) {
                setCellState(cell, 'incomplete');
            }
            updateUnlockHud();
            refreshHiddenEdges({ animate: true });
            hideModal();
        } : null;
    } else {
        button.style.display = 'none';
        button.disabled = false;
        button.onclick = null;
    }

    const itemsEl = document.getElementById('modal-items');
    if (itemsEl) {
        const itemIds = state !== 'locked' ? (task.verification?.itemIds || []) : [];
        itemsEl.innerHTML = '';
        if (itemIds.length > 0) {
            itemsEl.classList.toggle('is-scrollable', itemIds.length > 20);
            itemIds.forEach(id => {
                const info = collectionLogMap.get(id);
                const link = document.createElement('a');
                link.href = info ? info.wikiLink : '#';
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.title = info ? `${info.name}${info.category ? ` (${info.category})` : ''}` : `Item ID: ${id}`;
                link.className = 'modal-item-icon';
                const img = document.createElement('img');
                img.width = 32;
                img.height = 32;
                img.loading = 'lazy';
                img.decoding = 'async';
                if (info) {
                    img.src = info.imageUrl;
                    img.alt = info.name;
                } else {
                    img.alt = `Item ${id}`;
                }
                link.appendChild(img);
                itemsEl.appendChild(link);
            });
            itemsEl.style.display = 'grid';
        } else {
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
    hideModal();
    grid.innerHTML = '';

    const size = computeGridSize(tasks.length);
    const coords = generateSpiral(tasks.length, size);
    const center = { x: coords[0][0], y: coords[0][1] };
    const cells = [];
    let firstCell = null;

    grid.style.setProperty('--grid-size', size);
    idToCoords.clear();

    tasks.forEach((task, index) => {
        const [x, y] = coords[index];
        const cell = createCell(task);
        idToCoords.set(task.id, { x, y });
        cell.style.gridColumnStart = x + 1;
        cell.style.gridRowStart = y + 1;
        grid.appendChild(cell);
        cells.push({ cell, x, y });
        if (index === 0) {
            firstCell = cell;
        }
    });

    const visibleCells = cells.filter(item => getState(item.cell.dataset.id) !== 'hidden');
    const sortedVisibleCells = visibleCells
        .sort((a, b) => {
            const distanceA = Math.abs(a.x - center.x) + Math.abs(a.y - center.y);
            const distanceB = Math.abs(b.x - center.x) + Math.abs(b.y - center.y);
            return distanceA - distanceB;
        });
    const revealDelayByCoord = new Map();

    sortedVisibleCells.forEach((item, index) => {
        const revealDelay = index * POP_STAGGER_MS;
        revealDelayByCoord.set(`${item.x},${item.y}`, revealDelay);
        playPopReveal(item.cell, { addVisible: true, delay: revealDelay });
    });

    refreshHiddenEdges({ animate: true, center, revealDelayByCoord });
    updateGridScale();
    updateUnlockHud();

    if (firstCell) {
        firstCell.scrollIntoView({ block: 'center', inline: 'center' });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('task-modal');
    const close = modal.querySelector('.modal-close');

    close.addEventListener('click', hideModal);

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
        if (!modal.classList.contains('open')) {
            return;
        }

        const clickedPopover = e.target.closest('#task-modal .modal-content');
        const clickedTile = e.target.closest('.cell');
        if (!clickedPopover && !clickedTile) {
            hideModal();
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            hideModal();
        }
    });
});

const tierWeights = {
    easy: 100000,
    medium: 10000,
    hard: 100,
    elite: 10,
    master: 1,
    pets: 1
};

function preloadTaskImages(tasks) {
    return Promise.all(tasks.map(task => new Promise(resolve => {
        const state = getState(task.id);
        if (state === 'incomplete' || state === 'complete') {
            const image = new Image();
            image.onload = image.onerror = () => resolve();
            image.src = task.imageLink;
            return;
        }
        resolve();
    })));
}

Promise.all([loadAll(), loadCollectionLogItems()]).then(([data]) => {
    let all = [];

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const ids = JSON.parse(saved);
            const map = {};
            data.forEach(tierObj => {
                tierObj.tasks.forEach(task => {
                    map[task.id] = { ...task, tier: tierObj.name };
                });
            });

            all = ids.map(id => map[id]).filter(Boolean);
            data.forEach(tierObj => {
                tierObj.tasks.forEach(task => {
                    if (!ids.includes(task.id)) {
                        all.push({ ...task, tier: tierObj.name });
                    }
                });
            });
        } catch (error) {
            console.error('corrupt saved order', error);
        }
    }

    const freshOrder = all.length === 0;
    if (freshOrder) {
        data.forEach(tierObj => {
            const weight = tierWeights[tierObj.name] || 1;
            const tasks = tierObj.tasks.map(task => ({
                ...task,
                tier: tierObj.name,
                priority: Math.random() / weight
            }));
            shuffle(tasks);
            all = all.concat(tasks);
        });
        all.sort((a, b) => a.priority - b.priority);
    }

    all.forEach(task => {
        if (!getState(task.id)) {
            setState(task.id, 'hidden');
        }
    });

    if (freshOrder && all.length > 0) {
        all.forEach((task, index) => {
            setState(task.id, index === 0 ? 'incomplete' : 'hidden');
        });
        stateMap = loadStates();
    }

    tasksGlobal = all;
    normalizeUnlockStates();
    updateUnlockHud();

    const loadingIcons = Array.from(document.querySelectorAll('#loading .loading-icon'));
    loadingIcons.forEach(icon => {
        const image = new Image();
        image.src = icon.src;
    });

    let preloadDone = false;
    const preloadPromise = preloadTaskImages(all).then(() => {
        preloadDone = true;
    });

    function animateIcons(index) {
        if (index >= loadingIcons.length) {
            const finish = () => setTimeout(() => {
                render(all);
                const loader = document.getElementById('loading');
                if (loader) {
                    loader.style.display = 'none';
                }
            }, 500);

            if (preloadDone) {
                finish();
            } else {
                preloadPromise.then(finish);
            }
            return;
        }

        const icon = loadingIcons[index];
        icon.classList.add('visible');
        setTimeout(() => {
            animateIcons(index + 1);
        }, 400);
    }

    animateIcons(0);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all.map(task => task.id)));
    } catch {
        // ignore localStorage failures
    }

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