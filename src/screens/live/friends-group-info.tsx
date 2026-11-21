import React, { memo, useMemo, useState } from "react";
import { initialsOf } from "@/shared/utils/initials";
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, Switch, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { BRAND } from "@/shared/utils/brand-colors";
import { usePeopleNav } from "@/screens/people/people-nav";
import { TGroupMember, groupActions, groupInviteUrl, useGroupInfo, useRefreshGroup } from "./group-api";
import { PeopleToAdd } from "./new-group.sheet";


const failed = (fallback: string) => (error: unknown) => onError(constructErrorMessage(error as TApiErrorResponseType, fallback));

const Card = ({ children }: { children: React.ReactNode }) => (
  <View className="mx-4 mt-3 overflow-hidden rounded-2xl bg-white">{children}</View>
);

/**
 * A friends' group, as in the design: picture and name, media shared, mute,
 * members (admins first, with a badge), the invite link and adding people
 * (admins), then Exit group and Report group.
 */
const FriendsGroupInfo = ({ groupId, onClose, onLeft }: { groupId: string; onClose: () => void; onLeft: () => void }) => {
  const insets = useSafeAreaInsets();
  const openPerson = usePeopleNav((state) => state.openPerson);
  const { data: group, isLoading } = useGroupInfo(groupId);
  const refresh = useRefreshGroup(groupId);
  const actions = useMemo(() => groupActions(groupId), [groupId]);
  const [showAll, setShowAll] = useState(false);
  const [adding, setAdding] = useState(false);

  const run = (promise: Promise<unknown>, done: string, fallback: string) =>
    void promise
      .then(() => {
        refresh();
        onSuccess(done);
      })
      .catch(failed(fallback));

  const manage = (member: TGroupMember) => {
    if (!group?.me.isAdmin || member.isOwner) {
      if (member.username) openPerson(member.username);
      return;
    }
    Alert.alert(member.name, member.username ? `@${member.username}` : undefined, [
      ...(member.username ? [{ text: "View profile", onPress: () => openPerson(member.username!) }] : []),
      {
        text: member.isAdmin ? "Remove as admin" : "Make admin",
        onPress: () => run(actions.setAdmin(member.id, !member.isAdmin), member.isAdmin ? "No longer an admin" : "Made an admin", "Couldn't change that.")
      },
      {
        text: "Remove from group",
        style: "destructive",
        onPress: () => run(actions.remove(member.id), `${member.name} was removed`, "Couldn't remove them.")
      },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const shareLink = async () => {
    try {
      const token = group?.inviteToken ?? (await actions.makeInvite())?.inviteToken;
      if (!token) return;
      refresh();
      await Share.share({ message: `Join ${group?.name} on Turnupz: ${groupInviteUrl(token)}` });
    } catch (error) {
      failed("Couldn't share the link.")(error);
    }
  };

  const exit = () =>
    Alert.alert("Exit group?", "You'll need to be added again, or use an invite link, to come back.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Exit",
        style: "destructive",
        onPress: () =>
          void actions
            .leave()
            .then(() => {
              refresh();
              onSuccess("You left the group");
              onLeft();
            })
            .catch(failed("Couldn't leave the group."))
      }
    ]);

  const report = () =>
    Alert.alert("Report this group?", "Our team will look at it.", [
      { text: "Cancel", style: "cancel" },
      { text: "Spam or scams", onPress: () => run(actions.report("Spam or scams"), "Reported. Thanks for telling us.", "Couldn't send the report.") },
      { text: "Harassment or hate", onPress: () => run(actions.report("Harassment or hate"), "Reported. Thanks for telling us.", "Couldn't send the report.") },
      { text: "Something else", onPress: () => run(actions.report("Something else"), "Reported. Thanks for telling us.", "Couldn't send the report.") }
    ]);

  const members = group ? (showAll ? group.members : group.members.slice(0, 5)) : [];

  return (
    <View className="absolute inset-0" style={{ backgroundColor: "#F7F8FB", paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="h-14 flex-row items-center gap-2 border-b bg-white px-3" style={{ borderColor: "#EEF0F4" }}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Back to the chat" hitSlop={10} className="size-9 items-center justify-center">
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path d="M15 5l-7 7 7 7" fill="none" stroke={BRAND.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <TextComponent className="flex-1 text-center text-lg font-bold text-zinc-950">Group Info</TextComponent>
        <View className="size-9" />
      </View>

      {isLoading || !group ? (
        <ActivityIndicator color={BRAND.blue} className="py-10" />
      ) : adding ? (
        <PeopleToAdd
          exclude={group.members.map((member) => member.id)}
          actionLabel="Add to group"
          onCancel={() => setAdding(false)}
          onDone={(ids) =>
            void actions
              .addMembers(ids)
              .then((result) => {
                refresh();
                setAdding(false);
                onSuccess(result?.skipped ? `Added ${result.added}. Others need the invite link.` : "Added");
              })
              .catch(failed("Couldn't add them."))
          }
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Picture and name */}
          <View className="items-center pt-5">
            {group.image ? (
              <CustomImage className="size-32 rounded-[28px]" imageClassName="size-full rounded-[28px]" source={{ uri: group.image }} contentFit="cover" />
            ) : (
              <View className="size-32 items-center justify-center rounded-[28px]" style={{ backgroundColor: BRAND.blueTint }}>
                <TextComponent className="text-4xl font-extrabold" style={{ color: BRAND.blueDeep }}>{initialsOf(group.name)}</TextComponent>
              </View>
            )}
            <TextComponent className="mt-3 text-2xl font-extrabold text-zinc-950">{group.name}</TextComponent>
            <TextComponent className="text-xs font-bold tracking-wide text-zinc-500">
              PRIVATE GROUP • {group.memberCount} {group.memberCount === 1 ? "MEMBER" : "MEMBERS"}
            </TextComponent>
          </View>

          {/* Media, links and docs */}
          {group.media.length > 0 && (
            <Card>
              <TextComponent className="px-4 pt-3 text-sm font-bold text-zinc-950">Media, links and docs</TextComponent>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 12 }}>
                {group.media.map((item) =>
                  /\.(png|jpe?g|webp|gif)(\?|$)/i.test(item.url) || item.kind === "image" ? (
                    <CustomImage key={item.id} className="size-20 rounded-xl" imageClassName="size-full rounded-xl" source={{ uri: item.url }} contentFit="cover" />
                  ) : (
                    <View key={item.id} className="size-20 items-center justify-center rounded-xl bg-zinc-100">
                      <TextComponent className="text-xs font-bold text-zinc-500">FILE</TextComponent>
                    </View>
                  )
                )}
              </ScrollView>
            </Card>
          )}

          {/* Mute */}
          <Card>
            <View className="flex-row items-center px-4 py-3">
              <TextComponent className="flex-1 text-[15px] font-semibold text-zinc-950">Mute notifications</TextComponent>
              <Switch
                value={group.me.muted}
                onValueChange={(next) => run(actions.mute(next), next ? "Muted" : "Alerts are back on", "Couldn't change that.")}
                trackColor={{ true: BRAND.blue, false: "#D4D4D8" }}
              />
            </View>
          </Card>

          {/* Members */}
          <Card>
            <View className="flex-row items-center justify-between px-4 pt-3">
              <TextComponent className="text-lg font-extrabold text-zinc-950">Members ({group.memberCount})</TextComponent>
              {group.me.isAdmin && (
                <Pressable onPress={() => setAdding(true)} accessibilityRole="button" hitSlop={8}>
                  <TextComponent className="text-sm font-bold" style={{ color: BRAND.blueDeep }}>+ Add</TextComponent>
                </Pressable>
              )}
            </View>
            {members.map((member) => (
              <Pressable key={member.id} onPress={() => manage(member)} accessibilityRole="button" className="flex-row items-center gap-3 px-4 py-2.5">
                {member.image ? (
                  <CustomImage className="size-11 rounded-full" imageClassName="size-full rounded-full" source={{ uri: member.image }} contentFit="cover" />
                ) : (
                  <View className="size-11 items-center justify-center rounded-full" style={{ backgroundColor: "#FDE7D6" }}>
                    <TextComponent className="text-sm font-extrabold" style={{ color: "#9A3412" }}>{initialsOf(member.name)}</TextComponent>
                  </View>
                )}
                <View className="flex-1">
                  <TextComponent numberOfLines={1} className="text-[15px] font-bold text-zinc-950">{member.name}</TextComponent>
                  {!!(member.bio || member.username) && (
                    <TextComponent numberOfLines={1} className="text-xs text-zinc-500">{member.bio || `@${member.username}`}</TextComponent>
                  )}
                </View>
                {member.isAdmin && (
                  <View className="rounded-md px-2 py-0.5" style={{ backgroundColor: BRAND.blueTint }}>
                    <TextComponent className="text-[10px] font-extrabold" style={{ color: BRAND.blueDeep }}>ADMIN</TextComponent>
                  </View>
                )}
              </Pressable>
            ))}
            {group.members.length > 5 && (
              <Pressable onPress={() => setShowAll((on) => !on)} className="items-center py-3">
                <TextComponent className="text-[15px] text-zinc-600">
                  {showAll ? "Show fewer" : `View all ${group.memberCount} members`}
                </TextComponent>
              </Pressable>
            )}
          </Card>

          {/* Invite link: admins */}
          {group.me.isAdmin && (
            <Card>
              <Pressable onPress={() => void shareLink()} accessibilityRole="button" className="px-4 py-3">
                <TextComponent className="text-[15px] font-semibold" style={{ color: BRAND.blueDeep }}>
                  {group.inviteToken ? "Share invite link" : "Make and share an invite link"}
                </TextComponent>
                <TextComponent className="text-xs text-zinc-500">Anyone with the link can join. Turn it off from here any time.</TextComponent>
              </Pressable>
              {!!group.inviteToken && (
                <Pressable
                  onPress={() => run(actions.revokeInvite(), "The link no longer works", "Couldn't turn it off.")}
                  accessibilityRole="button"
                  className="border-t border-zinc-100 px-4 py-3"
                >
                  <TextComponent className="text-[15px] font-semibold text-zinc-600">Turn the link off</TextComponent>
                </Pressable>
              )}
            </Card>
          )}

          {/* Exit and report */}
          <Card>
            <Pressable onPress={exit} accessibilityRole="button" className="px-4 py-3.5">
              <TextComponent className="text-[15px] font-bold" style={{ color: BRAND.danger }}>Exit Group</TextComponent>
            </Pressable>
          </Card>
          <Card>
            <Pressable onPress={report} accessibilityRole="button" className="px-4 py-3.5">
              <TextComponent className="text-[15px] font-bold" style={{ color: BRAND.danger }}>Report Group</TextComponent>
            </Pressable>
          </Card>
          <TextComponent className="mx-8 mt-3 text-center text-xs text-zinc-500">
            Exiting will remove you from this private conversation. You will need a new invite to rejoin.
          </TextComponent>
        </ScrollView>
      )}
    </View>
  );
};

export default memo(FriendsGroupInfo);
