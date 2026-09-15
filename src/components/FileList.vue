<template>
  <form action="javascript:">
    <div class="section-title">
      <div>File List</div>
    </div>

    <div class="mt-4 mb-4 flex items-center flex-wrap space-x-2">
      <button
        v-show="!selectMode"
        class="text-xs inline-block w-auto outline mb-0"
        style="padding: 0.3rem 0.5rem"
        @click="loadData"
        :aria-busy="loading"
        :disabled="loading || !endPoint"
      >
        Refresh
      </button>
      <button
        class="text-xs inline-block w-auto outline mb-0"
        style="padding: 0.3rem 0.5rem"
        @click="toggleSelectMode"
        :disabled="fileList.length === 0 || loading"
      >
        {{ selectMode && fileList.length ? "Quit Selection Mode" : "Selection Mode" }}
      </button>

      <div v-show="selectMode" class="w-full flex space-x-2 mt-2">
        <button
          :disabled="selectedFiles.length === 0"
          class="text-xs inline-block w-auto outline mb-0 border-red-500 text-red-500"
          style="padding: 0.3rem 0.5rem"
          @click="deleteSelectedFiles"
        >
          Delete Selected
        </button>
        <button
          :disabled="selectedFiles.length === 0"
          class="text-xs inline-block w-auto outline mb-0 border-blue-500 text-blue-500 dark:border-blue-400 dark:text-blue-400"
          style="padding: 0.3rem 0.5rem"
          @click="copySelectedFileUrls"
        >
          {{ copyButtonText }}
        </button>
      </div>
    </div>

    <div>
      <div
        class="text-xs"
        v-show="!loading && fileList.length === 0 && !loadDataErrorText"
      >
        Seems like we got nothing here.
      </div>
      <div
        class="text-xs mb-3 text-[#8e8e96]"
        v-show="!loading && fileList.length > 0 && Object.keys(dirMap).length === 0"
      >
        No files match this filter.
      </div>
      <div class="text-red-500 text-xs" v-show="loadDataErrorText">
        {{ loadDataErrorText }}

        <pre class="mt-2"><code class="text-xs">{{ loadDataErrorStack }}</code></pre>
      </div>
      <div class="text-xs mb-4" v-show="fileList.length > 0">
        <span class="font-bold">{{ globalCursor ? "More than" : "" }}</span>
        {{ fileList.length }} file{{ fileList.length === 1 ? "" : "s" }},
        {{ parseByteSize(allFileSize) }} total.
        <div class="inline-flex space-x-2">
          <button
            class="inline outline px-2 py-1 text-xs w-auto mb-0"
            v-show="globalCursor"
            @click="loadData('more')"
            :aria-busy="loading"
            :disabled="loading"
          >
            Load next page
          </button>
        </div>
      </div>

      <div class="file-list-controls" v-show="fileList.length > 0">
        <label class="file-list-control">
          Sort
          <select class="text-xs mb-0" v-model="sort">
            <option value="0">Bucket order</option>
            <option value="1">Date (newest first)</option>
            <option value="2">Date (oldest first)</option>
            <option value="3">Size (largest first)</option>
            <option value="4">Size (smallest first)</option>
            <option value="5">Expiry (soonest)</option>
            <option value="6">Expiry (never first)</option>
          </select>
        </label>
        <label class="file-list-control">
          Show
          <select class="text-xs mb-0" v-model="listFilter">
            <option value="all">All</option>
            <option value="never">Never expire</option>
            <option value="expiring">Expiring</option>
            <option value="expired">Expired</option>
            <option value="large">Large (50 MB+)</option>
          </select>
        </label>
      </div>

      <div class="pb-4" v-show="fileList.length > 0">
        <label for="seeFolderStructure" class="text-xs" :aria-busy="reconstructing">
          <input
            type="checkbox"
            id="seeFolderStructure"
            v-model="seeFolderStructure"
            class="mr-2"
            :disabled="reconstructing"
          />
          Folder Structure
        </label>
      </div>

      <div>
        <div
          class="rounded-lg mb-2"
          :class="seeFolderStructure ? 'bg-[#1a1a1d] p-2 border border-[#2a2a2e]' : ''"
          v-for="folder in Object.keys(dirMap).map((el) => {
            return {
              name: el,
              timestamp: Date.now(),
            };
          })"
          :key="folder.name + '_' + structureId"
        >
          <details open class="mb-0 pb-1">
            <summary class="text-xs" v-show="seeFolderStructure">
              {{ folder.name }}
            </summary>

            <div
              class="mb-2 text-xs"
              v-show="selectMode"
              @mouseenter="mouseOnSelectionCheckbox = true"
              @mouseleave="mouseOnSelectionCheckbox = false"
            >
              <label :for="folder.name"
                ><input
                  name="select_all_for_folder"
                  class="mr-2"
                  type="checkbox"
                  :id="folder.name"
                  @change="handleFolderSelect(folder.name)"
                />
                Select All</label
              >
            </div>
            <div
              class="item file-row mb-2 rounded text-sm py-1 flex items-center justify-between"
              :class="seeFolderStructure ? 'pl-4' : ''"
              v-for="item in dirMap[folder.name]"
              :key="item.key"
            >
              <div class="w-[2rem] shrink-0" v-show="selectMode">
                <input
                  type="checkbox"
                  @change="updateSelectedFiles(item, folder.name)"
                  v-model="item.selected"
                  :id="item.key"
                />
              </div>
              <div class="file-row-main min-w-0 flex-1">
                <div
                  class="name min-w-0 w-full whitespace-nowrap text-left text-ellipsis overflow-hidden break-all"
                >
                  <a
                    :href="filePublicUrl(item.key, customDomain, endPoint)"
                    target="_blank"
                    v-show="!selectMode"
                    >{{ item.fileName }}</a
                  >
                  <label v-show="selectMode" :for="item.key" class="mb-0">{{
                    item.fileName
                  }}</label>
                </div>
                <div class="file-row-meta">
                  <span>{{ parseByteSize(item.size || 0) }}</span>
                  <span
                    class="file-expiry"
                    :class="{
                      'is-expired': item.expiryState === 'expired',
                      'is-never': item.expiryState === 'never',
                    }"
                    >{{ item.expiryLabel }}</span
                  >
                </div>
              </div>
              <div class="file-actions" v-show="!selectMode">
                <button
                  type="button"
                  class="share-row-btn mb-0"
                  @click="openShare(item)"
                >
                  Share / QR
                </button>
                <button
                  type="button"
                  class="outline file-action-btn text-red-500 mb-0"
                  @click="deleteThisFile(item.key)"
                  :aria-busy="deletingKey === item.key"
                  :disabled="deletingKey === item.key"
                >
                  Delete
                </button>
              </div>
            </div>
          </details>
        </div>
        <div>
          <div class="inline-flex space-x-2">
            <button
              class="inline outline px-2 py-1 text-xs w-auto mb-0"
              v-show="globalCursor"
              @click="loadData('more')"
              :aria-busy="loading"
              :disabled="loading"
            >
              Load next page
            </button>
          </div>
        </div>
      </div>
    </div>
  </form>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import axios from "axios";
