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
/listsubmissions [page]
/warn <user> <reason>
/warnlist [user]
/warnpermissions
/removewarn <id>
/clearuserwarns <user>
/bulkremovewarns <ids>
/warnleaderboard
/ban <user> <reason> [deletedays]
/kick <user> <reason>
/modlog [user] [type]
..!modifywarn <@role> -> enable/disable
```

## Moderation System Commands

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
- Uses arrow buttons (◀️ ▶️) for navigation between pages
- Shows warning details in a clean, spaced layout with separators
- Displays: user, warner, time, reason, location, and warning ID
- Requires warn permissions to use

### Submission Management Commands

#### `/findallapproved [page] [user]`
- Lists approved submissions with pagination (5 per page)
- Optional user parameter to filter submissions for a specific user
- Uses arrow buttons (◀️ ▶️) for navigation between pages
- Shows submission content, themes, and approval timestamp
- Requires warn permissions to use

#### `/listsubmissions [page]`
- Lists all approved submissions with their index numbers (5 per page)
- Uses arrow buttons (◀️ ▶️) for navigation between pages
- Shows submission content and detected themes
- Useful for finding submission index numbers for removal
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

#### `/warnleaderboard`
- Shows public warning leaderboard for the server (visible to everyone)
- Displays: total warnings, unique users, recent activity
- Shows top 10 warned users with medal rankings (🥇🥈🥉)
- Public command that doesn't require special permissions

#### `/modlog [user] [type]`
- Shows comprehensive moderation action log with pagination (5 per page)
- Optional user parameter to filter actions for a specific user
- Optional type parameter to filter by action type (warn/ban/kick)
- Uses arrow buttons (◀️ ▶️) for navigation between pages
- Shows all moderation actions: warnings, bans, and kicks
- Displays: action type, user, moderator, reason, channel, time
- Requires warn permissions to use
- Example: `/modlog @JohnDoe warn` - shows only warnings for JohnDoe

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

### Ban and Kick Commands

#### `/ban <user> <reason> [deletedays]`
- Bans a user from the server permanently
- Sends public embed in the channel where command was used
- DMs the banned user with details before banning
- Optional `deletedays` parameter to delete messages (0-7 days)
- Requires warn permissions to use
- Includes permission checks (can't ban higher roles or admins)
- Example: `/ban @JohnDoe Continuous rule violations 1`

#### `/kick <user> <reason>`
- Kicks a user from the server (they can rejoin with invite)
- Sends public embed in the channel where command was used
- DMs the kicked user with details before kicking
- Requires warn permissions to use
- Includes permission checks (can't kick higher roles or admins)
- Example: `/kick @JohnDoe Inappropriate behavior`

### Data Storage
- All warnings are stored in `warn_data.json` in the bot's directory
- Warnings include: user info, reason, timestamp, channel, who issued it, unique ID
- Role permissions are stored in `warn_config.json`
- All moderation actions are logged in `moderation_log.json` for unified tracking
- Approved submissions are stored in `approved_submissions.json`
- Data is persistent across bot restarts
- Warning IDs are automatically generated for easy reference
- Ban and kick actions are logged in Discord's audit log and the moderation log

### Pagination Features
- All paginated commands use arrow buttons (◀️ ▶️) for easy navigation
- Buttons automatically disable when at first/last page
- Pagination sessions timeout after 5 minutes
- Only the command user can use the navigation buttons
- Buttons are automatically removed when session expires

### Permission Requirements
- **Warn Permissions**: Required for `/warn`, `/warnlist`, `/removewarn`, `/ban`, `/kick`, `/modlog`, `/findallapproved`, `/listsubmissions`
- **Administrator Only**: Required for `/clearuserwarns`, `/bulkremovewarns`, `/warnpermissions`, `..!modifywarn`
- **Public Access**: `/warnleaderboard` is available to all users
- **Role Hierarchy**: Cannot moderate users with equal or higher roles
- **Admin Protection**: Cannot moderate Discord Administrators
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
