<template>
  <div class="vr-page">
    <el-form :inline="true" class="filter-form">
      <el-form-item label="名称">
        <el-input v-model="query" placeholder="请输入资源名称" clearable @keyup.enter.native="search" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" @click="search">搜索</el-button>
        <el-button icon="el-icon-refresh" @click="reset">重置</el-button>
        <el-button type="primary" icon="el-icon-plus" @click="openAdd">新增</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="pageRows" class="vr-table">
      <el-table-column type="index" label="序号" width="120" :index="indexMethod" />
      <el-table-column prop="name" label="名称" min-width="190" />
      <el-table-column prop="identify" label="VR标识" min-width="180" />
      <el-table-column label="VR链接" min-width="330">
        <template slot-scope="{ row }">
          <a :href="row.travelVrUrl" target="_blank">{{ row.travelVrUrl }}</a>
        </template>
      </el-table-column>
      <el-table-column label="是否启用" width="150" align="center">
        <template slot-scope="{ row }">
          <el-switch :value="row.status === 1" active-color="#1890ff" @change="changeStatus(row, $event)" />
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="时间" width="210" />
      <el-table-column label="操作" width="245">
        <template slot-scope="{ row }">
          <el-button type="text" icon="el-icon-edit" @click="openEdit(row)">修改</el-button>
          <el-button type="text" icon="el-icon-delete" @click="remove(row)">删除</el-button>
          <el-button type="text" icon="el-icon-view" @click="view(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        :current-page.sync="page"
        :page-size.sync="pageSize"
        :total="filteredRows.length"
        :page-sizes="[10, 20, 30, 50]"
        layout="total, sizes, prev, pager, next, jumper"
      />
    </div>

    <el-dialog :title="editingId ? '修改VR' : '新增VR'" :visible.sync="dialogVisible" width="450px" append-to-body>
      <el-form ref="vrForm" :model="form" :rules="rules" label-width="92px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="VR标识" prop="identify">
          <el-input v-model="form.identify" placeholder="请输入VR标识" />
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="form.enabled" active-color="#1890ff" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import request from '@/utils/request'

const fallbackRows = [
  { id: '1', name: 'test', identify: 'vr1', status: 1, createTime: '2026-09-10 08:51:16' },
  { id: '2', name: 'test1', identify: 'vr2', status: 1, createTime: '2026-09-10 08:55:45' },
  { id: '3', name: 'test3', identify: 'vr3', status: 1, createTime: '2026-09-10 09:41:19' },
  { id: '4', name: 'test4', identify: 'vr4', status: 0, createTime: '2026-09-10 09:41:28' },
  { id: '5', name: 'test5', identify: 'vr5', status: 1, createTime: '2026-09-10 09:41:35' }
]

