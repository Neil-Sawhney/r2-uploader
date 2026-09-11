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
  </div>
</template>

<script setup>
import CustomUploader from './components/CustomUploader.vue'
import FileList from './components/FileList.vue'
import EndPointManage from './components/EndPointManage.vue'
</script>
