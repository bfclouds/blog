# vue3源码

vue3源码学习笔记

## 架构设计

## 响应系统

### 1、响应式系统的基本实现

简易的响应式实例：

```js
const user = {
  name: '付文江',
  age: 26,
  other: {
    name: "123",
  }
}

const bucket = new Set()
const proxyUser = new Proxy(user, {
  get(target, key, receiver) {
    bucket.add(effect)
    return target[key]
  },
  set(target, key, newValue) {
    target[key] = newValue
    bucket.forEach(fn => fn())
    return true
  }
})

// 副作用函数
function effect() {
  console.log("我被执行了")
  document.querySelector('#app').innerHTML = `<p>${proxyUser.name}</p>`
}
effect()

setTimeout(() => {
  proxyUser.name = 'xxx'
}, 1000);
```

在如上代码中，通过proxy代理了user对象的get和set;当修改proxyUser的name属性的时候，页面会随之更新

名为effect的副作用函数在set的时候被执行，这段代码中，我们硬编码了effect函数，如果副作用函数不叫effect，那么这段代码就报错了；但是实际情况中，我们希望一个箭头函数，甚至匿名函数都是可以执行的，于是需要一个注册副作用函数的函数；

修改effect方法，将effect改为注册副作用函数的方法

```js
let activeEffect = undefined

const user = {
  name: '付文江',
  age: 26,
  other: {
    name: "123",
  }
}

const bucket = new Set()
const proxyUser = new Proxy(user, {
  get(target, key, receiver) {
    if (!activeEffect) return
    bucket.add(activeEffect)
    return target[key]
  },
  set(target, key, newValue) {
    target[key] = newValue
    bucket.forEach(fn => fn())
    return true
  }
})

function effect(fn) {
  activeEffect = fn
  fn()
}
effect(() => {
  console.log("我被执行了")
  document.querySelector('#app').innerHTML = `<p>${proxyUser.name}</p>`
})

setTimeout(() => {
  proxyUser.name = 'xxx'
}, 1000);

```

上述代码中，我们封装了effect方法去去注册副作用函数，这段代码看似没问题，实际上还是有问题的，当为proxyUser添加一个不存在的属性时，能看到页面被更新了，这显然不是我们想看到的，所以我们需要另一种数据结构来保存原数据、key和副作用之间的关系；

分析如下代码:

```js

function effectFn() {
  console.log("我被执行了")
  document.querySelector('#app').innerHTML = `<p>${proxyUser.name}</p>`
}
```

被读取的对象是proxyUser，被读取的key是name，触发的副作用是effect；也就是上述所说的原数据、key和effect副作用；通过上述分析可得如下结构；

```js
const user = {
  name: '付文江',
  age: 26,
}
const user2 = {
  name: '付文江2',
  age: 18,
}

// 数据结构
{
  user: {
    name: [effectFn1, effectFn2],
  },
  user2: {
    age: [effectFn3]
  }
}
```

首先user是个obj对象，所以需要一个key可以是对象的数据结构，此时满足要求的是Map和WeakMap，如上实例我们需要保存user对象，但是如果使用Map的话，因为user被Map作为key引用了，导致当user在其它地方并没有被引用到的时候依然存在内存中，不被垃圾回收机制回收；所以我们使用WeakMap弱Map，在WeakMap中作为key被引用，并不会影响垃圾回收机制；

effectFn可能具有多个，所以可以利用Set来存储  

key和effect的关系是key和value的关系，我们使用Map来存储，修改代码如下：

```js
const user = {
  name: '付文江',
  age: 18,
  other: {
    name: "123",
  }
}
const bucket = new WeakMap()
let activeEffect = undefined
function track(target, key) {
  
}

function trigger(target, key) {
  let depsMap = bucket.get(target)
  if (!depsMap) return;
  const effects = depsMap.get(key)
  effects && effects.forEach(fn => fn())
}

const proxyUser = new Proxy(user, {
  get(target, key, receiver) {
    if (!activeEffect) {
      return
    }
    let depsMap = bucket.get(target)
    if (!depsMap) {
      bucket.set(target, (depsMap = new Map()))
    }
    let deps = depsMap.get(key)
    if (!deps) {
      depsMap.set(key, (deps = new Set()))
    }
    deps.add(activeEffect)
    return target[key]
  },
  set(target, key, newValue) {
    target[key] = newValue
    
    let depsMap = bucket.get(target)
    if (!depsMap) return;
    const effects = depsMap.get(key)
    effects && effects.forEach(fn => fn())
  }
})

// 注册副作用
function effect(fn) {
  activeEffect = fn
  fn() // 这里执行的目的是为了调用函数里的proxyUser.name触发get，收集依赖
}

effect(() => {
  console.log(proxyUser.name);
  document.querySelector('#app').innerHTML = `<p>${proxyUser.name}</p>`
})

setTimeout(() => {
  proxyUser.name = "付文江123"
}, 1000)

setTimeout(() => {
  proxyUser.xxk1 = "付文江123xx"
}, 3000)
```

