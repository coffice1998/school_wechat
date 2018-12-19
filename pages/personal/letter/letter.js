const util = require('./../../../utils/util.js')
const http = require("./../../../utils/http.js");
const qiniuUtil = require("./../../../utils/qiniuToken.js");
const config = require("./../../../config.js");
const app = getApp();

const icon = 'http://image.kucaroom.com//tmp/wx0f587d7c97a68e2b.o6zAJs3oh85Zb1lJE8oWix57vny0.ATIzBaoptXWG8c3ea5b7fe584cf68b45959a9f934eee.png';

Page({
  data: {
    grant_type:'password',
    friendId:'',
    content:'',
    list:[],
    to:12,
    scrollTop:3500,
    pageSize: 10,
    pageNumber: 1,
    initPageNumber: 1,
    imageArray: [],
    baseImageUrl: app.globalData.imageUrl,
    canChat:true,

    icon: {
      width: "75rpx",
      height: "75rpx",
      path: icon,
      showImage: false
    },
    qiniu: {
      uploadNumber: 9,
      region: "SCN",
      token: '',
      domain: config.qiniuDomain
    }
  },
  onLoad: function (option) {
    wx.hideTabBar();
    let cantChat = 0
    let friendId = option.friend_id;
    cantChat = option.can_chat;
    this.setData({
      friendId: friendId,
      canChat:cantChat
    });

    this.setTitle(friendId,cantChat);
    this.getMessageList(friendId);

    let _this = this;
    setTimeout(function () {
      wx.pageScrollTo({
        scrollTop: _this.data.scrollTop
      })
    }, 500); 

    this.getQiNiuToken();
  },

  /**
   * 获取七牛token
   */
  getQiNiuToken: function () {
    qiniuUtil.getQiniuToken(res => {
      let qiniu = this.data.qiniu;
      qiniu.token = res;
      this.setData({ qiniu: qiniu })
    })
  },

  /**
   * 获取上传的图片
   */
  uploadSuccess: function (uploadData) {
    console.log(uploadData)

    let attachments = [];
    uploadData.detail.map(item => {
      attachments.push(item.uploadResult.key)
    })

    this.setData({
      imageArray: attachments
    })
    this.send();
  },

  /**
   * 获取删除后的图片
   */
  deleteSuccess: function (uploadData) {
    this.setData({ imageArray: uploadData.detail })
  },

  /**
   * 设置title
   */
  setTitle: function (id,cantChat){
    let _this = this;
    if (cantChat != 1){
      http.get(`/user/${id}`,
        {},
        function (res) {
          console.log(res.data.data);
          let name = res.data.data.nickname;
          wx.setNavigationBarTitle({ title: name });
        });
    }else{
      wx.setNavigationBarTitle({ title: '匿名の同学' });
    }
  },

  /**
   * 获取消息 
   */
  getMessageList:function(id,oprateType=null){
    let _this = this;
    let pageSize = _this.data.pageSize;
    let pageNumber = _this.data.pageNumber;
    http.get(`/message/${id}/list?page_size=${pageSize}&page_number=${pageNumber}`,
      {},
      function (res) {
        wx.stopPullDownRefresh();
        console.log(res.data.data);
        let data = res.data.data.page_data;
        let list = _this.data.list;
        if (oprateType == 'unshift'){
          if(data.length == 0){
            wx.showLoading({
              title: '没有更多记录了~_~',
            })
            setTimeout(function () {
              wx.hideLoading()
            }, 2000)
          }
          data.map(item => {
            list.unshift(item);
          })
        }else{
          data.map(item => {
            list.push(item);
          })
        }
        _this.setData({
          list: list,
          pageNumber: _this.data.pageNumber + 1
        })
      });
  },

  /**
  * 下拉刷新，获取最新的贴子
  */
  onPullDownRefresh: function () {
    let friendId = this.data.friendId;
    this.getMessageList(friendId,'unshift');
  },

  /**
   * 撤回消息
   */
  deleteContent:function(e){
    let objId = e.currentTarget.dataset.objid;
    let _this = this;
    wx.showModal({
      title: '提示',
      content: '确定撤回该消息吗',
      success: function (res) {
        if (res.confirm) {
          http.httpDelete(`/delete/${objId}/chat_message`,
            {},
            function (res) {
              let list = _this.data.list;
              let newList = list.filter((item, index) => {
                if (item.id != objId) {
                  return item;
                }
              });
              _this.setData({
                list: newList
              })
            });
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },

  /**
   * 获取输入内容
   */
  getContent: function (event) {
    let content = event.detail.value;
    this.setData({
      content: content
    })
  },
  /**
   * 发送消息
   */
  send:function(){
    wx.showLoading({
      title: '发送中',
    });
    let friendId = this.data.friendId;
    let content = this.data.content;
    let attachments = this.data.imageArray;
    let _this = this;
    _this.setData({
      imageArray: []
    })
    if (content == '' && attachments.length == 0){
      return;
    }

    http.post(`/send/${friendId}/message`,
     {
       content:content,
       attachments: attachments
     }, 
     function (res) {
       wx.hideLoading();
       _this.setData({
         content:''
       })

      let chatData = _this.data.list;
      chatData.push(res.data.data);
      _this.setData({
        list:chatData,
        content:''
        })
      setTimeout(function () {
        wx.pageScrollTo({
          scrollTop: _this.data.scrollTop += 1000
        })
      }, 500); 
    });
  },

  /**
   * 预览图片
   */
  previewImage: function (event) {
    let url = event.target.id;
    wx.previewImage({
      current: '',
      urls: [url]
    })
  },
})