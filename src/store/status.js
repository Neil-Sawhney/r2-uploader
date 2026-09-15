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
      shareObjectKey: '',
      shareSize: 0,
      shareExpiresAt: null,
      expiryOverrides: {},
      expiryRevision: 0,
    }
  },
  actions: {
    openShare({ fileName, url, objectKey, size, expiresAt }) {
      this.shareFileName = fileName || ''
      this.shareUrl = url || ''
      this.shareObjectKey = objectKey || fileName || ''
      this.shareSize = size || 0
      this.shareExpiresAt = expiresAt ?? null
      this.shareOpen = true
    },
    closeShare() {
      this.shareOpen = false
    },
    setFileExpiry(key, expiresAt) {
      if (!key) {
        return
      }
      this.expiryOverrides = { ...this.expiryOverrides, [key]: expiresAt ?? null }
      this.expiryRevision += 1
      if (this.shareObjectKey === key) {
        this.shareExpiresAt = expiresAt ?? null
      }
    },
  },
})
