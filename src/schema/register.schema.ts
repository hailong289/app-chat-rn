import Joi from "joi";

const registerSchema = Joi.object({
  type: Joi.string().valid('email', 'phone').required().messages({
    'any.required': 'Loại đăng ký không được để trống',
    'string.empty': 'Loại đăng ký không được để trống',
    'any.only': 'Loại đăng ký không hợp lệ',
  }),
  fullname: Joi.string().required().messages({
    'any.required': 'Họ và tên không được để trống',
    'string.empty': 'Họ và tên không được để trống',
  }),
  username: Joi.string()
    .required()
    .custom((value, helpers) => {
      const type  = helpers.prefs.context?.type; // lấy type từ object cha

      if (type === "email") {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
          return helpers.error("string.email");
        }
      }

      if (type === "phone") {
        const phonePattern = /^(\+84|84|0)(3|5|7|8|9)\d{8}$/;
        if (!phonePattern.test(value.replace(/\s/g, ""))) {
          return helpers.error("string.pattern.base");
        }
      }

      return value;
    })
    .messages({
      "any.required": "Trường này không được để trống",
      "string.empty": "Trường này không được để trống",
      "string.email": "Vui lòng nhập email hợp lệ",
      "string.pattern.base": "Vui lòng nhập số điện thoại hợp lệ",
    }),
  password: Joi.string().min(6).required().messages({
    'any.required': 'Mật khẩu không được để trống',
    'string.empty': 'Mật khẩu không được để trống',
    'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
  }),
  confirm: Joi.string()
    .required()
    .custom((value, helpers) => {
      // Lấy password từ object cha (submit form)
      const root = helpers.state.ancestors?.[0] || {};
      const passwordFromRoot = root.password;

      // Lấy password từ context (validate field đơn lẻ)
      const passwordFromContext = helpers.prefs.context?.password;

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
  dateOfBirth: Joi.any(),
  gender: Joi.string().valid('male', 'female', 'other').required().messages({
    'any.required': 'Giới tính không được để trống',
    'string.empty': 'Giới tính không được để trống',
    'any.only': 'Giới tính không hợp lệ',
  }),
  fcmToken: Joi.string().optional().allow(null),
});

export default registerSchema;