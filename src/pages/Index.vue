<template>
	<div style="margin:5px 10px;height: 90%;">
		<el-tag :key="index" style="cursor: pointer;" effect="dark" :type="index==currentTab?'':'info'" @click.native="changeTerm(index)"
		 v-for="(tab, index) in terminals" closable :disable-transitions="false" @close="handleClose(index)">
			{{tab.sshlabel}}
		</el-tag>
		<el-dialog title="Info" :visible.sync="dialogVisible">
			<el-form ref="form" :model="form">
				<el-form-item>
					<el-input type="textarea" rows="20" v-model="form.fileInfo"></el-input>
				</el-form-item>
			</el-form>
			<span slot="footer" class="dialog-footer">
				<el-button @click="dialogVisible = false">取消</el-button>
				<el-button type="primary" @click="updateFileInfo">确定</el-button>
			</span>
		</el-dialog>

		<el-tabs v-model="activeName" @tab-click="handleClick" v-show="terminals.length>0">
			<el-tab-pane label="ssh" name="ssh">
				<div id="term-container">
					<div v-for="(tab, index) in terminals" :key="index" v-show="index == currentTab">
						<div :id="tab.panel.name"></div>
					</div>
				</div>
			</el-tab-pane>
			<el-tab-pane label="sftp" name="sftp">
				<el-row>
					<el-col :span="24">
						<el-row>
							<el-col :span="12">
								<el-input suffix-icon="el-icon-search" v-model="folderPath" @keyup.enter.native="folderPathEnter" placeholder="请输入内容">
								</el-input>
							</el-col>
							<el-col :span="12">
								<el-alert v-if="uploadInfo != ''" :closable="false" :title="uploadInfo" type="warning">
								</el-alert>
								<el-alert v-if="downloadInfo != ''" :closable="false" :title="downloadInfo" type="warning">
								</el-alert>
							</el-col>
						</el-row>
						<el-row type="flex" class="row-bg" style="margin-top: 5px;" justify="start">
							<input style="display:none" ref="filElem" type="file" class="upload-file" @change="getUploadFile">
							<el-button size="mini" icon="el-icon-back" @click="folderPathBack" circle></el-button>
							<el-button size="mini" type="primary" icon="el-icon-upload" @click="uploadFile" circle></el-button>
							<el-button size="mini" type="success" icon="el-icon-download" @click="downloadFile" circle></el-button>
							<el-button size="mini" type="danger" icon="el-icon-delete" @click="deleteFile" circle></el-button>
							<el-button size="mini" type="danger" icon="el-icon-refresh" @click="refreshFile" circle></el-button>
						</el-row>

						<v-contextmenu ref="contextmenu">
							<v-contextmenu-item @click="open">打开</v-contextmenu-item>
							<v-contextmenu-item @click="downloadFile">下载</v-contextmenu-item>
							<v-contextmenu-item @click="rename">重命名</v-contextmenu-item>
							<v-contextmenu-item @click="deleteFile">删除</v-contextmenu-item>
						</v-contextmenu>
						<el-table highlight-current-row height="600" @current-change="handleCurrentChange" :data="folderList"
						 @row-dblclick="rowdblClick" @row-contextmenu="rightClick" style="width: 100%">
							<el-table-column label="名称">
								<div v-contextmenu:contextmenu slot-scope="scope">
									<svg-icon v-if="scope.row.longname.substring(0,1) == 'd'" icon-class="folder" />
									<i v-else class="el-icon-document"></i>
									<a style="margin-left: 10px">{{ scope.row.filename }}</a>
								</div>
							</el-table-column>
							<el-table-column prop="attrs.size" label="大小" width="180">
							</el-table-column>
							<el-table-column prop="attrs.mtime" label="修改时间" width="180">
							</el-table-column>
							<el-table-column prop="longname" label="类型">
							</el-table-column>
						</el-table>
					</el-col>
					<!-- <div class="col">
          </div> -->
					<!-- <el-col :span="12">
					</el-col> -->
				</el-row>

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
				localFolderList: [],
				folderPath: '',
				chooseFileName: '',
				chooseIsFile: false,
				activeName: 'ssh',
				folderTransferedObj: {},
				height: `${document.documentElement.clientHeight}`,
				uploadInfo: '',
				downloadInfo: '',
				dialogVisible: false,
				form: {
					fileInfo: ''
				}
			}
		},
		created() {
			var sshObj = {
				label: '172.16.2.50',
				ip: '172.16.2.50',
				port: 22,
				username: 'root',
				password: 'root01'
			}
			this.listenDrag()
			// this.addTerm(sshObj)
			// this.activeName = 'ssh'
		},
		activated() {
			var obj = this.$route.query.obj
			if (obj) {
				this.addTerm(obj)
				this.activeName = 'ssh'
			}
		},
		mounted() {
			var that = this
			this.$root.$on('addSSH', (sshObj) => {
				that.addTerm(sshObj)
				that.activeName = 'ssh'
			})
		},
		beforeDestroy() {
			this.$root.$off('addSSH', () => {})
		},
		methods: {
			OSnow() {
				var agent = navigator.userAgent.toLowerCase();
				var isMac = /macintosh|mac os x/i.test(navigator.userAgent);
				if (agent.indexOf("win32") >= 0 || agent.indexOf("wow32") >= 0) {
					return 'win'
				}
				if (agent.indexOf("win64") >= 0 || agent.indexOf("wow64") >= 0) {
					return 'win'
				}
				if (isMac) {
					return 'mac'
				}
			},
			updateFileInfo() {
				var nowSelectFile = this.folderPath + '/' + this.chooseFileName
				var order = ''
				order += '#! /bin/bash \n'
				order += 'cat>'
				order += nowSelectFile
				order += '<<EOF\n'
				order += this.form.fileInfo
				this.emitUpdateFileInfo(order)
				this.dialogVisible = false
				this.$message({
					message: '修改成功',
					type: 'success'
				});
			},
			clearInfo(e) {
				console.log(e)
				this.e = ''
			},
			rightClick(e) {
				this.chooseFileName = e.filename
				this.chooseIsFile = e.longname.substring(0, 1) == 'd' ? false : true
			},
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
				} else {
					var rootP = this.folderPath == '/' ? '' : this.folderPath
					var nowSelectFile = rootP + '/' + this.chooseFileName
					this.readFileInfo('cat ' + nowSelectFile)
				}
			},
			folderPathEnter() {
				this.getFolderList(this.folderPath, true)
			},
			getUploadFile() {
				let files = this.$refs.filElem.files[0];
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
			open() {
				var rootP = this.folderPath == '/' ? '' : this.folderPath
				var nowSelectFile = rootP + '/' + this.chooseFileName
				if (this.chooseIsFile) {
					this.readFileInfo('cat ' + nowSelectFile)
				} else {
					this.getFolderList(nowSelectFile, true)
				}
			},
			rename() {
				var that = this
				this.$prompt('请输入新名称', '提示', {
					confirmButtonText: '确定',
					cancelButtonText: '取消',
				}).then(({
					value
				}) => {
					var nowSelectFile = that.folderPath + '/' + that.chooseFileName
					if (that.chooseIsFile) {
						var arr = that.chooseFileName.split('.')
						value = value + '.' + arr[arr.length - 1]
					}
					var order = 'mv ' + nowSelectFile + ' ' + that.folderPath + '/' + value
					that.execShellInNowTab(order)
				})
			},
			deleteFile() {
				var that = this
				this.$confirm('此操作将永久删除该文件, 是否继续?', '提示', {
					confirmButtonText: '确定',
					cancelButtonText: '取消',
					type: 'warning'
				}).then(() => {
					var nowSelectFile = that.folderPath + '/' + that.chooseFileName
					var order = 'rm -rf ' + nowSelectFile
					that.execShellInNowTab(order)
				})
			},
			refreshFile() {
				this.getFolderList(this.folderPath, true)
			},
			downloadFile(remotePath, localPath) {
				var settingPath = ''
				var that = this
				that.$db.userData.loadDatabase();
				that.$db.userData.find({
					name: 'qiniu'
				}, (err, docs) => {
					if (docs && docs.length > 0) {
						if (docs[0].downloadPath) {
							var data = docs[0]
							settingPath = data.downloadPath
							var splitChar = '/'
							if(that.OSnow() != 'mac'){
								splitChar = '\\'
							}
							remotePath = that.folderPath + '/' + that.chooseFileName
							localPath = settingPath + splitChar + that.chooseFileName
							var data = {
								'remotePath': remotePath,
								'localPath': localPath
							}
							let tab = that.terminals[that.currentTab];
							if (that.chooseIsFile) {
								socket.emit(tab.panel.name + '-1', data) //1 下载文件
							} else {
								data.sshInfo = tab.sshInfo
								socket.emit(tab.panel.name + '-3', data) //3 下载文件夹
							}
						} else {
							that.$message({
								message: '请先设置相关参数',
								type: 'warning'
							});
						}
					} else {
						that.$message({
							message: '请先设置相关参数',
							type: 'warning'
						});
					}
				});

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
			getLocalDir(path) {
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
				if (path) {

				} else {
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
			readFileInfo(order) {
				var that = this
				let tab = this.terminals[this.currentTab];
				socket.emit(tab.panel.name + '-readFile', order);
			},
			emitUpdateFileInfo(order) {
				var that = this
				let tab = this.terminals[this.currentTab];
				socket.emit(tab.panel.name + '-updateFile', order);
			},
			emitDrag(path) {
				let tab = this.terminals[this.currentTab];
				var data = {
					info: path,
					rootPath: this.folderPath,
					sshInfo: tab.sshInfo,
					isMac: this.OSnow() == 'mac' ? true:false
				}
				socket.emit(tab.panel.name + '-4', data) //4 拖拽上传
			},
			listenDrag() {
				var that = this
				window.ondragover = (e) => {
					e.preventDefault();
				};

				window.ondragleave = (e) => {
						e.preventDefault();
					},

					window.ondragenter = (e) => {
						e.preventDefault();
					};
				window.ondrop = (e) => {
					e.preventDefault();
					if (e.dataTransfer.files.length > 0) {
						let path = [];
						Array.from(e.dataTransfer.files).forEach((file) => {
							path.push(file.path);
						});
						that.emitDrag(path)
					} else {
						console.log(e)
					}

					return false;
				};
			},
			createTerminal(container, server, callback, cwd = null) {
				var that = this
				let rows = 30
				let terminalname = "terminal" + generate();
				server.msgId = terminalname
				this.createServer(server)
				let term = new Terminal({
					rendererType: "canvas", //渲染类型
					rows: rows, //行数
					convertEol: true, //启用时，光标将设置为下一行的开头
					disableStdin: false, //是否应禁用输入。
					cursorStyle: "underline", //光标样式
					cursorBlink: true, //光标闪烁
					scrollback: 100,
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
				container.sshInfo = server
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
					that.downloadInfo = data.sucess ? data.info : '正在下载：' + data.destination
				})
				socket.on(tab.panel.name + '-4', function(data) {
					console.log(data)
					that.uploadInfo = data.sucess ? data.info : '正在上传：' + data.destination
				})
				socket.on(tab.panel.name + '-readFile', function(data) {
					console.log(data)
					that.dialogVisible = true
					that.form.fileInfo = data
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
		color: #409EFF;

	}

	.el-alert {
		padding: 0;
	}

	.el-tag+.el-tag {
		margin-left: 10px;
	}
</style>
