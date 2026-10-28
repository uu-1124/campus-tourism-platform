<template>
  <div class="building-page">
    <header class="page-heading">
      <div><h1>建筑管理</h1><p>维护校园建筑、活动内容及展示资源</p></div>
      <div class="count-box"><span>{{ activeTab === 'scenic' ? '建筑' : '活动' }}</span><strong>{{ total }}</strong></div>
    </header>

    <el-tabs v-model="activeTab" class="building-tabs" @tab-click="switchTab">
      <el-tab-pane label="景点" name="scenic" />
      <el-tab-pane label="活动" name="activity" />
    </el-tabs>

    <section class="filter-row">
      <el-select v-if="activeTab === 'scenic'" v-model="filters.categoryId" clearable placeholder="请选择分类">
        <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="String(item.id)" />
      </el-select>
      <el-input v-model.trim="filters.name" :placeholder="activeTab === 'scenic' ? '请输入建筑名称' : '请输入活动名称'" clearable @keyup.enter.native="search" />
      <el-input v-model.trim="filters.address" placeholder="请输入景点地址" clearable @keyup.enter.native="search" />
      <el-button type="primary" icon="el-icon-search" @click="search">搜索</el-button>
      <el-button icon="el-icon-refresh" @click="resetSearch">重置</el-button>
    </section>

    <div class="list-toolbar">
      <el-button type="primary" icon="el-icon-plus" @click="openAdd">新增</el-button>
      <el-button v-if="activeTab === 'scenic'" icon="el-icon-menu" @click="openCategories">分类管理</el-button>
    </div>

    <div v-loading="loading" class="cards-area">
      <div v-if="rows.length" class="card-grid">
        <article v-for="item in rows" :key="item.id" class="resource-card">
          <el-image class="card-image" :src="coverOf(item)" fit="cover" :preview-src-list="[coverOf(item)]">
            <div slot="error" class="image-error"><i class="el-icon-picture-outline" /></div>
          </el-image>
          <div class="card-content">
            <h3 :title="item.name">{{ item.name }}</h3>
            <div class="view-count"><i class="el-icon-view" /> {{ item.pageviews || 0 }}</div>
            <div class="card-actions">
              <el-button type="text" class="delete-action" icon="el-icon-delete" @click="remove(item)">删除</el-button>
              <el-button type="text" icon="el-icon-edit-outline" @click="openEdit(item)">编辑</el-button>
              <el-button type="text" icon="el-icon-folder-opened" @click="openView(item)">查看</el-button>
            </div>
          </div>
        </article>
      </div>
      <div v-else-if="!loading" class="empty-state"><i class="el-icon-office-building" /><p>暂无{{ activeTab === 'scenic' ? '景点' : '活动' }}内容</p></div>
    </div>

    <div v-if="total" class="pagination-wrap"><el-pagination :current-page.sync="page" :page-size.sync="pageSize" :page-sizes="[8, 12, 24]" :total="total" layout="total, sizes, prev, pager, next, jumper" @current-change="loadRows" @size-change="sizeChanged" /></div>

    <el-dialog :title="editingId ? '编辑' + currentLabel : '新增' + currentLabel" :visible.sync="editVisible" width="650px" append-to-body @closed="resetForm">
      <el-form ref="editForm" :model="form" :rules="rules" label-width="96px">
        <el-form-item :label="currentLabel + '名称'" prop="name"><el-input v-model.trim="form.name" /></el-form-item>
        <el-form-item v-if="activeTab === 'scenic'" label="所属分类"><el-select v-model="form.categoryId" clearable placeholder="请选择分类" style="width:100%"><el-option v-for="item in categories" :key="item.id" :label="item.name" :value="String(item.id)" /></el-select></el-form-item>
        <el-form-item label="景点地址"><el-input v-model.trim="form.remarks" placeholder="请输入地址" /></el-form-item>
        <el-form-item label="封面图片" prop="backgroundCover">
          <div class="cover-upload" @click="$refs.coverFile.click()"><img v-if="form.backgroundCover" :src="form.backgroundCover"><div v-else><i class="el-icon-plus" /><span>上传封面</span></div></div>
          <input ref="coverFile" hidden type="file" accept="image/*" @change="pickCover">
        </el-form-item>
        <el-form-item label="列表图片"><el-input v-model.trim="form.pictureUrl" placeholder="未填写时使用封面图片" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.inx" :min="0" :max="9999" controls-position="right" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" /></el-form-item>
        <el-form-item label="内容简介"><el-input v-model="form.introduction" type="textarea" :rows="4" placeholder="请输入内容简介" /></el-form-item>
      </el-form>
      <div slot="footer"><el-button @click="editVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="saveItem">保存</el-button></div>
    </el-dialog>

    <el-dialog :title="viewItem.name || currentLabel + '详情'" :visible.sync="viewVisible" width="720px" append-to-body>
      <img v-if="coverOf(viewItem)" class="detail-cover" :src="coverOf(viewItem)" alt="">
      <div class="detail-grid">
        <div><span>名称</span><strong>{{ viewItem.name || '-' }}</strong></div>
        <div><span>浏览量</span><strong>{{ viewItem.pageviews || 0 }}</strong></div>
        <div class="detail-wide"><span>地址</span><strong>{{ viewItem.remarks || viewItem.address || '-' }}</strong></div>
        <div><span>创建时间</span><strong>{{ viewItem.createTime || '-' }}</strong></div>
        <div><span>状态</span><strong>{{ Number(viewItem.status) === 1 ? '启用' : '停用' }}</strong></div>
      </div>
      <div v-if="plainContent(viewItem)" class="detail-text">{{ plainContent(viewItem) }}</div>
    </el-dialog>

    <el-dialog title="分类管理" :visible.sync="categoryVisible" width="560px" append-to-body>
      <div class="category-add"><el-input v-model.trim="newCategory" placeholder="请输入分类名称" @keyup.enter.native="createCategory" /><el-button type="primary" icon="el-icon-plus" :loading="categorySaving" @click="createCategory">新增</el-button></div>
      <el-table :data="categories" class="category-table">
        <el-table-column prop="name" label="分类名称" min-width="180" />
        <el-table-column prop="orderBy" label="排序" width="80" />
        <el-table-column label="操作" width="150" align="right"><template slot-scope="scope"><el-button type="text" @click="renameCategory(scope.row)">改名</el-button><el-button type="text" class="delete-action" @click="removeCategory(scope.row)">删除</el-button></template></el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script>
