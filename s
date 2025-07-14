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
    // Update button logic
    if (e.target.matches('.update-btn')) {
        updatingMemoryId = memoryItem.dataset.id;
        scrollToGenerateMemorySection();
        showUpdatingMemoryBanner(updatingMemoryId);
        return;
    }
}

function scrollToGenerateMemorySection() {
    // Scroll to the generate memory section
    const generateSection = document.getElementById('generate-buttons');
    if (generateSection) {
        generateSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
                        <span>
                    <input type="checkbox" class="memory-checkbox" />
                    ${memory.id}
                </span>

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
                <button class="update-btn" style="margin-left:auto; background: #10a37f; color: #fff; border-radius: 10px; padding: 4px 14px; font-size: 12px; cursor: pointer;">Update</button>
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

function handleGenerateMemory(type) {
    const customInstruction = document.getElementById('customInstruction').value.trim();
    let prompt = type === 'last' ? PROMPT_LAST_EXCHANGE : PROMPT_WHOLE_CHAT;
    if (updatingMemoryId) {
        // Find the memory being updated
        const memory = allMemoriesCache.find(m => m.id === updatingMemoryId);
        if (memory) {
            // Add update context to the prompt with [START_MEMORY_EDIT] and Id, and [END_MEMORY_EDIT]
            prompt = `[MEMORY_UPDATE_REQUEST]\nYou are about to update the following memory based on the latest context.\n\n--- MEMORY TO UPDATE ---\nId: ${memory.id}\nTitle: ${memory.title}\nInfo: ${memory.info}\n--- END MEMORY ---\n\nAnalyze the latest context (last exchange or whole chat as selected) and update the memory accordingly. Do NOT create a new memory, but provide the updated Id, title and info in the same format, using [START_MEMORY_EDIT] and [END_MEMORY_EDIT] tags.\n\nFormat:\n[START_MEMORY_EDIT]\nId: [id]\nTitle: [title]\nInfo: [info]\n[END_MEMORY_EDIT]\n\n` + prompt;
            prompt.replaceAll('[START_MEMORY]', '[START_MEMORY_EDIT]');
            prompt.replaceAll('[END_MEMORY]', '[END_MEMORY_EDIT]');
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
this should detect certian patterns that were sent by the ai chat bot
but its not working because
the bot streams the answer not send it all at once this is how it looks like when streaming
<article class="text-token-text-primary w-full" dir="auto" data-testid="conversation-turn-4" data-scroll-anchor="true" style="min-height: calc(-248px + 100dvh);"><h6 class="sr-only">ChatGPT said:</h6><div class="text-base my-auto mx-auto py-5 [--thread-content-margin:--spacing(4)] @[37rem]:[--thread-content-margin:--spacing(6)] @[72rem]:[--thread-content-margin:--spacing(16)] px-(--thread-content-margin)"><div class="[--thread-content-max-width:32rem] @[34rem]:[--thread-content-max-width:40rem] @[64rem]:[--thread-content-max-width:48rem] mx-auto flex max-w-(--thread-content-max-width) flex-1 text-base gap-4 md:gap-5 lg:gap-6 group/turn-messages focus-visible:outline-hidden" tabindex="-1"><div class="group/conversation-turn relative flex w-full min-w-0 flex-col agent-turn"><div class="relative flex-col gap-1 md:gap-3"><div class="flex max-w-full flex-col grow"><div data-message-author-role="assistant" data-message-id="f32f4245-bb81-48ff-925b-d12ecb8b67a7" dir="auto" class="min-h-8 text-message relative flex w-full flex-col items-end gap-2 text-start break-words whitespace-normal [.text-message+&amp;]:mt-5" data-message-model-slug="gpt-4-1-mini"><div class="flex w-full flex-col gap-1 empty:hidden first:pt-[3px]"><div class="streaming-animation markdown prose dark:prose-invert w-full break-words dark"><p data-start="0" data-end="94">Sure! Here’s an article on how big AI companies might be impacting penguins’ natural habitats:</p>
<hr data-start="96" data-end="99">
<p data-start="101" data-end="165"><strong data-start="101" data-end="165">How Big AI Companies Are Affecting Penguins’ Natural Habitat</strong></p>
<p data-start="167" data-end="613">In recent years, the rise of artificial intelligence (AI) has revolutionized industries and transformed everyday life. Behind this technological boom are powerful AI companies whose operations depend heavily on extensive data centers and global infrastructure. While AI development offers incredible potential, its environmental footprint is increasingly raising concerns — including its indirect effects on vulnerable wildlife, such as penguins.</p>
<h3 data-start="615" data-end="662">The Environmental Cost of AI Infrastructure</h3>
<p data-start="664" data-end="1194">AI companies require massive computational power to train complex models, necessitating huge data centers worldwide. These data centers consume enormous amounts of electricity and require substantial physical space, often located near natural environments to benefit from cooler climates for energy-efficient cooling. Regions near the poles, including Antarctica and sub-Antarctic islands, are some of the coldest on Earth and are sometimes targeted for data center construction or resource extraction to support these facilities.</p>
<h3 data-start="1196" data-end="1230">Disruption to Penguin Habitats</h3>
<p data-start="1232" data-end="1419" data-is-last-node="" data-is-only-node="">Penguins predominantly inhabit Antarctica and surrounding islands, environments that are extremely sensitive and already under pressure from climate change. While there are currently no l</p></div></div></div></div></div></div></div></div></article>
and this is how it looks like finished
<article class="text-token-text-primary w-full" dir="auto" data-testid="conversation-turn-4" data-scroll-anchor="true" style="min-height: calc(-248px + 100dvh);"><h6 class="sr-only">ChatGPT said:</h6><div class="text-base my-auto mx-auto py-5 [--thread-content-margin:--spacing(4)] @[37rem]:[--thread-content-margin:--spacing(6)] @[72rem]:[--thread-content-margin:--spacing(16)] px-(--thread-content-margin)"><div class="[--thread-content-max-width:32rem] @[34rem]:[--thread-content-max-width:40rem] @[64rem]:[--thread-content-max-width:48rem] mx-auto flex max-w-(--thread-content-max-width) flex-1 text-base gap-4 md:gap-5 lg:gap-6 group/turn-messages focus-visible:outline-hidden" tabindex="-1"><div class="group/conversation-turn relative flex w-full min-w-0 flex-col agent-turn"><div class="relative flex-col gap-1 md:gap-3"><div class="flex max-w-full flex-col grow"><div data-message-author-role="assistant" data-message-id="f32f4245-bb81-48ff-925b-d12ecb8b67a7" dir="auto" class="min-h-8 text-message relative flex w-full flex-col items-end gap-2 text-start break-words whitespace-normal [.text-message+&amp;]:mt-5" data-message-model-slug="gpt-4-1-mini"><div class="flex w-full flex-col gap-1 empty:hidden first:pt-[3px]"><div class="markdown prose dark:prose-invert w-full break-words dark"><p data-start="0" data-end="94">Sure! Here’s an article on how big AI companies might be impacting penguins’ natural habitats:</p>
<hr data-start="96" data-end="99">
<p data-start="101" data-end="165"><strong data-start="101" data-end="165">How Big AI Companies Are Affecting Penguins’ Natural Habitat</strong></p>
<p data-start="167" data-end="613">In recent years, the rise of artificial intelligence (AI) has revolutionized industries and transformed everyday life. Behind this technological boom are powerful AI companies whose operations depend heavily on extensive data centers and global infrastructure. While AI development offers incredible potential, its environmental footprint is increasingly raising concerns — including its indirect effects on vulnerable wildlife, such as penguins.</p>
<h3 data-start="615" data-end="662">The Environmental Cost of AI Infrastructure</h3>
<p data-start="664" data-end="1194">AI companies require massive computational power to train complex models, necessitating huge data centers worldwide. These data centers consume enormous amounts of electricity and require substantial physical space, often located near natural environments to benefit from cooler climates for energy-efficient cooling. Regions near the poles, including Antarctica and sub-Antarctic islands, are some of the coldest on Earth and are sometimes targeted for data center construction or resource extraction to support these facilities.</p>
<h3 data-start="1196" data-end="1230">Disruption to Penguin Habitats</h3>
<p data-start="1232" data-end="1654">Penguins predominantly inhabit Antarctica and surrounding islands, environments that are extremely sensitive and already under pressure from climate change. While there are currently no large AI data centers on penguin-inhabited land, the broader industrial footprint linked to AI — including mining for rare earth metals essential for electronics and infrastructure — is increasing human activity in these remote regions.</p>
<p data-start="1656" data-end="1997">Mining operations disrupt the terrain, pollute the air and water, and introduce noise and human presence, all of which disturb penguin breeding grounds and food sources. Additionally, expanding shipping routes to support global tech supply chains increase the risk of oil spills and collisions with marine life, further endangering penguins.</p>
<h3 data-start="1999" data-end="2065">Climate Change: An Overarching Threat Amplified by Tech Growth</h3>
<p data-start="2067" data-end="2526">The tech industry's high energy demand often relies on fossil fuels, contributing to greenhouse gas emissions and accelerating climate change. Melting ice sheets and shifting ocean currents threaten penguins’ food availability and nesting sites, making them more vulnerable to starvation and population decline. Though AI itself is neutral, the environmental cost of supporting its infrastructure indirectly accelerates habitat loss for species like penguins.</p>
<h3 data-start="2528" data-end="2579">Towards Sustainable AI and Conservation Efforts</h3>
<p data-start="2581" data-end="2963">Recognizing this impact, some AI companies are striving to reduce their carbon footprints by investing in renewable energy, improving data center efficiency, and supporting conservation initiatives. Collaborative efforts between environmentalists, governments, and tech firms are essential to ensure that technological progress does not come at the expense of vulnerable ecosystems.</p>
<h3 data-start="2965" data-end="2979">Conclusion</h3>
<p data-start="2981" data-end="3359">While AI companies bring remarkable advancements, their environmental impact extends beyond obvious concerns to subtle but significant disruptions in natural habitats, including those of penguins. Sustainable practices, responsible resource management, and proactive conservation are vital to preserving the delicate balance of these ecosystems while embracing the future of AI.</p>
<hr data-start="3361" data-end="3364">
<p data-start="3366" data-end="3442" data-is-last-node="" data-is-only-node="">Would you like me to tailor it for a specific publication style or audience?</p></div></div></div></div><div class="flex min-h-[46px] justify-start"><div class="touch:-me-2 touch:-ms-3.5 -ms-2.5 -me-1 flex flex-wrap items-center gap-y-4 p-1 select-none touch:w-[calc(100%+--spacing(3.5))] -mt-1 w-[calc(100%+--spacing(2.5))] duration-[1.5s] focus-within:transition-none hover:transition-none pointer-events-none [mask-image:linear-gradient(to_right,black_33%,transparent_66%)] [mask-size:300%_100%] [mask-position:100%_0%] motion-safe:transition-[mask-position] group-hover/turn-messages:pointer-events-auto group-hover/turn-messages:[mask-position:0_0] group-focus-within/turn-messages:pointer-events-auto group-focus-within/turn-messages:[mask-position:0_0] has-data-[state=open]:pointer-events-auto has-data-[state=open]:[mask-position:0_0]" style="mask-position: 0% 0%;"><div class="text-token-text-secondary flex items-center justify-center"><button class="hover:bg-token-main-surface-secondary touch:w-[32px] flex h-[30px] w-[24px] items-center justify-center rounded-md disabled:opacity-50 disabled:hover:bg-transparent" aria-label="Previous response"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-rtl-flip="" class="icon"><path d="M11.5292 3.7793C11.7889 3.5196 12.211 3.5196 12.4707 3.7793C12.7304 4.039 12.7304 4.461 12.4707 4.7207L7.19136 10L12.4707 15.2793L12.5556 15.3838C12.7261 15.6419 12.6979 15.9934 12.4707 16.2207C12.2434 16.448 11.8919 16.4762 11.6337 16.3057L11.5292 16.2207L5.77925 10.4707C5.51955 10.211 5.51955 9.789 5.77925 9.5293L11.5292 3.7793Z"></path></svg></button><div class="px-0.5 text-sm font-semibold tabular-nums">4/4</div><button disabled="" aria-label="Next response" class="hover:bg-token-main-surface-secondary touch:w-[32px] flex h-[30px] w-[24px] items-center justify-center rounded-md disabled:opacity-50 disabled:hover:bg-transparent"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-rtl-flip="" class="icon"><path d="M7.52925 3.7793C7.75652 3.55203 8.10803 3.52383 8.36616 3.69434L8.47065 3.7793L14.2207 9.5293C14.4804 9.789 14.4804 10.211 14.2207 10.4707L8.47065 16.2207C8.21095 16.4804 7.78895 16.4804 7.52925 16.2207C7.26955 15.961 7.26955 15.539 7.52925 15.2793L12.8085 10L7.52925 4.7207L7.44429 4.61621C7.27378 4.35808 7.30198 4.00657 7.52925 3.7793Z"></path></svg></button></div><button class="text-token-text-secondary hover:bg-token-bg-secondary rounded-lg" aria-label="Copy" aria-selected="false" data-testid="copy-turn-action-button" data-state="closed"><span class="touch:w-10 flex h-8 w-8 items-center justify-center"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon"><path d="M12.668 10.667C12.668 9.95614 12.668 9.46258 12.6367 9.0791C12.6137 8.79732 12.5758 8.60761 12.5244 8.46387L12.4688 8.33399C12.3148 8.03193 12.0803 7.77885 11.793 7.60254L11.666 7.53125C11.508 7.45087 11.2963 7.39395 10.9209 7.36328C10.5374 7.33197 10.0439 7.33203 9.33301 7.33203H6.5C5.78896 7.33203 5.29563 7.33195 4.91211 7.36328C4.63016 7.38632 4.44065 7.42413 4.29688 7.47559L4.16699 7.53125C3.86488 7.68518 3.61186 7.9196 3.43555 8.20703L3.36524 8.33399C3.28478 8.49198 3.22795 8.70352 3.19727 9.0791C3.16595 9.46259 3.16504 9.95611 3.16504 10.667V13.5C3.16504 14.211 3.16593 14.7044 3.19727 15.0879C3.22797 15.4636 3.28473 15.675 3.36524 15.833L3.43555 15.959C3.61186 16.2466 3.86474 16.4807 4.16699 16.6348L4.29688 16.6914C4.44063 16.7428 4.63025 16.7797 4.91211 16.8027C5.29563 16.8341 5.78896 16.835 6.5 16.835H9.33301C10.0439 16.835 10.5374 16.8341 10.9209 16.8027C11.2965 16.772 11.508 16.7152 11.666 16.6348L11.793 16.5645C12.0804 16.3881 12.3148 16.1351 12.4688 15.833L12.5244 15.7031C12.5759 15.5594 12.6137 15.3698 12.6367 15.0879C12.6681 14.7044 12.668 14.211 12.668 13.5V10.667ZM13.998 12.665C14.4528 12.6634 14.8011 12.6602 15.0879 12.6367C15.4635 12.606 15.675 12.5492 15.833 12.4688L15.959 12.3975C16.2466 12.2211 16.4808 11.9682 16.6348 11.666L16.6914 11.5361C16.7428 11.3924 16.7797 11.2026 16.8027 10.9209C16.8341 10.5374 16.835 10.0439 16.835 9.33301V6.5C16.835 5.78896 16.8341 5.29563 16.8027 4.91211C16.7797 4.63025 16.7428 4.44063 16.6914 4.29688L16.6348 4.16699C16.4807 3.86474 16.2466 3.61186 15.959 3.43555L15.833 3.36524C15.675 3.28473 15.4636 3.22797 15.0879 3.19727C14.7044 3.16593 14.211 3.16504 13.5 3.16504H10.667C9.9561 3.16504 9.46259 3.16595 9.0791 3.19727C8.79739 3.22028 8.6076 3.2572 8.46387 3.30859L8.33399 3.36524C8.03176 3.51923 7.77886 3.75343 7.60254 4.04102L7.53125 4.16699C7.4508 4.32498 7.39397 4.53655 7.36328 4.91211C7.33985 5.19893 7.33562 5.54719 7.33399 6.00195H9.33301C10.022 6.00195 10.5791 6.00131 11.0293 6.03809C11.4873 6.07551 11.8937 6.15471 12.2705 6.34668L12.4883 6.46875C12.984 6.7728 13.3878 7.20854 13.6533 7.72949L13.7197 7.87207C13.8642 8.20859 13.9292 8.56974 13.9619 8.9707C13.9987 9.42092 13.998 9.97799 13.998 10.667V12.665ZM18.165 9.33301C18.165 10.022 18.1657 10.5791 18.1289 11.0293C18.0961 11.4302 18.0311 11.7914 17.8867 12.1279L17.8203 12.2705C17.5549 12.7914 17.1509 13.2272 16.6553 13.5313L16.4365 13.6533C16.0599 13.8452 15.6541 13.9245 15.1963 13.9619C14.8593 13.9895 14.4624 13.9935 13.9951 13.9951C13.9935 14.4624 13.9895 14.8593 13.9619 15.1963C13.9292 15.597 13.864 15.9576 13.7197 16.2939L13.6533 16.4365C13.3878 16.9576 12.9841 17.3941 12.4883 17.6982L12.2705 17.8203C11.8937 18.0123 11.4873 18.0915 11.0293 18.1289C10.5791 18.1657 10.022 18.165 9.33301 18.165H6.5C5.81091 18.165 5.25395 18.1657 4.80371 18.1289C4.40306 18.0962 4.04235 18.031 3.70606 17.8867L3.56348 17.8203C3.04244 17.5548 2.60585 17.151 2.30176 16.6553L2.17969 16.4365C1.98788 16.0599 1.90851 15.6541 1.87109 15.1963C1.83431 14.746 1.83496 14.1891 1.83496 13.5V10.667C1.83496 9.978 1.83432 9.42091 1.87109 8.9707C1.90851 8.5127 1.98772 8.10625 2.17969 7.72949L2.30176 7.51172C2.60586 7.0159 3.04236 6.6122 3.56348 6.34668L3.70606 6.28027C4.04237 6.136 4.40303 6.07083 4.80371 6.03809C5.14051 6.01057 5.53708 6.00551 6.00391 6.00391C6.00551 5.53708 6.01057 5.14051 6.03809 4.80371C6.0755 4.34588 6.15483 3.94012 6.34668 3.56348L6.46875 3.34473C6.77282 2.84912 7.20856 2.44514 7.72949 2.17969L7.87207 2.11328C8.20855 1.96886 8.56979 1.90385 8.9707 1.87109C9.42091 1.83432 9.978 1.83496 10.667 1.83496H13.5C14.1891 1.83496 14.746 1.83431 15.1963 1.87109C15.6541 1.90851 16.0599 1.98788 16.4365 2.17969L16.6553 2.30176C17.151 2.60585 17.5548 3.04244 17.8203 3.56348L17.8867 3.70606C18.031 4.04235 18.0962 4.40306 18.1289 4.80371C18.1657 5.25395 18.165 5.81091 18.165 6.5V9.33301Z"></path></svg></span></button><button class="text-token-text-secondary hover:bg-token-bg-secondary rounded-lg" aria-label="Good response" aria-selected="false" data-testid="good-response-turn-action-button" data-state="closed"><span class="touch:w-10 flex h-8 w-8 items-center justify-center"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon"><path d="M10.9153 1.83987L11.2942 1.88772L11.4749 1.91507C13.2633 2.24201 14.4107 4.01717 13.9749 5.78225L13.9261 5.95901L13.3987 7.6719C13.7708 7.67575 14.0961 7.68389 14.3792 7.70608C14.8737 7.74486 15.3109 7.82759 15.7015 8.03323L15.8528 8.11819C16.5966 8.56353 17.1278 9.29625 17.3167 10.1475L17.347 10.3096C17.403 10.69 17.3647 11.0832 17.2835 11.5098C17.2375 11.7517 17.1735 12.0212 17.096 12.3233L16.8255 13.3321L16.4456 14.7276C16.2076 15.6001 16.0438 16.2356 15.7366 16.7305L15.595 16.9346C15.2989 17.318 14.9197 17.628 14.4866 17.8408L14.2982 17.9258C13.6885 18.1774 12.9785 18.1651 11.9446 18.1651H7.33331C6.64422 18.1651 6.08726 18.1657 5.63702 18.1289C5.23638 18.0962 4.87565 18.031 4.53936 17.8867L4.39679 17.8203C3.87576 17.5549 3.43916 17.151 3.13507 16.6553L3.013 16.4366C2.82119 16.0599 2.74182 15.6541 2.7044 15.1963C2.66762 14.7461 2.66827 14.1891 2.66827 13.5V11.667C2.66827 10.9349 2.66214 10.4375 2.77569 10.0137L2.83722 9.81253C3.17599 8.81768 3.99001 8.05084 5.01397 7.77639L5.17706 7.73928C5.56592 7.66435 6.02595 7.66799 6.66632 7.66799C6.9429 7.66799 7.19894 7.52038 7.33624 7.2803L10.2562 2.16995L10.3118 2.08792C10.4544 1.90739 10.6824 1.81092 10.9153 1.83987ZM7.33136 14.167C7.33136 14.9841 7.33714 15.2627 7.39386 15.4746L7.42999 15.5918C7.62644 16.1686 8.09802 16.6134 8.69171 16.7725L8.87042 16.8067C9.07652 16.8323 9.38687 16.835 10.0003 16.835H11.9446C13.099 16.835 13.4838 16.8228 13.7903 16.6963L13.8997 16.6465C14.1508 16.5231 14.3716 16.3444 14.5433 16.1221L14.6155 16.0166C14.7769 15.7552 14.8968 15.3517 15.1624 14.378L15.5433 12.9824L15.8079 11.9922C15.8804 11.7102 15.9368 11.4711 15.9769 11.2608C16.0364 10.948 16.0517 10.7375 16.0394 10.5791L16.0179 10.4356C15.9156 9.97497 15.641 9.57381 15.2542 9.31253L15.0814 9.20999C14.9253 9.12785 14.6982 9.06544 14.2747 9.03225C13.8477 8.99881 13.2923 8.99807 12.5003 8.99807C12.2893 8.99807 12.0905 8.89822 11.9651 8.72854C11.8398 8.55879 11.8025 8.33942 11.8646 8.13772L12.6556 5.56741L12.7054 5.36331C12.8941 4.35953 12.216 3.37956 11.1878 3.2178L8.49054 7.93948C8.23033 8.39484 7.81431 8.72848 7.33136 8.88967V14.167ZM3.99835 13.5C3.99835 14.2111 3.99924 14.7044 4.03058 15.0879C4.06128 15.4636 4.11804 15.675 4.19854 15.833L4.26886 15.959C4.44517 16.2466 4.69805 16.4808 5.0003 16.6348L5.13019 16.6905C5.27397 16.7419 5.46337 16.7797 5.74542 16.8028C5.97772 16.8217 6.25037 16.828 6.58722 16.8311C6.41249 16.585 6.27075 16.3136 6.1712 16.0215L6.10968 15.8194C5.99614 15.3956 6.00128 14.899 6.00128 14.167V9.00296C5.79386 9.0067 5.65011 9.01339 5.53741 9.02737L5.3587 9.06057C4.76502 9.21965 4.29247 9.66448 4.09601 10.2412L4.06085 10.3584C4.00404 10.5705 3.99835 10.8493 3.99835 11.667V13.5Z"></path></svg></span></button><button class="text-token-text-secondary hover:bg-token-bg-secondary rounded-lg" aria-label="Bad response" aria-selected="false" data-testid="bad-response-turn-action-button" data-state="closed"><span class="touch:w-10 flex h-8 w-8 items-center justify-center"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon"><path d="M12.6687 5.83304C12.6687 5.22006 12.6649 4.91019 12.6394 4.70413L12.6062 4.52542C12.4471 3.93179 12.0022 3.45922 11.4255 3.26272L11.3083 3.22757C11.0963 3.17075 10.8175 3.16507 9.99974 3.16507H8.0554C7.04558 3.16507 6.62456 3.17475 6.32982 3.26175L6.2097 3.30374C5.95005 3.41089 5.71908 3.57635 5.53392 3.78616L5.45677 3.87796C5.30475 4.0748 5.20336 4.33135 5.03392 4.91702L4.83763 5.6221L4.45677 7.01761C4.24829 7.78204 4.10326 8.31846 4.02318 8.73929C3.94374 9.15672 3.94298 9.39229 3.98119 9.56448L4.03587 9.75784C4.18618 10.1996 4.50043 10.5702 4.91771 10.7901L5.05052 10.8477C5.20009 10.9014 5.40751 10.9429 5.72533 10.9678C6.15231 11.0012 6.70771 11.002 7.49974 11.002C7.71076 11.002 7.90952 11.1018 8.0349 11.2715C8.14465 11.4201 8.18683 11.6067 8.15404 11.7862L8.13548 11.8623L7.34447 14.4326C7.01523 15.5033 7.71404 16.6081 8.81126 16.7813L11.5095 12.0606L11.5827 11.9405C11.8445 11.5461 12.2289 11.2561 12.6687 11.1094V5.83304ZM17.3318 8.33304C17.3318 8.97366 17.3364 9.43432 17.2615 9.82327L17.2234 9.98538C16.949 11.0094 16.1821 11.8233 15.1872 12.1621L14.9861 12.2237C14.5624 12.3372 14.0656 12.3321 13.3337 12.3321C13.0915 12.3321 12.8651 12.4453 12.7204 12.6348L12.6638 12.7198L9.74388 17.8301C9.61066 18.0631 9.35005 18.1935 9.08372 18.1602L8.70579 18.1123C6.75379 17.8682 5.49542 15.9213 6.07396 14.041L6.60033 12.3272C6.22861 12.3233 5.90377 12.3161 5.62083 12.294C5.18804 12.26 4.79914 12.1931 4.44701 12.0391L4.29857 11.9668C3.52688 11.5605 2.95919 10.8555 2.72533 10.0205L2.68333 9.85257C2.58769 9.42154 2.62379 8.97768 2.71654 8.49026C2.80865 8.00634 2.97082 7.41139 3.17357 6.668L3.55443 5.27249L3.74583 4.58011C3.9286 3.94171 4.10186 3.45682 4.40404 3.06546L4.53685 2.9053C4.85609 2.54372 5.25433 2.25896 5.70189 2.07425L5.93626 1.99222C6.49455 1.82612 7.15095 1.83499 8.0554 1.83499H12.6667C13.3558 1.83499 13.9128 1.83434 14.363 1.87112C14.8208 1.90854 15.2266 1.98789 15.6033 2.17972L15.821 2.30179C16.317 2.6059 16.7215 3.04226 16.987 3.56351L17.0535 3.70608C17.1977 4.04236 17.2629 4.40311 17.2956 4.80374C17.3324 5.25398 17.3318 5.81094 17.3318 6.50003V8.33304ZM13.9978 10.9961C14.3321 10.9901 14.5013 10.977 14.6413 10.9395L14.7585 10.9033C15.3353 10.7069 15.7801 10.2353 15.9392 9.64163L15.9724 9.46292C15.998 9.25682 16.0017 8.94657 16.0017 8.33304V6.50003C16.0017 5.78899 16.0008 5.29566 15.9695 4.91214C15.9464 4.6301 15.9086 4.44069 15.8572 4.2969L15.8015 4.16702C15.6475 3.86478 15.4133 3.6119 15.1257 3.43558L14.9997 3.36526C14.8418 3.28477 14.6302 3.228 14.2546 3.19729C14.0221 3.1783 13.7491 3.17109 13.4118 3.168C13.6267 3.47028 13.7914 3.81126 13.8904 4.18069L13.9275 4.34378C13.981 4.62163 13.9947 4.93582 13.9978 5.3262V10.9961Z"></path></svg></span></button><button class="text-token-text-secondary hover:bg-token-bg-secondary rounded-lg" aria-label="Read aloud" aria-selected="false" data-testid="voice-play-turn-action-button" data-state="closed"><span class="touch:w-10 flex h-8 w-8 items-center justify-center"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon"><path d="M9.75122 4.09203C9.75122 3.61482 9.21964 3.35044 8.84399 3.60277L8.77173 3.66039L6.55396 5.69262C6.05931 6.14604 5.43173 6.42255 4.7688 6.48461L4.48267 6.49828C3.52474 6.49851 2.74829 7.27565 2.74829 8.23363V11.7668C2.74829 12.7248 3.52474 13.501 4.48267 13.5012C5.24935 13.5012 5.98874 13.7889 6.55396 14.3069L8.77173 16.3401L8.84399 16.3967C9.21966 16.6493 9.75122 16.3858 9.75122 15.9084V4.09203ZM17.2483 10.0002C17.2483 8.67623 16.9128 7.43233 16.3235 6.34691L17.4924 5.71215C18.1849 6.9875 18.5784 8.4491 18.5784 10.0002C18.5783 11.5143 18.2033 12.9429 17.5413 14.1965C17.3697 14.5212 16.9675 14.6453 16.6428 14.4739C16.3182 14.3023 16.194 13.9001 16.3655 13.5754C16.9288 12.5086 17.2483 11.2927 17.2483 10.0002ZM13.9182 10.0002C13.9182 9.1174 13.6268 8.30445 13.135 7.64965L14.1985 6.85082C14.8574 7.72804 15.2483 8.81952 15.2483 10.0002L15.2336 10.3938C15.166 11.3044 14.8657 12.1515 14.3918 12.8743L14.3069 12.9797C14.0889 13.199 13.7396 13.2418 13.4709 13.0657C13.164 12.8643 13.0784 12.4528 13.2795 12.1457L13.4231 11.9084C13.6935 11.4246 13.8643 10.8776 13.9075 10.2942L13.9182 10.0002ZM13.2678 6.71801C13.5615 6.49772 13.978 6.55727 14.1985 6.85082L13.135 7.64965C12.9144 7.35599 12.9742 6.93858 13.2678 6.71801ZM16.5911 5.44555C16.9138 5.27033 17.3171 5.38949 17.4924 5.71215L16.3235 6.34691C16.1483 6.02419 16.2684 5.62081 16.5911 5.44555ZM11.0813 15.9084C11.0813 17.5226 9.22237 18.3912 7.9895 17.4202L7.87231 17.3205L5.65552 15.2873C5.33557 14.9941 4.91667 14.8313 4.48267 14.8313C2.7902 14.8311 1.41821 13.4594 1.41821 11.7668V8.23363C1.41821 6.54111 2.7902 5.16843 4.48267 5.1682L4.64478 5.16039C5.02003 5.12526 5.37552 4.96881 5.65552 4.71215L7.87231 2.67992L7.9895 2.58031C9.22237 1.60902 11.0813 2.47773 11.0813 4.09203V15.9084Z"></path></svg></span></button><button class="text-token-text-secondary hover:bg-token-bg-secondary rounded-lg" aria-label="Edit in canvas" aria-selected="false" data-state="closed"><span class="touch:w-10 flex h-8 w-8 items-center justify-center"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon"><path d="M12.0303 4.11328C13.4406 2.70317 15.7275 2.70305 17.1377 4.11328C18.5474 5.52355 18.5476 7.81057 17.1377 9.2207L10.8457 15.5117C10.522 15.8354 10.2868 16.0723 10.0547 16.2627L9.82031 16.4395C9.61539 16.5794 9.39783 16.7003 9.1709 16.7998L8.94141 16.8916C8.75976 16.9582 8.57206 17.0072 8.35547 17.0518L7.59082 17.1865L5.19727 17.5859C5.05455 17.6097 4.90286 17.6358 4.77441 17.6455C4.67576 17.653 4.54196 17.6555 4.39648 17.6201L4.24707 17.5703C4.02415 17.4746 3.84119 17.3068 3.72559 17.0957L3.67969 17.0029C3.59322 16.8013 3.59553 16.6073 3.60547 16.4756C3.61519 16.3473 3.6403 16.1963 3.66406 16.0537L4.06348 13.6602C4.1638 13.0582 4.22517 12.6732 4.3584 12.3096L4.45117 12.0791C4.55073 11.8521 4.67152 11.6346 4.81152 11.4297L4.9873 11.1953C5.17772 10.9632 5.4146 10.728 5.73828 10.4043L12.0303 4.11328ZM6.67871 11.3447C6.32926 11.6942 6.14542 11.8803 6.01953 12.0332L5.90918 12.1797C5.81574 12.3165 5.73539 12.4618 5.66895 12.6133L5.60742 12.7666C5.52668 12.9869 5.48332 13.229 5.375 13.8789L4.97656 16.2725L4.97559 16.2744H4.97852L7.37207 15.875L8.08887 15.749C8.25765 15.7147 8.37336 15.6839 8.4834 15.6436L8.63672 15.5811C8.78817 15.5146 8.93356 15.4342 9.07031 15.3408L9.2168 15.2305C9.36965 15.1046 9.55583 14.9207 9.90527 14.5713L14.8926 9.58301L11.666 6.35742L6.67871 11.3447ZM16.1963 5.05371C15.3054 4.16304 13.8616 4.16305 12.9707 5.05371L12.6074 5.41602L15.833 8.64258L16.1963 8.2793C17.0869 7.38845 17.0869 5.94456 16.1963 5.05371Z"></path><path d="M4.58301 1.7832C4.72589 1.7832 4.84877 1.88437 4.87695 2.02441C4.99384 2.60873 5.22432 3.11642 5.58398 3.50391C5.94115 3.88854 6.44253 4.172 7.13281 4.28711C7.27713 4.3114 7.38267 4.43665 7.38281 4.58301C7.38281 4.7295 7.27723 4.8546 7.13281 4.87891C6.44249 4.99401 5.94116 5.27746 5.58398 5.66211C5.26908 6.00126 5.05404 6.43267 4.92676 6.92676L4.87695 7.1416C4.84891 7.28183 4.72601 7.38281 4.58301 7.38281C4.44013 7.38267 4.31709 7.28173 4.28906 7.1416C4.17212 6.55728 3.94179 6.04956 3.58203 5.66211C3.22483 5.27757 2.72347 4.99395 2.0332 4.87891C1.88897 4.85446 1.7832 4.72938 1.7832 4.58301C1.78335 4.43673 1.88902 4.3115 2.0332 4.28711C2.72366 4.17203 3.22481 3.88861 3.58203 3.50391C3.94186 3.11638 4.17214 2.60888 4.28906 2.02441L4.30371 1.97363C4.34801 1.86052 4.45804 1.78333 4.58301 1.7832Z"></path></svg></span></button><button class="text-token-text-secondary hover:bg-token-bg-secondary rounded-lg" aria-label="Share" aria-selected="false" data-state="closed"><span class="touch:w-10 flex h-8 w-8 items-center justify-center"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon"><path d="M2.66821 12.6663V12.5003C2.66821 12.1331 2.96598 11.8353 3.33325 11.8353C3.70052 11.8353 3.99829 12.1331 3.99829 12.5003V12.6663C3.99829 13.3772 3.9992 13.8707 4.03052 14.2542C4.0612 14.6298 4.11803 14.8413 4.19849 14.9993L4.2688 15.1263C4.44511 15.4137 4.69813 15.6481 5.00024 15.8021L5.13013 15.8577C5.2739 15.9092 5.46341 15.947 5.74536 15.97C6.12888 16.0014 6.62221 16.0013 7.33325 16.0013H12.6663C13.3771 16.0013 13.8707 16.0014 14.2542 15.97C14.6295 15.9394 14.8413 15.8825 14.9993 15.8021L15.1262 15.7308C15.4136 15.5545 15.6481 15.3014 15.802 14.9993L15.8577 14.8695C15.9091 14.7257 15.9469 14.536 15.97 14.2542C16.0013 13.8707 16.0012 13.3772 16.0012 12.6663V12.5003C16.0012 12.1332 16.2991 11.8355 16.6663 11.8353C17.0335 11.8353 17.3313 12.1331 17.3313 12.5003V12.6663C17.3313 13.3553 17.3319 13.9124 17.2952 14.3626C17.2624 14.7636 17.1974 15.1247 17.053 15.4613L16.9866 15.6038C16.7211 16.1248 16.3172 16.5605 15.8215 16.8646L15.6038 16.9866C15.227 17.1786 14.8206 17.2578 14.3625 17.2952C13.9123 17.332 13.3553 17.3314 12.6663 17.3314H7.33325C6.64416 17.3314 6.0872 17.332 5.63696 17.2952C5.23642 17.2625 4.87552 17.1982 4.53931 17.054L4.39673 16.9866C3.87561 16.7211 3.43911 16.3174 3.13501 15.8216L3.01294 15.6038C2.82097 15.2271 2.74177 14.8206 2.70435 14.3626C2.66758 13.9124 2.66821 13.3553 2.66821 12.6663ZM9.33521 12.5003V4.9388L7.13696 7.13704C6.87732 7.39668 6.45625 7.39657 6.19653 7.13704C5.93684 6.87734 5.93684 6.45631 6.19653 6.19661L9.52954 2.86263L9.6311 2.77962C9.73949 2.70742 9.86809 2.66829 10.0002 2.66829C10.1763 2.66838 10.3454 2.73819 10.47 2.86263L13.804 6.19661C14.0633 6.45628 14.0634 6.87744 13.804 7.13704C13.5443 7.39674 13.1222 7.39674 12.8625 7.13704L10.6653 4.93977V12.5003C10.6651 12.8673 10.3673 13.1652 10.0002 13.1654C9.63308 13.1654 9.33538 12.8674 9.33521 12.5003Z"></path></svg></span></button><span class="" data-state="closed"><button class="cursor-pointer text-token-text-secondary hover:bg-token-bg-secondary touch:px-2.5 h-[30px] rounded-md px-1.5" aria-label="Switch model" type="button" id="radix-«rd6»" aria-haspopup="menu" aria-expanded="false" data-state="closed"><div class="flex items-center"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon"><path d="M3.502 16.6663V13.3333C3.502 12.9661 3.79977 12.6683 4.16704 12.6683H7.50004L7.63383 12.682C7.93691 12.7439 8.16508 13.0119 8.16508 13.3333C8.16508 13.6547 7.93691 13.9227 7.63383 13.9847L7.50004 13.9984H5.47465C6.58682 15.2249 8.21842 16.0013 10 16.0013C13.06 16.0012 15.5859 13.711 15.9551 10.7513L15.9854 10.6195C16.0845 10.3266 16.3785 10.1334 16.6973 10.1732C17.0617 10.2186 17.3198 10.551 17.2745 10.9154L17.2247 11.2523C16.6301 14.7051 13.6224 17.3313 10 17.3314C8.01103 17.3314 6.17188 16.5383 4.83208 15.2474V16.6663C4.83208 17.0335 4.53411 17.3311 4.16704 17.3314C3.79977 17.3314 3.502 17.0336 3.502 16.6663ZM4.04497 9.24935C3.99936 9.61353 3.66701 9.87178 3.30278 9.8265C2.93833 9.78105 2.67921 9.44876 2.72465 9.08431L4.04497 9.24935ZM10 2.66829C11.9939 2.66833 13.8372 3.46551 15.1778 4.76204V3.33333C15.1778 2.96616 15.4757 2.66844 15.8428 2.66829C16.2101 2.66829 16.5079 2.96606 16.5079 3.33333V6.66634C16.5079 7.03361 16.2101 7.33138 15.8428 7.33138H12.5098C12.1425 7.33138 11.8448 7.03361 11.8448 6.66634C11.8449 6.29922 12.1426 6.0013 12.5098 6.0013H14.5254C13.4133 4.77488 11.7816 3.99841 10 3.99837C6.93998 3.99837 4.41406 6.28947 4.04497 9.24935L3.38481 9.16634L2.72465 9.08431C3.17574 5.46702 6.26076 2.66829 10 2.66829Z"></path></svg><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon-sm"><path d="M12.1338 5.94433C12.3919 5.77382 12.7434 5.80202 12.9707 6.02929C13.1979 6.25656 13.2261 6.60807 13.0556 6.8662L12.9707 6.9707L8.47067 11.4707C8.21097 11.7304 7.78896 11.7304 7.52926 11.4707L3.02926 6.9707L2.9443 6.8662C2.77379 6.60807 2.80199 6.25656 3.02926 6.02929C3.25653 5.80202 3.60804 5.77382 3.86617 5.94433L3.97067 6.02929L7.99996 10.0586L12.0293 6.02929L12.1338 5.94433Z"></path></svg></div></button></span></div></div><div class="mt-3 w-full empty:hidden"><div class="text-center"></div></div></div></div></div></div></article>
fix it make it wait for the whole message to appear before proccessing it
