
// ✅ script.js 最终完整版本
// 含模块三实时保持 + 模块四绿色积木添加保持 + 独立副本逻辑修复 + 详情编辑面板 + 删除按钮管理 + DOM 加载初始化

let brickCount = 0;
const brickArea = document.getElementById("brickArea");
const customNameArea = document.getElementById("customNameArea");
const customInputs = document.getElementById("customInputs");
const modeInput = document.getElementById("mode") || document.createElement("input");
const formatKeys = ["916", "11", "169", "23", "45"];
let customBrickIndex = 1;

let savedCustomPresets = JSON.parse(localStorage.getItem("customPresets") || "{}");
let savedFixedPresets = JSON.parse(localStorage.getItem("fixedPresets") || "[]");
let savedTemplates = JSON.parse(localStorage.getItem("savedTemplates") || "{}");
const liveCustomBlocks = {}; // ✅ 模块三区别名内容实时保存
const liveTemplateBlocks = {}; // ✅ 用于保存模块3中每个模板积木的独立副本

// ✅ 模块3 - 渲染命名积木序列
// ✅ 模块3 - 渲染命名积木序列（修复模板积木）
function renderBricks() {
  const blocks = [];
  brickArea.querySelectorAll(".brick").forEach(el => {
    const type = el.dataset.type;
    if (type === "fixed") {
      blocks.push(el.querySelector("input").value);
    } else if (type === "size") {
      blocks.push("__SIZE__");
    } else if (type === "custom") {
      blocks.push("__PER_SIZE__");
    } else if (type === "template") {
      const name = el.querySelector("input")?.value?.replace(/（\d+）$/, "");
      const subBlocks = liveTemplateBlocks[name] || [];
      subBlocks.forEach(b => {
        if (b.type === "fixed") blocks.push(b.label);
        else if (b.type === "size") blocks.push("__SIZE__");
        else if (b.type === "custom") blocks.push("__PER_SIZE__");
      });
    }
  });
  document.getElementById("blockStorage")?.setAttribute("value", blocks.join("||"));
}

// ✅ 模块3 - 显示区别名编辑面板
function showCustomNamePanel(key, initialData = {}) {
  customNameArea.style.display = "block";
  modeInput.value = "per-size";
  const saved = liveCustomBlocks[key] || initialData;
  if (!liveCustomBlocks[key]) liveCustomBlocks[key] = { ...initialData }; // ✅ 防止初始化缺失
  customInputs.innerHTML = formatKeys.map(k => {
    return `<div>${k}：<input name="custom_name_${k}" value="${saved[k] || ''}" oninput="updateLiveCustomBlockByKey('${key}')"></div>`;
  }).join("");
}

// ✅ 模块3 - 实时更新区别名数据
function updateLiveCustomBlockByKey(key) {
  const inputs = document.querySelectorAll('#customInputs input[name^="custom_name_"]');
  const data = {};
  inputs.forEach(input => {
    const k = input.name.replace("custom_name_", "");
    data[k] = input.value.trim();
  });
  liveCustomBlocks[key] = data;
}

// ✅ 模块3 - 积木移动功能
function moveBrick(el, direction) {
  const parent = el.parentNode;
  const all = Array.from(brickArea.children);
  const index = all.indexOf(parent);
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= all.length) return;
  brickArea.insertBefore(parent, all[newIndex + (direction > 0 ? 1 : 0)]);
  renderBricks();
}

// ✅ 模块3/4 - 模板预览或详情中积木左右移动
function moveTemplateBrick(templateName, index, direction) {
  const arr = savedTemplates[templateName];
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= arr.length) return;
  const [moved] = arr.splice(index, 1);
  arr.splice(newIndex, 0, moved);
  localStorage.setItem("savedTemplates", JSON.stringify(savedTemplates));
  showTemplatePreview(templateName);
}

