var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var utf8 = require('utf8');
var SSHClient = require('ssh2').Client;
let Client = require('ssh2-sftp-client');
let sftp = new Client();
var through = require('through')
var fs = require('fs')
var os = require('os')
var path = require('path')

function createNewServer(machineConfig, socket) {
  var ssh = new SSHClient();
  let {
    msgId,
    ip,
    username,
    password
  } = machineConfig;
  ssh.on('ready', function() {
    var homedir = os.userInfo().homedir

    function getLocalDir(path, then) {
      var realPath = homedir
      if (path) {
        realPath = path
      }
      compare = (val1, val2) => {
        return val1.name.toLowerCase() > val2.name.toLowerCase();
      };
      fs.readdir(realPath, function(err, files) {
        var dicArr = []
        var fileArr = []
        var arr= []
        if (err) {
          return console.error(err);
        }
        files.forEach(function(file) {
          if (file.substring(0, 1) != '.') {
            var res = fs.statSync(realPath + "/" + file)
            if (res.isDirectory()) {
              dicArr.push({
                'name': file,
                'size': res.size,
                'mtime': res.mtimeMs,
                'folder':true
              })
            } else {
              fileArr.push({
                'name': file,
                'size': res.size,
                'mtime': res.mtimeMs,
                'folder':false
              })
            }
          }
          dicArr.sort(compare)
          fileArr.sort(compare)
          arr = dicArr.concat(fileArr)
        });
        console.log(arr)
        var obj = {
          'path': realPath,
          'files': arr
        }
        console.log(obj)
        if (then)
          then(err, obj)
      });
    }

    function exec(cmd, then) {
      ssh.exec(cmd, function(err, stream) {
        var data = "";
        stream.pipe(through(function onWrite(buf) {
          data = data + buf;
        }, function onEnd() {
          stream.unpipe();
        }));
        stream.on('close', function() {
          if (then)
            then(err, '' + data);
        });
      });
    };

    function getFileOrDirList(remotePath, isFile, then) {
      var cmd = "find " + remotePath + " -type " + (isFile == true ? "f" : "d") + "\nexit\n";
      exec(cmd, function(err, data) {
        var arr = [];
        var dirs = [];
        arr = data.split('\n');
        arr.forEach(function(dir) {
          if (dir.indexOf(remotePath) == 0) {
            dirs.push(dir);
          }
        });
        if (then)
          then(err, dirs);
      });
    };

    ssh.sftp(function(err, sftp) {
      if (err) {}
      socket.on(msgId + '-localDir', function(data) {
        console.log(data)
        if (data == null) {
          getLocalDir(null, function(err, obj) {
            socket.emit(msgId + '-localDir', obj)
          })
        } else {
          getLocalDir(data, function(err, obj) {
            socket.emit(msgId + '-localDir', obj)
          })
        }
      })
      socket.on(msgId + '-0', function(data) { //读取目录
        sftp.readdir(data, function(err, list) {
          if (err) {
            socket.emit(msgId + 'error', 'No such file');
          }
          socket.emit(msgId + '-0', list)
        });
      });
      socket.on(msgId + '-1', function(data) { //下载文件
          var path = data.remotePath
          var person = {
            concurrency: 64,
            chunkSize: 32768,
            step: function(total_transferred, chunk, total) {
              var data = {
                folderName: path,
                transfered: total_transferred,
                total: total
              }
              socket.emit(msgId + '-1-1', data) //下载进度
            }
          };
          sftp.fastGet(data.remotePath, data.localPath, person, function(err, result) {
            if (err) {
              socket.emit(msgId + '-1', '下载失败')
            } else {
              socket.emit(msgId + '-1', '下载成功')
            }
          });
        }),
        socket.on(msgId + '-2', function(data) { //上传文件
          sftp.fastPut(data.localPath, data.remotePath, function(err, result) {
            if (err) {
              socket.emit(msgId + '-2', '上传失败')
            } else {
              socket.emit(msgId + '-2', '上传成功')
            }
          });
        }),
        socket.on(msgId + '-3', function(data) { //下载文件夹
          var order = 'zip -r ' + data.remotePath + '.zip ' + data.remotePath + '/'
          var name = data.remotePath + '.zip'
          var arr = data.remotePath.split('/')
          arr.pop()
          var nowFolder = arr.length == 1 ? '/' : arr.join('/')
          var res = {
            name: name,
            nowFolder: nowFolder,
            downloadPath: data.localPath + '.zip'
          }
          exec(order, function(err, data) {
            console.log(data)
            socket.emit(msgId + '-3', res) //下载进度
          })
        })
    });
    socket.on(msgId + '-order', function(data) {
      console.log(data)
      ssh.exec(data, function(err, stream) {
        if (err) throw err;
        stream.on('close', function(code, signal) {
          socket.emit(msgId + '-order', '删除成功')
          console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
        }).on('data', function(data) {
          console.log('STDOUT: ' + data);
        }).stderr.on('data', function(data) {
          console.log('STDERR: ' + data);
        });
      });
    })
    socket.on(msgId + '-readFile', function(data) {
      ssh.exec(data, function(err, stream) {
        if (err) throw err;
        stream.on('close', function(code, signal) {
          console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
        }).on('data', function(data) {
          socket.emit(msgId + '-readFile',  ''+data)
        }).stderr.on('data', function(data) {
          console.log('STDERR: ' + data);
        });
      });
    })

    // socket.emit(msgId, '\r\n***' + ip + ' SSH CONNECTION ESTABLISHED ***\r\n');
    ssh.shell(function(err, stream) {
      console.log('shell')
      if (err) {
        // return socket.emit(msgId, '\r\n*** SSH SHELL ERROR: ' + err.message + ' ***\r\n');
      }
      socket.on(msgId, function(data) {
        console.log(data)
        stream.write(data);
      });
      stream.on('data', function(d) {
        socket.emit(msgId, utf8.decode(d.toString('binary')));
      }).on('close', function() {
        ssh.end();
      });
    })
  }).on('close', function() {
    // socket.emit(msgId, '\r\n***SSH CONNECTION CLOSED ***\r\n');
  }).on('error', function(err) {
    console.log(err);
    socket.emit(msgId + 'error', '认证失败，请检查配置后重试');
  }).connect({
    host: ip,
    port: 22,
    username: username,
    password: password
  });
}


io.on('connection', function(socket) {
  socket.on('createNewServer', function(machineConfig) { //新建一个ssh连接
    console.log("createNewServer")
    createNewServer(machineConfig, socket);
  })

  socket.on('disconnect', function() {
    console.log('user disconnected');
  });
})

http.listen(10086, function() {
  console.log('listening on * 10086');
})
