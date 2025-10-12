import { Alert, Text } from "react-native";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "../ui/modal";
import { Button, ButtonText } from "../ui/button";
import { Input, InputField } from "../ui/input";
import { useState } from "react";
import useAuthStore from "@/src/store/useAuth";
import { Toast } from "toastify-react-native";


export const OtpModal = ({
    isOpen,
    onClose,
    onSubmit,
    data = {}
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    data?: Record<string, any>;
}) => {
    const [otp, setOtp] = useState("");
    const { verifyOtp } = useAuthStore();

    const handleSubmit = () => {
        if (otp.trim() === "" || otp.length !== 6) {
            Toast.show({
                type: 'error',
                text1: 'Vui lòng nhập mã OTP hợp lệ (6 chữ số)',
                position: 'top',
                visibilityTime: 2000,
                autoHide: true,
            });
            return;
        }
        verifyOtp({
            indicator: data.indicator,
            otp,
            type: "reset-password",
            success: (data) => {
                onSubmit(data);
            },
            error: (error) => {
                Toast.show({
                    type: 'error',
                    text1: 'Xác thực OTP thất bại',
                    text2: error?.message || 'Vui lòng thử lại.',
                    position: 'top',
                    visibilityTime: 2000,
                    autoHide: true,
                });
            }
        })
    };
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
        >
            <ModalBackdrop />
            <ModalContent style={{
                alignSelf: 'center',
                maxHeight: '60%',
                width: '90%',
                borderRadius: 20,
                backgroundColor: 'white',
                borderWidth: 0,
            }}>
                <ModalHeader>
                    <Text className="text-lg font-semibold mb-4 text-center">Nhập mã OTP</Text>
                </ModalHeader>
                <ModalBody>
                    <Input className="my-1 h-[50px] border-gray-300 rounded-[20px]" size="md" variant="outline">
                        <InputField
                            type="text"
                            placeholder="Nhập mã OTP (6 chữ số)"
                            value={otp}
                            className="text-gray-500"
                            onChangeText={(text) => setOtp(text)}
                        />
                    </Input>
                </ModalBody>
                <ModalFooter
                    style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 }}
                >
                    <Button
                        variant="outline"
                        action="primary"
                        className="mr-3"
                        onPress={() => onClose()}
                    >
                        <ButtonText>Hủy</ButtonText>
                    </Button>
                    <Button
                        variant="primary"
                        onPress={handleSubmit}
                    >
                        <ButtonText className="text-white">Xác nhận</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
