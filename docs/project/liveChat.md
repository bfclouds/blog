# liveChat客服系统

## 介绍

liveChat客服系统分为移动app及桌面app客服端、web客服 端，是xVpn、potatoVpn用于在线解决用户问题的实时聊天系统；

客服端有消息撤回、快捷回复、消息筛选、群发消息、输入框消息保存、echart图表；

## 技术栈

web客服端：vue3、vuex、vue-router、less、websocket；
web客户端：使用html、javascript、css、websocket开发，通过iframe嵌入web官及桌面端app中使用；

## 个人成长及总结

- websocket的使用、心跳机制、断线重连；
- 未使用ui库，所有组件独自封装，了解element-ui和antd-ui库的源码，加深了对组件封装的理解和封装技巧；
- 弹窗窗口拖拽、缩放，列表拖拽排序等功能加深了对拖拽相关api的理解;
- iframe通信；
- vue3中代替vuex的方案 1、通过 provide\inject 在vue3中代替vuex，2、pinia
