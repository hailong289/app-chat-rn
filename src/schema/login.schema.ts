import Joi from 'joi';

const loginSchema = Joi.object({
  username: Joi.string().required().messages({ 
    'any.required': 'Tên đăng nhập không được để trống',
    'string.empty': 'Tên đăng nhập không được để trống',
  }).custom((value, helpers) => {
    // Kiểm tra email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(value)) return value;
    // Kiểm tra số điện thoại Việt Nam
    const phonePattern = /^(\+84|84|0)(3|5|7|8|9)\d{8}$/;
    if (phonePattern.test(value.replace(/\s/g, ""))) return value;
    return helpers.message({ 'custom': 'Vui lòng nhập email hợp lệ hoặc số điện thoại' });
  }),
  password: Joi.string().required().messages({ 
    'any.required': 'Mật khẩu không được để trống',
    'string.empty': 'Mật khẩu không được để trống',
  }),
  fcmToken: Joi.string().optional().allow(null),
});

export default loginSchema;