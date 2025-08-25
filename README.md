# 🎮 Multiplayer Tic Tac Toe

!["Multiplayer Tic tac Toe"](/screenshot.png)


A real-time multiplayer Tic Tac Toe game that runs on your local network. Built with Node.js, Express, and Socket.IO for seamless real-time gameplay.

## ✨ Features

- **Real-time multiplayer gameplay** - Play with friends on the same network
- **Modern, responsive UI** - Beautiful design that works on desktop and mobile
- **Live game synchronization** - All moves are synchronized in real-time
- **Game room system** - Create or join games with unique IDs
- **Player status indicators** - See when it's your turn and opponent status
- **Game reset functionality** - Start a new game after finishing
- **Network accessibility** - Accessible from any device on your local network

## 🚀 Quick Start

### Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Installation

1. **Clone or download this project**

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the server**

   ```bash
   npm start
   ```

4. **Access the game**
   - Open your browser and go to: `http://localhost:3000`
   - For network access, use your computer's IP address: `http://YOUR_IP:3000`

## 🌐 Network Setup

To play with friends on the same network:

1. **Find your computer's IP address**

   - On macOS/Linux: Open terminal and type `ifconfig` or `ip addr`
   - On Windows: Open command prompt and type `ipconfig`
   - Look for your local IP (usually starts with `192.168.` or `10.0.`)

2. **Share the network URL**

   - Tell your friends to visit: `http://YOUR_IP:3000`
   - Example: `http://192.168.1.100:3000`

3. **Start playing!**
   - One player creates a new game
   - Share the Game ID with your friend
   - Both players join the same game
   - Game starts automatically when both players are connected

## 🎯 How to Play

### Creating a Game

1. Click "Create New Game" button
2. A unique 6-character Game ID will be generated
3. Share this Game ID with your friend

### Joining a Game

1. Enter the Game ID provided by your friend
2. Click "Join Game" button
3. Wait for both players to connect

### Gameplay

- Player X goes first
- Click on any empty cell to make your move
- Take turns until someone wins or the game ends in a tie
- Use "New Game" button to start over

## 🛠️ Development

### Project Structure

```
MultiUser-TicTac/
├── server.js          # Main server file with Socket.IO logic
├── package.json       # Dependencies and scripts
├── public/            # Frontend files
│   ├── index.html     # Main HTML file
│   ├── style.css      # Styling
│   └── script.js      # Frontend JavaScript
└── README.md          # This file
```

### Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with auto-reload

### Customization

You can easily customize the game by modifying:

- **Port**: Change the port in `server.js` (line 180)
- **Styling**: Modify `public/style.css` for different themes
- **Game logic**: Update the game rules in `server.js`
- **UI**: Edit `public/index.html` for layout changes

## 🔧 Troubleshooting

### Common Issues

1. **Can't connect to the game**

   - Make sure the server is running (`npm start`)
   - Check if the port 3000 is available
   - Try a different port if needed

2. **Network access not working**

   - Check your firewall settings
   - Ensure both devices are on the same network
   - Try using the computer's IP address instead of localhost

3. **Game not starting**
   - Make sure both players have joined the same game
   - Check the browser console for error messages
   - Refresh the page if needed

### Port Already in Use

If port 3000 is already in use, you can change it:

1. Edit `server.js` and change line 180:

   ```javascript
   const PORT = process.env.PORT || 3001;
   ```

2. Restart the server and use the new port in your browser

## 📱 Mobile Support

The game is fully responsive and works great on mobile devices:

- Touch-friendly interface
- Responsive design that adapts to screen size
- Works on all modern browsers

## 🎨 Features in Detail

### Real-time Communication

- Uses Socket.IO for instant message passing
- No page refreshes needed
- Smooth gameplay experience

### Game State Management

- Server maintains game state
- Prevents cheating and invalid moves
- Handles player disconnections gracefully

### User Experience

- Clear visual feedback for all actions
- Status messages for game events
- Intuitive lobby and game interface

## 🤝 Contributing

Feel free to contribute to this project by:

1. Reporting bugs
2. Suggesting new features
3. Submitting pull requests
4. Improving documentation