// ✅ 模块3 - 创建命名积木（包括区别名）
function createEditableBrick(text, type, uniqueKey = null, initialData = {}) {
  const div = document.createElement("div");
  div.className = "brick";
  div.dataset.type = type;

  if (!uniqueKey && type === "custom") {
    uniqueKey = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  }
  if (uniqueKey) div.dataset.key = uniqueKey;
  else if (type === "template") {
    div.addEventListener("click", () => {
      if (input.disabled) {
        const match = input.value.match(/^(.+?)（\d+）$/);
        const templateName = match ? match[1] : input.value;
        showTemplatePreview(templateName);
      }
    });
  }

  const input = document.createElement("input");
  input.className = "inline-editor";
  input.value = text;
  input.disabled = true;

  const editIcon = document.createElement("span");
  editIcon.className = "edit-icon";
  editIcon.textContent = "✎";
  editIcon.title = "点击编辑/完成";
  editIcon.addEventListener("click", () => {
    input.disabled = !input.disabled;
    if (!input.disabled) input.focus();
  });

  const left = document.createElement("button");
  left.textContent = "←";
  left.onclick = () => moveBrick(left, -1);

  const right = document.createElement("button");
  right.textContent = "→";
  right.onclick = () => moveBrick(right, 1);

  const del = document.createElement("button");
  del.textContent = "×";
  del.onclick = () => {
    const key = div.dataset.key;
    if (key) delete liveCustomBlocks[key];
    div.remove();
    renderBricks();
  };

  if (type === "custom") {
    // 初始化或清空已存在 key 内容
    if (!(uniqueKey in liveCustomBlocks)) {
      liveCustomBlocks[uniqueKey] = JSON.parse(JSON.stringify(initialData || {}));
    } else {
      const savedData = liveCustomBlocks[uniqueKey];
      if (Object.keys(savedData).length === 0) {
        liveCustomBlocks[uniqueKey] = JSON.parse(JSON.stringify(initialData || {}));
      }
    }

    div.addEventListener("click", () => {
      if (input.disabled) {
        const key = div.dataset.key;
        showCustomNamePanel(key, liveCustomBlocks[key] || {});
      }
    });
  }

  div.appendChild(input);
  div.appendChild(editIcon);
  div.appendChild(left);
  div.appendChild(right);
  div.appendChild(del);
  brickArea.appendChild(div);
  renderBricks();
}

// ✅ 模块3 - 添加不同类型的命名积木
function addBrick(type) {
  if (type === "fixed") {
    createEditableBrick("示例", "fixed");
  } else if (type === "size") {
    const div = document.createElement("div");
    div.className = "brick";
    div.dataset.type = "size";
    div.innerHTML = `<span>尺寸</span>
      <button onclick="moveBrick(this, -1)">←</button>
      <button onclick="moveBrick(this, 1)">→</button>
      <button onclick="this.parentNode.remove(); renderBricks()">×</button>`;
    brickArea.appendChild(div);
    renderBricks();
  } else if (type === "custom") {
    const existing = Array.from(brickArea.querySelectorAll(".brick"))
      .filter(b => b.dataset.type === "custom")
      .map(b => {
        const text = b.querySelector("input")?.value || "";
        const match = text.match(/^区别名(\d+)/);
        return match ? parseInt(match[1]) : null;
      }).filter(n => !isNaN(n));

    const index = findNextAvailableNumber(existing);
    const name = "区别名" + index;

    const uniqueKey = name + "__" + Date.now();
    liveCustomBlocks[uniqueKey] = {}; // ✅ 添加时初始化空对象
    createEditableBrick(name, "custom", uniqueKey, {});
    showCustomNamePanel(uniqueKey, {});
  }
}

// ✅ 模块3/4 - 获取最小可用编号
function findNextAvailableNumber(numbers) {
  const used = new Set(numbers);
  for (let i = 1; i <= 999; i++) {
    if (!used.has(i)) return i;
  }
  return used.size + 1;
}

// ✅ 模块4 - 从预设添加绿色区别名积木
function addCustomBlockFromPreset(name, data) {
  // 获取已存在的相同名称编号（确保识别如 111（1）、111（2））
  const existing = Array.from(brickArea.querySelectorAll(".brick"))
    .filter(b => b.dataset.type === "custom")
    .map(b => {
      const text = b.querySelector("input")?.value || "";
      const regex = new RegExp(`^${name}（(\\d+)）$`);
      const match = text.match(regex);
      return match ? parseInt(match[1]) : null;
    }).filter(n => !isNaN(n));

  const number = findNextAvailableNumber(existing);
  const displayName = `${name}（${number}）`;

  const localData = JSON.parse(JSON.stringify(data || {}));
  const uniqueKey = displayName + "__" + Date.now();
  liveCustomBlocks[uniqueKey] = localData;

  createEditableBrick(displayName, "custom", uniqueKey, localData);
}

