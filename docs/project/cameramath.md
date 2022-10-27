# cameramath解题系统

## 介绍

## 技术栈

服务端渲染、html、javascript、less、esbuild、jsap动画库、jquery、katex

### seo

关键字、标签、schema

#### 关键字

keywords和description

```html
<meta name="keywords" content="xxx, xxx, aaa">
<meta name="description" content="xxx">
```

#### schema

[https://schema.org/](https://schema.org/)

示例1:

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "前端开发工程师怎么成长？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "你猜"
        }
      }
    ]
  }
</script>
```

itemscope itemtype ="https://schema.org/Movie"表明该标签中是movie  
itemprop用于向搜索引擎提供有关电影的额外信息，itemprop="director"表明了该标签是导演信息  

示例2(来自文档):

```html
<div itemscope itemtype ="https://schema.org/Movie">
  <h1 itemprop="name">Avatar</h1>
  <span>Director: <span itemprop="director">James Cameron</span> (born August 16, 1954)</span>
  <span itemprop="genre">Science fiction</span>
  <a href="../movies/avatar-theatrical-trailer.html" itemprop="trailer">Trailer</a>
</div>
```

#### 标签

html5语义化标签、class名；  
只有一个h1标签，为了更好的seo，最好只有文案；

### 性能优化

- 页面中减少数据库请求，加快响应速度（针对于服务端渲染）
- 字体包使用woff2，减少字体包体积
- 图片webp类型体积更小；对图片进行压缩，压缩地址：[https://tinypng.com](https://tinypng.com)  
  
  ```html
    <picture>
      <source type="image/webp" srcset="xxx.webp">
      <img width="439" height="438" src="xxx.png" alt="">
    </picture>
  ```

- 小图标使用精灵图（雪碧图），减少请求次数

### 安全

#### RSA非对称加密

通过jsencrypt加密重要隐私数据；[https://www.npmjs.com/package/jsencrypt](https://www.npmjs.com/package/jsencrypt)

### 断点续传

图片的断点续传，具体功能如下：

- md5计算文件hash
- 切片：文件通过slice切片
- 上传：所有xhr存在数组中，单个切片上传完成删除那个xhr
- 暂停、取消：遍历数组调用xhr.abort
- 续传：调接口获取已经上传的切片，继续上传未上传的切片
- 进度条：onProgress监听上传进度

### 三方登录-google

控制台注册项目，获取到client id

```js
$.getScript('https://accounts.google.com/gsi/client').done(() => {
  google.accounts.id.initialize({
    client_id: $('input[name=google-client-id]').val(),
    auto_select: true,
    callback: (response) => {
      $.ajax({
        type: 'POST',
        url: '/api/google-auth',
        data: $.param({
          credential: response.credential
        }),
        success: () => {
          sign.utils.redirectToAccountPage();
        }
      });
    },
  });
  google.accounts.id.renderButton($('.g_id_signin').get(0), {
    type: 'standard',
    theme: 'filled_blue',
    text: 'Sign in with Google',
    size: 'large',
    width: 190,
    shape: 'rectangular',
    logo_alignment: 'left'
  });
});
```

### 三方登录-facebook

开发者控制台注册项目，获取app id；点击facebook登录按钮的时候，检查当前状态，未登录或未授权则调用FB.login进行登录，将accessToken和userID传到后端验证及处理登录；

```js
$.getScript('https://connect.facebook.net/en_US/sdk.js').done(() => {
  FB.init({
    status: false,
    appId: $('input[name=facebook-app-id]').val(),
    autoLogAppEvents: true,
    xfbml: true,
    version: 'v14.0',
  });

  $('#facebook').on('click', () => {
    function facebookLogin(response) {
      if (response.authResponse) {
        const { accessToken, userID } = response.authResponse;
        $.ajax('/api/facebook-auth', {
          method: 'post',
          data: $.param({
            access_token: accessToken,
            user_id: userID,
          }),
          success: () => {
            sign.utils.redirectToAccountPage();
          },
          error: (err) => {
            console.log(err)
          },
        });
      }
    }

    FB.getLoginStatus((response) => {
      if (response.status === 'connected') {
        facebookLogin(response)
      } else {
        // (response.status === 'not_authorized')
        FB.login(
            facebookLogin,
            {
              scope: 'email',
              return_scopes: true,
            }
        );
      }
    }, true)
  });
});
```

### 三方登录-apple

- 前后端redirectURI需要一致
- nonce是随机值，每次的值都是不一样的，防止重复
- 后端验证需要：clientId、私钥、code、redirectUrl等

```js
$.getScript(
  'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'
).done(() => {
  AppleID.auth.init({
    clientId: $('input[name=apple-client-id]').val(),
    scope: 'email',
    state: 'state',
    redirectURI: "your uri",
    nonce: 'math_' + new Date().getTime(),
    usePopup: true,
  });

  $('#apple').on('click', async () => {
    try {
      const data = await AppleID.auth.signIn();
      const { authorization } = data;
      $.ajax('/api/apple-auth', {
        method: 'post',
        data: $.param({
          code: authorization.code,
        }),
        success: () => {
          sign.utils.redirectToAccountPage();
        },
      });
    } catch (err) {
      console.log(err)
    }
  });
});
```

### google人机验证

文档：[https://developers.google.com/recaptcha/docs/v3](https://developers.google.com/recaptcha/docs/v3)

创建web site key: [https://www.google.com/recaptcha/admin/create](https://www.google.com/recaptcha/admin/create)

```js
window.grecaptchaOnloadCallback = function () {
  $submit.on('click', (e) => {
    if (!emailCheckPass || widgetId || isSubmitting) {
      return;
    }
    e.preventDefault();

    function grecaptchaReset() {
      grecaptcha.reset(widgetId);
      closeLoadingStatus();
    }

    widgetId = grecaptcha.render('g-recaptcha', {
      sitekey: $('input#web-site-key').val(),
      theme: 'light',
      callback: (response) => {
        $.ajax('/api/reCAPTCHA', {
          method: 'get',
          data: $.param({
            Response: response,
          }),
          success: (res) => {
            try {
              const data = JSON.parse(res);
              if (!!data.result) {
                fetchSendEmail();
              } else {
                grecaptchaReset();
              }
            } catch (e) {
              grecaptchaReset();
            }
          }
        });
      },
    });
  });
};
```

### stripe支付

```js
init() {
  $.ajax({
    url: 'https://js.stripe.com/v3/',
    dataType: 'script',
    success: () => {
      stripeModel.setup();
    },
  });
},
```

```js
// setup 初始化
const pk = $('#Spk').val();
const stripe = window.Stripe(pk);

