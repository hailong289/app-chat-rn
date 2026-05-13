import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Linking, StyleSheet } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/src/navigations/MainStackNavigator';

const AboutPage = () => {
    const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

    const handleBack = () => {
        navigation.goBack();
    };

    const openLink = (url: string) => {
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <FontAwesome name="arrow-left" size={20} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Giới thiệu</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoPlaceholder}>
                        <FontAwesome name="comments" size={50} color="#fff" />
                    </View>
                    <Text style={styles.appName}>AppChat</Text>
                    <Text style={styles.appVersion}>Phiên bản 1.0.0</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Thông tin ứng dụng</Text>
                    <View style={styles.card}>
                        <Text style={styles.description}>
                            AppChat là một ứng dụng nhắn tin theo thời gian thực được xây dựng bằng React Native. 
                            Mang lại trải nghiệm giao tiếp nhanh chóng, bảo mật và thân thiện.
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Liên kết</Text>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.linkRow} onPress={() => openLink('https://github.com')}>
                            <View style={styles.linkIconWrapper}>
                                <FontAwesome name="github" size={18} color="#333" />
                            </View>
                            <Text style={styles.linkText}>Mã nguồn (GitHub)</Text>
                            <FontAwesome name="chevron-right" size={14} color="#9ca3af" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.linkRow} onPress={() => openLink('https://policies.google.com/privacy')}>
                            <View style={styles.linkIconWrapper}>
                                <FontAwesome name="shield" size={18} color="#42A59F" />
                            </View>
                            <Text style={styles.linkText}>Chính sách bảo mật</Text>
                            <FontAwesome name="chevron-right" size={14} color="#9ca3af" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.linkRow} onPress={() => openLink('https://policies.google.com/terms')}>
                            <View style={styles.linkIconWrapper}>
                                <FontAwesome name="file-text-o" size={18} color="#42A59F" />
                            </View>
                            <Text style={styles.linkText}>Điều khoản sử dụng</Text>
                            <FontAwesome name="chevron-right" size={14} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.copyright}>© 2026 AppChat Team.</Text>
                    <Text style={styles.copyright}>All rights reserved.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    backBtn: {
        padding: 8,
        width: 40,
        alignItems: 'flex-start',
    },
    content: {
        padding: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginVertical: 30,
    },
    logoPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 24,
        backgroundColor: '#42A59F',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#42A59F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    appName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    appVersion: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 4,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        color: '#374151',
        padding: 16,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    linkIconWrapper: {
        width: 24,
        alignItems: 'center',
        marginRight: 12,
    },
    linkText: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginLeft: 52,
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    copyright: {
        fontSize: 13,
        color: '#9ca3af',
        lineHeight: 20,
    },
});

export default AboutPage;