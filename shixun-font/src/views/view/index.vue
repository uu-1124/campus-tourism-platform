<template>
  <div class="startup-page">
    <input ref="picker" type="file" accept="image/*" hidden @change="addImage">
    <el-button type="primary" icon="el-icon-plus" @click="$refs.picker.click()">添加</el-button>
    <div class="image-grid">
      <div v-for="(item, index) in images" :key="item.url + index" class="image-item">
        <img :src="item.url" alt="启动页图片">
        <div class="image-actions">
          <span>启用</span><el-switch v-model="item.enabled" active-color="#13ce66" />
          <el-button type="text" class="delete" @click="remove(index)">删除</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StartupPage',
  data() {
    return {
      images: [
        { url: 'https://ar-travel-file.1jiaohu.com/resource/20260610/d18d6024be6749f18fa5208b5cff939c.jpg', enabled: true },
        { url: 'https://ar-travel-file.1jiaohu.com/resource/20260326/bae2b181f1ee40549b708e6f3c88a80a.jpg', enabled: true },
        { url: 'https://ar-travel-file.1jiaohu.com/resource/20260610/571efc98d49549dea908da666de2fe0a.png', enabled: true },
        { url: 'https://ar-travel-file.1jiaohu.com/resource/20260326/686975f4dd434768839d4294197dfc6b.jpg', enabled: true }
      ]
    }
  },
  methods: {
    addImage(event) {
      const file = event.target.files[0]
      if (file) this.images.push({ url: URL.createObjectURL(file), enabled: true })
      event.target.value = ''
    },
    remove(index) {
      this.$confirm('确定删除这张启动页图片吗？', '提示', { type: 'warning' }).then(() => {
        this.images.splice(index, 1)
        this.$message.success('删除成功')
      }).catch(() => {})
    }
  }
}
</script>

<style scoped>
.startup-page { min-height: calc(100vh - 84px); padding: 72px 54px; background: #f1f4fa; }
.startup-page .el-button { font-size: 16px; padding: 14px 25px; }
.image-grid { display: grid; grid-template-columns: repeat(4, minmax(210px, 1fr)); gap: 68px; margin-top: 86px; }
.image-item img { display: block; width: 100%; height: 258px; object-fit: cover; background: #fff; }
.image-actions { display: flex; align-items: center; gap: 12px; height: 44px; color: #606573; font-size: 17px; }
.image-actions .delete { margin-left: auto; padding: 0; color: #606573; }
@media (max-width: 1200px) { .image-grid { grid-template-columns: repeat(2, 1fr); gap: 38px; } }
@media (max-width: 700px) { .startup-page { padding: 30px 20px; } .image-grid { grid-template-columns: 1fr; margin-top: 40px; } }
</style>
