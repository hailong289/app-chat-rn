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
import { Button, ButtonText } from "../ui/button";
import { Input, InputField } from "../ui/input";
import { Box } from "../ui/box";
import { HStack } from "../ui/hstack";
import { VStack } from "../ui/vstack";
import FontAwesome from "@react-native-vector-icons/fontawesome";
import { Toast } from "toastify-react-native";
import { User } from "@/src/types/auth.type";
import {
  createGroupSchema,
  CreateGroupFormValues,
} from "@/src/schema/group.schema";

type Friend = Pick<User, "id" | "fullname" | "avatar"> & {
  username?: string;
};

type CreateGroupChatModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateGroupFormValues) => void;
  friends: Friend[];
  defaultSelectedIds?: string[];
  isLoading?: boolean;
};

export const CreateGroupChatModal: React.FC<CreateGroupChatModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  friends,
  defaultSelectedIds = [],
  isLoading = false,
}) => {
  const [formValues, setFormValues] = useState<CreateGroupFormValues>({
    name: "",
    members: defaultSelectedIds,
  });

  useEffect(() => {
    setFormValues((prev) => ({
      ...prev,
      members: defaultSelectedIds,
    }));
  }, [defaultSelectedIds, isOpen]);

  const handleClose = useCallback(() => {
    setFormValues({
      name: "",
      members: defaultSelectedIds,
    });
    onClose();
  }, [defaultSelectedIds, onClose]);

  const handleChangeGroupName = useCallback((value: string) => {
    setFormValues((prev) => ({
      ...prev,
      name: value,
    }));
  }, []);

  const toggleFriend = useCallback(
    (friendId: string) => {
      setFormValues((prev) => {
        const exists = prev.members.includes(friendId);
        const members = exists
          ? prev.members.filter((id) => id !== friendId)
          : [...prev.members, friendId];

        return {
          ...prev,
          members,
        };
      });
    },
    []
  );

  const isValid = useMemo(
    () =>
      !createGroupSchema.validate(
        {
          name: formValues.name.trim(),
          members: formValues.members,
        },
        { abortEarly: true }
      ).error,
    [formValues]
  );

  const handleSubmit = useCallback(() => {
    const payload: CreateGroupFormValues = {
      name: formValues.name.trim(),
      members: formValues.members,
    };

    const { error, value } = createGroupSchema.validate(payload, {
      abortEarly: false,
    });

    if (error) {
      const message = error.details?.[0]?.message ?? "Dữ liệu không hợp lệ";
      Toast.show({
        type: "error",
        text1: message,
        position: "top",
        visibilityTime: 2000,
        autoHide: true,
      });
      return;
    }

    onSubmit(value as CreateGroupFormValues);
  }, [formValues, onSubmit]);

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
              <Text className="text-base font-medium text-gray-700">
                Tên nhóm
              </Text>
              <Input className="mt-2 h-[50px] border-gray-300 rounded-[16px]" size="md" variant="outline">
                <InputField
                  placeholder="Nhập tên nhóm"
                  value={formValues.name}
                  onChangeText={handleChangeGroupName}
                  className="text-gray-600"
                />
              </Input>
            </VStack>

            <VStack className="flex-1">
              <Text className="text-base font-medium text-gray-700">
                Chọn thành viên
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
                      const isSelected = formValues.members.includes(friend.id);
                      return (
                        <TouchableOpacity
                          key={friend.id}
                          activeOpacity={0.8}
                          onPress={() => toggleFriend(friend.id)}
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
                                {friend.username ? (
                                  <Text className="text-sm text-gray-500">
                                    @{friend.username}
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
            isDisabled={isLoading}
          >
            <ButtonText>Hủy</ButtonText>
          </Button>
          <Button
            onPress={handleSubmit}
            isDisabled={!isValid || isLoading}
          >
            <ButtonText className="text-white">Tạo nhóm</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};


