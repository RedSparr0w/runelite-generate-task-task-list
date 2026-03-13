// simple grid rendering script
const tiers = [
    'easy',
    'medium',
    'hard',
    'elite',
    'master',
    'master-tedious',
    'extra',
    'pets'
];

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
const STATES = ['hidden','incomplete','current','complete'];

function createCell(task) {
    const el = document.createElement('div');
    el.className = 'cell';
    el.classList.add(`tier-${task.tier}`); // used only for indicator
    // apply stored state class
    const state = getState(task.id) || 'incomplete';
    el.classList.add(`state-${state}`);

    const img = document.createElement('img');
    img.src = task.imageLink;
    img.alt = task.name;
    img.width = 48;
    img.height = 48;
    const name = document.createElement('div');
    name.textContent = task.name;
    name.className = 'task-name';
    el.appendChild(img);
    el.appendChild(name);

    el.addEventListener('click', e => {
        if (e.button === 0) {
            showModal(task);
        }
    });

    el.oncontextmenu = e => {
        e.preventDefault();
        // open wiki on right click
        window.open(task.wikiLink, '_blank');
    };
    return el;
}

// state storage helpers
const STATE_KEY = 'taskStates';
function loadStates() {
    try {
        const s = localStorage.getItem(STATE_KEY);
        return s ? JSON.parse(s) : {};
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
function nextState(current) {
    const idx = STATES.indexOf(current);
    return STATES[(idx + 1) % STATES.length];
}

// modal helpers
function showModal(task) {
    const modal = document.getElementById('task-modal');
    document.getElementById('modal-title').textContent = task.name;
    const img = document.getElementById('modal-image');
    img.src = task.imageLink;
    img.alt = task.name;
    document.getElementById('modal-tip').textContent = task.tip || '';
    const wiki = document.getElementById('modal-wiki');
    wiki.href = task.wikiLink || '#';
    // button
    const btn = document.getElementById('modal-complete');
    const state = getState(task.id) || 'incomplete';
    if (state === 'incomplete' || state === 'current') {
        btn.style.display = 'block';
        btn.onclick = () => {
            setState(task.id, 'complete');
            // update cell class
            const cell = document.querySelector(`.cell img[alt="${task.name}"]`).parentElement;
            cell.classList.remove(`state-${state}`);
            cell.classList.add('state-complete');
            hideModal();
        };
    } else {
        btn.style.display = 'none';
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

function render(tasks) {
    const grid = document.getElementById('grid');
    const size = computeGridSize(tasks.length);
    grid.style.setProperty('--grid-size', size);
    const coords = generateSpiral(tasks.length, size);
    let firstCell = null;

    tasks.forEach((t, idx) => {
        const [x, y] = coords[idx];
        const cell = createCell(t);
        cell.style.gridColumnStart = x + 1;
        cell.style.gridRowStart = y + 1;
        grid.appendChild(cell);
        if (idx === 0) firstCell = cell;
    });

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


    render(all);

    // save order after rendering (just store ids)
    const saveIds = all.map(t => t.id);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saveIds));
    } catch (e) {
        console.warn('unable to save order', e);
    }

    // enable middle-button drag scrolling
    const container = document.getElementById('grid-container');
    let isDragging = false;
    let lastX, lastY;
    container.addEventListener('mousedown', e => {
        if (e.button === 1) { // middle button
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            e.preventDefault();
        }
    });
    window.addEventListener('mousemove', e => {
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
        if (e.button === 1 && isDragging) {
            isDragging = false;
            e.preventDefault();
        }
    });
}).catch(err => console.error(err));
