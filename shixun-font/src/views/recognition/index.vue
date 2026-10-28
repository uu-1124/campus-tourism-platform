<template>
  <div class="library-page">
    <el-tabs v-model="activeTab" class="library-tabs" @tab-click="changeTab">
      <el-tab-pane label="官方识别库" name="official" />
      <el-tab-pane label="用户识别库" name="user" />
      <el-tab-pane label="百度图库" name="stored" />
    </el-tabs>

    <div class="toolbar">
      <div class="toolbar-actions">
        <el-button icon="el-icon-back" @click="goBack">返回</el-button>
        <el-button type="primary" icon="el-icon-upload2" @click="openAdd">上传图片</el-button>
        <el-button icon="el-icon-delete" :disabled="!selectedIds.length" @click="removeSelected">删除</el-button>
      </div>
      <span class="selection-tip">共 {{ tabRows.length }} 张<span v-if="selectedIds.length">，已选择 {{ selectedIds.length }} 张</span></span>
    </div>

    <div v-loading="loading" class="gallery-area">
      <div v-if="pageRows.length" class="gallery-grid">
        <article v-for="item in pageRows" :key="item.id" :class="['image-card', { selected: selectedIds.includes(item.id) }]" @click="toggleItem(item)">
          <el-checkbox class="card-check" :value="selectedIds.includes(item.id)" @click.native.stop @change="toggleItem(item)" />
          <el-image class="gallery-image" :src="item.url" fit="cover" :preview-src-list="previewImages" @click.stop>
            <div slot="error" class="image-error"><i class="el-icon-picture-outline" /></div>
          </el-image>
          <div class="file-name" :title="item.filename">{{ item.filename || '未命名图片' }}</div>
        </article>
      </div>
      <div v-else-if="!loading" class="empty-state">
        <i class="el-icon-picture-outline" />
        <p>{{ loadError ? '识别库加载失败，请稍后重试' : '当前图库暂无图片' }}</p>
        <el-button v-if="loadError" type="text" @click="loadRows">重新加载</el-button>
      </div>
    </div>

    <div v-if="tabRows.length" class="pagination-wrap">
      <el-pagination :current-page.sync="page" :page-size.sync="pageSize" :page-sizes="[12, 24, 48]" :total="tabRows.length" layout="total, sizes, prev, pager, next, jumper" />
    </div>

    <el-dialog title="上传识别图片" :visible.sync="dialogVisible" width="520px" append-to-body @closed="resetAddForm">
      <el-form ref="addForm" :model="form" :rules="rules" label-width="92px">
        <el-form-item label="关联建筑" prop="moduleDetailId">
          <el-select v-model="form.moduleDetailId" filterable placeholder="请选择建筑" style="width:100%">
            <el-option v-for="item in buildings" :key="item.id" :label="item.name" :value="String(item.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="识别类型" prop="tag">
          <el-radio-group v-model="form.tag"><el-radio :label="1">景点</el-radio><el-radio :label="2">文创</el-radio></el-radio-group>
        </el-form-item>
        <el-form-item label="图片文件" prop="file">
          <el-upload drag action="#" :auto-upload="false" :limit="1" :file-list="fileList" accept="image/jpeg,image/png" :on-change="chooseFile" :on-remove="removeFile">
            <i class="el-icon-upload" /><div class="el-upload__text">将图片拖到此处，或<em>点击选择</em></div>
            <div slot="tip" class="el-upload__tip">支持 JPG、PNG，单张不超过 5MB</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="文件名称" prop="filename"><el-input v-model.trim="form.filename" /></el-form-item>
      </el-form>
      <div slot="footer"><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitAdd">上传并入库</el-button></div>
    </el-dialog>
  </div>
</template>

<script>
import { deleteRecognitionImages, listBuildings, listRecognitionImages, storeRecognitionImage, uploadRecognitionImage } from '@/api/recognition'

