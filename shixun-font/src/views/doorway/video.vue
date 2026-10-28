<template>
  <div class="video-page">
    <section class="search-row">
      <el-input v-model.trim="keyword" placeholder="请输入视频名称" clearable prefix-icon="el-icon-search" @keyup.enter.native="search" @clear="search" />
      <el-button type="primary" icon="el-icon-search" @click="search">查询</el-button>
      <el-button icon="el-icon-refresh" @click="resetSearch">重置</el-button>
    </section>

    <el-button type="primary" class="add-button" icon="el-icon-plus" @click="openAdd">新增视频</el-button>

    <el-table v-loading="loading" :data="pageRows" class="video-table">
      <el-table-column label="序号" width="100"><template slot-scope="scope">{{ (page - 1) * pageSize + scope.$index + 1 }}</template></el-table-column>
      <el-table-column prop="name" label="视频名称" min-width="360" show-overflow-tooltip />
      <el-table-column label="排序" width="180"><template slot-scope="scope">{{ scope.row.inx || 0 }}</template></el-table-column>
      <el-table-column prop="createTime" label="创建时间" min-width="220"><template slot-scope="scope">{{ scope.row.createTime || '-' }}</template></el-table-column>
      <el-table-column label="操作" width="190" align="right">
        <template slot-scope="scope"><el-button type="text" icon="el-icon-edit" @click="openEdit(scope.row)">编辑</el-button><el-button type="text" class="danger-link" icon="el-icon-delete" @click="remove(scope.row)">删除</el-button></template>
      </el-table-column>
      <template slot="empty"><div class="empty-state"><i class="el-icon-video-camera" /><p>暂无宣传视频</p></div></template>
    </el-table>

    <div class="pager"><el-pagination :current-page.sync="page" :page-size.sync="pageSize" :page-sizes="[10, 20, 50]" :total="filtered.length" layout="total, sizes, prev, pager, next, jumper" /></div>

    <el-dialog :title="editingId ? '编辑视频' : '新增视频'" :visible.sync="dialog" width="620px" append-to-body @closed="resetForm">
      <el-form ref="form" :model="form" :rules="rules" label-width="92px">
        <el-form-item label="视频名称" prop="name"><el-input v-model.trim="form.name" placeholder="请输入视频名称" /></el-form-item>
        <el-form-item label="视频标题"><el-input v-model.trim="form.tittle" placeholder="请输入展示标题" /></el-form-item>
        <el-form-item label="封面图片" prop="cover">
          <div class="cover-upload" @click="$refs.coverFile.click()"><img v-if="form.cover" :src="form.cover"><div v-else><i class="el-icon-plus" /><span>上传封面</span></div></div>
          <input ref="coverFile" hidden type="file" accept="image/*" @change="pickCover">
        </el-form-item>
        <el-form-item label="视频文件" prop="video">
          <el-button icon="el-icon-upload2" :loading="uploadingVideo" @click="$refs.videoFile.click()">{{ form.video ? '重新上传' : '上传视频' }}</el-button>
          <span v-if="videoName" class="filename">{{ videoName }}</span>
          <input ref="videoFile" hidden type="file" accept="video/*" @change="pickVideo">
        </el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.inx" :min="0" :max="9999" controls-position="right" /></el-form-item>
        <el-form-item label="内容简介"><el-input v-model="form.content" type="textarea" :rows="3" placeholder="可填写视频简介" /></el-form-item>
      </el-form>
      <div slot="footer"><el-button @click="dialog = false">取消</el-button><el-button type="primary" :loading="saving" @click="submit">保存</el-button></div>
    </el-dialog>
  </div>
</template>

<script>
import { addVideo, deleteVideo, listVideos, updateVideo, uploadVideoFile } from '@/api/video'

