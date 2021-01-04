
/**
 *
 *
 * @comment
 */

// 校验规则
const loginRule = {
    // 手机号
    phone: { type: 'string', format: /^1[3-9]\d{9}$/ },
    // 验证码, 1-6 位
    code: { type: 'string', format: /^\d{1,6}$/ },
}

// 登录，生成 token
class LoginByPhone {

    /**
     * 登录或注册
     * @returns {Promise<void>}
     */
    async action() {
        const { ctx } = this;
        ctx.validate(loginRule, ctx. request.body);
        const { phone, code } = ctx.request.body;
        const { user, token } = await ctx.service.account.loginOrRegisterByPhone(phone, code);
        this.success({ user, token });
    }
}
