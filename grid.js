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

function createCell(task) {
    const el = document.createElement('div');
    el.className = `cell tier-${task.tier}`;
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
    el.onclick = () => {
        window.open(task.wikiLink, '_blank');
    };
    return el;
}

function render(tasks) {
    const grid = document.getElementById('grid');
    const size = computeGridSize(tasks.length);
    grid.style.setProperty('--grid-size', size);
    const coords = generateSpiral(tasks.length, size);

    tasks.forEach((t, idx) => {
        const [x, y] = coords[idx];
        const cell = createCell(t);
        cell.style.gridColumnStart = x + 1;
        cell.style.gridRowStart = y + 1;
        grid.appendChild(cell);
    });
}

// weights used when interleaving tiers; higher means the tier tends to appear closer to the centre
const tierWeights = {
    easy: 1000,
    medium: 500,
    hard: 250,
    elite: 100,
    master: 10,
    // fallback weights for other tiers
    'master-tedious': 1,
    extra: 1,
    pets: 1
};

loadAll().then(data => {
    let all = [];
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
    render(all);
}).catch(err => console.error(err));
