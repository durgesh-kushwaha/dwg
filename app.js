const STORAGE_KEY = "dwgRecords";

function loadRecords() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error("Failed to parse records:", e);
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function generateId() {
  return Date.now();
}

function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function renderTable() {
  const tbody = document.getElementById("dwg-table-body");
  const emptyState = document.getElementById("empty-state");
  const tableWrapper = document.getElementById("table-wrapper");
  const searchQuery = document.getElementById("search-input").value.trim().toLowerCase();
  const filterStatus = document.getElementById("filter-status").value;

  let records = loadRecords();

  records.sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tB - tA;
  });

  const filtered = records.filter(record => {
    const matchesStatus =
      filterStatus === "all" ? true : record.status === filterStatus;

    if (!matchesStatus) return false;

    if (!searchQuery) return true;

    const haystack = [
      record.dwgNumber,
      record.dwgName,
      record.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchQuery);
  });

  tbody.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.style.display = "block";
    tableWrapper.style.display = "none";
    return;
  } else {
    emptyState.style.display = "none";
    tableWrapper.style.display = "block";
  }

  filtered.forEach(record => {
    const tr = document.createElement("tr");
    tr.dataset.id = record.id;

    const tdNumber = document.createElement("td");
    tdNumber.textContent = record.dwgNumber || "";
    tr.appendChild(tdNumber);

    const tdName = document.createElement("td");
    tdName.textContent = record.dwgName || "";
    tr.appendChild(tdName);

    const tdStatus = document.createElement("td");
    const span = document.createElement("span");
    span.textContent = record.status || "Planned";
    span.classList.add("status-pill");
    switch (record.status) {
      case "In Progress":
        span.classList.add("status-progress");
        break;
      case "Completed":
        span.classList.add("status-completed");
        break;
      case "Archived":
        span.classList.add("status-archived");
        break;
      default:
        span.classList.add("status-planned");
        break;
    }
    tdStatus.appendChild(span);
    tr.appendChild(tdStatus);

    const tdDate = document.createElement("td");
    tdDate.textContent = formatDate(record.createdAt) || "";
    tdDate.classList.add("muted");
    tr.appendChild(tdDate);

    tr.addEventListener("click", () => {
      loadRecordIntoForm(record.id);
    });

    tbody.appendChild(tr);
  });
}

function loadRecordIntoForm(id) {
  const records = loadRecords();
  const record = records.find(r => String(r.id) === String(id));
  if (!record) return;

  document.getElementById("record-id").value = record.id;
  document.getElementById("dwg-number").value = record.dwgNumber || "";
  document.getElementById("dwg-name").value = record.dwgName || "";
  document.getElementById("status").value = record.status || "Planned";
  document.getElementById("notes").value = record.notes || "";

  document.getElementById("dwg-number").focus();
}

function clearForm() {
  document.getElementById("record-id").value = "";
  document.getElementById("dwg-form").reset();
  document.getElementById("status").value = "Planned";
  document.getElementById("dwg-number").focus();
}

function handleFormSubmit(event) {
  event.preventDefault();

  const idField = document.getElementById("record-id");
  const dwgNumberField = document.getElementById("dwg-number");
  const dwgNameField = document.getElementById("dwg-name");
  const statusField = document.getElementById("status");
  const notesField = document.getElementById("notes");

  const dwgNumber = dwgNumberField.value.trim();
  const dwgName = dwgNameField.value.trim();
  const status = statusField.value;
  const notes = notesField.value.trim();

  if (!dwgNumber || !dwgName) {
    alert("DWG Number and DWG Name are required.");
    return;
  }

  let records = loadRecords();
  const now = new Date().toISOString();

  const editingId = idField.value ? String(idField.value) : null;

  const existingIndex = records.findIndex(r =>
    r.dwgNumber &&
    r.dwgNumber.toLowerCase() === dwgNumber.toLowerCase()
  );

  if (editingId) {
    const idx = records.findIndex(r => String(r.id) === editingId);
    if (idx === -1) {
      alert("Record not found. It may have been deleted.");
      return;
    }

    if (existingIndex !== -1 && String(records[existingIndex].id) !== editingId) {
      alert(
        "Another entry with the same DWG Number already exists. Please use a unique DWG Number."
      );
      return;
    }

    records[idx] = {
      ...records[idx],
      dwgNumber,
      dwgName,
      status,
      notes,
    };

    saveRecords(records);
    renderTable();
    alert("DWG updated successfully.");
    clearForm();
  } else {
    if (existingIndex !== -1) {
      const confirmUpdate = confirm(
        "A record with this DWG Number already exists. Do you want to update that existing record instead?"
      );
      if (confirmUpdate) {
        const existingRecord = records[existingIndex];
        records[existingIndex] = {
          ...existingRecord,
          dwgNumber,
          dwgName,
          status,
          notes,
        };
        saveRecords(records);
        renderTable();
        alert("Existing DWG updated.");
        clearForm();
        return;
      } else {
        return;
      }
    }

    const newRecord = {
      id: generateId(),
      dwgNumber,
      dwgName,
      status,
      notes,
      createdAt: now,
    };

    records.push(newRecord);
    saveRecords(records);
    renderTable();
    alert("DWG saved successfully.");
    clearForm();
  }
}

function clearFilters() {
  document.getElementById("search-input").value = "";
  document.getElementById("filter-status").value = "all";
  renderTable();
}

function clearAllData() {
  const confirmClear = confirm(
    "This will delete ALL DWG records stored in this browser. Are you sure?"
  );
  if (!confirmClear) return;

  localStorage.removeItem(STORAGE_KEY);
  renderTable();
  clearForm();
  alert("All records cleared from this browser.");
}

function init() {
  document.getElementById("dwg-form").addEventListener("submit", handleFormSubmit);
  document.getElementById("reset-form-btn").addEventListener("click", clearForm);

  document.getElementById("search-input").addEventListener("input", renderTable);
  document.getElementById("filter-status").addEventListener("change", renderTable);
  document.getElementById("clear-filters-btn").addEventListener("click", clearFilters);
  document.getElementById("clear-all-btn").addEventListener("click", clearAllData);

  renderTable();
}

document.addEventListener("DOMContentLoaded", init);