<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="share-overlay"
      @click.self="close"
    >
      <div
        class="share-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
      >
        <header class="share-header">
          <h2 id="share-title" class="share-title">Share / QR</h2>
          <button type="button" class="outline share-close" @click="close">
            Close
          </button>
        </header>

        <p class="share-filename">{{ fileName }}</p>

        <div class="share-qr-wrap" aria-hidden="true">
          <canvas ref="canvasEl" class="share-qr"></canvas>
        </div>
        <p v-if="qrError" class="share-error">{{ qrError }}</p>

        <label class="share-label" for="share-slug">Short name</label>
        <div class="share-url-row">
          <span class="share-origin">{{ originHost }}/</span>
          <input
            id="share-slug"
            type="text"
            v-model="slugInput"
            placeholder="coolname"
            autocomplete="off"
            spellcheck="false"
            :disabled="savingSlug"
          />
          <button type="button" class="share-copy" :disabled="savingSlug" @click="saveSlug">
            {{ slugButton }}
          </button>
        </div>
        <p v-if="slugHint" class="share-hint">{{ slugHint }}</p>

        <label class="share-label" for="share-url">{{ primaryLabel }}</label>
        <div class="share-url-row">
          <input
            id="share-url"
            type="text"
            readonly
            :value="primaryUrl"
            @focus="selectInput"
          />
          <button type="button" class="share-copy" @click="copyPrimary">
            {{ copyLabel }}
          </button>
        </div>

        <div v-if="savedSlug" class="share-file-url">
          <label class="share-label" for="share-file-url">File URL</label>
          <div class="share-url-row">
            <input id="share-file-url" type="text" readonly :value="url" />
            <button type="button" class="outline share-copy" @click="copyFileUrl">
              {{ fileCopyLabel }}
            </button>
          </div>
        </div>

        <div class="share-footer-links">
          <a
            v-if="primaryUrl"
            class="share-open"
            :href="primaryUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open
          </a>
          <button
            v-if="savedSlug"
            type="button"
            class="share-remove"
            :disabled="savingSlug"
            @click="removeSlug"
          >
            Remove short name
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import QRCode from "qrcode";
import axios from "axios";
import { normalizeSlug, shortUrlForSlug, validateSlug } from "../utils/shortSlug.js";

const props = defineProps({
  open: { type: Boolean, default: false },
  fileName: { type: String, default: "" },
  url: { type: String, default: "" },
});

const emit = defineEmits(["close"]);

const canvasEl = ref(null);
const copyLabel = ref("Copy");
const qrError = ref("");
const slugInput = ref("");
const savedSlug = ref("");
const slugHint = ref("");
const slugButton = ref("Save");
const savingSlug = ref(false);
let copyReset = null;

const originHost = computed(() => location.host);
const primaryUrl = computed(() =>
  savedSlug.value ? shortUrlForSlug(savedSlug.value, location.origin) : props.url,
);
const primaryLabel = computed(() => (savedSlug.value ? "Short link" : "Link"));

const close = () => emit("close");

const selectInput = (event) => {
  event.target.select();
};

const copyText = async (value, labelRef) => {
  if (!value) {
    return;
  }

  labelRef.value = "Copied";
  clearTimeout(copyReset);
  copyReset = setTimeout(() => {
    labelRef.value = "Copy";
  }, 2000);

  try {
    if (!navigator.clipboard?.writeText) {
      const input = document.getElementById("share-url");
      input?.focus();
      input?.select();
      document.execCommand("copy");
      return;
    }

    await Promise.race([
      navigator.clipboard.writeText(value),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("clipboard timeout")), 500);
      }),
    ]);
  } catch (err) {
    try {
      document.execCommand("copy");
    } catch (copyErr) {
      console.error(err, copyErr);
    }
  }
};

const copyPrimary = () => copyText(primaryUrl.value, copyLabel);
const fileCopyLabel = ref("Copy");
const copyFileUrl = () => copyText(props.url, fileCopyLabel);

const drawQr = async () => {
  qrError.value = "";
  await nextTick();

  if (!props.open || !primaryUrl.value || !canvasEl.value) {
    return;
  }

  try {
    await QRCode.toCanvas(canvasEl.value, primaryUrl.value, {
      width: 184,
      margin: 1,
      color: {
        dark: "#0b0b0c",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error(err);
    qrError.value = "Could not create a QR code for this link.";
  }
};

const loadExistingSlug = async () => {
  savedSlug.value = "";
  slugInput.value = "";
  slugHint.value = "";
  slugButton.value = "Save";

  if (!props.url) {
    return;
  }

  try {
    const res = await axios.get("/api/shortlink", {
      params: { target: props.url },
      validateStatus: (status) => status < 500,
    });
    if (res.status === 200 && res.data?.slug) {
      savedSlug.value = res.data.slug;
      slugInput.value = res.data.slug;
    }
  } catch (err) {
    if (err.response?.status === 503) {
      slugHint.value = err.response.data?.message || "Short links are not available yet.";
    }
  }
};

const saveSlug = async () => {
  const slug = normalizeSlug(slugInput.value);
  const error = validateSlug(slug);
  if (error) {
    slugHint.value = error;
    return;
  }
  if (!props.url) {
    slugHint.value = "This file does not have a public URL yet.";
    return;
  }

  savingSlug.value = true;
  slugHint.value = "";
  try {
    const res = await axios.put("/api/shortlink", {
      slug,
      target: props.url,
    });
    savedSlug.value = res.data.slug;
    slugInput.value = res.data.slug;
    slugButton.value = "Saved";
    setTimeout(() => {
      slugButton.value = "Save";
    }, 2000);
  } catch (err) {
    slugHint.value =
      err.response?.data?.message || "Could not save that short name.";
  } finally {
    savingSlug.value = false;
  }
};

const removeSlug = async () => {
  if (!savedSlug.value) {
    return;
  }

  savingSlug.value = true;
  try {
    await axios.delete("/api/shortlink", {
      data: { slug: savedSlug.value },
    });
    savedSlug.value = "";
    slugHint.value = "Short name removed.";
  } catch (err) {
    slugHint.value = err.response?.data?.message || "Could not remove that short name.";
  } finally {
    savingSlug.value = false;
  }
};

const onKeydown = (event) => {
  if (event.key === "Escape" && props.open) {
    close();
  }
};

watch(
  () => [props.open, props.url],
  async ([isOpen]) => {
    copyLabel.value = "Copy";
    fileCopyLabel.value = "Copy";
    if (isOpen) {
      document.addEventListener("keydown", onKeydown);
      await loadExistingSlug();
      await drawQr();
    } else {
      document.removeEventListener("keydown", onKeydown);
    }
  },
);

watch(primaryUrl, () => {
  if (props.open) {
    drawQr();
  }
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  clearTimeout(copyReset);
});
</script>
