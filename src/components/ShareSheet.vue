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
          <h2 id="share-title" class="share-title">Share</h2>
          <button type="button" class="outline share-close" @click="close">
            Close
          </button>
        </header>

        <p class="share-filename">{{ fileName }}</p>

        <div class="share-qr-wrap" aria-hidden="true">
          <canvas ref="canvasEl" class="share-qr"></canvas>
        </div>
        <p v-if="qrError" class="share-error">{{ qrError }}</p>

        <label class="share-label" for="share-url">Link</label>
        <div class="share-url-row">
          <input
            id="share-url"
            type="text"
            readonly
            :value="url"
            @focus="selectInput"
          />
          <button type="button" class="share-copy" @click="copyUrl">
            {{ copyLabel }}
          </button>
        </div>

        <a
          v-if="url"
          class="share-open"
          :href="url"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open file
        </a>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onUnmounted, ref, watch } from "vue";
import QRCode from "qrcode";

const props = defineProps({
  open: { type: Boolean, default: false },
  fileName: { type: String, default: "" },
  url: { type: String, default: "" },
});

const emit = defineEmits(["close"]);

const canvasEl = ref(null);
const copyLabel = ref("Copy");
const qrError = ref("");
let copyReset = null;

const close = () => emit("close");

const selectInput = (event) => {
  event.target.select();
};

const selectShareInput = () => {
  const input = document.getElementById("share-url");
  input?.focus();
  input?.select();
};

const copyUrl = async () => {
  if (!props.url) {
    return;
  }

  copyLabel.value = "Copied";
  clearTimeout(copyReset);
  copyReset = setTimeout(() => {
    copyLabel.value = "Copy";
  }, 2000);

  selectShareInput();

  try {
    if (!navigator.clipboard?.writeText) {
      document.execCommand("copy");
      return;
    }

    await Promise.race([
      navigator.clipboard.writeText(props.url),
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

const drawQr = async () => {
  qrError.value = "";
  await nextTick();

  if (!props.open || !props.url || !canvasEl.value) {
    return;
  }

  try {
    await QRCode.toCanvas(canvasEl.value, props.url, {
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

const onKeydown = (event) => {
  if (event.key === "Escape" && props.open) {
    close();
  }
};

watch(
  () => [props.open, props.url],
  ([isOpen]) => {
    copyLabel.value = "Copy";
    if (isOpen) {
      document.addEventListener("keydown", onKeydown);
      drawQr();
    } else {
      document.removeEventListener("keydown", onKeydown);
    }
  },
);

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  clearTimeout(copyReset);
});
</script>
