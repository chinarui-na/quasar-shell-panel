# About

#### 此项目是使用[quasar](https://quasar.dev/)，是桌面级的ssh和sftp客户端。
#### 目前ssh基本没什么问题，sftp上传和下载单个文件没有问题。下载文件夹，现在默认为先打包成.zip包，再按照单个文件的方式下载，上传文件夹暂未实现，技术上可行，在显示上传进度上面遇到点问题，先暂时放着。有时间再去写。

> 如果对您对此项目有兴趣，可以点 "Star" 支持一下 谢谢！ ^_^

> 或者您可以 "follow" 一下，我会不断开源更多的有趣的项目

> 开发环境 macOS 10.15 nodejs 12.12.0 quasar 1.0.5

> 如有问题请直接在 Issues 中提，因本身是写java，ui能力有限，寻找前端大佬、妹子大佬一起合作完成 q:492781157👍

> 其他开源 [记账本微信小程序](https://github.com/chinarui-na/cashbook) [斗图微信小程序](https://github.com/chinarui-na/EmotionalSearch)

# 技术栈
#### quasar + vue + xterm + ssh2 + express + socket.io + fs 等

<img src="http://img.chinarui.cn/shell2.jpg" align=center />

<img src="http://img.chinarui.cn/shell1.jpg" align=center />


### 运行在本地

```bash
npm install
```

```bash
quasar dev -m electron
```

### 打包
```bash
quasar dev -m electron
```
