import { OtpModal } from "@/src/components/modals/otp.model";
import { Box } from "@/src/components/ui/box";
import { Button, ButtonSpinner, ButtonText } from "@/src/components/ui/button";
import { FormControl, FormControlError, FormControlErrorIcon, FormControlErrorText, FormControlHelper, FormControlHelperText, FormControlLabel, FormControlLabelText } from "@/src/components/ui/form-control";
import { AlertCircleIcon } from "@/src/components/ui/icon";
import { Input, InputField } from "@/src/components/ui/input";
import { VStack } from "@/src/components/ui/vstack";
import { RootStackParamList } from "@/src/navigations/AppNavigator";
import { forgotPasswordSchema } from "@/src/schema/forgot.schema";
import useAuthStore from "@/src/store/useAuth";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Text, Image, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Toast } from 'toastify-react-native'



const ForgotPasswordPage = () => {
  const [form, setForm] = useState({
    email: '',
    username: ''
  });
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [errors, setFieldErrors] = useState<Record<string, string>>({});
  const { forgotPassword, isLoading, resetPassword } = useAuthStore();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleInputChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const validateField = (field: string, value: string) => {
    const fieldSchema = forgotPasswordSchema.extract(field);
    const { error } = fieldSchema.validate(value);
    setFieldErrors((prev) => ({
      ...prev,
      [field]: error ? error.details[0].message : '',
    }));
  };

  const handleSubmit = () => {
    const { error, value: parsedData } = forgotPasswordSchema.validate(form, { abortEarly: false });
    if (error) {
      const newErrors: any = {};
      error.details.forEach((err) => {
        newErrors[err.path[0]] = err.message;
      });
      setFieldErrors(newErrors);
      return;
    }
    forgotPassword({
      email: parsedData.email,
      username: parsedData.username,
      success: () => {
        setIsOtpModalOpen(true);
        Toast.show({
          type: 'success',
          text1: 'Gửi yêu cầu đổi mật khẩu thành công',
          text2: 'Vui lòng kiểm tra email để nhận mã OTP.',
        });
      },
      error: ({ message }) => {
        console.log('Forgot password error:', message);
        Toast.show({
          type: 'error',
          text1: 'Gửi yêu cầu thất bại',
          text2: message || 'Vui lòng thử lại sau.',
          position: 'top',
          visibilityTime: 4000,
          autoHide: true,
        })
      }
    });
  };

  const handleOtpSubmit = (token: string) => {
    // Xử lý xác thực OTP ở đây
    setIsOtpModalOpen(false);
    navigation.navigate('ResetPassword' as any, { token } as never);
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
          <Text className="text-center text-[30px] font-bold mb-4">Quên mật khẩu</Text>
          <VStack style={{ gap: 15 }}>
            <FormControl
              isInvalid={!!errors.email}
              size="md"
              isDisabled={false}
              isReadOnly={false}
              isRequired={false}
            >
              <FormControlLabel>
                <FormControlLabelText>Email</FormControlLabelText>
              </FormControlLabel>
              <Input className="my-1 h-[50px] border-gray-300 rounded-[20px]" size="md" variant="outline">
                <InputField
                  type="text"
                  placeholder="Nhập email"
                  value={form.email}
                  className="text-gray-500"
                  onChangeText={(text) => handleInputChange('email', text)}
                  onBlur={() => validateField('email', form.email)}
                />
              </Input>
              <FormControlError>
                <FormControlErrorIcon as={AlertCircleIcon} className="text-red-500" />
                <FormControlErrorText className="text-red-500">
                  {errors.email}
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
                <FormControlLabelText>Tài khoản đăng nhập</FormControlLabelText>
              </FormControlLabel>
              <Input className="my-1 h-[50px] border-gray-300 rounded-[20px]" size="md" variant="outline">
                <InputField
                  type="text"
                  placeholder="Nhập tên tài khoản đăng nhập"
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
            <Button
              className="mt-4 rounded-[20px] h-[50px]"
              variant="primary"
              onPress={handleSubmit}
              isDisabled={isLoading}
            >
              {isLoading && <ButtonSpinner color="gray" />}
              <ButtonText className="text-white text-lg">Gửi yêu cầu</ButtonText>
            </Button>
            <Text className="text-center text-primary-500 font-bold" onPress={() => navigation.goBack()}>Quay lại đăng nhập</Text>
          </VStack>

          <OtpModal
            isOpen={isOtpModalOpen}
            onClose={() => setIsOtpModalOpen(false)}
            onSubmit={handleOtpSubmit}
            data={{ indicator: form.email }}
          />
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPasswordPage;
