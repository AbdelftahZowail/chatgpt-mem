(function injectChatGPTStyles() {
    // Injecting base styles...
    const style = document.createElement('style');
    style.innerHTML = `
        body, html {
            background: #343541 !important; color: #ececf1 !important; font-family: 'Segoe UI', 'Inter', 'Arial', sans-serif;
            margin: 0; min-width: 400px; min-height: 420px; box-sizing: border-box; padding: 10px;
        }
        h3 { margin-top: 15px; margin-bottom: 5px; }
        #memory-list { background: #343541; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.18); padding: 0 0 8px 0; max-height: 300px; overflow-y: auto; }
        /* Custom dark scrollbar for memory list */
        #memory-list::-webkit-scrollbar {
            width: 10px;
            background: #23232b;
        }
        #memory-list::-webkit-scrollbar-thumb {
            background: #393945;
            border-radius: 8px;
        }
        #memory-list::-webkit-scrollbar-thumb:hover {
            background: #444654;
        }
        .memory-item { background: #393945; border-radius: 12px; margin: 10px 12px 0 12px; padding: 10px 12px 8px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.10); border: none; transition: background 0.2s; }
        .memory-item.expanded { background: #444654; }
        .memory-title { font-weight: 600; font-size: 15px; margin-bottom: 4px; display: flex; align-items: center; border-radius: 8px; transition: background 0.18s; cursor: pointer; }
        .memory-title:hover { background: rgba(255,255,255,0.07); }
        .memory-title input[type="checkbox"] { margin-right: 8px; cursor: pointer; }
        .memory-info { background: #23232b; display: none; padding-top: 8px; }
        .memory-info pre, .memory-info textarea { background: #23232b; border: none; border-radius: 10px; font-size: 13px; padding: 8px; margin: 0 0 4px 0; width: 100%; box-sizing: border-box; font-family: 'Fira Mono', 'Consolas', monospace; white-space: pre-wrap; word-wrap: break-word; }
        .memory-actions { display: flex; gap: 6px; margin-top: 8px; }
        .memory-actions button, .main-action-btn, #add-category-btn {
            background: #23232b;
            color: #ececf1;
            border: none;
            border-radius: 10px;
            padding: 4px 14px;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.18s, color 0.18s;
        }
        /* Custom dark scrollbar for memory list */
        #memory-list::-webkit-scrollbar {
            width: 10px;
            background: #23232b;
        }
        #memory-list::-webkit-scrollbar-thumb {
            background: #393945;
            border-radius: 8px;
        }
        #memory-list::-webkit-scrollbar-thumb:hover {
            background: #444654;
        }
        /* Minimal dark scrollbar for popup (outer scroll) */
        body::-webkit-scrollbar, html::-webkit-scrollbar {
            width: 10px;
            background: #23232b;
        }
        body::-webkit-scrollbar-thumb, html::-webkit-scrollbar-thumb {
            background: #393945;
            border-radius: 8px;
        }
        body::-webkit-scrollbar-thumb:hover, html::-webkit-scrollbar-thumb:hover {
            background: #444654;
        }
        }
        .memory-actions button:hover, .main-action-btn:hover, #add-category-btn:hover {
            background: #393945;
            color: #fff;
        }
        .memory-actions button:active, .main-action-btn:active, #add-category-btn:active {
            background: #17171c;
        }
        .edit-title-input { background: #23232b; color: #ececf1; border: none; border-radius: 10px; font-size: 14px; padding: 4px 8px; width: 90%; }
        #customInstruction, #memorySearch, #new-category-input { background: #23232b; color: #ececf1; border: none; border-radius: 10px; font-size: 13px; padding: 8px 12px; margin-bottom: 8px; width: 100%; box-sizing: border-box; }
        .main-action-btn { background: #23232b; color: #ececf1; border: none; border-radius: 12px; padding: 8px 18px; font-size: 14px; font-weight: 500; box-shadow: none; transition: background 0.18s, color 0.18s; flex: 1; }
        /* Category Management Styles */
        .category-management { padding: 10px; background: #444654; border-radius: 8px; margin-bottom: 15px; }
        .category-management h3 { margin-top: 0; }
        #add-category-btn { padding: 8px 12px; height: 32px; background: #23232b; color: #ececf1; border: none; border-radius: 10px; cursor: pointer; }

        /* Styles for category tags */
        .memory-categories-container { margin-top: 6px; }
        .category-tag {
            display: inline-block;
            color: #fff;
            padding: 3px 8px;
            font-size: 11px;
            font-weight: 500;
            border-radius: 6px;
            margin-right: 5px;
            margin-bottom: 5px;
            position: relative;
            cursor: pointer;
        }
        .category-tag .delete-category-btn {
            margin-left: 5px;
            color: #ff5c5c;
            background: none;
            border: none;
            font-size: 13px;
            cursor: pointer;
            padding: 0;
            vertical-align: middle;
            transition: color 0.18s;
        }
        .category-tag .delete-category-btn:hover {
            color: #ff0000;
        }
        .selected-category-filter {
            display: inline-block;
            background: #393945;
            color: #fff;
            border-radius: 6px;
            padding: 3px 8px;
            font-size: 12px;
            font-weight: 500;
            margin-right: 6px;
            margin-bottom: 8px;
        }
        .selected-category-filter .deselect-category-btn {
            margin-left: 6px;
            color: #ff5c5c;
            background: none;
            border: none;
            font-size: 14px;
            cursor: pointer;
            padding: 0;
            vertical-align: middle;
            transition: color 0.18s;
        }
        .selected-category-filter .deselect-category-btn:hover {
            color: #ff0000;
        }
    `;
    document.head.appendChild(style);
})();
const PROMPT_LAST_EXCHANGE = `[SYSTEM_COMMAND]\nYou are strictly forbidden from creating, updating, or outputting any memory object unless you are explicitly instructed to do so using a prompt like this one.\n\nAnalyze ONLY the last user message and your last response. Extract the single most critical, reusable piece of information, a key decision, or a core fact that should be remembered for future context.\n\nYou MUST output ONLY a memory object, strictly within the [START_MEMORY] and [END_MEMORY] markers, and absolutely nothing else. Do NOT add any conversational text, explanations, or any output outside the markers.\n\nIf you are not explicitly asked using this prompt, do NOT create or update any memory.\n\nFormat:\n[START_MEMORY]\nTitle: [A concise, descriptive title for the memory, 5-10 words]\nInfo: [A detailed but brief summary of the information to be remembered.]\n[END_MEMORY]`;
const PROMPT_WHOLE_CHAT = `[SYSTEM_COMMAND]\nYou are strictly forbidden from creating, updating, or outputting any memory object unless you are explicitly instructed to do so using a prompt like this one.\n\nAnalyze our ENTIRE conversation history up to this point. Identify and synthesize only the most globally important facts, user preferences, or overarching goals.\n\nYou MUST output ONLY a memory object, strictly within the [START_MEMORY] and [END_MEMORY] markers, and absolutely nothing else. Do NOT add any conversational text, explanations, or any output outside the markers.\n\nIf you are not explicitly asked using this prompt, do NOT create or update any memory.\n\nFormat:\n[START_MEMORY]\nTitle: [A concise, descriptive title for the overall chat memory, 5-10 words]\nInfo: [A bulleted or paragraph summary of the most critical, high-level information from the entire chat.]\n[END_MEMORY]`;

