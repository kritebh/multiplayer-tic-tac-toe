// Initialize Socket.IO connection
const socket = io();

// Game state
let currentGame = null;
let playerInfo = null;
let board = Array(9).fill(null);
let nextStartingPlayer = 0; // 0 or 1, alternates after each finished game

// DOM elements
const lobby = document.getElementById('lobby');
const game = document.getElementById('game');
const playerNameInput = document.getElementById('playerName');
const gameIdInput = document.getElementById('gameId');
const joinBtn = document.getElementById('joinBtn');
const createBtn = document.getElementById('createBtn');
const leaveBtn = document.getElementById('leaveBtn');
const resetBtn = document.getElementById('resetBtn');
const currentGameId = document.getElementById('currentGameId');
const gameStatus = document.getElementById('gameStatus');
const boardElement = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const player1Name = document.getElementById('player1Name');
const player2Name = document.getElementById('player2Name');
const player1Status = document.getElementById('player1Status');
const player2Status = document.getElementById('player2Status');
const player1Score = document.getElementById('player1Score');
const player2Score = document.getElementById('player2Score');
const messageElement = document.getElementById('message');

// Event listeners
joinBtn.addEventListener('click', joinGame);
createBtn.addEventListener('click', createGame);
leaveBtn.addEventListener('click', leaveGame);
resetBtn.addEventListener('click', resetGame);

// Add click listeners to cells
cells.forEach(cell => {
    cell.addEventListener('click', () => makeMove(parseInt(cell.dataset.index)));
});

// Enter key to join game
gameIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinGame();
    }
});

// Functions
function joinGame() {
  const playerName = playerNameInput.value.trim();
  const gameId = gameIdInput.value.trim();
  
  if (!playerName) {
    showMessage('Please enter your name', 'error');
    return;
  }
  
  if (gameId && gameId.length !== 6) {
    showMessage('Game ID must be 6 characters long', 'error');
    return;
  }
  
  socket.emit('joinGame', { gameId, playerName });
  showMessage('Joining game...', 'info');
}

function createGame() {
  const playerName = playerNameInput.value.trim();
  
  if (!playerName) {
    showMessage('Please enter your name', 'error');
    return;
  }
  
  socket.emit('joinGame', { gameId: '', playerName });
  showMessage('Creating new game...', 'info');
}

function leaveGame() {
  if (currentGame) {
    socket.emit('leaveGame');
    currentGame = null;
    playerInfo = null;
    showLobby();
    showMessage('Left the game', 'info');
  }
}

function resetGame() {
    if (currentGame) {
        socket.emit('resetGame', currentGame);
        showMessage('Game reset!', 'info');
    }
}

function makeMove(index) {
    if (!currentGame || !playerInfo) return;
    
    // Check if it's player's turn
    if (board[index] !== null) return;
    
    socket.emit('makeMove', { gameId: currentGame, index });
}

function updateBoard(newBoard) {
  board = newBoard;
  cells.forEach((cell, index) => {
    cell.textContent = board[index] || '';
    cell.className = 'cell';
    if (board[index]) {
      cell.classList.add(board[index].toLowerCase());
    }
  });
}

function updateScores(scores) {
  if (scores) {
    player1Score.textContent = `Score: ${scores.X}`;
    player2Score.textContent = `Score: ${scores.O}`;
  }
}

function updateGameStatus(status, currentPlayer) {
    gameStatus.textContent = status;
    
    // Update player statuses
    if (currentPlayer === 0) {
        player1Status.textContent = 'Your turn';
        player2Status.textContent = 'Waiting';
    } else if (currentPlayer === 1) {
        player1Status.textContent = 'Waiting';
        player2Status.textContent = 'Your turn';
    } else {
        // Unknown currentPlayer: just clear to waiting
        player1Status.textContent = 'Waiting';
        player2Status.textContent = 'Waiting';
    }
}

function showLobby() {
    lobby.classList.remove('hidden');
    game.classList.add('hidden');
    gameIdInput.value = '';
}

function showGame() {
    lobby.classList.add('hidden');
    game.classList.remove('hidden');
}

function showMessage(text, type = 'info') {
    messageElement.textContent = text;
    messageElement.className = `message ${type}`;
    messageElement.classList.remove('hidden');
    
    setTimeout(() => {
        messageElement.classList.add('hidden');
    }, 3000);
}