const elements = stripe.elements({});
let hidePostalCode = false;
let fontSize = '16px';
if (document.documentElement.clientWidth < 1024) {
  fontSize = '14px';
  hidePostalCode = true;
}
const style = {
  base: {
    color: '#000',
    fontSize,
    ':-webkit-autofill': {
      color: '#969696',
    },
    '::placeholder': {
      color: '#969696',
    },
  },
  invalid: {
    color: '#C60000',
  },
};
```

```js
async function stripePay() {
  const paymentMethod = 'WebStripe'
  const { checkIsLoadingAndSetStatus, closeLoadingStatus, fetchToPay } = premium.methods
  if (checkAllParams() && !checkIsLoadingAndSetStatus(paymentMethod)) {
    stripe
    .createPaymentMethod({
      type: 'card',
      card: card,
      billing_details: {
          name: `${$firstName.val()} ${$lastName.val()}`,
          email: $email.val(),
      },
    })
    .then((result) => {
      if (!!result.error) {
          closeLoadingStatus(paymentMethod);
      } else {
          fetchToPay(paymentMethod, result.paymentMethod.id);
      }
    })
    .catch((err) => {
      closeLoadingStatus(paymentMethod);
    });
  }
}
```

### paypal支付

掉了个接口。。

## 个人成长及总结

- seo优化方案schema
- 网站性能优化方案，加快渲染速度，增加留存率；网站性能测试：[https://www.webpagetest.org/](https://www.webpagetest.org/)
- 数学排版渲染器 katex
- 开发阶段读取less\js源文件，实时编译方案，提高开发效率；esbuild编译js；less + less-plugin-autoprefix编译less
- RSA非对称加密方案：jsencrypt加密