let allMemoriesCache = [];
let allCategoriesCache = [];
let selectedCategoryFilters = new Set();
let updatingMemoryId = null;

document.addEventListener('DOMContentLoaded', () => {
    document.body.innerHTML = `
        <div class="category-management">
            <h3>Manage Categories</h3>
            <div style="display: flex;">
                <input type="text" id="new-category-input" placeholder="New category name...">
                <button id="add-category-btn" style="margin-left: 8px;">Add</button>
            </div>
        </div>
        <h3>Saved Memories</h3>
        <input id="memorySearch" type="text" placeholder="Search memories by title, info, or category...">
        <div id="selected-category-filter"></div>
        <div id="memory-list"></div>
        <div id="remind-container" style="margin-top: 10px;"></div>
        <div id="updating-memory-banner" style="display:none; margin: 10px 0; padding: 8px 12px; background: #23232b; color: #fff; border-radius: 8px; font-size: 14px;"></div>
        <h3>Generate Memory</h3>
        <input id="customInstruction" type="text" placeholder="Enter specific instruction (optional)">
        <div id="generate-buttons" style="display: flex; gap: 10px; margin-top: 8px;">
            <button id="saveLastBtn" class="main-action-btn">Save Last Exchange</button>
            <button id="saveChatBtn" class="main-action-btn">Save Whole Chat</button>
        </div>
    `;

    loadData();
    document.getElementById('add-category-btn').addEventListener('click', addNewCategory);
    document.getElementById('memorySearch').addEventListener('input', filterMemories);
    document.getElementById('saveLastBtn').addEventListener('click', () => handleGenerateMemory('last'));
    document.getElementById('saveChatBtn').addEventListener('click', () => handleGenerateMemory('whole'));
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'memory_created' || message.action === 'memory_updated') loadData();
    });
    document.getElementById('memory-list').addEventListener('click', handleMemoryListClick);
});