// Socket.IO event handlers
socket.on('gameJoined', (data) => {
  try {
    currentGame = data.gameId;
    playerInfo = {
      playerId: data.playerId,
      symbol: data.symbol,
      name: data.name
    };
    
    currentGameId.textContent = data.gameId;
    updateBoard(data.board);
    updateScores(data.scores);
    nextStartingPlayer = typeof data.nextStartingPlayer === 'number' ? data.nextStartingPlayer : 0;
    updateGameStatus('Waiting for opponent...', data.currentPlayer);
    showGame();
    
    showMessage(`Joined game ${data.gameId}! You are ${data.symbol}`, 'success');
  } catch (error) {
    console.error('Error in gameJoined:', error);
    showMessage('Error joining game', 'error');
  }
});

socket.on('playerJoined', (data) => {
  updateGameStatus(`Player joined! ${data.playerCount}/2 players`, data.currentPlayer);
  
  // Update player names and statuses
  if (data.players && data.players.length > 0) {
    if (data.players[0]) {
      player1Name.textContent = data.players[0].name;
      player1Status.textContent = 'Connected';
    }
    if (data.players[1]) {
      player2Name.textContent = data.players[1].name;
      player2Status.textContent = 'Connected';
    }
  }
});

socket.on('gameStart', (data) => {
  updateBoard(data.board);
  updateGameStatus('Game started!', data.currentPlayer);
  if (typeof data.nextStartingPlayer === 'number') {
    nextStartingPlayer = data.nextStartingPlayer;
  }
  
  // Update player names and statuses for game start
  if (data.players && data.players.length > 0) {
    if (data.players[0]) {
      player1Name.textContent = data.players[0].name;
      player1Status.textContent = 'Connected';
    }
    if (data.players[1]) {
      player2Name.textContent = data.players[1].name;
      player2Status.textContent = 'Connected';
    }
  }
  
  showMessage('Game started!', 'success');
});

socket.on('moveMade', (data) => {
  try {
    updateBoard(data.board);
    updateScores(data.scores);
    if (typeof data.nextStartingPlayer === 'number') {
      nextStartingPlayer = data.nextStartingPlayer;
    }
    
    if (data.gameOver) {
      if (data.winner === 'tie') {
        const nextName = nextStartingPlayer === 0 ? player1Name.textContent : player2Name.textContent;
        updateGameStatus(`Game ended in a tie! Next: ${nextName}`);
        showMessage(`Game ended in a tie! ${nextName} starts next.`, 'info');
      } else {
        const nextName = nextStartingPlayer === 0 ? player1Name.textContent : player2Name.textContent;
        updateGameStatus(`Winner: ${data.winner}! Next: ${nextName}`);
        showMessage(`Winner: ${data.winner}! ${nextName} starts next.`, 'success');
      }
    } else {
      updateGameStatus('Game in progress', data.currentPlayer);
    }
  } catch (error) {
    console.error('Error in moveMade:', error);
    showMessage('Error processing move', 'error');
  }
});

socket.on('gameReset', (data) => {
  updateBoard(data.board);
  updateScores(data.scores);
  if (typeof data.nextStartingPlayer === 'number') {
    nextStartingPlayer = data.nextStartingPlayer;
  }
  const starterName = data.currentPlayer === 0 ? player1Name.textContent : player2Name.textContent;
  updateGameStatus(`New game! ${starterName} to play first`, data.currentPlayer);
});

socket.on('playerLeft', () => {
  updateGameStatus('Opponent left the game');
  
  // Reset player statuses
  player1Status.textContent = 'Waiting...';
  player2Status.textContent = 'Waiting...';
  
  showMessage('Opponent left the game', 'error');
});

socket.on('gameFull', () => {
    showMessage('Game is full!', 'error');
});

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  showMessage('Disconnected from server', 'error');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
  showMessage('Connection error', 'error');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  showMessage('Failed to connect to server', 'error');
});

// Auto-detect server IP for network access
function getServerIP() {
    // This will be the IP address of the server
    // For local development, it's usually localhost
    return window.location.hostname;
}

// Display network information on page load
window.addEventListener('load', () => {
    const serverIP = getServerIP();
    console.log(`Server running on: ${serverIP}:${window.location.port || 3000}`);
    
    // Add network info to the page
    const networkInfo = document.createElement('div');
    networkInfo.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 15px;
        border-radius: 8px;
        font-size: 12px;
        z-index: 1000;
    `;
    networkInfo.textContent = `Server: ${serverIP}:${window.location.port || 3000}`;
    document.body.appendChild(networkInfo);
}); 