import Joi from 'joi';

const loginSchema = Joi.object({
  username: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'any.required': 'Email không được để trống',
      'string.empty': 'Email không được để trống',
      'string.email': 'Vui lòng nhập email hợp lệ',
    }),
  password: Joi.string().required().messages({
    'any.required': 'Mật khẩu không được để trống',
    'string.empty': 'Mật khẩu không được để trống',
  }),
  fcmToken: Joi.string().optional().allow(null),
});

export default loginSchema;