// Color generation function
function stringToHslColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 7) - hash) + ((hash << 3) - hash);
  }
  // Use more bits for hue, saturation, and lightness
  const h = Math.abs(hash) % 360;
  const s2 = 55 + (Math.abs(hash >> 8) % 30); // 55-85%
  const l2 = 40 + (Math.abs(hash >> 16) % 20); // 40-60%
  return `hsl(${h}, ${s2}%, ${l2}%)`;
}


function handleMemoryListClick(e) {
    if (e.target.matches('.memory-checkbox')) {
        e.stopPropagation();
        return;
    }
    const memoryItem = e.target.closest('.memory-item');
    if (!memoryItem) return;
    
    const memoryId = memoryItem.dataset.id;

    if (e.target.closest('.memory-title')) {
        memoryItem.classList.toggle('expanded');
        const info = memoryItem.querySelector('.memory-info');
        info.style.display = info.style.display === 'block' ? 'none' : 'block';
    }
    if (e.target.matches('.delete-btn')) deleteMemory(memoryId);
    if (e.target.matches('.edit-btn')) toggleEditMode(memoryItem, true);
    if (e.target.matches('.save-edit-btn')) saveMemoryChanges(memoryItem, memoryId);
    if (e.target.matches('.cancel-edit-btn')) toggleEditMode(memoryItem, false);
    // "Go to Chat" button logic
    if (e.target.matches('.go-to-chat-btn')) {
        const memory = allMemoriesCache.find(m => m.id === memoryId);
        if (memory && memory.url) {
            chrome.tabs.create({ url: memory.url });
        }
    }
    // Update button logic
    if (e.target.matches('.update-btn')) {
        updatingMemoryId = memoryItem.dataset.id;
        showUpdatingMemoryBanner(updatingMemoryId);
        scrollToGenerateMemorySection();
        return;
    }
}

function scrollToGenerateMemorySection() {
    // Scroll to bottom of the popup page
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function showUpdatingMemoryBanner(memoryId) {
    const banner = document.getElementById('updating-memory-banner');
    if (!banner) return;
    const memory = allMemoriesCache.find(m => m.id === memoryId);
    if (!memory) return;
    banner.innerHTML = `Updating memory: <b>${memory.title}</b> <button id="cancel-update-btn" style="margin-left:10px; background:none; color:#ff5c5c; border:none; font-size:16px; cursor:pointer;">&times;</button>`;
    banner.style.display = 'block';
    document.getElementById('cancel-update-btn').onclick = function() {
        updatingMemoryId = null;
        banner.style.display = 'none';
    };
}

function loadData() {
    chrome.storage.local.get(['memories', 'memory_categories'], (result) => {
        allMemoriesCache = result.memories || [];
        allMemoriesCache.sort((a, b) => b.id.localeCompare(a.id));
        
        let categories = result.memory_categories || [];
        if (!categories.includes('default')) {
            categories.unshift('default');
            chrome.storage.local.set({ memory_categories: categories });
        }
        allCategoriesCache = categories;

        renderMemories(allMemoriesCache);
        renderCategoryManagement();
        renderRemindButton(); 
    });
}

function renderMemories(memories) {
    const memoryListDiv = document.getElementById('memory-list');
    memoryListDiv.innerHTML = memories.length === 0 ? '<p style="padding: 10px; text-align: center;">No memories saved yet.</p>' : '';
    
    memories.forEach(memory => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'memory-item';
        itemDiv.dataset.id = memory.id;

        const categories = memory.categories || [];
        const categoryTags = categories.map(cat => 
            `<span class="category-tag" style="background-color: ${stringToHslColor(cat)};">${cat}</span>`
        ).join('');

        // Add a flex container for actions and update button
        itemDiv.innerHTML = `
            <div class="memory-title">
                <span>
                    <input type="checkbox" class="memory-checkbox" />
                    ${memory.title}
                </span>
            </div>
            <div class="memory-categories-container">${categoryTags}</div>
            <div class="memory-info">
                <pre>${memory.info}</pre>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="memory-actions">
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                    <button class="go-to-chat-btn" ${memory.url ? '' : 'style=\"display:none;\"'}>Go to Chat</button>
                    <button class="save-edit-btn" style="display:none;">Save</button>
                    <button class="cancel-edit-btn" style="display:none;">Cancel</button>
                </div>
                <div class="memory-actions">
                    <button class="update-btn">Update</button>
                </div>
                
            </div>
        `;
        memoryListDiv.appendChild(itemDiv);
    });
}