// ✅ 模块4 - 将模板积木添加到模块3中
function addTemplateBlockToQueue(templateName) {
  const existing = Array.from(brickArea.querySelectorAll(".brick"))
    .filter(b => b.dataset.type === "template")
    .map(b => {
      const label = b.querySelector("input")?.value;
      const match = label.match(new RegExp(`^${templateName}（(\\d+)）$`));
      return match ? parseInt(match[1]) : null;
    }).filter(n => !isNaN(n));

  const number = findNextAvailableNumber(existing);
  const displayName = `${templateName}（${number}）`;

  createEditableBrick(displayName, "template");
}

// ✅ 模块4 - 渲染常用名和区别名预设列表
function renderCustomModule() {
  const fixedList = document.getElementById("customFixedList");
  const namedList = document.getElementById("customNamedList");
  fixedList.innerHTML = "";
  namedList.innerHTML = "";

  savedFixedPresets.forEach((name) => {
    const wrap = document.createElement("div");
    wrap.className = "brick";
    wrap.style.background = "orange";
    wrap.innerHTML = `<span>${name}</span>`;
    wrap.onclick = () => createEditableBrick(name, "fixed");
    fixedList.appendChild(wrap);
  });

  Object.entries(savedCustomPresets).forEach(([presetName, values]) => {
    const wrap = document.createElement("div");
    wrap.className = "brick";
    wrap.style.background = "seagreen";
    wrap.style.color = "white";
    wrap.innerHTML = `<span>${presetName}</span>`;
    const addBtn = document.createElement("button");
    addBtn.textContent = "添加";
    addBtn.onclick = (e) => {
      e.stopPropagation();
      addCustomBlockFromPreset(presetName, values);
    };
    wrap.appendChild(addBtn);
    wrap.onclick = () => showCustomDetailPanel(presetName);
    namedList.appendChild(wrap);
  });
}

// ✅ 模块4 - 渲染模板列表
function renderTemplateList() {
  const list = document.getElementById("templateList");
  list.innerHTML = "";

  Object.keys(savedTemplates).forEach(name => {
    const brick = document.createElement("div");
    brick.className = "brick";
    brick.style.background = "#90c4f5";
    brick.style.color = "black";

    const label = document.createElement("span");
    label.textContent = name;
    brick.appendChild(label);

    const addBtn = document.createElement("button");
    addBtn.textContent = "添加";
    addBtn.style.marginLeft = "5px";
    addBtn.onclick = (e) => {
      e.stopPropagation();
      addTemplateBlockToQueue(name); // ✅ 添加到模块3命名队列
    };
    brick.appendChild(addBtn);

    brick.onclick = () => {
      showTemplateDetail(name);       // ✅ 打开模块四中的模板详情面板
      // ⚠️ 不再显示模块3预览，防止混淆
    };

    list.appendChild(brick);
  });
}

// ✅ 模块4 - 显示模板详情编辑面板
function showTemplateDetail(name) {
  const detailPanel = document.getElementById("templateDetailPanel");
  const detailTitle = document.getElementById("templateDetailTitle");
  const detailBricks = document.getElementById("templateDetailBricks");
  const editControls = document.getElementById("templateEditControls");

  const bricks = savedTemplates[name] || [];

  detailPanel.style.display = "block";
  detailTitle.innerHTML = `模板详情：${name} <span id="templateDetailEditBtn" class="edit-icon">✎</span>`;
  detailBricks.innerHTML = "";
  editControls.style.display = "none";

  // 非编辑状态渲染：只显示 label
  bricks.forEach(b => {
    const span = document.createElement("div");
    span.className = "brick";
    span.textContent = b.label;
    detailBricks.appendChild(span);
  });

  document.getElementById("templateDetailEditBtn").onclick = () => {
    enterTemplateEditMode(name);
  };
}

function showTemplatePreviewFromInstance(key) {
  const templateData = liveTemplateBlocks[key] || [];
  const area = document.getElementById("templatePreviewArea");
  const title = document.getElementById("templatePreviewTitle");
  const container = document.getElementById("templatePreviewBricks");

  title.textContent = "模板预览（命名队列中）：" + key.split("__")[0];
  area.style.display = "block";
  container.innerHTML = "";

  templateData.forEach(b => {
    const span = document.createElement("div");
    span.className = "brick";
    span.textContent = b.label;
    container.appendChild(span);
  });
}

