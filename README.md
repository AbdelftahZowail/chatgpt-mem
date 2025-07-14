# ChatGPT Memories Extension

A Chrome extension to enhance your ChatGPT experience by providing a persistent memory bank for your conversations. This extension allows you to save, categorize, and remind ChatGPT of important information from previous chats, restoring context and improving continuity.

## Why I Created This Extension
I spent my precious time building this because OpenAI can't do shit and made ChatGPT keeps hallucinating.

## Features
- **Memory Bank**: Save important messages from ChatGPT conversations.
- **Categories**: Organize memories into categories for easy retrieval.
- **On-Page Widget**: Access and remind ChatGPT of memories directly from the page via a floating widget.
- **Automatic Reminders**: Optionally remind ChatGPT of your memories when starting a new chat.
- **Visual Timer**: See a timer indicator when using the memory reminder widget.

## How It Works
- The extension injects a widget into the ChatGPT page.
- You can save messages as memories, assign them to categories, and later remind ChatGPT of these memories.
- When you remind ChatGPT, the extension sends a context update prompt with your selected memories.

## Installation
1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable "Developer mode" (top right).
4. Click "Load unpacked" and select the extension folder.
5. The extension icon should appear in your browser.

## Usage
- Open ChatGPT and look for the 🧠 widget on the right side of the page.
- Click the widget to see your memory categories and use the "Remind" button to send memories to ChatGPT.
- Memories are saved automatically when you use the extension's features.

## File Overview
- `content.js`: Main logic for UI injection, memory management, and reminders.
- `background.js`: (If present) Handles background tasks and extension events.
- `categoryMemoryHelper.js`: Helper functions for category management.
- `manifest.json`: Chrome extension manifest.
- `popup.html`, `popup.js`: Popup UI and logic.
- `icons/`: Extension icons.

## Permissions
This extension uses `chrome.storage.local` to store your memories and categories locally. No data is sent to external servers.

**Developed by AbdelftahZowail**
