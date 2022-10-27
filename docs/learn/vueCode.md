# vue3源码

vue3源码学习笔记

## 架构设计

## 响应系统

### 响应式数据与副作用

而响应式就是当数据发生变化的时候做一些事情，在vue中做的事情就是当data变化的时候更新dom；

在vue3中通过proxy对原数据进行代理来实现响应式；  
简单示例：

```js
const data = { name: '老付小付' }
const proxyData = new Proxy(data, {
  get(target, property, receiver) {
    return `我是代理后的数据：${target[property]}`
  },
  set(obj, prop, value) {
    console.log('我被修改了');
    Reflect.set(obj, prop, value)
  },
})
```

副作用是指产生了变化，而副作用函数就是会产生变化的函数

如下例子中，effect函数执行会导致body中dom发生变化，所以它是副作用函数

```js
function effect(name) {
  document.body.innerHTML = `<div>我是${name}</div>`
}
```

### 依赖收集

依赖收集的作用是知道一个数据与之有哪些副作用函数

```js
const data = { name: '老付' }
const data2 = '不老'
function effect(data) {
  document.body.innerText = data.name
}
function effect(data2) {
  document.body.innerText = data2
}

```

### watch

### computed

## 渲染器

### 挂载与更新

### 简单diff算法

### 双端diff算法

### 快速diff算法

## 组件化

### 组件实现原理

### 异步组件工作机制和实现原理

### 函数式组件工作机制和实现原理

## 编译器

### 模板编译

### 模板编译优化

## 服务端渲染

### vue同构渲染原理

同构渲染简单来说就是一份代码，服务端先通过服务端渲染(server-side rendering)，生成html以及初始化数据，客户端拿到代码和初始化数据后，通过对html的dom进行patch和事件绑定对dom进行客户端激活(client-side hydration)，这个整体的过程叫同构渲染。
