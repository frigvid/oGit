# Obsidian Git File Explorer

This plugin integrates Obsidian's file explorer with Git. Once the plugin is enabled, you will see relevant git information next to git repositories found in your vault in the file explorer.

![Plugin Screencast](assets/obsidian-git-fe-screencast.gif)

## Features

### Git Changes Widget

- Number of changed files displayed next to each detected repository in the file explorer
- Clicking on the component prompts the user for a commit message (adjustable in the settings)
- After submitting, the component automatically stages and commits all changes in a single commit
- Option to automatically generate commit messages in the format "Backup @ {iso-timestamp}"

### Git Sync Widget

- Shows the number of commits to be pulled and pushed from the remote
- Upon clicking, a sync process is started: pull (--no-rebase) followed by push to remote
- Provides visual feedback of the sync status directly in the file explorer
- **Auto-sync feature**: Automatically synchronize repositories on a schedule
  - Configure auto-sync on startup to sync repositories when Obsidian starts
  - Set custom auto-sync frequency (in minutes) for periodic background synchronization
  - Visual indicator shows when auto-sync is active for a repository

### Git Diff Tool Integration

- Right-click context menu option to open the git diff tool for files and folders
- Easily visualize changes to files directly from the file explorer
- Works with any file or folder within a git repository
- Compatible with your system's default git diff tool

### File Explorer Enhancements

- Changed files can be highlighted in the file explorer with customizable styling
- Choose between colored text or margin highlight with colored text
- Visual indicators help quickly identify which files have uncommitted changes

### Repository Management

- Context menu option to initialize new Git repositories directly from the file explorer
- Automatically detects and monitors Git repositories throughout your vault

## Installation

1. In Obsidian, go to Settings > Community plugins
2. Disable Safe mode if it's enabled
3. Click "Browse" and search for "Git File Explorer"
4. Install the plugin and enable it

## Requirements

- Obsidian v0.15.0+
- Git must be installed and accessible in your system's PATH
- Plugin is desktop-only (not compatible with mobile)

## Configuration

Several options are available in the plugin settings:

- Toggle Git Changes Widget
- Toggle Git Sync Widget
- Enable/disable commit message prompts
- Configure visual styling for changed files
- Choose how changed files are highlighted in the file explorer

## Support

- Made by [Mateus Molina](https://blog.mmolina.me)

## Troubleshooting
### SSH
#### Widgets stop updating

The plugin runs `git fetch` for sync widgets. If your ssh-agent doesn't have a matching identity loaded, SSH would normally block on a passphrase prompt. The plugin forces `BatchMode=yes` so these calls fail fast instead of hanging. To unblock them, right-click the repo folder in the file explorer and pick **Add identity to ssh-agent**.

#### "Add identity to ssh-agent" doesn't appear in the right-click menu

The item only appears when you right-click the repo's own folder (the one the sync/changes widgets attach to) and its `origin` remote is SSH-shaped (`git@host:user/repo.git`, `ssh://...`, or an SSH config alias). HTTPS remotes, non-repo folders, and files inside the repo hide the item.

#### Obsidian's Keychain

The keychain is used either to persist secrets, such as SSH passphrases, or as an intermediary when prompted to input the passphrase. The Advanced Option **Use Obsidian's Keychain** is what controls this behaviour. Turn it on if you want the plugin to remember your passphrases until Obsidian gets closed or the plugin gets disabled.

If you happen to change the key out-of-band, a stale passphrase will be flushed on first failure and will require you to add it to the agent again.

#### "Add identity" runs but ssh-add fails with a passphrase error

If **Use Obsidian's secret storage** is enabled in Advanced Options and a previously cached passphrase has gone stale (e.g. you changed the key's passphrase out-of-band), the plugin clears the cache on first failure and re-prompts. If it keeps failing, confirm the passphrase is correct with `ssh-add ~/.ssh/<keyfile>` from a terminal.

#### "Add identity" doesn't prompt and nothing seems to happen

Check the developer console (Ctrl+Shift+I → Console). The plugin logs all ssh-add outcomes there. A common cause is that the ssh-agent is not running; see below.

#### ssh-agent is not running

Start it before retrying:

- **Windows** (PowerShell as admin, once): `Start-Service ssh-agent` and to keep it running across reboots: `Set-Service ssh-agent -StartupType Automatic`.
    - You can of course use another executable, but just ensure that your environment is set up correctly and that you don't have multiple different agents running.
- **macOS/Linux**: `eval "$(ssh-agent -s)"` in your shell, or configure your desktop session to start it automatically.

#### The plugin spawns the wrong `ssh`

Open **Settings → Advanced Options**.

With "Override SSH defaults" off, the plugin auto-detects the binary from `git config --global core.sshCommand`, then `where ssh`. Toggle the override on and set **SSH executable** to the absolute path you want, e.g. `C:\Program Files\Git\usr\bin\ssh.exe` or `C:\Windows\System32\OpenSSH\ssh.exe`.

The plugin derives `ssh-add` from the same directory.

