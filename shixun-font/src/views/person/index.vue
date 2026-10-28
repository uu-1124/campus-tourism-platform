<template>
  <div class="person-page">
    <section class="person-panel">
      <el-form class="search-form" :inline="true" size="medium" @submit.native.prevent>
        <el-form-item>
          <el-input
            v-model.trim="query.name"
            clearable
            prefix-icon="el-icon-user"
            placeholder="请输入姓名"
            @keyup.enter.native="search"
            @clear="search"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="search">搜索</el-button>
          <el-button icon="el-icon-refresh" @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="toolbar">
        <el-button type="primary" icon="el-icon-plus" @click="openCreate">新增</el-button>
        <span v-if="total" class="result-count">共 {{ total }} 位历史人物</span>
      </div>

      <div v-loading="loading" class="person-content">
        <div v-if="rows.length" class="person-grid">
          <article v-for="item in rows" :key="item.id" class="person-card">
            <div class="portrait-wrap">
              <el-image
                v-if="item.photo"
                class="portrait"
                :src="item.photo"
                fit="cover"
                :preview-src-list="[item.photo]"
              >
                <div slot="error" class="portrait-placeholder"><i class="el-icon-picture-outline" /><span>图片加载失败</span></div>
              </el-image>
              <div v-else class="portrait-placeholder"><i class="el-icon-user" /><span>暂无人物照片</span></div>
            </div>

            <div class="person-meta">
              <strong :title="item.name">{{ item.name || '未命名人物' }}</strong>
              <time :title="item.date">{{ item.date || '生卒日期待补充' }}</time>
            </div>

            <p v-if="plainContent(item.content)" class="person-summary">{{ plainContent(item.content) }}</p>

            <div class="card-actions">
              <div>
                <el-button type="text" icon="el-icon-edit-outline" @click="openEdit(item)">编辑</el-button>
                <el-button type="text" class="delete-action" icon="el-icon-delete" @click="remove(item)">删除</el-button>
              </div>
              <el-tooltip v-if="item.photo" content="查看大图" placement="top">
                <el-button class="preview-action" type="text" icon="el-icon-picture-outline" @click="preview(item.photo)" />
              </el-tooltip>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          <i class="el-icon-user" />
          <h3>{{ loadError ? '历史人物加载失败' : query.name ? '未找到相关人物' : '还没有历史人物资料' }}</h3>
          <p>{{ loadError ? '请检查网络连接后重新加载' : query.name ? '请尝试其他姓名或清空搜索条件' : '点击“新增”录入第一位历史人物' }}</p>
          <el-button v-if="loadError" type="primary" plain icon="el-icon-refresh" @click="loadPeople">重新加载</el-button>
          <el-button v-else-if="!query.name" type="primary" plain icon="el-icon-plus" @click="openCreate">新增人物</el-button>
        </div>
      </div>

      <div v-if="total" class="pagination-wrap">
        <el-pagination
          :current-page.sync="query.pageNum"
          :page-size.sync="query.pageSize"
          :page-sizes="[8, 12, 20, 40]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="changePageSize"
          @current-change="loadPeople"
        />
      </div>
    </section>

    <el-dialog
      :title="form.id ? '编辑历史人物' : '新增历史人物'"
      :visible.sync="dialogVisible"
      width="680px"
      append-to-body
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <el-form ref="personForm" :model="form" :rules="rules" label-width="92px">
        <el-form-item label="人物照片" prop="photo">
          <el-upload
            class="portrait-uploader"
            action="#"
            accept="image/jpeg,image/png,image/webp"
            :show-file-list="false"
            :http-request="uploadPhoto"
            :before-upload="validatePhoto"
            :disabled="uploading"
          >
            <div class="upload-box">
              <img v-if="form.photo" :src="form.photo" alt="人物照片">
              <div v-else class="upload-placeholder"><i class="el-icon-plus" /><span>上传照片</span></div>
              <div class="upload-mask"><i :class="uploading ? 'el-icon-loading' : 'el-icon-camera'" />{{ uploading ? '上传中' : '更换照片' }}</div>
            </div>
          </el-upload>
          <div class="form-tip">建议使用竖版照片，支持 JPG、PNG、WebP，大小不超过 5MB</div>
        </el-form-item>
        <div class="form-row">
          <el-form-item label="姓名" prop="name">
            <el-input v-model.trim="form.name" maxlength="50" show-word-limit placeholder="请输入人物姓名" />
          </el-form-item>
          <el-form-item label="出生日期" prop="date">
            <el-input v-model.trim="form.date" maxlength="50" placeholder="例如：1898.3.5" />
          </el-form-item>
        </div>
        <el-form-item label="人物简介" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="7"
            maxlength="2000"
            show-word-limit
            placeholder="请输入人物生平、主要事迹及与学校的渊源"
          />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="uploading" @click="submit">保存</el-button>
      </div>
    </el-dialog>

    <el-dialog class="photo-preview-dialog" :visible.sync="previewVisible" width="min(720px, 90vw)" append-to-body>
      <img class="photo-preview" :src="previewUrl" alt="人物照片预览">
    </el-dialog>
  </div>
