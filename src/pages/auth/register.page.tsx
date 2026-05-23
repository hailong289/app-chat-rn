import { Box } from "@/src/components/ui/box";
import { Button, ButtonSpinner, ButtonText } from "@/src/components/ui/button";
import {
    FormControl,
    FormControlError,
    FormControlErrorIcon,
    FormControlErrorText,
    FormControlLabel,
    FormControlLabelText,
} from "@/src/components/ui/form-control";
import { AlertCircleIcon, ChevronDownIcon } from "@/src/components/ui/icon";
import { Input, InputField } from "@/src/components/ui/input";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/src/components/ui/modal";
import { Select, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectIcon, SelectInput, SelectItem, SelectPortal, SelectTrigger } from "@/src/components/ui/select";
import { VStack } from "@/src/components/ui/vstack";
import Helpers from "@/src/libs/helpers";
import { Constants } from "@/src/libs/constants";
import { AuthStackParamList } from "@/src/navigations/AuthNavigator";
import Joi from "joi";
import useAuthStore from "@/src/store/useAuth";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { Text, Image, KeyboardAvoidingView, View, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DatePicker from "react-native-date-picker";
import { Toast } from "toastify-react-native";
import { useFirebase } from "@/src/providers/firebase.provider";
import OtpInput from "@/src/components/auth/otp-input";
import { getApiErrorMessage } from "@/src/utils/apiError";

const OTP_COUNTDOWN = 60;

const RegisterPage = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const { register, sendOtp, verifyOtp, isLoading } = useAuthStore();
    const { fcmToken } = useFirebase();

    const [form, setForm] = useState({
        fullname: "",
        email: "",
        password: "",
        confirm: "",
        gender: "male" as "male" | "female" | "other",
        dateOfBirth: Helpers.getDefaultDate(),
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [openDatePicker, setOpenDatePicker] = useState(false);

    // OTP modal state
    const [otpModalOpen, setOtpModalOpen] = useState(false);
    const [otp, setOtp] = useState("");
    const [otpError, setOtpError] = useState("");
    const [countdown, setCountdown] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const savedFormRef = useRef<typeof form | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    function startCountdown() {
        setCountdown(OTP_COUNTDOWN);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }

    const fullRegisterSchema = Joi.object({
        fullname: Joi.string().required().messages({
            "any.required": "Họ và tên không được để trống",
            "string.empty": "Họ và tên không được để trống",
        }),
        email: Joi.string().email({ tlds: { allow: false } }).required().messages({
            "any.required": "Email không được để trống",
            "string.empty": "Email không được để trống",
            "string.email": "Vui lòng nhập email hợp lệ",
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
        gender: Joi.string().valid("male", "female", "other").required().messages({
            "any.required": "Giới tính không được để trống",
            "any.only": "Giới tính không hợp lệ",
        }),
        dateOfBirth: Joi.any(),
    });

    const handleSubmit = () => {
        const { error, value: parsed } = fullRegisterSchema.validate(
            { ...form },
            { abortEarly: false },
        );
        if (error) {
            const errs: Record<string, string> = {};
            error.details.forEach((d) => {
                errs[d.path[0] as string] = d.message;
            });
            setErrors(errs);
            return;
        }
        setErrors({});
        savedFormRef.current = parsed as typeof form;

        sendOtp({
            email: form.email,
            type: "register",
            success: () => {
                Toast.show({ type: "success", text1: "Đã gửi OTP đến email của bạn" });
                setOtp("");
                setOtpError("");
                setOtpModalOpen(true);
                startCountdown();
            },
            error: (err: any) => {
                Toast.show({
                    type: "error",
                    text1: getApiErrorMessage(err, "Gửi OTP thất bại"),
                });
            },
        });
    };

    const handleResendOtp = () => {
        if (countdown > 0 || isLoading || !savedFormRef.current) return;
        sendOtp({
            email: savedFormRef.current.email,
            type: "register",
            success: () => {
                Toast.show({ type: "success", text1: "Đã gửi lại OTP" });
                startCountdown();
            },
            error: (err: any) => {
                Toast.show({
                    type: "error",
                    text1: getApiErrorMessage(err, "Gửi OTP thất bại"),
                });
            },
        });
    };

    const handleOtpConfirm = () => {
        if (otp.length !== 6) {
            setOtpError("Mã OTP phải có đúng 6 chữ số");
            return;
        }
        if (!savedFormRef.current) return;
        const saved = savedFormRef.current;

        verifyOtp({
            indicator: saved.email,
            otp,
            type: "register",
            success: (data: any) => {
                const tempRegisterToken = data?.tempRegisterToken;
                if (!tempRegisterToken) {
                    setOtpError("Mã OTP không hợp lệ");
                    return;
                }
                setOtpModalOpen(false);
                // Register immediately with tempRegisterToken
                register({
                    fullname: saved.fullname,
                    tempRegisterToken,
                    password: saved.password,
                    gender: saved.gender as "male" | "female" | "other",
                    dateOfBirth: Helpers.formatDateToString(saved.dateOfBirth, "YYYY-MM-DD"),
                    fcmToken: fcmToken,
                    success: () => {
                        Toast.show({ type: "success", text1: "Đăng ký thành công" });
                    },
                    error: (err: any) => {
                        const msg = getApiErrorMessage(err, "Đăng ký thất bại");
                        if (msg.includes("hết hạn") || msg.includes("expired")) {
                            Toast.show({ type: "error", text1: "Phiên đăng ký đã hết hạn. Vui lòng thực hiện lại." });
                        } else {
                            Toast.show({ type: "error", text1: msg });
                        }
                    },
                });
            },
            error: (err: any) => {
                setOtpError(
                    getApiErrorMessage(err, "Mã OTP không hợp lệ hoặc đã hết hạn"),
                );
            },
        });
    };

    return (
        <SafeAreaView edges={["top", "bottom"]}>
            <KeyboardAvoidingView behavior="padding">
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Box style={{ padding: 24, gap: 20 }}>
                        <Image
                            className="mt-4"
                            source={require("@/src/assets/images/logo.png")}
                            style={{ width: 100, height: 100, alignSelf: "center" }}
                        />
                        <Text className="text-center text-[30px] font-bold mb-4">Đăng ký</Text>

                        <VStack style={{ gap: 15 }}>
                            {/* Họ và tên */}
                            <FormControl isInvalid={!!errors.fullname}>
                                <FormControlLabel>
                                    <FormControlLabelText>Họ và tên</FormControlLabelText>
                                </FormControlLabel>
                                <Input className="my-1 h-[50px] border-gray-300 rounded-[20px]" variant="outline">
                                    <InputField
                                        type="text"
                                        placeholder="Nhập họ và tên"
                                        value={form.fullname}
                                        className="text-gray-500"
                                        onChangeText={(text) => setForm({ ...form, fullname: text })}
                                    />
                                </Input>
                                <FormControlError>
                                    <FormControlErrorIcon as={AlertCircleIcon} className="text-red-500" />
                                    <FormControlErrorText className="text-red-500">{errors.fullname}</FormControlErrorText>
                                </FormControlError>
                            </FormControl>

                            {/* Email */}
                            <FormControl isInvalid={!!errors.email}>
                                <FormControlLabel>
                                    <FormControlLabelText>Email</FormControlLabelText>
                                </FormControlLabel>
                                <Input className="my-1 h-[50px] border-gray-300 rounded-[20px]" variant="outline">
                                    <InputField
                                        type="text"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        placeholder="Nhập địa chỉ email"
                                        value={form.email}
                                        className="text-gray-500"
                                        onChangeText={(text) => setForm({ ...form, email: text })}
                                    />
                                </Input>
                                <FormControlError>
                                    <FormControlErrorIcon as={AlertCircleIcon} className="text-red-500" />
                                    <FormControlErrorText className="text-red-500">{errors.email}</FormControlErrorText>
                                </FormControlError>
                            </FormControl>

                            {/* Mật khẩu */}
                            <FormControl isInvalid={!!errors.password}>
                                <FormControlLabel>
                                    <FormControlLabelText>Mật khẩu</FormControlLabelText>
                                </FormControlLabel>
                                <Input className="my-1 h-[50px] border-gray-300 rounded-[20px]" variant="outline">
                                    <InputField
                                        type="password"
                                        placeholder="Nhập mật khẩu"
                                        value={form.password}
                                        className="text-gray-500"
                                        onChangeText={(text) => setForm({ ...form, password: text })}
                                    />
                                </Input>
                                <FormControlError>
                                    <FormControlErrorIcon as={AlertCircleIcon} className="text-red-500" />
                                    <FormControlErrorText className="text-red-500">{errors.password}</FormControlErrorText>
                                </FormControlError>
                            </FormControl>

                            {/* Xác nhận mật khẩu */}
                            <FormControl isInvalid={!!errors.confirm}>
                                <FormControlLabel>
                                    <FormControlLabelText>Xác nhận mật khẩu</FormControlLabelText>
                                </FormControlLabel>
                                <Input className="my-1 h-[50px] border-gray-300 rounded-[20px]" variant="outline">
                                    <InputField
                                        type="password"
                                        placeholder="Nhập lại mật khẩu"
                                        value={form.confirm}
                                        className="text-gray-500"
                                        onChangeText={(text) => setForm({ ...form, confirm: text })}
                                    />
                                </Input>
                                <FormControlError>
                                    <FormControlErrorIcon as={AlertCircleIcon} className="text-red-500" />
                                    <FormControlErrorText className="text-red-500">{errors.confirm}</FormControlErrorText>
                                </FormControlError>
                            </FormControl>

                            {/* Ngày sinh */}
                            <FormControl>
                                <FormControlLabel>
                                    <FormControlLabelText>Ngày sinh</FormControlLabelText>
                                </FormControlLabel>
                                <Button
                                    onPress={() => setOpenDatePicker(true)}
                                    className="my-1 h-[50px] border-gray-300 rounded-[20px] justify-start px-4"
                                    variant="outline"
                                >
                                    <ButtonText className="text-gray-500 text-left">
                                        {Helpers.formatDateToString(form.dateOfBirth, "DD/MM/YYYY")}
                                    </ButtonText>
                                </Button>
                                <DatePicker
                                    title="Chọn ngày sinh"
                                    modal
                                    mode="date"
                                    open={openDatePicker}
                                    date={form.dateOfBirth}
                                    onConfirm={(date) => {
                                        setOpenDatePicker(false);
                                        setForm({ ...form, dateOfBirth: date });
                                    }}
                                    onCancel={() => setOpenDatePicker(false)}
                                    confirmText="Xác nhận"
                                    cancelText="Hủy"
                                    maximumDate={new Date()}
                                    locale="vi"
                                />
                            </FormControl>

                            {/* Giới tính */}
                            <FormControl isInvalid={!!errors.gender}>
                                <FormControlLabel>
                                    <FormControlLabelText>Giới tính</FormControlLabelText>
                                </FormControlLabel>
                                <Select
                                    selectedValue={form.gender}
                                    onValueChange={(value) => setForm({ ...form, gender: value as "male" | "female" | "other" })}
                                    defaultValue={form.gender}
                                >
                                    <SelectTrigger variant="outline" size="md" className="my-1 h-[50px] border-gray-300 rounded-[20px] flex justify-between">
                                        <SelectInput
                                            placeholder="Chọn giới tính"
                                            value={Constants.GENDER_OPTIONS[form.gender as keyof typeof Constants.GENDER_OPTIONS] as string}
                                        />
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
                                    <FormControlErrorText className="text-red-500">{errors.gender}</FormControlErrorText>
                                </FormControlError>
                            </FormControl>

                            <Button
                                className="mt-4 rounded-[20px] h-[50px]"
                                onPress={handleSubmit}
                                isDisabled={isLoading}
                            >
                                {isLoading && <ButtonSpinner color="gray" />}
                                <ButtonText className="text-white text-lg">Đăng ký</ButtonText>
                            </Button>

                            <Text className="text-center text-gray-500 mt-4">
                                Đã có tài khoản?{" "}
                                <Text
                                    className="text-primary-500 font-bold"
                                    onPress={() => navigation.goBack()}
                                >
                                    Đăng nhập
                                </Text>
                            </Text>
                        </VStack>
                    </Box>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* OTP Modal */}
            <Modal isOpen={otpModalOpen} onClose={() => setOtpModalOpen(false)} size="md">
                <ModalBackdrop />
                <ModalContent style={{
                    alignSelf: "center",
                    width: "90%",
                    borderRadius: 20,
                    backgroundColor: "white",
                    borderWidth: 0,
                }}>
                    <ModalHeader>
                        <Text className="text-lg font-semibold text-center">Nhập mã OTP</Text>
                    </ModalHeader>
                    <ModalBody>
                        <Text className="text-sm text-gray-500 text-center mb-3">
                            Mã OTP đã được gửi đến {savedFormRef.current?.email}. Vui lòng kiểm tra hộp thư.
                        </Text>

                        <OtpInput
                            value={otp}
                            onChange={(v) => { setOtp(v); setOtpError(""); }}
                            error={otpError}
                        />

                        <View className="items-center mt-3">
                            {countdown > 0 ? (
                                <Text className="text-gray-500 text-sm">Gửi lại sau {countdown}s</Text>
                            ) : (
                                <TouchableOpacity onPress={handleResendOtp} disabled={isLoading}>
                                    <Text className="text-primary-500 font-semibold">Gửi lại OTP</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ModalBody>
                    <ModalFooter style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12 }}>
                        <Button
                            variant="outline"
                            className="mr-3"
                            onPress={() => setOtpModalOpen(false)}
                            isDisabled={isLoading}
                        >
                            <ButtonText>Hủy</ButtonText>
                        </Button>
                        <Button
                            onPress={handleOtpConfirm}
                            isDisabled={isLoading}
                        >
                            {isLoading && <ButtonSpinner color="gray" />}
                            <ButtonText className="text-white">Xác nhận</ButtonText>
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </SafeAreaView>
    );
};

export default RegisterPage;
