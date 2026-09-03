
const storageKey = "my-todo-list-date-groups";
const supabaseUrl = "https://ejfwqhrxshrnafeylonr.supabase.co";
const supabasePublishableKey = "sb_publishable_dzmkc1aMYlsHOjrpp_FMQA_TQWdEaOG";
const supabaseClient = window.supabase.createClient(supabaseUrl, supabasePublishableKey);
const planStorageKey = "daily-plan-2026-09-01-added";
const planCompactTextKey = "daily-plan-2026-09-01-compact-text";
const form = document.querySelector("#task-form");
const dateInput = document.querySelector("#date-input");
const input = document.querySelector("#task-input");
const imageInput = document.querySelector("#image-input");
const priorityInput = document.querySelector("#priority-input");
const imageStatus = document.querySelector("#image-status");
const groupsElement = document.querySelector("#date-groups");
const dateTabs = document.querySelector("#date-tabs");
const emptyState = document.querySelector("#empty-state");
const summary = document.querySelector("#task-summary");
const clearCompletedButton = document.querySelector("#clear-completed");
const emailInput = document.querySelector("#email-input");
const passwordInput = document.querySelector("#password-input");
const signInButton = document.querySelector("#sign-in-button");
const signUpButton = document.querySelector("#sign-up-button");
const signOutButton = document.querySelector("#sign-out-button");
const authControls = document.querySelector("#auth-controls");
const syncStatus = document.querySelector("#sync-status");

let groups = loadGroups();
let selectedDate = today();
let pendingImage = null;
let currentUser = null;
let syncTimer = null;
dateInput.value = today();

function today() {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

function loadGroups() {
  const planGroups = [
    {
      date: "2026-08-31",
      tasks: [
        { id: "barcode-question", text: "现在—17:45：问兔郎君：确认 5 款能否用自带条码", completed: false },
        { id: "barcode-note", text: "17:45—18:00：记录结论，标记明天需自建条码的商品", completed: false },
        { id: "manager-question", text: "20:30—21:00：问店长：沐元转凤鲤卖得怎么样", completed: false },
        { id: "prepare-tomorrow", text: "21:00—21:15：列明日待补项：图片、价格、材质、条码", completed: false },
      ],
    },
    {
      date: "2026-09-01",
      tasks: [
        { id: "final-barcode", text: "09:00—09:20：复核条码；按兔郎君结论处理或自建", completed: false },
        { id: "names", text: "09:20—09:40：检查名称；禁用词与 IP 名称不确定则问 Dora", completed: false },
        { id: "prices", text: "09:40—10:00：补齐商品价格", completed: false },
        { id: "images", text: "10:00—10:20：1688 以图搜图，补沐元转凤鲤包装图", completed: false },
        { id: "materials", text: "10:20—10:35：确认甜茉材质及沐元转凤鲤是否含电池", completed: false },
        { id: "sales", text: "10:35—10:50：记录店长回复的沐元转凤鲤销量反馈", completed: false },
        { id: "review", text: "10:50—11:00：复核条码、名称、价格、图片、材质", completed: false },
        { id: "announcement", text: "完成后：眼睛按袋装包装，并发门店群公告", completed: false },
      ],
    },
  ];

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    const existingGroups = Array.isArray(saved) ? saved : [];
    const legacyTasks = JSON.parse(localStorage.getItem("my-todo-list-tasks"));
    if (!existingGroups.length && Array.isArray(legacyTasks) && legacyTasks.length) {
      existingGroups.push({ date: today(), tasks: legacyTasks });
    }
    if (localStorage.getItem(planStorageKey)) {
      if (!localStorage.getItem(planCompactTextKey)) {
        const planTasks = planGroups.flatMap((group) => group.tasks);
        existingGroups.forEach((group) => group.tasks.forEach((task) => {
          const updatedTask = planTasks.find((planTask) => planTask.id === task.id);
          if (updatedTask) task.text = updatedTask.text;
        }));
        localStorage.setItem(planCompactTextKey, "true");
        localStorage.setItem(storageKey, JSON.stringify(existingGroups));
      }
      return existingGroups;
    }

    planGroups.forEach((planGroup) => {
      const matchingGroup = existingGroups.find((group) => group.date === planGroup.date);
      if (matchingGroup) matchingGroup.tasks.push(...planGroup.tasks);
      else existingGroups.push(planGroup);
    });
    localStorage.setItem(planStorageKey, "true");
    localStorage.setItem(storageKey, JSON.stringify(existingGroups));
    return existingGroups;
  } catch {
    return planGroups;
  }
}