function renderCategoryManagement() {
    const catDiv = document.querySelector('.category-management');
    if (!catDiv) return;
    const categoriesHtml = allCategoriesCache.map(cat =>
        `<span class="category-tag" style="background-color: ${stringToHslColor(cat)};" data-cat="${cat}">${cat}
            ${cat !== 'default' ? `<button class="delete-category-btn" data-cat="${cat}" title="Delete category">&times;</button>` : ''}
        </span>`
    ).join(' ');
    // Insert after the add category input
    let catListDiv = catDiv.querySelector('.category-list');
    if (!catListDiv) {
        catListDiv = document.createElement('div');
        catListDiv.className = 'category-list';
        catDiv.appendChild(catListDiv);
    }
    catListDiv.innerHTML = categoriesHtml;
    // Add event listeners for delete buttons
    catListDiv.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.onclick = function(e) {
            const cat = btn.getAttribute('data-cat');
            if (confirm(`Delete category '${cat}'? Memories with this category will not be deleted.`)) {
                deleteCategory(cat);
            }
            e.stopPropagation();
        };
    });
    // Add event listeners for category filter (multi-select)
    catListDiv.querySelectorAll('.category-tag').forEach(tag => {
        tag.onclick = function(e) {
            if (e.target.classList.contains('delete-category-btn')) return;
            const cat = tag.getAttribute('data-cat');
            if (selectedCategoryFilters.has(cat)) {
                selectedCategoryFilters.delete(cat);
            } else {
                selectedCategoryFilters.add(cat);
            }
            renderSelectedCategoryFilter();
            filterMemoriesByCategories();
        };
        // Highlight selected tags
        if (selectedCategoryFilters.has(tag.getAttribute('data-cat'))) {
            tag.style.outline = '2px solid #10a37f';
            tag.style.background = '#23232b';
        } else {
            tag.style.outline = '';
            tag.style.background = stringToHslColor(tag.getAttribute('data-cat'));
        }
    });
}

function renderSelectedCategoryFilter() {
    let filterDiv = document.getElementById('selected-category-filter');
    if (!selectedCategoryFilters || selectedCategoryFilters.size === 0) {
        if (filterDiv) filterDiv.innerHTML = '';
        return;
    }
    if (!filterDiv) {
        filterDiv = document.createElement('div');
        filterDiv.id = 'selected-category-filter';
        const searchInput = document.getElementById('memorySearch');
        searchInput.parentNode.insertBefore(filterDiv, searchInput.nextSibling);
    }
    filterDiv.innerHTML = Array.from(selectedCategoryFilters).map(cat =>
        `<span class="selected-category-filter">${cat}
            <button class="deselect-category-btn" data-cat="${cat}" title="Remove filter">&times;</button></span>`
    ).join(' ');
    filterDiv.querySelectorAll('.deselect-category-btn').forEach(btn => {
        btn.onclick = function() {
            const cat = btn.getAttribute('data-cat');
            selectedCategoryFilters.delete(cat);
            renderSelectedCategoryFilter();
            filterMemoriesByCategories();
        };
    });
}

function filterMemoriesByCategories() {
    if (!selectedCategoryFilters || selectedCategoryFilters.size === 0) {
        renderMemories(allMemoriesCache);
        return;
    }
    // Show only memories that have ALL selected categories (AND logic)
    const filtered = allMemoriesCache.filter(m =>
        m.categories && Array.from(selectedCategoryFilters).every(cat => m.categories.includes(cat))
    );
    renderMemories(filtered);
}

function renderRemindButton() {
    const container = document.getElementById('remind-container');
    container.innerHTML = '';
    if (allMemoriesCache.length > 0) {
        const remindBtn = document.createElement('button');
        remindBtn.textContent = 'Remind ChatGPT of Selected';
        remindBtn.className = 'main-action-btn';
        remindBtn.style.width = '100%';
        remindBtn.onclick = handleRemindSelected;
        container.appendChild(remindBtn);
    }
}

