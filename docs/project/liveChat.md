# liveChat客服系统

## 介绍

liveChat客服系统是XVpn、PotatoVpn用于解决用户问题的实时聊天系统；

有设置在线时间、系统消息通知、快捷回复（编辑）、echart图表、输入框消息留存；

## 技术栈

vue3、vuex、vue-router、less、websocket

### 拖拽排序

市场上有很多排序功能的工具包，如：

* [https://github.com/SortableJS/Sortable](https://github.com/SortableJS/Sortable)
* vue3: [https://github.com/SortableJS/vue.draggable.next](https://github.com/SortableJS/vue.draggable.next)
* vue2: [https://github.com/SortableJS/Vue.Draggable](https://github.com/SortableJS/Vue.Draggable)

不过项目中没有使用，因为不让用。。。具体实现也比较简单，只是没有用第三方依赖来的快；

首先封装一个简单的throttle节流方法，来处理dragstart,dragover,dragend的频繁触发

```js
export function throttle(fn, delay = 0) {
  let timer = 0;
  return function () {
    const newTimer = new Date().getTime();
    if (newTimer - timer > delay) {
      timer = newTimer;
      fn(...arguments);
    }
  };
}
```

监听dragstart,dragover,dragend方法；

* dragstart: 记录开始拖拽dragItem的index和position
* dragover: 计算dragItem是在节点的上半部分或下半部分，改变数组中item的位置
* dragend: 调用接口

### 事件总线

事件总线的原理其实就是：发布订阅模式

#### mitt

[安装&文档](https://www.npmjs.com/package/mitt)

#### 自己实现

eventBus主要有3个暴露出来的api：on(订阅), emit(发布), off(取消)，结构如下：

```js
export default class EventBus {
  constructor() {
    this._eventMap = new Map()
  }
  $on(eventName, callback) {}
  $emit(eventName, ...args) {}
  $off(eventName) {}
}
```

eventBus使用的时候是下面这样的：

```js

// 首先
export const eventBus = new EventBus()

// 先订阅
eventBus.on('xxx', cb);

// 后发布
eventBus.emit('xxx');
```

所以其实就是在on的时候将cb存起来，emit的时候触发cb执行，原理很简单，实现如下(也可以通过数组或其他方式实现)：

```js
class EventBus {
    constructor() {
      this.eventStack = new Map()
    }
    $on(eventName, callback) {
      let eventMap = this.eventStack.get(eventName)
      if (!eventMap) {
        this.eventStack.set(eventName, (eventMap = new Set([callback])))
        return
      }
      eventMap.add(callback) // 利用Set去重
    }
    $emit(eventName, ...args) {
      let eventMap = this.eventStack.get(eventName)
      if (eventMap) {
        eventMap.forEach(cb => {
          cb(...args)
        })
      }
    }
    $off(eventName) {
      this.eventStack.delete(eventName)
    }
  }
```

```js
  // 使用
  export const eventBus = new EventBus()
  export const EVENT_NAME = 'xx_name'

  // 订阅
  const fn = (name) => {
    console.log(`33333 ${name}`)
  }
  eventBus.$on(EVENT_NAME, fn)
  eventBus.$on(EVENT_NAME, fn) // 利用Set去重，只会有一个fn
  // 发布
  eventBus.$emit(EVENT_NAME, 'name111')
  // 取消
  eventBus.$off(EVENT_NAME)

```

### 拖拽&缩放弹窗

首先了解一下cursor光标的显示：

* row-resize: 通常被渲染为中间有一条横线分割的上下两个箭头
* col-resize: 通常被渲染为中间有一条竖线分割的左右两个箭头
* ne-resize: 右上箭头
* nw-resize: 左上箭头
* se-resize: 右下箭头
* sw-resize: 左下箭头
* move: 移动

[https://developer.mozilla.org/zh-CN/docs/Web/CSS/cursor](https://developer.mozilla.org/zh-CN/docs/Web/CSS/cursor)去看看光标样式
  
在弹窗的4个角各放置一个透明的小正方形，4条边各放置覆盖整条边的透明小长方形，设置css，让鼠标放上去的时候显示对应的光标样式；如右上角显示右上的箭头

* 首先给上面8个节点监听mousedown事件，标记激活的节点  
* document监听mousemove事件
  * 为什么不给4角4边共8个节点监听mousedown，而是给document监听
  * 1、**减少监听器，性能更佳**
  * 2、**给节点监听mousedown，快速移动鼠标的时候，鼠标会移出节点导致move无效**
* 向右缩放的时候，修改宽度，宽度是朝左增加/减少的，所以需要transformX移动的距离
* 四个角的移动可以拆分成上下、左右的移动，如右上，实际上是右移+上移；

```js
const { clientX, clientY } = el;
  // 左右伸缩, 左上、右上、左下、右下伸缩
  if ([TYPE_LEFT, TYPE_RIGHT, TYPE_LEFT_TOP, TYPE_RIGHT_TOP, TYPE_LEFT_BOTTOM, TYPE_RIGHT_BOTTOM].includes(handleType)) {
    // 左，左上
    const offsetX = clientX - lastMovePositionX;
    let width = style.value.width - offsetX;

    // 右
    if ([TYPE_RIGHT, TYPE_RIGHT_TOP, TYPE_RIGHT_BOTTOM].includes(handleType)) {
      width = style.value.width + offsetX;
      // 宽度最小150px
      if (width > 150) {
        style.value.transformX += offsetX;
      }
    }
    style.value.width = width;
  }

  // 上下伸缩, 左上、右上、左下、右下伸缩
  if ([TYPE_TOP, TYPE_BOTTOM, TYPE_LEFT_TOP, TYPE_RIGHT_TOP, TYPE_LEFT_BOTTOM, TYPE_RIGHT_BOTTOM].includes(handleType)) {
    const offsetY = clientY - lastMovePositionY;
    let height = style.value.height - offsetY;
    if ([TYPE_BOTTOM, TYPE_LEFT_BOTTOM, TYPE_RIGHT_BOTTOM].includes(handleType)) {
      height = style.value.height + offsetY;
      // 高度最小250px
      if (height > 250) {
        style.value.transformY += offsetY;
      }
    }
    style.value.height = height;
  }

  // 移动
  if ([TYPE_MOVE].includes(handleType)) {
    style.value.transformY += clientY - lastMovePositionY;
    style.value.transformX += clientX - lastMovePositionX;
  }

  // 最后设置上次移动位置
  lastMovePositionX = clientX;
  lastMovePositionY = clientY;
```


### 消息通知

消息通知本身很简单，调用Notification api即可，不过在客服使用过程中会打开很多个窗口，如果只是收到消息就发送通知的话，那会有多个重复的通知（产品要求任意页面都能接收到消息并通知消息）

而多个tab中，websocket接收到消息的时间误差非常小，无法通过本地storage设置一些值来标记重复消息；

解决方法：消息收到不马上通知，随机一个较长延迟时间（如下：0-1000ms）来人为制造时间差；再按照之前的逻辑，每条消息通知执行之前判断是否有被通知过；第一条消息通知后本地保存{userId: [msgId]}，后面的消息就不会通知了；

后来在npm上看到一个知名的工具也是这样处理类似问题的；

```js
export const sendWindowNotification = function ({ title, content, requireInteraction = false }) {
  let notification;
  function showNotification() {
    const options = {
      body: content,
      icon: 'xxx.png',
      requireInteraction,
    };
    notification = new Notification(title, options);
  }
  if (Notification.permission === 'default' || Notification.permission === 'undefined') {
    Notification.requestPermission().then(() => {
      showNotification();
    });
  } else {
    showNotification();
  }
  return notification;
};
```

```js
// 调用
const notification = sendWindowNotification({
  title: '你有来自solved的新消息',
  content,
  requireInteraction: true,
});
notification.onclick = function () {
  window.open(`${window.location.origin}/xxxx/id=${id}`);
  notification.close();
};
```

```js
// 调用sendWindowNotification之前
const delay = Math.random().toFixed(2) * 1000;
setTimeout(() => {
  // 校验是否调用 sendWindowNotification
}, delay);
```

### 组件封装

组件封装的思想很重要，一个好的组件能够减少很多开发&后期维护时间

可以多在github看看其他的开源项目，知名ui库，慕课网的实战视频等等，收获会很多

举例:

tabs组件包含着tab栏和tabContent，一个优秀的组件应该是下面这样的：

tabs组件中有个tabNameList，tabItem组件默认插槽中的内容是contetn，并在tabItem初始化阶段将tab name传递给父组件tabs存到tabNameList中
最后的tab栏是根据tabNameList渲染的；这样删除和新增的时候只需要添加TabsItem或删除TabsItem就好了

<!-- 大学学习前端的时候，看了些视频，还有在github看了些知名度高的项目，学到了很多东西和思想，所以像这种组件直接就按照上面说的写了，好用、易维护、符合逻辑； -->

<!-- 直到遇到了公司的大佬，看了后不让这么写，他觉得绕，非要tab栏写一个，content写一个；新增的时候既要添加tab栏又要添加content，真tm傻逼 -->

```html
<Tabs default-active-key="1" @changeTab="changeTab" ref="tabRef">
  <TabsItem tab-key="1" tab="FastReply">
   <div>content111</div>
  </TabsItem>
  <TabsItem tab-key="2" tab="Tag">
    <div>content222</div>
  </TabsItem>
```

### websocket

* 二次封装api
* 心跳机制、断线重连

## 个人成长及总结