function saveGroups() {
  localStorage.setItem(storageKey, JSON.stringify(groups));
  if (currentUser) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncToCloud, 500);
  }
}

async function syncToCloud() {
  syncStatus.textContent = "正在同步…";
  const { error } = await supabaseClient.from("todo_states").upsert({ user_id: currentUser.id, groups }, { onConflict: "user_id" });
  syncStatus.textContent = error ? "同步失败，请稍后重试" : "已同步到云端";
}

async function loadCloudGroups() {
  const { data, error } = await supabaseClient.from("todo_states").select("groups").eq("user_id", currentUser.id).maybeSingle();
  if (error) {
    syncStatus.textContent = "云端未准备好";
    return;
  }
  if (data?.groups?.length) groups = data.groups;
  else await syncToCloud();
  localStorage.setItem(storageKey, JSON.stringify(groups));
  syncStatus.textContent = "已同步到云端";
  render();
}

async function updateAuth(user) {
  currentUser = user;
  authControls.hidden = Boolean(user);
  signOutButton.hidden = !user;
  if (user) await loadCloudGroups();
  else syncStatus.textContent = "本地模式";
}

signInButton.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signInWithPassword({ email: emailInput.value, password: passwordInput.value });
  if (error) return alert(error.message);
  passwordInput.value = "";
});

signUpButton.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signUp({ email: emailInput.value, password: passwordInput.value });
  if (error) return alert(error.message);
  alert("注册请求已发送，请按邮箱提示完成验证后登录。");
});

signOutButton.addEventListener("click", () => supabaseClient.auth.signOut());
supabaseClient.auth.onAuthStateChange((_event, session) => updateAuth(session?.user || null));
supabaseClient.auth.getSession().then(({ data }) => updateAuth(data.session?.user || null));
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
}

function tabLabel(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  if (dateString === today()) return `今天 ${date.getMonth() + 1}/${date.getDate()}`;
  if (dateString === tomorrowString) return `明天 ${date.getMonth() + 1}/${date.getDate()}`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function taskTime(text) {
  const match = text.match(/(?:现在—)?\d{1,2}:\d{2}(?:—\d{1,2}:\d{2})?/);
  return match ? match[0] : "待办";
}

function taskDetail(text) {
  return text.replace(/^(?:现在—)?\d{1,2}:\d{2}(?:—\d{1,2}:\d{2})?：\s*/, "");
}

function isPastDate(dateString) {
  return dateString < today();
}

function readImage(file) {
  if (!file?.type.startsWith("image/")) return;
  if (file.size > 1_500_000) {
    alert("图片请控制在 1.5MB 以内，以便安全保存在浏览器本地。");
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    pendingImage = reader.result;
    imageStatus.textContent = "图片已添加（提交后保存）";
  });
  reader.readAsDataURL(file);
}

function openImagePreview(source, description) {
  const overlay = document.createElement("div");
  overlay.className = "image-preview-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "待办图片预览");
  const close = document.createElement("button");
  close.type = "button";
  close.className = "image-preview-close";
  close.textContent = "关闭";
  const image = document.createElement("img");
  image.src = source;
  image.alt = description;
  const dismiss = () => {
    document.removeEventListener("keydown", handleKeydown);
    overlay.remove();
  };
  const handleKeydown = (event) => {
    if (event.key === "Escape") dismiss();
  };
  close.addEventListener("click", dismiss);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) dismiss();
  });
  overlay.append(close, image);
  document.body.append(overlay);
  document.addEventListener("keydown", handleKeydown);
  close.focus();
}