import { useStatusStore } from "../store/status";
import { storeToRefs } from "pinia";
import { nanoid } from "nanoid";
import { filePublicUrl } from "../utils/fileUrl.js";
import {
  LARGE_FILE_BYTES,
  formatExpiryLabel,
  isExpired,
  sortExpiryValue,
} from "../utils/expiry.js";
import { deleteExpiry, fetchExpiryIndex, requestPrune } from "../utils/expiryClient.js";
import { deleteR2Object } from "../utils/r2Client.js";

let sort = ref("1");
let listFilter = ref("all");
let expiryByKey = ref({});
let silentPruneRunning = false;

onMounted(() => {
  if (localStorage.getItem("seeFolderStructure") === "1") {
    seeFolderStructure.value = true;
  }

  if (localStorage.getItem("seeFolderStructure") === "0") {
    seeFolderStructure.value = false;
  }

  restoreFilterSelection();
  silentPrune();
});

watch(sort, function (val) {
  localStorage.setItem("sort", val);

  mapFilesToDir();
});

watch(listFilter, function (val) {
  localStorage.setItem("listFilter", val);
  mapFilesToDir();
});

function getSortVariables(val) {
  let sortKey;
  let sortType;

  if (val === "1") {
    sortKey = "uploaded_timestamp";
    sortType = "desc";
  } else if (val === "2") {
    sortKey = "uploaded_timestamp";
    sortType = "asc";
  } else if (val === "3") {
    sortKey = "size";
    sortType = "desc";
  } else if (val === "4") {
    sortKey = "size";
    sortType = "asc";
  } else if (val === "5") {
    sortKey = "expires_sort";
    sortType = "soonest";
  } else if (val === "6") {
    sortKey = "expires_sort";
    sortType = "never-first";
  }

  return { sortKey, sortType };
}

