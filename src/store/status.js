import {defineStore} from 'pinia'

export const useStatusStore = defineStore('status', {
  state: () => {
    return {
      uploading: false,
      endPointUpdated: 0,
      endPointPulled: 0,
      uploadedFiles: [],
      shareOpen: false,
      shareFileName: '',
      shareUrl: '',
    }
  },
  actions: {
    openShare({ fileName, url }) {
      this.shareFileName = fileName || ''
      this.shareUrl = url || ''
      this.shareOpen = true
    },
    closeShare() {
      this.shareOpen = false
    },
  },
})