function moveTaskToToday(task, sourceGroup) {
  const currentDate = today();
  let targetGroup = groups.find((group) => group.date === currentDate);
  if (!targetGroup) {
    targetGroup = { date: currentDate, tasks: [] };
    groups.push(targetGroup);
  }
  task.carriedFrom = task.carriedFrom || sourceGroup.date;
  sourceGroup.tasks = sourceGroup.tasks.filter((currentTask) => currentTask.id !== task.id);
  targetGroup.tasks.unshift(task);
  if (!sourceGroup.tasks.length) groups = groups.filter((group) => group !== sourceGroup);
  selectedDate = currentDate;
  saveGroups();
  render();
}

function render() {
  groupsElement.replaceChildren();
  dateTabs.replaceChildren();
  const allTasks = groups.flatMap((group) => group.tasks);
  const completedCount = allTasks.filter((task) => task.completed).length;
  const remaining = allTasks.length - completedCount;
  summary.textContent = allTasks.length === 0 ? "准备开始吧" : `还有 ${remaining} 项待完成`;
  clearCompletedButton.style.display = completedCount ? "inline-block" : "none";

  const sortedGroups = [...groups].sort((a, b) => a.date.localeCompare(b.date));
  if (!sortedGroups.some((group) => group.date === selectedDate)) selectedDate = sortedGroups[0]?.date || today();
  sortedGroups.forEach((group) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `date-tab${group.date === selectedDate ? " selected" : ""}`;
    tab.innerHTML = `<strong>${tabLabel(group.date)}</strong><span>${group.tasks.filter((task) => !task.completed).length} 项待办</span>`;
    tab.addEventListener("click", () => {
      selectedDate = group.date;
      dateInput.value = group.date;
      render();
    });
    dateTabs.append(tab);
  });

  const group = sortedGroups.find((currentGroup) => currentGroup.date === selectedDate);
  emptyState.hidden = Boolean(group?.tasks.length);
  if (group) {
    const section = document.createElement("section");
    section.className = "date-group";
    const header = document.createElement("div");
    header.className = "date-header";
    const title = document.createElement("h2");
    title.textContent = formatDate(group.date);
    const editDate = document.createElement("button");
    editDate.className = "text-button";
    editDate.type = "button";
    editDate.textContent = "修改日期";
    editDate.addEventListener("click", () => changeDate(group));
    const moveAll = document.createElement("button");
    moveAll.className = "text-button";
    moveAll.type = "button";
    moveAll.textContent = "移至今天";
    moveAll.hidden = !isPastDate(group.date);
    moveAll.addEventListener("click", () => {
      if (!confirm(`将 ${formatDate(group.date)} 的全部待办移至今天？`)) return;
      [...group.tasks].forEach((task) => moveTaskToToday(task, group));
    });
    const deleteGroup = document.createElement("button");
    deleteGroup.className = "delete-button";
    deleteGroup.type = "button";
    deleteGroup.textContent = "删除日期";
    deleteGroup.addEventListener("click", () => {
      if (confirm(`删除 ${formatDate(group.date)} 及其全部待办？`)) {
        groups = groups.filter((currentGroup) => currentGroup !== group);
        if (selectedDate === group.date) selectedDate = groups[0]?.date || today();
        saveGroups();
        render();
      }
    });
    header.append(title, moveAll, editDate, deleteGroup);
    const list = document.createElement("ul");
    list.className = "task-list";
    group.tasks.forEach((task) => {
      const item = document.createElement("li");
      item.className = `task-item${task.completed ? " completed" : ""}${task.priority ? " priority" : ""}`;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.completed;
      checkbox.setAttribute("aria-label", `完成任务：${task.text}`);
      checkbox.addEventListener("change", () => {
        task.completed = checkbox.checked;
        saveGroups();
        render();
      });
      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = taskDetail(task.text);
      text.contentEditable = "true";
      text.setAttribute("role", "textbox");
      text.setAttribute("aria-label", "直接编辑待办内容");
      text.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          text.blur();
        }
      });
      text.addEventListener("blur", () => {
        const updatedDetail = text.textContent.trim();
        if (!updatedDetail) {
          text.textContent = taskDetail(task.text);
          return;
        }
        const timePrefix = taskTime(task.text);
        task.text = timePrefix === "待办" ? updatedDetail : `${timePrefix}：${updatedDetail}`;
        saveGroups();
      });
      const time = document.createElement("span");
      time.className = "task-time";
      time.textContent = taskTime(task.text);
      const metadata = document.createElement("div");
      metadata.className = "task-metadata";
      if (task.priority) {
        const priority = document.createElement("span");
        priority.className = "priority-badge";
        priority.textContent = "重点";
        metadata.append(priority);
      }
      if (task.carriedFrom) {
        const carried = document.createElement("span");
        carried.className = "carried-badge";
        carried.textContent = `遗留自 ${formatDate(task.carriedFrom)}`;
        metadata.append(carried);
      }
      if (task.image) {
        const image = document.createElement("img");
        image.className = "task-image";
        image.src = task.image;
        image.alt = `待办图片：${taskDetail(task.text)}`;
        image.addEventListener("click", () => openImagePreview(task.image, image.alt));
        metadata.append(image);
      }
      const move = document.createElement("button");
      move.type = "button";
      move.className = "text-button";
      move.textContent = "移至今天";
      move.hidden = !isPastDate(group.date);
      move.addEventListener("click", () => moveTaskToToday(task, group));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "delete-button";
      remove.textContent = "删除";
      remove.addEventListener("click", () => {
        group.tasks = group.tasks.filter((currentTask) => currentTask.id !== task.id);
        if (group.tasks.length === 0) groups = groups.filter((currentGroup) => currentGroup !== group);
        saveGroups();
        render();
      });
      const content = document.createElement("div");
      content.className = "task-content";
      content.append(text, metadata);
      item.append(checkbox, time, content, move, remove);
      list.append(item);
    });
    section.append(header, list);
    groupsElement.append(section);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  let group = groups.find((currentGroup) => currentGroup.date === dateInput.value);
  if (!group) {
    group = { date: dateInput.value, tasks: [] };
    groups.push(group);
  }
  group.tasks.unshift({ id: crypto.randomUUID(), text, completed: false, priority: priorityInput.checked, image: pendingImage });
  selectedDate = dateInput.value;
  saveGroups();
  input.value = "";
  imageInput.value = "";
  priorityInput.checked = false;
  pendingImage = null;
  imageStatus.textContent = "也可直接粘贴图片";
  input.focus();
  render();
});

imageInput.addEventListener("change", () => readImage(imageInput.files[0]));

document.addEventListener("paste", (event) => {
  const imageFile = [...event.clipboardData.files].find((file) => file.type.startsWith("image/"));
  if (imageFile) readImage(imageFile);
});

function changeDate(group) {
  const updatedDate = prompt("请输入新日期（YYYY-MM-DD）：", group.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updatedDate || "")) return;
  const existingGroup = groups.find((currentGroup) => currentGroup !== group && currentGroup.date === updatedDate);
  if (existingGroup) {
    existingGroup.tasks.push(...group.tasks);
    groups = groups.filter((currentGroup) => currentGroup !== group);
  } else {
    if (selectedDate === group.date) selectedDate = updatedDate;
    group.date = updatedDate;
  }
  saveGroups();
  render();
}

clearCompletedButton.addEventListener("click", () => {
  groups = groups.map((group) => ({ ...group, tasks: group.tasks.filter((task) => !task.completed) })).filter((group) => group.tasks.length);
  saveGroups();
  render();
});

render();

