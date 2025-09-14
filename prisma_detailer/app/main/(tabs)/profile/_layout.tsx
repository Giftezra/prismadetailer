import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

const ProfileLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name='ProfileScreen' options={{ headerShown: false }} />
        <Stack.Screen name='AvailabilityScreen' options={{ headerShown: false }} />
        <Stack.Screen name='BankAccountScreen' options={{ headerShown: false }} />
    </Stack>
  )
}

export default ProfileLayout

const styles = StyleSheet.create({})