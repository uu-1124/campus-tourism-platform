<template>
  <div class="banner-page">
    <div class="toolbar">
      <div class="toolbar-actions">
        <el-button type="primary" icon="el-icon-plus" @click="openEdit()">新增轮播图</el-button>
        <el-button icon="el-icon-refresh" @click="loadList">刷新</el-button>
      </div>
      <span class="selection-tip">共 {{ total }} 张 · 按创建时间升序展示，即小程序首页轮播顺序</span>
    </div>

    <div v-loading="loading" class="gallery-area">
      <div v-if="rows.length" class="gallery-grid">
        <article v-for="item in rows" :key="item.id" class="image-card">
          <el-image class="gallery-image" :src="item.pictureUrl" fit="cover" :preview-src-list="previewList" lazy>
            <div slot="error" class="image-error"><i class="el-icon-picture-outline" /></div>
          </el-image>
          <div class="card-footer">
            <div class="card-info">
              <el-tag :type="item.status === 1 ? 'success' : 'info'" size="mini" effect="light">
                {{ item.status === 1 ? '启用' : '停用' }}
              </el-tag>
              <span class="time">{{ item.createTime }}</span>
            </div>
            <div class="card-actions">
              <el-switch
                :value="item.status === 1"
                :disabled="saving"
                @change="toggleStatus(item)"
              />
              <el-button type="text" @click="openEdit(item)">编辑</el-button>
              <el-button type="text" class="danger" @click="removeItem(item)">删除</el-button>
            </div>
          </div>
        </article>
      </div>
      <div v-else-if="!loading" class="empty-state">
        <i class="el-icon-picture-outline" />
        <p>{{ loadError ? '轮播图加载失败，请稍后重试' : '暂无轮播图，点击「新增轮播图」上传' }}</p>
        <el-button v-if="loadError" type="text" @click="loadList">重新加载</el-button>
      </div>
    </div>

    <div v-if="total > pageSize" class="pagination-wrap">
      <el-pagination
        :current-page.sync="page"
        :page-size.sync="pageSize"
        :page-sizes="[8, 12, 24]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadList"
        @size-change="handleSizeChange"
      />
    </div>

    <el-dialog
      :title="form.id ? '编辑轮播图' : '新增轮播图'"
      :visible.sync="dialogVisible"
      width="480px"
      append-to-body
      @closed="resetForm"
    >
      <el-form ref="bannerForm" :model="form" :rules="rules" label-width="92px">
        <el-form-item label="轮播图片" prop="pictureUrl">
          <el-upload
            drag
            action="#"
            :auto-upload="false"
            :limit="1"
            :file-list="fileList"
            accept="image/jpeg,image/png,image/gif,image/webp"
            :on-change="chooseFile"
            :on-remove="removeFile"
            :on-preview="previewFile"
            :disabled="saving"
          >
            <i class="el-icon-upload" />
            <div class="el-upload__text">将图片拖到此处，或<em>点击选择</em></div>
            <div slot="tip" class="el-upload__tip">支持 JPG、PNG、GIF、WebP，单张不超过 5MB</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listBanners, saveBanner, deleteBanner, uploadBanner } from '@/api/banner'