此时设置 proxyUser.xxk1的时候将不会触发副作用函数的执行，最后封装一下，将get中存储副作用函数的部分封装在track（追踪）中，将set中执行副作用函数的部分封装在trigger（触发）中，代码如下：

```js
function strack(target, key) {
  if (!activeEffect) return
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffect)
}

function trigger(target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return;
  const effects = depsMap.get(key)
  effects && effects.forEach(fn => fn())
}

const proxyUser = new Proxy(user, {
  get(target, key, receiver) {
    strack(target, key)
    return target[key]
  },
  set(target, key, newValue) {
    target[key] = newValue
    trigger(target, key)
})

```

### 2、分支切换

现在有如下代码：

```js
const user = {
  isShowName: true,
  name: '付文江',
  age: 26,
}
// ... 省略userProxy部分代码

function effect(fn) {
  activeEffect = fn
  fn()
}
effect(() => {
  console.log('我被执行了!')
  const val = proxyUser.flag ? proxyUser.name : "阵雨来袭"
  document.querySelector('#app').innerHTML = `<p>${val}</p>`
})

setTimeout(() => {
  proxyUser.flag = false
}, 2000)

setTimeout(() => {
  proxyUser.name = "福福福"
}, 3000)

setTimeout(() => {
  proxyUser.flag = true
}, 4000)
```

在effect中，当flag为true的时候，val的值是name，当flag为false的时候，val的值是“阵雨来袭”，这种因为flag变化而产生的变化就称为分支切换；

当flag的值为false的时候，此时ui显示的是"阵雨来袭"，而后我们修改了name，因为flag为false，所以val的值依然是“阵雨来袭”，所以ui显示“阵雨来袭”，后面我们修改flag的值为true，因此val为name，ui显示name的值；

name的这次修改因为falg为false，所以val的值实际上并没有变化，但是副作用函数被执行了，所以这次副作用函数的执行实际上是没有必要的，或者说它的这次执行是在浪费资源，那么这个副作用存在于name中就是错误的，可以说这个副作用这是上次依赖收集的残留副作用，我们本应该把它清理掉；

因此我们需要将effectFn和代理的key的副作用函数列表（Set）相互关联起来，这样就能知道副作用函数被谁收集了，才能做清理的操作；于是做如下修改:

```js

function track(target, key) {
  if (!activeEffect) {
    return
  }
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffect)
  activeEffect.deps.push(deps) // 新增
}

function effect(fn) {
  // 修改
  function effectFn() { 
    activeEffect = fn
    fn()
  }
  effectFn.deps = []
  effectFn()
}
effect(() => {
  console.log('我被执行了!')
  const val = proxyUser.flag ? proxyUser.name : "阵雨来袭"
  document.querySelector('#app').innerHTML = `<p>${val}</p>`
})

```

在effect中，我们给effectFn加上deps（deps是用来存储这个副作用在哪些响应式数据的依赖集合中），此时deps为空；在track中effectFn被添加到了Set中，作为了对应key的副作用函数，那么此时我们将Set添加到effectFn的deps中，这样就实现了effectFn和被代理key收集的依赖之间的关联（此时代理key的Set中有effectFn，effectFn的deps中有Set）；

接下来需要在effectFn执行的时候清除掉Set中的effectFn

```js
function effect(fn) {
  function effectFn() {
    cleanEffect(effectFn) // 新增
    activeEffect = fn
    fn()
  }
  effectFn.deps = []
  effectFn()
}

function cleanEffect(effectFn) {
   for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i];
    deps.delete(effectFn)
  }
  effectFn.deps.length = 0
}
```

这样就实现了在effectFn执行的时候先清除掉了所有包含effectFn的Set中的effectFn，然后再重新做依赖收集，那么就不会有残留的副作用函数了，此时执行代码，当falg为false后，再改变name将不会执行副作用函数；

### 执行调度

### 4、watch

### 5、computed

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