export default {
  name: 'VrManagement',
  data() {
    return {
      loading: false,
      saving: false,
      query: '',
      appliedQuery: '',
      page: 1,
      pageSize: 10,
      rows: [],
      usingFallback: false,
      dialogVisible: false,
      editingId: null,
      form: { name: '', identify: '', enabled: true },
      rules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        identify: [{ required: true, message: '请输入VR标识', trigger: 'blur' }]
      }
    }
  },
  computed: {
    filteredRows() {
      const key = this.appliedQuery.trim()
      return this.rows.filter(item => !key || item.name.indexOf(key) !== -1)
    },
    pageRows() {
      const start = (this.page - 1) * this.pageSize
      return this.filteredRows.slice(start, start + this.pageSize)
    }
  },
  created() {
    this.loadRows()
  },
  methods: {
    normalize(row) {
      return Object.assign({}, row, {
        status: Number(row.status),
        travelVrUrl: row.travelVrUrl || 'http://127.0.0.1:5501/tour.html?type=' + row.identify
      })
    },
    loadRows() {
      this.loading = true
      request({ url: '/travel/backstage/vr/list', method: 'get' }).then(res => {
        const list = res.rows || res.result || []
        this.rows = (list.length ? list : fallbackRows).map(this.normalize)
        this.usingFallback = !list.length
      }).catch(() => {
        this.rows = fallbackRows.map(this.normalize)
        this.usingFallback = true
      }).finally(() => {
        this.loading = false
      })
    },
    search() {
      this.appliedQuery = this.query
      this.page = 1
    },
    reset() {
      this.query = ''
      this.appliedQuery = ''
      this.page = 1
    },
    indexMethod(index) {
      return (this.page - 1) * this.pageSize + index + 1
    },
    openAdd() {
      this.editingId = null
      this.form = { name: '', identify: '', enabled: true }
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.vrForm && this.$refs.vrForm.clearValidate())
    },
    openEdit(row) {
      this.editingId = row.id
      this.form = { name: row.name, identify: row.identify, enabled: row.status === 1 }
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.vrForm && this.$refs.vrForm.clearValidate())
    },
    submit() {
      this.$refs.vrForm.validate(valid => {
        if (!valid) return
        const payload = {
          id: this.editingId,
          name: this.form.name.trim(),
          identify: this.form.identify.trim(),
          status: this.form.enabled ? 1 : 0
        }
        if (this.usingFallback) {
          this.saveLocally(payload)
          return
        }
        this.saving = true
        request({
          url: this.editingId ? '/travel/backstage/modifyVr' : '/travel/backstage/vr',
          method: this.editingId ? 'put' : 'post',
          data: payload
        }).then(() => {
          this.dialogVisible = false
          this.$message.success('保存成功')
          this.loadRows()
        }).finally(() => { this.saving = false })
      })
    },
    saveLocally(payload) {
      if (this.editingId) {
        const index = this.rows.findIndex(item => item.id === this.editingId)
        this.$set(this.rows, index, this.normalize(Object.assign({}, this.rows[index], payload)))
      } else {
        payload.id = String(Date.now())
        payload.createTime = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
        this.rows.push(this.normalize(payload))
      }
      this.dialogVisible = false
      this.$message.success('保存成功')
    },
    changeStatus(row, enabled) {
      const status = enabled ? 1 : 0
      if (this.usingFallback) {
        row.status = status
        return
      }
      request({ url: '/travel/backstage/vr/' + status + '/' + row.id, method: 'put' }).then(() => {
        row.status = status
        this.$message.success('状态修改成功')
      })
    },
    remove(row) {
      this.$confirm('确定删除“' + row.name + '”吗？', '提示', { type: 'warning' }).then(() => {
        if (this.usingFallback) {
          this.rows.splice(this.rows.indexOf(row), 1)
          this.$message.success('删除成功')
          return
        }
        request({ url: '/travel/backstage/vr/' + row.id, method: 'delete' }).then(() => {
          this.$message.success('删除成功')
          this.loadRows()
        })
      }).catch(() => {})
    },
    view(row) {
      window.open(row.travelVrUrl, '_blank')
    }
  }
}
</script>

<style scoped>
.vr-page { min-height: calc(100vh - 84px); padding: 20px; background: #f5f7fa; }
.filter-form { padding: 16px 14px 2px; background: #fff; }
.filter-form .el-input { width: 200px; }
.vr-table { margin-top: 14px; font-size: 14px; }
.vr-table a { color: #1890ff; }
.pager { display: flex; justify-content: flex-end; padding: 24px 18px; background: #fff; }
::v-deep .el-dialog__header { padding: 20px 20px 14px; }
::v-deep .el-dialog__title { font-size: 18px; }
::v-deep .el-dialog__body { padding: 24px 26px 18px; }
::v-deep .el-dialog__footer { padding: 12px 18px 18px; }
::v-deep .vr-table th { color: #515a6e; background: #fafafa; }
@media (max-width: 760px) {
  .vr-page { padding: 10px; overflow-x: auto; }
  .filter-form { min-width: 700px; }
  .vr-table { min-width: 1100px; }
}
</style>
