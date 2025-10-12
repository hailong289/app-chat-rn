import Joi from "joi";


const forgotPasswordSchema = Joi.object({
    username: Joi.string().required().messages({
        'string.empty': 'Tên đăng nhập không được để trống',
        'any.required': 'Tên đăng nhập là bắt buộc',
    }),
    email: Joi.string().email({ tlds: { allow: false } }).required().messages({
        'string.empty': 'Email không được để trống',
        'string.email': 'Email không hợp lệ',
        'any.required': 'Email là bắt buộc',
    }),
});

const resetPassWordSchema = Joi.object({
    newPassword: Joi.string().min(6).required().messages({
        'string.empty': 'Mật khẩu mới không được để trống',
        'string.min': 'Mật khẩu mới phải có ít nhất 6 ký tự',
        'any.required': 'Mật khẩu mới là bắt buộc',
    }),
    confirmNewPassword: Joi.string()
        .required()
        .custom((value, helpers) => {
            // Lấy password từ object cha (submit form)
            const root = helpers.state.ancestors?.[0] || {};
            const passwordFromRoot = root.newPassword;

            // Lấy password từ context (validate field đơn lẻ)
            const passwordFromContext = helpers.prefs.context?.newPassword;

            const password = passwordFromRoot ?? passwordFromContext;

            if (value !== password) {
                return helpers.error("any.only");
            }
            return value;
        })
        .messages({
            "any.required": "Xác nhận mật khẩu không được để trống",
            "string.empty": "Xác nhận mật khẩu không được để trống",
            "any.only": "Mật khẩu xác nhận không khớp",
        }),
    token: Joi.string().required().messages({
        'string.empty': 'Mã token không được để trống',
        'any.required': 'Mã token là bắt buộc',
    }),
});

export { forgotPasswordSchema, resetPassWordSchema };
