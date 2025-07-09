# 🍷 Maroon Discord Bot

> A delightful Discord bot built with TypeScript and love! 

## ✨ Features

- 🎯 Custom command system
- 🔧 Modular architecture with handlers
- 📝 TypeScript for type safety
- 🎪 Interactive Discord slash commands
- 🌟 Easy to extend and customize

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- A Discord bot token

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd maroon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   ```

4. **Build and run**
   ```bash
   npm run build
   npm start
   ```

## 🏗️ Project Structure

```
maroon/
├── src/
│   ├── commands/       # Bot commands
│   ├── handlers/       # Event handlers
│   ├── listeners/      # Event listeners
│   ├── Bot.ts         # Main bot file
│   ├── Command.ts     # Command interface
│   └── Commands.ts    # Command registry
├── dist/              # Compiled JavaScript
└── package.json       # Project dependencies
```

## 🎮 Commands

*Add your bot commands here as you develop them!*

## 🛠️ Development

- **Start in development mode**: `npm start`
- **Build project**: `npm run build`
- **Run tests**: `npm test`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📜 License

This project is licensed under the ISC License.

## 💖 Made with

- [Discord.js](https://discord.js.org/) - The Discord API wrapper
- [TypeScript](https://www.typescriptlang.org/) - For type safety
- [dotenv](https://github.com/motdotla/dotenv) - Environment variable management

---

*Happy coding! 🎉*