function enterTemplateEditMode(name) {
  const detailBricks = document.getElementById("templateDetailBricks");
  const editControls = document.getElementById("templateEditControls");

  const bricks = JSON.parse(JSON.stringify(savedTemplates[name] || [])); // 深拷贝
  detailBricks.innerHTML = "";

  function render() {
    detailBricks.innerHTML = "";
    bricks.forEach((brick, index) => {
      const div = document.createElement("div");
      div.className = "brick";
      div.dataset.type = brick.type;

      const input = document.createElement("input");
      input.className = "inline-editor";
      input.value = brick.label;
      input.oninput = () => brick.label = input.value;

      const left = document.createElement("button");
      left.textContent = "←";
      left.onclick = () => {
        if (index > 0) {
          [bricks[index], bricks[index - 1]] = [bricks[index - 1], bricks[index]];
          render();
        }
      };

      const right = document.createElement("button");
      right.textContent = "→";
      right.onclick = () => {
        if (index < bricks.length - 1) {
          [bricks[index], bricks[index + 1]] = [bricks[index + 1], bricks[index]];
          render();
        }
      };

      const del = document.createElement("button");
      del.textContent = "×";
      del.onclick = () => {
        bricks.splice(index, 1);
        render();
      };

      div.appendChild(input);
      div.appendChild(left);
      div.appendChild(right);
      div.appendChild(del);
      detailBricks.appendChild(div);
    });
  }

  render();
  editControls.style.display = "block";

  document.getElementById("saveTemplateEdit").onclick = () => {
    savedTemplates[name] = bricks;
    localStorage.setItem("savedTemplates", JSON.stringify(savedTemplates));
    renderTemplateList();
    showTemplateDetail(name); // 返回非编辑视图
  };

  document.getElementById("cancelTemplateEdit").onclick = () => {
    showTemplateDetail(name); // 恢复原始视图
  };
}

// ✅ 模块4 - 显示区别名详情编辑面板
function showCustomDetailPanel(name) {
  const panel = document.getElementById("customDetailPanel");
  const inputs = document.getElementById("customDetailInputs");
  const title = document.getElementById("customDetailTitle");
  const saveBtn = document.getElementById("saveCustomDetail");
  const cancelBtn = document.getElementById("cancelCustomDetail");

  let editBtn = document.getElementById("customDetailEditBtn");
  if (!editBtn) {
    editBtn = document.createElement("span");
    editBtn.id = "customDetailEditBtn";
    editBtn.textContent = "✎";
    editBtn.className = "edit-icon";
    title.appendChild(editBtn);
  }

  const data = savedCustomPresets[name] || {};
  inputs.innerHTML = formatKeys.map(k =>
    `<div>${k}：<input name="edit_${k}" value="${data[k] || ''}" disabled></div>`
  ).join("");

  title.textContent = "区别名详情：" + name + " ";
  title.appendChild(editBtn);

  panel.dataset.preset = name;
  panel.style.display = "block";
  saveBtn.style.display = "none";
  cancelBtn.style.display = "none";
  editBtn.style.display = "inline";

  editBtn.onclick = () => {
    panel.querySelectorAll("input").forEach(input => input.disabled = false);
    saveBtn.style.display = "inline";
    cancelBtn.style.display = "inline";
    editBtn.style.display = "none";
  };

  cancelBtn.onclick = () => showCustomDetailPanel(name);
  saveBtn.onclick = () => saveCustomPreset(name);
}

// ✅ 模块3 - 显示模板积木展开预览（灰色背景）
function showTemplatePreview(templateName) {
  const area = document.getElementById("templatePreviewArea");
  const title = document.getElementById("templatePreviewTitle");
  const list = document.getElementById("templatePreviewBricks");
  const template = savedTemplates[templateName];

  title.textContent = "模板预览：" + templateName;
  area.style.display = "block";
  list.innerHTML = "";

  template.forEach((block, idx) => {
    const div = document.createElement("div");
    div.className = "brick";
    div.dataset.type = block.type;
    div.dataset.index = idx;

    const input = document.createElement("input");
    input.className = "inline-editor";
    input.value = block.label || "";
    input.disabled = true;
    div.appendChild(input);

    const editIcon = document.createElement("span");
    editIcon.className = "edit-icon";
    editIcon.textContent = "✎";
    editIcon.title = "点击编辑";
    editIcon.addEventListener("click", () => {
      input.disabled = !input.disabled;
      if (!input.disabled) input.focus();
    });
    div.appendChild(editIcon);

    const left = document.createElement("button");
    left.textContent = "←";
    left.addEventListener("click", (e) => {
      e.stopPropagation();
      moveTemplateBrick(templateName, idx, -1);
    });
    div.appendChild(left);

    const right = document.createElement("button");
    right.textContent = "→";
    right.addEventListener("click", (e) => {
      e.stopPropagation();
      moveTemplateBrick(templateName, idx, 1);
    });
    div.appendChild(right);

    const del = document.createElement("button");
    del.textContent = "×";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      template.splice(idx, 1);
      localStorage.setItem("savedTemplates", JSON.stringify(savedTemplates));
      showTemplatePreview(templateName);
    });
    div.appendChild(del);

    list.appendChild(div);
  });
}