</template>

<script>
import { addPerson, deletePeople, listPeople, updatePerson, uploadPersonPhoto } from '@/api/person'

const emptyForm = () => ({ id: null, name: '', date: '', photo: '', content: '' })

export default {
  name: 'HistoryPerson',
  data() {
    return {
      loading: false,
      saving: false,
      uploading: false,
      loadError: false,
      dialogVisible: false,
      previewVisible: false,
      previewUrl: '',
      rows: [],
      total: 0,
      query: { name: '', pageNum: 1, pageSize: 8 },
      form: emptyForm(),
      rules: {
        photo: [{ required: true, message: '请上传人物照片', trigger: 'change' }],
        name: [{ required: true, message: '请输入人物姓名', trigger: 'blur' }],
        date: [{ required: true, message: '请输入出生日期', trigger: 'blur' }],
        content: [{ required: true, message: '请输入人物简介', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.loadPeople()
  },
  methods: {
    async loadPeople() {
      this.loading = true
      this.loadError = false
      try {
        const params = { pageNum: this.query.pageNum, pageSize: this.query.pageSize }
        if (this.query.name) params.name = this.query.name
        const response = await listPeople(params)
        this.rows = response.rows || []
        this.total = Number(response.total || 0)
        if (!this.rows.length && this.total && this.query.pageNum > 1) {
          this.query.pageNum = Math.max(1, Math.ceil(this.total / this.query.pageSize))
          return this.loadPeople()
        }
      } catch (error) {
        this.rows = []
        this.total = 0
        this.loadError = true
      } finally {
        this.loading = false
      }
    },
    search() {
      this.query.pageNum = 1
      this.loadPeople()
    },
    resetSearch() {
      this.query.name = ''
      this.query.pageNum = 1
      this.loadPeople()
    },
    changePageSize() {
      this.query.pageNum = 1
      this.loadPeople()
    },
    openCreate() {
      this.form = emptyForm()
      this.dialogVisible = true
    },
    openEdit(item) {
      this.form = {
        id: item.id,
        name: item.name || '',
        date: item.date || '',
        photo: item.photo || '',
        content: item.content || ''
      }
      this.dialogVisible = true
    },
    validatePhoto(file) {
      const validType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      const validSize = file.size <= 5 * 1024 * 1024
      if (!validType) this.$message.error('仅支持 JPG、PNG、WebP 图片')
      else if (!validSize) this.$message.error('图片大小不能超过 5MB')
      return validType && validSize
    },
    async uploadPhoto(options) {
      this.uploading = true
      try {
        const body = new FormData()
        body.append('file', options.file)
        const response = await uploadPersonPhoto(body)
        if (!response.url) throw new Error('上传结果缺少图片地址')
        this.form.photo = response.url
        this.$nextTick(() => this.$refs.personForm && this.$refs.personForm.validateField('photo'))
        options.onSuccess(response)
      } catch (error) {
        options.onError(error)
        if (error && error.message === '上传结果缺少图片地址') this.$message.error(error.message)
      } finally {
        this.uploading = false
      }
    },
    submit() {
      this.$refs.personForm.validate(async valid => {
        if (!valid) return
        this.saving = true
        try {
          const payload = { ...this.form }
          if (payload.id) await updatePerson(payload)
          else await addPerson(payload)
          this.$message.success(payload.id ? '人物资料已更新' : '历史人物已新增')
          this.dialogVisible = false
          await this.loadPeople()
        } finally {
          this.saving = false
        }
      })
    },
    remove(item) {
      this.$confirm('确定删除“' + (item.name || '该人物') + '”吗？删除后无法恢复。', '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }).then(() => deletePeople([item.id]))
        .then(() => {
          this.$message.success('删除成功')
          return this.loadPeople()
        })
        .catch(() => {})
    },
    preview(url) {
      this.previewUrl = url
      this.previewVisible = true
    },
    plainContent(value) {
      if (!value) return ''
      const holder = document.createElement('div')
      holder.innerHTML = value
      return (holder.textContent || holder.innerText || '').replace(/\s+/g, ' ').trim()
    },
    resetForm() {
      this.form = emptyForm()
      this.$nextTick(() => this.$refs.personForm && this.$refs.personForm.clearValidate())
    }
  }
}
</script>

<style lang="scss" scoped>
.person-page {
  min-height: calc(100vh - 84px);
  padding: 28px 30px 42px;
  background: #f4f6f8;
  color: #25302b;
}

.person-panel {
  max-width: 1500px;
  min-height: 620px;
  margin: 0 auto;
  padding: 24px 28px 30px;
  border: 1px solid #e1e6e3;
  background: #fff;
}

.search-form {
  padding-bottom: 4px;
  border-bottom: 1px solid #e8ecea;
}

.search-form .el-input {
  width: 300px;
}

.toolbar {
  display: flex;
  align-items: center;
  min-height: 72px;
}

.result-count {
  margin-left: auto;
  color: #7b8580;
  font-size: 14px;
}

.person-content {
  min-height: 410px;
}

.person-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 320px));
  gap: 28px;
}

.person-card {
  overflow: hidden;
  border: 1px solid #e7ebe8;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 3px 12px rgba(31, 47, 39, .07);
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}

.person-card:hover {
  border-color: #ced9d3;
  box-shadow: 0 8px 22px rgba(31, 47, 39, .11);
  transform: translateY(-2px);
}

.portrait-wrap {
  width: 100%;
  height: 320px;
  overflow: hidden;
  background: #edf1ef;
}

.portrait {
  display: block;
  width: 100%;
  height: 100%;
}

.portrait-placeholder {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #a2aca7;
}

.portrait-placeholder i {
  margin-bottom: 10px;
  font-size: 38px;
}

.portrait-placeholder span {
  font-size: 13px;
}

.person-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px 12px;
}

.person-meta strong {
  overflow: hidden;
  color: #222a26;
  font-size: 18px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person-meta time {
  overflow: hidden;
  flex-shrink: 0;
  max-width: 130px;
  color: #87918c;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person-summary {
  display: -webkit-box;
  min-height: 40px;
  margin: 0;
  padding: 0 18px 14px;
  overflow: hidden;
  color: #737e78;
  font-size: 13px;
  line-height: 20px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 0 12px 0 10px;
  border-top: 1px solid #edf0ee;
}

.card-actions .el-button + .el-button {
  margin-left: 4px;
}

.delete-action {
  color: #d34d4d;
}

.preview-action {
  padding: 8px;
  font-size: 18px;
}

.empty-state {
  display: flex;
  min-height: 390px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8a9590;
  text-align: center;
}

.empty-state > i {
  color: #c3cbc7;
  font-size: 54px;
}

.empty-state h3 {
  margin: 18px 0 8px;
  color: #58635d;
  font-size: 18px;
  font-weight: 500;
}

.empty-state p {
  margin: 0 0 20px;
  font-size: 14px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 30px;
}

.form-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
}

.portrait-uploader {
  display: inline-block;
}

.upload-box {
  position: relative;
  width: 190px;
  height: 220px;
  overflow: hidden;
  border: 1px dashed #c8d1cc;
  border-radius: 5px;
  background: #f5f7f6;
}

.upload-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-placeholder {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8d9892;
}

.upload-placeholder i {
  margin-bottom: 10px;
  color: #6e7e76;
  font-size: 30px;
}

.upload-mask {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 9px 0;
  background: rgba(24, 38, 31, .68);
  color: #fff;
  font-size: 13px;
  text-align: center;
  opacity: 0;
  transition: opacity .2s ease;
}

.upload-mask i {
  margin-right: 6px;
}

.upload-box:hover .upload-mask,
.upload-box img + .upload-mask {
  opacity: 1;
}

.upload-placeholder + .upload-mask {
  display: none;
}

.form-tip {
  color: #929c97;
  font-size: 12px;
  line-height: 1.6;
}

.photo-preview {
  display: block;
  max-width: 100%;
  max-height: 72vh;
  margin: 0 auto;
  object-fit: contain;
}

::v-deep .el-image-viewer__close {
  color: #fff;
}

::v-deep .photo-preview-dialog .el-dialog__header {
  padding: 12px 20px;
}

::v-deep .photo-preview-dialog .el-dialog__body {
  padding: 12px 20px 24px;
}

@media (max-width: 900px) {
  .person-page { padding: 18px; }
  .person-panel { padding: 18px; }
  .search-form .el-input { width: 220px; }
  .person-grid { grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
  .portrait-wrap { height: 290px; }
}

@media (max-width: 620px) {
  .person-page { padding: 12px; }
  .search-form .el-form-item { display: block; margin-right: 0; }
  .search-form .el-input { width: 100%; }
  .person-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; gap: 0; }
}
</style>
