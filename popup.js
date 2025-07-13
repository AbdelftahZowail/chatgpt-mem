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
        #add-category-btn { padding: 8px 12px; background: #23232b; color: #ececf1; border: none; border-radius: 10px; cursor: pointer; }
        
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

const PROMPT_LAST_EXCHANGE = `[SYSTEM_COMMAND]\nAnalyze ONLY the last user message and your last response. Your task is to extract the most critical, reusable piece of information, a key decision, or a core fact that should be remembered for future context.\n\nStrictly format your output as a memory object within the specified markers. Do not add any conversational text or explanations before or after the markers.\n\nThe format is:\n[START_MEMORY]\nTitle: [A concise, descriptive title for the memory, 5-10 words]\nInfo: [A detailed but brief summary of the information to be remembered.]\n[END_MEMORY]`;
const PROMPT_WHOLE_CHAT = `[SYSTEM_COMMAND]\nAnalyze our ENTIRE conversation history up to this point. Your task is to identify and synthesize the most globally important facts, user preferences, or overarching goals.\n\nStrictly format your output as a memory object within the specified markers. Do not add any conversational text or explanations before or after the markers.\n\nThe format is:\n[START_MEMORY]\nTitle: [A concise, descriptive title for the overall chat memory, 5-10 words]\nInfo: [A bulleted or paragraph summary of the most critical, high-level information from the entire chat.]\n[END_MEMORY]`;

let allMemoriesCache = [];
let allCategoriesCache = [];
let selectedCategoryFilters = new Set();

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
    document.getElementById('saveLastBtn').addEventListener('click', () => sendMessageToContentScript({ action: 'generateMemory', prompt: PROMPT_LAST_EXCHANGE }));
    document.getElementById('saveChatBtn').addEventListener('click', () => sendMessageToContentScript({ action: 'generateMemory', prompt: PROMPT_WHOLE_CHAT }));
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'memory_created') loadData();
    });
    
    document.getElementById('memory-list').addEventListener('click', handleMemoryListClick);
});

// Color generation function
function stringToHslColor(str, s = 60, l = 45) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, ${s}%, ${l}%)`;
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

function deleteMemory(id) {
    if (!confirm('Are you sure you want to delete this memory?')) return;
    const updatedMemories = allMemoriesCache.filter(mem => mem.id !== id);
    chrome.storage.local.set({ memories: updatedMemories }, loadData);
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