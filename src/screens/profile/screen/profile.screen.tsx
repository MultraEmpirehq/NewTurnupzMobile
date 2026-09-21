import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import React, { memo, useCallback, useEffect } from "react";
import ContainerComponent from "@/shared/components/container/container.component";
import LoggedinHeaderComponent from "@/shared/components/headers/loggedin-header/loggedin-header.component";
import SettingIcon from "@/shared/assets/icons/setting.icon";
import CustomImageComponent from "@/shared/components/images/custom-image/custom-image.component";
import useUserStore, { TUser } from "@/shared/stores/user.store";
import TextComponent from "@/shared/components/text/text.component";
import { Controller, useForm } from "react-hook-form";
import { cn } from "@/shared/utils/classnames";
import joi from "joi";
import { joiResolver } from "@hookform/resolvers/joi";
import { patchData } from "@/api";
import { constructErrorMessage } from "@/api/functions";
import ButtonComponent from "@/shared/components/button/button.component";
import InputFieldComponent from "@/shared/components/form/input-field/input-field.component";
import { onError, onSuccess } from "@/shared/components/status/toast";

const INPUT_FIELD_PARENT_CLASSNAME = "w-[auto] flex-1",
  INPUT_FIELD_CLASSNAME = "py-3",
  LABEL_CLASSNAME = "text-sm font-medium text-black/50";

type TProfileBodyType = {
  firstName: string;
  lastName: string;
};

const schema = joi.object<TProfileBodyType>({
  firstName: joi.string().required().messages({
    "string.empty": "First name is required",
    "any.required": "First name is required"
  }),
  lastName: joi.string().required().messages({
    "string.empty": "Last name is required",
    "any.required": "Last name is required"
  })
});

const defaultValues: TProfileBodyType = {
  firstName: "",
  lastName: ""
};

const ProfileStatCard: React.FC<{
  title: string;
  value: string;
  shouldShowBorder?: boolean;
}> = memo(({ title, value, shouldShowBorder = false }) => {
  return (
    <View
      className={cn(
        "flex-1 items-center py-6",
        shouldShowBorder && "border-r border-black/20"
      )}
    >
      <TextComponent className="text-lg font-bold">{value}</TextComponent>
      <TextComponent className="text-sm opacity-60">{title}</TextComponent>
    </View>
  );
});

const ProfileScreen = () => {
  const user = useUserStore((state) => state?.user);
  const name = user?.name;
  const setUser = useUserStore((state) => state.setUser);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid, isSubmitting, isDirty }
  } = useForm<TProfileBodyType>({
    resolver: joiResolver(schema),
    defaultValues: defaultValues,
    mode: "onChange"
  });
  useEffect(() => {
    reset({
      firstName: user?.firstName || "",
      lastName: user?.lastName || ""
    });
  }, [reset, user?.firstName, user?.lastName]);
  const onSubmit = useCallback(async (body: TProfileBodyType) => {
    try {
      const { data } = await patchData<TProfileBodyType, TUser>("/user", body);
      if (data?.data) {
        setUser(data.data);
      }
      onSuccess("Profile updated successfully");
    } catch (error) {
      onError(
        constructErrorMessage(
          error as TApiErrorResponseType,
          "Failed to update profile"
        )
      );
    }
  }, [setUser]);
  return (
    <ContainerComponent isSafeAreaView>
      <LoggedinHeaderComponent
        title="Profile"
        className="px-horizontal py-4"
        rightContent={
          <TouchableOpacity>
            <SettingIcon size={24} />
          </TouchableOpacity>
        }
      />
      <ContainerComponent className="">
        <ScrollView contentContainerClassName="px-horizontal pt-20 gap-10">
          <View className="flex flex-col gap-2">
            <View className="gap-1 flex-col items-center justify-center">
              <CustomImageComponent className="size-24 rounded-lg" />
              <TextComponent className="font-medium">{name}</TextComponent>
              <View className="w-full border-t border-black/20 flex-row">
                <ProfileStatCard
                  title="Purchased Tickets"
                  value="10"
                  shouldShowBorder
                />
                <ProfileStatCard title="Registered Events" value="10" />
              </View>
            </View>
          </View>
          <View className="gap-6">
            <TextComponent className="font-bold text-primary-900">
              Profile Information
            </TextComponent>
            <View className="gap-4">
              <View className="flex-row items-center gap-4">
                <Controller
                  control={control}
                  name="firstName"
                  render={({
                    field: { onChange, value, ref },
                    fieldState: { error }
                  }) => (
                    <InputFieldComponent
                      className={INPUT_FIELD_PARENT_CLASSNAME}
                      onChangeText={onChange}
                      value={value}
                      ref={ref}
                      placeholder="First Name"
                      label="First Name"
                      inputClassName={INPUT_FIELD_CLASSNAME}
                      labelClassName={LABEL_CLASSNAME}
                      error={error?.message}
                      autoCapitalize="none"
                      autoComplete="name"
                      autoCorrect={false}
                      autoFocus={true}
                      returnKeyType="next"
                      onSubmitEditing={() => {
                        handleSubmit(onSubmit)();
                      }}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="lastName"
                  render={({
                    field: { onChange, value, ref },
                    fieldState: { error }
                  }) => (
                    <InputFieldComponent
                      className={INPUT_FIELD_PARENT_CLASSNAME}
                      onChangeText={onChange}
                      value={value}
                      ref={ref}
                      placeholder="Last Name"
                      label="Last Name"
                      inputClassName={INPUT_FIELD_CLASSNAME}
                      labelClassName={LABEL_CLASSNAME}
                      error={error?.message}
                      autoCapitalize="none"
                      autoComplete="family-name"
                      autoCorrect={false}
                      autoFocus={true}
                      returnKeyType="next"
                      onSubmitEditing={() => {
                        handleSubmit(onSubmit)();
                      }}
                    />
                  )}
                />
              </View>
              {isDirty && (
                <ButtonComponent
                  onPress={handleSubmit(onSubmit)}
                  disabled={!isValid || isSubmitting}
                  isLoading={isSubmitting}
                >
                  Save
                </ButtonComponent>
              )}
            </View>
          </View>
        </ScrollView>
      </ContainerComponent>
    </ContainerComponent>
  );
};

export default memo(ProfileScreen);

const styles = StyleSheet.create({});
