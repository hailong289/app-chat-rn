import { Box } from "@/src/components/ui/box";
import { Button, ButtonSpinner, ButtonText } from "@/src/components/ui/button";
import { FormControl, FormControlError, FormControlErrorIcon, FormControlErrorText, FormControlHelper, FormControlHelperText, FormControlLabel, FormControlLabelText } from "@/src/components/ui/form-control";
import { AlertCircleIcon, EyeIcon, Icon } from "@/src/components/ui/icon";
import { Input, InputField } from "@/src/components/ui/input";
import { VStack } from "@/src/components/ui/vstack";
import { RootStackParamList } from "@/src/navigations/AppNavigator";
import loginSchema from "@/src/schema/login.schema";
import useAuthStore from "@/src/store/useAuth";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Text, Image, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Toast } from 'toastify-react-native'

const LoginPage = () => {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const [form, setForm] = useState({
        username: '',
        password: '',
    });
    const [errors, setFieldErrors] = useState<Record<string, string>>({});
    const { login, isLoading } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);

    const handleInputChange = (field: string, value: string) => {
        setForm({ ...form, [field]: value });
    };

    const validateField = (field: string, value: string) => {
        const fieldSchema = loginSchema.extract(field);
        const { error } = fieldSchema.validate(value);
        setFieldErrors((prev) => ({
            ...prev,
            [field]: error ? error.details[0].message : '',
        }));
    };

    const handleSubmit = () => {
        const { error, value: parsedData } = loginSchema.validate(form, { abortEarly: false });
        if (error) {
            const newErrors: any = {};
            error.details.forEach((err) => {
                newErrors[err.path[0]] = err.message;
            });
            setFieldErrors(newErrors);
            return;
        }
        // Xử lý đăng nhập ở đây
        login({
            username: parsedData.username,
            password: parsedData.password,
            fcmToken: null,
            success: () => {
                Toast.show({
                    type: 'success',
                    text1: 'Đăng nhập thành công',
                    position: 'top',
                    visibilityTime: 2000,
                    autoHide: true,
                })
            },
            error: ({ message }) => {
                console.log('Login error:', message);
                Toast.show({
                    type: 'error',
                    text1: 'Đăng nhập thất bại',
                    text2: message || 'Vui lòng thử lại sau.',
                    position: 'top',
                    visibilityTime: 4000,
                    autoHide: true,
                })
            }
        });
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
                                    onBlur={() => validateField('username', form.username)}
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
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Nhập mật khẩu"
                                    value={form.password}
                                    className="text-gray-500"
                                    onChangeText={(text) => handleInputChange('password', text)}
                                    onBlur={() => validateField('password', form.password)}
                                />
                                <Button onPress={() => setShowPassword(!showPassword)} variant="outline" className="absolute right-0 top-0 h-full border-0">
                                   <Icon as={EyeIcon} className="text-gray-400 absolute right-4 top-4" />
                                </Button>
                            </Input>
                            <FormControlError>
                                <FormControlErrorIcon as={AlertCircleIcon} className="text-red-500" />
                                <FormControlErrorText className="text-red-500">
                                    {errors.password}
                                </FormControlErrorText>
                            </FormControlError>
                        </FormControl>
                        <Text className="text-right text-primary-500 font-bold"  onPress={() => navigation.navigate("ForgotPassword" as keyof RootStackParamList)}>Quên mật khẩu?</Text>
                        <Button
                            className="mt-4 rounded-[20px] h-[50px]"
                            variant="primary"
                            onPress={handleSubmit}
                            isDisabled={isLoading}
                        >
                            {isLoading && <ButtonSpinner color="gray" />}
                            <ButtonText className="text-white text-lg">Đăng nhập</ButtonText>
                        </Button>

                        <Text className="text-center text-gray-500 mt-4">
                            Chưa có tài khoản? <Text className="text-primary-500 font-bold" onPress={() => navigation.navigate("Register" as keyof RootStackParamList)}>Đăng ký</Text>
                        </Text>
                    </VStack>
                </Box>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default LoginPage;