export default {
  name: 'BannerManage',
  data() {
    const requirePicture = (rule, value, callback) => {
      if (value) return callback()
      callback(new Error('请上传轮播图片'))
    }
    return {
      loading: false,
      saving: false,
      loadError: false,
      rows: [],
      total: 0,
      page: 1,
      pageSize: 8,
      dialogVisible: false,
      fileList: [],
      rawFile: null,
      form: { id: null, pictureUrl: '', status: 1 },
      rules: { pictureUrl: [{ validator: requirePicture, trigger: 'change' }] }
    }
  },
  computed: {
    previewList() {
      return this.rows.map(item => item.pictureUrl).filter(Boolean)
    }
  },
  created() {
    this.loadList()
  },
  methods: {
    async loadList() {
      this.loading = true
      this.loadError = false
      try {
        const response = await listBanners({ pageNum: this.page, pageSize: this.pageSize })
        this.rows = (response.rows || []).map(item => ({
          ...item,
          id: String(item.id),
          status: Number(item.status)
        }))
        this.total = Number(response.total || 0)
      } catch (error) {
        this.rows = []
        this.total = 0
        this.loadError = true
      } finally {
        this.loading = false
      }
    },
    handleSizeChange() {
      this.page = 1
      this.loadList()
    },
    openEdit(item) {
      if (item) {
        this.form = { id: String(item.id), pictureUrl: item.pictureUrl || '', status: Number(item.status) }
        this.fileList = [{ name: '当前图片', url: item.pictureUrl }]
      } else {
        this.form = { id: null, pictureUrl: '', status: 1 }
        this.fileList = []
      }
      this.rawFile = null
      this.dialogVisible = true
    },
    chooseFile(file) {
      const raw = file.raw
      const validType = raw && ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(raw.type)
      const validSize = raw && raw.size <= 5 * 1024 * 1024
      if (!validType || !validSize) {
        this.$message.error(!validType ? '仅支持 JPG、PNG、GIF、WebP 图片' : '图片大小不能超过 5MB')
        this.fileList = []
        this.rawFile = null
        return
      }
      this.fileList = [file]
      this.rawFile = raw
      this.form.pictureUrl = ''
      this.$nextTick(() => this.$refs.bannerForm && this.$refs.bannerForm.validateField('pictureUrl'))
    },
    removeFile() {
      this.fileList = []
      this.rawFile = null
      if (!this.form.id) this.form.pictureUrl = ''
      else this.form.pictureUrl = this.rows.find(row => String(row.id) === String(this.form.id))?.pictureUrl || ''
    },
    previewFile(file) {
      if (file.url) window.open(file.url, '_blank')
    },
    async submit() {
      this.$refs.bannerForm.validate(async valid => {
        if (!valid) return
        this.saving = true
        try {
          let pictureUrl = this.form.pictureUrl
          if (this.rawFile) {
            const body = new FormData()
            body.append('file', this.rawFile)
            const uploaded = await uploadBanner(body)
            const fileInfo = uploaded.result || uploaded.data
            if (!fileInfo || !fileInfo.url) throw new Error('上传结果缺少图片地址')
            pictureUrl = fileInfo.url
          }
          await saveBanner({
            id: this.form.id || undefined,
            pictureUrl,
            status: this.form.status
          })
          this.$message.success('保存成功')
          this.dialogVisible = false
          await this.loadList()
        } catch (error) {
          if (error && error.message === '上传结果缺少图片地址') this.$message.error(error.message)
          else this.$message.error('保存失败，请稍后重试')
        } finally {
          this.saving = false
        }
      })
    },
    toggleStatus(item) {
      if (this.saving) return
      this.saving = true
      const nextStatus = item.status === 1 ? 0 : 1
      saveBanner({ id: item.id, pictureUrl: item.pictureUrl, status: nextStatus })
        .then(() => {
          this.$message.success(nextStatus === 1 ? '已启用' : '已停用')
          return this.loadList()
        })
        .catch(() => this.$message.error('状态更新失败，请稍后重试'))
        .finally(() => { this.saving = false })
    },
    removeItem(item) {
      this.$confirm('确定删除这张轮播图吗？删除后小程序首页将不再展示。', '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }).then(() => deleteBanner(item.id))
        .then(() => {
          this.$message.success('删除成功')
          if (this.rows.length === 1 && this.page > 1) this.page -= 1
          return this.loadList()
        })
        .catch(() => {})
    },
    resetForm() {
      this.fileList = []
      this.rawFile = null
      this.form = { id: null, pictureUrl: '', status: 1 }
      this.$nextTick(() => this.$refs.bannerForm && this.$refs.bannerForm.clearValidate())
    }
  }
}
</script>

<style lang="scss" scoped>
.banner-page {
  min-height: calc(100vh - 84px);
  padding: 34px 38px;
  background: #fff;
  color: #303133;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 24px;
}
.toolbar-actions {
  display: flex;
  gap: 12px;
}
.toolbar .el-button {
  min-width: 88px;
}
.selection-tip {
  color: #909399;
  font-size: 14px;
}
.gallery-area {
  min-height: 430px;
}
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 28px 22px;
}
.image-card {
  min-width: 0;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  transition: box-shadow .2s;
}
.image-card:hover {
  box-shadow: 0 8px 22px rgba(31, 109, 190, .12);
}
.gallery-image {
  display: block;
  width: 100%;
  height: 190px;
  background: #f2f4f7;
}
.image-error {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: #b1bac3;
  font-size: 38px;
}
.card-footer {
  padding: 12px 14px 10px;
}
.card-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.time {
  color: #a0a6ad;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-top: 8px;
}
.card-actions .el-button {
  padding: 4px 6px;
}
.card-actions .danger {
  color: #f56c6c;
}
.empty-state {
  padding: 110px 0;
  text-align: center;
  color: #909399;
}
.empty-state i {
  font-size: 48px;
}
.empty-state p {
  margin: 14px 0 0;
}
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 34px;
}
.el-upload::v-deep .el-upload-dragger {
  width: 100%;
  height: 150px;
}
.el-upload::v-deep .el-icon-upload {
  margin: 30px 0 10px;
}
@media (max-width: 1500px) {
  .gallery-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 1100px) {
  .gallery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .banner-page {
    padding: 20px;
  }
  .gallery-grid {
    grid-template-columns: 1fr;
  }
  .selection-tip {
    display: none;
  }
}
</style>
