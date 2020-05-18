<template>
  <q-layout view="lHh Lpr lFf">
    <q-drawer show-if-above bordered content-class="bg-grey-1" mini>
      <q-list>
        <q-item-label header class="text-grey-8">
          Essential Links
        </q-item-label>
        <Sidebar v-for="(link,index) in essentialLinks" :key="link.title" v-bind="link" @mouseover.native="sidebarMouseOver(index)"
          @click.native="sidebarClick(index)" />
      </q-list>
    </q-drawer>
    <q-dialog v-model="alert">
      <q-card style="width: 900px; max-width: 80vw;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">设置</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-tabs v-model="tab" dense class="text-grey" active-color="primary" indicator-color="primary" align="justify"
          narrow-indicator>
          <q-tab name="conn" label="书签" />
          <q-tab name="history" label="访问历史" />
          <q-tab name="fastorder" label="快速命令" />
        </q-tabs>
        <q-separator />
        <q-tab-panels v-model="tab" animated>
          <q-tab-panel name="conn">
            <div class="q-pa-md q-gutter-sm">
              <div class="row">
                <div class="col">
                  <q-btn outline color="primary" @click="create_new_folder" icon="create_new_folder" size="sm" />
                  <!-- <el-input suffix-icon="el-icon-search" v-model="input" placeholder="请输入内容">
                  </el-input> -->
                  <el-input v-model="input4Create" v-if="input4CreateClass" placeholder="">
                    <i slot="suffix" @click="input4CreateConfirm" class="el-input__icon el-icon-check"></i>
                    <i slot="suffix" @click="input4CreateCancle" class="el-input__icon el-icon-close"></i>
                  </el-input>
                  <div class="custom-tree-container">
                    <el-tree :data="data" node-key="id" default-expand-all :expand-on-click-node="false" @node-click="handleNodeClick">
                      <span class="custom-tree-node" slot-scope="{ node, data }" @mouseover=mouseover(data,$event)
                        @mouseleave=mouseleave(data,$event)>
                        <span>{{ node.label }}</span>
                        <span class="none">
                          <el-button type="text" size="medium" @click="() => append(data)" icon="el-icon-folder-add">
                          </el-button>
                          <el-button type="text" size="medium" @click="() => remove(node, data)" icon="el-icon-close">
                          </el-button>
                        </span>
                      </span>
                    </el-tree>
                  </div>
                </div>
                <el-divider direction="vertical" style="height: 50em!"></el-divider>
                <div class="col">
                  <el-form ref="form" :model="form" label-width="80px">
                    <el-form-item label="别名">
                      <el-input v-model="form.label"></el-input>
                    </el-form-item>
                    <el-form-item label="地址">
                      <el-input v-model="form.ip"></el-input>
                    </el-form-item>
                    <el-form-item label="端口">
                      <el-input v-model="form.port"></el-input>
                    </el-form-item>
                    <el-form-item label="用户名">
                      <el-input v-model="form.username"></el-input>
                    </el-form-item>
                    <el-form-item label="密码">
                      <el-input v-model="form.password"></el-input>
                    </el-form-item>
                    <el-form-item>
                      <el-button type="primary" @click="createSSH">立即创建</el-button>
                    </el-form-item>
                  </el-form>
                </div>
              </div>
            </div>
          </q-tab-panel>
          <q-tab-panel name="history">
            <div class="text-h6">访问历史</div>
            访问历史
          </q-tab-panel>
          <q-tab-panel name="fastorder">
            <div class="text-h6">快速命令</div>
            快速命令
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </q-dialog>
    <div class="connDiv" @mouseleave="leaveConnDiv" v-show="tree">
      <div class="row">
        <div class="col">
          <q-badge outline color="primary" label="书签" />
        </div>
        <div class="col text-right	">
          <q-icon class="text-red" name="create" />
        </div>
      </div>
      <el-tree default-expand-all :data="sshdata" @node-click="sshClick" style="background-color: #F0F0F0;"></el-tree>
    </div>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
  /*  eslint-disable */
  import Sidebar from 'components/Sidebar'
  let id = 1000;
  export default {
    name: 'MainLayout',
    components: {
      Sidebar
    },
    data() {
      const data = [{
        id: 1,
        label: '默认',
        type: 1, //1是根目录 2是普通目录 3 是ssh
        children: []
      }];
      return {
        sshdata: [],
        input4Create: '',
        input4CreateClass: false, //控制输入新增根目录的输入框显现
        data: JSON.parse(JSON.stringify(data)),
        expanded: ['Satisfied customers (with avatar)', 'Good food (with icon)'],
        form: {
          label: '',
          ip: '',
          port: 22,
          username: '',
          password: ''
        },
        tab: 'conn',
        alert: false,
        tree: false,
        leftDrawerOpen: false,
        essentialLinks: [{
            title: 'Docs',
            icon: 'add_circle_outline'
          },
          {
            title: 'Github',
            icon: 'description'
          },
          {
            title: 'Discord Chat Channel',
            icon: 'history'
          }
        ]
      }
    },
    mounted() {
      if (this.$q.localStorage.getItem('nodeData')) {
        this.data = this.$q.localStorage.getItem('nodeData')
        this.sshdata = this.$q.localStorage.getItem('nodeData')
      }
    },
    methods: {
      sshClick(e) {
        if (e.type == 3) {
          this.$root.$emit('addSSH', e)
          this.tree = false
        }
      },
      handleNodeClick(e) {
        this.nowClickNodeData = e
        console.log(e)
        if (e.type == 3) {
          Object.keys(this.form).map((name) => {
            this.form[name] = e[name]
          })
          this.form.label = e.label
          this.form.ip = e.ip
          this.form.port = e.port
          this.form.username = e.username
          this.form.password = e.password
        } else {
          this.clearObj(this.form, 'port')
        }
      },
      mouseleave(data, $event) {
        $event.currentTarget.firstElementChild.nextElementSibling.setAttribute('class', 'node none')
      },
      mouseover(data, $event) {
        var currentElement = $event.currentTarget.firstElementChild.nextElementSibling
        var addElement = $event.currentTarget.firstElementChild.nextElementSibling.firstElementChild
        var deleteElement = $event.currentTarget.firstElementChild.nextElementSibling.firstElementChild.nextElementSibling
        if (data.type == 1) {
          currentElement.setAttribute('class', '')
          deleteElement.setAttribute('class', 'none')
        } else if (data.type == 2) {
          currentElement.setAttribute('class', '')
        } else if (data.type == 3) {
          currentElement.setAttribute('class', '')
          addElement.setAttribute('class', 'none')
        }
      },
      createSSH() {
        var form = this.form
        var newChild = {
          id: id++,
          label: form.label,
          type: 3,
          ip: form.ip,
          port: form.port,
          username: form.username,
          password: form.password
        };
        var data = this.nowClickNodeData
        if (data.type == 3) {
          data.ip = form.ip
          data.label = form.label
          data.port = form.port
          data.username = form.username
          data.password = form.password
        } else {
          if (!data.children) {
            this.$set(data, 'children', []);
          }
          data.children.push(newChild);
        }
        this.clearObj(this.form, 'port')
        this.setNodeData2Local()
        this.alert = false
      },
      input4CreateConfirm() {
        var name = this.input4Create
        const newChild = {
          id: id++,
          label: name,
          children: [],
          type: 2
        };
        if (this.createChilderFolder) {
          var data = this.nowFolderData
          if (!data.children) {
            this.$set(data, 'children', []);
          }
          data.children.push(newChild);
          this.createChilderFolder = false
        } else {
          this.data.push(newChild)
        }
        this.input4CreateClass = false
        this.setNodeData2Local()
      },
      input4CreateCancle() {
        this.input4CreateClass = false
      },
      create_new_folder() {
        this.input4CreateClass = true
      },
      append(data) {
        this.input4CreateClass = true
        this.createChilderFolder = true
        this.nowFolderData = data
      },
      remove(node, data) {
        const parent = node.parent;
        const children = parent.data.children || parent.data;
        const index = children.findIndex(d => d.id === data.id);
        children.splice(index, 1);
        this.setNodeData2Local()
      },
      sidebarMouseOver(index) {
        if (index == 1) {
          this.tree = true
          this.sshdata = this.$q.localStorage.getItem('nodeData')
        } else {
          this.tree = false
        }
      },
      leaveConnDiv() {
        this.tree = false
      },
      sidebarClick(index) {
        if (index == 0) {
          this.alert = true
        } else if (index == 2) {

        }
      },
      clearObj(obj, notClear) {
        Object.keys(obj).forEach(key => {
          if (notClear != key) {
            obj[key] = ''
          }

        })
      },
      setNodeData2Local() {
        this.$q.localStorage.set('nodeData', this.data)
      }
    }
  }
</script>
<style>
  .custom-tree-node {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    padding-right: 8px;
  }

  .none {
    display: none;
  }

  .connDiv {
    position: fixed;
    z-index: 100;
    left: 57px;
    top: 47px;
    width: 260px;
    height: 100%;
    border: 1px solid #fafafa;
    background-color: #F0F0F0;
  }
</style>