function handleRemindSelected() {
    const selectedIds = Array.from(document.querySelectorAll('.memory-checkbox:checked'))
        .map(cb => cb.closest('.memory-item').dataset.id);

    if (selectedIds.length === 0) {
        alert('Please select at least one memory to remind ChatGPT.');
        return;
    }

    const selectedMemories = allMemoriesCache.filter(m => selectedIds.includes(m.id));
    
    let memoryText = selectedMemories.map(m => `Title: ${m.title}\nInfo: ${m.info}`).join('\n\n---\n\n');
    const remindPrompt = `[CONTEXT_UPDATE]\nThe following are specific memories I've selected from our previous conversations. I am providing them to restore your context. Read and internalize them.\n\nOnce you have processed this information, your ONLY response should be: "How can I help you today?"\n\n--- START MEMORIES ---\n\n${memoryText}\n\n--- END MEMORIES ---\n\nNow, provide only the confirmation message and await my next real prompt.`;
    sendMessageToContentScript({ action: 'remind', prompt: remindPrompt });
}

function addNewCategory() {
    const input = document.getElementById('new-category-input');
    const newCategory = input.value.trim().toLowerCase();
    if (newCategory && !allCategoriesCache.includes(newCategory)) {
        const updatedCategories = [...allCategoriesCache, newCategory];
        chrome.storage.local.set({ memory_categories: updatedCategories }, () => {
            input.value = '';
            loadData();
        });
    }
}


