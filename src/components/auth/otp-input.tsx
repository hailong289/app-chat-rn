import { FormControl, FormControlError, FormControlErrorIcon, FormControlErrorText } from "../ui/form-control";
import { AlertCircleIcon } from "../ui/icon";
import { Input, InputField } from "../ui/input";

interface OtpInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    placeholder?: string;
}

const OtpInput = ({ value, onChange, error, placeholder = "Nhập mã OTP (6 chữ số)" }: OtpInputProps) => {
    return (
        <FormControl isInvalid={!!error}>
            <Input className="my-1 h-[50px] border-gray-300 rounded-[20px]" size="md" variant="outline">
                <InputField
                    type="text"
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder={placeholder}
                    value={value}
                    className="text-gray-500 text-center text-lg tracking-widest"
                    onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, 6))}
                />
            </Input>
            <FormControlError>
                <FormControlErrorIcon as={AlertCircleIcon} className="text-red-500" />
                <FormControlErrorText className="text-red-500">{error}</FormControlErrorText>
            </FormControlError>
        </FormControl>
    );
};

export default OtpInput;
