<template>
  <div class="cover-page">
    <input ref="photo" type="file" accept="image/*" hidden @change="changeCover($event, 'photo')">
    <input ref="reading" type="file" accept="image/*" hidden @change="changeCover($event, 'reading')">
    <section><el-button type="primary" @click="$refs.photo.click()">修改拍照封面</el-button><img :src="covers.photo" alt="拍照封面"></section>
    <section><el-button type="primary" @click="$refs.reading.click()">修改阅读封面</el-button><img :src="covers.reading" alt="阅读封面"></section>
  </div>
</template>
<script>
export default {
  name: 'CoverPictures',
  data() { return { covers: { photo: 'https://ar-travel-file.1jiaohu.com/resource/20260326/bae2b181f1ee40549b708e6f3c88a80a.jpg', reading: 'https://ar-travel-file.1jiaohu.com/resource/20260326/686975f4dd434768839d4294197dfc6b.jpg' } } },
  methods: { changeCover(event, type) { const file = event.target.files[0]; if (file) { this.covers[type] = URL.createObjectURL(file); this.$message.success('封面修改成功') } event.target.value = '' } }
}
</script>
<style scoped>
.cover-page { min-height: calc(100vh - 84px); padding: 54px 30px; background: #f1f4fa; display: grid; grid-template-columns: 1fr 1fr; gap: 70px; }
section { display: flex; flex-direction: column; align-items: flex-start; gap: 42px; }
.el-button { font-size: 17px; padding: 14px 25px; }
img { width: 100%; height: 540px; object-fit: cover; }
@media(max-width:900px){.cover-page{grid-template-columns:1fr} img{height:360px}}
</style>
