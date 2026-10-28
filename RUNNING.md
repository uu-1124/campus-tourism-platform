# 本机运行说明

项目环境已按当前电脑配置完成。管理端、后端、MySQL 和 Redis 均可通过根目录脚本启动。

## 启动

在 PowerShell 中执行：

```powershell
cd D:\Users\Lenovo\Desktop\shixun
powershell -ExecutionPolicy Bypass -File .\start-project.ps1
```

启动完成后访问：

- 管理端：http://127.0.0.1/
- 后端：http://127.0.0.1:8020/
- 默认账号：`admin`
- 默认密码：`admin123`

运行日志位于 `.local\temp`。

## 停止

```powershell
powershell -ExecutionPolicy Bypass -File .\stop-project.ps1
```

## 修改后端代码后重新构建

先停止当前服务，再执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\build-backend.ps1
powershell -ExecutionPolicy Bypass -File .\start-project.ps1
```

## 微信小程序

微信开发者工具已安装。导入 `D:\Users\Lenovo\Desktop\shixun\shixun-miniapp`，本机调试时保持“不校验合法域名”开启。小程序接口已经配置为 `http://127.0.0.1:8020`。