function fileExpiresAt(file) {
  if (Object.prototype.hasOwnProperty.call(expiryByKey.value, file.key)) {
    return expiryByKey.value[file.key];
  }
  return file.expiresAt ?? null;
}

function matchesListFilter(file) {
  const expiresAt = fileExpiresAt(file);
  if (listFilter.value === "never") {
    return !expiresAt;
  }
  if (listFilter.value === "expiring") {
    return Boolean(expiresAt) && !isExpired(expiresAt);
  }
  if (listFilter.value === "expired") {
    return isExpired(expiresAt);
  }
  if (listFilter.value === "large") {
    return (file.size || 0) >= LARGE_FILE_BYTES;
  }
  return true;
}

let sortFileList = function (sortKey, sortType) {
  let temp = fileList.value.map((el) => {
    const expiresAt = fileExpiresAt(el);
    return {
      ...el,
      expiresAt,
      uploaded_timestamp: el.uploaded ? new Date(el.uploaded).getTime() : 0,
      expires_sort: expiresAt,
      expiryLabel: formatExpiryLabel(expiresAt),
      expiryState: !expiresAt ? "never" : isExpired(expiresAt) ? "expired" : "expiring",
    };
  });

  if (!sortKey) {
    return temp.filter(matchesListFilter);
  }

  temp = temp.sort((a, b) => {
    if (sortKey === "expires_sort") {
      const mode = sortType === "never-first" ? "never-first" : "soonest";
      if (mode === "never-first" && Boolean(a.expiresAt) !== Boolean(b.expiresAt)) {
        return a.expiresAt ? 1 : -1;
      }
      return sortExpiryValue(a.expiresAt, mode) - sortExpiryValue(b.expiresAt, mode);
    }
    if (sortType === "desc") {
      return (b[sortKey] || 0) - (a[sortKey] || 0);
    }
    return (a[sortKey] || 0) - (b[sortKey] || 0);
  });

  return temp.filter(matchesListFilter);
};

let statusStore = useStatusStore();
let { uploading, endPointUpdated, expiryRevision } = storeToRefs(statusStore);

let selectMode = ref(false);

let endPoint = localStorage.getItem("endPoint");
let apiKey = localStorage.getItem("apiKey");
let customDomain = localStorage.getItem("customDomain");

watch(uploading, (newVal) => {
  if (!newVal) {
    endPoint = localStorage.getItem("endPoint");
    apiKey = localStorage.getItem("apiKey");
    customDomain = localStorage.getItem("customDomain");
    loadData();
  }
});

watch(expiryRevision, () => {
  Object.entries(statusStore.expiryOverrides || {}).forEach(([key, value]) => {
    expiryByKey.value[key] = value;
  });
  mapFilesToDir();
});