// 模块3的模板预览区域
// ✅ 模块3/4 - 模板预览或详情中积木左右移动
function moveTemplateBrick(templateName, index, direction) {
  const arr = savedTemplates[templateName];
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= arr.length) return;

  const [moved] = arr.splice(index, 1);
  arr.splice(newIndex, 0, moved);

  localStorage.setItem("savedTemplates", JSON.stringify(savedTemplates));
  showTemplatePreview(templateName);
}

// ✅ 模块4 - 显示模板详情编辑面板
function showTemplateDetail(name) {
  const panel = document.getElementById("templateDetailPanel");
  const title = document.getElementById("templateDetailTitle");
  const brickList = document.getElementById("templateDetailBricks");
  const editControls = document.getElementById("templateEditControls");

  panel.style.display = "block";
  title.textContent = "模板详情：" + name;
  brickList.innerHTML = "";

  const blocks = savedTemplates[name] || [];

  // 显示为静态积木（无按钮）
  blocks.forEach(b => {
    const div = document.createElement("div");
    div.className = "brick";
    div.dataset.type = b.type;
    div.dataset.key = b.key || '';
    div.innerHTML = `<input class="inline-editor" value="${b.label}" disabled>`;
    brickList.appendChild(div);
  });

  // 按钮控制
  const editBtn = document.createElement("span");
  editBtn.textContent = "✎";
  editBtn.className = "edit-icon";
  editBtn.style.marginLeft = "8px";
  editBtn.style.cursor = "pointer";
  title.appendChild(editBtn);

  editBtn.onclick = () => {
    // 启动编辑模式：替换为可编辑积木（带移动/删除）
    brickList.innerHTML = "";
    blocks.forEach(b => {
      const uniqueKey = b.key || ('template_' + Date.now() + '_' + Math.floor(Math.random() * 10000));
      const initData = liveCustomBlocks[uniqueKey] || {};
      createEditableBrick(b.label, b.type, uniqueKey, initData);
    });

    // 插入到 templateDetailBricks 中
    const newBricks = document.querySelectorAll("#brickArea .brick");
    const fragment = document.createDocumentFragment();
    newBricks.forEach(b => fragment.appendChild(b));
    brickList.appendChild(fragment);

    editControls.style.display = "block";
    panel.dataset.editing = name;
  };
}

function enableTemplateEditMode(name) {
  const panel = document.getElementById("templateDetailPanel");
  const brickList = document.getElementById("templateDetailBricks");
  const controls = document.getElementById("templateEditControls");
  const originalData = JSON.stringify(savedTemplates[name] || []);

  controls.style.display = "block";
  brickList.innerHTML = "";

  (savedTemplates[name] || []).forEach((brick, index) => {
    const div = document.createElement("div");
    div.className = "brick";
    div.dataset.type = brick.type;

    const input = document.createElement("input");
    input.className = "inline-editor";
    input.value = brick.label;
    input.disabled = false;

    const editIcon = document.createElement("span");
    editIcon.className = "edit-icon";
    editIcon.textContent = "✎";
    editIcon.title = "命名";

    const left = document.createElement("button");
    left.textContent = "←";
    left.onclick = () => moveTemplateBrick(div, -1);

    const right = document.createElement("button");
    right.textContent = "→";
    right.onclick = () => moveTemplateBrick(div, 1);

    const del = document.createElement("button");
    del.textContent = "×";
    del.onclick = () => div.remove();

    div.appendChild(input);
    div.appendChild(editIcon);
    div.appendChild(left);
    div.appendChild(right);
    div.appendChild(del);
    brickList.appendChild(div);
  });

  document.getElementById("saveTemplateEdit").onclick = () => {
    const newBricks = [];
    brickList.querySelectorAll(".brick").forEach(div => {
      const type = div.dataset.type;
      const label = div.querySelector("input")?.value?.trim() || "";
      newBricks.push({ type, label });
    });
    savedTemplates[name] = newBricks;
    localStorage.setItem("savedTemplates", JSON.stringify(savedTemplates));
    showTemplateDetail(name);
    renderTemplateList();
  };

  document.getElementById("cancelTemplateEdit").onclick = () => {
    savedTemplates[name] = JSON.parse(originalData);
    showTemplateDetail(name);
  };
}

