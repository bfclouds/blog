# 第三方接入

## apple登录

## facebook登录

[facebook主页](https://developers.facebook.com/)，进入[控制台](https://developers.facebook.com/apps/?show_reminder=true)选择/创建应用

* Facebook登录->快速启动->web，然后按照提示填入相对应的信息
* Facebook登录->设置，开启 OAuth网页授权登录、使用JavaScript SDK登录
* 在页面中引用sdk，首先获取登录状态，判断是否已经使用facebook登录，如果是登录状态会直接返回accessToken, userID等信息，否则需要调用FB.login进行登录

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
              success: (res) => {
                otherLoginResponseHandler(res);
              },
              error: (err) => {
                otherLoginErrHandler(err)
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

## google

点击进入[控制台](https://console.cloud.google.com/)

* 点击auth同意屏幕，创建应用
* 点击(凭证)，点击顶部的创建凭证，选择OAuth 客户端 ID，选择创建web应用
* 设置web javascript来源和重定向url

### google登录

[google登录文档](https://developers.google.com/identity/gsi/web/guides/overview)，登录配置流程：

* 导入sdk

  ```html
    <!-- 方式1: html中导入 -->
    <script src="https://accounts.google.com/gsi/client" async defer></script>
  ```

  ```js
    // 方式2: js中引入
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
                success: (res) => {
                  otherLoginResponseHandler(res);
                },
                error: (err) => {
                  otherLoginErrHandler(err);
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

* 在用户点击google登录按钮授权成功后将返回response，response.credential是ID令牌，用于后端进行校验，获取邮箱、id等信息；[response文档](https://developers.google.com/identity/gsi/web/reference/js-reference#credential)

### google人机校验

* [创建websitKey和adminKey](https://www.google.com/recaptcha/admin/create)
* 在控制台中选择项目并启用 reCAPTCHA Enterprise API
* 初始化，点击submit按钮开使人机校验

  ```html
  <!-- 导入skd -->
  <script async defer src="https://www.google.com/recaptcha/api.js?onload=grecaptchaOnloadCallback&render=explicit"></script>
  ```

  ```js
    let widgetId;
    function grecaptchaReset() {
      grecaptcha.reset(widgetId);
      closeLoadingStatus();
    }

    window.grecaptchaOnloadCallback = function () {
        $submit.on('click', (e) => {
          if (!emailCheckPass || widgetId || isSubmitting) {
            return;
          }
          e.preventDefault();

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

## stripe支付

[api文档](https://stripe.com/docs/api)和[测试文档](https://stripe.com/docs/testing)

在控制台中点击[开发者](https://dashboard.stripe.com/developers)，进入api密钥创建密钥

### 初始化

```js
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

const card = elements.create('card', { style, hidePostalCode });
card.mount('#payment-card');
```

### 测试

[文档](https://stripe.com/docs/testing)

* 成功
  * 文档：<https://stripe.com/docs/testing#international-cards>
* 拒绝：
  * 如：资金不足：4000000000009995
  * 文档：<https://stripe.com/docs/testing#declined-payments>
