<template>
  <div>
    <el-tag :key="index" style="cursor: pointer;" effect="dark" :type="index==currentTab?'':'info'" @click="changeTerm(index)"
      v-for="(tab, index) in terminals" closable :disable-transitions="false" @close="handleClose(index)">
      {{tab.sshlabel}}
    </el-tag>
    <el-tabs v-model="activeName" @tab-click="handleClick" v-show="terminals.length>0">
      <el-tab-pane label="ssh" name="ssh">
        <div id="term-container">
          <div v-for="(tab, index) in terminals" :key="index" v-show="index == currentTab">
            <div :id="tab.panel.name"></div>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="sftp" name="sftp">
        <div class="row">
          <div class="col">

            <el-input suffix-icon="el-icon-search" v-model="folderPath" @keyup.enter.native="folderPathEnter"
              placeholder="请输入内容">
            </el-input>
            <el-row type="flex" class="row-bg" justify="end">
              <input style="display:none" ref="filElem" type="file" class="upload-file" @change="getUploadFile">
              <el-button size="mini" icon="el-icon-back" @click="folderPathBack" circle></el-button>
              <el-button size="mini" type="primary" icon="el-icon-top" @click="uploadFile" circle></el-button>
              <el-button size="mini" type="success" icon="el-icon-bottom" @click="downloadFile" circle></el-button>
              <el-button size="mini" type="danger" icon="el-icon-delete" @click="deleteFile" circle></el-button>
              <el-button size="mini" type="danger" icon="el-icon-refresh" @click="refreshFile" circle></el-button>

            </el-row>
            <el-table highlight-current-row height="600" @current-change="handleCurrentChange" :data="folderList"
              @row-dblclick="rowdblClick" style="width: 100%">
              <el-table-column label="名称" width="180">
                <template slot-scope="scope">
                  <i v-if="scope.row.longname.substring(0,1) == 'd'" class="el-icon-folder"></i>
                  <i v-else class="el-icon-document"></i>
                  <span style="margin-left: 10px">{{ scope.row.filename }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="attrs.size" label="大小" width="180">
              </el-table-column>
              <el-table-column prop="attrs.mtime" label="修改时间">
              </el-table-column>
              <el-table-column prop="longname" label="类型">
              </el-table-column>
            </el-table>
          </div>
          <!-- <div class="col">

          </div> -->
          <div class="col">
            <!-- <input type="file" webkitdirectory directory nwdirectory ref="file" @change.stop="changesData" /> -->
            <div v-for="(value, key,index) in folderTransferedObj" :key="key">
              {{value.path}}
              <el-progress :percentage="value.percentage"></el-progress>
            </div>
          </div>
        </div>

      </el-tab-pane>
    </el-tabs>
  </div>

</template>

<script>
  /*  eslint-disable */
  import {
    Terminal
  } from "xterm";
  import "xterm/css/xterm.css";
  import "xterm/lib/xterm.js";

  const {
    generate
  } = require('shortid')
  import {
    WebLinksAddon
  } from "xterm-addon-web-links";
  import {
    FitAddon
  } from 'xterm-addon-fit';
  import openSocket from 'socket.io-client';

  const socket = openSocket('http://localhost:10086');
  export default {
    name: 'PageIndex',
    data() {
      return {
        terminals: [],
        currentTab: 0,
        folderList: [],
        localFolderList:[],
        folderPath: '',
        chooseFileName: '',
        chooseIsFile: false,
        activeName: 'ssh',
        folderTransferedObj: {}
      }
    },
    mounted() {
      var that = this
      this.$root.$on('addSSH', (sshObj) => {
        console.log('addSSH')
        that.addTerm(sshObj)
        that.activeName = 'ssh'
      })
    },
    beforeDestroy() {
      this.$root.$off('addSSH', () => {})
    },
    methods: {
      changesData() {
        console.log(this.$refs.file);
      },
      folderPathBack() {
        if (this.folderPath == '/')
          return
        var arr = this.folderPath.split('/')
        arr.splice(arr.length - 1, 1)
        console.log(arr)
        var path = arr.length == 1 ? '/' : arr.join('/')
        this.getFolderList(path, true)
      },
      handleCurrentChange(e) {
        console.log(e)
        this.chooseFileName = e.filename
        this.chooseIsFile = e.longname.substring(0, 1) == 'd' ? false : true
      },
      rowdblClick(e) {
        if (e.longname.substring(0, 1) == 'd') {
          var nowPath = this.folderPath == '/' ? '/' : this.folderPath + '/'
          this.getFolderList(nowPath + e.filename, true)
        }
      },
      folderPathEnter() {
        this.getFolderList(this.folderPath, true)
      },
      getUploadFile() {
        let files = this.$refs.filElem.files[0];
        console.log(files)
        var remotePath = this.folderPath + '/' + files.name
        var localPath = files.path
        var data = {
          'remotePath': remotePath,
          'localPath': localPath
        }
        let tab = this.terminals[this.currentTab];
        socket.emit(tab.panel.name + '-2', data) //2 上传文件
      },
      uploadFile() {
        this.$refs.filElem.dispatchEvent(new MouseEvent('click'))
      },
      deleteFile() {
        var nowSelectFile = this.folderPath + '/' + this.chooseFileName
        var order = 'rm -rf ' + nowSelectFile
        this.execShellInNowTab(order)
      },
      refreshFile() {
        this.getFolderList(this.folderPath, true)
      },
      downloadFile(remotePath, localPath) {
        remotePath = this.folderPath + '/' + this.chooseFileName
        localPath = '/Users/chinarui/Downloads/' + this.chooseFileName
        var data = {
          'remotePath': remotePath,
          'localPath': localPath
        }
        let tab = this.terminals[this.currentTab];
        if (this.chooseIsFile) {
          socket.emit(tab.panel.name + '-1', data) //1 下载文件
        } else {
          socket.emit(tab.panel.name + '-3', data) //3 下载文件夹
        }
      },
      getFolderList(path, change) {
        var that = this
        let tab = this.terminals[this.currentTab];
        let {
          term,
          name
        } = tab.panel;
        if (tab.folderList && !change) {
          that.folderList = tab.folderList
          return
        }
        socket.emit(name + '-0', path)
        that.folderPath = path
      },

      handleClick(tab, event) {
        if (tab.index == 1) {
          this.getFolderList('/', false)
          this.getLocalDir()
        }
      },
      getLocalDir(path){
        var that = this
        let tab = this.terminals[this.currentTab];
        let {
          term,
          name
        } = tab.panel;
        if (tab.localFolderList) {
          that.localFolderList = tab.localFolderList
          return
        }
        if(path){

        }else{
          socket.emit(name + '-localDir', null)
        }
      },
      changeTerm(i) {
        this.currentTab = i
        this.activeName = 'ssh'
        let tab = this.terminals[this.currentTab];
        this.folderPath = tab.folderPath
        if (tab.folderList) {
          this.folderList = tab.folderList
          return
        } else {
          this.folderList = []
        }
      },
      addTerm(server) {
        let tab = {
          name: "tab" + this.terminals.length,
          children: []
        };
        this.createTerminal(tab, server, () => {
          this.terminals.push(tab);
          this.currentTab = this.terminals.length - 1;
        });
      },
      handleClose(index) {
        this.currentTab = index
        let tab = this.terminals[this.currentTab];
        let {
          term,
          name
        } = tab.panel;
        term.dispose();
        this.terminals.splice(this.currentTab, 1);
        if (this.terminals.length > 0) {
          this.currentTab = this.terminals.length - 1;
        }
        this.$nextTick(() => {
          this.terminals.forEach(tab => {
            var item = tab.panel
            let termEle = document.getElementById(item.name);
            termEle.append(item.term.element);
            term.focus();
          });
        });
      },
      createServer(server) {
        socket.emit("createNewServer", {
          msgId: server.msgId,
          ip: server.ip,
          username: server.username,
          password: server.password
        });
      },
      execShellInNowTab(order) {
        var that = this
        let tab = this.terminals[this.currentTab];
        socket.emit(tab.panel.name + '-order', order);
      },
      createTerminal(container, server, callback, cwd = null) {
        var that = this
        let terminalname = "terminal" + generate();
        server.msgId = terminalname
        this.createServer(server)
        let term = new Terminal({
          rendererType: "canvas", //渲染类型
          rows: parseInt(40), //行数
          convertEol: true, //启用时，光标将设置为下一行的开头
          disableStdin: false, //是否应禁用输入。
          cursorStyle: "underline", //光标样式
          cursorBlink: true, //光标闪烁
          scrollback: 50,
          theme: {
            foreground: "#7e9192", //字体#7e9192
            background: "#002833", //背景色#002833
            cursor: "help", //设置光标
            lineHeight: 16
          }
        });
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        let pane = {
          term: term,
          name: terminalname
        };
        container.sshlabel = server.label
        container.panel = pane
        callback && callback();
        this.$nextTick(() => {
          term.open(document.getElementById(terminalname));
          term.onData(function(data) {
            socket.emit(server.msgId, data);
          });
          socket.on(server.msgId, function(data) {
            term.write(data)
          })
          socket.on(server.msgId + 'error', function(data) {
            that.$message.error(data);
          })
          that.socketListen()
          fitAddon.fit();

        });
      },
      socketListen() {
        var that = this
        let tab = this.terminals[this.currentTab];
        socket.on(tab.panel.name + '-0', function(data) {
          console.log('获取文件目录')
          console.log(data)
          tab.folderList = data
          tab.folderPath = that.folderPath
          that.folderList = data
        })
        socket.on(tab.panel.name + '-1', function(data) {
          that.$message({
            message: data,
            type: 'warning'
          });
        })
        socket.on(tab.panel.name + '-1-1', function(data) {
          var percent = data.transfered / data.total * 100
          percent = Math.floor(percent);
          console.log(percent)
          var obj = {
            'path': data.folderName,
            'percentage': percent
          }
          that.$set(that.folderTransferedObj, data.folderName, obj)
        })
        socket.on(tab.panel.name + '-2', function(data) {
          that.getFolderList(that.folderPath, true)
          that.$message({
            message: data,
            type: 'warning'
          });
        })
        socket.on(tab.panel.name + '-3', function(data) {
          console.log(data)
          var nowFolder = data.nowFolder
          that.getFolderList(nowFolder, true)
          var name = data.name
          var d = {
            'remotePath': name,
            'localPath': data.downloadPath
          }
          let tab = that.terminals[that.currentTab];
          socket.emit(tab.panel.name + '-1', d) //1 下载文件
        })
        socket.on(tab.panel.name + '-order', function(data) {
          that.getFolderList(that.folderPath, true)
          that.$message({
            message: data,
            type: 'warning'
          });
        })
      }
    }
  }
</script>
<style>
  .active {
    color: blue;
  }

  .el-tag+.el-tag {
    margin-left: 10px;
  }
</style>
