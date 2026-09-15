<template>
  <div class="app-shell">
    <header class="app-header">
      <h1 class="wordmark">NEILS WORMHOLE</h1>
    </header>

    <main class="app-main">
      <section class="panel">
        <EndPointManage></EndPointManage>
      </section>

      <section class="panel">
        <CustomUploader></CustomUploader>
      </section>

      <section class="panel">
        <FileList></FileList>
      </section>
    </main>

    <ShareSheet
      :open="statusStore.shareOpen"
      :file-name="statusStore.shareFileName"
      :url="statusStore.shareUrl"
      :object-key="statusStore.shareObjectKey"
      :size="statusStore.shareSize"
      :expires-at="statusStore.shareExpiresAt"
      @close="statusStore.closeShare()"
      @expiry-saved="onExpirySaved"
    />
  </div>
</template>

<script setup>
import CustomUploader from './components/CustomUploader.vue'
import FileList from './components/FileList.vue'
import EndPointManage from './components/EndPointManage.vue'
import ShareSheet from './components/ShareSheet.vue'
import { useStatusStore } from './store/status'

const statusStore = useStatusStore()

function onExpirySaved(payload) {
  if (payload && typeof payload === "object") {
    statusStore.setFileExpiry(payload.key, payload.expiresAt)
    return
  }
  statusStore.shareExpiresAt = payload ?? null
}
</script>