watch(endPointUpdated, (newVal) => {
  endPoint = localStorage.getItem("endPoint");
  apiKey = localStorage.getItem("apiKey");
  customDomain = localStorage.getItem("customDomain");
  fileList.value = [];
  dirMap.value = {};
  loadData();
});

let allFileSize = ref(0);

let parseByteSize = function (size) {
  let units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let index = 0;
  while (size > 1000) {
    size /= 1000;
    index++;
  }
  return `${size.toFixed(2)} ${units[index]}`;
};

let fileList = ref([]);
let loading = ref(false);

function handleFolderSelect(folder) {
  let files = dirMap.value[folder];
  let isInputChecked = document.getElementById(folder).checked;

  if (isInputChecked) {
    files.forEach((file) => {
      file.selected = true;
      updateSelectedFiles(file, folder);
    });
  } else {
    files.forEach((file) => {
      file.selected = false;
      updateSelectedFiles(file, folder);
    });
  }
}

let mouseOnSelectionCheckbox = ref(false);

function updateSelectedFiles(file, folder) {
  if (file.selected) {
    selectedFiles.value.push(file);
  } else {
    selectedFiles.value = selectedFiles.value.filter((item) => item.key !== file.key);
  }

  if (folder !== undefined && !mouseOnSelectionCheckbox.value) {
    let files = dirMap.value[folder];
    let isAllSelected = files.every((item) => item.selected);
    document.getElementById(folder).checked = isAllSelected;
  }
}

function restoreSortSelection() {
  let sortFromLocal = localStorage.getItem("sort");

  // check local value is valid
  if (!["0", "1", "2", "3", "4", "5", "6"].includes(sortFromLocal)) {
    return false;
  }

  if (sortFromLocal) {
    sort.value = sortFromLocal;
  }
}

function restoreFilterSelection() {
  let filterFromLocal = localStorage.getItem("listFilter");
  if (!["all", "never", "expiring", "expired", "large"].includes(filterFromLocal)) {
    return;
  }
  listFilter.value = filterFromLocal;
}

let selectedFiles = ref([]);

function deleteSelectedFiles() {
  let c = confirm("Are you sure to delete these files?");

  if (!c) {
    return false;
  }

  selectedFiles.value.forEach((file) => {
    deleteThisFile(file.key, true, {
      callback: () => {
        selectedFiles.value = selectedFiles.value.filter((item) => item.key !== file.key);

        if (selectedFiles.value.length === 0) {
          setTimeout(() => {
            console.log("All selected files have been deleted.");
            clearSelection();
          }, 50);
        }

        if (fileList.value.length === 0) {
          selectMode.value = false;
        }
      },
    });
  });
}

const copyButtonText = ref("Copy URLs");
const copyButtonDisabled = ref(false);

function openShare(item) {
  statusStore.openShare({
    fileName: item.fileName || item.key,
    url: filePublicUrl(item.key, customDomain, endPoint),
    objectKey: item.key,
    size: item.size || 0,
    expiresAt: fileExpiresAt(item),
  });
}

function copySelectedFileUrls() {
  const fileUrls = selectedFiles.value.map((file) => {
    return filePublicUrl(file.key, customDomain, endPoint);
  });

  // Copy to clipboard
  const urlString = fileUrls.join("\n");
  navigator.clipboard
    .writeText(urlString)
    .then(() => {
      copyButtonText.value = "Copied!";
      copyButtonDisabled.value = true;
      setTimeout(() => {
        copyButtonText.value = "Copy URLs";
        copyButtonDisabled.value = false;
      }, 2000);
    })
    .catch((err) => {
      console.error("Failed to copy URLs: ", err);
    });
}

function toggleSelectMode() {
  selectMode.value = !selectMode.value;
  selectedFiles.value = [];

  if (!selectMode.value) {
    clearSelection();
  }
}

