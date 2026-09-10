document.addEventListener("DOMContentLoaded", () => {
    // --- GAME CONFIGURATION ---
    const BOARD_SIZE = 8;
    const TOTAL_MINES = 10;

    // --- STATE TRACKING VARS ---
    let boardState = [];
    let mineLocations = new Set();
    let gameOver = false;
    let cellsRevealed = 0;

    // --- TIMER SYSTEM TRACKING ---
    let timerInterval = null;
    let timeElapsed = 0;
    let isFirstClick = true; // Timer starts on the player's first move

    // --- DOM ELEMENT SELECTORS ---
    const boardElement = document.getElementById("game-board");
    const mineCountDisplay = document.getElementById("mine-count");
    const timerDisplay = document.getElementById("timer");
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

        // Reset and clear the running timer
        stopTimer();
        timeElapsed = 0;
        timerDisplay.textContent = "0";
        isFirstClick = true;

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

    // --- TIMER CONTROLS ---
    function startTimer() {
        if (timerInterval) return; // Prevent multiple intervals from spawning
        timerInterval = setInterval(() => {
            timeElapsed++;
            timerDisplay.textContent = timeElapsed;
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
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

        // Start the timer cleanly on the user's first move
        if (isFirstClick) {
            isFirstClick = false;
            startTimer();
        }

        // Hit a mine -> TRIGGER THE JUMPSCARE INSTANTLY
        if (cell.isMine) {
            gameOver = true;
            stopTimer(); // Freeze the clock immediately

            // ⚡ ZERO-DELAY MEDIA ENGINE TRIGGER
            if (deathOverlay) {
                deathOverlay.classList.remove("hidden");

                if (deathVideo) {
                    deathVideo.muted = true; 
                    deathVideo.play().catch(err => console.log("Video execution block:", err));
                }

                if (isaprank) {
                    isaprank.play().catch(err => console.log("Audio execution block:", err));
                }
            }

            triggerGameOver(false);
            return;
        }

        revealCell(r, c);

        // Win Condition
        if (cellsRevealed === (BOARD_SIZE * BOARD_SIZE) - TOTAL_MINES) {
            gameOver = true;
            stopTimer(); // Stop clock at your winning time
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

        // Start timer on flag placement if they haven't left-clicked yet
        if (isFirstClick) {
            isFirstClick = false;
            startTimer();
        }

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
                alert(`🎉 Victory achieved in ${timeElapsed} seconds!`);
            }, 300);
        }
    }

    function resetMediaState() {
        if (deathVideo) {
            deathVideo.pause();
            deathVideo.muted = true; 
            deathVideo.currentTime = 0;
        }
        if (isaprank) {
            isaprank.pause();
            isaprank.currentTime = 0;
        }
        if (deathOverlay) {
            deathOverlay.classList.add("hidden");
        }
    }
});
