<template>
  <div class="app-container">
    <el-card>
      <div style="padding: 24px; font-size: 18px; color: #303133;"><i class="el-icon-message" style="color:#409EFF;margin-right:8px"></i>公告管理页面</div>
      <el-divider />
      <el-alert title="当前账号：公告管理员" type="success" :closable="false" show-icon />
      <el-table :data="[{title: '温馨提醒：系统公告管理功能已上线', type: '公告', status: '正常', author: '公告管理员', time: '2026-09-01 09:00:00'}, {title: '景区运营维护通知', type: '通知', status: '正常', author: '公告管理员', time: '2026-09-02 10:30:00'}]" border stripe style="margin-top:20px"><el-table-column type="index" label="序号" width="70"/><el-table-column prop="title" label="公告标题"/><el-table-column prop="type" label="公告类型" width="110"/><el-table-column prop="status" label="状态" width="100"/><el-table-column prop="author" label="发布人" width="120"/><el-table-column prop="time" label="发布时间" width="180"/></el-table>
    </el-card>
  </div>
</template>