export default {
  name: 'RecognitionLibrary',
  data() {
    const requireFile = (rule, value, callback) => this.form.file ? callback() : callback(new Error('请选择识别图片'))
    return {
      activeTab: 'official', loading: false, saving: false, loadError: false,
      rows: [], buildings: [], selectedIds: [], page: 1, pageSize: 12,
      dialogVisible: false, fileList: [],
      form: { moduleDetailId: '', tag: 1, filename: '', file: null },
      rules: {
        moduleDetailId: [{ required: true, message: '请选择关联建筑', trigger: 'change' }],
        tag: [{ required: true, message: '请选择识别类型', trigger: 'change' }],
        file: [{ validator: requireFile, trigger: 'change' }],
        filename: [{ required: true, message: '请输入文件名称', trigger: 'blur' }]
      }
    }
  },
  computed: {
    routeModuleId() { return this.$route.params.moduleDetailId || this.$route.query.moduleDetailId || '' },
    tabRows() {
      if (this.activeTab === 'user') return this.rows.filter(item => item.source === 1)
      if (this.activeTab === 'stored') return this.rows.filter(item => item.isStorage === 1)
      return this.rows.filter(item => item.source === 2)
    },
    pageRows() { return this.tabRows.slice((this.page - 1) * this.pageSize, this.page * this.pageSize) },
    previewImages() { return this.pageRows.map(item => item.url).filter(Boolean) }
  },
  created() { this.initialize() },
  methods: {
    async initialize() { await Promise.all([this.loadBuildings(), this.loadRows()]) },
    async loadBuildings() {
      try {
        const response = await listBuildings({ pageNum: 1, pageSize: 100, moduleId: 847162 })
        this.buildings = response.rows || []
      } catch (error) { this.buildings = [] }
    },
    async loadRows() {
      this.loading = true; this.loadError = false
      try {
        const response = await listRecognitionImages({})
        this.rows = (response.rows || response.data || []).map(item => ({ ...item, source: Number(item.source), isStorage: Number(item.isStorage) }))
      } catch (error) { this.rows = []; this.loadError = true } finally { this.loading = false }
    },
    changeTab() { this.page = 1; this.selectedIds = [] },
    goBack() { window.history.length > 1 ? this.$router.back() : this.$router.push('/') },
    toggleItem(item) {
      const index = this.selectedIds.indexOf(item.id)
      if (index > -1) this.selectedIds.splice(index, 1)
      else this.selectedIds.push(item.id)
    },
    openAdd() { this.form.moduleDetailId = String(this.routeModuleId || ''); this.dialogVisible = true },
    chooseFile(file) {
      const raw = file.raw
      const validType = raw && ['image/jpeg', 'image/png'].includes(raw.type)
      const validSize = raw && raw.size <= 5 * 1024 * 1024
      if (!validType || !validSize) {
        this.$message.error(!validType ? '仅支持 JPG、PNG 图片' : '图片大小不能超过 5MB')
        this.fileList = []; this.form.file = null; return
      }
      this.fileList = [file]; this.form.file = raw; this.form.filename = raw.name
      this.$nextTick(() => this.$refs.addForm && this.$refs.addForm.validateField('file'))
    },
    removeFile() { this.fileList = []; this.form.file = null },
    submitAdd() {
      this.$refs.addForm.validate(async valid => {
        if (!valid) return
        this.saving = true
        try {
          const body = new FormData(); body.append('file', this.form.file)
          const uploaded = await uploadRecognitionImage(body)
          const fileInfo = uploaded.data || uploaded.result
          if (!fileInfo || !fileInfo.url) throw new Error('上传结果缺少图片地址')
          await storeRecognitionImage(this.form.tag, { filename: this.form.filename, url: fileInfo.url, moduleDetailId: this.form.moduleDetailId })
          this.$message.success('图片上传成功'); this.dialogVisible = false; await this.loadRows()
        } catch (error) {
          if (error && error.message === '上传结果缺少图片地址') this.$message.error(error.message)
        } finally { this.saving = false }
      })
    },
    resetAddForm() {
      this.fileList = []; this.form = { moduleDetailId: '', tag: 1, filename: '', file: null }
      this.$nextTick(() => this.$refs.addForm && this.$refs.addForm.clearValidate())
    },
    removeSelected() {
      this.$confirm('确定删除选中的 ' + this.selectedIds.length + ' 张图片吗？删除后将同时从百度识别库移除。', '删除确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
        .then(() => deleteRecognitionImages(this.selectedIds))
        .then(() => { this.$message.success('删除成功'); this.selectedIds = []; return this.loadRows() })
        .catch(() => {})
    }
  }
}
</script>

<style lang="scss" scoped>
.library-page{min-height:calc(100vh - 84px);padding:34px 38px;background:#fff;color:#303133}.library-tabs::v-deep .el-tabs__header{margin:0}.library-tabs::v-deep .el-tabs__item{height:52px;padding:0 30px;font-size:18px;line-height:52px}.library-tabs::v-deep .el-tabs__nav-wrap:after{height:1px;background:#e4e7ed}.toolbar{display:flex;align-items:center;justify-content:space-between;padding:24px 0}.toolbar-actions{display:flex;gap:12px}.toolbar .el-button{min-width:88px}.selection-tip{color:#909399;font-size:14px}.gallery-area{min-height:430px}.gallery-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:28px 22px}.image-card{position:relative;min-width:0;cursor:pointer}.gallery-image{display:block;width:100%;height:168px;border:2px solid transparent;border-radius:4px;background:#f2f4f7;transition:border-color .2s,box-shadow .2s}.image-card:hover .gallery-image,.image-card.selected .gallery-image{border-color:#409eff;box-shadow:0 5px 16px rgba(31,109,190,.16)}.card-check{position:absolute;z-index:2;top:12px;left:12px}.card-check::v-deep .el-checkbox__inner{width:20px;height:20px;background:rgba(255,255,255,.92)}.card-check::v-deep .el-checkbox__inner:after{left:7px;top:3px}.file-name{overflow:hidden;padding:10px 2px 0;color:#515a64;font-size:15px;line-height:22px;text-overflow:ellipsis;white-space:nowrap}.image-error{display:flex;height:100%;align-items:center;justify-content:center;color:#b1bac3;font-size:38px}.empty-state{padding:110px 0;text-align:center;color:#909399}.empty-state i{font-size:48px}.empty-state p{margin:14px 0 0}.pagination-wrap{display:flex;justify-content:flex-end;padding-top:34px}.el-upload::v-deep .el-upload-dragger{width:360px;height:150px}.el-upload::v-deep .el-icon-upload{margin:30px 0 10px}@media(max-width:1500px){.gallery-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.gallery-image{height:150px}}@media(max-width:1100px){.gallery-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:760px){.library-page{padding:20px}.gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 12px}.gallery-image{height:130px}.selection-tip{display:none}}
</style>