import { addScenicCategory, addScenicItem, deleteScenicCategory, deleteScenicItem, listScenicCategories, listScenicItems, updateScenicCategory, updateScenicItem, uploadScenicImage } from '@/api/scenic'

const MODULES = { scenic: 847162, activity: 923342 }
const emptyForm = () => ({ name: '', categoryId: '', remarks: '', backgroundCover: '', pictureUrl: '', introduction: '', content: '', status: 1, inx: 0 })

export default {
  name: 'BuildingManagement',
  data() {
    return {
      activeTab: 'scenic', loading: false, saving: false, rows: [], total: 0, page: 1, pageSize: 8,
      categories: [], filters: { categoryId: '', name: '', address: '' }, applied: { categoryId: '', name: '', address: '' },
      editVisible: false, editingId: '', form: emptyForm(), viewVisible: false, viewItem: {},
      categoryVisible: false, categorySaving: false, newCategory: '',
      rules: { name: [{ required: true, message: '请输入名称', trigger: 'blur' }], backgroundCover: [{ required: true, message: '请上传封面图片', trigger: 'change' }] }
    }
  },
  computed: { currentLabel() { return this.activeTab === 'scenic' ? '景点' : '活动' } },
  created() { this.loadCategories(); this.loadRows() },
  methods: {
    async loadRows() {
      this.loading = true
      try {
        const response = await listScenicItems({ pageNum: this.page, pageSize: this.pageSize, moduleId: MODULES[this.activeTab], subClafficationId: this.applied.categoryId || undefined, name: this.applied.name || undefined, remarks: this.applied.address || undefined })
        this.rows = response.rows || []; this.total = Number(response.total) || 0
      } finally { this.loading = false }
    },
    async loadCategories() {
      try { const response = await listScenicCategories({ moduleId: MODULES.scenic }); this.categories = response.data || [] } catch (error) { this.categories = [] }
    },
    switchTab() { this.page = 1; this.filters = { categoryId: '', name: '', address: '' }; this.applied = { ...this.filters }; this.loadRows() },
    search() { this.applied = { ...this.filters }; this.page = 1; this.loadRows() },
    resetSearch() { this.filters = { categoryId: '', name: '', address: '' }; this.search() },
    sizeChanged() { this.page = 1; this.loadRows() },
    coverOf(item) { return (item && (item.backgroundCover || item.pictureUrl)) || '' },
    openAdd() { this.editingId = ''; this.form = emptyForm(); this.editVisible = true },
    openEdit(item) {
      this.editingId = String(item.id)
      const category = item.travelJointList && item.travelJointList[0] ? String(item.travelJointList[0].classificationId) : ''
      this.form = { ...emptyForm(), ...item, categoryId: category, status: Number(item.status) === 0 ? 0 : 1, inx: Number(item.inx) || 0 }
      this.editVisible = true
    },
    openView(item) { this.viewItem = item; this.viewVisible = true },
    async pickCover(event) {
      const file = event.target.files[0]; event.target.value = ''
      if (!file) return
      if (!file.type.startsWith('image/')) return this.$message.error('请选择图片文件')
      const body = new FormData(); body.append('file', file)
      try {
        const response = await uploadScenicImage(body)
        if (!response.data || !response.data.url) throw new Error('上传结果缺少图片地址')
        this.form.backgroundCover = response.data.url
        if (!this.form.pictureUrl) this.form.pictureUrl = response.data.url
        this.$message.success('封面上传成功'); this.$nextTick(() => this.$refs.editForm && this.$refs.editForm.validateField('backgroundCover'))
      } catch (error) { if (error.message) this.$message.error(error.message) }
    },
    saveItem() {
      this.$refs.editForm.validate(async valid => {
        if (!valid) return
        this.saving = true
        try {
          const payload = {
            ...this.form, id: this.editingId || undefined, moduleId: MODULES[this.activeTab],
            pictureUrl: this.form.pictureUrl || this.form.backgroundCover,
            travelJointList: this.activeTab === 'scenic' && this.form.categoryId ? [{ classificationId: this.form.categoryId }] : [],
            travelModelVideos: [], relateDetailIds: []
          }
          if (this.editingId) await updateScenicItem(payload); else await addScenicItem(payload)
          this.$message.success('保存成功'); this.editVisible = false; await this.loadRows()
        } finally { this.saving = false }
      })
    },
    remove(item) {
      this.$confirm('确定删除“' + item.name + '”吗？', '删除确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
        .then(() => deleteScenicItem(item.id)).then(() => { this.$message.success('删除成功'); return this.loadRows() }).catch(() => {})
    },
    resetForm() { this.editingId = ''; this.form = emptyForm(); this.$nextTick(() => this.$refs.editForm && this.$refs.editForm.clearValidate()) },
    plainContent(item) {
      const html = (item && (item.introduction || item.content)) || ''
      const div = document.createElement('div'); div.innerHTML = html
      return (div.textContent || div.innerText || '').trim().slice(0, 500)
    },
    openCategories() { this.newCategory = ''; this.categoryVisible = true },
    async createCategory() {
      if (!this.newCategory) return this.$message.warning('请输入分类名称')
      this.categorySaving = true
      try { await addScenicCategory({ name: this.newCategory, moduleId: MODULES.scenic, status: 1, orderBy: this.categories.length + 1 }); this.newCategory = ''; this.$message.success('分类新增成功'); await this.loadCategories() } finally { this.categorySaving = false }
    },
    renameCategory(item) {
      this.$prompt('请输入新的分类名称', '修改分类', { inputValue: item.name, inputValidator: value => !!String(value || '').trim() || '分类名称不能为空' })
        .then(({ value }) => updateScenicCategory({ id: item.id, name: value.trim(), moduleId: MODULES.scenic, status: item.status, orderBy: item.orderBy }))
        .then(() => { this.$message.success('分类修改成功'); return this.loadCategories() }).catch(() => {})
    },
    removeCategory(item) {
      this.$confirm('确定删除分类“' + item.name + '”吗？', '删除确认', { type: 'warning' }).then(() => deleteScenicCategory(item.id)).then(() => { this.$message.success('分类删除成功'); return this.loadCategories() }).catch(() => {})
    }
  }
}
</script>

<style lang="scss" scoped>
.building-page{min-height:calc(100vh - 84px);padding:34px 38px;background:#fff;color:#303133}.page-heading{display:flex;align-items:center;justify-content:space-between;padding-bottom:20px}.page-heading h1{margin:0 0 9px;font-size:27px;font-weight:600;letter-spacing:0}.page-heading p{margin:0;color:#909399;font-size:15px}.count-box{min-width:92px;text-align:center}.count-box span,.count-box strong{display:block}.count-box span{color:#909399;font-size:14px}.count-box strong{margin-top:6px;font-size:24px;font-weight:500}.building-tabs::v-deep .el-tabs__header{margin:0}.building-tabs::v-deep .el-tabs__item{height:54px;padding:0 28px;font-size:17px;line-height:54px}.building-tabs::v-deep .el-tabs__nav-wrap:after{height:1px}.filter-row{display:flex;gap:14px;padding:36px 18px 26px;background:#fafbfc}.filter-row .el-input,.filter-row .el-select{width:280px}.list-toolbar{display:flex;gap:10px;padding:24px 0 18px}.cards-area{min-height:330px}.card-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px 24px}.resource-card{min-width:0;overflow:hidden;border:1px solid #ebeef2;border-radius:3px;background:#fff;transition:box-shadow .2s,transform .2s}.resource-card:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(31,45,61,.1)}.card-image{display:block;width:100%;height:210px;background:#f2f4f7}.image-error{display:flex;height:100%;align-items:center;justify-content:center;color:#b2bac3;font-size:42px}.card-content{padding:15px 16px 12px}.card-content h3{overflow:hidden;margin:0 0 8px;font-size:16px;font-weight:500;text-overflow:ellipsis;white-space:nowrap}.view-count{color:#9aa1a9;font-size:13px}.view-count i{margin-right:5px}.card-actions{display:flex;align-items:center;justify-content:space-between;margin-top:13px;border-top:1px solid #f0f1f3}.card-actions .el-button{margin:0;padding:13px 2px 0;color:#606a75}.card-actions .delete-action,.delete-action{color:#7a838c}.pagination-wrap{display:flex;justify-content:flex-end;padding-top:30px}.empty-state{padding:90px 0;text-align:center;color:#909399}.empty-state i{font-size:48px}.empty-state p{margin:12px 0}.cover-upload{display:flex;width:250px;height:150px;align-items:center;justify-content:center;overflow:hidden;border:1px dashed #c0c4cc;border-radius:4px;background:#fafafa;cursor:pointer}.cover-upload:hover{border-color:#409eff}.cover-upload img{width:100%;height:100%;object-fit:cover}.cover-upload div{display:flex;align-items:center;flex-direction:column;gap:7px;color:#909399}.cover-upload i{font-size:28px}.detail-cover{display:block;width:100%;height:280px;margin-bottom:22px;object-fit:cover}.detail-grid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #ebeef5;border-left:1px solid #ebeef5}.detail-grid>div{display:grid;grid-template-columns:90px 1fr;min-height:46px;border-right:1px solid #ebeef5;border-bottom:1px solid #ebeef5}.detail-grid span,.detail-grid strong{display:flex;align-items:center;padding:10px 12px}.detail-grid span{background:#fafafa;color:#909399}.detail-grid strong{font-weight:400}.detail-grid .detail-wide{grid-column:1/-1}.detail-text{margin-top:18px;color:#606266;font-size:14px;line-height:1.8}.category-add{display:flex;gap:12px;margin-bottom:20px}.category-table::v-deep th{background:#fafafa}@media(max-width:1350px){.card-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.card-image{height:190px}}@media(max-width:1000px){.filter-row{flex-wrap:wrap}.filter-row .el-input,.filter-row .el-select{width:240px}.card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:680px){.building-page{padding:22px 18px}.filter-row .el-input,.filter-row .el-select{width:100%}.card-grid{grid-template-columns:1fr}.count-box{display:none}.detail-grid{grid-template-columns:1fr}.detail-grid .detail-wide{grid-column:auto}}
</style>