function clearSelection() {
  selectedFiles.value = [];

  document
    .querySelectorAll('input[type="checkbox"][name="select_all_for_folder"]')
    .forEach((el) => {
      el.checked = false;
    });

  let folders = Object.keys(dirMap.value);
  folders.forEach((folder) => {
    document.getElementById(folder).checked = false;
    let files = dirMap.value[folder];
    files.forEach((file) => {
      file.selected = false;
    });
  });
}

let dirMap = ref({});
let seeFolderStructure = ref(true);
let reconstructing = ref(false);

async function parseDirs(file) {
  if (seeFolderStructure.value) {
    let dirs = file.key.split("/");

    let fileName = dirs[dirs.length - 1];

    dirs = dirs.slice(0, dirs.length - 1);

    let dirKey = dirs.join("/") + "/";

    let item = {
      fileName: fileName,
      key: file.key,
      size: file.size || 0,
      uploaded: file.uploaded,
      expiresAt: file.expiresAt ?? null,
      expiryLabel: file.expiryLabel,
      expiryState: file.expiryState,
      selected: file.selected,
    };
    if (dirMap.value[dirKey]) {
      dirMap.value[dirKey].push(item);
    } else {
      dirMap.value[dirKey] = [item];
    }
  } else {
    let item = {
      fileName: file.key,
      key: file.key,
      size: file.size || 0,
      uploaded: file.uploaded,
      expiresAt: file.expiresAt ?? null,
      expiryLabel: file.expiryLabel,
      expiryState: file.expiryState,
      selected: file.selected,
    };
    if (dirMap.value["/"]) {
      dirMap.value["/"].push(item);
    } else {
      dirMap.value["/"] = [item];
    }
  }
}

async function mapFilesToDir() {
  dirMap.value = {};
  reconstructing.value = true;

  let start = Date.now();

  let { sortKey, sortType } = getSortVariables(sort.value);
  let temp = sortFileList(sortKey, sortType);

  await Promise.all(
    temp.map(async (item) => {
      await parseDirs(item);
    }),
  );

  let end = Date.now();

  reconstructing.value = false;

  console.log("reconstructed dirMap, took ", end - start, "ms");
}

let structureId = nanoid();
watch(seeFolderStructure, async () => {
  structureId = nanoid();
  localStorage.setItem("seeFolderStructure", seeFolderStructure.value ? "1" : "0");
  await mapFilesToDir();
});

let deletingKey = ref("");
let deleteThisFile = function (key, isBatchDelete = false, options = {}) {
  let c = true;

  if (!isBatchDelete) {
    c = confirm("Are you sure to delete this file?");
  }

  if (!c) {
    return false;
  }

  deletingKey.value = key;

  let fileName = "/" + key;
  if (endPoint[endPoint.length - 1] === "/") {
    fileName = key;
  }

  axios({
    method: "delete",
    headers: {
      "x-api-key": localStorage.getItem("apiKey"),
    },
    url: endPoint + fileName,
  })
    .then(async () => {
      deletingKey.value = "";
      fileList.value = fileList.value.filter((item) => item.key !== key);
      delete expiryByKey.value[key];
      deleteExpiry(key, filePublicUrl(key, customDomain, endPoint));
      await mapFilesToDir();

      if (options.callback) {
        options.callback();
      }
    })
    .catch(() => {
      deletingKey.value = "";
      alert("Failed to delete file.");
    });
};

watch(fileList, (newVal) => {
  allFileSize.value = 0;
  newVal.forEach((item) => {
    allFileSize.value += item.size;
  });

  statusStore.uploadedFiles = newVal;
});

let loadDataErrorText = ref("");
let loadDataErrorStack = ref("");

let globalCursor = ref("");

