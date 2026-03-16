
class GridManager {
    idToCoords = new Map();
    coordsToId = [];

    computeGridSize(count) {
        let size = Math.ceil(Math.sqrt(count));
        if (size % 2 === 0) {
            size += 1;
        }
        return size;
    }

    // Create our empty spiral grid coordinates
    generateSpiral(count, size) {
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

    getTaskCoord(taskOrId) {
        const rawId = typeof taskOrId === 'object' && taskOrId !== null
            ? taskOrId.id
            : taskOrId;
        return this.idToCoords.get(rawId)
            || { x: 0, y: 0 };
    }

    setTaskCoord(taskOrId, coord) {
        const rawId = typeof taskOrId === 'object' && taskOrId !== null
            ? taskOrId.id
            : taskOrId;
        this.idToCoords.set(rawId, coord);
        this.coordsToId[coord.x] = this.coordsToId[coord.x] || [];
        this.coordsToId[coord.x][coord.y] = rawId;
    }

    getTaskByCoord(x, y){
        return this.coordsToId?.[x]?.[y] || null;
    }

    setTaskByCoord(x, y, taskOrId){
        const rawId = typeof taskOrId === 'object' && taskOrId !== null
            ? taskOrId.id
            : taskOrId;
        this.idToCoords.set(rawId, { x, y });
        this.coordsToId[x] = this.coordsToId[x] || [];
        this.coordsToId[x][y] = rawId;
    }

    getTaskNeighbors(taskOrId) {
        const coord = this.getTaskCoord(taskOrId);
        const neighbors = [];
        if (this.coordsToId[coord.x - 1]?.[coord.y]) {
            neighbors.push(this.coordsToId[coord.x - 1][coord.y]);
        }
        if (this.coordsToId[coord.x + 1]?.[coord.y]) {
            neighbors.push(this.coordsToId[coord.x + 1][coord.y]);
        }
        if (this.coordsToId[coord.x]?.[coord.y - 1]) {
            neighbors.push(this.coordsToId[coord.x][coord.y - 1]);
        }
        if (this.coordsToId[coord.x]?.[coord.y + 1]) {
            neighbors.push(this.coordsToId[coord.x][coord.y + 1]);
        }
        return neighbors;
    }

    getCenterCoord() {
        return this.centerCoord;
    }

    updateTaskCoordinates(tasks) {
        const size = this.computeGridSize(tasks.length);
        const coords = this.generateSpiral(tasks.length, size);

        this.idToCoords.clear();
        this.coordsToId = [];
        tasks.forEach((task, index) => {
            const [x, y] = coords[index];
            this.coordsToId[x] = this.coordsToId[x] || [];
            this.coordsToId[x][y] = task.id;
            this.idToCoords.set(task.id, { x, y });
        });
        this.centerCoord = coords.length > 0 ? { x: coords[0][0], y: coords[0][1] } : { x: 0, y: 0 };

        return {
            size,
            coords,
            center: this.centerCoord,
        };
    }
}

export default new GridManager();