//模块4的模板详情编辑面板
// ✅ 模块3/4 - 模板预览或详情中积木左右移动
function moveTemplateBrick(el, direction) {
  const list = document.getElementById("templateDetailBricks");
  const items = Array.from(list.children);
  const index = items.indexOf(el);
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= items.length) return;
  list.insertBefore(el, direction > 0 ? items[newIndex].nextSibling : items[newIndex]);
}

// ✅ 模块4 - 保存区别名预设
function saveCustomPreset(name) {
  const panel = document.getElementById("customDetailPanel");
  const inputs = panel.querySelectorAll("input[name^='edit_']");
  const newData = {};
  inputs.forEach(input => {
    const key = input.name.replace("edit_", "");
    newData[key] = input.value.trim();
  });
  savedCustomPresets[name] = newData;
  localStorage.setItem("customPresets", JSON.stringify(savedCustomPresets));
  showCustomDetailPanel(name);
  renderCustomModule();
}

document.addEventListener("DOMContentLoaded", () => {
  renderCustomModule();
  renderBricks();

  // 按钮绑定确保在 DOM 完全加载后执行
  document.getElementById("addFixed")?.addEventListener("click", () => addBrick("fixed"));
  document.getElementById("addSize")?.addEventListener("click", () => addBrick("size"));
  document.getElementById("addCustom")?.addEventListener("click", () => addBrick("custom"));

  document.getElementById("showPreset")?.addEventListener("click", () => {
    const name = prompt("请输入常用名：");
    if (!name) return;
    if (!savedFixedPresets.includes(name)) {
      savedFixedPresets.push(name);
      localStorage.setItem("fixedPresets", JSON.stringify(savedFixedPresets));
      renderCustomModule();
    }
    createEditableBrick(name, "fixed");
  });

  document.getElementById("toggleEditMode")?.addEventListener("click", () => {
    const isActive = document.body.classList.toggle("custom-edit-mode");
    const fixedList = document.getElementById("customFixedList").children;
    const namedList = document.getElementById("customNamedList").children;

    [...fixedList, ...namedList].forEach(brick => {
      let delBtn = brick.querySelector(".delete-confirm");
      if (!delBtn) {
        delBtn = document.createElement("button");
        delBtn.className = "delete-confirm";
        delBtn.textContent = "×";
        delBtn.style.marginLeft = "8px";
        delBtn.style.background = "#e74c3c";
        delBtn.style.color = "white";
        delBtn.style.border = "none";
        delBtn.style.borderRadius = "4px";
        delBtn.style.cursor = "pointer";
        delBtn.onclick = (e) => {
          e.stopPropagation();
          if (confirm("确定要删除该预设？")) {
            const name = brick.querySelector("span")?.textContent;
            delete savedCustomPresets[name];
            savedFixedPresets = savedFixedPresets.filter(n => n !== name);
            localStorage.setItem("customPresets", JSON.stringify(savedCustomPresets));
            localStorage.setItem("fixedPresets", JSON.stringify(savedFixedPresets));
            brick.remove();
          }
        };
        brick.appendChild(delBtn);
      }
      delBtn.style.display = isActive ? 'inline-block' : 'none';
    });
  });

  document.getElementById("saveTemplateBtn")?.addEventListener("click", () => {
    const name = document.getElementById("templateSaveName").value.trim();
    if (!name) return alert("请输入模板名称");

    const bricks = Array.from(document.querySelectorAll("#brickArea .brick")).map(el => {
      const type = el.dataset.type;
      const key = el.dataset.key || "";
      const label = el.querySelector("input")?.value || el.textContent.trim();
      return { type, key, label };
    });

    savedTemplates[name] = bricks;
    localStorage.setItem("savedTemplates", JSON.stringify(savedTemplates));
    renderTemplateList();
    alert("模板已保存！");
  });
  // 其余按钮同样按需绑定
  renderTemplateList();
});

