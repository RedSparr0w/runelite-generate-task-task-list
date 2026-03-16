
class Grid {
    idToCoords = new Map();

    computeGridSize(count) {
        let size = Math.ceil(Math.sqrt(count));
        if (size % 2 === 0) {
            size += 1;
        }
        return size;
    }

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
            || this.idToCoords.get(String(rawId))
            || { x: 0, y: 0 };
    }

    setTaskCoord(taskOrId, coord) {
        const rawId = typeof taskOrId === 'object' && taskOrId !== null
            ? taskOrId.id
            : taskOrId;
        return this.idToCoords.set(rawId, coord)
            || this.idToCoords.set(String(rawId), coord);
    }

    getCenterCoord(tasks = tasksGlobal) {
        return this.getTaskCoord(tasks[0]);
    }

    updateTaskCoordinates(tasks) {
        const size = this.computeGridSize(tasks.length);
        const coords = this.generateSpiral(tasks.length, size);

        this.idToCoords.clear();
        tasks.forEach((task, index) => {
            const [x, y] = coords[index];
            this.idToCoords.set(task.id, { x, y });
        });

        return {
            size,
            coords,
            center: coords.length > 0 ? { x: coords[0][0], y: coords[0][1] } : { x: 0, y: 0 }
        };
    }
}

export default new Grid();