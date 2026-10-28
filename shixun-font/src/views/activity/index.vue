<template>
  <div class="banner-page">
    <div class="toolbar">
      <el-button type="primary" icon="el-icon-plus" @click="openAdd">新增</el-button>
      <span>小程序首页当前展示 {{ enabledCount }} 张轮播图</span>
    </div>

    <div v-loading="loading" class="banner-area">
      <div v-if="rows.length" class="banner-grid">
        <article v-for="item in rows" :key="item.id" class="banner-card">
          <div class="preview-wrap" @click="preview(item)">
            <el-image class="banner-image" :src="item.pictureUrl" fit="cover">
              <div slot="error" class="image-error"><i class="el-icon-picture-outline" /></div>
            </el-image>
            <span class="preview-label"><i class="el-icon-view" /> 点击预览</span>
            <span :class="['status-dot', Number(item.status) === 1 ? 'enabled' : 'disabled']">{{ Number(item.status) === 1 ? '展示中' : '已停用' }}</span>
          </div>
          <div class="card-actions">
            <el-button type="primary" icon="el-icon-edit" @click="openEdit(item)">修改</el-button>
            <el-button icon="el-icon-delete" @click="remove(item)">删除</el-button>
          </div>
        </article>
      </div>
      <div v-else-if="!loading" class="empty-state"><i class="el-icon-picture-outline" /><p>暂无轮播图</p><el-button type="text" @click="openAdd">立即新增</el-button></div>
    </div>

    <div v-if="total > pageSize" class="pagination-wrap">
      <el-pagination :current-page.sync="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="loadRows" />
    </div>

    <el-dialog :title="editingId ? '修改轮播图' : '新增轮播图'" :visible.sync="dialogVisible" width="560px" append-to-body @closed="resetForm">
      <el-form ref="bannerForm" :model="form" :rules="rules" label-width="86px">
        <el-form-item label="轮播图片" prop="pictureUrl">
          <div class="upload-preview" @click="$refs.imageFile.click()">
            <img v-if="form.pictureUrl" :src="form.pictureUrl" alt="轮播图片">
            <div v-else><i class="el-icon-plus" /><span>选择图片</span></div>
          </div>
          <input ref="imageFile" hidden type="file" accept="image/jpeg,image/png,image/webp" @change="pickImage">
          <div class="upload-tip">建议使用 16:9 横图，支持 JPG、PNG、WebP，最大 10MB</div>
        </el-form-item>
        <el-form-item label="展示状态"><el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="展示" inactive-text="停用" /></el-form-item>
      </el-form>
      <div slot="footer"><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submit">保存</el-button></div>
    </el-dialog>

    <el-dialog title="轮播图预览" :visible.sync="previewVisible" width="860px" append-to-body><img class="large-preview" :src="previewUrl" alt="轮播图预览"></el-dialog>
  </div>
</template>

<script>
import { deleteBanner, listBanners, saveBanner, uploadBanner } from '@/api/banner'

