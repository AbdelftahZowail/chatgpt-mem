// Add this at the top to inject custom styles for ChatGPT-like dark theme
(function injectChatGPTStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        body, html {
            background: #343541 !important;
            color: #ececf1 !important;
            font-family: 'Segoe UI', 'Inter', 'Arial', sans-serif;
            margin: 0;
            min-width: 340px;
            min-height: 420px;
            box-sizing: border-box;
        }
        #memory-list {
            background: #343541;
            border-radius: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.18);
            padding: 0 0 8px 0;
        }
        .memory-item {
            background: #393945;
            border-radius: 12px;
            margin: 10px 12px 0 12px;
            padding: 10px 12px 8px 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.10);
            border: none;
            transition: background 0.2s;
        }
        .memory-item.expanded {
            background: #444654;
        }
        .memory-title {
            font-weight: 600;
            font-size: 15px;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            border-radius: 8px;
            transition: background 0.18s;
        }
        .memory-title:hover {
            background: rgba(255,255,255,0.07);
        }
        .memory-title input[type="checkbox"] {
            accent-color: #23232b;
            margin-right: 8px;
            transform: scale(0.9);
        }
        .memory-info {
            background: #23232b;
        }
        .memory-info pre, .memory-info textarea {
            background: #23232b;
            border: none;
            border-radius: 10px;
            font-size: 13px;
            padding: 8px;
            margin: 0 0 4px 0;
            width: 100%;
            box-sizing: border-box;
            font-family: 'Fira Mono', 'Consolas', monospace;
        }
        .memory-info textarea {
            min-height: 60px;
            resize: vertical;
        }
        .memory-actions {
            display: flex;
            gap: 6px;
            margin-top: 4px;
        }
        .memory-actions button {
            background: #23232b;
            color: #ececf1;
            border: none;
            border-radius: 10px;
            padding: 4px 14px;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.18s, color 0.18s;
            margin-right: 0;
            outline: none;
            box-shadow: none;
        }
        .memory-actions button:hover {
            background: #393945;
            color: #fff;
        }
        .edit-title-input {
            background: #23232b;
            color: #ececf1;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            padding: 4px 8px;
            width: 90%;
        }
        #memorySearch {
            background: #23232b;
            color: #ececf1;
            border: none;
            border-radius: 10px;
            font-size: 13px;
            padding: 6px 10px;
            margin-bottom: 8px;
        }
        #customInstruction {
            background: #23232b;
            color: #ececf1;
            border: none;
            border-radius: 10px;
            font-size: 13px;
            padding: 6px 10px;
            margin-bottom: 8px;
            width: 100%;
            box-sizing: border-box;
        }
        .memory-url a {
            color: #0066cc;
            text-decoration: underline;
        }
        .memory-url a:hover {
            color: #004999;
        }
        ::selection {
            background: #10a37f44;
        }
        button:active {
            background: #17171c;
        }
        /* Style for the main action buttons */
        .main-action-btn {
            background: #23232b;
            color: #ececf1;
            border: none;
            border-radius: 12px;
            padding: 8px 18px;
            font-size: 14px;
            font-weight: 500;
            margin: 0 8px 14px 0;
            box-shadow: none;
            transition: background 0.18s, color 0.18s;
            outline: none;
            display: inline-block;
        }
        .main-action-btn:hover {
            background: #393945;
            color: #fff;
        }
        .main-action-btn:active {
            background: #17171c;
        }
        .main-action-btn:last-child {
            margin-right: 0;
        }
        /* Add spacing for the top action bar */
        #main-action-bar {
            display: flex;
            flex-wrap: wrap;
        }
    `;
    document.head.appendChild(style);
})();

// --- PROMPTS (No changes here) ---
const PROMPT_LAST_EXCHANGE = `[SYSTEM_COMMAND]\nAnalyze ONLY the last user message and your last response. Your task is to extract the most critical, reusable piece of information, a key decision, or a core fact that should be remembered for future context.\n\nOnly include important information that was actually sent by either you or me, nothing you deduced or inferred.\n\nStrictly format your output as a memory object within the specified markers. Do not add any conversational text or explanations before or after the markers.\n\nThe format is:\n[START_MEMORY]\nTitle: [A concise, descriptive title for the memory, 5-10 words]\nInfo: [A detailed but brief summary of the information to be remembered. Focus on the essential facts, figures, or instructions.]\n[END_MEMORY]\n\nAfter you provide this formatted memory, I will continue the conversation as normal.`;
const PROMPT_WHOLE_CHAT = `[SYSTEM_COMMAND]\nAnalyze our ENTIRE conversation history up to this point. Your task is to identify and synthesize the most globally important facts, user preferences, overarching goals, or key decisions that are essential for maintaining context throughout a long project. Ignore trivial details and focus on foundational information.\n\nOnly include important information that was actually sent by either you or me, nothing you deduced or inferred.\n\nStrictly format your output as a memory object within the specified markers. Do not add any conversational text or explanations before or after the markers.\n\nThe format is:\n[START_MEMORY]\nTitle: [A concise, descriptive title for the overall chat memory, 5-10 words]\nInfo: [A bulleted or paragraph summary of the most critical, high-level information from the entire chat that must be remembered.]\n[END_MEMORY]\n\nAfter you provide this formatted memory, I will continue the conversation as normal.`;

// New: Prompts with custom instruction placeholder
function buildPromptWithInstruction(basePrompt, instruction) {
    if (!instruction || !instruction.trim()) return basePrompt;
    return basePrompt + `\n\n[EXTRA_INSTRUCTION]\n${instruction.trim()}\n[END_EXTRA_INSTRUCTION]`;
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', loadMemories);

// Add search input above memory list
document.addEventListener('DOMContentLoaded', () => {
    const searchDiv = document.createElement('div');
    searchDiv.style.marginBottom = '8px';
    searchDiv.innerHTML = `<input id="memorySearch" type="text" placeholder="Search memories..." style="width: 100%; padding: 6px; font-size: 13px;" />`;
    const memoryList = document.getElementById('memory-list');
    memoryList.parentNode.insertBefore(searchDiv, memoryList);
    document.getElementById('memorySearch').addEventListener('input', filterMemories);
});

// Main action buttons
function getPromptWithOptionalInstruction(basePrompt) {
    const instruction = document.getElementById('customInstruction').value;
    return buildPromptWithInstruction(basePrompt, instruction);
}
document.getElementById('saveLastBtn').addEventListener('click', () => {
    const prompt = getPromptWithOptionalInstruction(PROMPT_LAST_EXCHANGE);
    sendMessageToContentScript({ action: 'generateMemory', prompt });
});
document.getElementById('saveChatBtn').addEventListener('click', () => {
    const prompt = getPromptWithOptionalInstruction(PROMPT_WHOLE_CHAT);
    sendMessageToContentScript({ action: 'generateMemory', prompt });
});

// Listen for updates from the content script to refresh the list
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'memory_created') {
        loadMemories();
    }
});

// --- DYNAMIC EVENT LISTENER FOR MEMORY LIST ---
// Using event delegation to handle clicks on future elements
document.getElementById('memory-list').addEventListener('click', (e) => {
    // Prevent toggling memory tile when clicking the checkbox
    if (e.target.matches('.memory-checkbox')) {
        e.stopPropagation();
        return;
    }
    const memoryItem = e.target.closest('.memory-item');
    if (!memoryItem) return;
    
    const memoryId = memoryItem.dataset.id;

    // Click on title to expand/collapse
    if (e.target.matches('.memory-title') || e.target.closest('.memory-title')) {
        memoryItem.classList.toggle('expanded');
    }

    // Click on delete button
    if (e.target.matches('.delete-btn')) {
        if (confirm('Are you sure you want to delete this memory?')) {
            deleteMemory(memoryId);
        }
    }

    // Click on edit button
    if (e.target.matches('.edit-btn')) {
        toggleEditMode(memoryItem, true);
    }

    // Click on save edit button
    if (e.target.matches('.save-edit-btn')) {
        saveMemoryChanges(memoryItem, memoryId);
    }

    // Click on cancel edit button
    if (e.target.matches('.cancel-edit-btn')) {
        toggleEditMode(memoryItem, false);
    }

    // Click on go to chat button
    if (e.target.matches('.go-to-chat-btn')) {
        const memories = JSON.parse(localStorage.getItem('memoriesCache') || '[]');
        const memory = memories.find(m => m.id === memoryId);
        if (memory && memory.url) {
            window.open(memory.url, '_blank');
        } else {
            // fallback: try to get from DOM
            const urlDiv = memoryItem.querySelector('.memory-url a');
            if (urlDiv) window.open(urlDiv.href, '_blank');
        }
    }
});

// --- CORE FUNCTIONS ---

let allMemoriesCache = [];

function loadMemories() {
    chrome.storage.local.get(['memories'], (result) => {
        let memories = result.memories || [];
        // Sort newest to oldest (by id, which is ISO string)
        memories.sort((a, b) => b.id.localeCompare(a.id));
        allMemoriesCache = memories;
        localStorage.setItem('memoriesCache', JSON.stringify(memories));
        renderMemories(memories);
    });
}

function renderMemories(memories) {
    const memoryListDiv = document.getElementById('memory-list');
    memoryListDiv.innerHTML = '';
    if (memories.length === 0) {
        memoryListDiv.innerHTML = '<p style="padding: 10px; text-align: center;">No memories saved yet.</p>';
        return;
    }
    memories.forEach(memory => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'memory-item';
        itemDiv.dataset.id = memory.id;
        itemDiv.innerHTML = `
            <div class="memory-title">
                <span>
                    <input type="checkbox" class="memory-checkbox" />
                    ${memory.title}
                </span>
                <span></span>
            </div>
            <div class="memory-info">
                <pre>${memory.info}</pre>
                ${memory.url ? `<div class='memory-url' style='margin-top:6px; font-size:12px; color:#555; word-break:break-all;'>URL: <a href='${memory.url}' target='_blank'>${memory.url}</a></div>` : ''}
            </div>
            <div class="memory-actions">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
                <button class="go-to-chat-btn" ${memory.url ? '' : 'style="display:none;"'}>Go to Chat</button>
                <button class="save-edit-btn" style="display:none;">Save</button>
                <button class="cancel-edit-btn" style="display:none;">Cancel</button>
            </div>
        `;
        memoryListDiv.appendChild(itemDiv);
    });
}

function deleteMemory(id) {
    chrome.storage.local.get(['memories'], (result) => {
        let memories = result.memories || [];
        memories = memories.filter(mem => mem.id !== id);
        chrome.storage.local.set({ memories }, () => {
            loadMemories(); // Refresh the list
        });
    });
}

function toggleEditMode(itemDiv, isEditing) {
    const titleSpan = itemDiv.querySelector('.memory-title span:first-child');
    const infoPre = itemDiv.querySelector('.memory-info pre');
    
    const editBtn = itemDiv.querySelector('.edit-btn');
    const deleteBtn = itemDiv.querySelector('.delete-btn');
    const saveBtn = itemDiv.querySelector('.save-edit-btn');
    const cancelBtn = itemDiv.querySelector('.cancel-edit-btn');

    if (isEditing) {
        // Switch to edit mode
        const currentTitle = titleSpan.innerText;
        const currentInfo = infoPre.innerText;
        
        titleSpan.innerHTML = `<input type="text" class="edit-title-input" value="${currentTitle}" />`;
        infoPre.innerHTML = `<textarea class="edit-textarea">${currentInfo}</textarea>`;
        
        itemDiv.classList.add('expanded'); // Ensure info is visible
        editBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
    } else {
        // Cancel edit mode - just reload the list to reset everything
        loadMemories();
    }
}

function saveMemoryChanges(itemDiv, id) {
    const newTitle = itemDiv.querySelector('.edit-title-input').value;
    const newInfo = itemDiv.querySelector('.edit-textarea').value;

    if (!newTitle.trim()) {
        alert("Title cannot be empty.");
        return;
    }

    chrome.storage.local.get(['memories'], (result) => {
        let memories = result.memories || [];
        const memoryIndex = memories.findIndex(mem => mem.id === id);
        
        if (memoryIndex !== -1) {
            memories[memoryIndex].title = newTitle;
            memories[memoryIndex].info = newInfo;
        }

        chrome.storage.local.set({ memories }, () => {
            loadMemories(); // Refresh the list with the updated data
        });
    });
}

function handleRemind() {
    const selectedMemories = [];
    document.querySelectorAll('.memory-checkbox:checked').forEach(checkbox => {
        const itemDiv = checkbox.closest('.memory-item');
        const id = itemDiv.dataset.id;
        // Read memory from storage to ensure we have the latest version
        chrome.storage.local.get(['memories'], (result) => {
            const memory = (result.memories || []).find(m => m.id === id);
            if (memory) {
                selectedMemories.push(memory);
            }
        });
    });
    
    // Use a timeout to wait for the async storage reads to complete
    setTimeout(() => {
        if (selectedMemories.length > 0) {
            // Only include the info(s), not the titles
            let memoryText = selectedMemories.map(m => m.info).join('\n\n');
            const remindPrompt = `[CONTEXT_UPDATE]\nThe following are memories of our previous conversations. I am providing them to restore your context. Read and internalize them. Do not treat this as a question or a task.\n\nOnce you have processed this information, your ONLY response should be: "Understood. My context is updated. Please proceed."\n\n--- START MEMORIES ---\n\n${memoryText}\n\n--- END MEMORIES ---\n\nNow, provide only the confirmation message and await my next real prompt.`;
            sendMessageToContentScript({ action: 'remind', prompt: remindPrompt });
        } else {
            alert('Please select at least one memory to remind ChatGPT.');
        }
    }, 100);
}

function filterMemories() {
    const query = document.getElementById('memorySearch').value.trim().toLowerCase();
    if (!query) {
        renderMemories(allMemoriesCache);
        return;
    }
    const filtered = allMemoriesCache.filter(m =>
        (m.title && m.title.toLowerCase().includes(query)) ||
        (m.info && m.info.toLowerCase().includes(query))
    );
    renderMemories(filtered);
}

function sendMessageToContentScript(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, message);
    });
}

// Add main action bar wrapper and button classes on DOMContentLoaded

document.addEventListener('DOMContentLoaded', () => {
    // Wrap the two main buttons in a styled bar (remindBtn will be moved)
    const saveLastBtn = document.getElementById('saveLastBtn');
    const saveChatBtn = document.getElementById('saveChatBtn');
    const remindBtn = document.getElementById('remindBtn');
    if (saveLastBtn && saveChatBtn) {
        [saveLastBtn, saveChatBtn].forEach(btn => {
            btn.classList.add('main-action-btn');
            btn.style.width = '100%';
            btn.style.margin = '0';
            btn.style.display = 'inline-block';
        });
        let bar = document.createElement('div');
        bar.id = 'main-action-bar';
        bar.style.display = 'flex';
        bar.style.flexDirection = 'row';
        bar.style.gap = '12px';
        bar.style.width = '100%';
        saveLastBtn.parentNode.insertBefore(bar, saveLastBtn);
        bar.appendChild(saveLastBtn);
        bar.appendChild(saveChatBtn);
    }
    // Move remindBtn to the bottom of the memory list
    if (remindBtn) {
        remindBtn.classList.add('main-action-btn');
        remindBtn.style.width = '100%';
        remindBtn.style.margin = '18px 0 0 0';
        remindBtn.style.display = 'block';
        remindBtn.onclick = handleRemind;
        // const memoryList = document.getElementById('memory-list');
        // if (memoryList && memoryList.parentNode) {
        //     memoryList.parentNode.appendChild(remindBtn);
        // }
    }
});