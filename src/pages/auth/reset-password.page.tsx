import { Box } from "@/src/components/ui/box";
import { Button, ButtonSpinner, ButtonText } from "@/src/components/ui/button";
import { FormControl, FormControlError, FormControlErrorIcon, FormControlErrorText, FormControlLabel, FormControlLabelText } from "@/src/components/ui/form-control";
import { AlertCircleIcon, EyeIcon, Icon } from "@/src/components/ui/icon";
import { Input, InputField } from "@/src/components/ui/input";
import { VStack } from "@/src/components/ui/vstack";
import { RootStackParamList } from "@/src/navigations/AppNavigator";
import { AuthStackParamList } from "@/src/navigations/AuthNavigator";
import { resetPassWordSchema } from "@/src/schema/forgot.schema";
import useAuthStore from "@/src/store/useAuth";
import { NavigationProp, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { Text, Image, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Toast } from 'toastify-react-native'

type ResetPasswordRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;


const ResetPasswordPage = () => {
  const route = useRoute<ResetPasswordRouteProp>();
  const { token } = route.params; // 👈 lấy token tại đây
  const [form, setForm] = useState({
    newPassword: '',
    confirmNewPassword: '',
    token: token.accessToken,
  });
  const [errors, setFieldErrors] = useState<Record<string, string>>({});
  const { isLoading, resetPassword } = useAuthStore();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [showPassword, setShowPassword] = useState({
    newPassword: false,
    confirmNewPassword: false,
  });


  const handleInputChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const validateField = (field: string, value: string) => {
    const fieldSchema = resetPassWordSchema.extract(field);
    const { error } = fieldSchema.validate(value, { context: { newPassword: form.newPassword } });
    setFieldErrors((prev) => ({
      ...prev,
      [field]: error ? error.details[0].message : '',
    }));
  };

  const handleSubmitResetPassword = () => {
    const { error, value: parsedData } = resetPassWordSchema.validate(form, { context: { newPassword: form.newPassword } });
    console.log('Parsed data:', parsedData, error);
    if (error) {
      const newErrors: any = {};
      error.details.forEach((err) => {
        newErrors[err.path[0]] = err.message;
      });
      setFieldErrors(newErrors);
      return;
    }
    // Xử lý đặt lại mật khẩu ở đây
    resetPassword({
      token: form.token,
      newPassword: parsedData.newPassword,
      success: () => {
        Toast.show({
          type: 'success',
          text1: 'Đặt lại mật khẩu thành công',
          position: 'top',
          visibilityTime: 2000,
          autoHide: true,
        });
        navigation.navigate('Login' as never);
      },
      error: ({ message }) => {
        console.log('Reset password error:', message);
        Toast.show({
          type: 'error',
          text1: 'Đặt lại mật khẩu thất bại',
          text2: message || 'Vui lòng thử lại sau.',
          position: 'top',
          visibilityTime: 4000,
          autoHide: true,
        })
      }
    });
  }
  return (
    <SafeAreaView edges={['top']}>
      <KeyboardAvoidingView behavior="padding">
        <Box style={{ padding: 24, gap: 20 }}>
          <Image
            className="mt-4"
            source={require('@/src/assets/images/logo.png')}
            style={{ width: 100, height: 100, alignSelf: 'center' }}
          />
          <Text className="text-center text-[30px] font-bold mb-4">Đặt lại mật khẩu</Text>
          <VStack style={{ gap: 15 }}>
            <FormControl
              isInvalid={!!errors.newPassword}
              size="md"
              isDisabled={false}
              isReadOnly={false}
              isRequired={false}
            >
              <FormControlLabel>
                <FormControlLabelText>Mật khẩu mới</FormControlLabelText>
              </FormControlLabel>
              <Input className="my-1 h-[50px] border-gray-300 rounded-[20px]" size="md" variant="outline">
                <InputField
                  type={showPassword.newPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu mới"
                  value={form.newPassword}
                  className="text-gray-500"
                  onChangeText={(text) => handleInputChange('newPassword', text)}
                  onBlur={() => validateField('newPassword', form.newPassword)}
                />
                <Button onPress={() => setShowPassword({ ...showPassword, newPassword: !showPassword.newPassword })} variant="outline" className="absolute right-0 top-0 h-full border-0">
                  <Icon as={EyeIcon} className="text-gray-400 absolute right-4 top-4" />
                </Button>
              </Input>
              <FormControlError>
                <FormControlErrorIcon as={AlertCircleIcon} className="text-red-500" />
                <FormControlErrorText className="text-red-500">
                  {errors.newPassword}
                </FormControlErrorText>
              </FormControlError>
            </FormControl>
            <FormControl
              isInvalid={!!errors.confirmNewPassword}
              size="md"
              isDisabled={false}
              isReadOnly={false}
              isRequired={false}
            >
              <FormControlLabel>
                <FormControlLabelText>Xác nhận mật khẩu mới</FormControlLabelText>
              </FormControlLabel>
              <Input className="my-1 h-[50px] border-gray-300 rounded-[20px]" size="md" variant="outline">
                <InputField
                  type={showPassword.confirmNewPassword ? "text" : "password"}
                  placeholder="Nhập xác nhận mật khẩu mới"
                  value={form.confirmNewPassword}
                  className="text-gray-500"
                  onChangeText={(text) => handleInputChange('confirmNewPassword', text)}
                  onBlur={() => validateField('confirmNewPassword', form.confirmNewPassword)}
                />
                <Button onPress={() => setShowPassword({ ...showPassword, confirmNewPassword: !showPassword.confirmNewPassword })} variant="outline" className="absolute right-0 top-0 h-full border-0">
                  <Icon as={EyeIcon} className="text-gray-400 absolute right-4 top-4" />
                </Button>
              </Input>
              <FormControlError>
                <FormControlErrorIcon as={AlertCircleIcon} className="text-red-500" />
                <FormControlErrorText className="text-red-500">
                  {errors.confirmNewPassword}
                </FormControlErrorText>
              </FormControlError>
            </FormControl>
            <Button
              className="mt-4 rounded-[20px] h-[50px]"
              variant="solid"
              onPress={handleSubmitResetPassword}
              isDisabled={isLoading}
            >
              {isLoading && <ButtonSpinner color="gray" />}
              <ButtonText className="text-white text-lg">Lưu</ButtonText>
            </Button>
            <Text className="text-center text-primary-500 font-bold" onPress={() => navigation.navigate('Login' as any)}>Quay lại đăng nhập</Text>
          </VStack>
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ResetPasswordPage;
