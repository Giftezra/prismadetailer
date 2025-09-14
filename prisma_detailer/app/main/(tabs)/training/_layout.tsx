import { Stack } from "expo-router";

export default function TrainingLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name='TrainingScreen' options={{ headerShown: false }} />
        </Stack>
    )
}