async function loadData(action) {
  try {
    loading.value = true;
    loadDataErrorText.value = "";
    loadDataErrorStack.value = "";

    if (!endPoint || !apiKey) {
      loading.value = false;
      silentPrune();
      return false;
    }

    const [res, expiryItems] = await Promise.all([
      axios({
        method: "patch",
        headers: {
          "x-api-key": apiKey,
        },
        url:
          endPoint +
          (action === "more" && globalCursor.value ? "?cursor=" + globalCursor.value : ""),
      }),
      fetchExpiryIndex(),
    ]);

    const nextExpiry = {};
    expiryItems.forEach((item) => {
      if (item?.key) {
        nextExpiry[item.key] = item.expiresAt ?? null;
      }
    });
    Object.entries(statusStore.expiryOverrides || {}).forEach(([key, value]) => {
      nextExpiry[key] = value;
    });
    expiryByKey.value = nextExpiry;

    if (globalCursor.value && action === "more") {
      fileList.value.push(...res.data.objects);
    } else {
      fileList.value = res.data.objects;
    }

    if (res.data.truncated && res.data.cursor) {
      globalCursor.value = res.data.cursor;
    } else {
      globalCursor.value = "";
    }

    restoreSortSelection();
    restoreFilterSelection();
    await mapFilesToDir();
    silentPrune();

    return true;
  } catch (e) {
    let errorJson = e.toJSON();
    console.log(errorJson);
    loadDataErrorText.value = `[${errorJson.message}], please check your endpoint and API key.`;
    loadDataErrorStack.value = errorJson.stack;
    return false;
  } finally {
    loading.value = false;
    clearSelection();
  }
}

async function seedPreviewShare() {
  if (!import.meta.env.DEV) {
    return;
  }
  if (!new URLSearchParams(location.search).has("previewShare")) {
    return;
  }

  endPoint = endPoint || "https://cdn.example.com/";
  const now = Date.now();
  fileList.value = [
    {
      key: "demo/hello.txt",
      fileName: "hello.txt",
      size: 42,
      uploaded: new Date(now - 3600_000).toISOString(),
    },
    {
      key: "keep/forever.bin",
      fileName: "forever.bin",
      size: 1280,
      uploaded: new Date(now - 86400_000).toISOString(),
    },
    {
      key: "soon/clip.mp4",
      fileName: "clip.mp4",
      size: 52_000_000,
      uploaded: new Date(now - 7200_000).toISOString(),
    },
    {
      key: "old/expired.txt",
      fileName: "expired.txt",
      size: 4200,
      uploaded: new Date(now - 10800_000).toISOString(),
    },
  ];
  expiryByKey.value = {
    "soon/clip.mp4": now + 3600_000,
    "old/expired.txt": now - 1000,
  };
  loadDataErrorText.value = "";
  loadDataErrorStack.value = "";
  restoreSortSelection();
  restoreFilterSelection();
  await mapFilesToDir();
}

async function silentPrune() {
  if (silentPruneRunning) {
    return;
  }
  silentPruneRunning = true;
  try {
    const expired = await requestPrune();
    if (!expired.length) {
      return;
    }

    const currentEndPoint = localStorage.getItem("endPoint");
    const currentApiKey = localStorage.getItem("apiKey");
    const removed = [];
    if (currentEndPoint && currentApiKey) {
      const results = await Promise.allSettled(
        expired.map(async (item) => {
          try {
            await deleteR2Object(item.key, {
              endPoint: currentEndPoint,
              apiKey: currentApiKey,
            });
          } catch (err) {
            if (err.response?.status !== 404) {
              throw err;
            }
          }
          await deleteExpiry(item.key, item.target);
          return item.key;
        }),
      );
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          removed.push(result.value);
        }
      });
    }

    if (!removed.length) {
      return;
    }

    const keys = new Set(removed);
    const before = fileList.value.length;
    fileList.value = fileList.value.filter((file) => !keys.has(file.key));
    keys.forEach((key) => {
      delete expiryByKey.value[key];
    });
    if (fileList.value.length !== before) {
      await mapFilesToDir();
    }
  } finally {
    silentPruneRunning = false;
  }
}

loadData().then(seedPreviewShare);
</script>