export default {
  name: 'BannerManagement',
  data() {
    return {
      loading: false, saving: false, rows: [], total: 0, page: 1, pageSize: 12,
      dialogVisible: false, editingId: '', form: { pictureUrl: '', status: 1 },
      previewVisible: false, previewUrl: '',
      rules: { pictureUrl: [{ required: true, message: '请上传轮播图片', trigger: 'change' }] }
    }
  },
  computed: { enabledCount() { return this.rows.filter(item => Number(item.status) === 1).length } },
  created() { this.loadRows() },
  methods: {
    async loadRows() {
      this.loading = true
      try {
        const response = await listBanners({ pageNum: this.page, pageSize: this.pageSize })
        this.rows = response.rows || []; this.total = Number(response.total) || 0
      } finally { this.loading = false }
    },
    openAdd() { this.editingId = ''; this.form = { pictureUrl: '', status: 1 }; this.dialogVisible = true },
    openEdit(item) { this.editingId = String(item.id); this.form = { pictureUrl: item.pictureUrl, status: Number(item.status) }; this.dialogVisible = true },
    async pickImage(event) {
      const file = event.target.files[0]; event.target.value = ''
      if (!file) return
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return this.$message.error('仅支持 JPG、PNG、WebP 图片')
      if (file.size > 10 * 1024 * 1024) return this.$message.error('图片大小不能超过 10MB')
      const body = new FormData(); body.append('file', file)
      this.saving = true
      try {
        const response = await uploadBanner(body)
        if (!response.data || !response.data.url) throw new Error('上传结果缺少图片地址')
        this.form.pictureUrl = response.data.url
        this.$message.success('图片上传成功')
        this.$nextTick(() => this.$refs.bannerForm && this.$refs.bannerForm.validateField('pictureUrl'))
      } catch (error) { if (error.message) this.$message.error(error.message) } finally { this.saving = false }
    },
    submit() {
      this.$refs.bannerForm.validate(async valid => {
        if (!valid) return
        this.saving = true
        try {
          await saveBanner({ id: this.editingId || undefined, pictureUrl: this.form.pictureUrl, status: this.form.status })
          this.$message.success('保存成功，小程序首页将实时同步'); this.dialogVisible = false; await this.loadRows()
        } finally { this.saving = false }
      })
    },
    remove(item) {
      this.$confirm('确定删除这张轮播图吗？小程序首页将同步移除。', '删除确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
        .then(() => deleteBanner(item.id)).then(() => { this.$message.success('删除成功'); return this.loadRows() }).catch(() => {})
    },
    preview(item) { this.previewUrl = item.pictureUrl; this.previewVisible = true },
    resetForm() { this.editingId = ''; this.form = { pictureUrl: '', status: 1 }; this.$nextTick(() => this.$refs.bannerForm && this.$refs.bannerForm.clearValidate()) }
  }
}
</script>

<style lang="scss" scoped>
.banner-page{min-height:calc(100vh - 84px);padding:48px 30px;background:#fff;color:#303133}.toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:30px}.toolbar .el-button{min-width:132px;height:52px;font-size:17px}.toolbar span{color:#909399;font-size:14px}.banner-area{min-height:430px}.banner-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px 30px}.banner-card{min-width:0;overflow:hidden;border:1px solid #e4e7ed;border-radius:6px;background:#fff}.preview-wrap{position:relative;height:240px;overflow:hidden;cursor:pointer}.banner-image{display:block;width:100%;height:100%;background:#f2f4f7;transition:transform .35s}.preview-wrap:hover .banner-image{transform:scale(1.025)}.preview-label{position:absolute;right:16px;bottom:14px;padding:5px 9px;border-radius:3px;background:rgba(0,0,0,.52);color:#fff;font-size:14px}.status-dot{position:absolute;top:14px;left:14px;padding:5px 10px;border-radius:3px;color:#fff;font-size:12px}.status-dot.enabled{background:#28a36a}.status-dot.disabled{background:#909399}.image-error{display:flex;height:100%;align-items:center;justify-content:center;color:#b4bcc5;font-size:42px}.card-actions{display:flex;gap:30px;padding:15px 24px}.card-actions .el-button{min-width:105px}.empty-state{padding:110px 0;text-align:center;color:#909399}.empty-state i{font-size:48px}.empty-state p{margin:12px 0 0}.pagination-wrap{display:flex;justify-content:flex-end;padding-top:30px}.upload-preview{display:flex;width:420px;height:236px;align-items:center;justify-content:center;overflow:hidden;border:1px dashed #bfc5cc;border-radius:5px;background:#fafafa;cursor:pointer}.upload-preview:hover{border-color:#409eff}.upload-preview img{width:100%;height:100%;object-fit:cover}.upload-preview div{display:flex;align-items:center;flex-direction:column;gap:9px;color:#909399}.upload-preview i{font-size:30px}.upload-tip{margin-top:8px;color:#909399;font-size:12px}.large-preview{display:block;width:100%;max-height:560px;object-fit:contain}@media(max-width:1200px){.banner-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:720px){.banner-page{padding:24px 18px}.banner-grid{grid-template-columns:1fr}.toolbar span{display:none}.upload-preview{width:100%;height:200px}}
</style>