// ✅ 模块4 - 显示模板详情编辑面板
function showTemplateDetail(templateName) {
  const panel = document.getElementById("templateDetailPanel");
  const title = document.getElementById("templateDetailTitle");
  const brickList = document.getElementById("templateDetailBricks");
  const controlPanel = document.getElementById("templateEditControls");

  const data = savedTemplates[templateName] || [];
  panel.style.display = "block";
  controlPanel.style.display = "none";
  brickList.innerHTML = "";
  title.innerHTML = `模板详情：${templateName} <span class="edit-icon" id="templateDetailEditBtn">✎</span>`;

  // 渲染积木
  data.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "brick";
    div.dataset.index = idx;
    div.dataset.type = item.type;

    const input = document.createElement("input");
    input.className = "inline-editor";
    input.value = item.label;
    input.disabled = true;

    div.appendChild(input);
    brickList.appendChild(div);
  });

  // 编辑按钮绑定
  document.getElementById("templateDetailEditBtn").onclick = () => {
    const items = brickList.querySelectorAll(".brick");
    items.forEach((div, idx) => {
      const input = div.querySelector("input");
      input.disabled = false;

      // 左右移动
      const left = document.createElement("button");
      left.textContent = "←";
      left.onclick = () => {
        if (idx > 0) {
          const prev = brickList.children[idx - 1];
          brickList.insertBefore(div, prev);
        }
      };
      div.appendChild(left);

      const right = document.createElement("button");
      right.textContent = "→";
      right.onclick = () => {
        if (idx < brickList.children.length - 1) {
          const next = brickList.children[idx + 1];
          brickList.insertBefore(next, div);
        }
      };
      div.appendChild(right);

      // 删除
      const del = document.createElement("button");
      del.textContent = "×";
      del.onclick = () => div.remove();
      div.appendChild(del);
    });

    controlPanel.style.display = "block";
  };

  // 保存编辑
  document.getElementById("saveTemplateEdit").onclick = () => {
    const items = brickList.querySelectorAll(".brick");
    const updated = Array.from(items).map(div => {
      return {
        type: div.dataset.type,
        label: div.querySelector("input").value.trim(),
        key: div.dataset.key || ''
      };
    });
    savedTemplates[templateName] = updated;
    localStorage.setItem("savedTemplates", JSON.stringify(savedTemplates));
    alert("模板更新成功！");
    showTemplateDetail(templateName); // 重新加载为非编辑状态
  };

  // 取消编辑
  document.getElementById("cancelTemplateEdit").onclick = () => {
    showTemplateDetail(templateName); // 还原展示
  };
}

function showTemplatePreviewFromQueueBlock(name) {
  const data = savedTemplates[name];
  const container = document.getElementById("templatePreviewArea");
  const list = document.getElementById("templatePreviewBricks");

  if (!data || !Array.isArray(data)) {
    container.style.display = "none";
    return;
  }

  list.innerHTML = "";
  data.forEach(item => {
    const div = document.createElement("div");
    div.className = "brick";
    div.textContent = item.label;
    list.appendChild(div);
  });

  container.style.display = "block";
}
function showTemplatePreviewInQueue(templateName) {
  const area = document.getElementById("templatePreviewArea");
  const container = document.getElementById("templatePreviewBricks");
  const bricks = savedTemplates[templateName] || [];

  area.style.display = "block";
  document.getElementById("templatePreviewTitle").textContent = `模板预览：${templateName}`;
  container.innerHTML = "";

  bricks.forEach((brick, index) => {
    const div = document.createElement("div");
    div.className = "brick";
    div.dataset.type = brick.type;

    const input = document.createElement("input");
    input.className = "inline-editor";
    input.value = brick.label;
    input.disabled = false;

    const editIcon = document.createElement("span");
    editIcon.className = "edit-icon";
    editIcon.textContent = "✎";
    editIcon.title = "命名";

    const left = document.createElement("button");
    left.textContent = "←";
    left.onclick = () => moveTemplateBrick(div, -1);

    const right = document.createElement("button");
    right.textContent = "→";
    right.onclick = () => moveTemplateBrick(div, 1);

    const del = document.createElement("button");
    del.textContent = "×";
    del.onclick = () => div.remove();

    div.appendChild(input);
    div.appendChild(editIcon);
    div.appendChild(left);
    div.appendChild(right);
    div.appendChild(del);
    container.appendChild(div);
  });
}


