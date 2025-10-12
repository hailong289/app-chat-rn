import { Box } from "@/src/components/ui/box";
import { Button, ButtonSpinner, ButtonText } from "@/src/components/ui/button";
import { FormControl, FormControlError, FormControlErrorIcon, FormControlErrorText, FormControlLabel, FormControlLabelText } from "@/src/components/ui/form-control";
import { AlertCircleIcon, ChevronDownIcon } from "@/src/components/ui/icon";
import { Input, InputField } from "@/src/components/ui/input";
import { Select, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectIcon, SelectInput, SelectItem, SelectPortal, SelectTrigger } from "@/src/components/ui/select";
import { VStack } from "@/src/components/ui/vstack";
import Helpers from "@/src/libs/helpers";
import { RootStackParamList } from "@/src/navigations/AppNavigator";
import registerSchema from "@/src/schema/register.schema";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Text, Image, KeyboardAvoidingView, View, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DatePicker from 'react-native-date-picker'
import { Constants } from "@/src/libs/constants";
import useAuthStore from "@/src/store/useAuth";
import { Toast } from "toastify-react-native";

const RegisterPage = () => {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const [form, setForm] = useState({
        fullname: "",
        username: "",
        password: "",
        confirm: "",
        gender: "male",
        dateOfBirth: Helpers.getDefaultDate(), // định dạng YYYY-MM-DD
        type: "email" as "email" | "phone",
        fcmToken: null as string | null,
    });
    const [errors, setFieldErrors] = useState<Record<string, string>>({});
    const [open, setOpen] = useState(false);
    const { register, isLoading } = useAuthStore();

    const handleInputChange = (field: string, value: string | Date) => {
        setForm({ ...form, [field]: value });
    };

    const handleTabChange = (tab: 'email' | 'phone') => {
        setForm({ ...form, username: '', type: tab });
        setFieldErrors({ ...errors, username: '' });
    }

    const validateField = (field: string, value: string | Date) => {
        const fieldSchema = registerSchema.extract(field);
        const { error } = fieldSchema.validate(value, { context: { type: form.type, password: form.password } });
        setFieldErrors((prev) => ({
            ...prev,
            [field]: error ? error.details[0].message : '',
        }));
    };

    const handleSubmit = () => {
        const { error, value: parsedData } = registerSchema.validate(form);
        console.log({ parsedData, error });
        if (error) {
            const errors: Record<string, string> = {};
            error.details.forEach((detail) => {
                const field = detail.path[0] as string;
                errors[field] = detail.message;
            });
            setFieldErrors(errors);
            return;
        }
        console.log('✅ Form hợp lệ:', parsedData);
        // Call the register function from the auth store
        register({
            fullname: parsedData.fullname,
            username: parsedData.username,
            password: parsedData.password,
            confirm: parsedData.confirm,
            gender: parsedData.gender as "male" | "female" | "other",
            dateOfBirth: Helpers.formatDateToString(parsedData.dateOfBirth, 'YYYY-MM-DD'),
            type: parsedData.type,
            fcmToken: parsedData.fcmToken,
            success: () => {
                Toast.show({
                    type: 'success',
                    text1: 'Đăng ký thành công',
                });
            },
            error: ({ message }) => {
                console.log('Register error:', message);
                Toast.show({
                    type: 'error',
                    text1: 'Đăng ký thất bại',
                    text2: message || 'Vui lòng thử lại sau.',
                    position: 'top',
                    visibilityTime: 4000,
                    autoHide: true,
                })
            }
        });
    };

    return (
        <SafeAreaView edges={['top', 'bottom']}>
            <KeyboardAvoidingView behavior="padding">
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Box style={{ padding: 24, gap: 20 }}>
                        <Image
                            className="mt-4"
                            source={require('@/src/assets/images/logo.png')}
                            style={{ width: 100, height: 100, alignSelf: 'center' }}
                        />
                        <Text className="text-center text-[30px] font-bold mb-4">Đăng ký</Text>

                        {/* Tab Header */}
                        <View className="flex-row bg-gray-200 rounded-[20px] p-1 mb-4">
                            <TouchableOpacity
                                className={`flex-1 py-3 px-4 rounded-[20px] ${form.type === 'email' ? 'bg-primary-500' : 'bg-transparent'}`}
                                onPress={() => handleTabChange('email')}
                            >
                                <Text className={`text-center font-medium ${form.type === 'email' ? 'text-white' : 'text-gray-600'}`}>
                                    Email
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 py-3 px-4 rounded-[20px] ${form.type === 'phone' ? 'bg-primary-500' : 'bg-transparent'}`}
                                onPress={() => handleTabChange('phone')}
                            >
                                <Text className={`text-center font-medium ${form.type === 'phone' ? 'text-white' : 'text-gray-600'}`}>
                                    Số điện thoại
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <VStack style={{ gap: 15 }}>
                            <FormControl
                                isInvalid={!!errors.fullname}
                                size="md"
                                isDisabled={false}
                                isReadOnly={false}
                                isRequired={false}
                            >
                                <FormControlLabel>
                                    <FormControlLabelText>Họ và tên</FormControlLabelText>
                                </FormControlLabel>
                                <Input className="my-1 h-[50px] border-gray-300 rounded-[20px]" size="md" variant="outline">
                                    <InputField
                                        type="text"
                                        placeholder="Nhập họ và tên"
                                        value={form.fullname}
                                        className="text-gray-500"
                                        onChangeText={(text) => handleInputChange('fullname', text)}
                                        onBlur={() => validateField('fullname', form.fullname)}
                                    />
                                </Input>
                                <FormControlError>
                                    <FormControlErrorIcon as={AlertCircleIcon} className="text-red-500" />
                                    <FormControlErrorText className="text-red-500">
                                        {errors.fullname}
                                    </FormControlErrorText>
                                </FormControlError>
                            </FormControl>
                            <FormControl
                                isInvalid={!!errors.username}
                                size="md"
                                isDisabled={false}
                                isReadOnly={false}
                                isRequired={false}
                            >
                                <FormControlLabel>
                                    <FormControlLabelText>
                                        {form.type === 'email' ? 'Email' : 'Số điện thoại'}
                                    </FormControlLabelText>
                                </FormControlLabel>
                                <Input className="my-1 h-[50px] border-gray-300 rounded-[20px]" size="md" variant="outline">
                                    <InputField
                                        type="text"
                                        placeholder={form.type === 'email' ? 'Nhập địa chỉ email' : 'Nhập số điện thoại'}
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
                                        type="password"
                                        placeholder="Nhập mật khẩu"
                                        value={form.password}
                                        className="text-gray-500"
                                        onChangeText={(text) => handleInputChange('password', text)}
                                        onBlur={() => validateField('password', form.password)}
                                    />
                                </Input>
                                <FormControlError>
                                    <FormControlErrorIcon as={AlertCircleIcon} className="text-red-500" />
                                    <FormControlErrorText className="text-red-500">
                                        {errors.password}
                                    </FormControlErrorText>
                                </FormControlError>
                            </FormControl>
                            <FormControl
                                isInvalid={!!errors.confirm}
                                size="md"
                                isDisabled={false}
                                isReadOnly={false}
                                isRequired={false}
                            >
                                <FormControlLabel>
                                    <FormControlLabelText>Xác nhận mật khẩu</FormControlLabelText>
                                </FormControlLabel>
                                <Input className="my-1 h-[50px] border-gray-300 rounded-[20px]" size="md" variant="outline">
                                    <InputField
                                        type="password"
                                        placeholder="Nhập lại mật khẩu"
                                        value={form.confirm}
                                        className="text-gray-500"
                                        onChangeText={(text) => handleInputChange('confirm', text)}
                                        onBlur={() => validateField('confirm', form.confirm)}
                                    />
                                </Input>
                                <FormControlError>
                                    <FormControlErrorIcon as={AlertCircleIcon} className="text-red-500" />
                                    <FormControlErrorText className="text-red-500">
                                        {errors.confirm}
                                    </FormControlErrorText>
                                </FormControlError>
                            </FormControl>
                            <FormControl>
                                <FormControlLabel>
                                    <FormControlLabelText>Ngày sinh</FormControlLabelText>
                                </FormControlLabel>
                                <Button onPress={() => setOpen(true)} className="my-1 h-[50px] border-gray-300 rounded-[20px] justify-start px-4" variant="outline">
                                    <ButtonText className="text-gray-500 text-left">
                                        {Helpers.formatDateToString(form.dateOfBirth, 'DD/MM/YYYY')}
                                    </ButtonText>
                                </Button>
                                <DatePicker
                                    title={"Chọn ngày sinh"}
                                    modal
                                    mode="date"
                                    open={open}
                                    date={form.dateOfBirth}
                                    onConfirm={(date) => {
                                        setOpen(false)
                                        handleInputChange('dateOfBirth', date)
                                    }}
                                    onCancel={() => {
                                        setOpen(false)
                                    }}
                                    confirmText={"Xác nhận"}
                                    cancelText={"Hủy"}
                                    maximumDate={new Date()} // Ngày hiện tại
                                    locale="vi" // Đặt locale thành tiếng Việt
                                />
                            </FormControl>
                            <FormControl
                                isInvalid={!!errors.gender}
                                size="md"
                                isDisabled={false}
                                isReadOnly={false}
                                isRequired={false}
                            >
                                <FormControlLabel>
                                    <FormControlLabelText>Giới tính</FormControlLabelText>
                                </FormControlLabel>
                                <Select
                                    selectedValue={form.gender}
                                    onValueChange={(value) => handleInputChange('gender', value)}
                                    defaultValue={form.gender}
                                >
                                    <SelectTrigger variant="outline" size="md" className="my-1 h-[50px] border-gray-300 rounded-[20px] flex justify-between">
                                        <SelectInput placeholder="Chọn giới tính" value={Constants.GENDER_OPTIONS[form.gender as keyof typeof Constants.GENDER_OPTIONS] as string} />
                                        <SelectIcon className="mr-3" as={ChevronDownIcon} />
                                    </SelectTrigger>
                                    <SelectPortal>
                                        <SelectBackdrop />
                                        <SelectContent className="bg-white rounded-lg">
                                            <SelectDragIndicatorWrapper>
                                                <SelectDragIndicator />
                                            </SelectDragIndicatorWrapper>
                                            <SelectItem label="Nam" value="male" />
                                            <SelectItem label="Nữ" value="female" className="mb-[20px]" />
                                        </SelectContent>
                                    </SelectPortal>
                                </Select>
                                <FormControlError>
                                    <FormControlErrorIcon as={AlertCircleIcon} className="text-red-500" />
                                    <FormControlErrorText className="text-red-500">
                                        {errors.gender}
                                    </FormControlErrorText>
                                </FormControlError>
                            </FormControl>
                            <Button
                                className="mt-4 rounded-[20px] h-[50px]"
                                variant="primary"
                                onPress={handleSubmit}
                                isDisabled={isLoading}
                            >
                                {isLoading && <ButtonSpinner color="gray" />}
                                <ButtonText className="text-white text-lg">Đăng ký</ButtonText>
                            </Button>

                            <Text className="text-center text-gray-500 mt-4">
                                Đã có tài khoản? <Text className="text-primary-500 font-bold" onPress={() => navigation.goBack()}>Đăng nhập</Text>
                            </Text>
                        </VStack>
                    </Box>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default RegisterPage;