export default {
  name: 'PromotionalVideo',
  data() {
    return {
      loading: false, saving: false, uploadingVideo: false,
      keyword: '', applied: '', page: 1, pageSize: 10, rows: [],
      dialog: false, editingId: '', videoName: '',
      form: { name: '', tittle: '', cover: '', video: '', inx: 0, content: '', type: 1 },
      rules: {
        name: [{ required: true, message: '请输入视频名称', trigger: 'blur' }],
        cover: [{ required: true, message: '请上传封面图片', trigger: 'change' }],
        video: [{ required: true, message: '请上传视频文件', trigger: 'change' }]
      }
    }
  },
  computed: {
    filtered() {
      const word = this.applied.toLowerCase()
      return this.rows.filter(item => !word || String(item.name || '').toLowerCase().includes(word))
    },
    pageRows() { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize) }
  },
  created() { this.loadRows() },
  methods: {
    async loadRows() {
      this.loading = true
      try {
        const response = await listVideos({ pageNum: 1, pageSize: 100 })
        this.rows = (response.rows || []).map(item => ({ ...item, inx: Number(item.inx) || 0 }))
      } finally { this.loading = false }
    },
    search() { this.applied = this.keyword; this.page = 1 },
    resetSearch() { this.keyword = ''; this.search() },
    openAdd() { this.editingId = ''; this.dialog = true },
    openEdit(row) {
      this.editingId = String(row.id)
      this.form = { ...row, inx: Number(row.inx) || 0, type: row.type == null ? 1 : row.type }
      this.videoName = row.video ? '已上传视频' : ''
      this.dialog = true
    },
    async uploadFile(file) {
      const body = new FormData(); body.append('file', file)
      const response = await uploadVideoFile(body)
      if (!response.data || !response.data.url) throw new Error('上传结果缺少文件地址')
      return response.data.url
    },
    async pickCover(event) {
      const file = event.target.files[0]; event.target.value = ''
      if (!file) return
      if (!file.type.startsWith('image/')) return this.$message.error('请选择图片文件')
      try {
        this.form.cover = await this.uploadFile(file)
        this.$message.success('封面上传成功')
        this.$nextTick(() => this.$refs.form && this.$refs.form.validateField('cover'))
      } catch (error) { if (error.message) this.$message.error(error.message) }
    },
    async pickVideo(event) {
      const file = event.target.files[0]; event.target.value = ''
      if (!file) return
      if (!file.type.startsWith('video/')) return this.$message.error('请选择视频文件')
      this.uploadingVideo = true
      try {
        this.form.video = await this.uploadFile(file); this.videoName = file.name
        this.$message.success('视频上传成功')
        this.$nextTick(() => this.$refs.form && this.$refs.form.validateField('video'))
      } catch (error) { if (error.message) this.$message.error(error.message) } finally { this.uploadingVideo = false }
    },
    submit() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.saving = true
        try {
          const payload = { ...this.form, id: this.editingId || undefined, type: 1, inx: Number(this.form.inx) || 0 }
          if (this.editingId) await updateVideo(payload)
          else await addVideo(payload)
          this.$message.success('保存成功'); this.dialog = false; await this.loadRows()
        } finally { this.saving = false }
      })
    },
    remove(row) {
      this.$confirm('确定删除视频“' + row.name + '”吗？', '删除确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
        .then(() => deleteVideo(row.id)).then(() => { this.$message.success('删除成功'); return this.loadRows() }).catch(() => {})
    },
    resetForm() {
      this.editingId = ''; this.videoName = ''
      this.form = { name: '', tittle: '', cover: '', video: '', inx: 0, content: '', type: 1 }
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
    }
  }
}
</script>

<style lang="scss" scoped>
.video-page{min-height:calc(100vh - 84px);padding:38px 42px;background:#fff;color:#303133}.search-row{display:flex;gap:14px;max-width:650px}.search-row .el-input{width:330px}.add-button{margin:32px 0 24px}.video-table{width:100%;font-size:15px}.video-table::v-deep th{height:56px;background:#fafafa;color:#303133;font-weight:600}.video-table::v-deep td{height:64px}.danger-link{color:#f56c6c}.pager{display:flex;justify-content:flex-end;padding-top:30px}.empty-state{padding:30px 0;color:#909399}.empty-state i{font-size:38px}.empty-state p{margin:8px 0}.cover-upload{display:flex;width:230px;height:142px;align-items:center;justify-content:center;overflow:hidden;border:1px dashed #c0c4cc;border-radius:4px;background:#fafafa;cursor:pointer}.cover-upload:hover{border-color:#409eff}.cover-upload img{width:100%;height:100%;object-fit:cover}.cover-upload div{display:flex;align-items:center;flex-direction:column;gap:8px;color:#909399}.cover-upload i{font-size:28px}.filename{display:inline-block;max-width:300px;margin-left:12px;overflow:hidden;color:#606266;vertical-align:middle;text-overflow:ellipsis;white-space:nowrap}@media(max-width:760px){.video-page{padding:22px 18px}.search-row{flex-wrap:wrap}.search-row .el-input{width:100%}}
</style>
