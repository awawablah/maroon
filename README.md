# 🖍️ Maroon Discord Bot

## ✨ Features

- 🎯 Custom command system
- 🔧 Modular architecture with handlers
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

```bash
/findallapproved <page> || <user>
/submit
/removesubmission <index>
/warn <user> <reason>
/warnlist [user]
/warnpermissions
/removewarn <id>
/clearuserwarns <user>
/bulkremovewarns <ids>
/warnstats
..!modifywarn <@role> -> enable/disable
```

## Warn System Commands

### Core Warning Commands

#### `/warn <user> <reason>`
- Warns a user for a specific reason
- Sends a public embed in the channel where the command was used
- DMs the warned user with details including who warned them, when, and in which channel
- Requires specific role permissions or Discord Administrator
- Example: `/warn @JohnDoe Spamming in general chat`

#### `/warnlist [user]`
- Lists all warnings with improved horizontal pagination (3 per page)
- Optional user parameter to filter warnings for a specific user
- Uses arrow buttons for navigation between pages
- Shows warning details in a clean, spaced layout with separators
- Displays: user, warner, time, reason, location, and warning ID
- Requires warn permissions to use

### Warning Management Commands

#### `/removewarn <id>`
- Removes a single warning by its ID
- Shows confirmation with details of the removed warning
- Requires warn permissions to use
- Example: `/removewarn warn_1234567890_abc123`

#### `/clearuserwarns <user>`
- **Admin Only** - Clears all warnings for a specific user
- Shows count of warnings removed
- Requires Discord Administrator permission
- Example: `/clearuserwarns @JohnDoe`

#### `/bulkremovewarns <ids>`
- **Admin Only** - Removes multiple warnings at once (max 20)
- IDs can be separated by spaces or commas
- Shows summary of successfully removed and not found warnings
- Requires Discord Administrator permission
- Example: `/bulkremovewarns warn_123_abc warn_456_def warn_789_ghi`

### Statistics and Administration

#### `/warnstats`
- Shows comprehensive warning statistics for the server
- Displays: total warnings, unique users, staff activity, recent trends
- Shows top warned users and most active staff members
- Requires warn permissions to use

#### `/warnpermissions`
- Shows which roles currently have warn permissions
- Admin-only command for checking current configuration
- Displays role names and IDs with status information

#### `..!modifywarn <@role> -> enable/disable`
- Text-based command (not slash command) that must use the `..!` prefix
- Only Discord Administrators can use this command
- Enables or disables warn permissions for a specific role
- Enhanced error handling and validation
- Syntax examples:
  - `..!modifywarn @Moderator -> enable`
  - `..!modifywarn @Helper -> disable`

### Warning Data Storage
- All warnings are stored in `warn_data.json` in the bot's directory
- Warnings include: user info, reason, timestamp, channel, who issued it, unique ID
- Role permissions are stored in `warn_config.json`
- Data is persistent across bot restarts
- Warning IDs are automatically generated for easy reference
```

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

## Made with

- [Discord.js](https://discord.js.org/) - The Discord API wrapper
- [TypeScript](https://www.typescriptlang.org/) - For type safety
- [dotenv](https://github.com/motdotla/dotenv) - Environment variable management
