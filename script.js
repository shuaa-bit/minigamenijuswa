document.addEventListener("DOMContentLoaded", () => {
    // --- GAME CONFIGURATION ---
    const BOARD_SIZE = 8;
    const TOTAL_MINES = 10;

    // --- STATE TRACKING VARS ---
    let boardState = [];
    let mineLocations = new Set();
    let gameOver = false;
    let cellsRevealed = 0;

    // --- DOM ELEMENT SELECTORS ---
    const boardElement = document.getElementById("game-board");
    const mineCountDisplay = document.getElementById("mine-count");
    const startBtn = document.getElementById("start-btn");
    const restartBtn = document.getElementById("restart-btn");

    // Media Overlay Selectors
    const deathOverlay = document.getElementById("death-overlay");
    const deathVideo = document.getElementById("death-video");
    const closeOverlayBtn = document.getElementById("close-overlay-btn");
    const isaprank = document.getElementById("isaprank");

    // --- EVENT LISTENERS ---
    startBtn.addEventListener("click", initializeGame);
    restartBtn.addEventListener("click", initializeGame);
    closeOverlayBtn.addEventListener("click", () => {
        resetMediaState();
        initializeGame();
    });

    // Run setup immediately on window mount
    initializeGame();

    function initializeGame() {
        // Clear layout canvas structures
        boardElement.innerHTML = "";
        boardState = [];
        mineLocations.clear();
        gameOver = false;
        cellsRevealed = 0;
        mineCountDisplay.textContent = TOTAL_MINES;

        resetMediaState();

        // 1. Build Data Representation and Inject DOM Cells
        for (let r = 0; r < BOARD_SIZE; r++) {
            const rowData = [];
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cellElement = document.createElement("div");
                cellElement.classList.add("cell");

                // Track positions inside element data attributes
                cellElement.dataset.row = r;
                cellElement.dataset.col = c;

                // Attach User Mouse Action Triggers
                cellElement.addEventListener("click", () => handleLeftClick(r, c));
                cellElement.addEventListener("contextmenu", (e) => handleRightClick(e, r, c));

                boardElement.appendChild(cellElement);

                // Initialize abstract engine coordinates
                rowData.push({
                    element: cellElement,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    neighborMines: 0
                });
            }
            boardState.push(rowData);
        }

        // 2. Map Target Hidden Mines
        generateMines();

        // 3. Compile Proximity Metrics
        calculateNeighborValues();
    }

    function generateMines() {
        while (mineLocations.size < TOTAL_MINES) {
            const randomIdx = Math.floor(Math.random() * (BOARD_SIZE * BOARD_SIZE));
            const r = Math.floor(randomIdx / BOARD_SIZE);
            const c = randomIdx % BOARD_SIZE;
            const uniqueKey = `${r},${c}`;

            if (!mineLocations.has(uniqueKey)) {
                mineLocations.add(uniqueKey);
                boardState[r][c].isMine = true;
            }
        }
    }

    function calculateNeighborValues() {
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (boardState[r][c].isMine) continue;

                let count = 0;
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        const newR = r + i;
                        const newC = c + j;
                        if (newR >= 0 && newR < BOARD_SIZE && newC >= 0 && newC < BOARD_SIZE) {
                            if (boardState[newR][newC].isMine) count++;
                        }
                    }
                }
                boardState[r][c].neighborMines = count;
            }
        }
    }

    function handleLeftClick(r, c) {
        if (gameOver) return;
        const cell = boardState[r][c];
        if (cell.isRevealed || cell.isFlagged) return;

        // Hit a mine -> TRIGGER THE JUMPSCARE INSTANTLY
        if (cell.isMine) {
            gameOver = true;

            // ⚡ ZERO-DELAY SYSTEM LAUNCH: Strip visibility tags and play audio stream simultaneously
            if (deathOverlay && deathVideo) {
                deathOverlay.classList.remove("hidden");

                // Start video track in background cache cleanly
                deathVideo.play().then(() => {
                    // 🔴 SOUND OVERRIDE: Unmute once playback starts safely to hear the sound!
                    deathVideo.muted = false;
                }).catch(err => {
                    console.log("Jumpscare execution bypassed by active security block:", err);
                });
            }

            // Run background square revelations quietly afterward
            triggerGameOver(false);
            return;
        }

        revealCell(r, c);

        // Win Condition
        if (cellsRevealed === (BOARD_SIZE * BOARD_SIZE) - TOTAL_MINES) {
            triggerGameOver(true);
        }
    }

    function revealCell(r, c) {
        const cell = boardState[r][c];
        cell.isRevealed = true;
        cell.element.classList.add("revealed");
        cellsRevealed++;

        if (cell.neighborMines > 0) {
            cell.element.textContent = cell.neighborMines;
            cell.element.classList.add(`num-${cell.neighborMines}`);
        } else {
            // Recursive clear sweep (Cascade Empty Spaces)
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const newR = r + i;
                    const newC = c + j;
                    if (newR >= 0 && newR < BOARD_SIZE && newC >= 0 && newC < BOARD_SIZE) {
                        if (!boardState[newR][newC].isRevealed) {
                            revealCell(newR, newC);
                        }
                    }
                }
            }
        }
    }

    function handleRightClick(e, r, c) {
        e.preventDefault();
        if (gameOver) return;
        const cell = boardState[r][c];
        if (cell.isRevealed) return;

        cell.isFlagged = !cell.isFlagged;
        cell.element.classList.toggle("flagged");
        cell.element.textContent = cell.isFlagged ? "🚩" : "";

        const currentMinesLeft = parseInt(mineCountDisplay.textContent);
        mineCountDisplay.textContent = cell.isFlagged ? currentMinesLeft - 1 : currentMinesLeft + 1;
    }

    function triggerGameOver(isWin) {
        // Expose hidden tile bombs configuration layout
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (boardState[r][c].isMine) {
                    boardState[r][c].element.classList.add("mine");
                    boardState[r][c].element.textContent = "💣";
                }
            }
        }

        if (isWin) {
            setTimeout(() => {
                alert("🎉 Victory achieved!");
            }, 300);
        }
    }

    function resetMediaState() {
        if (deathOverlay && deathVideo) {
            deathVideo.pause();
            deathVideo.muted = true; // Remute setup parameters for next playthrough loop
            deathVideo.currentTime = 0;
            deathOverlay.classList.add("hidden");
        }
    }
});
