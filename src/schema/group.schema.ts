import Joi from "joi";

export interface CreateGroupFormValues {
  name: string;
  members: string[];
}

export const createGroupSchema = Joi.object<CreateGroupFormValues>({
  name: Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      "any.required": "Tên nhóm không được để trống",
      "string.empty": "Tên nhóm không được để trống",
      "string.base": "Tên nhóm phải là chuỗi ký tự",
      "string.min": "Tên nhóm không được để trống",
    }),
  members: Joi.array()
    .items(
      Joi.string()
        .trim()
        .required()
        .messages({
          "any.required": "Thành viên không hợp lệ",
          "string.empty": "Thành viên không hợp lệ",
          "string.base": "Thành viên không hợp lệ",
        })
    )
    .min(3)
    .required()
    .messages({
      "any.required": "Vui lòng chọn ít nhất 3 thành viên",
      "array.base": "Danh sách thành viên không hợp lệ",
      "array.min": "Vui lòng chọn ít nhất 3 thành viên",
    }),
});