function showDeleteConfirmDialog(id) {
    // Remove any existing modal
    const oldModal = document.getElementById('delete-memory-modal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'delete-memory-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.35)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';

    modal.innerHTML = `
        <div style="background:#23232b; color:#fff; padding:32px 28px; border-radius:14px; box-shadow:0 2px 16px #0008; min-width:320px; text-align:center;">
            <div style="font-size:17px; margin-bottom:18px;">Delete this memory?</div>
            <div style="margin-bottom:22px; font-size:13px; color:#ffe082;">This action cannot be undone.</div>
            <button id="confirm-delete-btn" style="background:#ff5c5c; color:#fff; border:none; border-radius:8px; padding:7px 22px; font-size:15px; margin-right:18px; cursor:pointer;">Delete</button>
            <button id="cancel-delete-btn" style="background:#393945; color:#fff; border:none; border-radius:8px; padding:7px 22px; font-size:15px; cursor:pointer;">Cancel</button>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('confirm-delete-btn').onclick = function() {
        modal.remove();
        deleteMemory(id, true);
    };
    document.getElementById('cancel-delete-btn').onclick = function() {
        modal.remove();
    };
}

function deleteMemory(id, skipConfirm) {
    if (!skipConfirm) {
        showDeleteConfirmDialog(id);
        return;
    }
    // Remove from cache in-place
    const idx = allMemoriesCache.findIndex(mem => mem.id === id);
    if (idx !== -1) {
        allMemoriesCache.splice(idx, 1);
        // Remove from DOM directly for instant feedback
        const itemDiv = document.querySelector(`.memory-item[data-id="${id}"]`);
        if (itemDiv && itemDiv.parentNode) itemDiv.parentNode.removeChild(itemDiv);
        // Save updated array to storage
        chrome.storage.local.set({ memories: allMemoriesCache });
    }
}

function toggleEditMode(itemDiv, isEditing) {
    const titleSpan = itemDiv.querySelector('.memory-title span');
    const infoDiv = itemDiv.querySelector('.memory-info');
    const infoPre = infoDiv.querySelector('pre');
    
    itemDiv.querySelector('.edit-btn').style.display = isEditing ? 'none' : 'inline-block';
    itemDiv.querySelector('.delete-btn').style.display = isEditing ? 'none' : 'inline-block';
    itemDiv.querySelector('.go-to-chat-btn').style.display = 'none'; // Hide during edit
    itemDiv.querySelector('.save-edit-btn').style.display = isEditing ? 'inline-block' : 'none';
    itemDiv.querySelector('.cancel-edit-btn').style.display = isEditing ? 'inline-block' : 'none';

    if (isEditing) {
        const memory = allMemoriesCache.find(m => m.id === itemDiv.dataset.id);
        
        titleSpan.innerHTML = `<input type="text" class="edit-title-input" value="${memory.title}" />`;
        infoPre.innerHTML = `<textarea class="edit-textarea">${memory.info}</textarea>`;
        
        const categoryCheckboxes = allCategoriesCache.map(cat => `
            <label>
                <input type="checkbox" class="category-checkbox" value="${cat}" ${memory.categories && memory.categories.includes(cat) ? 'checked' : ''}>
                ${cat}
            </label>
        `).join('');
        const categoryEditor = document.createElement('div');
        categoryEditor.className = 'edit-categories';
        categoryEditor.innerHTML = `<h4>Categories</h4>${categoryCheckboxes}`;
        infoDiv.appendChild(categoryEditor);

        itemDiv.classList.add('expanded');
        infoDiv.style.display = 'block';
    } else {
        renderMemories(allMemoriesCache);
    }
}

function saveMemoryChanges(itemDiv, id) {
    const newTitle = itemDiv.querySelector('.edit-title-input').value.trim();
    const newInfo = itemDiv.querySelector('.edit-textarea').value.trim();
    if (!newTitle) { 
        alert("Title cannot be empty."); 
        return; 
    }

    const selectedCategories = Array.from(itemDiv.querySelectorAll('.edit-categories .category-checkbox:checked')).map(cb => cb.value);

    const memoryIndex = allMemoriesCache.findIndex(mem => mem.id === id);
    if (memoryIndex !== -1) {
        allMemoriesCache[memoryIndex].title = newTitle;
        allMemoriesCache[memoryIndex].info = newInfo;
        allMemoriesCache[memoryIndex].categories = selectedCategories;
    }

    chrome.storage.local.set({ memories: allMemoriesCache }, loadData);
}

function filterMemories() {
    const query = document.getElementById('memorySearch').value.trim().toLowerCase();
    if (!query) { 
        renderMemories(allMemoriesCache); 
        return; 
    }
    const filtered = allMemoriesCache.filter(m => 
        (m.title && m.title.toLowerCase().includes(query)) || 
        (m.info && m.info.toLowerCase().includes(query)) || 
        (m.categories && m.categories.some(cat => cat.toLowerCase().includes(query))) 
    );
    renderMemories(filtered);
}

function sendMessageToContentScript(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, message);
        }
    });
}

function deleteCategory(cat) {
    if (cat === 'default') return;
    // Remove from categories list
    const newCategories = allCategoriesCache.filter(c => c !== cat);
    // Remove from memories' categories (create new array only if needed)
    let changed = false;
    const newMemories = allMemoriesCache.map(m => {
        if (m.categories && m.categories.includes(cat)) {
            changed = true;
            return { ...m, categories: m.categories.filter(c => c !== cat) };
        }
        return m;
    });
    allCategoriesCache = newCategories;
    allMemoriesCache = newMemories;
    chrome.storage.local.set({
        memory_categories: newCategories,
        memories: newMemories
    }, loadData);
}

function handleGenerateMemory(type) {
    const customInstruction = document.getElementById('customInstruction').value.trim();
    let prompt = type === 'last' ? PROMPT_LAST_EXCHANGE : PROMPT_WHOLE_CHAT;
    if (updatingMemoryId) {
        // Find the memory being updated
        const memory = allMemoriesCache.find(m => m.id === updatingMemoryId);
        if (memory) {
            // Add update context to the prompt with [START_MEMORY_EDIT] and Id, and [END_MEMORY_EDIT]
            prompt = `[MEMORY_UPDATE_REQUEST]\nYou are strictly forbidden from creating any new memory object or outputting anything except the updated memory edit, and only if you are explicitly instructed to do so using this prompt.\n\nYou are about to update the following memory based on the latest context.\n\n--- MEMORY TO UPDATE ---\nId: ${memory.id}\nTitle: ${memory.title}\nInfo: ${memory.info}\n--- END MEMORY ---\n\nAnalyze the latest context (last exchange or whole chat as selected) and update the memory accordingly.\n\nYou MUST output ONLY the updated memory, strictly within the [START_MEMORY_EDIT] and [END_MEMORY_EDIT] markers, and absolutely nothing else. Do NOT create a new memory, do NOT output any conversational text, explanations, or any output outside the markers.\n\nIf you are not explicitly asked using this prompt, do NOT create or update any memory.\n\nFormat:\n[START_MEMORY_EDIT]\nId: [id]\nTitle: [title]\nInfo: [info]\n[END_MEMORY_EDIT]\n\n` + prompt;
        }
    }
    if (customInstruction) {
        prompt += `\n\n[USER_INSTRUCTION]\n${customInstruction}`;
    }
    if (updatingMemoryId) {
        sendMessageToContentScript({ action: 'updateMemory', prompt, memoryId: updatingMemoryId });
    } else {
        sendMessageToContentScript({ action: 'generateMemory', prompt });
    }
}