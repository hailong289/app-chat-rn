import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "../ui/modal";
import { Button, ButtonSpinner, ButtonText } from "../ui/button";
import { Input, InputField } from "../ui/input";
import { Box } from "../ui/box";
import { HStack } from "../ui/hstack";
import { VStack } from "../ui/vstack";
import FontAwesome from "@react-native-vector-icons/fontawesome";
import { Toast } from "toastify-react-native";
import { User } from "@/src/types/user.type";
import {
  createGroupSchema,
  CreateGroupFormValues,
} from "@/src/schema/group.schema";
import useContactStore from "@/src/store/useContact";
import { FormControl, FormControlError, FormControlErrorIcon, FormControlErrorText, FormControlLabel, FormControlLabelText } from "../ui/form-control";
import { AlertCircleIcon } from "../ui/icon";
import useRoomStore from "@/src/store/useRoom";

type Friend = Pick<User, "id" | "fullname" | "avatar"> & {
  username?: string;
};

type CreateGroupChatModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (payload: CreateGroupFormValues) => void;
};

export const CreateGroupChatModal: React.FC<CreateGroupChatModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  const {
    friends,
    getFriends,
    loading: { friends: isLoadingFriends },
  } = useContactStore();
  const [form, setForm] = useState<CreateGroupFormValues>({
    name: "",
    members: [],
  });
  const [errors, setFieldErrors] = useState<Record<string, string>>({});
  const { createGroupRoom, isCreatingGroupRoom } = useRoomStore();

  useEffect(() => {
    getFriends({
      limit: 10,
      page: 1,
      search: '',
      success: (data) => {
        // setIsLoading(false);
      },
      error: (error) => {
        // setIsLoading(false);
      },
    });
  }, []);

  const validateField = (field: string, value: string) => {
    const fieldSchema = createGroupSchema.extract(field);
    const { error } = fieldSchema.validate(value);
    setFieldErrors((prev) => ({
        ...prev,
        [field]: error ? error.details[0].message : '',
    }));
  };


  const handleClose = useCallback(() => {
    setForm({
      name: "",
      members: [],
    });
    onClose();
  }, [onClose]);

  const handleInputChange = (field: string, value: string) => {
    if (field === 'members') {
      setForm((prev) => {
        const exists = prev.members.includes(value);
        const members = exists
          ? prev.members.filter((id) => id !== value)
          : [...prev.members, value];

        return {
          ...prev,
          members,
        };
      });
      return;
    }
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = () => {
    const { error, value: parsedData } = createGroupSchema.validate(form, { abortEarly: false });
    if (error) {
        const newErrors: any = {};
        error.details.forEach((err) => {
            newErrors[err.path[0]] = err.message;
        });
        setFieldErrors(newErrors);
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: newErrors.name || newErrors.members,
          position: 'top',
          visibilityTime: 2000,
          autoHide: true,
        });
        return;
    }
    createGroupRoom({
      name: parsedData.name,
      members: parsedData.members,
      type: 'group',
      success: (data) => {
        Toast.show({
          type: 'success',
          text1: 'Tạo nhóm thành công',
          text2: 'Nhóm đã được tạo thành công',
          position: 'top',
          visibilityTime: 1000,
          autoHide: true,
        });
        setForm({
          name: "",
          members: [],
        });
        onAccept(parsedData as CreateGroupFormValues);
      },
      error: (error) => {
        Toast.show({
          type: 'error',
          text1: 'Tạo nhóm thất bại',
          text2: error.message || 'Vui lòng thử lại sau.',
          position: 'top',
          visibilityTime: 1000,
          autoHide: true,
        });
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalBackdrop />
      <ModalContent
        style={{
          alignSelf: "center",
          width: "92%",
          maxHeight: "80%",
          borderRadius: 20,
          backgroundColor: "white",
          borderWidth: 0,
        }}
      >
        <ModalHeader>
          <Text className="text-lg font-semibold text-gray-900">
            Tạo nhóm mới
          </Text>
        </ModalHeader>
        <ModalBody>
          <VStack className="gap-4">
            <VStack>
            <FormControl
                  isInvalid={!!errors.name}
                  size="md"
                  isDisabled={false}
                  isReadOnly={false}
                  isRequired={false}
              >
                  <Input className="my-1 h-[50px] border-gray-300 rounded-[20px]" size="md" variant="outline">
                      <InputField
                          type="text"
                          placeholder="Nhập tên nhóm"
                          value={form.name}
                          className="text-gray-500"
                          onChangeText={(text) => handleInputChange('name', text)}
                          onBlur={() => validateField('name', form.name)}
                      />
                  </Input>
                  <FormControlError>
                      <FormControlErrorIcon as={AlertCircleIcon} className="text-red-500" />
                      <FormControlErrorText className="text-red-500">
                          {errors.name}
                      </FormControlErrorText>
                  </FormControlError>
              </FormControl>
            </VStack>

            <VStack className="flex-1">
              <Text className="text-base font-medium text-gray-700">
                Chọn thành viên (ít nhất 3 thành viên)
              </Text>
              {friends.length === 0 ? (
                <Box className="items-center justify-center py-10">
                  <FontAwesome name="users" size={40} color="#9CA3AF" />
                  <Text className="mt-3 text-center text-sm text-gray-500">
                    Bạn chưa có bạn bè để thêm vào nhóm
                  </Text>
                </Box>
              ) : (
                <ScrollView className="mt-2 max-h-[300px]">
                  <VStack className="gap-3">
                    {friends.map((friend) => {
                      const isSelected = form.members.includes(friend.id);
                      return (
                        <TouchableOpacity
                          key={friend.id}
                          activeOpacity={0.8}
                          onPress={() => handleInputChange('members', friend.id)}
                          className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                        >
                          <HStack className="items-center justify-between">
                            <HStack className="items-center">
                              <Box className="h-[48px] w-[48px] overflow-hidden rounded-full bg-gray-200">
                                {friend.avatar ? (
                                  <Image
                                    source={{ uri: friend.avatar }}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                    }}
                                  />
                                ) : (
                                  <Box className="h-full w-full items-center justify-center bg-primary-100">
                                    <Text className="text-lg font-bold text-primary-600">
                                      {friend.fullname?.charAt(0)?.toUpperCase()}
                                    </Text>
                                  </Box>
                                )}
                              </Box>
                              <VStack className="ml-3">
                                <Text className="text-base font-semibold text-gray-900">
                                  {friend.fullname}
                                </Text>
                                {friend.slug ? (
                                  <Text className="text-sm text-gray-500">
                                    @{friend.slug}
                                  </Text>
                                ) : null}
                              </VStack>
                            </HStack>
                            <View
                              className={`h-6 w-6 items-center justify-center rounded-full border ${
                                isSelected
                                  ? "border-primary-500 bg-primary-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {isSelected ? (
                                <FontAwesome name="check" size={14} color="#fff" />
                              ) : null}
                            </View>
                          </HStack>
                        </TouchableOpacity>
                      );
                    })}
                  </VStack>
                </ScrollView>
              )}
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12 }}>
          <Button
            variant="outline"
            action="primary"
            className="mr-3 border-gray-300 border-none"
            onPress={handleClose}
            isDisabled={isCreatingGroupRoom}
          >
            <ButtonText>Hủy</ButtonText>
          </Button>
          <Button
            onPress={handleSubmit}
            isDisabled={isCreatingGroupRoom}
          >
            {isCreatingGroupRoom && <ButtonSpinner color="gray" />}
            <ButtonText className="text-white">Tạo nhóm</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};


