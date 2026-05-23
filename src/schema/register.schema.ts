import Joi from "joi";

export const registerEmailSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "any.required": "Email không được để trống",
      "string.empty": "Email không được để trống",
      "string.email": "Vui lòng nhập email hợp lệ",
    }),
});

export const registerOtpSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  otp: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      "any.required": "Mã OTP không được để trống",
      "string.empty": "Mã OTP không được để trống",
      "string.length": "Mã OTP phải có đúng 6 chữ số",
      "string.pattern.base": "Mã OTP phải là 6 chữ số",
    }),
});

export const registerCompleteSchema = Joi.object({
  fullname: Joi.string().required().messages({
    "any.required": "Họ và tên không được để trống",
    "string.empty": "Họ và tên không được để trống",
  }),
  password: Joi.string().min(6).required().messages({
    "any.required": "Mật khẩu không được để trống",
    "string.empty": "Mật khẩu không được để trống",
    "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
  }),
  confirm: Joi.string()
    .required()
    .valid(Joi.ref("password"))
    .messages({
      "any.required": "Xác nhận mật khẩu không được để trống",
      "string.empty": "Xác nhận mật khẩu không được để trống",
      "any.only": "Mật khẩu xác nhận không khớp",
    }),
  dateOfBirth: Joi.any(),
  gender: Joi.string()
    .valid("male", "female", "other")
    .required()
    .messages({
      "any.required": "Giới tính không được để trống",
      "any.only": "Giới tính không hợp lệ",
    }),
});

// Keep default export for any existing code that might import it
const registerSchema = registerCompleteSchema;
export default registerSchema;
