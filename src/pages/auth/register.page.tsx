import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { FormControl, FormControlError, FormControlErrorIcon, FormControlErrorText, FormControlHelper, FormControlHelperText, FormControlLabel, FormControlLabelText } from "@/components/ui/form-control";
import { AlertCircleIcon } from "@/components/ui/icon";
import { Input, InputField } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import loginSchema from "@/src/schema/login.schema";
import { useState } from "react";
import { Text, Image, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RegisterPage = () => {
    const [inputValue, setInputValue] = useState('12345');
    const [form, setForm] = useState({
        username: '',
        password: '',
    });
    const [errors, setErrors] = useState({ username: '', password: '' });

    const handleInputChange = (field: string, value: string) => {
        validateField(field, value);
        setForm({ ...form, [field]: value });
    };

    const validateField = (field: string, value: string) => {
        const fieldSchema = loginSchema.extract(field);
        const { error } = fieldSchema.validate(value);
        setErrors((prev) => ({
            ...prev,
            [field]: error ? error.details[0].message : '',
        }));
    };

    const handleSubmit = () => {
        const { error } = loginSchema.validate(form, { abortEarly: false });
        if (error) {
            const newErrors: any = {};
            error.details.forEach((err) => {
                newErrors[err.path[0]] = err.message;
            });
            setErrors(newErrors);
        } else {
            setErrors({ username: '', password: '' });
            console.log('✅ Form hợp lệ:', form);
        }
    };
    return (
        <SafeAreaView edges={['top']}>
            <KeyboardAvoidingView behavior="padding">
                <Box style={{ padding: 24, gap: 20 }}>
                    <Image
                        className="mt-4"
                        source={require('@/src/assets/images/logo.png')}
                        style={{ width: 100, height: 100, alignSelf: 'center' }}
                    />
                    <Text className="text-center text-[30px] font-bold mb-4">Đăng nhập</Text>
                    <VStack style={{ gap: 15 }}>
                        <FormControl
                            isInvalid={!!errors.username}
                            size="md"
                            isDisabled={false}
                            isReadOnly={false}
                            isRequired={false}
                        >
                            <FormControlLabel>
                                <FormControlLabelText>Tên đăng nhập</FormControlLabelText>
                            </FormControlLabel>
                            <Input className="my-1 h-[50px] border-gray-300 rounded-[20px]" size="md" variant="outline">
                                <InputField
                                    type="text"
                                    placeholder="Nhập email hoặc số điện thoại"
                                    value={form.username}
                                    className="text-gray-500"
                                    onChangeText={(text) => handleInputChange('username', text)}
                                />
                            </Input>
                            <FormControlError>
                                <FormControlErrorIcon as={AlertCircleIcon} className="text-red-500" />
                                <FormControlErrorText className="text-red-500">
                                    {errors.username}
                                </FormControlErrorText>
                            </FormControlError>
                        </FormControl>
                        <FormControl
                            isInvalid={!!errors.password}
                            size="md"
                            isDisabled={false}
                            isReadOnly={false}
                            isRequired={false}
                        >
                            <FormControlLabel>
                                <FormControlLabelText>Mật khẩu</FormControlLabelText>
                            </FormControlLabel>
                            <Input className="my-1 h-[50px] border-gray-300 rounded-[20px]" size="md" variant="outline">
                                <InputField
                                    type="password"
                                    placeholder="Nhập mật khẩu"
                                    value={form.password}
                                    className="text-gray-500"
                                    onChangeText={(text) => handleInputChange('password', text)}
                                />
                            </Input>
                            <FormControlError>
                                <FormControlErrorIcon as={AlertCircleIcon} className="text-red-500" />
                                <FormControlErrorText className="text-red-500">
                                    {errors.password}
                                </FormControlErrorText>
                            </FormControlError>
                        </FormControl>
                        <Text className="text-right text-primary-500 font-bold">Quên mật khẩu?</Text>
                        <Button
                            className="mt-4 rounded-[20px] h-[50px]"
                            variant="primary"
                            onPress={handleSubmit}
                        >
                            <ButtonText className="text-white text-lg">Đăng nhập</ButtonText>
                        </Button>
                       
                        <Text className="text-center text-gray-500 mt-4">
                            Chưa có tài khoản? <Text className="text-primary-500 font-bold">Đăng ký</Text>
                        </Text>
                    </VStack>
                </Box>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default RegisterPage;