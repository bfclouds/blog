# web性能优化总结

## 图片

  webp的图片本身体积更小，同时压缩效果也比其他的好，因此使用webp格式的图片，再通过source解决有的浏览器不兼容的问题；

  ```html
  <picture>
    <source type="image/webp" srcset="xxx.webp">
    <source type="image/webp" srcset="xxx_mobile.webp" media="(max-width: 767px)">
    <img width="439" height="438" src="xxx.png" alt="">
  </picture>
  ```

## css

### 包体积优化

因为页面的渲染首先是要构建dom树和css树，所以想要缩短首屏显示的时间，尽可能减小css包的体积，以减少请求的时间是个重要的优化点；可以通过[tailwindcss](https://tailwindcss.com/)构建css来减小css体积，且项目越大，效果越明显；

### normalize.css

抹平不同设备，浏览器间的样式差异；[normalize.css](https://github.com/necolas/normalize.css)

### 动画

复杂频繁的动画利用transform3d、will-change

## js

### 防抖节流

区别是：防抖后执行，节流先执行

### 使用 passive 改善滚屏性能

将 passive 设为 true 可以启用性能优化，并可大幅改善应用性能

```js
window.addEventListener('scroll', (event) => {
  /* do something */
  // 不能使用 event.preventDefault();
}, { passive: true });
```

### 动画优化

gsap动画库
requestAnimationFrame：浏览器在下次重绘之前调用指定的回调函数更新动画

### 多线程

多线程（Web Worker），在其他线程中处理复杂的计算，最后返回结果给主线程，不阻塞主线程

### async\defer

空闲的时候加载javascript

### 减少监听器

尽量减少监听器的数量  

场景1:  
在vue的商城系统中，有一个商品列表，每个商品都有个倒计时，那么应该在list组件中创建一个setTimeout，在item组件（单个商品）中将更新倒计时的方法传入list组件中存起来，然后每次遍历执行item的更新方法；  

场景2:  
tabs中，给tabs添加监听器，而不是给每个tabItem添加监听器；

## 编译

### esbuild

开发阶段使用esbuild编译

test